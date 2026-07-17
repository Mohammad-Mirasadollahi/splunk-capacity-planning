package calc_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestPerPeerDivision(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:           model.ModeTotal,
		TotalDailyGB:   300,
		RetentionDays:  30,
		HotWarmDays:    10,
		Headroom:       1.0,
		IndexerCluster: true,
		RF:             3,
		SF:             2,
		NIdx:           3,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.IndexerPeers != 3 {
		t.Fatalf("peers=%d", res.IndexerPeers)
	}
	if res.HotVolumeClusterMB == 0 || res.HotVolumeMB*3 < res.HotVolumeClusterMB-3 {
		t.Fatalf("per-peer hot=%d cluster=%d", res.HotVolumeMB, res.HotVolumeClusterMB)
	}
	if !strings.Contains(res.IndexesConf, "PER PEER") {
		t.Fatalf("conf should note per peer:\n%s", res.IndexesConf)
	}
}

func TestMeasuredCompression(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:          model.ModeTotal,
		TotalDailyGB:  100,
		RetentionDays: 10,
		HotWarmDays:   5,
		Headroom:      1.0,
		Compression:   0.4,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.CompressionFactor != 0.4 {
		t.Fatalf("comp=%v", res.CompressionFactor)
	}
}

func TestDuplicateIndexRejected(t *testing.T) {
	_, err := calc.CalculatePlan(model.PlanInput{
		Mode:          model.ModeSources,
		RetentionDays: 10,
		HotWarmDays:   5,
		Headroom:      1.0,
		Sources: []model.SourceRow{
			{IndexName: "win logs", DailyGB: 1},
			{IndexName: "win@logs", DailyGB: 1},
		},
	})
	if err == nil {
		t.Fatal("expected duplicate sanitize error")
	}
}

func TestCapacityWarningsIncludeTopology(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:            model.ModeCapacity,
		AvailableHotGB:  1000,
		AvailableColdGB: 2000,
		RetentionDays:   90,
		HotWarmDays:     30,
		Headroom:        1.0,
		HasES:           true,
		HasITSI:         true,
		SmartStore:      true,
	})
	if err != nil {
		t.Fatal(err)
	}
	joined := strings.ToLower(strings.Join(res.Warnings, " "))
	if !strings.Contains(joined, "es") || !strings.Contains(joined, "itsi") {
		t.Fatalf("expected ES+ITSI warning in capacity mode, got %v", res.Warnings)
	}
}
