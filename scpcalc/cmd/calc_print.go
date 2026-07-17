package cmd

import (
	"fmt"
	"strings"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

func designNarrative(res model.PlanResult) string {
	d := res.Design
	if d == nil {
		return ""
	}
	parts := make([]string, 0, 4)
	if d.NodePlanText != "" {
		parts = append(parts, d.NodePlanText)
	}
	if d.StructureText != "" {
		parts = append(parts, d.StructureText)
	}
	if d.ResourcesText != "" {
		parts = append(parts, d.ResourcesText)
	}
	if d.SettingsText != "" {
		parts = append(parts, d.SettingsText)
	}
	return strings.Join(parts, "\n\n")
}

func printPlanHuman(res model.PlanResult) {
	fmt.Printf("Mode:                 %s\n", res.Mode)
	fmt.Printf("Total daily raw:      %.3f GB/day\n", res.TotalDailyRawGB)
	fmt.Printf("Compression factor:   %.3f\n", res.CompressionFactor)
	fmt.Printf("Total on-disk:        %.3f GB/day\n", res.TotalDailyOnDiskGB)
	fmt.Printf("Total searchable:     %.3f TB\n", res.TotalSearchableTB)
	if res.TotalSummaryRawGB > 0 {
		fmt.Printf("Summary raw:          %.3f GB/day (on-disk %.3f)\n", res.TotalSummaryRawGB, res.TotalSummaryOnDiskGB)
	}

	if d := res.Design; d != nil {
		fmt.Println("\n----- node counts (users × volume × topology) -----")
		fmt.Printf("Concurrent users (U): %d\n", d.ConcurrentUsers)
		fmt.Printf("Daily for sizing (D): %.1f GB/day\n", d.DailyGBForCounts)
		if d.CombinedInstance {
			fmt.Printf("N_SH / N_IDX:         1 combined SH+IDX\n")
		} else {
			fmt.Printf("N_SH:                 %d", d.NSH)
			if d.BaseNSH > 0 && d.BaseNSH != d.NSH {
				fmt.Printf("  (table baseline %d)", d.BaseNSH)
			}
			fmt.Println()
			fmt.Printf("N_IDX:                %d", d.NIDX)
			if d.BaseNIDX > 0 && d.BaseNIDX != d.NIDX {
				fmt.Printf("  (table baseline %d)", d.BaseNIDX)
			}
			fmt.Println()
			if d.NSHES > 0 {
				fmt.Printf("  ES search heads:    %d\n", d.NSHES)
			}
			if d.NSHITSI > 0 {
				fmt.Printf("  ITSI search heads:  %d\n", d.NSHITSI)
			}
		}
		if d.ClusterManager {
			fmt.Println("Cluster manager:     required")
		}
		if d.SHCDeployer {
			fmt.Println("SHC deployer:        required")
		}
		if d.NodePlanText != "" {
			fmt.Println()
			fmt.Print(d.NodePlanText)
		}

		fmt.Printf("\nStorage need:        hot %.1f GB | cold %.1f GB | summaries %.1f GB\n",
			d.HotNeedGB, d.ColdNeedGB, d.SummariesNeedGB)
		if d.MaxDailyGBFromDisk > 0 {
			fmt.Printf("Max daily from disk: %.1f GB/day\n", d.MaxDailyGBFromDisk)
		}
		if d.MaxRetentionDays > 0 {
			fmt.Printf("Max retention/disk:  %d days\n", d.MaxRetentionDays)
		}
		if d.LocalCacheTotalGB > 0 {
			fmt.Printf("SmartStore cache:    %.1f GB total", d.LocalCacheTotalGB)
			if d.LocalCachePerIDXGB > 0 {
				fmt.Printf(" (~%.1f GB/peer, %d days)", d.LocalCachePerIDXGB, d.CacheDays)
			}
			fmt.Println()
			if d.RemoteStoreGB > 0 {
				fmt.Printf("Remote object store: ≈ %.1f GB\n", d.RemoteStoreGB)
			}
		}

		if d.StructureText != "" {
			fmt.Println("\n----- design structure -----")
			fmt.Print(d.StructureText)
		}
		if d.ResourcesText != "" {
			fmt.Println("\n----- recommended resources -----")
			fmt.Print(d.ResourcesText)
		}
		if len(d.Resources) > 0 {
			fmt.Println("----- resource layers -----")
			for _, L := range d.Resources {
				fmt.Printf("  %-28s  count=%-3d  tier=%s  PHYSICAL=%dc  LOGICAL/vCPU=%d  RAM=%dGB",
					L.Role, L.Count, L.Tier, L.CPUCores, L.VCPU, L.RAMGB)
				if L.DiskGBHint > 0 {
					fmt.Printf("  disk≈%.0fGB", L.DiskGBHint)
				}
				fmt.Println()
				if L.CPUCores > 0 {
					fmt.Printf("      virt: reserve full CPU/RAM (no oversubscribe)  |  Splunk parallelization: only with spare cores above minimum\n")
				}
			}
		}
		if d.SettingsText != "" {
			fmt.Println("\n----- settings -----")
			fmt.Print(d.SettingsText)
		}
	}

	if len(res.Indexes) > 0 {
		fmt.Println("\n----- indexes -----")
		for _, ix := range res.Indexes {
			fmt.Printf("  [%s] daily_raw=%.3f GB  on_disk=%.3f GB  searchable=%.3f TB  maxTotal=%d MB  homeMax=%d MB\n",
				ix.IndexName, ix.DailyRawGB, ix.DailyOnDiskGB, ix.SearchableTB,
				ix.MaxTotalDataSizeMB, ix.HomePathMaxDataSizeMB)
			if ix.SummaryIndexName != "" {
				fmt.Printf("      summary %s: %.3f GB/day → maxTotal=%d MB\n",
					ix.SummaryIndexName, ix.SummaryDailyRawGB, ix.SummaryMaxTotalMB)
			}
		}
	}

	if res.IndexerPeers > 0 {
		fmt.Printf("\nVolume budgets (per peer, N_IDX=%d): hot=%d MB  cold=%d MB  summaries=%d MB\n",
			res.IndexerPeers, res.HotVolumeMB, res.ColdVolumeMB, res.SummariesVolumeMB)
	}

	if len(res.Warnings) > 0 {
		fmt.Println("\nWarnings:")
		for _, w := range res.Warnings {
			fmt.Printf("  - %s\n", w)
		}
	}

	fmt.Println("\n----- indexes.conf draft -----")
	fmt.Print(res.IndexesConf)
}
