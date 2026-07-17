package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func runCalc(args []string) int {
	opts, code := parseCalcArgs(args)
	if code >= 0 {
		return code
	}

	p := opts.Plan
	if opts.PlanFile != "" {
		raw, err := readFileOrStdin(opts.PlanFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error reading --plan: %v\n", err)
			return 1
		}
		var loaded model.PlanInput
		if err := json.Unmarshal(raw, &loaded); err != nil {
			fmt.Fprintf(os.Stderr, "error parsing --plan JSON: %v\n", err)
			return 1
		}
		p = mergePlan(loaded, opts.Plan, opts.ClusterSet, opts.SHCSet, opts.DMASet, opts.DMAVal, opts.LegacyESSmartStore)
	} else if opts.DMASet {
		v := opts.DMAVal
		p.EnableDMA = &v
	}

	if opts.SourcesFile != "" {
		raw, err := readFileOrStdin(opts.SourcesFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error reading --sources: %v\n", err)
			return 1
		}
		var rows []model.SourceRow
		if err := json.Unmarshal(raw, &rows); err != nil {
			fmt.Fprintf(os.Stderr, "error parsing --sources JSON: %v\n", err)
			return 1
		}
		p.Sources = rows
	}

	// Legacy single-index convenience when no sources yet.
	if len(p.Sources) == 0 && (opts.HaveDaily || opts.HaveEPS || opts.HaveEventBytes || opts.IndexName != "") {
		name := opts.IndexName
		if strings.TrimSpace(name) == "" {
			name = "windows"
		}
		p.Sources = []model.SourceRow{{
			Key: "custom", Label: name, IndexName: name,
			DailyGB: opts.DailyGB, EPS: opts.EPS, EventBytes: opts.EventBytes,
			RetentionDays: p.RetentionDays, HotWarmDays: p.HotWarmDays,
		}}
	}

	// Legacy convenience: RF/SF > 1 on the CLI (without --plan / without --indexer-cluster)
	// implies indexer clustering — same idea as Input.ToPlan.
	// Never override an explicit plan JSON that set indexer_cluster=false.
	if opts.PlanFile == "" && !opts.ClusterSet && (p.RF > 1 || p.SF > 1) {
		p.IndexerCluster = true
	}

	res, err := calc.CalculatePlan(p)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		return 1
	}

	if opts.ConfOut != "" {
		if err := os.WriteFile(opts.ConfOut, []byte(res.IndexesConf), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "error writing --conf-out: %v\n", err)
			return 1
		}
	}
	if opts.DesignOut != "" {
		if err := os.WriteFile(opts.DesignOut, []byte(designNarrative(res)), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "error writing --design-out: %v\n", err)
			return 1
		}
	}

	if opts.AsJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(res)
		return 0
	}
	printPlanHuman(res)
	return 0
}
