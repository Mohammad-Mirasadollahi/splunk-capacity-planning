package calc

import (
	"fmt"
	"math"
	"strings"

	"github.com/splunk-capacity-planning/scpcalc/internal/arch"
	"github.com/splunk-capacity-planning/scpcalc/internal/confgen"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

const gib = 1024.0 * 1024.0 * 1024.0

// Calculate is the legacy single-index entrypoint (CLI).
func Calculate(in model.Input) (model.Result, error) {
	plan, err := CalculatePlan(in.ToPlan())
	if err != nil {
		return model.Result{}, err
	}
	if len(plan.Indexes) == 0 {
		return model.Result{}, err
	}
	ix := plan.Indexes[0]
	return model.Result{
		DailyRawGB:             ix.DailyRawGB,
		CompressionFactor:      plan.CompressionFactor,
		DailyOnDiskGB:          ix.DailyOnDiskGB,
		DailyOnDiskMB:          round3(ix.DailyOnDiskGB * 1024),
		SearchableTB:           ix.SearchableTB,
		MaxTotalDataSizeMB:     ix.MaxTotalDataSizeMB,
		HomePathMaxDataSizeMB:  ix.HomePathMaxDataSizeMB,
		ColdPathMaxDataSizeMB:  ix.ColdPathMaxDataSizeMB,
		FrozenTimePeriodInSecs: ix.FrozenTimePeriodInSecs,
		MaxDataSize:            ix.MaxDataSize,
		IndexesConf:            plan.IndexesConf,
		Warnings:               plan.Warnings,
	}, nil
}

// CalculatePlan sizes multiple indexes + optional summary indexes + design.
func CalculatePlan(p model.PlanInput) (model.PlanResult, error) {
	if err := p.Validate(); err != nil {
		return model.PlanResult{}, err
	}
	normalizeSources(&p)
	p.Mode = p.InferResultMode()

	comp := compressionFactor(p)
	warnings := topologyWarnings(p)

	// Disk budgets without ingest rows — emit volume caps + design max daily.
	if len(p.Sources) == 0 && p.HasDiskBudget() {
		out := model.PlanResult{
			Mode:              p.Mode,
			CompressionFactor: round3(comp),
			Indexes:           nil,
			Warnings:          warnings,
		}
		if p.AvailableHotGB > 0 {
			out.HotVolumeMB = int64(math.Round(p.AvailableHotGB * 1024))
		}
		if p.AvailableColdGB > 0 {
			out.ColdVolumeMB = int64(math.Round(p.AvailableColdGB * 1024))
		}
		if p.AvailableSummariesGB > 0 {
			out.SummariesVolumeMB = int64(math.Round(p.AvailableSummariesGB * 1024))
		}
		if out.SummariesVolumeMB == 0 && p.WantDMA() {
			out.SummariesVolumeMB = 1
		}
		out.HotVolumeClusterMB = out.HotVolumeMB
		out.ColdVolumeClusterMB = out.ColdVolumeMB
		out.SummariesClusterMB = out.SummariesVolumeMB
		design := arch.BuildDesign(p, out)
		if design.MaxDailyGBFromDisk == 0 && p.RetentionDays > 0 {
			avail := p.AvailableHotGB + p.AvailableColdGB
			if avail > 0 {
				design.MaxDailyGBFromDisk = math.Round(avail/(comp*float64(p.RetentionDays)*p.Headroom)*10) / 10
			}
		}
		applyPerPeer(&out, &design)
		out.IndexesConf = confgen.RenderPlan(p, out)
		arch.RefreshTexts(p, &design, out)
		out.Design = &design
		out.Warnings = append(out.Warnings, design.Warnings...)
		out.Warnings = append(out.Warnings, "disk budgets without ingest: showing max daily from disk only")
		return out, nil
	}

	if len(p.Sources) == 0 {
		return model.PlanResult{}, fmt.Errorf("no sources to size — set daily volumes or total_daily_gb")
	}
	if err := validateUniqueIndexes(p.Sources); err != nil {
		return model.PlanResult{}, err
	}

	out := model.PlanResult{
		Mode:              p.Mode,
		CompressionFactor: round3(comp),
		Indexes:           make([]model.IndexResult, 0, len(p.Sources)),
		Warnings:          warnings,
	}

	var hotBudget, coldBudget, sumBudget int64

	for _, s := range p.Sources {
		ret := s.RetentionDays
		if ret <= 0 {
			ret = p.RetentionDays
		}
		hw := s.HotWarmDays
		if hw <= 0 {
			hw = p.HotWarmDays
		}
		if hw > ret {
			out.Warnings = append(out.Warnings, s.IndexName+": hot_warm_days > retention_days")
		}

		dailyRaw := s.DailyGB
		if dailyRaw <= 0 {
			dailyRaw = s.EPS * 86400.0 * s.EventBytes / gib
		}
		dailyOnDisk := dailyRaw * comp
		maxTotal := int64(math.Round(dailyOnDisk * 1024 * float64(ret) * p.Headroom))
		homeMax := int64(math.Round(dailyOnDisk * 1024 * float64(hw) * p.Headroom))
		frozen := int64(ret) * 86400
		maxData := "auto"
		if dailyRaw >= 10 {
			maxData = "auto_high_volume"
		}

		coldPart := maxTotal - homeMax
		if coldPart < 0 {
			coldPart = 0
		}
		ix := model.IndexResult{
			Key:                    s.Key,
			Label:                  firstNonEmpty(s.Label, s.IndexName),
			IndexName:              s.IndexName,
			EventBytes:             s.EventBytes,
			DailyRawGB:             round3(dailyRaw),
			DailyOnDiskGB:          round3(dailyOnDisk),
			SearchableTB:           round3(dailyOnDisk * float64(ret) / 1024),
			MaxTotalDataSizeMB:     maxTotal,
			HomePathMaxDataSizeMB:  homeMax,
			ColdPathMaxDataSizeMB:  coldPart,
			FrozenTimePeriodInSecs: frozen,
			MaxDataSize:            maxData,
		}

		hotBudget += homeMax
		coldBudget += coldPart

		if s.EnableSummary {
			sumRaw := s.SummaryDailyGB
			if sumRaw <= 0 {
				sumRaw = dailyRaw * p.SummaryPct
			}
			sumRet := p.SummaryRetentionDays
			sumOnDisk := sumRaw * comp
			sumName := s.SummaryIndexName
			if stringsTrim(sumName) == "" {
				sumName = s.IndexName + "_summary"
			}
			sumHW := hw
			if sumHW > sumRet {
				sumHW = sumRet
			}
			ix.SummaryIndexName = sumName
			ix.SummaryDailyRawGB = round3(sumRaw)
			ix.SummaryOnDiskGB = round3(sumOnDisk)
			ix.SummaryMaxTotalMB = int64(math.Round(sumOnDisk * 1024 * float64(sumRet) * p.Headroom))
			ix.SummaryHomeMaxMB = int64(math.Round(sumOnDisk * 1024 * float64(sumHW) * p.Headroom))
			sumCold := ix.SummaryMaxTotalMB - ix.SummaryHomeMaxMB
			if sumCold < 0 {
				sumCold = 0
			}
			ix.SummaryColdMaxMB = sumCold
			ix.SummaryFrozenSecs = int64(sumRet) * 86400
			out.TotalSummaryRawGB += sumRaw
			out.TotalSummaryOnDiskGB += sumOnDisk
			sumBudget += ix.SummaryMaxTotalMB
		}

		out.TotalDailyRawGB += dailyRaw
		out.TotalDailyOnDiskGB += dailyOnDisk
		out.TotalSearchableTB += ix.SearchableTB
		out.Indexes = append(out.Indexes, ix)
	}

	out.TotalDailyRawGB = round3(out.TotalDailyRawGB)
	out.TotalDailyOnDiskGB = round3(out.TotalDailyOnDiskGB)
	out.TotalSearchableTB = round3(out.TotalSearchableTB)
	out.TotalSummaryRawGB = round3(out.TotalSummaryRawGB)
	out.TotalSummaryOnDiskGB = round3(out.TotalSummaryOnDiskGB)

	// DMA estimate on summaries volume (docs/en/02 §6.1 / 05 §6) when DMA/ES enabled.
	if p.WantDMA() {
		dmaMB := int64(math.Round(out.TotalDailyOnDiskGB * 1024 * float64(p.RetentionDays) * p.Headroom * p.DMAPct))
		if dmaMB < 1 {
			dmaMB = 1
		}
		sumBudget += dmaMB
		out.Warnings = append(out.Warnings, fmt.Sprintf(
			"DMA estimate added to summaries volume (~%.0f%% of searchable on-disk × retention); measure real DMA in your environment",
			p.DMAPct*100))
	}

	calcHot, calcCold, calcSum := hotBudget, coldBudget, sumBudget
	out.HotVolumeMB = hotBudget
	out.ColdVolumeMB = coldBudget
	out.SummariesVolumeMB = max64(sumBudget, 0)
	if out.SummariesVolumeMB == 0 && (p.WantDMA() || hasAnySummary(out)) {
		out.SummariesVolumeMB = 1
	}

	if p.AvailableHotGB > 0 {
		capMB := int64(math.Round(p.AvailableHotGB * 1024))
		if capMB < calcHot {
			out.Warnings = append(out.Warnings, "available_hot_gb is smaller than calculated hot/warm need — conf uses available cap; reduce retention/hot_warm_days or add disk")
		}
		out.HotVolumeMB = capMB
	}
	if p.AvailableColdGB > 0 {
		capMB := int64(math.Round(p.AvailableColdGB * 1024))
		if capMB < calcCold {
			out.Warnings = append(out.Warnings, "available_cold_gb is smaller than calculated cold need — conf uses available cap")
		}
		out.ColdVolumeMB = capMB
	}
	if p.AvailableSummariesGB > 0 {
		capMB := int64(math.Round(p.AvailableSummariesGB * 1024))
		if calcSum > 0 && capMB < calcSum {
			out.Warnings = append(out.Warnings, "available_summaries_gb is smaller than calculated summaries need — conf uses available cap")
		}
		out.SummariesVolumeMB = max64(capMB, 1)
	}

	out.HotVolumeClusterMB = out.HotVolumeMB
	out.ColdVolumeClusterMB = out.ColdVolumeMB
	out.SummariesClusterMB = out.SummariesVolumeMB

	// Design uses calculated need (pre-cap, cluster-wide).
	needOut := out
	needOut.HotVolumeMB = calcHot
	needOut.ColdVolumeMB = calcCold
	needOut.SummariesVolumeMB = max64(calcSum, 0)
	design := arch.BuildDesign(p, needOut)

	applyPerPeer(&out, &design)
	out.IndexesConf = confgen.RenderPlan(p, out)
	arch.RefreshSettingsOnly(p, &design, out)
	out.Design = &design
	out.Warnings = append(out.Warnings, design.Warnings...)
	return out, nil
}

func topologyWarnings(p model.PlanInput) []string {
	var warnings []string
	if pathsEqual(p.SummariesPath, p.ColdPath) {
		warnings = append(warnings, "summaries_path matches cold_path; prefer a separate SSD/NVMe volume for DMA/tstats (see doc 05)")
	}
	if p.HasES && p.SmartStore {
		warnings = append(warnings, "Enterprise Security on SmartStore: provision local cache for ~90 days of indexed data (vs usual ~30 days)")
	} else if p.ESSmartStore {
		warnings = append(warnings, "Enterprise Security on SmartStore: provision local cache for ~90 days of indexed data (vs usual ~30 days)")
	}
	if p.HasES && p.HasITSI {
		warnings = append(warnings, "ES and ITSI must NOT share the same search head / SHC — use separate SH tiers")
	}
	if p.SearchHeadCluster && p.IndexerCluster {
		warnings = append(warnings, "SHC increases search load on indexers — prefer more IDX CPU or peers versus single SH")
	}
	return warnings
}

// applyPerPeer divides index/volume MB by N_IDX for conf (docs/en/02 §8, docs/en/05 §6).
func applyPerPeer(out *model.PlanResult, d *model.Design) {
	nidx := d.NIDX
	if nidx < 1 {
		nidx = 1
	}
	out.IndexerPeers = nidx
	if nidx <= 1 {
		return
	}
	d.PerPeerMB = true
	out.Warnings = append(out.Warnings, fmt.Sprintf(
		"indexes.conf size fields and volume caps are per peer (÷ N_IDX=%d); cluster totals kept in *_cluster_mb", nidx))
	for i := range out.Indexes {
		ix := &out.Indexes[i]
		ix.MaxTotalDataSizeMB = ceilDiv(ix.MaxTotalDataSizeMB, nidx)
		ix.HomePathMaxDataSizeMB = ceilDiv(ix.HomePathMaxDataSizeMB, nidx)
		ix.ColdPathMaxDataSizeMB = ceilDiv(ix.ColdPathMaxDataSizeMB, nidx)
		// Keep cold = maxTotal − home after peer split (ceilDiv can leave a 1-unit gap).
		if rem := ix.MaxTotalDataSizeMB - ix.HomePathMaxDataSizeMB; rem >= 0 {
			ix.ColdPathMaxDataSizeMB = rem
		}
		if ix.SummaryMaxTotalMB > 0 {
			ix.SummaryMaxTotalMB = ceilDiv(ix.SummaryMaxTotalMB, nidx)
			ix.SummaryHomeMaxMB = ceilDiv(ix.SummaryHomeMaxMB, nidx)
			if rem := ix.SummaryMaxTotalMB - ix.SummaryHomeMaxMB; rem >= 0 {
				ix.SummaryColdMaxMB = rem
			} else {
				ix.SummaryColdMaxMB = 0
			}
		}
	}
	out.HotVolumeMB = ceilDiv(out.HotVolumeMB, nidx)
	out.ColdVolumeMB = ceilDiv(out.ColdVolumeMB, nidx)
	if out.SummariesVolumeMB > 0 {
		out.SummariesVolumeMB = ceilDiv(out.SummariesVolumeMB, nidx)
	}
}

func ceilDiv(v int64, n int) int64 {
	if n <= 1 {
		return v
	}
	return (v + int64(n) - 1) / int64(n)
}

func validateUniqueIndexes(sources []model.SourceRow) error {
	seen := map[string]string{}
	for _, s := range sources {
		san := confgen.SanitizeIndex(s.IndexName)
		if prev, ok := seen[san]; ok {
			return fmt.Errorf("duplicate index stanza after sanitize: %q and %q both become [%s]", prev, s.IndexName, san)
		}
		seen[san] = s.IndexName
		if s.EnableSummary {
			sum := s.SummaryIndexName
			if stringsTrim(sum) == "" {
				sum = s.IndexName + "_summary"
			}
			sanSum := confgen.SanitizeIndex(sum)
			if prev, ok := seen[sanSum]; ok {
				return fmt.Errorf("duplicate index stanza after sanitize: %q and %q both become [%s]", prev, sum, sanSum)
			}
			seen[sanSum] = sum
		}
	}
	return nil
}

func hasAnySummary(out model.PlanResult) bool {
	for _, ix := range out.Indexes {
		if ix.SummaryIndexName != "" {
			return true
		}
	}
	return false
}

// normalizeSources expands total_daily_gb into a synthetic index when needed,
// and scales source rows to match total when both are set.
func normalizeSources(p *model.PlanInput) {
	var sum float64
	active := make([]model.SourceRow, 0, len(p.Sources))
	for _, s := range p.Sources {
		daily := s.DailyGB
		if daily <= 0 && s.EPS > 0 && s.EventBytes > 0 {
			daily = s.EPS * 86400.0 * s.EventBytes / gib
		}
		if daily <= 0 && stringsTrim(s.IndexName) == "" {
			continue
		}
		if daily <= 0 {
			continue
		}
		sum += daily
		active = append(active, s)
	}

	if p.TotalDailyGB > 0 && len(active) == 0 {
		active = []model.SourceRow{{
			Key:        "total",
			Label:      "Total ingest",
			IndexName:  "main",
			DailyGB:    p.TotalDailyGB,
			EventBytes: 500,
		}}
		sum = p.TotalDailyGB
	} else if p.TotalDailyGB > 0 && len(active) > 0 && math.Abs(sum-p.TotalDailyGB) > 0.01 {
		factor := p.TotalDailyGB / sum
		for i := range active {
			if active[i].DailyGB > 0 {
				active[i].DailyGB = active[i].DailyGB * factor
			} else {
				active[i].EPS = active[i].EPS * factor
			}
		}
	}

	if len(active) == 0 && p.TotalDailyGB > 0 {
		active = []model.SourceRow{{
			Key: "total", Label: "Total ingest", IndexName: "main", DailyGB: p.TotalDailyGB, EventBytes: 500,
		}}
	}
	p.Sources = active
}

func compressionFactor(p model.PlanInput) float64 {
	if p.Compression > 0 {
		return p.Compression
	}
	if p.RF <= 1 && p.SF <= 1 {
		return 0.5
	}
	return 0.15*float64(p.RF) + 0.35*float64(p.SF)
}

func round3(v float64) float64 {
	return math.Round(v*1000) / 1000
}

func pathsEqual(a, b string) bool {
	return stringsTrimRightSlash(a) == stringsTrimRightSlash(b)
}

func stringsTrimRightSlash(s string) string {
	for len(s) > 1 && (s[len(s)-1] == '/' || s[len(s)-1] == '\\') {
		s = s[:len(s)-1]
	}
	return s
}

func stringsTrim(s string) string {
	return strings.TrimSpace(s)
}

func firstNonEmpty(a, b string) string {
	if stringsTrim(a) != "" {
		return a
	}
	return b
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
