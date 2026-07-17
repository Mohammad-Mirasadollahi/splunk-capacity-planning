package arch

import (
	"fmt"
	"math"
	"strings"

	"github.com/splunk-capacity-planning/scpcalc/internal/model"
)

// RefreshTexts regenerates narrative after mutating design fields.
func RefreshTexts(p model.PlanInput, d *model.Design, out model.PlanResult) {
	d.ResourcesText = renderResources(d.Resources)
	d.StructureText = renderStructure(p, *d, out)
	d.SettingsText = renderSettings(p, *d, out)
}

// RefreshSettingsOnly updates the settings block (e.g. after volume caps applied to conf).
func RefreshSettingsOnly(p model.PlanInput, d *model.Design, confOut model.PlanResult) {
	d.SettingsText = renderSettings(p, *d, confOut)
}

type hwTier struct {
	name  string
	cores int
	vcpu  int
	ram   int
}

var (
	tierCombined = hwTier{"minimum (S1 combined)", 12, 24, 12}
	tierSHMin    = hwTier{"minimum", 16, 32, 12}
	tierSHES     = hwTier{"es-minimum", 16, 32, 32}
	tierSHITSI   = hwTier{"itsi / mid-range", 16, 32, 32}
	tierIDXMin   = hwTier{"minimum", 12, 24, 12}
	tierIDXMid   = hwTier{"mid-range", 24, 48, 64}
	tierIDXHigh  = hwTier{"high-performance", 48, 96, 128}
	tierMgmt     = hwTier{"management", 12, 24, 12}
)

func pickIndexerTier(dailyGB float64, nidx int, hasES, hasITSI bool) hwTier {
	per := dailyGB
	if nidx > 0 {
		per = dailyGB / float64(nidx)
	}
	switch {
	case hasES || hasITSI || per >= 250 || dailyGB >= 1024:
		return tierIDXHigh
	case per >= 120 || dailyGB >= 300:
		return tierIDXMid
	default:
		return tierIDXMin
	}
}

// RecommendResources builds per-layer hardware guidance (Reference hardware).
func RecommendResources(p model.PlanInput, d model.Design, dailyGB float64) []model.LayerSpec {
	net := "≥1 GbE (prefer 10 GbE between SH↔IDX at scale)"
	out := make([]model.LayerSpec, 0, 8)

	if d.CombinedInstance {
		disk := round1(d.HotNeedGB + d.ColdNeedGB + d.SummariesNeedGB + 100)
		out = append(out, model.LayerSpec{
			Role: "Combined instance (SH+IDX)", Count: 1, Tier: tierCombined.name,
			CPUCores: tierCombined.cores, VCPU: tierCombined.vcpu, RAMGB: tierCombined.ram,
			StorageType: "SSD for hot/warm+OS; cold optional HDD", DiskGBHint: disk,
			Network: "1 GbE NIC (+ optional mgmt NIC)", IOPSHint: "Install vol ≥800 sustained IOPS",
			Notes: "Only for very small / lab; move to distributed when concurrency or volume grows",
		})
		return out
	}

	nidx := maxInt(d.NIDX, 1)
	hotPer := round1(d.HotNeedGB / float64(nidx))
	coldPer := round1(d.ColdNeedGB / float64(nidx))
	sumPer := round1(d.SummariesNeedGB / float64(nidx))

	// Platform / ES / ITSI search tiers — never double-count.
	switch {
	case d.HasES && d.HasITSI:
		out = append(out, model.LayerSpec{
			Role: "ES search head / SHC", Count: maxInt(d.NSHES, 1), Tier: tierSHES.name,
			CPUCores: tierSHES.cores, VCPU: tierSHES.vcpu, RAMGB: tierSHES.ram,
			StorageType: "SSD (preferred) or HDD ≥800 IOPS", DiskGBHint: 300,
			Network: net, IOPSHint: "≥800 sustained IOPS",
			Notes: "Dedicated ES SH/SHC; CIM-compatible apps only; do not colocate with ITSI",
		})
		out = append(out, model.LayerSpec{
			Role: "ITSI search head / SHC", Count: maxInt(d.NSHITSI, 1), Tier: tierSHITSI.name,
			CPUCores: tierSHITSI.cores, VCPU: tierSHITSI.vcpu, RAMGB: tierSHITSI.ram,
			StorageType: "SSD; ≥30 GB free in $SPLUNK_HOME", DiskGBHint: 300,
			Network: net, IOPSHint: "≥800 sustained IOPS",
			Notes: "Separate tier from ES; KPI load may require more SH — validate with ITSI tables",
		})
	case d.HasES:
		out = append(out, model.LayerSpec{
			Role: "ES search head / SHC", Count: maxInt(d.NSH, 1), Tier: tierSHES.name,
			CPUCores: tierSHES.cores, VCPU: tierSHES.vcpu, RAMGB: tierSHES.ram,
			StorageType: "SSD (preferred) or HDD ≥800 IOPS", DiskGBHint: 300,
			Network: net, IOPSHint: "≥800 sustained IOPS",
			Notes: "ES production min 16 physical cores / 32 GB / 32 vCPU; dedicated SH/SHC",
		})
	case d.HasITSI:
		out = append(out, model.LayerSpec{
			Role: "ITSI search head / SHC", Count: maxInt(d.NSH, 1), Tier: tierSHITSI.name,
			CPUCores: tierSHITSI.cores, VCPU: tierSHITSI.vcpu, RAMGB: tierSHITSI.ram,
			StorageType: "SSD; ≥30 GB free in $SPLUNK_HOME", DiskGBHint: 300,
			Network: net, IOPSHint: "≥800 sustained IOPS",
			Notes: "ITSI dedicated SH; KPI/entity tables not fully automated in this calculator",
		})
	default:
		sh := tierSHMin
		if dailyGB >= 600 || p.ConcurrentUsers >= 16 {
			sh = hwTier{"mid-range SH", 16, 32, 32}
		}
		out = append(out, model.LayerSpec{
			Role: "Search head", Count: maxInt(d.NSH, 1), Tier: sh.name,
			CPUCores: sh.cores, VCPU: sh.vcpu, RAMGB: sh.ram,
			StorageType: "SSD (preferred) or HDD ≥800 IOPS", DiskGBHint: 300,
			Network: net, IOPSHint: "≥800 sustained IOPS on install/search volume",
			Notes: "Each active search ≤1 CPU core; HDD ≥800 IOPS or prefer SSD; min 300 GB dedicated",
		})
	}

	idx := pickIndexerTier(dailyGB, d.NIDX, d.HasES, d.HasITSI)
	diskPer := hotPer + coldPer + sumPer + 50
	stor := "Hot/warm+DMA: SSD; Cold: HDD/SAN; never hot/warm on NFS"
	iops := fmt.Sprintf("Shared array example ≈4000 IOPS × %d indexers = %d concurrent IOPS", nidx, 4000*nidx)
	if d.SmartStore {
		stor = "SmartStore: NVMe/SSD local cache + remote object store; non-SmartStore indexes still need local SSD"
		diskPer = round1(d.LocalCachePerIDXGB + sumPer + 100)
		iops = "Local cache on NVMe/SSD; remote latency matters for warm fetches; target 10 Gbps/indexer to object store"
	}
	out = append(out, model.LayerSpec{
		Role: "Indexer", Count: nidx, Tier: idx.name,
		CPUCores: idx.cores, VCPU: idx.vcpu, RAMGB: idx.ram,
		StorageType: stor, DiskGBHint: diskPer,
		Network: net, IOPSHint: iops,
		Notes: fmt.Sprintf("Per peer ≈ hot %.0f + cold %.0f + summaries %.0f GB (before OS/headroom). Keep ≥5 GB free or indexing stops.", hotPer, coldPer, sumPer),
	})

	if d.ClusterManager {
		out = append(out, model.LayerSpec{
			Role: "Cluster manager", Count: 1, Tier: tierMgmt.name,
			CPUCores: tierMgmt.cores, VCPU: tierMgmt.vcpu, RAMGB: tierMgmt.ram,
			StorageType: "Local SSD/HDD for $SPLUNK_HOME", DiskGBHint: 100,
			Network: "≤100 ms latency to indexer peers", IOPSHint: "≥800 IOPS install volume",
			Notes: "Start from single-instance class; scale with cluster size. Do not put customer data here.",
		})
	}
	if d.SHCDeployer {
		out = append(out, model.LayerSpec{
			Role: "SHC deployer", Count: 1, Tier: tierMgmt.name,
			CPUCores: tierMgmt.cores, VCPU: tierMgmt.vcpu, RAMGB: tierMgmt.ram,
			StorageType: "Local disk for apps/bundle", DiskGBHint: 100,
			Network: "≤200 ms latency within SHC", IOPSHint: "≥800 IOPS",
			Notes: "Deploys apps/config to SHC members; not a search peer",
		})
	}
	if p.WantDMA() {
		out = append(out, model.LayerSpec{
			Role: "DMA / summaries volume", Count: nidx, Tier: "storage layer",
			CPUCores: 0, VCPU: 0, RAMGB: 0,
			StorageType: "SSD/NVMe (not cold HDD)", DiskGBHint: sumPer,
			Network: "local to indexer", IOPSHint: "High random IOPS — co-locate with hot/warm SSD class",
			Notes: fmt.Sprintf("tstatsHomePath / DMA on volume:summaries; total summaries need ~%.1f GB across tier (estimate)", d.SummariesNeedGB),
		})
	}
	if d.SmartStore {
		out = append(out, model.LayerSpec{
			Role: "SmartStore remote object store", Count: 1, Tier: "remote",
			CPUCores: 0, VCPU: 0, RAMGB: 0,
			StorageType: "S3-compatible object store", DiskGBHint: d.RemoteStoreGB,
			Network: "10 Gbps/indexer recommended", Notes: fmt.Sprintf("Remote_Store ≈ D×R×Comp = %.1f GB; local cache ~%d days (%.1f GB total)", d.RemoteStoreGB, d.CacheDays, d.LocalCacheTotalGB),
		})
	}

	if p.ArchiveFrozen {
		out = append(out, model.LayerSpec{
			Role: "Frozen / archive", Count: 1, Tier: "archive",
			CPUCores: 0, VCPU: 0, RAMGB: 0,
			StorageType: "SAN / NAS / NFS / HDD / object", DiskGBHint: 0,
			Network: "backup network OK", Notes: fmt.Sprintf("coldToFrozenDir path=%s — not for active search; thaw to restore", p.FrozenPath),
		})
	}

	return out
}

func renderResources(layers []model.LayerSpec) string {
	var b strings.Builder
	fmt.Fprintf(&b, "RECOMMENDED RESOURCES PER LAYER (Reference hardware — guideline)\n")
	fmt.Fprintf(&b, "CPU must support AVX/SSE4.2/AES-NI. Reserve full resources on VMs (IDX ~10–15%% slower on VM ingest).\n\n")
	for _, L := range layers {
		fmt.Fprintf(&b, "[%s] × %d  | tier: %s\n", L.Role, L.Count, L.Tier)
		if L.CPUCores > 0 {
			fmt.Fprintf(&b, "  CPU: %d physical cores / %d vCPU @ ≥2 GHz\n", L.CPUCores, L.VCPU)
			fmt.Fprintf(&b, "  RAM: %d GB\n", L.RAMGB)
		}
		fmt.Fprintf(&b, "  Storage: %s", L.StorageType)
		if L.DiskGBHint > 0 {
			fmt.Fprintf(&b, "  | disk hint ≈ %.0f GB/node", L.DiskGBHint)
		}
		fmt.Fprintf(&b, "\n")
		if L.Network != "" {
			fmt.Fprintf(&b, "  Network: %s\n", L.Network)
		}
		if L.IOPSHint != "" {
			fmt.Fprintf(&b, "  IOPS: %s\n", L.IOPSHint)
		}
		if L.Notes != "" {
			fmt.Fprintf(&b, "  Notes: %s\n", L.Notes)
		}
		fmt.Fprintf(&b, "\n")
	}
	return b.String()
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func renderStructure(p model.PlanInput, d model.Design, out model.PlanResult) string {
	var b strings.Builder
	fmt.Fprintf(&b, "DESIGN STRUCTURE (guideline from docs/en/01 + 02 + 05)\n")
	fmt.Fprintf(&b, "Daily ingest: %.3f GB/day  |  Retention: %d days  |  Hot/Warm: %d days\n", out.TotalDailyRawGB, p.RetentionDays, p.HotWarmDays)
	fmt.Fprintf(&b, "Compression factor: %.3f (RF=%d SF=%d", d.CompressionFactor, p.RF, p.SF)
	if p.Compression > 0 {
		fmt.Fprintf(&b, "; measured C override")
	}
	fmt.Fprintf(&b, ")\n\n")

	fmt.Fprintf(&b, "Node counts (users × volume × clustering):\n")
	fmt.Fprintf(&b, "  Concurrent SH users (U): %d\n", d.ConcurrentUsers)
	fmt.Fprintf(&b, "  Daily volume for sizing (D): %.1f GB/day\n", d.DailyGBForCounts)
	if d.CombinedInstance {
		fmt.Fprintf(&b, "  Result: 1 combined SH+IDX node\n")
	} else {
		fmt.Fprintf(&b, "  Search heads (N_SH): %d", d.NSH)
		if d.BaseNSH > 0 && d.BaseNSH != d.NSH {
			fmt.Fprintf(&b, "  [table %d → after floors %d]", d.BaseNSH, d.NSH)
		}
		fmt.Fprintf(&b, "\n  Indexers (N_IDX): %d", d.NIDX)
		if d.BaseNIDX > 0 && d.BaseNIDX != d.NIDX {
			fmt.Fprintf(&b, "  [table %d → after floors %d]", d.BaseNIDX, d.NIDX)
		}
		fmt.Fprintf(&b, "\n")
	}
	if d.NodePlanText != "" {
		b.WriteString("\n")
		b.WriteString(d.NodePlanText)
		b.WriteString("\n")
	}

	fmt.Fprintf(&b, "Layers:\n")
	if d.CombinedInstance {
		fmt.Fprintf(&b, "  - Single combined instance (SH+IDX on one host) — small lab/low volume only\n")
	} else {
		if d.HasES && d.HasITSI {
			fmt.Fprintf(&b, "  - ES search tier: %d SH", d.NSHES)
			if d.SearchHeadCluster {
				fmt.Fprintf(&b, " in SHC")
			}
			fmt.Fprintf(&b, "\n  - ITSI search tier: %d SH (separate from ES)", d.NSHITSI)
			if d.SearchHeadCluster {
				fmt.Fprintf(&b, " in SHC")
			}
			fmt.Fprintf(&b, "\n")
		} else {
			fmt.Fprintf(&b, "  - Search tier: %d search head(s)", d.NSH)
			if d.SearchHeadCluster {
				fmt.Fprintf(&b, " in SHC (+ 1 deployer)")
			}
			fmt.Fprintf(&b, "\n")
		}
		fmt.Fprintf(&b, "  - Index tier: %d indexer(s)", d.NIDX)
		if d.IndexerCluster {
			fmt.Fprintf(&b, " in indexer cluster (RF=%d SF=%d) + 1 cluster manager", p.RF, p.SF)
		}
		fmt.Fprintf(&b, "\n")
	}
	if d.ClusterManager {
		fmt.Fprintf(&b, "  - Cluster manager: required\n")
	}
	if d.SHCDeployer {
		fmt.Fprintf(&b, "  - SHC deployer: required\n")
	}
	if d.HasES {
		fmt.Fprintf(&b, "  - Enterprise Security: dedicated SH/SHC (min 16c/32GB); not shared with ITSI SH\n")
	}
	if d.HasITSI {
		fmt.Fprintf(&b, "  - ITSI: dedicated SH/SHC; keep ≥30GB free on $SPLUNK_HOME for KV store; itsi_summary on indexers\n")
	}
	if d.SmartStore {
		fmt.Fprintf(&b, "  - SmartStore: remote object store ≈ %.1f GB; local cache ~%d days (%.1f GB total", d.RemoteStoreGB, d.CacheDays, d.LocalCacheTotalGB)
		if d.NIDX > 0 {
			fmt.Fprintf(&b, ", ~%.1f GB/peer", d.LocalCachePerIDXGB)
		}
		fmt.Fprintf(&b, ")\n")
	}

	fmt.Fprintf(&b, "\nStorage volumes (cluster-wide need):\n")
	fmt.Fprintf(&b, "  - hot/warm SSD: need ~%.1f GB  path=%s\n", d.HotNeedGB, p.HotPath)
	fmt.Fprintf(&b, "  - cold:         need ~%.1f GB  path=%s\n", d.ColdNeedGB, p.ColdPath)
	fmt.Fprintf(&b, "  - summaries:    need ~%.1f GB  path=%s (DMA/tstats + summary indexes)\n", d.SummariesNeedGB, p.SummariesPath)
	if p.ArchiveFrozen {
		fmt.Fprintf(&b, "  - frozen archive: path=%s\n", p.FrozenPath)
	} else {
		fmt.Fprintf(&b, "  - frozen: default DELETE (archive_frozen=false)\n")
	}
	if d.PerPeerMB {
		fmt.Fprintf(&b, "\nindexes.conf MB fields are PER PEER (÷ N_IDX=%d).\n", d.NIDX)
	}

	if len(d.Resources) > 0 {
		fmt.Fprintf(&b, "\nSee also: recommended CPU/RAM/disk per layer (resources_text).\n")
	}

	if p.AvailableHotGB > 0 || p.AvailableColdGB > 0 || p.AvailableSummariesGB > 0 {
		fmt.Fprintf(&b, "\nYour disk budget vs need:\n")
		if p.AvailableHotGB > 0 {
			fmt.Fprintf(&b, "  - hot: %.1f available / %.1f need → %s\n", p.AvailableHotGB, d.HotNeedGB, fitLabel(d.HotFits))
		}
		if p.AvailableColdGB > 0 {
			fmt.Fprintf(&b, "  - cold: %.1f available / %.1f need → %s\n", p.AvailableColdGB, d.ColdNeedGB, fitLabel(d.ColdFits))
		}
		if p.AvailableSummariesGB > 0 {
			fmt.Fprintf(&b, "  - summaries: %.1f available / %.1f need → %s\n", p.AvailableSummariesGB, d.SummariesNeedGB, fitLabel(d.SummariesFit))
		}
		if d.MaxDailyGBFromDisk > 0 {
			fmt.Fprintf(&b, "  - Max daily ingest that fits retention=%d: ~%.1f GB/day\n", p.RetentionDays, d.MaxDailyGBFromDisk)
		}
		if d.MaxRetentionDays > 0 {
			fmt.Fprintf(&b, "  - Max retention that fits current daily: ~%d days\n", d.MaxRetentionDays)
		}
	}
	return b.String()
}

func renderSettings(p model.PlanInput, d model.Design, out model.PlanResult) string {
	var b strings.Builder
	fmt.Fprintf(&b, "EXACT SETTINGS TO APPLY (draft — review before production)\n")
	if d.PerPeerMB || out.IndexerPeers > 1 {
		fmt.Fprintf(&b, "Values below are PER PEER (N_IDX=%d).\n\n", maxInt(out.IndexerPeers, d.NIDX))
	} else {
		b.WriteString("\n")
	}
	fmt.Fprintf(&b, "indexes.conf volumes:\n")
	fmt.Fprintf(&b, "  [volume:hotwarm] path=%s  maxVolumeDataSizeMB=%d\n", p.HotPath, out.HotVolumeMB)
	fmt.Fprintf(&b, "  [volume:cold]    path=%s  maxVolumeDataSizeMB=%d\n", p.ColdPath, out.ColdVolumeMB)
	if out.SummariesVolumeMB > 0 || p.WantDMA() {
		fmt.Fprintf(&b, "  [volume:summaries] path=%s maxVolumeDataSizeMB=%d\n", p.SummariesPath, max64(out.SummariesVolumeMB, 1))
	}
	if p.SmartStore {
		rp := strings.TrimSpace(p.RemotePath)
		if rp == "" {
			rp = "s3://YOUR_BUCKET/splunk"
		}
		fmt.Fprintf(&b, "  [volume:remote] path=%s  (SmartStore; remote≈%.1f GB)\n", rp, d.RemoteStoreGB)
	}
	b.WriteString("\n")

	fmt.Fprintf(&b, "Per index:\n")
	for _, ix := range out.Indexes {
		fmt.Fprintf(&b, "  [%s]\n", ix.IndexName)
		fmt.Fprintf(&b, "    maxTotalDataSizeMB=%d\n", ix.MaxTotalDataSizeMB)
		fmt.Fprintf(&b, "    homePath.maxDataSizeMB=%d\n", ix.HomePathMaxDataSizeMB)
		fmt.Fprintf(&b, "    frozenTimePeriodInSecs=%d  (%d days)\n", ix.FrozenTimePeriodInSecs, ix.FrozenTimePeriodInSecs/86400)
		fmt.Fprintf(&b, "    maxDataSize=%s\n", ix.MaxDataSize)
		if p.ArchiveFrozen {
			fmt.Fprintf(&b, "    coldToFrozenDir=%s/%s/frozendb\n", strings.TrimRight(p.FrozenPath, "/"), ix.IndexName)
		}
		if p.WantDMA() {
			fmt.Fprintf(&b, "    tstatsHomePath=volume:summaries/%s/datamodel_summary\n", ix.IndexName)
		}
		if ix.SummaryIndexName != "" {
			fmt.Fprintf(&b, "    + summary index [%s] maxTotal=%d MB\n", ix.SummaryIndexName, ix.SummaryMaxTotalMB)
		}
	}

	fmt.Fprintf(&b, "\nCluster / apps knobs:\n")
	if p.IndexerCluster {
		fmt.Fprintf(&b, "  - server.conf / cluster: replication_factor=%d search_factor=%d\n", p.RF, p.SF)
	} else {
		fmt.Fprintf(&b, "  - No indexer cluster (standalone indexers / single instance)\n")
	}
	if p.SearchHeadCluster {
		fmt.Fprintf(&b, "  - Search Head Cluster enabled (odd peer count recommended; deployer required)\n")
	} else {
		fmt.Fprintf(&b, "  - Search heads not clustered\n")
	}
	if p.HasES {
		fmt.Fprintf(&b, "  - ES: dedicated SH; DMA on summaries volume; SmartStore cache days=%d if SmartStore\n", d.CacheDays)
	}
	if p.HasITSI {
		fmt.Fprintf(&b, "  - ITSI: separate SH from ES; size itsi_summary with same RF/SF model\n")
	}
	fmt.Fprintf(&b, "\nBucket lifecycle: Hot → Warm (maxDataSize) → Cold (homePath.maxDataSizeMB / age) → Frozen (frozenTimePeriodInSecs or maxTotalDataSizeMB).\n")
	return b.String()
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func fitLabel(p *bool) string {
	if p == nil {
		return "n/a"
	}
	if *p {
		return "OK"
	}
	return "SHORT"
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}
