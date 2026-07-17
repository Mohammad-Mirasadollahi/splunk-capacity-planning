package arch

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestSuggestionsRecommendSHCForUsers(t *testing.T) {
	p := model.PlanInput{ConcurrentUsers: 16, ConcurrentSearches: 16, SavedSearches: 40, RF: 1, SF: 1}
	plan := ResolveNodeCounts(p, 200)
	found := false
	for _, s := range plan.Suggestions {
		if s.ID == "enable_shc" && s.Enable["search_head_cluster"] {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected enable_shc suggestion, got %#v", plan.Suggestions)
	}
	if plan.AutoNIDX < 1 || plan.AutoNSH < 1 {
		t.Fatalf("auto counts missing: sh=%d idx=%d", plan.AutoNSH, plan.AutoNIDX)
	}
}

func TestSuggestIndexerClusterWhenManyPeers(t *testing.T) {
	p := model.PlanInput{ConcurrentUsers: 12, ConcurrentSearches: 12, RF: 1, SF: 1}
	plan := ResolveNodeCounts(p, 800)
	found := false
	for _, s := range plan.Suggestions {
		if s.ID == "enable_indexer_cluster" {
			found = true
		}
	}
	if plan.AutoNIDX < 3 && !found {
		// low volume may not suggest — only fail if we have ≥3 peers without suggestion
		return
	}
	if plan.AutoNIDX >= 3 && !found {
		t.Fatalf("expected indexer cluster suggestion for auto N_IDX=%d, got %#v", plan.AutoNIDX, plan.Suggestions)
	}
}

func TestResourcesIncludeRAIDAndIOPS(t *testing.T) {
	p := model.PlanInput{ConcurrentUsers: 8, RF: 3, SF: 2, IndexerCluster: true}
	d := BuildDesign(p, model.PlanResult{TotalDailyRawGB: 100, CompressionFactor: 1.15, HotVolumeMB: 100000, ColdVolumeMB: 200000})
	if d.AutoNIDX < 1 {
		t.Fatalf("auto n_idx missing")
	}
	var idx *model.LayerSpec
	for i := range d.Resources {
		if d.Resources[i].Role == "Indexer" {
			idx = &d.Resources[i]
			break
		}
	}
	if idx == nil {
		t.Fatal("missing indexer layer")
	}
	if idx.RAIDHint == "" || idx.IOPSHint == "" || idx.RAMGB <= 0 || idx.CPUCores <= 0 {
		t.Fatalf("incomplete hardware: raid=%q iops=%q ram=%d cpu=%d", idx.RAIDHint, idx.IOPSHint, idx.RAMGB, idx.CPUCores)
	}
}
