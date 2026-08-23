package confgen_test

import (
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/confgen"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestRenderPlanDMAOnSummariesVolume(t *testing.T) {
	dma := true
	p := model.PlanInput{
		Mode:          model.ModeSources,
		RetentionDays: 30,
		HotWarmDays:   10,
		Headroom:      1.0,
		EnableDMA:     &dma,
		DmaYears:      1,
		HotPath:       "/data/hot",
		ColdPath:      "/data/cold",
		FrozenPath:    "/data/frozen",
		SummariesPath: "/data/summaries",
		Sources: []model.SourceRow{
			{IndexName: "windows", DailyGB: 20},
		},
	}
	res, err := calc.CalculatePlan(p)
	if err != nil {
		t.Fatal(err)
	}
	out := confgen.RenderPlan(p, res)
	needles := []string{
		"[volume:hotwarm]",
		"path = /data/hot",
		"[volume:summaries]",
		"[windows]",
		"tstatsHomePath = volume:summaries/windows/datamodel_summary",
		"# Prefer SSD/NVMe",
		"# coldToFrozenDir omitted",
	}
	for _, n := range needles {
		if !strings.Contains(out, n) {
			t.Fatalf("missing %q in:\n%s", n, out)
		}
	}
	if strings.Contains(out, "_summary]") {
		t.Fatal("optional *_summary index stanzas must not be emitted")
	}
}
