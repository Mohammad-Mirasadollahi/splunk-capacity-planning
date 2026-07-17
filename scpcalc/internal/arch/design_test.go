package arch_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestBuildDesignSHCAndCluster(t *testing.T) {
	p := model.PlanInput{
		IndexerCluster:    true,
		RF:                3,
		SF:                2,
		SearchHeadCluster: true,
		ConcurrentUsers:   12,
		RetentionDays:     90,
		HotWarmDays:       30,
		HotPath:           "/hot",
		ColdPath:          "/cold",
		FrozenPath:        "/frozen",
		SummariesPath:     "/summaries",
	}
	out := model.PlanResult{
		CompressionFactor: 1.15,
		TotalDailyRawGB:   800,
		HotVolumeMB:       1024 * 1000,
		ColdVolumeMB:      1024 * 2000,
		SummariesVolumeMB: 1024 * 100,
	}
	d := arch.BuildDesign(p, out)
	if d.NSH < 3 {
		t.Fatalf("SHC with users×volume baseline 2 should raise 2→3, got %d", d.NSH)
	}
	if !d.ClusterManager || !d.SHCDeployer {
		t.Fatalf("expected CM+deployer: %+v", d)
	}
	roles := map[string]bool{}
	for _, L := range d.Resources {
		roles[L.Role] = true
	}
	if !roles["Cluster manager"] || !roles["SHC deployer"] {
		t.Fatalf("resources missing CM/deployer roles: %v", roles)
	}
	if d.NIDX < 3 {
		t.Fatalf("cluster peers should be >= RF, got %d", d.NIDX)
	}
	if d.StructureText == "" || d.SettingsText == "" || d.ResourcesText == "" {
		t.Fatal("expected narrative texts")
	}
	if d.NodePlanText == "" || !strings.Contains(d.NodePlanText, "NODE COUNTS") {
		t.Fatalf("expected node plan text, got %q", d.NodePlanText)
	}
	if !strings.Contains(d.StructureText, "Node counts") {
		t.Fatal("structure should summarize node counts")
	}
	if len(d.Resources) == 0 {
		t.Fatal("expected resource layers")
	}
}

func TestBuildDesignSmartStoreESCache(t *testing.T) {
	p := model.PlanInput{
		SmartStore: true,
		HasES:      true,
		HotPath:    "/hot", ColdPath: "/cold", FrozenPath: "/frozen", SummariesPath: "/summaries",
		RetentionDays: 90, HotWarmDays: 30, ConcurrentUsers: 8,
	}
	out := model.PlanResult{CompressionFactor: 0.5, TotalDailyRawGB: 200, HotVolumeMB: 1000, ColdVolumeMB: 2000}
	d := arch.BuildDesign(p, out)
	if d.CacheDays != 90 {
		t.Fatalf("cache days=%d", d.CacheDays)
	}
	// 0.5 * 200 * 90 = 9000
	if d.LocalCacheTotalGB < 8999 || d.LocalCacheTotalGB > 9001 {
		t.Fatalf("cache total=%v", d.LocalCacheTotalGB)
	}
	if !strings.Contains(d.StructureText, "SmartStore") {
		t.Fatal("structure missing SmartStore")
	}
}

func TestBuildDesignFitFlags(t *testing.T) {
	p := model.PlanInput{
		AvailableHotGB:  10,
		AvailableColdGB: 5,
		HotPath:         "/hot", ColdPath: "/cold", FrozenPath: "/frozen", SummariesPath: "/s",
		RetentionDays: 30, HotWarmDays: 7, ConcurrentUsers: 4,
	}
	out := model.PlanResult{
		CompressionFactor: 0.5,
		TotalDailyRawGB:   50,
		HotVolumeMB:       20 * 1024, // 20 GB need > 10 avail
		ColdVolumeMB:      2 * 1024,
	}
	d := arch.BuildDesign(p, out)
	if d.HotFits == nil || *d.HotFits {
		t.Fatalf("hot should not fit, got %+v", d.HotFits)
	}
	if d.ColdFits == nil || !*d.ColdFits {
		t.Fatalf("cold should fit, got %+v", d.ColdFits)
	}
}
