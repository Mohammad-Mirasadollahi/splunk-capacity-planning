/* Calculation help tips — formulas, examples, official Splunk docs */
window.SCP_TIPS = {
  en: {
    mode_sources: {
      title: "Mode: sources + volume each",
      formula: "Daily_Raw_GB(source) = daily_gb  OR  EPS × 86400 × event_bytes / 1024³",
      body: "Enable each log family you collect and enter its daily license volume (preferred) or EPS with average event size. Totals sum across enabled rows. daily_gb wins if both are set.",
      example: "Windows 80 GB/day + Linux 20 GB/day → Total raw = 100 GB/day.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    mode_total: {
      title: "Mode: if this much log arrives",
      formula: "Use total_daily_gb as D; optional source rows are scaled so Σ sources = total_daily_gb",
      body: "Enter the expected overall daily ingest. If you also fill sources, the calculator scales them to match the total so index split stays proportional.",
      example: "total_daily_gb=500 with windows:linux = 4:1 → ~400 + 100 GB/day after scale.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    mode_capacity: {
      title: "Mode: available disk (buckets)",
      formula: "MaxDaily ≈ Available_(hot+cold) / (Comp × RetentionDays × Headroom)",
      body: "Provide hot and/or cold disk budgets (summaries optional). Reverse max daily uses Available_(hot+cold) / (Comp × Retention × Headroom). Checks whether calculated need fits.",
      example: "Available hot 10 TB, cold 20 TB, Comp=0.5, R=90, headroom=1.2 → rough max daily from total searchable disk.",
      links: [
        { label: "Configure index storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage" },
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    indexer_cluster: {
      title: "Indexer cluster",
      formula: "If off → RF=1, SF=1 (standalone). If on → default RF=3, SF=2 unless you set them.",
      body: "An indexer cluster replicates rawdata (RF) and searchable copies with TSIDX (SF). Needs a cluster manager and typically ≥ RF peers. Storage multiplier becomes 0.15×RF + 0.35×SF instead of ~0.5.",
      example: "RF=3 SF=2 → Comp = 0.15×3 + 0.35×2 = 1.15 (115% of raw/day on disk).",
      links: [
        { label: "Buckets and indexer clusters", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters" },
      ],
    },
    rf: {
      title: "Replication Factor (RF)",
      formula: "Rawdata footprint scales ≈ 0.15 × RF per day of ingest (official rawdata share)",
      body: "RF is how many copies of rawdata the cluster keeps. Every peer copy carries rawdata. SF cannot exceed RF. Non-cluster planning uses RF=1.",
      example: "D=100 GB/day, RF=3 → rawdata-like share ≈ 100×0.15×3 = 45 GB/day (part of cluster formula).",
      links: [
        { label: "Buckets and indexer clusters", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters" },
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    sf: {
      title: "Search Factor (SF)",
      formula: "TSIDX footprint scales ≈ 0.35 × SF ; must have 1 ≤ SF ≤ RF",
      body: "SF is how many searchable copies (with TSIDX) the cluster maintains. Searchable copies cost more disk than raw-only copies.",
      example: "SF=2 → TSIDX-like share ≈ D×0.35×2. Combined with RF in Comp = 0.15×RF + 0.35×SF.",
      links: [
        { label: "Buckets and indexer clusters", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters" },
      ],
    },
    shc: {
      title: "Search Head Cluster (SHC)",
      formula: "Recommend odd peer count (≥3) + 1 deployer; latency ≤ 200 ms between members",
      body: "SHC provides HA and scheduled-search distribution for the search tier. Increases search load on indexers — you may need more IDX CPU/peers. ES and ITSI must not share the same SHC.",
      example: "Design may raise N_SH to at least 3 when SHC is enabled.",
      links: [
        { label: "Reference hardware (latency)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "ES performance reference", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security" },
      ],
    },
    smartstore: {
      title: "SmartStore",
      formula: "Local_Cache ≈ 0.5 × D × CacheDays ; Remote_Store ≈ D × R × Comp ; CacheDays = 30 (90 if ES)",
      body: "Warm data lives mainly in remote object storage; indexers keep a local cache/working set on NVMe/SSD. Prefer ~10 Gbps to object store. Non-SmartStore indexes still need local disk. Conf emits [volume:remote] + remotePath.",
      example: "D=200 GB/day, ES on → cache days 90 → Local ≈ 0.5×200×90 = 9,000 GB total cache.",
      links: [
        { label: "SmartStore system requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements" },
        { label: "About SmartStore", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/AboutSmartStore" },
      ],
    },
    has_es: {
      title: "Enterprise Security (ES)",
      formula: "ES SH/IDX minima: 16 physical cores / 32 GB RAM / 32 vCPU; SmartStore cache 90 days if used",
      body: "Enables ES-aware design: dedicated SH/SHC, higher indexer floors from ES scaling tables, DMA on fast summaries volume, and 90-day SmartStore cache guidance. Do not colocate ES with ITSI on the same SH.",
      example: "800 GB/day + ES → design may pick ~10 indexers (ES mid-range row) and high-performance IDX specs.",
      links: [
        { label: "ES minimum specifications", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment" },
        { label: "ES scaling considerations", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments" },
      ],
    },
    has_itsi: {
      title: "IT Service Intelligence (ITSI)",
      formula: "Example floor N_IDX ≈ ceil(D/100); KV store needs ≥ 30 GB free on $SPLUNK_HOME",
      body: "ITSI needs its own SH/SHC (not shared with ES). KPI/entity load drives SH count; summary indexes (e.g. itsi_summary) should land on the indexer tier.",
      example: "D=250 GB/day → ceil(250/100)=3 indexers from the ITSI data rule (then take max with platform/ES).",
      links: [
        { label: "Plan your ITSI deployment", url: "https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment" },
      ],
    },
    concurrent_users: {
      title: "Concurrent users",
      formula: "Lookup N_SH / N_IDX from Performance Recommendations table (users × daily GB)",
      body: "Approximate concurrent search users to pick a row in Splunk’s official SH×IDX count table. This is a guideline — heavy scheduled search or premium apps may need more.",
      example: "12 users, 800 GB/day → ~2 SH + 4 IDX from the summary table (before ES floors).",
      links: [
        { label: "Summary of performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    n_idx: {
      title: "n_idx override",
      formula: "If >0, use your indexer count; RF/ES/ITSI floors still warn (RF hard-raises peers)",
      body: "Leave 0 for automatic recommendation. Overrides below recommended floors keep your value but emit a warning. Indexer cluster still enforces peers ≥ RF.",
      example: "Auto says 4; you plan 6 peers for HA headroom → set n_idx=6.",
      links: [
        { label: "Summary of performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    n_sh: {
      title: "n_sh override",
      formula: "If >0, force search-head count; SHC may still enforce ≥3",
      body: "Leave 0 for automatic recommendation from the users×volume table (and premium-app rules).",
      example: "Table suggests 2 SH; with SHC enabled design raises to ≥3.",
      links: [
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    retention_days: {
      title: "retention_days",
      formula: "frozenTimePeriodInSecs = retention_days × 86400\nmaxTotalDataSizeMB ≈ Daily_OnDisk_MB × retention_days × headroom",
      body: "How long data stays searchable (hot+warm+cold) before freeze/delete. Freeze triggers on age OR size — whichever comes first.",
      example: "60 days → frozenTimePeriodInSecs = 5,184,000.",
      links: [
        { label: "Set a retirement and archiving policy", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    hot_warm_days: {
      title: "hot_warm_days",
      formula: "homePath.maxDataSizeMB ≈ Daily_OnDisk_MB × hot_warm_days × headroom",
      body: "Days kept on the hot/warm (SSD) volume before aging to cold. Should be ≤ retention_days. Drives homePath.maxDataSizeMB budget.",
      example: "Daily on-disk 50 GB, hot_warm 30d, headroom 1.0 → homePath.maxDataSizeMB ≈ 50×1024×30 = 1,536,000.",
      links: [
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    headroom: {
      title: "headroom",
      formula: "Size caps × headroom (typically 1.15–1.25)",
      body: "Safety multiplier on calculated MB caps so volumes are not planned at 100% full. Indexing can stop if free space on an index volume falls below ~5 GB.",
      example: "Need 1,000,000 MB at headroom 1.2 → plan 1,200,000 MB.",
      links: [
        { label: "Reference hardware (5 GB note)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    summary_pct: {
      title: "summary_pct",
      formula: "SummaryDailyRaw = sourceDailyRaw × summary_pct  (unless summary_daily_gb set)",
      body: "When a source enables summary index sizing, estimate summary ingest as a fraction of that source’s daily raw (default 10%). Tune from measured summary volume.",
      example: "Source 100 GB/day, summary_pct=0.10 → 10 GB/day summary raw before compression.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    summary_retention_days: {
      title: "summary_retention_days",
      formula: "Same size/age caps as normal indexes, using summary daily volume × this retention",
      body: "Retention for generated *_summary indexes (and volume:summaries budget contribution).",
      example: "Summary 10 GB/day raw, Comp 0.5, 90 days → searchable ~450 GB before headroom.",
      links: [
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    hot_path: {
      title: "hot_path",
      formula: "[volume:hotwarm] path = hot_path ; homePath = volume:hotwarm/<index>/db",
      body: "Filesystem path for the hot/warm volume. Must be local SSD — never place hot/warm on NFS/network volumes.",
      example: "path = /data/hot → homePath = volume:hotwarm/windows/db",
      links: [
        { label: "Configure index storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage" },
        { label: "Reference hardware (storage types)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    cold_path: {
      title: "cold_path",
      formula: "[volume:cold] path = cold_path ; coldPath = volume:cold/<index>/colddb",
      body: "Cold bucket volume. HDD/SAN/NAS/NFS allowed but search is slower. Keep DMA/summaries off cold HDD.",
      example: "path = /data/cold",
      links: [
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "System requirements (NFS)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements" },
      ],
    },
    frozen_path: {
      title: "frozen_path",
      formula: "Used only when archive_frozen=true → coldToFrozenDir = frozen_path/<index>/frozendb",
      body: "Default Splunk freeze deletes data. Enable Archive frozen to emit coldToFrozenDir and size an archive layer.",
      example: "archive_frozen + /archive/frozen → coldToFrozenDir = /archive/frozen/windows/frozendb",
      links: [
        { label: "Archive indexed data", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata" },
        { label: "Restore archived data", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Restorearchiveddata" },
      ],
    },
    archive_frozen: {
      title: "Archive frozen",
      formula: "archive_frozen=false → omit coldToFrozenDir (delete); true → set coldToFrozenDir",
      body: "Matches docs/en/05: archive is optional. Leaving this off keeps Splunk’s default delete-on-freeze behavior.",
      example: "Compliance archive required → enable Archive frozen and set frozen_path.",
      links: [
        { label: "Set a retirement and archiving policy", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy" },
      ],
    },
    enable_dma: {
      title: "DMA / tstats",
      formula: "When on: tstatsHomePath + summaries volume += Daily_OnDisk × retention × headroom × dma_pct",
      body: "Defaults on with ES. Emits tstatsHomePath on primary indexes and reserves summaries capacity for DMA (estimate — measure in your environment).",
      example: "ES on → DMA estimate at dma_pct=0.10 added to volume:summaries.",
      links: [
        { label: "Accelerate data models", url: "https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Acceleratedatamodels" },
      ],
    },
    dma_pct: {
      title: "dma_pct",
      formula: "DMA_MB ≈ TotalDailyOnDisk_GB × 1024 × retention_days × headroom × dma_pct",
      body: "Planning fraction of searchable on-disk retained for data model acceleration. Replace with measured DMA size when available.",
      example: "On-disk 50 GB/day, 90d, headroom 1.0, dma_pct 0.10 → ~460,800 MB DMA budget (cluster-wide before ÷ peers).",
      links: [
        { label: "Accelerate data models", url: "https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Acceleratedatamodels" },
      ],
    },
    compression: {
      title: "Measured compression C",
      formula: "If compression>0 use it; else standalone 0.5 or cluster 0.15×RF+0.35×SF",
      body: "Optional measured Indexed_Size/Sample_Size from docs/en/02 §2. Overrides the default RF/SF model when set.",
      example: "Sample compresses to 40% → compression=0.4.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    remote_path: {
      title: "SmartStore remote_path",
      formula: "Remote_Store_GB ≈ D × R × Comp; conf [volume:remote] path=remote_path",
      body: "Object-store path for SmartStore. Each cluster needs a unique path. Local cache is sized separately (30d / 90d with ES).",
      example: "s3://my-bucket/splunk-cluster-a",
      links: [
        { label: "SmartStore system requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements" },
      ],
    },
    summary_daily_gb: {
      title: "summary_daily_gb",
      formula: "SummaryDailyRaw = summary_daily_gb OR daily_raw × summary_pct",
      body: "Optional explicit summary ingest for this source. Leave blank to use global summary_pct.",
      example: "Source 100 GB/day, summary_daily_gb=5 → 5 GB/day summary raw (not 10% of 100).",
      links: [
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    summaries_path: {
      title: "summaries_path",
      formula: "[volume:summaries] ; tstatsHomePath = volume:summaries/<index>/datamodel_summary  # if DMA",
      body: "Fast volume for DMA/tstats and optional summary indexes. Prefer SSD/NVMe and keep separate from cold. tstatsHomePath is emitted only when DMA/ES is enabled.",
      example: "tstatsHomePath = volume:summaries/windows/datamodel_summary",
      links: [
        { label: "Reference hardware (DMA storage)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    total_daily_gb: {
      title: "total_daily_gb",
      formula: "D = total_daily_gb (license/ingest GB per day)",
      body: "Primary planning input for “how much arrives”. Prefer measured license usage over guesses.",
      example: "D=100, R=30, Comp=0.5 → Storage ≈ 100×30×0.5 = 1,500 GB = 1.5 TB (official style example).",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    available_hot_gb: {
      title: "available_hot_gb",
      formula: "Compare to hot need = Σ homePath.maxDataSizeMB / 1024; conf may cap volume to this",
      body: "Your real SSD hot/warm capacity. Used for fit checks and maxVolumeDataSizeMB on volume:hotwarm when set.",
      example: "Need 8 TB, available 6 TB → warning SHORT; conf maxVolume uses 6 TB cap.",
      links: [
        { label: "Configure index storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage" },
      ],
    },
    available_cold_gb: {
      title: "available_cold_gb",
      formula: "Cold need ≈ Σ (maxTotal − homePath) MB",
      body: "Budget for cold buckets across indexes after hot/warm days.",
      example: "Used in capacity mode reverse sizing and fit badges.",
      links: [
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
      ],
    },
    available_summaries_gb: {
      title: "available_summaries_gb",
      formula: "Summaries volume budget for DMA + summary indexes",
      body: "SSD/NVMe space for tstatsHomePath / summary indexes. Should not share spindles with cold HDD.",
      example: "If available < need → warning and conf uses your cap.",
      links: [
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    event_bytes: {
      title: "event_bytes (average)",
      formula: "Daily_Raw_GB = EPS × 86400 × event_bytes / 1024³",
      body: "Average raw event size in bytes for this source. Defaults are editable planning estimates — measure with | eval len=_raw in your env.",
      example: "EPS=1000, event_bytes=500 → ≈ 1000×86400×500 / 1024³ ≈ 40.05 GB/day.",
      links: [
        { label: "Estimate storage (event method)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    daily_gb: {
      title: "daily_gb",
      formula: "Daily_Raw_GB = daily_gb   (wins over EPS path if > 0)",
      body: "Daily ingest for this index/source in GB/day (license volume). Preferred when you know GB/day from monitoring console / license.",
      example: "daily_gb=100 with RF=SF=1 → Daily_OnDisk ≈ 50 GB/day.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    eps: {
      title: "EPS (events per second)",
      formula: "Daily_Raw_GB = EPS × 86400 × event_bytes / 1024³",
      body: "Use with event_bytes when you do not yet know GB/day. Ignored when daily_gb > 0.",
      example: "See event_bytes example (~40 GB/day at 1000 EPS × 500 B).",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    enable_summary: {
      title: "summary index",
      formula: "SummaryDaily = summary_daily_gb OR daily_raw × summary_pct",
      body: "Sizes an additional <index>_summary stanza on volume:summaries and adds to summaries volume budget.",
      example: "100 GB/day source, 10% → 10 GB/day summary raw.",
      links: [
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    // Results metrics
    "Total daily raw GB/day": {
      title: "Total daily raw GB/day",
      formula: "Σ Daily_Raw_GB across indexes",
      body: "Sum of planned raw ingest before compression/RF-SF multiplier.",
      example: "80 + 20 = 100 GB/day.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    "Compression factor": {
      title: "Compression factor (Comp)",
      formula: "Non-cluster: 0.5\nCluster: 0.15×RF + 0.35×SF",
      body: "Official planning model: ~15% rawdata + ~35% TSIDX ≈ 50% standalone. Cluster multiplies rawdata by RF and TSIDX by SF.",
      example: "RF=3,SF=2 → Comp=1.15; 100 GB raw → 115 GB on-disk/day.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
        { label: "Buckets and indexer clusters", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters" },
      ],
    },
    "Total on-disk GB/day": {
      title: "Total on-disk GB/day",
      formula: "Daily_OnDisk = Daily_Raw × Comp",
      body: "Estimated indexed footprint per day after compression / RF-SF model.",
      example: "100 × 0.5 = 50 GB/day on disk.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    "Total searchable TB": {
      title: "Total searchable TB",
      formula: "Searchable_TB = Daily_OnDisk_GB × RetentionDays / 1024",
      body: "Approximate searchable storage over full retention (before per-volume split).",
      example: "50 GB/day × 30 / 1024 ≈ 1.465 TB.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    "Concurrent users": {
      title: "Concurrent users (U)",
      formula: "Row in Performance Recommendations × daily volume (D) → base N_SH / N_IDX",
      body: "Same as concurrent_users input. Drives search-head and indexer count before cluster/ES floors.",
      example: "U=12, D=800 GB/day → table baseline 2 SH + 4 IDX.",
      links: [
        { label: "Summary of performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    "Table baseline (SH+IDX)": {
      title: "Table baseline",
      formula: "RecommendCounts(D, U) before SHC / indexer-cluster / ES / ITSI floors",
      body: "Raw lookup from Splunk’s users×volume summary table. Final N_SH / N_IDX may be higher after clustering or premium-app floors.",
      example: "Baseline 1 SH; with SHC → final N_SH=3.",
    },
    "N_SH": {
      title: "N_SH (design)",
      formula: "From Performance Recommendations (+ SHC ≥3, premium-app rules)",
      body: "Recommended search-head count for your users×volume (guideline).",
      example: "See Summary of performance recommendations table.",
      links: [
        { label: "Performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    "N_IDX": {
      title: "N_IDX (design)",
      formula: "max(platform table, ES table, ceil(D/100) for ITSI, RF)",
      body: "Recommended indexer/peer count after applying platform and premium-app floors.",
      example: "ES mid-range ~1 TB/day row uses 10 indexers in ES scaling table.",
      links: [
        { label: "Performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
        { label: "ES scaling", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments" },
      ],
    },
    "hot need GB": {
      title: "hot need GB",
      formula: "Σ homePath.maxDataSizeMB / 1024",
      body: "SSD hot/warm budget across indexes (and related home caps).",
      example: "Used for volume:hotwarm maxVolumeDataSizeMB.",
      links: [
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    "cold need GB": {
      title: "cold need GB",
      formula: "Σ (maxTotalDataSizeMB − homePath.maxDataSizeMB) / 1024",
      body: "Cold-tier budget for data past hot/warm days up to full retention.",
      example: "Feeds volume:cold maxVolumeDataSizeMB.",
      links: [
        { label: "How indexes are stored", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
      ],
    },
    "summaries need GB": {
      title: "summaries need GB",
      formula: "Σ summary index maxTotal (+ DMA path guidance)",
      body: "Budget for volume:summaries (summary indexes / tstats).",
      example: "Keep on SSD/NVMe separate from cold.",
      links: [
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    "SmartStore cache GB": {
      title: "SmartStore local cache",
      formula: "0.5 × D × CacheDays (30, or 90 with ES)",
      body: "Total local cache to provision across indexers for SmartStore working set.",
      example: "See SmartStore system requirements ES 90-day exception.",
      links: [
        { label: "SmartStore system requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements" },
      ],
    },
    "Max daily from disk": {
      title: "Max daily from disk",
      formula: "≈ AvailableSearchable / (Comp × Retention × Headroom)",
      body: "Capacity-mode reverse estimate: largest daily ingest that fits your disk budgets at the chosen retention.",
      example: "Useful when disk is fixed and ingest is the unknown.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
  },
};
// Persian copies (same formulas/links; FA explanations)
window.SCP_TIPS.fa = JSON.parse(JSON.stringify(window.SCP_TIPS.en));
(function localizeFa() {
  const fa = window.SCP_TIPS.fa;
  const map = {
    mode_sources: ["حالت: منابع + حجم هر کدام", "برای هر منبع daily_gb (ترجیح) یا EPS×اندازه رویداد را بدهید. مجموع ردیف‌های فعال = حجم کل. اگر هر دو پر باشد daily_gb غالب است."],
    mode_total: ["حالت: اگر اینقدر لاگ برسد", "total_daily_gb حجم کل روزانه است. اگر منابع هم پر شوند، برای رسیدن به total اسکیل می‌شوند."],
    mode_capacity: ["حالت: دیسک موجود باکت‌ها", "بودجه hot/cold/summaries را بدهید؛ تناسب دیسک و سقف حجم روزانه/retention محاسبه می‌شود."],
    indexer_cluster: ["کلاستر ایندکسر", "روشن = RF/SF فعال و ضریب 0.15×RF+0.35×SF. خاموش = برنامه‌ریزی standalone با Comp≈0.5."],
    rf: ["Replication Factor", "تعداد کپی rawdata در کلاستر. SF نباید از RF بیشتر باشد."],
    sf: ["Search Factor", "تعداد کپی searchable دارای TSIDX. هزینه دیسک بیشتر از کپی فقط-raw است."],
    shc: ["Search Head Cluster", "HA برای لایه سرچ؛ بار جستجو روی ایندکسرها بیشتر می‌شود. تأخیر ≤200ms."],
    smartstore: ["SmartStore", "داده گرم عمدتاً در object store؛ کش محلی NVMe/SSD. با ES کش ۹۰ روزه."],
    has_es: ["Enterprise Security", "SH اختصاصی، کف سخت‌افزار ۱۶ هسته/۳۲GB، جدا از ITSI، کش SmartStore ۹۰ روز."],
    has_itsi: ["ITSI", "SH جدا از ES؛ KV≥۳۰GB آزاد؛ N_IDX نمونه ≈ ceil(D/100)."],
    concurrent_users: ["کاربران همزمان", "تعداد SH و IDX از جدول رسمی کاربران × حجم روزانه به‌دست می‌آید؛ کلاسترینگ و ES کف را بالاتر می‌برند."],
    n_idx: ["n_idx", "۰ = خودکار از کاربران×حجم (+کف کلاستر/ES)؛ کمتر از کف توصیه → هشدار؛ RF همچنان حداقل peer را سخت اعمال می‌کند."],
    n_sh: ["n_sh", "۰ = خودکار از کاربران×حجم؛ با SHC حداقل ۳ سخت اعمال می‌شود."],
    retention_days: ["retention_days", "عمر searchable تا freeze؛ frozenTimePeriodInSecs = روز×۸۶۴۰۰."],
    hot_warm_days: ["hot_warm_days", "روزهای روی SSD hot/warm؛ مبنای homePath.maxDataSizeMB."],
    headroom: ["headroom", "ضریب اطمینان روی سقف‌های MB (مثلاً ۱.۲)."],
    summary_pct: ["summary_pct", "سهم تقریبی summary از حجم خام منبع (پیش‌فرض ۱۰٪)."],
    summary_retention_days: ["summary_retention_days", "نگهداری ایندکس‌های summary."],
    hot_path: ["hot_path", "مسیر volume hot/warm — فقط دیسک محلی/SSD، نه NFS."],
    cold_path: ["cold_path", "مسیر cold؛ HDD/NFS مجاز ولی کندتر."],
    frozen_path: ["frozen_path", "مسیر آرشیو فقط اگر Archive frozen روشن باشد."],
    archive_frozen: ["Archive frozen", "روشن = coldToFrozenDir؛ خاموش = حذف پیش‌فرض Splunk."],
    enable_dma: ["DMA / tstats", "روشن = tstatsHomePath + بودجه summaries برای DMA."],
    dma_pct: ["dma_pct", "سهم تقریبی DMA از searchable on-disk."],
    compression: ["compression", "۰ = خودکار؛ >۰ = ضریب اندازه‌گیری‌شده C."],
    remote_path: ["remote_path", "مسیر object store برای SmartStore."],
    summary_daily_gb: ["summary_daily_gb", "حجم خام summary صریح؛ خالی = summary_pct."],
    summaries_path: ["summaries_path", "SSD برای DMA/tstats و summary — جدا از cold."],
    total_daily_gb: ["total_daily_gb", "حجم مجوز/ingest روزانه به گیگابایت."],
    available_hot_gb: ["available_hot_gb", "ظرفیت واقعی SSD hot؛ برای fit و سقف volume."],
    available_cold_gb: ["available_cold_gb", "بودجه دیسک cold."],
    available_summaries_gb: ["available_summaries_gb", "بودجه volume summaries."],
    event_bytes: ["event_bytes", "میانگین بایت رویداد؛ با EPS برای تخمین GB/day."],
    daily_gb: ["daily_gb", "حجم روزانه این منبع/ایندکس (ترجیحی)."],
    eps: ["EPS", "رویداد بر ثانیه؛ همراه event_bytes."],
    enable_summary: ["summary", "ساخت/سایز ایندکس summary جداگانه."],
  };
  Object.keys(map).forEach((k) => {
    if (!fa[k]) return;
    fa[k].title = map[k][0];
    fa[k].body = map[k][1];
  });
  // metric keys keep English title in UI; localize body lightly
  [
    ["Total daily raw GB/day", "مجموع حجم خام روزانه همه ایندکس‌ها."],
    ["Compression factor", "ضریب on-disk: ۰.۵ یا ۰.۱۵×RF+۰.۳۵×SF."],
    ["Total on-disk GB/day", "حجم روزانه روی دیسک بعد از Comp."],
    ["Total searchable TB", "تقریبی فضای searchable در کل retention."],
    ["N_SH", "تعداد سرچ‌هد پیشنهادی."],
    ["N_IDX", "تعداد ایندکسر پیشنهادی."],
    ["hot need GB", "نیاز SSD hot/warm."],
    ["cold need GB", "نیاز لایه cold."],
    ["summaries need GB", "نیاز volume summaries."],
    ["SmartStore cache GB", "کش محلی SmartStore."],
    ["Max daily from disk", "حداکثر ingest روزانه که در دیسک شما جا می‌شود."],
  ].forEach(([k, body]) => {
    if (fa[k]) fa[k].body = body;
  });
})();
