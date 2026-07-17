package cmd

import (
	"fmt"
	"os"
)

// Version is injected via -ldflags at release build time.
var Version = "dev"

// Execute parses os.Args and runs a subcommand.
func Execute() int {
	if len(os.Args) < 2 {
		printUsage()
		return 2
	}
	switch os.Args[1] {
	case "version", "-v", "--version":
		fmt.Printf("scpcalc %s\n", Version)
		return 0
	case "help", "-h", "--help":
		printUsage()
		return 0
	case "calc":
		return runCalc(os.Args[2:])
	case "serve":
		return runServe(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", os.Args[1])
		printUsage()
		return 2
	}
}
