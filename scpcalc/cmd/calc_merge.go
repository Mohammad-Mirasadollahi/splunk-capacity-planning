package cmd

import (
	"io"
	"os"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

// mergePlan overlays flag-built flags onto JSON-loaded base.
func mergePlan(base, flags model.PlanInput, clusterSet, shcSet, dmaSet, dmaVal, legacyES bool) model.PlanInput {
	out := base
	if flags.Mode != "" {
		out.Mode = flags.Mode
	}
	if flags.RetentionDays > 0 {
		out.RetentionDays = flags.RetentionDays
	}
	if flags.HotWarmDays > 0 {
		out.HotWarmDays = flags.HotWarmDays
	}
	if flags.Headroom > 0 {
		out.Headroom = flags.Headroom
	}
	if flags.SummaryPct > 0 {
		out.SummaryPct = flags.SummaryPct
	}
	if flags.SummaryRetentionDays > 0 {
		out.SummaryRetentionDays = flags.SummaryRetentionDays
	}
	if flags.HotPath != "" {
		out.HotPath = flags.HotPath
	}
	if flags.ColdPath != "" {
		out.ColdPath = flags.ColdPath
	}
	if flags.FrozenPath != "" {
		out.FrozenPath = flags.FrozenPath
	}
	if flags.SummariesPath != "" {
		out.SummariesPath = flags.SummariesPath
	}
	if flags.ArchiveFrozen {
		out.ArchiveFrozen = true
	}
	if flags.Compression > 0 {
		out.Compression = flags.Compression
	}
	if flags.ConcurrentUsers > 0 {
		out.ConcurrentUsers = flags.ConcurrentUsers
	}
	if clusterSet {
		out.IndexerCluster = flags.IndexerCluster
	}
	if shcSet {
		out.SearchHeadCluster = flags.SearchHeadCluster
	}
	if flags.RF > 0 {
		out.RF = flags.RF
	}
	if flags.SF > 0 {
		out.SF = flags.SF
	}
	if flags.NIdx > 0 {
		out.NIdx = flags.NIdx
	}
	if flags.NSh > 0 {
		out.NSh = flags.NSh
	}
	if flags.SmartStore || legacyES {
		out.SmartStore = true
	}
	if flags.RemotePath != "" {
		out.RemotePath = flags.RemotePath
	}
	if flags.HasES || legacyES {
		out.HasES = true
	}
	if flags.HasITSI {
		out.HasITSI = true
	}
	if flags.ESSmartStore || legacyES {
		out.ESSmartStore = true
	}
	if dmaSet {
		v := dmaVal
		out.EnableDMA = &v
	} else if flags.EnableDMA != nil {
		out.EnableDMA = flags.EnableDMA
	}
	if flags.DMAPct > 0 {
		out.DMAPct = flags.DMAPct
	}
	if flags.TotalDailyGB > 0 {
		out.TotalDailyGB = flags.TotalDailyGB
	}
	if flags.AvailableHotGB > 0 {
		out.AvailableHotGB = flags.AvailableHotGB
	}
	if flags.AvailableColdGB > 0 {
		out.AvailableColdGB = flags.AvailableColdGB
	}
	if flags.AvailableSummariesGB > 0 {
		out.AvailableSummariesGB = flags.AvailableSummariesGB
	}
	if len(flags.Sources) > 0 {
		out.Sources = flags.Sources
	}
	return out
}

func readFileOrStdin(path string) ([]byte, error) {
	if path == "-" {
		return io.ReadAll(os.Stdin)
	}
	return os.ReadFile(path)
}
