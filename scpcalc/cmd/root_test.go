package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func captureCalc(t *testing.T, args ...string) (stdout, stderr string, code int) {
	t.Helper()
	oldArgs := os.Args
	oldOut, oldErr := os.Stdout, os.Stderr
	rOut, wOut, _ := os.Pipe()
	rErr, wErr, _ := os.Pipe()
	os.Stdout, os.Stderr = wOut, wErr
	os.Args = append([]string{"scpcalc", "calc"}, args...)
	defer func() {
		os.Args = oldArgs
		os.Stdout, os.Stderr = oldOut, oldErr
	}()

	code = Execute()
	_ = wOut.Close()
	_ = wErr.Close()
	var bufOut, bufErr bytes.Buffer
	_, _ = io.Copy(&bufOut, rOut)
	_, _ = io.Copy(&bufErr, rErr)
	return bufOut.String(), bufErr.String(), code
}

func TestCalcLegacyDailyGBShowsNodeCounts(t *testing.T) {
	out, errOut, code := captureCalc(t,
		"--daily-gb", "800",
		"--concurrent-users", "12",
		"--retention-days", "60",
		"--hot-warm-days", "30",
	)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%s", code, errOut)
	}
	if !strings.Contains(out, "N_SH:") || !strings.Contains(out, "N_IDX:") {
		t.Fatalf("missing node counts:\n%s", out)
	}
	if !strings.Contains(out, "NODE COUNTS") && !strings.Contains(out, "node counts") {
		t.Fatalf("missing node plan section:\n%s", out)
	}
	if !strings.Contains(out, "indexes.conf") {
		t.Fatalf("missing conf:\n%s", out)
	}
}

func TestCalcSHCAndClusterJSON(t *testing.T) {
	out, errOut, code := captureCalc(t,
		"--daily-gb", "100",
		"--concurrent-users", "8",
		"--indexer-cluster", "--rf", "3", "--sf", "2",
		"--search-head-cluster",
		"--json",
	)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%s", code, errOut)
	}
	var res model.PlanResult
	if err := json.Unmarshal([]byte(out), &res); err != nil {
		t.Fatalf("json: %v\n%s", err, out)
	}
	if res.Design == nil {
		t.Fatal("expected design")
	}
	if res.Design.NSH != 1 {
		t.Fatalf("SHC single-member for this load: n_sh=%d", res.Design.NSH)
	}
	if !res.Design.SHCDeployer {
		t.Fatal("expected deployer")
	}
	if !res.Design.ClusterManager {
		t.Fatal("expected cluster manager with indexer cluster")
	}
	if res.Design.NIDX < 3 {
		t.Fatalf("RF floor: n_idx=%d", res.Design.NIDX)
	}
	if res.Design.NodePlanText == "" {
		t.Fatal("expected node_plan_text")
	}
}

func TestCalcPlanFileAndConfOut(t *testing.T) {
	dir := t.TempDir()
	planPath := filepath.Join(dir, "plan.json")
	confPath := filepath.Join(dir, "indexes.conf")
	designPath := filepath.Join(dir, "design.txt")
	plan := model.PlanInput{
		Mode:            model.ModeSources,
		ConcurrentUsers: 12,
		IndexerCluster:  true,
		RF:              3,
		SF:              2,
		RetentionDays:   90,
		HotWarmDays:     30,
		Sources: []model.SourceRow{{
			Key: "win", IndexName: "windows", Label: "Windows", DailyGB: 50,
		}},
	}
	raw, _ := json.Marshal(plan)
	if err := os.WriteFile(planPath, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	_, errOut, code := captureCalc(t,
		"--plan", planPath,
		"--search-head-cluster",
		"--conf-out", confPath,
		"--design-out", designPath,
		"--json",
	)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%s", code, errOut)
	}
	conf, err := os.ReadFile(confPath)
	if err != nil || !bytes.Contains(conf, []byte("[windows]")) {
		t.Fatalf("conf-out: %v %s", err, conf)
	}
	des, err := os.ReadFile(designPath)
	if err != nil || !bytes.Contains(des, []byte("NODE COUNTS")) {
		t.Fatalf("design-out: %v %s", err, des)
	}
}

func TestMergePlanFlagsOverride(t *testing.T) {
	base := model.PlanInput{ConcurrentUsers: 4, Mode: model.ModeSources}
	flags := model.PlanInput{ConcurrentUsers: 16, RetentionDays: 30}
	got := mergePlan(base, flags, false, false, false, false, false)
	if got.ConcurrentUsers != 16 || got.RetentionDays != 30 {
		t.Fatalf("%+v", got)
	}
}

func TestCalcPlanKeepsIndexerClusterFalse(t *testing.T) {
	dir := t.TempDir()
	planPath := filepath.Join(dir, "plan.json")
	plan := model.PlanInput{
		Mode:            model.ModeTotal,
		TotalDailyGB:    100,
		ConcurrentUsers: 4,
		IndexerCluster:  false,
		RF:              3,
		SF:              2,
		RetentionDays:   30,
		HotWarmDays:     7,
	}
	raw, err := json.Marshal(plan)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(planPath, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	out, errOut, code := captureCalc(t, "--plan", planPath, "--json")
	if code != 0 {
		t.Fatalf("exit=%d stderr=%s", code, errOut)
	}
	var res model.PlanResult
	if err := json.Unmarshal([]byte(out), &res); err != nil {
		t.Fatalf("json: %v\n%s", err, out)
	}
	if res.Design == nil {
		t.Fatal("expected design")
	}
	if res.Design.IndexerCluster {
		t.Fatalf("plan indexer_cluster=false must not be implied true by RF/SF; design=%+v", res.Design)
	}
	// Standalone forces RF=SF=1 → default compression 0.5 (not cluster 1.15 from RF3/SF2).
	if res.CompressionFactor != 0.5 {
		t.Fatalf("standalone compression=%v want 0.5", res.CompressionFactor)
	}
}

func TestCalcInvalidFlagNumber(t *testing.T) {
	_, errOut, code := captureCalc(t, "--daily-gb", "not-a-number")
	if code != 2 {
		t.Fatalf("want exit 2, got %d stderr=%s", code, errOut)
	}
	if !strings.Contains(errOut, "invalid number") {
		t.Fatalf("expected parse error, got: %s", errOut)
	}
}

func TestCalcLegacyRFImpliesCluster(t *testing.T) {
	out, errOut, code := captureCalc(t,
		"--daily-gb", "50",
		"--rf", "3", "--sf", "2",
		"--json",
	)
	if code != 0 {
		t.Fatalf("exit=%d stderr=%s", code, errOut)
	}
	var res model.PlanResult
	if err := json.Unmarshal([]byte(out), &res); err != nil {
		t.Fatalf("json: %v\n%s", err, out)
	}
	if res.Design == nil || !res.Design.IndexerCluster {
		t.Fatalf("legacy --rf/--sf > 1 should imply indexer cluster; design=%+v", res.Design)
	}
}
