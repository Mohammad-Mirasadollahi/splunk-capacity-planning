package splunkform

import (
	"fmt"
	"math"
)

// Official Splunk planning ratios (Capacity Planning Manual).
const (
	RawdataRatio         = 0.15
	ESDMAGBPerYearFactor = 3.4 // ES "Data model acceleration storage and retention"
)

// ArchiveNeedGB estimates frozen archive capacity.
//
// Official: buckets archived via coldToFrozenDir keep rawdata only (~15% of pre-indexed ingest).
// In an indexer cluster each peer archives its own copies when configured identically (× RF).
func ArchiveNeedGB(dailyRaw float64, archiveDays int, indexerCluster bool, rf int, singleCopy bool) float64 {
	if dailyRaw <= 0 || archiveDays <= 0 {
		return 0
	}
	copies := 1
	if indexerCluster && !singleCopy && rf > 1 {
		copies = rf
	}
	return dailyRaw * RawdataRatio * float64(archiveDays) * float64(copies)
}

// DMAEstimateMB returns cluster-wide summaries/DMA budget in MB and a planning note.
//
// Default (dmaPct <= 0): ES official — daily_raw_GB × 3.4 × dmaYears (cluster-wide total).
// Override (dmaPct > 0): fraction of searchable on-disk × retention × headroom.
func DMAEstimateMB(
	dailyRaw, dailyOnDisk, comp, dmaPct, dmaYears, headroom float64,
	retentionDays int,
) (int64, string) {
	if dmaPct > 0 {
		ret := retentionDays
		if ret <= 0 {
			ret = 1
		}
		h := headroom
		if h <= 0 {
			h = 1
		}
		onDisk := dailyOnDisk
		if onDisk <= 0 && dailyRaw > 0 {
			if comp <= 0 {
				comp = 0.5
			}
			onDisk = dailyRaw * comp
		}
		mb := int64(math.Round(onDisk * 1024 * float64(ret) * h * dmaPct))
		if mb < 1 {
			mb = 1
		}
		return mb, fmt.Sprintf(
			"DMA override: ~%.0f%% of searchable on-disk × retention × headroom (not ES official ×3.4/year)",
			dmaPct*100,
		)
	}

	years := dmaYears
	if years <= 0 {
		years = 1
	}
	raw := dailyRaw
	if raw <= 0 && dailyOnDisk > 0 {
		if comp <= 0 {
			comp = 0.5
		}
		raw = dailyOnDisk / comp
	}
	if raw <= 0 {
		return 1, ""
	}
	gb := raw * ESDMAGBPerYearFactor * years
	mb := int64(math.Round(gb * 1024))
	if mb < 1 {
		mb = 1
	}
	return mb, fmt.Sprintf(
		"DMA per ES official: daily_raw × %.1f × %.1f year(s) across all indexers; measure in your environment",
		ESDMAGBPerYearFactor, years,
	)
}
