package calc_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestConfHeaderIncludesAuthorAndPlanSnapshot(t *testing.T) {
	res, err := calc.CalculatePlan(model.PlanInput{
		Mode:           model.ModeTotal,
		TotalDailyGB:   100,
		RetentionDays:  90,
		HotWarmDays:    30,
		Headroom:       1.2,
		IndexerCluster: true,
		RF:             2,
		SF:             2,
		NIdx:           4,
		NSh:            3,
		HasES:          true,
		ArchiveFrozen:  true,
		FrozenPath:     "/opt/frozen",
		HotPath:        "/hot",
		ColdPath:       "/cold",
		SummariesPath:  "/summaries",
	})
	if err != nil {
		t.Fatal(err)
	}
	conf := res.IndexesConf
	checks := []string{
		"Mohammad Mirasadollahi",
		"github.com/Mohammad-Mirasadollahi/splunk-capacity-planning",
		"Plan snapshot",
		"indexer cluster ON",
		"RF=2",
		"SF=2",
		"N_IDX≈4",
		"apps: ES, DMA",
		"searchable 90d",
		"hot/warm 30d",
		"cold 60d",
		"ARCHIVE on freeze",
		"PER PEER",
		"N_IDX=4",
	}
	for _, want := range checks {
		if !strings.Contains(conf, want) {
			t.Fatalf("missing %q in header:\n%s", want, conf[:min(800, len(conf))])
		}
	}

	// Delete-on-freeze should flip the comment
	res2, err := calc.CalculatePlan(model.PlanInput{
		Mode: model.ModeTotal, TotalDailyGB: 10, RetentionDays: 30, HotWarmDays: 10, Headroom: 1.0,
		ArchiveFrozen: false,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(res2.IndexesConf, "DELETE on freeze") {
		t.Fatalf("expected DELETE policy:\n%s", res2.IndexesConf[:500])
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
