package confgen_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/confgen"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestRenderContainsVolumesAndIndex(t *testing.T) {
	in := model.Input{
		DailyGB:       100,
		RetentionDays: 60,
		HotWarmDays:   30,
		Headroom:      1.0,
		IndexName:     "windows",
		HotPath:       "/hot",
		ColdPath:      "/cold",
		FrozenPath:    "/frozen",
		SummariesPath: "/summaries",
	}
	res, err := calc.Calculate(in)
	if err != nil {
		t.Fatal(err)
	}
	plan := in.ToPlan()
	plan.ArchiveFrozen = true
	dma := true
	plan.EnableDMA = &dma
	out := confgen.RenderPlan(plan, model.PlanResult{
		CompressionFactor: res.CompressionFactor,
		Indexes: []model.IndexResult{{
			IndexName:              in.IndexName,
			MaxTotalDataSizeMB:     res.MaxTotalDataSizeMB,
			HomePathMaxDataSizeMB:  res.HomePathMaxDataSizeMB,
			FrozenTimePeriodInSecs: res.FrozenTimePeriodInSecs,
			MaxDataSize:            res.MaxDataSize,
		}},
		HotVolumeMB:       res.HomePathMaxDataSizeMB,
		ColdVolumeMB:      res.MaxTotalDataSizeMB - res.HomePathMaxDataSizeMB,
		SummariesVolumeMB: 1024,
	})
	needles := []string{
		"[volume:hotwarm]",
		"[volume:cold]",
		"[volume:summaries]",
		"[windows]",
		"homePath = volume:hotwarm/windows/db",
		"coldPath = volume:cold/windows/colddb",
		"thawedPath = /cold/windows/thaweddb",
		"coldToFrozenDir = /frozen/windows/frozendb",
		"tstatsHomePath = volume:summaries/windows/datamodel_summary",
		"maxDataSize = auto_high_volume",
		"frozenTimePeriodInSecs = 5184000",
	}
	for _, n := range needles {
		if !strings.Contains(out, n) {
			t.Fatalf("missing %q in:\n%s", n, out)
		}
	}
}

func TestRenderOmitsArchiveAndTstatsByDefault(t *testing.T) {
	p := model.PlanInput{
		HotPath: "/hot", ColdPath: "/cold", FrozenPath: "/frozen", SummariesPath: "/summaries",
	}
	out := confgen.RenderPlan(p, model.PlanResult{
		Indexes: []model.IndexResult{{
			IndexName: "main", MaxTotalDataSizeMB: 100, HomePathMaxDataSizeMB: 50,
			FrozenTimePeriodInSecs: 86400, MaxDataSize: "auto",
		}},
		HotVolumeMB: 50, ColdVolumeMB: 50,
	})
	if strings.Contains(out, "coldToFrozenDir =") {
		t.Fatal("default should omit coldToFrozenDir assignment")
	}
	if strings.Contains(out, "tstatsHomePath =") {
		t.Fatal("default should omit tstatsHomePath without DMA/ES")
	}
}

func TestSanitizeIndexName(t *testing.T) {
	in := model.Input{
		DailyGB:       5,
		RetentionDays: 10,
		HotWarmDays:   3,
		Headroom:      1.0,
		IndexName:     "win logs!",
	}
	res, err := calc.Calculate(in)
	if err != nil {
		t.Fatal(err)
	}
	out := confgen.Render(in, res)
	if !strings.Contains(out, "[win_logs_]") {
		t.Fatalf("expected sanitized index stanza, got:\n%s", out)
	}
}
