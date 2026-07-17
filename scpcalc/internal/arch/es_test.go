package arch_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
)

func TestESMinIndexersTable(t *testing.T) {
	cases := []struct {
		d    float64
		shc  bool
		want int
	}{
		{300, false, 3},
		{1024, false, 10},
		{5000, false, 24},
		{15359, false, 24},
		{15360, false, 150},
		{25000, false, 300},
		{45000, true, 240},
	}
	for _, c := range cases {
		got := arch.ESMinIndexers(c.d, c.shc)
		if got != c.want {
			t.Fatalf("ESMinIndexers(%v, shc=%v)=%d want %d", c.d, c.shc, got, c.want)
		}
	}
}
