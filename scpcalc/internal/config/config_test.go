package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/config"
)

func TestDefaultAddr(t *testing.T) {
	os.Unsetenv("SCPCALC_ADDR")
	os.Unsetenv("SCPCALC_HOST")
	os.Unsetenv("SCPCALC_PORT")
	s := config.LoadServe("", "", 0)
	if s.AddrString() != "0.0.0.0:12345" {
		t.Fatalf("got %s", s.AddrString())
	}
}

func TestCLIAddrWins(t *testing.T) {
	os.Unsetenv("SCPCALC_ADDR")
	s := config.LoadServe("127.0.0.1:9999", "", 0)
	if s.AddrString() != "127.0.0.1:9999" {
		t.Fatalf("got %s", s.AddrString())
	}
}

func TestDotEnvFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("SCPCALC_HOST=127.0.0.1\nSCPCALC_PORT=12345\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	os.Unsetenv("SCPCALC_ADDR")
	os.Unsetenv("SCPCALC_HOST")
	os.Unsetenv("SCPCALC_PORT")
	if err := config.LoadDotEnv(path); err != nil {
		t.Fatal(err)
	}
	s := config.LoadServe("", "", 0)
	// LoadServe calls LoadDotEnv("") again; env already set from file
	if s.Host != "127.0.0.1" || s.Port != 12345 {
		t.Fatalf("got host=%s port=%d", s.Host, s.Port)
	}
	if s.AddrString() != "127.0.0.1:12345" {
		t.Fatalf("addr=%s", s.AddrString())
	}
}
