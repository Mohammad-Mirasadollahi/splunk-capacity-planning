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

func TestResolveNodeCounts_ConcurrentSearchesRaiseSH(t *testing.T) {
	// users×volume alone: U=8, D=100 → 1 SH + 1 IDX
	p := model.PlanInput{
		ConcurrentUsers:    8,
		ConcurrentSearches: 40, // ceil(40/16)=3
		SavedSearches:      80,
		RF:                 1,
		SF:                 1,
	}
	plan := arch.ResolveNodeCounts(p, 100)
	if plan.NSH < 3 {
		t.Fatalf("want N_SH≥3 from search-core floor, got %d steps=%v", plan.NSH, plan.Steps)
	}
	if plan.CombinedInstance {
		t.Fatal("high concurrent searches should not stay combined")
	}
	joined := strings.Join(plan.Steps, "\n")
	if !strings.Contains(joined, "Concurrent search volume") && !strings.Contains(joined, "1 active search") {
		t.Fatalf("expected search-core rationale in steps: %s", joined)
	}
}

func TestResolveNodeCounts_SearchLoadFitsWithoutRaise(t *testing.T) {
	p := model.PlanInput{
		ConcurrentUsers:    12,
		ConcurrentSearches: 20, // 2 SH × 16 cores covers 20
		SavedSearches:      40,
		RF:                 1,
		SF:                 1,
	}
	plan := arch.ResolveNodeCounts(p, 800) // baseline 2 SH + 4 IDX
	if plan.NSH != 2 {
		t.Fatalf("want N_SH=2 (search load fits), got %d", plan.NSH)
	}
}

