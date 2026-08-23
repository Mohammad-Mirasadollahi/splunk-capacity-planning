package calc_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestPlanMultiIndexAndDMA(t *testing.T) {
	dma := true
	res, err := calc.CalculatePlan(model.PlanInput{
		Headroom:      1.0,
		RetentionDays: 60,
		HotWarmDays:   30,
		EnableDMA:     &dma,
		DmaYears:      1,
		Sources: []model.SourceRow{
			{Key: "windows", Label: "Windows", IndexName: "windows", DailyGB: 100, EventBytes: 1200},
			{Key: "linux", Label: "Linux", IndexName: "linux", EPS: 1000, EventBytes: 300},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Indexes) != 2 {
		t.Fatalf("indexes=%d", len(res.Indexes))
	}
	if res.DmaVolumeMB <= 0 {
		t.Fatal("expected DMA volume > 0")
	}
	if res.IndexesConf == "" || res.HotVolumeMB <= 0 {
		t.Fatal("expected conf and volume budgets")
	}
}
