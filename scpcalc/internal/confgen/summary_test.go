package confgen_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/confgen"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestRenderPlanSummaryOnSummariesVolume(t *testing.T) {
	p := model.PlanInput{
		Mode:          model.ModeSources,
		RetentionDays: 30,
		HotWarmDays:   10,
		Headroom:      1.0,
		SummaryPct:    0.1,
		HotPath:       "/data/hot",
		ColdPath:      "/data/cold",
		FrozenPath:    "/data/frozen",
		SummariesPath: "/data/summaries",
		Sources: []model.SourceRow{
			{IndexName: "windows", DailyGB: 20, EnableSummary: true},
		},
	}
	res, err := calc.CalculatePlan(p)
	if err != nil {
		t.Fatal(err)
	}
	out := confgen.RenderPlan(p, res)
	needles := []string{
		"[volume:hotwarm]",
		"path = /data/hot",
		"[volume:summaries]",
		"[windows]",
		"[windows_summary]",
		"homePath = volume:summaries/windows_summary/db",
		"# Prefer SSD/NVMe",
		"# coldToFrozenDir omitted",
	}
	for _, n := range needles {
		if !strings.Contains(out, n) {
			t.Fatalf("missing %q in:\n%s", n, out)
		}
	}
	if strings.Contains(out, "tstatsHomePath") {
		t.Fatal("tstats should not appear without DMA/ES")
	}
}

func TestRenderSmartStoreRemote(t *testing.T) {
	p := model.PlanInput{
		SmartStore: true,
		RemotePath: "s3://bucket/path",
		HotPath:    "/hot", ColdPath: "/cold", FrozenPath: "/frozen", SummariesPath: "/sum",
	}
	out := confgen.RenderPlan(p, model.PlanResult{
		Indexes: []model.IndexResult{{
			IndexName: "main", MaxTotalDataSizeMB: 100, HomePathMaxDataSizeMB: 40,
			FrozenTimePeriodInSecs: 86400, MaxDataSize: "auto",
		}},
		HotVolumeMB: 40, ColdVolumeMB: 60,
	})
	if !strings.Contains(out, "[volume:remote]") || !strings.Contains(out, "remotePath = volume:remote/main") {
		t.Fatalf("missing SmartStore remote stanza:\n%s", out)
	}
}
