package calc_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestPlanMultiIndexAndSummary(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Headroom:             1.0,
		RetentionDays:        60,
		HotWarmDays:          30,
		SummaryPct:           0.10,
		SummaryRetentionDays: 60,
		Sources: []model.SourceRow{
			{Key: "windows", Label: "Windows", IndexName: "windows", DailyGB: 100, EventBytes: 1200, EnableSummary: true},
			{Key: "linux", Label: "Linux", IndexName: "linux", EPS: 1000, EventBytes: 300},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Indexes) != 2 {
		t.Fatalf("indexes=%d", len(res.Indexes))
	}
	if res.Indexes[0].SummaryIndexName != "windows_summary" {
		t.Fatalf("summary name=%s", res.Indexes[0].SummaryIndexName)
	}
	if res.TotalSummaryRawGB <= 0 {
		t.Fatal("expected summary raw > 0")
	}
	if res.IndexesConf == "" || res.HotVolumeMB <= 0 {
		t.Fatal("expected conf and volume budgets")
	}
}
