package cmd

import (
	"fmt"
	"os"
	"strconv"

	"github.com/splunk-capacity-planning/scpcalc/internal/config"
	"github.com/splunk-capacity-planning/scpcalc/internal/server"
)

func runServe(args []string) int {
	cliAddr, cliHost := "", ""
	cliPort := 0
	for i := 0; i < len(args); i++ {
		a := args[i]
		next := func() string {
			if i+1 >= len(args) {
				return ""
			}
			i++
			return args[i]
		}
		switch a {
		case "--addr":
			cliAddr = next()
		case "--host":
			cliHost = next()
		case "--port":
			p, _ := strconv.Atoi(next())
			cliPort = p
		case "-h", "--help":
			printUsage()
			return 0
		default:
			fmt.Fprintf(os.Stderr, "unknown flag: %s\n", a)
			return 2
		}
	}

	cfg := config.LoadServe(cliAddr, cliHost, cliPort)
	addr := cfg.AddrString()
	fmt.Printf("SCPcalc %s listening on http://%s\n", Version, addr)
	if err := server.ListenAndServe(addr, Version); err != nil {
		fmt.Fprintf(os.Stderr, "serve error: %v\n", err)
		return 1
	}
	return 0
}
