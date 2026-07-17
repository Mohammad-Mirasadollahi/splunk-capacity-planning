package arch

import (
	"fmt"
	"math"
	"strings"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

// Counts is a platform SH/IDX recommendation (doc 01 §4.1).
type Counts struct {
	NSH              int
	NIDX             int
	CombinedInstance bool
	UserBand         string // e.g. "up to 16"
	VolumeBand       string // e.g. "600 GB–1 TB/day"
}

// NodePlan is the full resolved node inventory after cluster/app floors.
type NodePlan struct {
	UserBand         string // e.g. "up to 16"
	VolumeBand       string // e.g. "600 GB–1 TB/day"
	BaseNSH          int
	BaseNIDX         int
	NSH              int
	NIDX             int
	AutoNSH          int // recommended before n_sh override
	AutoNIDX         int // recommended before n_idx override
	NSHES            int
	NSHITSI          int
	CombinedInstance bool
	ClusterManager   bool
	SHCDeployer      bool
	SHCoresPerNode   int // physical cores per SH used for concurrent-search floor
	Steps            []string // human-readable derivation
	Warnings         []string
	Suggestions      []model.TopologySuggestion
}

// RecommendCounts looks up Summary of performance recommendations (guideline).
// Inputs: daily ingest D (GB/day) and concurrent search users U.
func RecommendCounts(dailyGB float64, users int) Counts {
	if users <= 0 {
		users = 8
	}
	col := volumeCol(dailyGB)
	row := userRow(users)
	nsh, nidx, flag := table[row][col][0], table[row][col][1], table[row][col][2]
	combined := flag == 1
	c := Counts{
		NSH: nsh, NIDX: nidx, CombinedInstance: combined,
		UserBand: userBandLabel(row), VolumeBand: volumeBandLabel(col),
	}
	if combined {
		c.NSH, c.NIDX = 1, 1
	}
	return c
}

// ResolveNodeCounts derives N_SH / N_IDX from:
//  1. D × U performance table (docs/en/01 §4.1)
//  2. Indexer cluster / SHC topology floors
//  3. ES / ITSI floors
//  4. Optional n_idx / n_sh overrides
func ResolveNodeCounts(p model.PlanInput, dailyGB float64) NodePlan {
	users := p.ConcurrentUsers
	if users <= 0 {
		users = 8
	}
	searches := p.ConcurrentSearches
	if searches <= 0 {
		searches = users
	}
	saved := p.SavedSearches
	base := RecommendCounts(dailyGB, users)
	plan := NodePlan{
		UserBand:         base.UserBand,
		VolumeBand:       base.VolumeBand,
		BaseNSH:          base.NSH,
		BaseNIDX:         base.NIDX,
		NSH:              base.NSH,
		NIDX:             base.NIDX,
		CombinedInstance: base.CombinedInstance,
		SHCoresPerNode:   referenceSHCores(p),
	}
	plan.Steps = append(plan.Steps, fmt.Sprintf(
		"Base from Performance Recommendations: D≈%.1f GB/day (%s) × U=%d (%s) → %s",
		dailyGB, base.VolumeBand, users, base.UserBand, formatBaseCounts(base)))
	plan.Steps = append(plan.Steps, fmt.Sprintf(
		"Search load inputs (Dimensions / Reference hardware): concurrent users U=%d, peak concurrent searches S=%d, saved/scheduled searches=%d",
		users, searches, saved))

	if dailyGB > 3072 {
		plan.Warnings = append(plan.Warnings, "daily ingest exceeds platform reference table (≤3 TB/day) — recommendation clamped to 2–3 TB column; validate with Splunk/PS")
	}
	if users > 48 {
		plan.Warnings = append(plan.Warnings, "concurrent_users exceeds platform reference table (≤48) — recommendation clamped to ≤48 row; validate with Splunk/PS")
	}
	if saved > 0 && saved < searches {
		plan.Warnings = append(plan.Warnings, "saved_searches is lower than concurrent_searches — usually total saved ≥ peak concurrent; verify inputs")
	}
	if saved >= 200 && !p.SearchHeadCluster {
		plan.Warnings = append(plan.Warnings, "high saved/scheduled search count (≥200) — consider Search Head Cluster for schedule stability (see ITSI/SHC guidance; platform Dimensions: saved searches need more capacity)")
	}

	// Indexer cluster: never keep combined; peers ≥ RF (and typically ≥3)
	if p.IndexerCluster {
		plan.ClusterManager = true
		if plan.CombinedInstance {
			plan.CombinedInstance = false
			if plan.NSH < 1 {
				plan.NSH = 1
			}
			if plan.NIDX < 3 {
				plan.NIDX = 3
			}
			plan.Steps = append(plan.Steps, "Indexer cluster enabled → split combined instance; floor indexers to ≥3")
		}
		if plan.NIDX < p.RF {
			plan.Steps = append(plan.Steps, fmt.Sprintf("Indexer cluster RF=%d → raise N_IDX from %d to %d", p.RF, plan.NIDX, p.RF))
			plan.NIDX = p.RF
		} else {
			plan.Steps = append(plan.Steps, fmt.Sprintf("Indexer cluster on (RF=%d SF=%d) → N_IDX=%d peers + 1 cluster manager", p.RF, p.SF, plan.NIDX))
		}
	} else if plan.CombinedInstance {
		plan.Steps = append(plan.Steps, "No indexer cluster → combined SH+IDX on one node is allowed for this D×U cell")
	} else if plan.NIDX > 1 {
		plan.Steps = append(plan.Steps, fmt.Sprintf("No indexer cluster → %d standalone indexers (not clustered)", plan.NIDX))
	}

	// Search head cluster: N_SH ≥ 3 + deployer; cannot stay combined
	if p.SearchHeadCluster {
		plan.SHCDeployer = true
		plan.CombinedInstance = false
		if plan.NSH < 1 {
			plan.NSH = 1
		}
		if plan.NSH < 3 {
			plan.Steps = append(plan.Steps, fmt.Sprintf("SHC enabled → raise N_SH from %d to 3 (+ 1 deployer)", plan.NSH))
			plan.NSH = 3
		} else {
			plan.Steps = append(plan.Steps, fmt.Sprintf("SHC enabled → N_SH=%d (+ 1 deployer); odd peer count preferred", plan.NSH))
		}
	}

	// Concurrent search volume floor (Reference hardware Search Head):
	// each active search consumes up to 1 CPU core — size total SH cores ≥ peak concurrent searches.
	applySearchConcurrencyFloor(&plan, p, searches)

	if p.HasES {
		esIdx := ESMinIndexers(dailyGB, p.SearchHeadCluster)
		if plan.CombinedInstance {
			plan.CombinedInstance = false
			if plan.NSH < 1 {
				plan.NSH = 1
			}
		}
		if plan.NIDX < esIdx {
			plan.Steps = append(plan.Steps, fmt.Sprintf("ES floor → raise N_IDX from %d to %d (doc 01 §6.4)", plan.NIDX, esIdx))
			plan.NIDX = esIdx
		} else {
			plan.Steps = append(plan.Steps, fmt.Sprintf("ES enabled → indexer floor %d already met (N_IDX=%d)", esIdx, plan.NIDX))
		}
		if plan.NSH < 1 {
			plan.NSH = 1
		}
		if dailyGB > 15360 {
			plan.Warnings = append(plan.Warnings, "ES ingest above 15 TB/day uses largest tested indexer floors (doc 01 §6.4) — validate skip-search and detections load")
		}
	}
	if p.HasITSI {
		itsiIdx := int(math.Ceil(dailyGB / 100.0))
		if itsiIdx < 1 {
			itsiIdx = 1
		}
		if plan.CombinedInstance {
			plan.CombinedInstance = false
			if plan.NSH < 1 {
				plan.NSH = 1
			}
		}
		if plan.NIDX < itsiIdx {
			plan.Steps = append(plan.Steps, fmt.Sprintf("ITSI floor ≈ceil(D/100) → raise N_IDX from %d to %d", plan.NIDX, itsiIdx))
			plan.NIDX = itsiIdx
		}
		plan.Warnings = append(plan.Warnings, "ITSI indexer floor uses ≈ceil(D/100); full KPI/entity tables are not automated (see HLD non-goals)")
	}

	autoNSH, autoNIDX := plan.NSH, plan.NIDX
	plan.AutoNSH, plan.AutoNIDX = autoNSH, autoNIDX

	if p.NIdx > 0 {
		if p.NIdx < autoNIDX {
			plan.Warnings = append(plan.Warnings, fmt.Sprintf("n_idx=%d is below recommended floor %d — using your override; validate HA/RF/ES capacity", p.NIdx, autoNIDX))
		}
		plan.Steps = append(plan.Steps, fmt.Sprintf("Override n_idx=%d (auto was %d)", p.NIdx, autoNIDX))
		plan.NIDX = p.NIdx
		plan.CombinedInstance = false
		if p.IndexerCluster && plan.NIDX < p.RF {
			plan.Warnings = append(plan.Warnings, fmt.Sprintf("n_idx raised from %d to RF=%d (peers must be ≥ replication factor)", p.NIdx, p.RF))
			plan.NIDX = p.RF
		}
	}
	if p.NSh > 0 {
		if p.NSh < autoNSH {
			plan.Warnings = append(plan.Warnings, fmt.Sprintf("n_sh=%d is below recommended floor %d — using your override", p.NSh, autoNSH))
		}
		plan.Steps = append(plan.Steps, fmt.Sprintf("Override n_sh=%d (auto was %d)", p.NSh, autoNSH))
		plan.NSH = p.NSh
		plan.CombinedInstance = false
		if p.SearchHeadCluster && plan.NSH < 3 {
			plan.Warnings = append(plan.Warnings, "n_sh raised to 3 for SHC minimum")
			plan.NSH = 3
		}
	}

	// Separate ES / ITSI search tiers
	if p.HasES && p.HasITSI {
		plan.NSHES = plan.NSH
		plan.NSHITSI = plan.NSH
		if p.SearchHeadCluster {
			if plan.NSHES < 3 {
				plan.NSHES = 3
			}
			if plan.NSHITSI < 3 {
				plan.NSHITSI = 3
			}
		}
		plan.Steps = append(plan.Steps, fmt.Sprintf(
			"ES+ITSI → separate search tiers: %d ES SH + %d ITSI SH (total headline N_SH=%d)",
			plan.NSHES, plan.NSHITSI, plan.NSHES+plan.NSHITSI))
		plan.NSH = plan.NSHES + plan.NSHITSI
	} else if p.HasES {
		plan.NSHES = plan.NSH
	} else if p.HasITSI {
		plan.NSHITSI = plan.NSH
	}

	if plan.CombinedInstance {
		plan.Steps = append(plan.Steps, "Final: 1 combined node (SH+IDX)")
	} else {
		plan.Steps = append(plan.Steps, fmt.Sprintf("Final: %d search head(s) + %d indexer(s)", plan.NSH, plan.NIDX))
	}
	plan.Steps = append(plan.Steps, fmt.Sprintf("Auto recommendation (before overrides): N_SH=%d, N_IDX=%d", plan.AutoNSH, plan.AutoNIDX))

	appendTopologySuggestions(&plan, p, dailyGB, users, searches, saved)
	return plan
}

func appendTopologySuggestions(plan *NodePlan, p model.PlanInput, dailyGB float64, users, searches, saved int) {
	if !p.SearchHeadCluster {
		var why []string
		if users >= 12 {
			why = append(why, fmt.Sprintf("concurrent users=%d (≥12)", users))
		}
		if saved >= 200 {
			why = append(why, fmt.Sprintf("saved/scheduled searches=%d (≥200)", saved))
		}
		if searches > 16 {
			why = append(why, fmt.Sprintf("peak concurrent searches=%d (>16 cores on one SH)", searches))
		}
		if plan.AutoNSH >= 2 {
			why = append(why, fmt.Sprintf("auto N_SH=%d — HA/schedule distribution benefits from SHC", plan.AutoNSH))
		}
		if len(why) > 0 {
			plan.Suggestions = append(plan.Suggestions, model.TopologySuggestion{
				ID:     "enable_shc",
				Title:  "Enable Search Head Cluster",
				Reason: "Recommended because " + strings.Join(why, "; ") + ". SHC raises N_SH to ≥3 and adds a deployer.",
				Enable: map[string]bool{"search_head_cluster": true},
			})
		}
	}

	if !p.IndexerCluster {
		var why []string
		if plan.AutoNIDX >= 3 {
			why = append(why, fmt.Sprintf("auto N_IDX=%d (≥3 peers)", plan.AutoNIDX))
		}
		if dailyGB >= 100 {
			why = append(why, fmt.Sprintf("daily ingest ≈%.0f GB/day", dailyGB))
		}
		if !plan.CombinedInstance && plan.AutoNIDX >= 2 {
			why = append(why, "distributed indexers without clustering lack RF/SF HA")
		}
		if len(why) > 0 {
			plan.Suggestions = append(plan.Suggestions, model.TopologySuggestion{
				ID:     "enable_indexer_cluster",
				Title:  "Enable Indexer cluster",
				Reason: "Recommended because " + strings.Join(why, "; ") + ". Uses RF/SF (default 3/2), adds a cluster manager, and peers ≥ RF.",
				Enable: map[string]bool{"indexer_cluster": true},
			})
		}
	}

	if !p.SmartStore && dailyGB >= 500 && p.RetentionDays >= 90 {
		plan.Suggestions = append(plan.Suggestions, model.TopologySuggestion{
			ID:     "enable_smartstore",
			Title:  "Enable SmartStore",
			Reason: fmt.Sprintf("Daily ingest ≈%.0f GB/day with %d-day retention — remote object store + local cache often fits better than full local cold retention.", dailyGB, p.RetentionDays),
			Enable: map[string]bool{"smartstore": true},
		})
	}

	if !p.ArchiveFrozen && p.RetentionDays >= 180 {
		plan.Suggestions = append(plan.Suggestions, model.TopologySuggestion{
			ID:     "enable_archive_frozen",
			Title:  "Archive frozen buckets",
			Reason: fmt.Sprintf("Retention is %d days — if compliance needs a copy after freeze, enable Archive frozen (otherwise Splunk deletes by default).", p.RetentionDays),
			Enable: map[string]bool{"archive_frozen": true},
		})
	}
}

func formatBaseCounts(c Counts) string {
	if c.CombinedInstance {
		return "1 combined instance"
	}
	return fmt.Sprintf("%d SH + %d IDX", c.NSH, c.NIDX)
}

// referenceSHCores is the physical-core planning unit for a Search Head (Reference hardware /
// ES / ITSI minima). Used with concurrent searches: 1 active search ≤ 1 CPU core.
func referenceSHCores(p model.PlanInput) int {
	if p.HasITSI {
		return 16 // ITSI: 16 required; 24+ recommended — we floor on required, warn separately
	}
	return 16 // platform + ES production minimum
}

func combinedInstanceCores() int {
	return 12 // single-instance / combined minimum reference host
}

// applySearchConcurrencyFloor raises N_SH so total SH cores can cover peak concurrent searches.
// Official: Reference hardware Search Head — each active search consumes up to 1 CPU core;
// Dimensions — concurrent search volume is a primary distributed sizing factor.
func applySearchConcurrencyFloor(plan *NodePlan, p model.PlanInput, searches int) {
	if searches <= 0 {
		return
	}
	cores := plan.SHCoresPerNode
	if cores <= 0 {
		cores = referenceSHCores(p)
		plan.SHCoresPerNode = cores
	}

	if plan.CombinedInstance {
		capCores := combinedInstanceCores()
		if searches > capCores {
			plan.CombinedInstance = false
			if plan.NSH < 1 {
				plan.NSH = 1
			}
			if plan.NIDX < 1 {
				plan.NIDX = 1
			}
			plan.Steps = append(plan.Steps, fmt.Sprintf(
				"Peak concurrent searches S=%d exceeds combined-instance capacity (~%d cores) → split to dedicated search tier",
				searches, capCores))
		} else {
			plan.Steps = append(plan.Steps, fmt.Sprintf(
				"Peak concurrent searches S=%d fits combined-instance ~%d cores (1 active search ≤ 1 CPU core)",
				searches, capCores))
			return
		}
	}

	need := int(math.Ceil(float64(searches) / float64(cores)))
	if need < 1 {
		need = 1
	}
	if need > plan.NSH {
		plan.Steps = append(plan.Steps, fmt.Sprintf(
			"Concurrent search volume S=%d → ceil(S / %d cores per SH) = %d SH (Reference hardware: 1 active search ≤ 1 CPU core); raise N_SH from %d",
			searches, cores, need, plan.NSH))
		plan.NSH = need
		plan.Warnings = append(plan.Warnings,
			"Raising search-head count for concurrent search volume also increases search load on indexers — confirm indexer tier still matches Reference hardware guidance")
	} else {
		plan.Steps = append(plan.Steps, fmt.Sprintf(
			"Concurrent search volume S=%d covered by N_SH=%d × %d cores/SH = %d cores (1 active search ≤ 1 CPU core)",
			searches, plan.NSH, cores, plan.NSH*cores))
	}

	if p.SearchHeadCluster && plan.NSH < 3 {
		plan.Steps = append(plan.Steps, fmt.Sprintf("SHC minimum still applies → raise N_SH from %d to 3", plan.NSH))
		plan.NSH = 3
	}
}

func FormatNodePlan(plan NodePlan) string {
	var b strings.Builder
	fmt.Fprintf(&b, "NODE COUNTS (users × daily ingest × concurrent searches × topology)\n")
	for i, s := range plan.Steps {
		fmt.Fprintf(&b, "  %d. %s\n", i+1, s)
	}
	return b.String()
}

// volume columns: 0=<2, 1=2-300, 2=300-600, 3=600-1024, 4=1-2TB, 5=2-3TB
func volumeCol(d float64) int {
	switch {
	case d < 2:
		return 0
	case d < 300:
		return 1
	case d < 600:
		return 2
	case d < 1024:
		return 3
	case d < 2048:
		return 4
	default:
		return 5
	}
}

func userRow(u int) int {
	switch {
	case u < 4:
		return 0
	case u <= 8:
		return 1
	case u <= 16:
		return 2
	case u <= 24:
		return 3
	default:
		return 4 // up to 48
	}
}

func userBandLabel(row int) string {
	switch row {
	case 0:
		return "< 4 users"
	case 1:
		return "up to 8 users"
	case 2:
		return "up to 16 users"
	case 3:
		return "up to 24 users"
	default:
		return "up to 48 users"
	}
}

func volumeBandLabel(col int) string {
	switch col {
	case 0:
		return "< 2 GB/day"
	case 1:
		return "2–300 GB/day"
	case 2:
		return "300–600 GB/day"
	case 3:
		return "600 GB–1 TB/day"
	case 4:
		return "1–2 TB/day"
	default:
		return "2–3 TB/day"
	}
}

// table[row][col] = {n_sh, n_idx, combined_flag}
var table = [5][6][3]int{
	{{0, 0, 1}, {0, 0, 1}, {1, 2, 0}, {1, 3, 0}, {1, 7, 0}, {1, 10, 0}},
	{{0, 0, 1}, {1, 1, 0}, {1, 2, 0}, {1, 3, 0}, {1, 8, 0}, {1, 12, 0}},
	{{1, 1, 0}, {1, 1, 0}, {1, 3, 0}, {2, 4, 0}, {2, 10, 0}, {2, 15, 0}},
	{{1, 1, 0}, {1, 2, 0}, {2, 3, 0}, {2, 6, 0}, {2, 12, 0}, {3, 18, 0}},
	{{1, 2, 0}, {1, 2, 0}, {2, 4, 0}, {2, 7, 0}, {3, 14, 0}, {3, 21, 0}},
}

// ESMinIndexers is a floor from ES scaling table (doc 01 §6.4).
func ESMinIndexers(dailyGB float64, shc bool) int {
	switch {
	case dailyGB <= 300:
		return 3
	case dailyGB <= 1024:
		return 10
	case dailyGB < 15360:
		return 24
	case dailyGB <= 15360:
		return 150
	default:
		if shc {
			return 240
		}
		return 300
	}
}

// BuildDesign produces architecture + settings narrative after storage sizing.
func BuildDesign(p model.PlanInput, out model.PlanResult) model.Design {
	d := model.Design{
		IndexerCluster:       p.IndexerCluster,
		SearchHeadCluster:    p.SearchHeadCluster,
		SmartStore:           p.SmartStore,
		HasES:                p.HasES,
		HasITSI:              p.HasITSI,
		CompressionFactor:    out.CompressionFactor,
		HotNeedGB:            float64(out.HotVolumeMB) / 1024.0,
		ColdNeedGB:           float64(out.ColdVolumeMB) / 1024.0,
		SummariesNeedGB:      float64(out.SummariesVolumeMB) / 1024.0,
		HotAvailableGB:       p.AvailableHotGB,
		ColdAvailableGB:      p.AvailableColdGB,
		SummariesAvailableGB: p.AvailableSummariesGB,
		ConcurrentUsers:      p.ConcurrentUsers,
		ConcurrentSearches:   p.ConcurrentSearches,
		SavedSearches:        p.SavedSearches,
		DailyGBForCounts:     out.TotalDailyRawGB,
	}
	if d.ConcurrentUsers <= 0 {
		d.ConcurrentUsers = 8
	}
	if d.ConcurrentSearches <= 0 {
		d.ConcurrentSearches = d.ConcurrentUsers
	}

	plan := ResolveNodeCounts(p, out.TotalDailyRawGB)
	d.BaseNSH, d.BaseNIDX = plan.BaseNSH, plan.BaseNIDX
	d.AutoNSH, d.AutoNIDX = plan.AutoNSH, plan.AutoNIDX
	d.NSH, d.NIDX = plan.NSH, plan.NIDX
	d.NSHES, d.NSHITSI = plan.NSHES, plan.NSHITSI
	d.CombinedInstance = plan.CombinedInstance
	d.ClusterManager = plan.ClusterManager
	d.SHCDeployer = plan.SHCDeployer
	d.SHCoresPerNode = plan.SHCoresPerNode
	d.NodePlanText = FormatNodePlan(plan)
	d.Warnings = append(d.Warnings, plan.Warnings...)
	d.Suggestions = append(d.Suggestions, plan.Suggestions...)

	if p.SmartStore {
		d.CacheDays = 30
		if p.HasES {
			d.CacheDays = 90
		}
		d.LocalCacheTotalGB = round1(0.5 * out.TotalDailyRawGB * float64(d.CacheDays))
		if d.NIDX > 0 {
			d.LocalCachePerIDXGB = round1(d.LocalCacheTotalGB / float64(d.NIDX))
		}
		comp := out.CompressionFactor
		if comp <= 0 {
			comp = 0.5
		}
		d.RemoteStoreGB = round1(out.TotalDailyRawGB * float64(p.RetentionDays) * comp)
	}

	d.HotNeedGB = round1(d.HotNeedGB)
	d.ColdNeedGB = round1(d.ColdNeedGB)
	d.SummariesNeedGB = round1(d.SummariesNeedGB)

	if p.AvailableHotGB > 0 {
		ok := d.HotNeedGB <= p.AvailableHotGB
		d.HotFits = &ok
	}
	if p.AvailableColdGB > 0 {
		ok := d.ColdNeedGB <= p.AvailableColdGB
		d.ColdFits = &ok
	}
	if p.AvailableSummariesGB > 0 {
		ok := d.SummariesNeedGB <= p.AvailableSummariesGB
		d.SummariesFit = &ok
	}

	comp := out.CompressionFactor
	if comp <= 0 {
		comp = 0.5
	}
	availSearchable := p.AvailableHotGB + p.AvailableColdGB
	if availSearchable > 0 {
		if out.TotalDailyRawGB > 0 {
			dailyOnDisk := out.TotalDailyRawGB * comp
			if dailyOnDisk > 0 {
				d.MaxRetentionDays = int(math.Floor(availSearchable / dailyOnDisk))
			}
		}
		if p.RetentionDays > 0 {
			d.MaxDailyGBFromDisk = round1(availSearchable / (comp * float64(p.RetentionDays) * p.Headroom))
		}
	}

	d.Resources = RecommendResources(p, d, out.TotalDailyRawGB)
	d.ResourcesText = renderResources(d.Resources)
	d.StructureText = renderStructure(p, d, out)
	d.SettingsText = renderSettings(p, d, out)
	return d
}
