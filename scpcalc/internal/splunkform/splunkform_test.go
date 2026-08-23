package splunkform

import "testing"

func TestArchiveNeedGB_Official(t *testing.T) {
	// 100 GB/day, 90d, RF=2 cluster → 100 × 0.15 × 90 × 2 = 2700
	got := ArchiveNeedGB(100, 90, true, 2, false)
	if got != 2700 {
		t.Fatalf("archive cluster RF=2: got %.1f want 2700", got)
	}
	// Standalone → no RF multiplier
	got = ArchiveNeedGB(100, 90, false, 1, false)
	if got != 1350 {
		t.Fatalf("archive standalone: got %.1f want 1350", got)
	}
	// Single-copy script override
	got = ArchiveNeedGB(100, 90, true, 3, true)
	if got != 1350 {
		t.Fatalf("archive single copy: got %.1f want 1350", got)
	}
}

func TestDMAEstimateMB_ESOfficial(t *testing.T) {
	mb, note := DMAEstimateMB(100, 100, 1, 0, 1, 1, 8)
	want := int64(348160) // 100 × 3.4 × 1024 MB
	if mb != want {
		t.Fatalf("DMA official: got %d want %d", mb, want)
	}
	if note == "" {
		t.Fatal("expected planning note")
	}
}

func TestDMAEstimateMB_Override(t *testing.T) {
	// 50 GB/day on-disk, 90d, headroom 1, pct 0.1 → 50*1024*90*0.1 = 460800
	mb, _ := DMAEstimateMB(100, 50, 0.5, 0.1, 1, 1, 90)
	if mb != 460800 {
		t.Fatalf("DMA override: got %d want 460800", mb)
	}
}
