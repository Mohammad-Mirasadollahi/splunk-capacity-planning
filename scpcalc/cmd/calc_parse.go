package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

// calcOptions holds parsed `scpcalc calc` flags before engine merge.
type calcOptions struct {
	Plan               model.PlanInput
	PlanFile           string
	SourcesFile        string
	ConfOut            string
	DesignOut          string
	AsJSON             bool
	DailyGB            float64
	EPS                float64
	EventBytes         float64
	IndexName          string
	HaveDaily          bool
	HaveEPS            bool
	HaveEventBytes     bool
	DMASet             bool
	DMAVal             bool
	ClusterSet         bool
	SHCSet             bool
	LegacyESSmartStore bool
}

// parseCalcArgs returns options and an exit code.
// code < 0 means continue; code >= 0 means return that exit code immediately.
func parseCalcArgs(args []string) (calcOptions, int) {
	var opts calcOptions
	p := &opts.Plan

	for i := 0; i < len(args); i++ {
		a := args[i]
		next := func() (string, bool) {
			if i+1 >= len(args) {
				return "", false
			}
			i++
			return args[i], true
		}
		needFloat := func(flag string, dst *float64) int {
			tok, ok := next()
			if !ok || strings.HasPrefix(tok, "-") {
				fmt.Fprintf(os.Stderr, "error: %s requires a number\n", flag)
				return 2
			}
			v, err := strconv.ParseFloat(tok, 64)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error: %s: invalid number %q\n", flag, tok)
				return 2
			}
			*dst = v
			return -1
		}
		needInt := func(flag string, dst *int) int {
			tok, ok := next()
			if !ok || strings.HasPrefix(tok, "-") {
				fmt.Fprintf(os.Stderr, "error: %s requires an integer\n", flag)
				return 2
			}
			v, err := strconv.Atoi(tok)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error: %s: invalid integer %q\n", flag, tok)
				return 2
			}
			*dst = v
			return -1
		}
		needStr := func(flag string) (string, int) {
			tok, ok := next()
			if !ok || (strings.HasPrefix(tok, "-") && tok != "-") {
				fmt.Fprintf(os.Stderr, "error: %s requires a value\n", flag)
				return "", 2
			}
			return tok, -1
		}

		switch a {
		case "--plan":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			opts.PlanFile = s
		case "--sources":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			opts.SourcesFile = s
		case "--mode":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			p.Mode = s
		case "--total-daily-gb":
			if c := needFloat(a, &p.TotalDailyGB); c >= 0 {
				return opts, c
			}
		case "--available-hot-gb":
			if c := needFloat(a, &p.AvailableHotGB); c >= 0 {
				return opts, c
			}
		case "--available-cold-gb":
			if c := needFloat(a, &p.AvailableColdGB); c >= 0 {
				return opts, c
			}
		case "--available-summaries-gb":
			if c := needFloat(a, &p.AvailableSummariesGB); c >= 0 {
				return opts, c
			}
		case "--retention-days":
			if c := needInt(a, &p.RetentionDays); c >= 0 {
				return opts, c
			}
		case "--hot-warm-days":
			if c := needInt(a, &p.HotWarmDays); c >= 0 {
				return opts, c
			}
		case "--headroom":
			if c := needFloat(a, &p.Headroom); c >= 0 {
				return opts, c
			}
		case "--summary-pct":
			if c := needFloat(a, &p.SummaryPct); c >= 0 {
				return opts, c
			}
		case "--summary-retention-days":
			if c := needInt(a, &p.SummaryRetentionDays); c >= 0 {
				return opts, c
			}
		case "--hot-path":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			p.HotPath = s
		case "--cold-path":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			p.ColdPath = s
		case "--frozen-path":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			p.FrozenPath = s
		case "--summaries-path":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			p.SummariesPath = s
		case "--archive-frozen":
			p.ArchiveFrozen = true
		case "--compression":
			if c := needFloat(a, &p.Compression); c >= 0 {
				return opts, c
			}
		case "--concurrent-users":
			if c := needInt(a, &p.ConcurrentUsers); c >= 0 {
				return opts, c
			}
		case "--concurrent-searches":
			if c := needInt(a, &p.ConcurrentSearches); c >= 0 {
				return opts, c
			}
		case "--saved-searches":
			if c := needInt(a, &p.SavedSearches); c >= 0 {
				return opts, c
			}
		case "--indexer-cluster":
			p.IndexerCluster = true
			opts.ClusterSet = true
		case "--search-head-cluster":
			p.SearchHeadCluster = true
			opts.SHCSet = true
		case "--rf":
			if c := needInt(a, &p.RF); c >= 0 {
				return opts, c
			}
		case "--sf":
			if c := needInt(a, &p.SF); c >= 0 {
				return opts, c
			}
		case "--n-idx":
			if c := needInt(a, &p.NIdx); c >= 0 {
				return opts, c
			}
		case "--n-sh":
			if c := needInt(a, &p.NSh); c >= 0 {
				return opts, c
			}
		case "--smartstore":
			p.SmartStore = true
		case "--remote-path":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			p.RemotePath = s
		case "--has-es":
			p.HasES = true
		case "--has-itsi":
			p.HasITSI = true
		case "--es-smartstore":
			opts.LegacyESSmartStore = true
			p.ESSmartStore = true
			p.HasES = true
			p.SmartStore = true
		case "--enable-dma":
			opts.DMASet, opts.DMAVal = true, true
		case "--no-dma":
			opts.DMASet, opts.DMAVal = true, false
		case "--dma-pct":
			if c := needFloat(a, &p.DMAPct); c >= 0 {
				return opts, c
			}
		case "--daily-gb":
			if c := needFloat(a, &opts.DailyGB); c >= 0 {
				return opts, c
			}
			opts.HaveDaily = true
		case "--eps":
			if c := needFloat(a, &opts.EPS); c >= 0 {
				return opts, c
			}
			opts.HaveEPS = true
		case "--event-bytes":
			if c := needFloat(a, &opts.EventBytes); c >= 0 {
				return opts, c
			}
			opts.HaveEventBytes = true
		case "--index-name":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			opts.IndexName = s
		case "--json":
			opts.AsJSON = true
		case "--conf-out":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			opts.ConfOut = s
		case "--design-out":
			s, c := needStr(a)
			if c >= 0 {
				return opts, c
			}
			opts.DesignOut = s
		case "-h", "--help":
			printUsage()
			return opts, 0
		default:
			fmt.Fprintf(os.Stderr, "unknown flag: %s\n", a)
			return opts, 2
		}
	}
	return opts, -1
}
