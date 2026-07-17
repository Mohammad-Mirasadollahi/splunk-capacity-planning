package model_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestValidateRequiresVolumeSource(t *testing.T) {
	in := model.Input{RetentionDays: 30, HotWarmDays: 7}
	if err := in.Validate(); err == nil {
		t.Fatal("expected error when daily_gb and eps path missing")
	}
}

func TestValidateSFBounds(t *testing.T) {
	in := model.Input{DailyGB: 10, RetentionDays: 30, HotWarmDays: 7, RF: 2, SF: 3}
	if err := in.Validate(); err == nil {
		t.Fatal("expected sf > rf to fail")
	}
}

func TestApplyDefaults(t *testing.T) {
	in := model.Input{DailyGB: 10}
	in.ApplyDefaults()
	if in.RF != 1 || in.SF != 1 || in.Headroom != 1.2 {
		t.Fatalf("defaults not applied: %+v", in)
	}
	if in.IndexName != "windows" || in.HotPath != "/hot" {
		t.Fatalf("path/name defaults: %+v", in)
	}
}
