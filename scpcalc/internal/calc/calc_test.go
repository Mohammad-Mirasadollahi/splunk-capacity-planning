package calc_test

import (
	"math"
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func TestNonClusterFiftyPercent(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		DailyGB:       100,
		RetentionDays: 30,
		HotWarmDays:   7,
		RF:            1,
		SF:            1,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.CompressionFactor != 0.5 {
		t.Fatalf("comp=%v want 0.5", res.CompressionFactor)
	}
	if math.Abs(res.DailyOnDiskGB-50) > 0.01 {
		t.Fatalf("on_disk=%v want 50", res.DailyOnDiskGB)
	}
	// 50 GB/day * 30 / 1024
	wantTB := 50.0 * 30 / 1024
	if math.Abs(res.SearchableTB-wantTB) > 0.01 {
		t.Fatalf("tb=%v want %v", res.SearchableTB, wantTB)
	}
	if res.MaxDataSize != "auto_high_volume" {
		t.Fatalf("maxDataSize=%s", res.MaxDataSize)
	}
	if res.FrozenTimePeriodInSecs != 30*86400 {
		t.Fatalf("frozen=%d", res.FrozenTimePeriodInSecs)
	}
}

func TestClusterComp(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		DailyGB:       100,
		RetentionDays: 30,
		HotWarmDays:   7,
		RF:            3,
		SF:            2,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	want := 0.15*3 + 0.35*2 // 1.15
	if math.Abs(res.CompressionFactor-want) > 0.001 {
		t.Fatalf("comp=%v want %v", res.CompressionFactor, want)
	}
}

func TestDoc05ReverseExample(t *testing.T) {
	// maxTotal ≈ 3443200 at 60 days, headroom 1.0, comp 0.5
	// Daily_OnDisk_MB ≈ 3443200/60
	dailyOnDiskMB := 3443200.0 / 60.0
	dailyRawGB := (dailyOnDiskMB / 1024.0) / 0.5

	res, err := calc.Calculate(model.Input{
		DailyGB:       dailyRawGB,
		RetentionDays: 60,
		HotWarmDays:   30,
		RF:            1,
		SF:            1,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(float64(res.MaxTotalDataSizeMB)-3443200) > 2 {
		t.Fatalf("maxTotal=%d want ~3443200", res.MaxTotalDataSizeMB)
	}
	if math.Abs(float64(res.HomePathMaxDataSizeMB)-1721600) > 2 {
		t.Fatalf("homeMax=%d want ~1721600", res.HomePathMaxDataSizeMB)
	}
	if math.Abs(float64(res.ColdPathMaxDataSizeMB)-1721600) > 2 {
		t.Fatalf("coldMax=%d want ~1721600 (maxTotal − homePath)", res.ColdPathMaxDataSizeMB)
	}
}

func TestEPSPath(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		EPS:           1000,
		EventBytes:    500,
		RetentionDays: 7,
		HotWarmDays:   3,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	wantRaw := 1000 * 86400 * 500 / (1024.0 * 1024.0 * 1024.0)
	if math.Abs(res.DailyRawGB-wantRaw) > 0.01 {
		t.Fatalf("raw=%v want %v", res.DailyRawGB, wantRaw)
	}
}

func TestSummariesWarning(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		DailyGB:       5,
		RetentionDays: 30,
		HotWarmDays:   7,
		ColdPath:      "/cold",
		SummariesPath: "/cold",
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.MaxDataSize != "auto" {
		t.Fatalf("expected auto for <10GB/day, got %s", res.MaxDataSize)
	}
	if len(res.Warnings) == 0 {
		t.Fatal("expected summaries/cold warning")
	}
	if res.IndexesConf == "" {
		t.Fatal("expected indexes.conf")
	}
}

func TestValidation(t *testing.T) {
	_, err := calc.Calculate(model.Input{})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestDailyGBWinsOverEPS(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		DailyGB:       50,
		EPS:           99999,
		EventBytes:    99999,
		RetentionDays: 10,
		HotWarmDays:   5,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(res.DailyRawGB-50) > 0.001 {
		t.Fatalf("expected daily_gb to win, got %v", res.DailyRawGB)
	}
}

func TestESSmartStoreWarning(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		DailyGB:       20,
		RetentionDays: 30,
		HotWarmDays:   10,
		Headroom:      1.0,
		ESSmartStore:  true,
	})
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, w := range res.Warnings {
		if strings.Contains(strings.ToLower(w), "smartstore") || strings.Contains(w, "90") {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected ES SmartStore warning, got %v", res.Warnings)
	}
}

func TestHotWarmExceedsRetentionClampsHomePath(t *testing.T) {
	res, err := calc.Calculate(model.Input{
		DailyGB:       100,
		RetentionDays: 30,
		HotWarmDays:   90,
		Headroom:      1.0,
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.HomePathMaxDataSizeMB > res.MaxTotalDataSizeMB {
		t.Fatalf("homePath %d exceeds maxTotal %d", res.HomePathMaxDataSizeMB, res.MaxTotalDataSizeMB)
	}
	if res.HomePathMaxDataSizeMB != res.MaxTotalDataSizeMB {
		t.Fatalf("expected homePath clamped to maxTotal, home=%d total=%d", res.HomePathMaxDataSizeMB, res.MaxTotalDataSizeMB)
	}
	if res.ColdPathMaxDataSizeMB != 0 {
		t.Fatalf("expected coldPath 0 when hot_warm covers all retention, got %d", res.ColdPathMaxDataSizeMB)
	}
	found := false
	for _, w := range res.Warnings {
		if strings.Contains(w, "hot_warm_days > retention_days") {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected hot_warm_days warning, got %v", res.Warnings)
	}
}

func TestCalculateRejectsZeroIngest(t *testing.T) {
	// Legacy Calculate must not return an empty Result with a nil error when
	// there is nothing to size (zero ingest is dropped before index rows exist).
	_, err := calc.Calculate(model.Input{
		RetentionDays: 30,
		HotWarmDays:   7,
		Headroom:      1.0,
	})
	if err == nil {
		t.Fatal("expected error when legacy Calculate has no sized indexes")
	}
}
