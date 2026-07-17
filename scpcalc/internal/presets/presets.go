package presets

// Source is a built-in log family with an editable default average event size.
// Sizes are planning defaults (bytes per event), not vendor guarantees — measure in production.
type Source struct {
	Key        string `json:"key"`
	Label      string `json:"label"`
	IndexHint  string `json:"index_hint"`
	EventBytes int    `json:"event_bytes"`
	Notes      string `json:"notes"`
}

// Defaults returns the built-in catalog (user may change bytes / add custom rows in the UI).
func Defaults() []Source {
	defs := []struct {
		key, label, indexHint string
		bytes                 int
		notes                 string
	}{
		{"windows", "Windows", "windows", 1200, "WinEventLog mixed; Security often larger"},
		{"linux", "Linux", "linux", 300, "syslog / journald typical short lines"},
		{"sysmon", "Sysmon", "sysmon", 2000, "Verbose XML-style process/network events"},
		{"fortiweb", "FortiWeb", "fortiweb", 1000, "WAF / HTTP security events"},
		{"fortigate", "FortiGate", "fortigate", 900, "Firewall traffic / UTM"},
		{"exchange", "Exchange", "exchange", 1100, "Message tracking / admin audit"},
		{"powershell", "PowerShell", "powershell", 2500, "Script-block logging can be large"},
		{"mdaemon", "MDaemon", "mdaemon", 600, "Mail server logs (typo-safe key for medeamon)"},
		{"cisco_ios", "Cisco Router/Switch", "cisco_ios", 250, "IOS/NX-OS syslog"},
		{"cisco_ftd", "Cisco FTD/FMC", "cisco_ftd", 900, "Connection / intrusion events"},
		{"sophos", "Sophos", "sophos", 800, "Endpoint / XG firewall style events"},
		{"paloalto", "Palo Alto", "paloalto", 850, "TRAFFIC / THREAT CSV-like"},
		{"kerio", "Kerio", "kerio", 550, "Mail / control logs"},
		{"mikrotik", "MikroTik", "mikrotik", 280, "RouterOS syslog"},
		{"cisco_esa", "Cisco ESA", "cisco_esa", 900, "Email Security Appliance"},
		{"vsphere", "vSphere", "vsphere", 700, "vCenter events / tasks"},
		{"esxi", "ESXi", "esxi", 550, "Hostd / vmkernel syslog"},
		{"kaspersky", "Kaspersky", "kaspersky", 900, "Endpoint / security console"},
	}
	out := make([]Source, 0, len(defs))
	for _, d := range defs {
		out = append(out, Source{
			Key:        d.key,
			Label:      d.label,
			IndexHint:  d.indexHint,
			EventBytes: d.bytes,
			Notes:      d.notes,
		})
	}
	return out
}

// Lookup returns a preset by key (case-sensitive key from Defaults).
func Lookup(key string) (Source, bool) {
	for _, s := range Defaults() {
		if s.Key == key {
			return s, true
		}
	}
	return Source{}, false
}
