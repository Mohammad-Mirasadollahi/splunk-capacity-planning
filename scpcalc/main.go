package main

import (
	"os"

	"github.com/splunk-capacity-planning/scpcalc/cmd"
)

// Set via: go build -ldflags "-X main.version=0.1.0"
var version = "dev"

func main() {
	cmd.Version = version
	os.Exit(cmd.Execute())
}
