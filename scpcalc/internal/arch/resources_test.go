package arch_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestRecommendResourcesHasIndexer(t *testing.T) {
	d := model.Design{NSH: 2, NIDX: 4, HotNeedGB: 1000, ColdNeedGB: 2000, SummariesNeedGB: 100}
	p := model.PlanInput{ConcurrentUsers: 12, FrozenPath: "/frozen"}
	res := arch.RecommendResources(p, d, 800)
	if len(res) < 2 {
		t.Fatalf("expected layers, got %d", len(res))
	}
	foundIDX := false
	for _, L := range res {
		if L.Role == "Indexer" && L.Count == 4 && L.CPUCores >= 12 {
			foundIDX = true
		}
	}
	if !foundIDX {
		t.Fatalf("missing indexer layer: %+v", res)
	}
}

func TestESRaisesIndexerTier(t *testing.T) {
	d := model.Design{NSH: 1, NIDX: 3, HasES: true, HotNeedGB: 100, ColdNeedGB: 100}
	p := model.PlanInput{FrozenPath: "/frozen"}
	res := arch.RecommendResources(p, d, 200)
	for _, L := range res {
		if L.Role == "Indexer" && L.Tier != "high-performance" {
			t.Fatalf("ES should prefer high-performance IDX, got %s", L.Tier)
		}
		if L.Role == "Search head" && L.RAMGB < 32 {
			t.Fatalf("ES SH RAM floor 32GB, got %d", L.RAMGB)
		}
	}
}
