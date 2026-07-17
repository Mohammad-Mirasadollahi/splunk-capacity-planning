/* Calculation help tips — formulas, examples, official Splunk docs */
window.SCP_TIPS = {
  en: {
    mode_sources: {
      title: "Per-source volume (Daily XOR EPS)",
      formula: "Daily_Raw_GB(source) = daily_gb  OR  EPS × 86400 × event_bytes / 1024³",
      body: "Choose exactly one volume mode for the whole plan: Daily GB or EPS — not both as primary inputs. Under each number the UI shows the other unit (using event size). Sources without an EPS inherit the average EPS of sources that already have one. Combine freely with total_daily_gb and/or disk budgets on the Volumes tab.",
      example: "Daily 1 GB/day with event_bytes=500 → ≈ 23.8 EPS under the box. In EPS mode, a blank source takes the average EPS of filled sources.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    mode_total: {
      title: "Total daily ingest",
      formula: "Use total_daily_gb as D; optional source rows are scaled so Σ sources = total_daily_gb",
      body: "Optional overall daily ingest on the Volumes tab. If you also fill sources, they scale to match the total. If sources are empty, index main is synthesized.",
      example: "total_daily_gb=500 with windows:linux = 4:1 → ~400 + 100 GB/day after scale.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    mode_capacity: {
      title: "Available disk (buckets)",
      formula: "MaxDaily ≈ Available_(hot+cold) / (Comp × RetentionDays × Headroom)",
      body: "Optional hot/cold disk budgets (summaries optional). Used for fit checks whenever set; reverse max daily uses Available_(hot+cold) / (Comp × Retention × Headroom). Works with source rows or total_daily_gb.",
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
      formula: "Members = 1 (interim single-member) or ≥3 — never 2; + 1 deployer",
      body: "SHC provides HA and scheduled-search distribution. Splunk: ≥3 members for HA search; a single-member cluster is allowed as an interim step (no HA). Two members are not valid for captain majority. Always add a deployer on a non-member instance. ES and ITSI must not share the same SHC.",
      example: "n_sh=1 → single-member SHC + deployer; n_sh=2 → raised to 3 with a doc warning; n_sh=3+ → HA cluster + deployer.",
      links: [
        { label: "SHC system requirements (member count)", url: "https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/SHCsystemrequirements" },
        { label: "About search head clustering", url: "https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/AboutSHC" },
        { label: "Reference hardware (latency)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
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
      body: "Official “Total Users” row in Splunk’s SH×IDX summary table. Approximate people searching / using the SH tier at once.",
      example: "12 users, 800 GB/day → ~2 SH + 4 IDX from the summary table (before search-core / ES floors).",
      links: [
        { label: "Summary of performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    concurrent_searches: {
      title: "Peak concurrent searches",
      formula: "N_SH ≥ ceil(S / 16) — Reference hardware: 1 active search ≤ 1 CPU core",
      body: "Count scheduled and ad-hoc jobs that run at the same time (Dimensions: concurrent search volume). SCPcalc raises N_SH so total SH cores cover S.",
      example: "S=40 with 16-core reference SH → need at least 3 search heads even if the users×volume table said fewer.",
      links: [
        { label: "Reference hardware (Search Head)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "Dimensions of a deployment", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment" },
      ],
    },
    saved_searches: {
      title: "Saved / scheduled searches",
      formula: "Dimensions input — high counts need more SH capacity; ≥200 suggests reviewing SHC",
      body: "Total enabled saved/scheduled searches (use ES detections count when planning ES). Official Dimensions list this separately from concurrent users.",
      example: "150 saved searches with peak concurrency 20 → size cores for 20; plan schedule density for 150.",
      links: [
        { label: "Dimensions of a deployment", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment" },
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
      formula: "If >0, force search-head count; with SHC: 1 OK (interim), 2 → raised to 3, ≥3 OK",
      body: "Leave 0 for automatic recommendation. With Search Head Cluster on, Splunk does not support exactly 2 members for HA — SCPcalc rejects 2 and raises to 3 with a documented warning. n_sh=1 keeps a single-member interim SHC.",
      example: "Table suggests 2 SH; with SHC on, design raises to 3. Explicit n_sh=1 keeps single-member SHC + deployer.",
      links: [
        { label: "SHC system requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/SHCsystemrequirements" },
      ],
    },
    retention_days: {
      title: "Index volume (maxTotalDataSizeMB)",
      formula: "frozenTimePeriodInSecs = retention_days × 86400\nmaxTotalDataSizeMB ≈ Daily_OnDisk_MB × retention_days × headroom",
      body: "Total searchable size budget for one Splunk Index (hot+warm+cold) over retention_days. Freeze triggers on age OR size — whichever comes first. Archive on freeze (below) chooses archive vs delete after that.",
      example: "90 days → frozenTimePeriodInSecs = 7,776,000. Index volume ≈ daily on-disk × 90 × headroom.",
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
      formula: "Used only when Archive on freeze is on → coldToFrozenDir = frozen_path/<index>/frozendb",
      body: "Default Splunk freeze deletes data. Enable Archive on freeze to emit coldToFrozenDir and size an archive layer.",
      example: "Archive on freeze + /archive/frozen → coldToFrozenDir = /archive/frozen/windows/frozendb",
      links: [
        { label: "Archive indexed data", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata" },
        { label: "Restore archived data", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Restorearchiveddata" },
      ],
    },
    archive_frozen: {
      title: "Archive on freeze",
      formula: "archive_frozen=false → omit coldToFrozenDir (delete); true → set coldToFrozenDir",
      body: "Part of Index volume policy: off = delete at freeze; on = move frozen buckets to frozen_path.",
      example: "Compliance archive required → enable Archive on freeze and set frozen_path.",
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
      example: "Used in disk-budget reverse sizing and fit badges.",
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
      body: "Average size of each raw event as it arrives (pre-indexed / license-style bytes) — not the compressed on-disk size. Defaults are editable planning estimates — measure with | eval len=_raw in your env. Splunk then stores ~15% rawdata + ~35% TSIDX ≈ 50% of this pre-indexed volume on disk (standalone).",
      example: "EPS=1000, event_bytes=500 → ≈ 1000×86400×500 / 1024³ ≈ 40.05 GB/day raw ingest; on-disk ≈ 20 GB/day at Comp=0.5.",
      links: [
        { label: "Estimate storage (event method)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    daily_gb: {
      title: "daily_gb (raw / license)",
      formula: "Daily_Raw_GB = daily_gb;  EPS ≈ daily_gb × 1024³ / (86400 × event_bytes)",
      body: "Primary when Volume mode = Daily GB. The small line under the input shows estimated EPS from this daily value and average event size. Do not also treat EPS as a second primary input in the same plan — switch mode instead. On-disk ≈ daily_gb × Comp.",
      example: "daily_gb=1 with event_bytes=500 → ≈ 23.8 EPS under the box; on-disk ≈ 0.5 GB/day at Comp=0.5.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    eps: {
      title: "EPS (events per second, raw)",
      formula: "Daily_Raw_GB = EPS × 86400 × event_bytes / 1024³",
      body: "Primary when Volume mode = EPS. The small line under the input shows estimated Daily GB. Sources with no EPS use the average EPS of sources that already have one. Not a disk-occupancy rate.",
      example: "1000 EPS × 500 B → ≈ 40.05 GB/day raw; a blank sibling source inherits the average EPS of filled rows.",
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
      body: "Same as concurrent_users input. Drives search-head and indexer count before search-core / cluster / ES floors.",
      example: "U=12, D=800 GB/day → table baseline 2 SH + 4 IDX.",
      links: [
        { label: "Summary of performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    "Peak concurrent searches": {
      title: "Peak concurrent searches (S)",
      formula: "N_SH ≥ ceil(S / cores_per_SH); 1 active search ≤ 1 CPU core",
      body: "Official Reference hardware Search Head note. Raises N_SH when users×volume alone would leave too few cores.",
      example: "S=40 → at least 3×16-core search heads.",
      links: [
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    "Saved / scheduled searches": {
      title: "Saved / scheduled searches",
      formula: "Dimensions sizing dimension",
      body: "Total enabled saved searches. High counts need more capacity; SCPcalc warns and may suggest SHC.",
      example: "≥200 saved searches → review Search Head Cluster.",
      links: [
        { label: "Dimensions of a deployment", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment" },
      ],
    },
    "Table baseline (SH+IDX)": {
      title: "Table baseline",
      formula: "RecommendCounts(D, U) before SHC / search-core / indexer-cluster / ES / ITSI floors",
      body: "Raw lookup from Splunk’s users×volume summary table. Final N_SH / N_IDX may be higher after concurrent-search, clustering, or premium-app floors.",
      example: "Baseline 1 SH; with SHC → may stay 1 (single-member) or raise 2→3 for HA.",
    },
    "N_SH": {
      title: "N_SH (design)",
      formula: "max(users×volume, ceil(S/16)); with SHC: 1 OK (interim) or ≥3 — never 2",
      body: "Recommended search-head count from official users×volume table plus concurrent search volume. With SHC, Splunk allows a single-member interim cluster or ≥3 for HA — exactly 2 is invalid.",
      example: "See SHC system requirements + Summary of performance recommendations.",
      links: [
        { label: "Performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    "Auto N_SH": {
      title: "Auto N_SH",
      formula: "Same as final N_SH before optional n_sh override",
      body: "Automatic search-head count SCPcalc calculated for this plan. Leave Number of search heads = 0 to use this value.",
      example: "Auto may be 1 with SHC (single-member); n_sh=2 is rejected and raised to 3 with a doc warning.",
    },
    "Auto N_IDX": {
      title: "Auto N_IDX",
      formula: "Same as final N_IDX before optional n_idx override",
      body: "Automatic indexer/peer count from users×volume, clustering, ES/ITSI floors. Leave Number of indexers = 0 to use this value.",
      example: "Auto N_IDX=4; set n_idx=6 if you want extra HA headroom.",
    },
    "N_IDX": {
      title: "N_IDX (design)",
      formula: "max(platform table, ES table, ceil(D/100) for ITSI, RF)",
      body: "Recommended indexer/peer count after applying platform and premium-app floors. Each indexer still needs its own physical CPU cores (and typically 2× vCPU with HT).",
      example: "ES mid-range ~1 TB/day row uses 10 indexers in ES scaling table.",
      links: [
        { label: "Performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
        { label: "ES scaling", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments" },
      ],
    },
    "Cluster manager": {
      title: "Cluster manager",
      formula: "1 management node when indexer_cluster=true (not a data peer)",
      body: "Required for an indexer cluster. Coordinates RF/SF, bucket fix-up, and peer membership. Do not store customer searchable data here.",
      example: "3 indexer peers + 1 cluster manager.",
      links: [
        { label: "About indexer clusters", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Aboutclusters" },
      ],
    },
    "SHC deployer": {
      title: "SHC deployer",
      formula: "1 deployer when search_head_cluster=true (not a search member)",
      body: "Pushes apps/config to SHC members. Must not run on a cluster member. Members are 1 (interim) or ≥3 — never 2.",
      example: "3 SH members + 1 deployer.",
      links: [
        { label: "SHC system requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/SHCsystemrequirements" },
      ],
    },
    "CPU physical": {
      title: "CPU physical cores (sizing basis)",
      formula: "Assign PHYSICAL cores from Reference hardware / ES / ITSI tables",
      body: "Official planning unit is physical CPU cores. Logical/vCPU is listed separately (usually 2× with hyper-threading). Example ES production: 16 physical CPU cores AND 32 vCPU. Do not meet a 16-physical requirement with 16 HT threads on 8 physical cores.",
      example: "Indexer minimum: 12 physical → assign 24 vCPU to the VM when HT is on.",
      links: [
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "ES 8.5 minimum specs", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment" },
      ],
    },
    "CPU logical / vCPU": {
      title: "CPU logical / vCPU",
      formula: "With HT: vCPU = 2 × physical_cores",
      body: "Logical threads / hypervisor vCPUs. Splunk tables pair them with physical (12/24, 16/32, 24/48…). Cloud vCPU may be less than a full physical core — follow the vendor definition.",
      example: "ES: 16 physical → 32 vCPU on the guest.",
      links: [
        { label: "ES 8.5 minimum specs", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment" },
        { label: "Reference hardware (virtualization)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    Virtualization: {
      title: "Virtualization CPU rule",
      formula: "Reserve full CPU+RAM; do NOT oversubscribe the hypervisor",
      body: "Hypervisor CPU sharing across VMs is not how you scale Splunk. Reserve resources matching the physical/vCPU tables. VM indexers are ~10–15% slower on ingest than bare metal.",
      example: "16 physical / 32 vCPU reserved exclusively for one ES indexer guest.",
      links: [
        { label: "Reference hardware — virtualized", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "ES performance reference", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security" },
      ],
    },
    "Splunk parallelization": {
      title: "Splunk software parallelization",
      formula: "Enable pipeline sets / parallelization only when spare CPU > role minimum",
      body: "Not the same as hypervisor oversubscription. Heavy Forwarder and indexers may use multiple pipeline sets when resources allow. ITSI: if indexer CPUs exceed the minimum, parallelization settings may be enabled for specific use cases.",
      example: "Indexer already at 24 physical with headroom → consider index pipeline parallelization; do not oversubscribe the host.",
      links: [
        { label: "Reference hardware (pipeline sets)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
        { label: "ITSI 5.0 Plan", url: "https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment" },
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
      body: "Disk-budget reverse estimate: largest daily ingest that fits your disk budgets at the chosen retention.",
      example: "Useful when disk is fixed and ingest is the unknown.",
      links: [
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
  },
};

const SCP_TIP_IMPACTS = {
  en: {
    mode_sources: "Use Daily or EPS as the only primary mode. Raise the primary value → ingest/disk/nodes grow. The other unit under the box is an estimate only (not a second editable input).",
    mode_total: "Raise total_daily_gb → the whole plan scales to a bigger day (more disk, usually more indexers). Lower it → smaller storage and lighter node counts. The small EPS under the field is estimated from average event size.",
    mode_capacity: "Give more available disk → fit looks better and “max daily from disk” rises. Shrink the budget → you may see SHORT warnings and a lower max daily.",
    indexer_cluster: "Turn ON → RF/SF matter, Comp becomes 0.15×RF+0.35×SF (usually more disk), and you get a cluster manager + peers ≥ RF. Turn OFF → standalone Comp≈0.5 and no cluster manager requirement.",
    rf: "Raise RF → more rawdata copies → more disk and usually more indexer peers (at least RF). Lower RF → less disk, but weaker failure tolerance (SF cannot exceed RF).",
    sf: "Raise SF → more searchable TSIDX copies → disk grows faster than raising RF alone. Lower SF → less disk for search copies, but fewer searchable replicas after a failure.",
    shc: "Turn ON → add a deployer; members must be 1 (single-member interim, no HA) or ≥3 (HA). Exactly 2 is rejected and raised to 3 per Splunk SHC docs. Turn OFF → SH count follows users×volume×searches without SHC rules.",
    smartstore: "Turn ON → local disk becomes mainly cache (30 days, or 90 with ES) and remote object storage holds the bulk. Turn OFF → all searchable retention must fit on local hot/cold volumes.",
    has_es: "Turn ON → dedicated ES SH/SHC, higher IDX floors, DMA guidance, and SmartStore cache 90 days if SmartStore is on. Turn OFF → those ES floors and extras drop out of the design.",
    has_itsi: "Turn ON → ITSI gets its own SH and an indexer floor from daily volume (e.g. ceil(D/100)). Turn OFF → that ITSI-specific floor disappears.",
    concurrent_users: "More concurrent users → the official users×volume table often recommends more search heads and indexers. Fewer users → baseline N_SH / N_IDX can drop.",
    concurrent_searches: "Raise peak concurrent searches → N_SH rises so total SH cores cover them (about 1 search per core). Lower S → fewer SH may be enough if users×volume already covers it.",
    saved_searches: "A much higher saved-search count → more schedule pressure and a warning to consider SHC (≥200). Lowering it mainly reduces that warning, not a hard node formula.",
    n_idx: "Set above 0 → you force that many indexers (cluster still won’t go below RF). Leave 0 → SCPcalc picks the count; setting below a floor keeps your number but warns.",
    n_sh: "Set above 0 → force that many search heads. With SHC: 1 = interim single-member; 2 is invalid (raised to 3); ≥3 = HA. Leave 0 → auto from users, volume, and concurrent searches.",
    retention_days: "Longer retention → Index volume (searchable storage) grows almost linearly. Shorter → smaller Index; data freezes sooner (then archive or delete per Archive on freeze).",
    hot_warm_days: "More hot/warm days → larger SSD/homePath budget; less stays on cold for the same retention. Fewer hot/warm days → smaller fast disk, more data ages to cold sooner.",
    headroom: "Raise headroom (e.g. 1.0→1.2) → every size cap grows by that spare (plan more disk). Lower it → tighter packing and less safety before volumes fill.",
    summary_pct: "Raise summary_pct → more summary ingest and more summaries-volume disk. Lower it → smaller summary indexes for sources that use the percent rule.",
    summary_retention_days: "Longer summary retention → more disk on volume:summaries. Shorter → summary indexes shrink and age out sooner.",
    hot_path: "Change the path → indexes.conf points homePath/hotwarm at the new filesystem location. Wrong/slow path (e.g. NFS for hot) → ingest and search risk, not just a label change.",
    cold_path: "Change the path → cold buckets land on that volume. Slower media → colder searches get slower; path must exist and have enough space.",
    frozen_path: "Only matters when Archive on freeze is on: change it → coldToFrozenDir targets the new archive tree. Wrong path → freeze/archive fails when buckets retire.",
    archive_frozen: "Turn ON → at freeze, buckets move to frozen_path (archive). Turn OFF → at freeze, buckets are deleted (no coldToFrozenDir).",
    enable_dma: "Turn ON → tstatsHomePath and DMA disk are reserved on summaries. Turn OFF → that DMA budget and tstats paths drop from the plan (ES often expects DMA on).",
    dma_pct: "Raise dma_pct → larger DMA/summaries budget. Lower it → less reserved for acceleration (underestimate if real DMA is bigger).",
    compression: "Set a measured C (e.g. 0.4) → all on-disk math uses that instead of 0.5 / RF-SF. Leave 0 → official default model. Higher C → more disk; lower C → less disk assumed.",
    remote_path: "Change the path → SmartStore conf points at that bucket/prefix. Each cluster needs its own unique path or objects can collide.",
    summary_daily_gb: "Set an explicit GB/day → summary volume uses that number (not summary_pct). Clear it → falls back to percent of the source.",
    summaries_path: "Change the path → DMA/tstats and summary indexes use that fast volume. Putting it on cold HDD → acceleration and summary search suffer.",
    total_daily_gb: "Raise D → storage and usually indexer (and sometimes SH) counts grow. Lower D → smaller disk plan and lighter node floors from volume.",
    available_hot_gb: "Raise available hot → fewer SHORT warnings and higher max-daily-from-disk. Set below need → warning and conf caps volume to what you have.",
    available_cold_gb: "Raise available cold → cold fit improves and reverse max-daily can rise. Set too low → SHORT on cold and tighter ingest ceiling.",
    available_summaries_gb: "Raise summaries budget → DMA/summary fit improves. Set below need → warning and conf uses your smaller cap.",
    event_bytes: "Larger average raw event → same EPS becomes more Daily raw GB (then more on-disk after Comp). Smaller events → less daily volume from the same EPS.",
    daily_gb: "Raise this source’s raw daily GB → that index needs more disk after Comp; overall D rises so node counts may rise. Lower it → opposite. This is not “already compressed on disk”.",
    eps: "Raise raw EPS (when daily_gb mode is off) → estimated Daily raw GB rises with event_bytes; on-disk ≈ that × Comp. Not a disk-occupancy rate.",
    enable_summary: "Turn ON → an extra *_summary index and summaries disk are sized. Turn OFF → that summary stanza and its disk drop out.",
    "Total daily raw GB/day": "This is the sum of your sources/total. If it goes up in the plan, everything downstream (disk, often N_IDX) grows with it.",
    "Compression factor": "Higher Comp (e.g. after raising RF/SF) → more on-disk GB per day of raw. Lower Comp → less disk planned for the same raw ingest.",
    "Total on-disk GB/day": "If this rises, retention multiplies into more searchable TB and hotter volume budgets. It moves when raw D or Comp changes.",
    "Total searchable TB": "Longer retention or higher on-disk/day raises this; shorter retention or less daily on-disk lowers the searchable footprint.",
    "Concurrent users": "Same lever as the users input: more users → often more SH/IDX from the table; fewer users → lighter baseline.",
    "Peak concurrent searches": "Higher S in results means the design needed more SH cores; lower S relaxes the search-core floor on N_SH.",
    "Saved / scheduled searches": "Very high counts flag schedule risk / SHC review; lowering mainly clears that pressure signal.",
    "Table baseline (SH+IDX)": "This is the table-only starting point. Clustering, concurrent searches, ES/ITSI can only raise the final counts above it.",
    "N_SH": "Final search-head member count after floors. With SHC it is never 2 (raised to 3) and may stay at 1 for a single-member interim cluster.",
    "Cluster manager": "Added when indexer clustering is on — one manager node beside the indexer peers (does not store customer data).",
    "SHC deployer": "Added when Search Head Cluster is on — one deployer on a non-member instance to push apps/config to SHC members.",
    "N_IDX": "Final indexer count. It climbs with daily volume, RF, ES/ITSI floors, or your n_idx override (never below RF when clustered).",
    "CPU physical": "Roles are sized in physical cores. Under-assigning physical cores vs the table → that role is undersized even if vCPU looks high.",
    "CPU logical / vCPU": "Usually ~2× physical with HT. Changing the guest vCPU without matching physical reservation does not invent more real cores.",
    Virtualization: "If the hypervisor oversubscribes CPU/RAM, real Splunk throughput drops even when the guest “has” the table’s vCPU count.",
    "Splunk parallelization": "Enable only when the role already has spare CPU above the minimum; turning it on on a packed host makes contention worse.",
    "hot need GB": "Grows when hot/warm days, daily on-disk, or headroom rise — that is the SSD you must buy/allocate.",
    "cold need GB": "Grows when retention is long but hot/warm days are short (more data lives cold), or daily on-disk rises.",
    "summaries need GB": "Grows with summary volume, DMA pct/retention, or enabling DMA/summary indexes.",
    "SmartStore cache GB": "Grows with daily volume and cache days (30 → 90 when ES is on). That is local NVMe/SSD cache, not the full remote store.",
    "Max daily from disk": "More available disk or shorter retention/headroom → higher max daily. Less disk or longer retention → lower ingest ceiling.",
  },
  fa: {
    mode_sources: "فقط Daily یا EPS را به‌عنوان ورودی اصلی بگیرید. مقدار اصلی را بالا ببرید → حجم/دیسک/نود رشد می‌کند. عدد کوچک زیر کادر فقط تخمین واحد دیگر است (ورودی دوم نیست).",
    mode_total: "total_daily_gb را بالا ببرید → کل پلن برای روز بزرگ‌تر اسکیل می‌شود (دیسک بیشتر، معمولاً ایندکسر بیشتر). کمش کنید → فضای دیسک و تعداد نود سبک‌تر می‌شود. EPS کوچک زیر فیلد از میانگین اندازهٔ رویداد تخمین زده می‌شود.",
    mode_capacity: "دیسک موجود را بیشتر بدهید → تناسب بهتر و «سقف روزانه از روی دیسک» بالاتر می‌رود. بودجه را کم کنید → ممکن است هشدار SHORT و سقف روزانه پایین‌تر ببینید.",
    indexer_cluster: "روشن کنید → RF/SF مهم می‌شوند، Comp معمولاً 0.15×RF+0.35×SF می‌شود (دیسک بیشتر)، مدیر کلاستر و peer≥RF لازم است. خاموش کنید → Comp≈0.5 و بدون الزام cluster manager.",
    rf: "RF را بالا ببرید → کپی rawdata بیشتر → دیسک بیشتر و معمولاً peer بیشتر (حداقل برابر RF). پایین بیاورید → دیسک کمتر ولی تحمل خرابی ضعیف‌تر (SF نباید از RF بیشتر باشد).",
    sf: "SF را بالا ببرید → کپی searchable/TSIDX بیشتر → دیسک سریع‌تر از فقط بالا بردن RF رشد می‌کند. پایین بیاورید → دیسک کمتر برای کپی جستجو، ولی replica searchable کمتر بعد از خرابی.",
    shc: "روشن کنید → deployer اضافه می‌شود؛ اعضا باید ۱ (تک‌عضوی موقت، بدون HA) یا ≥۳ (HA) باشند. دقیقاً ۲ رد و به ۳ ارتقا می‌یابد. خاموش کنید → تعداد SH بدون قوانین SHC می‌ماند.",
    smartstore: "روشن کنید → دیسک محلی عمدتاً کش می‌شود (۳۰ روز، با ES تا ۹۰) و بخش اصلی در object store است. خاموش کنید → کل retention قابل‌جستجو باید روی hot/cold محلی جا شود.",
    has_es: "روشن کنید → SH/SHC اختصاصی ES، کف بالاتر IDX، راهنمای DMA، و با SmartStore کش ۹۰ روزه. خاموش کنید → این کف‌ها و اضافات از طراحی خارج می‌شوند.",
    has_itsi: "روشن کنید → ITSI سرچ‌هد جدا و کف ایندکسر از حجم روزانه می‌گیرد (مثلاً ceil(D/100)). خاموش کنید → آن کف مخصوص ITSI حذف می‌شود.",
    concurrent_users: "کاربران همزمان بیشتر → جدول رسمی معمولاً SH و IDX بیشتری پیشنهاد می‌دهد. کمتر → خط پایه N_SH/N_IDX می‌تواند پایین بیاید.",
    concurrent_searches: "اوج سرچ همزمان را بالا ببرید → N_SH طوری زیاد می‌شود که مجموع هسته‌های SH کافی باشد (حدود ۱ سرچ = ۱ هسته). کمش کنید → اگر جدول کاربران×حجم کافی باشد SH کمتر کافی است.",
    saved_searches: "تعداد خیلی بالاتر → فشار زمان‌بندی و هشدار بررسی SHC (حدود ≥۲۰۰). کم کردن بیشتر همان هشدار را کم می‌کند، نه یک فرمول سخت نود.",
    n_idx: "بالای ۰ بگذارید → همان تعداد ایندکسر اجباری می‌شود (کلاستر همچنان زیر RF نمی‌رود). ۰ = خودکار؛ کمتر از کف → عدد شما می‌ماند ولی هشدار می‌آید.",
    n_sh: "بالای ۰ → تعداد اجباری. با SHC: ۱=تک‌عضوی موقت؛ ۲ نامعتبر (به ۳)؛ ≥۳=HA. ۰ = خودکار از کاربران/حجم/سرچ.",
    retention_days: "نگهداری طولانی‌تر → حجم کلی Index تقریباً خطی زیاد می‌شود. کوتاه‌تر → Index کوچک‌تر؛ داده زودتر freeze می‌شود (سپس آرشیو یا حذف طبق گزینه آرشیو هنگام Freeze).",
    hot_warm_days: "روزهای hot/warm بیشتر → بودجه SSD/homePath بزرگ‌تر؛ برای همان retention کمتر روی cold می‌ماند. کمتر → دیسک سریع کوچک‌تر و داده زودتر به cold می‌رود.",
    headroom: "headroom را بالا ببرید (مثلاً ۱.۰→۱.۲) → همه سقف‌های MB با همان حاشیه بزرگ می‌شوند. کمش کنید → چیدمان تنگ‌تر و حاشیه امن کمتر قبل از پر شدن volume.",
    summary_pct: "درصد summary را بالا ببرید → ingest summary و دیسک volume:summaries بیشتر می‌شود. کمش کنید → ایندکس‌های summary برای منابعی که از درصد استفاده می‌کنند کوچک‌تر می‌شوند.",
    summary_retention_days: "نگهداری summary طولانی‌تر → دیسک summaries بیشتر. کوتاه‌تر → ایندکس‌های summary زودتر کوچک/قدیمی می‌شوند.",
    hot_path: "مسیر را عوض کنید → indexes.conf به محل جدید hot/warm اشاره می‌کند. مسیر اشتباه/کند (مثل NFS برای hot) → ریسک ingest و سرچ، نه فقط یک برچسب.",
    cold_path: "مسیر را عوض کنید → باکت‌های cold روی آن volume می‌روند. رسانه کندتر → سرچ روی داده قدیمی‌تر کندتر می‌شود.",
    frozen_path: "فقط وقتی آرشیو هنگام Freeze روشن است مهم است: عوضش کنید → coldToFrozenDir به درخت آرشیو جدید می‌رود. مسیر غلط → هنگام retire باکت، آرشیو شکست می‌خورد.",
    archive_frozen: "روشن کنید → هنگام freeze باکت‌ها به آرشیو (frozen_path) می‌روند. خاموش کنید → هنگام freeze حذف می‌شوند (بدون coldToFrozenDir).",
    enable_dma: "روشن کنید → tstatsHomePath و بودجه DMA روی summaries رزرو می‌شود. خاموش کنید → آن بودجه و مسیرها از پلن می‌افتد (ES معمولاً DMA می‌خواهد).",
    dma_pct: "dma_pct را بالا ببرید → بودجه DMA/summaries بزرگ‌تر. کمش کنید → رزرو کمتر برای شتاب‌دهی (اگر DMA واقعی بزرگ‌تر باشد کم‌برآورد می‌شوید).",
    compression: "C اندازه‌گیری‌شده بگذارید (مثلاً ۰.۴) → همهٔ محاسبات دیسک از همان استفاده می‌کنند. ۰ = مدل رسمی. C بالاتر → دیسک بیشتر فرض می‌شود؛ پایین‌تر → کمتر.",
    remote_path: "مسیر را عوض کنید → SmartStore به آن bucket/prefix می‌رود. هر کلاستر باید مسیر یکتا داشته باشد وگرنه objectها قاطی می‌شوند.",
    summary_daily_gb: "GB/روز صریح بگذارید → حجم summary همان عدد می‌شود (نه summary_pct). خالی کنید → برمی‌گردد به درصد منبع.",
    summaries_path: "مسیر را عوض کنید → DMA/tstats و summary روی آن volume سریع می‌روند. گذاشتن روی HDD cold → شتاب‌دهی و سرچ summary ضعیف می‌شود.",
    total_daily_gb: "D را بالا ببرید → فضای ذخیره و معمولاً تعداد ایندکسر (گاهی SH) رشد می‌کند. کمش کنید → پلن دیسک و کف نودها سبک‌تر می‌شود.",
    available_hot_gb: "hot موجود را بیشتر کنید → هشدار SHORT کمتر و سقف روزانه بالاتر. کمتر از نیاز بگذارید → هشدار و سقف volume روی همان مقدار شما.",
    available_cold_gb: "cold موجود را بیشتر کنید → تناسب cold بهتر و سقف معکوس روزانه می‌تواند بالاتر برود. خیلی کم → SHORT روی cold.",
    available_summaries_gb: "بودجه summaries را بیشتر کنید → تناسب DMA/summary بهتر. کمتر از نیاز → هشدار و سقف کوچک‌تر در conf.",
    event_bytes: "میانگین رویداد خام بزرگ‌تر → همان EPS تبدیل به GB خام روزانه بیشتر می‌شود (بعد روی دیسک × Comp). کوچک‌تر → حجم کمتر.",
    daily_gb: "GB خام روزانه این منبع را بالا ببرید → بعد از Comp دیسک بیشتر و D کل بالا می‌رود. این «حجم فشردهٔ روی دیسک» نیست.",
    eps: "EPS خام را بالا ببرید → GB خام روزانه با event_bytes زیاد می‌شود؛ روی دیسک ≈ همان × Comp. نرخ اشغال دیسک نیست.",
    enable_summary: "روشن کنید → ایندکس *_summary و دیسک summaries سایز می‌شود. خاموش کنید → آن stanza و دیسکش از پلن می‌افتد.",
    "Total daily raw GB/day": "جمع منابع/کل است. اگر در پلن بالا برود، دیسک و معمولاً N_IDX هم بالا می‌رود.",
    "Compression factor": "Comp بالاتر (مثلاً بعد از بالا بردن RF/SF) → برای هر روز raw، دیسک بیشتری لازم است. Comp پایین‌تر → دیسک کمتر فرض می‌شود.",
    "Total on-disk GB/day": "اگر بالا برود، با retention به TB searchable و بودجه hot بیشتر تبدیل می‌شود. با تغییر D یا Comp جابه‌جا می‌شود.",
    "Total searchable TB": "retention طولانی‌تر یا on-disk روزانه بیشتر → این عدد بالا می‌رود؛ retention کوتاه‌تر یا حجم کمتر → پایین می‌آید.",
    "Concurrent users": "همان اهرم ورودی کاربران: کاربر بیشتر → معمولاً SH/IDX بیشتر از جدول؛ کمتر → خط پایه سبک‌تر.",
    "Peak concurrent searches": "S بالاتر یعنی طراحی به هسته SH بیشتری نیاز داشته؛ S پایین‌تر کف سرچ‌-کور روی N_SH را شل می‌کند.",
    "Saved / scheduled searches": "تعداد خیلی بالا ریسک زمان‌بندی / بررسی SHC را نشان می‌دهد؛ کم کردنش عمدتاً همان سیگنال را کم می‌کند.",
    "Table baseline (SH+IDX)": "نقطه شروع فقط از جدول است. کلاستر، سرچ همزمان، ES/ITSI فقط می‌توانند تعداد نهایی را بالاتر ببرند.",
    "N_SH": "تعداد نهایی سرچ‌هد بعد از همه کف‌ها. با کاربر بیشتر، سرچ همزمان بیشتر، SHC یا قوانین ES/ITSI بالا می‌رود.",
    "N_IDX": "تعداد نهایی ایندکسر. با حجم روزانه، RF، کف ES/ITSI یا n_idx شما بالا می‌رود (در کلاستر هرگز زیر RF).",
    "CPU physical": "نقش‌ها بر اساس هسته فیزیکی سایز می‌شوند. هسته فیزیکی کمتر از جدول → نقش undersize است حتی اگر vCPU زیاد به نظر برسد.",
    "CPU logical / vCPU": "معمولاً حدود ۲× فیزیکی با HT. زیاد کردن vCPU مهمان بدون رزرو فیزیکی، هسته واقعی اضافه نمی‌کند.",
    Virtualization: "اگر هایپروایزر CPU/RAM را oversubscribe کند، حتی با vCPU جدول، throughput واقعی Splunk پایین می‌آید.",
    "Splunk parallelization": "فقط وقتی نقش از حداقل CPU spare دارد روشن کنید؛ روی میزبان پر، contention بدتر می‌شود.",
    "hot need GB": "با روزهای hot/warm بیشتر، on-disk روزانه یا headroom بالاتر رشد می‌کند — همان SSDای که باید تهیه کنید.",
    "cold need GB": "وقتی retention طولانی و hot/warm کوتاه است (داده بیشتر روی cold) یا on-disk روزانه بالا می‌رود، زیاد می‌شود.",
    "summaries need GB": "با حجم summary، dma_pct/retention یا روشن کردن DMA/summary زیاد می‌شود.",
    "SmartStore cache GB": "با حجم روزانه و روزهای کش رشد می‌کند (۳۰→۹۰ با ES). این کش محلی است، نه کل remote store.",
    "Max daily from disk": "دیسک موجود بیشتر یا retention/headroom کوتاه‌تر → سقف روزانه بالاتر. دیسک کمتر یا retention طولانی‌تر → سقف ingest پایین‌تر.",
  },
};

(function applyTipImpacts() {
  ["en", "fa"].forEach((lang) => {
    const tips = window.SCP_TIPS[lang];
    const map = SCP_TIP_IMPACTS[lang] || {};
    if (!tips) return;
    Object.keys(map).forEach((k) => {
      if (tips[k]) tips[k].impact = map[k];
    });
  });
})();

// Persian copies (same formulas/links; FA explanations)
window.SCP_TIPS.fa = JSON.parse(JSON.stringify(window.SCP_TIPS.en));
(function localizeFa() {
  const fa = window.SCP_TIPS.fa;
  const map = {
    mode_sources: ["حجم هر منبع (Daily یا EPS)", "فقط یکی را به‌عنوان ورودی اصلی انتخاب کنید. زیر هر عدد واحد دیگر تخمین زده می‌شود؛ منبع بدون EPS میانگین EPS بقیه را می‌گیرد."],
    mode_total: ["حجم کل روزانه", "اختیاری روی تب Volumes؛ با منابع اسکیل می‌شود یا ایندکس main ساخته می‌شود."],
    mode_capacity: ["دیسک موجود باکت‌ها", "بودجه hot/cold اختیاری؛ تناسب دیسک و سقف روزانه/retention — قابل ترکیب با منابع/total."],
    indexer_cluster: ["کلاستر ایندکسر", "روشن = RF/SF فعال و ضریب 0.15×RF+0.35×SF. خاموش = برنامه‌ریزی standalone با Comp≈0.5."],
    rf: ["Replication Factor", "تعداد کپی rawdata در کلاستر. SF نباید از RF بیشتر باشد."],
    sf: ["Search Factor", "تعداد کپی searchable دارای TSIDX. هزینه دیسک بیشتر از کپی فقط-raw است."],
    shc: ["Search Head Cluster", "اعضا: ۱ (موقت) یا ≥۳ — هرگز ۲؛ + deployer. تأخیر ≤200ms."],
    smartstore: ["SmartStore", "داده گرم عمدتاً در object store؛ کش محلی NVMe/SSD. با ES کش ۹۰ روزه."],
    has_es: ["Enterprise Security", "SH اختصاصی، کف سخت‌افزار ۱۶ هسته/۳۲GB، جدا از ITSI، کش SmartStore ۹۰ روز."],
    has_itsi: ["ITSI", "SH جدا از ES؛ KV≥۳۰GB آزاد؛ N_IDX نمونه ≈ ceil(D/100)."],
    concurrent_users: ["کاربران همزمان", "ردیف جدول رسمی کاربران × حجم روزانه برای N_SH/N_IDX."],
    concurrent_searches: ["اوج سرچ همزمان", "هر سرچ فعال ≤۱ هسته CPU؛ N_SH طوری بالا می‌رود که مجموع هسته‌ها ≥ S باشد."],
    saved_searches: ["سرچ ذخیره‌شده", "بعد Dimensions؛ تعداد بالا → ظرفیت بیشتر / بررسی SHC."],
    n_idx: ["n_idx", "۰ = خودکار از کاربران×حجم (+کف کلاستر/ES)؛ کمتر از کف توصیه → هشدار؛ RF همچنان حداقل peer را سخت اعمال می‌کند."],
    n_sh: ["n_sh", "۰ = خودکار؛ با SHC: ۱ مجاز (موقت)، ۲ نامعتبر→۳، ≥۳ برای HA."],
    retention_days: ["حجم کلی Index", "سقف حجم یک Index در Splunk (maxTotalDataSizeMB) از ingest روزانه × روز × headroom. Freeze روی عمر یا حجم — هرکدام زودتر. آرشیو هنگام Freeze مشخص می‌کند بعدش آرشیو شود یا حذف."],
    hot_warm_days: ["hot_warm_days", "روزهای روی SSD hot/warm؛ مبنای homePath.maxDataSizeMB."],
    headroom: ["headroom", "ضریب اطمینان روی سقف‌های MB (مثلاً ۱.۲)."],
    summary_pct: ["summary_pct", "سهم تقریبی summary از حجم خام منبع (پیش‌فرض ۱۰٪)."],
    summary_retention_days: ["summary_retention_days", "نگهداری ایندکس‌های summary."],
    hot_path: ["hot_path", "مسیر volume hot/warm — فقط دیسک محلی/SSD، نه NFS."],
    cold_path: ["cold_path", "مسیر cold؛ HDD/NFS مجاز ولی کندتر."],
    frozen_path: ["frozen_path", "مسیر آرشیو فقط اگر آرشیو هنگام Freeze روشن باشد."],
    archive_frozen: ["آرشیو هنگام Freeze", "روشن = coldToFrozenDir (آرشیو)؛ خاموش = حذف پیش‌فرض Splunk."],
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
    event_bytes: ["event_bytes", "میانگین بایت هر رویداد خام ورودی (قبل از فشرده‌سازی) — نه اندازه روی دیسک. با EPS → GB خام روزانه؛ روی دیسک ≈ همان × Comp (~۵۰٪)."],
    daily_gb: ["daily_gb", "GB/روز حجم خام/لایسنس (pre-indexed) — نه حجم فشرده روی دیسک. روی دیسک ≈ daily_gb × Comp."],
    eps: ["EPS", "رویداد بر ثانیهٔ داده خام ورودی. مستند Splunk از حجم pre-indexed شروع می‌کند بعد ~۵۰٪ برای دیسک. EPS یعنی «GB روی دیسک» نیست."],
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
  // Re-apply FA impacts after clone/localize so English impact text is not left behind
  Object.keys(SCP_TIP_IMPACTS.fa).forEach((k) => {
    if (fa[k]) fa[k].impact = SCP_TIP_IMPACTS.fa[k];
  });
})();
