package model

import (
	"fmt"
	"strings"
)

// SourceRow is one log source / index in a multi-index plan.
type SourceRow struct {
	Key              string  `json:"key"`
	Label            string  `json:"label"`
	IndexName        string  `json:"index_name"`
	EventBytes       float64 `json:"event_bytes"`
	EPS              float64 `json:"eps"`
	DailyGB          float64 `json:"daily_gb"`
	RetentionDays    int     `json:"retention_days"`
	HotWarmDays      int     `json:"hot_warm_days"`
	EnableSummary    bool    `json:"enable_summary"`
	SummaryDailyGB   float64 `json:"summary_daily_gb"`
	SummaryIndexName string  `json:"summary_index_name"`
}

// Planning input styles (legacy mode labels still appear on PlanResult for API/CLI compat).
// The engine no longer requires the user to pick a mode — behavior is inferred from filled fields:
//   sources volumes, total_daily_gb, and/or available_* disk budgets (combinable).
const (
	ModeSources  = "sources"
	ModeTotal    = "total"
	ModeCapacity = "capacity"
)

// PlanInput is the multi-index calculator request (Web UI primary model).
type PlanInput struct {
	Mode string `json:"mode"`

	RF                   int     `json:"rf"`
	SF                   int     `json:"sf"`
	Headroom             float64 `json:"headroom"`
	RetentionDays        int     `json:"retention_days"`
	HotWarmDays          int     `json:"hot_warm_days"`
	HotPath              string  `json:"hot_path"`
	ColdPath             string  `json:"cold_path"`
	FrozenPath           string  `json:"frozen_path"`
	SummariesPath        string  `json:"summaries_path"`
	SummaryPct           float64 `json:"summary_pct"`
	SummaryRetentionDays int     `json:"summary_retention_days"`

	// Compression: 0 = derive from RF/SF (or 0.5 standalone). >0 = measured C (docs/en/02 §2).
	Compression float64 `json:"compression"`

	// Topology / apps (doc 01–02)
	IndexerCluster    bool `json:"indexer_cluster"`
	SearchHeadCluster bool `json:"search_head_cluster"`
	SmartStore        bool `json:"smartstore"`
	HasES             bool `json:"has_es"`
	HasITSI           bool `json:"has_itsi"`
	ESSmartStore      bool `json:"es_smartstore"` // legacy alias → HasES + SmartStore
	// ConcurrentUsers maps to "Total Users" rows in Summary of performance recommendations.
	ConcurrentUsers int `json:"concurrent_users"`
	// ConcurrentSearches is peak concurrent scheduled+ad-hoc search jobs (Reference hardware:
	// each active search consumes up to 1 CPU core). 0 = unset (engine may infer from users).
	ConcurrentSearches int `json:"concurrent_searches"`
	// SavedSearches is total saved/scheduled searches (Dimensions of a Splunk Enterprise deployment).
	SavedSearches int `json:"saved_searches"`
	NIdx          int `json:"n_idx"` // 0 = auto from table; >0 force (floors warn)
	NSh           int `json:"n_sh"`

	// Archive frozen buckets instead of delete (docs/en/05 — coldToFrozenDir optional).
	ArchiveFrozen bool `json:"archive_frozen"`
	// EnableDMA: nil = default (true when HasES). Emits tstatsHomePath + DMA sizing on summaries.
	EnableDMA *bool  `json:"enable_dma,omitempty"`
	DMAPct    float64 `json:"dma_pct"` // fraction of searchable on-disk for DMA estimate; default 0.10

	RemotePath string `json:"remote_path"` // SmartStore object-store path hint / volume path

	// Optional volume helpers (combinable — no exclusive mode required)
	TotalDailyGB         float64 `json:"total_daily_gb"`
	AvailableHotGB       float64 `json:"available_hot_gb"`
	AvailableColdGB      float64 `json:"available_cold_gb"`
	AvailableSummariesGB float64 `json:"available_summaries_gb"`

	Sources []SourceRow `json:"sources"`
}

// IndexResult is per-index sizing output.
type IndexResult struct {
	Key                    string  `json:"key"`
	Label                  string  `json:"label"`
	IndexName              string  `json:"index_name"`
	EventBytes             float64 `json:"event_bytes"`
	DailyRawGB             float64 `json:"daily_raw_gb"`
	DailyOnDiskGB          float64 `json:"daily_on_disk_gb"`
	SearchableTB           float64 `json:"searchable_tb"`
	MaxTotalDataSizeMB     int64   `json:"max_total_data_size_mb"`
	HomePathMaxDataSizeMB  int64   `json:"home_path_max_data_size_mb"`
	FrozenTimePeriodInSecs int64   `json:"frozen_time_period_in_secs"`
	MaxDataSize            string  `json:"max_data_size"`
	SummaryIndexName       string  `json:"summary_index_name,omitempty"`
	SummaryDailyRawGB      float64 `json:"summary_daily_raw_gb,omitempty"`
	SummaryOnDiskGB        float64 `json:"summary_on_disk_gb,omitempty"`
	SummaryMaxTotalMB      int64   `json:"summary_max_total_data_size_mb,omitempty"`
	SummaryHomeMaxMB       int64   `json:"summary_home_path_max_data_size_mb,omitempty"`
	SummaryFrozenSecs      int64   `json:"summary_frozen_time_period_in_secs,omitempty"`
}

// LayerSpec is recommended hardware for one architecture layer (doc 01 §3).
type LayerSpec struct {
	Role         string  `json:"role"`
	Count        int     `json:"count"`
	Tier         string  `json:"tier"` // minimum | mid-range | high-performance | es-minimum | management
	CPUCores     int     `json:"cpu_cores"` // physical cores (planning unit)
	VCPU         int     `json:"vcpu"`      // logical / vCPU with HT (typically 2× physical)
	RAMGB        int     `json:"ram_gb"`
	StorageType  string  `json:"storage_type"`
	DiskGBHint   float64 `json:"disk_gb_hint,omitempty"`
	Network      string  `json:"network"`
	IOPSHint     string  `json:"iops_hint,omitempty"`
	IOPSMin      int     `json:"iops_min,omitempty"` // planning floor for install / data volume when known
	RAIDHint     string  `json:"raid_hint,omitempty"`
	Notes        string  `json:"notes"`
	// CPU guidance (Reference hardware + ES/ITSI): physical vs logical, virt, Splunk parallelization.
	CPUPhysicalCores      int    `json:"cpu_physical_cores,omitempty"`
	CPULogicalVCPU        int    `json:"cpu_logical_vcpu,omitempty"`
	CPUBasis              string `json:"cpu_basis,omitempty"`               // always "physical_cores"
	CPULogicalRule        string `json:"cpu_logical_rule,omitempty"`        // HT → 2× physical as vCPU
	VirtCPURule           string `json:"virt_cpu_rule,omitempty"`           // reserve; no oversubscribe
	SplunkParallelization string `json:"splunk_parallelization,omitempty"` // pipeline sets / index parallelization when spare CPU
}

// TopologySuggestion is an optional topology change the UI may ask the user to accept.
type TopologySuggestion struct {
	ID     string          `json:"id"`
	Title  string          `json:"title"`
	Reason string          `json:"reason"`
	Enable map[string]bool `json:"enable"` // form checkbox names → true
}

// Design is the recommended architecture + settings narrative.
type Design struct {
	NSH                  int         `json:"n_sh"`
	NSHES                int         `json:"n_sh_es,omitempty"`
	NSHITSI              int         `json:"n_sh_itsi,omitempty"`
	NIDX                 int         `json:"n_idx"`
	AutoNSH              int         `json:"auto_n_sh,omitempty"`  // recommended before n_sh override
	AutoNIDX             int         `json:"auto_n_idx,omitempty"` // recommended before n_idx override
	BaseNSH              int         `json:"base_n_sh,omitempty"`  // from D×U table before cluster/app floors
	BaseNIDX             int         `json:"base_n_idx,omitempty"` // from D×U table before floors
	ConcurrentUsers      int         `json:"concurrent_users,omitempty"`
	ConcurrentSearches   int         `json:"concurrent_searches,omitempty"`
	SavedSearches        int         `json:"saved_searches,omitempty"`
	SHCoresPerNode       int         `json:"sh_cores_per_node,omitempty"` // reference SH physical cores used for search floor
	DailyGBForCounts     float64     `json:"daily_gb_for_counts,omitempty"`
	NodePlanText         string      `json:"node_plan_text,omitempty"` // how N_SH / N_IDX were derived
	CombinedInstance     bool        `json:"combined_instance"`
	IndexerCluster       bool        `json:"indexer_cluster"`
	SearchHeadCluster    bool        `json:"search_head_cluster"`
	ClusterManager       bool        `json:"cluster_manager"`
	SHCDeployer          bool        `json:"shc_deployer"`
	SmartStore           bool        `json:"smartstore"`
	HasES                bool        `json:"has_es"`
	HasITSI              bool        `json:"has_itsi"`
	CompressionFactor    float64     `json:"compression_factor"`
	CacheDays            int         `json:"smartstore_cache_days,omitempty"`
	LocalCacheTotalGB    float64     `json:"local_cache_total_gb,omitempty"`
	LocalCachePerIDXGB   float64     `json:"local_cache_per_idx_gb,omitempty"`
	RemoteStoreGB        float64     `json:"remote_store_gb,omitempty"`
	HotNeedGB            float64     `json:"hot_need_gb"`
	ColdNeedGB           float64     `json:"cold_need_gb"`
	SummariesNeedGB      float64     `json:"summaries_need_gb"`
	HotAvailableGB       float64     `json:"hot_available_gb,omitempty"`
	ColdAvailableGB      float64     `json:"cold_available_gb,omitempty"`
	SummariesAvailableGB float64     `json:"summaries_available_gb,omitempty"`
	HotFits              *bool       `json:"hot_fits,omitempty"`
	ColdFits             *bool       `json:"cold_fits,omitempty"`
	SummariesFit         *bool       `json:"summaries_fit,omitempty"`
	MaxDailyGBFromDisk   float64     `json:"max_daily_gb_from_disk,omitempty"`
	MaxRetentionDays     int         `json:"max_retention_days_from_disk,omitempty"`
	PerPeerMB            bool        `json:"per_peer_mb,omitempty"` // conf/index MB divided by N_IDX
	Warnings             []string    `json:"warnings,omitempty"`
	Suggestions          []TopologySuggestion `json:"suggestions,omitempty"`
	Resources            []LayerSpec `json:"resources,omitempty"`
	ResourcesText        string      `json:"resources_text,omitempty"`
	StructureText        string      `json:"structure_text"`
	SettingsText         string      `json:"settings_text"`
}

// PlanResult is the multi-index response.
type PlanResult struct {
	Mode                 string        `json:"mode"`
	CompressionFactor    float64       `json:"compression_factor"`
	TotalDailyRawGB      float64       `json:"total_daily_raw_gb"`
	TotalDailyOnDiskGB   float64       `json:"total_daily_on_disk_gb"`
	TotalSearchableTB    float64       `json:"total_searchable_tb"`
	TotalSummaryRawGB    float64       `json:"total_summary_raw_gb"`
	TotalSummaryOnDiskGB float64       `json:"total_summary_on_disk_gb"`
	HotVolumeMB          int64         `json:"hot_volume_budget_mb"`          // per peer when design.per_peer_mb
	ColdVolumeMB         int64         `json:"cold_volume_budget_mb"`         // per peer when design.per_peer_mb
	SummariesVolumeMB    int64         `json:"summaries_volume_budget_mb"`    // per peer when design.per_peer_mb
	HotVolumeClusterMB   int64         `json:"hot_volume_cluster_mb,omitempty"`
	ColdVolumeClusterMB  int64         `json:"cold_volume_cluster_mb,omitempty"`
	SummariesClusterMB   int64         `json:"summaries_volume_cluster_mb,omitempty"`
	IndexerPeers         int           `json:"indexer_peers,omitempty"`
	Indexes              []IndexResult `json:"indexes"` // MB fields are per peer when design.per_peer_mb
	IndexesConf          string        `json:"indexes_conf"`
	Design               *Design       `json:"design,omitempty"`
	Warnings             []string      `json:"warnings"`
}

// Legacy single-index Input kept for CLI compatibility.
type Input struct {
	DailyGB       float64 `json:"daily_gb"`
	EPS           float64 `json:"eps"`
	EventBytes    float64 `json:"event_bytes"`
	RetentionDays int     `json:"retention_days"`
	HotWarmDays   int     `json:"hot_warm_days"`
	RF            int     `json:"rf"`
	SF            int     `json:"sf"`
	Headroom      float64 `json:"headroom"`
	IndexName     string  `json:"index_name"`
	HotPath       string  `json:"hot_path"`
	ColdPath      string  `json:"cold_path"`
	FrozenPath    string  `json:"frozen_path"`
	SummariesPath string  `json:"summaries_path"`
	ESSmartStore  bool    `json:"es_smartstore"`
}

// Result is the legacy single-index response.
type Result struct {
	DailyRawGB             float64  `json:"daily_raw_gb"`
	CompressionFactor      float64  `json:"compression_factor"`
	DailyOnDiskGB          float64  `json:"daily_on_disk_gb"`
	DailyOnDiskMB          float64  `json:"daily_on_disk_mb"`
	SearchableTB           float64  `json:"searchable_tb"`
	MaxTotalDataSizeMB     int64    `json:"max_total_data_size_mb"`
	HomePathMaxDataSizeMB  int64    `json:"home_path_max_data_size_mb"`
	FrozenTimePeriodInSecs int64    `json:"frozen_time_period_in_secs"`
	MaxDataSize            string   `json:"max_data_size"`
	IndexesConf            string   `json:"indexes_conf"`
	Warnings               []string `json:"warnings"`
}

func (in *Input) ApplyDefaults() {
	if in.RF <= 0 {
		in.RF = 1
	}
	if in.SF <= 0 {
		in.SF = 1
	}
	if in.Headroom <= 0 {
		in.Headroom = 1.2
	}
	if in.RetentionDays <= 0 {
		in.RetentionDays = 90
	}
	if in.HotWarmDays <= 0 {
		in.HotWarmDays = 30
	}
	if strings.TrimSpace(in.IndexName) == "" {
		in.IndexName = "windows"
	}
	if strings.TrimSpace(in.HotPath) == "" {
		in.HotPath = "/hot"
	}
	if strings.TrimSpace(in.ColdPath) == "" {
		in.ColdPath = "/cold"
	}
	if strings.TrimSpace(in.FrozenPath) == "" {
		in.FrozenPath = "/frozen"
	}
	if strings.TrimSpace(in.SummariesPath) == "" {
		in.SummariesPath = "/summaries"
	}
}

func (in *Input) Validate() error {
	in.ApplyDefaults()
	if in.DailyGB <= 0 && (in.EPS <= 0 || in.EventBytes <= 0) {
		return fmt.Errorf("provide daily_gb > 0, or both eps > 0 and event_bytes > 0")
	}
	if in.RetentionDays <= 0 {
		return fmt.Errorf("retention_days must be > 0")
	}
	if in.HotWarmDays <= 0 {
		return fmt.Errorf("hot_warm_days must be > 0")
	}
	if in.RF < 1 {
		return fmt.Errorf("rf must be >= 1")
	}
	if in.SF < 1 || in.SF > in.RF {
		return fmt.Errorf("sf must be between 1 and rf")
	}
	if in.Headroom < 1 {
		return fmt.Errorf("headroom must be >= 1")
	}
	return nil
}

func (p *PlanInput) ApplyDefaults() {
	// Mode is optional/legacy; left empty until InferResultMode (or caller) sets it.
	if p.ESSmartStore {
		p.HasES = true
		p.SmartStore = true
	}
	// Cluster off always forces standalone RF/SF. (Legacy Input→ToPlan sets IndexerCluster from RF/SF.)
	if !p.IndexerCluster {
		p.RF = 1
		p.SF = 1
	} else {
		if p.RF <= 0 {
			p.RF = 3
		}
		if p.SF <= 0 {
			p.SF = 2
		}
	}
	if p.Headroom <= 0 {
		p.Headroom = 1.2
	}
	if p.RetentionDays <= 0 {
		p.RetentionDays = 90
	}
	if p.HotWarmDays <= 0 {
		p.HotWarmDays = 30
	}
	if p.SummaryPct <= 0 {
		p.SummaryPct = 0.10
	}
	if p.SummaryRetentionDays <= 0 {
		p.SummaryRetentionDays = p.RetentionDays
	}
	if p.ConcurrentUsers <= 0 {
		p.ConcurrentUsers = 8
	}
	// Peak concurrent search jobs: if unset, assume ~1 active search per concurrent user
	// (Reference hardware: count scheduled and ad-hoc searches; Dimensions: concurrent search volume).
	if p.ConcurrentSearches <= 0 {
		p.ConcurrentSearches = p.ConcurrentUsers
	}
	if p.SavedSearches < 0 {
		p.SavedSearches = 0
	}
	if p.DMAPct <= 0 {
		p.DMAPct = 0.10
	}
	if strings.TrimSpace(p.HotPath) == "" {
		p.HotPath = "/hot"
	}
	if strings.TrimSpace(p.ColdPath) == "" {
		p.ColdPath = "/cold"
	}
	if strings.TrimSpace(p.FrozenPath) == "" {
		p.FrozenPath = "/frozen"
	}
	if strings.TrimSpace(p.SummariesPath) == "" {
		p.SummariesPath = "/summaries"
	}
}

// WantDMA reports whether DMA/tstatsHomePath should be planned.
func (p PlanInput) WantDMA() bool {
	if p.EnableDMA != nil {
		return *p.EnableDMA
	}
	return p.HasES
}

func (p PlanInput) HasSourceVolume() bool {
	for _, s := range p.Sources {
		if s.DailyGB > 0 || (s.EPS > 0 && s.EventBytes > 0) {
			return true
		}
	}
	return false
}

func (p PlanInput) HasDiskBudget() bool {
	return p.AvailableHotGB > 0 || p.AvailableColdGB > 0
}

// InferResultMode labels the plan from filled fields (for API/CLI display only).
func (p PlanInput) InferResultMode() string {
	hasSrc := p.HasSourceVolume()
	hasTotal := p.TotalDailyGB > 0
	hasDisk := p.HasDiskBudget()
	switch {
	case !hasSrc && !hasTotal && hasDisk:
		return ModeCapacity
	case hasTotal:
		return ModeTotal
	default:
		return ModeSources
	}
}

func (p *PlanInput) Validate() error {
	p.ApplyDefaults()
	// Legacy mode strings are accepted but ignored for validation; unknown values are ignored too.
	if p.RF < 1 {
		return fmt.Errorf("rf must be >= 1")
	}
	if p.SF < 1 || p.SF > p.RF {
		return fmt.Errorf("sf must be between 1 and rf")
	}
	if p.Headroom < 1 {
		return fmt.Errorf("headroom must be >= 1")
	}

	hasSourceVol := false
	for i, s := range p.Sources {
		if strings.TrimSpace(s.IndexName) == "" && (s.DailyGB > 0 || s.EPS > 0) {
			return fmt.Errorf("sources[%d]: index_name required", i)
		}
		if s.DailyGB > 0 || (s.EPS > 0 && s.EventBytes > 0) {
			hasSourceVol = true
			if strings.TrimSpace(s.IndexName) == "" {
				return fmt.Errorf("sources[%d]: index_name required", i)
			}
		}
	}

	hasTotal := p.TotalDailyGB > 0
	hasDisk := p.HasDiskBudget()
	if !hasSourceVol && !hasTotal && !hasDisk {
		return fmt.Errorf("set source volumes (daily_gb or eps+event_bytes), total_daily_gb, and/or available_hot_gb/available_cold_gb")
	}
	if !hasSourceVol && !hasTotal && p.AvailableSummariesGB > 0 && !hasDisk {
		return fmt.Errorf("set available_hot_gb and/or available_cold_gb (summaries alone cannot reverse searchable ingest)")
	}
	if p.Compression < 0 {
		return fmt.Errorf("compression must be >= 0")
	}
	if p.Compression > 0 && p.Compression > 2 {
		return fmt.Errorf("compression looks unrealistic (>2); measured C is usually ~0.15–0.7")
	}
	return nil
}

// ToPlan wraps a legacy Input as a one-row PlanInput.
func (in Input) ToPlan() PlanInput {
	in.ApplyDefaults()
	return PlanInput{
		Mode:          ModeSources,
		RF:            in.RF,
		SF:            in.SF,
		Headroom:      in.Headroom,
		RetentionDays: in.RetentionDays,
		HotWarmDays:   in.HotWarmDays,
		HotPath:       in.HotPath,
		ColdPath:      in.ColdPath,
		FrozenPath:    in.FrozenPath,
		SummariesPath: in.SummariesPath,
		ESSmartStore:  in.ESSmartStore,
		HasES:         in.ESSmartStore,
		SmartStore:    in.ESSmartStore,
		IndexerCluster: in.RF > 1 || in.SF > 1,
		Sources: []SourceRow{{
			Key:           "custom",
			Label:         in.IndexName,
			IndexName:     in.IndexName,
			EventBytes:    in.EventBytes,
			EPS:           in.EPS,
			DailyGB:       in.DailyGB,
			RetentionDays: in.RetentionDays,
			HotWarmDays:   in.HotWarmDays,
		}},
	}
}
