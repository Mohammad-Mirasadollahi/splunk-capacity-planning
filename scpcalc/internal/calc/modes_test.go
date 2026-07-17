package calc_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestModeTotalSynthesizesMain(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:          model.ModeTotal,
		TotalDailyGB:  200,
		RetentionDays: 30,
		HotWarmDays:   7,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.TotalDailyRawGB != 200 {
		t.Fatalf("raw=%v", res.TotalDailyRawGB)
	}
	if len(res.Indexes) != 1 || res.Indexes[0].IndexName != "main" {
		t.Fatalf("indexes=%+v", res.Indexes)
	}
	if res.Design == nil || res.Design.StructureText == "" {
		t.Fatal("expected design narrative")
	}
}

func TestModeTotalScalesSources(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:          model.ModeTotal,
		TotalDailyGB:  100,
		RetentionDays: 10,
		HotWarmDays:   5,
		Headroom:      1.0,
		Sources: []model.SourceRow{
			{IndexName: "a", DailyGB: 40},
			{IndexName: "b", DailyGB: 10},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.TotalDailyRawGB < 99.9 || res.TotalDailyRawGB > 100.1 {
		t.Fatalf("expected scaled to 100, got %v", res.TotalDailyRawGB)
	}
}

func TestCapacityModeDiskOnly(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:            model.ModeCapacity,
		AvailableHotGB:  1000,
		AvailableColdGB: 2000,
		RetentionDays:   90,
		HotWarmDays:     30,
		Headroom:        1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Design == nil || res.Design.MaxDailyGBFromDisk <= 0 {
		t.Fatalf("expected max daily from disk, design=%+v", res.Design)
	}
	if !strings.Contains(strings.Join(res.Warnings, " "), "capacity mode") {
		t.Fatalf("warnings=%v", res.Warnings)
	}
}

func TestAvailableCapsShrinkConfVolumes(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:           model.ModeSources,
		RetentionDays:  60,
		HotWarmDays:    30,
		Headroom:       1.0,
		AvailableHotGB: 1, // tiny vs need
		Sources: []model.SourceRow{
			{IndexName: "windows", DailyGB: 100},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.HotVolumeMB != 1024 { // 1 GB × 1024
		t.Fatalf("hot volume mb=%d", res.HotVolumeMB)
	}
	if res.Design == nil || res.Design.HotNeedGB < 10 {
		t.Fatalf("design need should remain large, got %v", res.Design.HotNeedGB)
	}
	found := false
	for _, w := range res.Warnings {
		if strings.Contains(w, "available_hot_gb") {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected hot cap warning, got %v", res.Warnings)
	}
}

func TestESAndITSIWarning(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:          model.ModeTotal,
		TotalDailyGB:  50,
		RetentionDays: 30,
		HotWarmDays:   7,
		Headroom:      1.0,
		HasES:         true,
		HasITSI:       true,
	})
	if err != nil {
		t.Fatal(err)
	}
	joined := strings.ToLower(strings.Join(res.Warnings, " "))
	if !strings.Contains(joined, "es") || !strings.Contains(joined, "itsi") {
		t.Fatalf("expected ES+ITSI warning, got %v", res.Warnings)
	}
}

func TestIndexerClusterDefaultsComp(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:           model.ModeTotal,
		TotalDailyGB:   100,
		RetentionDays:  30,
		HotWarmDays:    7,
		Headroom:       1.0,
		IndexerCluster: true,
		// RF/SF default 3/2 → Comp 1.15
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.CompressionFactor < 1.149 || res.CompressionFactor > 1.151 {
		t.Fatalf("comp=%v want 1.15", res.CompressionFactor)
	}
}
