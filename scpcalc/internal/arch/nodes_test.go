package arch_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestResolveNodeCounts_SHCFloor(t *testing.T) {
	p := model.PlanInput{
		ConcurrentUsers:   8,
		SearchHeadCluster: true,
		RF:                3,
		SF:                2,
	}
	plan := arch.ResolveNodeCounts(p, 100) // table: 1 SH + 1 IDX
	if plan.NSH < 3 {
		t.Fatalf("SHC should raise N_SH to ≥3, got %d", plan.NSH)
	}
	if !plan.SHCDeployer {
		t.Fatal("expected SHC deployer")
	}
	if plan.CombinedInstance {
		t.Fatal("SHC cannot stay combined")
	}
}

func TestResolveNodeCounts_IndexerClusterRF(t *testing.T) {
	p := model.PlanInput{
		ConcurrentUsers: 2,
		IndexerCluster:  true,
		RF:              3,
		SF:              2,
	}
	plan := arch.ResolveNodeCounts(p, 1) // combined cell
	if plan.CombinedInstance {
		t.Fatal("indexer cluster must split combined")
	}
	if plan.NIDX < 3 {
		t.Fatalf("RF floor: want N_IDX≥3, got %d", plan.NIDX)
	}
	if !plan.ClusterManager {
		t.Fatal("expected cluster manager")
	}
}

func TestResolveNodeCounts_UsersAndVolume(t *testing.T) {
	p := model.PlanInput{ConcurrentUsers: 12, RF: 3, SF: 2}
	plan := arch.ResolveNodeCounts(p, 800)
	if plan.NSH != 2 || plan.NIDX != 4 {
		t.Fatalf("want 2 SH + 4 IDX, got %d+%d steps=%v", plan.NSH, plan.NIDX, plan.Steps)
	}
	if plan.BaseNSH != 2 || plan.BaseNIDX != 4 {
		t.Fatalf("base mismatch: %+v", plan)
	}
	txt := arch.FormatNodePlan(plan)
	if !strings.Contains(txt, "Base from Performance Recommendations") {
		t.Fatalf("missing rationale: %s", txt)
	}
}

func TestResolveNodeCounts_OverrideBelowFloorWarns(t *testing.T) {
	p := model.PlanInput{
		ConcurrentUsers: 12,
		NIdx:            2,
		RF:              3,
		SF:              2,
	}
	plan := arch.ResolveNodeCounts(p, 800) // auto 4
	if plan.NIDX != 2 {
		t.Fatalf("override should stick when no cluster, got %d", plan.NIDX)
	}
	if len(plan.Warnings) == 0 {
		t.Fatal("expected warning for n_idx below auto")
	}
}
