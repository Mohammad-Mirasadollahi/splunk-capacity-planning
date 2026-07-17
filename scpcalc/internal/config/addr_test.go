package config_test

import (
	"os"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/config"
)

func TestCLIHostPortClearAddr(t *testing.T) {
	os.Setenv("SCPCALC_ADDR", "9.9.9.9:1111")
	defer os.Unsetenv("SCPCALC_ADDR")
	s := config.LoadServe("", "127.0.0.1", 12345)
	if s.AddrString() != "127.0.0.1:12345" {
		t.Fatalf("got %s (CLI host/port should win over env ADDR)", s.AddrString())
	}
}

func TestEnvAddrWinsWithoutCLI(t *testing.T) {
	os.Setenv("SCPCALC_ADDR", "10.0.0.5:5555")
	os.Unsetenv("SCPCALC_HOST")
	os.Unsetenv("SCPCALC_PORT")
	defer os.Unsetenv("SCPCALC_ADDR")
	s := config.LoadServe("", "", 0)
	if s.AddrString() != "10.0.0.5:5555" {
		t.Fatalf("got %s", s.AddrString())
	}
}
