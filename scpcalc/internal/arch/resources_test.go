package arch_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestRecommendResourcesHasIndexer(t *testing.T) {
	d := model.Design{NSH: 2, NIDX: 4, HotNeedGB: 1000, ColdNeedGB: 2000, SummariesNeedGB: 100}
	p := model.PlanInput{ConcurrentUsers: 12, ConcurrentSearches: 12, FrozenPath: "/frozen"}
	res := arch.RecommendResources(p, d, 800)
	if len(res) < 2 {
		t.Fatalf("expected layers, got %d", len(res))
	}
	foundIDX := false
	for _, L := range res {
		if L.Role == "Indexer" && L.Count == 4 && L.CPUCores >= 12 {
			foundIDX = true
			if L.CPUPhysicalCores != L.CPUCores || L.CPULogicalVCPU != L.VCPU {
				t.Fatalf("CPU guidance not filled: %+v", L)
			}
			if L.CPUBasis != "physical_cores" {
				t.Fatalf("cpu_basis=%q", L.CPUBasis)
			}
			if L.VirtCPURule == "" || L.SplunkParallelization == "" {
				t.Fatalf("missing virt/parallel notes: %+v", L)
			}
			if L.VCPU != L.CPUCores*2 {
				t.Fatalf("expected logical=2×physical, phys=%d vcpu=%d", L.CPUCores, L.VCPU)
			}
		}
	}
	if !foundIDX {
		t.Fatalf("missing indexer layer: %+v", res)
	}
}

func TestESUsesFloorNotAlwaysHigh(t *testing.T) {
	// Light ES ingest with enough peers → ES/ITSI minimum (16c/32GB), not automatic High.
	d := model.Design{NSH: 1, NIDX: 3, HasES: true, HotNeedGB: 100, ColdNeedGB: 100}
	p := model.PlanInput{ConcurrentUsers: 4, ConcurrentSearches: 4, FrozenPath: "/frozen", HasES: true}
	res := arch.RecommendResources(p, d, 200)
	for _, L := range res {
		if L.Role == "Indexer" {
			if L.CPUCores < 16 || L.RAMGB < 32 {
				t.Fatalf("ES indexer floor 16c/32GB, got %dc/%dGB tier=%s", L.CPUCores, L.RAMGB, L.Tier)
			}
			if L.Tier == "high-performance" {
				t.Fatalf("light ES plan should not force high-performance, got %s", L.Tier)
			}
		}
		if strings.Contains(L.Role, "ES search head") {
			if L.RAMGB < 32 || L.CPUCores < 16 {
				t.Fatalf("ES SH floor 16c/32GB, got %dc/%dGB", L.CPUCores, L.RAMGB)
			}
		}
	}
}

func TestMoreIndexersLowersTier(t *testing.T) {
	p := model.PlanInput{ConcurrentUsers: 8, ConcurrentSearches: 8, FrozenPath: "/frozen"}
	few := arch.RecommendResources(p, model.Design{NSH: 1, NIDX: 1, HotNeedGB: 500, ColdNeedGB: 500}, 400)
	many := arch.RecommendResources(p, model.Design{NSH: 1, NIDX: 8, HotNeedGB: 500, ColdNeedGB: 500}, 400)
	var fewCores, manyCores int
	for _, L := range few {
		if L.Role == "Indexer" {
			fewCores = L.CPUCores
		}
	}
	for _, L := range many {
		if L.Role == "Indexer" {
			manyCores = L.CPUCores
		}
	}
	if fewCores <= 0 || manyCores <= 0 {
		t.Fatalf("missing indexer cores few=%d many=%d", fewCores, manyCores)
	}
	if manyCores > fewCores {
		t.Fatalf("more peers should not raise tier: few=%d many=%d", fewCores, manyCores)
	}
}

func TestConcurrentUsersRaiseSHResources(t *testing.T) {
	// Official: more active users require additional CPU/RAM on the search tier.
	few := model.PlanInput{ConcurrentUsers: 4, ConcurrentSearches: 4, FrozenPath: "/frozen"}
	many := model.PlanInput{ConcurrentUsers: 32, ConcurrentSearches: 4, FrozenPath: "/frozen"}
	d := model.Design{NSH: 1, NIDX: 2, HotNeedGB: 100, ColdNeedGB: 100}

	var fewRAM, manyRAM, fewCores, manyCores int
	for _, L := range arch.RecommendResources(few, d, 100) {
		if L.Role == "Search head" {
			fewRAM, fewCores = L.RAMGB, L.CPUCores
		}
	}
	for _, L := range arch.RecommendResources(many, d, 100) {
		if L.Role == "Search head" {
			manyRAM, manyCores = L.RAMGB, L.CPUCores
		}
	}
	if manyRAM < 32 {
		t.Fatalf("32 concurrent users on 1 SH should bump RAM (≥32), got %d (few=%d)", manyRAM, fewRAM)
	}
	if manyCores < 32 {
		t.Fatalf("32 concurrent users on 1 SH should size ≥32 cores, got %d (few=%d)", manyCores, fewCores)
	}
	if manyCores <= fewCores {
		t.Fatalf("more SH users must raise cores: few=%d many=%d", fewCores, manyCores)
	}
}

func TestConcurrentSearchesRaiseSHAndIndexerResources(t *testing.T) {
	// Official: 1 active search ≤ 1 CPU core; mid-range indexer adds headroom for search concurrency.
	light := model.PlanInput{ConcurrentUsers: 8, ConcurrentSearches: 4, FrozenPath: "/frozen"}
	heavy := model.PlanInput{ConcurrentUsers: 8, ConcurrentSearches: 32, FrozenPath: "/frozen"}
	d := model.Design{NSH: 1, NIDX: 2, HotNeedGB: 200, ColdNeedGB: 200}

	var lightSH, heavySH, lightIDX, heavyIDX int
	for _, L := range arch.RecommendResources(light, d, 200) {
		switch L.Role {
		case "Search head":
			lightSH = L.CPUCores
		case "Indexer":
			lightIDX = L.CPUCores
		}
	}
	for _, L := range arch.RecommendResources(heavy, d, 200) {
		switch L.Role {
		case "Search head":
			heavySH = L.CPUCores
			if L.RAMGB < 32 {
				t.Fatalf("heavy concurrent searches should bump SH RAM (≥32), got %d", L.RAMGB)
			}
		case "Indexer":
			heavyIDX = L.CPUCores
		}
	}
	if lightSH < 16 || heavySH < 32 {
		t.Fatalf("SH cores: light=%d want≥16, heavy=%d want≥32 (S=32 on 1 SH)", lightSH, heavySH)
	}
	if heavySH <= lightSH {
		t.Fatalf("more concurrent searches must raise SH cores: light=%d heavy=%d", lightSH, heavySH)
	}
	if heavyIDX < lightIDX {
		t.Fatalf("higher search concurrency should not lower indexer tier: light=%d heavy=%d", lightIDX, heavyIDX)
	}
	if heavyIDX < 24 {
		t.Fatalf("S=32 across 2 IDX should prefer mid-range+ indexer (≥24c), got %d", heavyIDX)
	}
}

func TestMoreSearchHeadsLowersPerSHCores(t *testing.T) {
	p := model.PlanInput{ConcurrentUsers: 32, ConcurrentSearches: 32, FrozenPath: "/frozen"}
	one := arch.RecommendResources(p, model.Design{NSH: 1, NIDX: 2, HotNeedGB: 100, ColdNeedGB: 100}, 100)
	many := arch.RecommendResources(p, model.Design{NSH: 4, NIDX: 2, HotNeedGB: 100, ColdNeedGB: 100}, 100)
	var oneCores, manyCores int
	for _, L := range one {
		if L.Role == "Search head" {
			oneCores = L.CPUCores
		}
	}
	for _, L := range many {
		if L.Role == "Search head" {
			manyCores = L.CPUCores
		}
	}
	if oneCores < 32 {
		t.Fatalf("1 SH with 32 concurrent searches needs ≥32 cores, got %d", oneCores)
	}
	if manyCores > oneCores {
		t.Fatalf("more SH should not raise per-node cores: one=%d many=%d", oneCores, manyCores)
	}
	if manyCores != 16 {
		t.Fatalf("4 SH × 16 cores covers 32 searches → expect 16c/SH, got %d", manyCores)
	}
}
