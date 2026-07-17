package model_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestPlanDefaultsClusterOffForcesRFSF(t *testing.T) {
	p := model.PlanInput{RF: 5, SF: 2, IndexerCluster: false, Sources: []model.SourceRow{{IndexName: "x", DailyGB: 1}}}
	p.ApplyDefaults()
	if p.RF != 1 || p.SF != 1 {
		t.Fatalf("expected RF=SF=1, got %d/%d", p.RF, p.SF)
	}
}

func TestPlanDefaultsClusterOn(t *testing.T) {
	p := model.PlanInput{IndexerCluster: true, Sources: []model.SourceRow{{IndexName: "x", DailyGB: 1}}}
	p.ApplyDefaults()
	if p.RF != 3 || p.SF != 2 {
		t.Fatalf("expected RF=3 SF=2, got %d/%d", p.RF, p.SF)
	}
}

func TestPlanValidateInputs(t *testing.T) {
	err := (&model.PlanInput{}).Validate()
	if err == nil {
		t.Fatal("empty plan should fail")
	}
	err = (&model.PlanInput{TotalDailyGB: 10}).Validate()
	if err != nil {
		t.Fatal(err)
	}
	err = (&model.PlanInput{AvailableSummariesGB: 100}).Validate()
	if err == nil {
		t.Fatal("summaries alone should fail")
	}
	err = (&model.PlanInput{AvailableHotGB: 500}).Validate()
	if err != nil {
		t.Fatal(err)
	}
	err = (&model.PlanInput{Sources: []model.SourceRow{{IndexName: "x", DailyGB: 1}}}).Validate()
	if err != nil {
		t.Fatal(err)
	}
	// Legacy/unknown mode ignored when fields are valid
	err = (&model.PlanInput{Mode: "nope", Sources: []model.SourceRow{{IndexName: "x", DailyGB: 1}}}).Validate()
	if err != nil {
		t.Fatal(err)
	}
}

func TestESSmartStoreAlias(t *testing.T) {
	p := model.PlanInput{ESSmartStore: true, Sources: []model.SourceRow{{IndexName: "x", DailyGB: 1}}}
	p.ApplyDefaults()
	if !p.HasES || !p.SmartStore {
		t.Fatalf("alias should set HasES+SmartStore: %+v", p)
	}
}

func TestToPlanSetsIndexerClusterFromRF(t *testing.T) {
	in := model.Input{DailyGB: 10, RF: 3, SF: 2}
	p := in.ToPlan()
	if !p.IndexerCluster {
		t.Fatal("expected indexer cluster from RF>1")
	}
}
