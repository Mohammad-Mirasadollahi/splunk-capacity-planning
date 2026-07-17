package arch_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
)

func TestRecommendCountsExample(t *testing.T) {
	// D=800, U=12 → up to 16 users, 600GB–1TB → 2 SH + 4 IDX
	c := arch.RecommendCounts(800, 12)
	if c.NSH != 2 || c.NIDX != 4 || c.CombinedInstance {
		t.Fatalf("got %+v", c)
	}
}

func TestCombinedSmall(t *testing.T) {
	c := arch.RecommendCounts(1, 2)
	if !c.CombinedInstance {
		t.Fatalf("expected combined, got %+v", c)
	}
}
