package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Defaults for the local web server.
const (
	DefaultHost = "0.0.0.0"
	DefaultPort = 12345
)

// Serve holds listen settings for `scpcalc serve`.
type Serve struct {
	Host string
	Port int
	Addr string // if set (host:port), wins over Host+Port
}

// AddrString returns the listen address.
func (s Serve) AddrString() string {
	if strings.TrimSpace(s.Addr) != "" {
		return strings.TrimSpace(s.Addr)
	}
	host := s.Host
	if host == "" {
		host = DefaultHost
	}
	port := s.Port
	if port <= 0 {
		port = DefaultPort
	}
	return fmt.Sprintf("%s:%d", host, port)
}

// LoadServe resolves settings with priority:
//  1. CLI --addr / --host / --port (passed in)
//  2. process environment (SCPCALC_*)
//  3. .env file (cwd, then executable dir)
//  4. built-in defaults (0.0.0.0:12345)
func LoadServe(cliAddr, cliHost string, cliPort int) Serve {
	_ = LoadDotEnv("")

	out := Serve{
		Host: envOr("SCPCALC_HOST", DefaultHost),
		Port: envInt("SCPCALC_PORT", DefaultPort),
		Addr: strings.TrimSpace(os.Getenv("SCPCALC_ADDR")),
	}

	if h := strings.TrimSpace(cliHost); h != "" {
		out.Host = h
		out.Addr = "" // CLI host/port clears full ADDR override unless --addr set
	}
	if cliPort > 0 {
		out.Port = cliPort
		if strings.TrimSpace(cliAddr) == "" {
			out.Addr = ""
		}
	}
	if a := strings.TrimSpace(cliAddr); a != "" {
		out.Addr = a
	}
	return out
}

// LoadDotEnv reads KEY=VALUE pairs into the process environment without
// overwriting variables that are already set. path="" searches defaults.
func LoadDotEnv(path string) error {
	candidates := []string{}
	if path != "" {
		candidates = append(candidates, path)
	} else if custom := strings.TrimSpace(os.Getenv("SCPCALC_ENV_FILE")); custom != "" {
		candidates = append(candidates, custom)
	} else {
		candidates = append(candidates, ".env")
		if wd, err := os.Getwd(); err == nil {
			candidates = append(candidates, filepath.Join(wd, ".env"))
		}
		if exe, err := os.Executable(); err == nil {
			candidates = append(candidates, filepath.Join(filepath.Dir(exe), ".env"))
		}
	}

	seen := map[string]bool{}
	for _, p := range candidates {
		p = filepath.Clean(p)
		if seen[p] {
			continue
		}
		seen[p] = true
		if err := loadEnvFile(p); err == nil {
			return nil
		}
	}
	return nil // missing .env is fine
}

func loadEnvFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "export ") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue // do not override existing env
		}
		_ = os.Setenv(key, val)
	}
	return sc.Err()
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return def
	}
	return n
}
