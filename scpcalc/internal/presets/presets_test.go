package presets_test

import (
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/presets"
)

func TestDefaultsContainRequestedSources(t *testing.T) {
	need := []string{
		"windows", "linux", "sysmon", "fortiweb", "fortigate", "exchange",
		"powershell", "mdaemon", "cisco_ios", "cisco_ftd", "sophos", "paloalto",
		"kerio", "mikrotik", "cisco_esa", "vsphere", "esxi", "kaspersky",
	}
	got := map[string]bool{}
	for _, s := range presets.Defaults() {
		got[s.Key] = true
		if s.EventBytes <= 0 {
			t.Fatalf("%s has non-positive event_bytes", s.Key)
		}
	}
	for _, k := range need {
		if !got[k] {
			t.Fatalf("missing preset %s", k)
		}
	}
}
