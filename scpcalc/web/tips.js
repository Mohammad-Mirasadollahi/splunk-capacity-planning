/* Calculation help tips — formulas, examples, official Splunk docs */
window.SCP_TIPS = {
  en: {
    mode_sources: {
      title: "Per-source volume (Daily XOR EPS)",
      formula: "Daily_Raw_GB(source) = daily_gb  OR  EPS × 86400 × event_bytes / 1024³",
      body: "Choose exactly one volume mode for the whole plan: Daily GB or EPS — not both as primary inputs. Under each number the UI shows the other unit (using event size). Sources without an EPS inherit the average EPS of sources that already have one. Combine freely with total_daily_gb (Volume step budget) and/or disk budgets. Enabled sources must not exceed total_daily_gb.",
      example: "Daily 1 GB/day with event_bytes=500 → ≈ 23.8 EPS under the box. In EPS mode, a blank source takes the average EPS of filled sources.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    mode_total: {
      title: "Total daily ingest",
      formula: "total_daily_gb is a ceiling; under-budget sources scale up so Σ = total; over-budget is an error",
      body: "Overall daily ingest budget on the Volume step (Daily volume & drivers). If sources are empty, index main is synthesized. If sources under-fill the total, they scale up. If they exceed the total, calculation fails — raise the budget or lower per-index volumes.",
      example: "total_daily_gb=500 with windows:linux = 4:1 under-fill → ~400 + 100 GB/day after scale-up. Sum 600 with budget 500 → error.",
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
      formula: "1 ≤ RF ≤ number of indexer peers; Comp raw share ≈ 0.15 × RF",
      body: "RF is how many copies of rawdata the cluster keeps. Splunk stores each copy on a separate peer, so RF cannot exceed the indexer count. SF cannot exceed RF. Non-cluster planning uses RF=1.",
      example: "n_idx=2 → RF max 2 (RF=3 is invalid). D=100 GB/day, RF=2 → rawdata-like share ≈ 100×0.15×2 = 30 GB/day.",
      links: [
        { label: "Replication factor", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/how-indexer-clusters-work/replication-factor" },
        { label: "Estimate storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    sf: {
      title: "Search Factor (SF)",
      formula: "1 ≤ SF ≤ RF ; TSIDX footprint scales ≈ 0.35 × SF",
      body: "SF is how many searchable copies (with TSIDX) the cluster maintains. Must not exceed RF. Searchable copies cost more disk than raw-only copies.",
      example: "RF=3, SF=2 → valid. SF=4 with RF=3 → invalid; SCPcalc clamps SF to RF.",
      links: [
        { label: "Search factor", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/how-indexer-clusters-work/search-factor" },
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
      body: "ITSI needs its own SH/SHC (not shared with ES). KPI/entity load drives SH count; KPI indexes (e.g. itsi_summary) should land on the indexer tier.",
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
      title: "Searches running at the same moment",
      formula: "Search Heads / CPU sized so total cores ≥ S (1 active search ≤ 1 CPU core)",
      body: "Required. Count scheduled + ad-hoc search jobs that are active together at peak — not total saved searches. This number drives Search Head count and CPU/RAM.",
      example: "40 searches at once with 16-core Search Heads → at least 3 Search Heads, even if the users×volume table suggested fewer.",
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
      title: "Number of indexers",
      formula: "Standalone (cluster off): explicit count ≥1, independent nodes. Cluster on: peers ≥2 (default 3), and ≥ RF",
      body: "With Indexer cluster off there is no Auto mode — you choose how many independent indexers to plan (they do not form a cluster). With cluster on, set peer count (min 2); values below recommended floors warn but keep your number; peers are still raised to at least RF.",
      example: "Cluster off, n_idx=3 → three standalone indexers. Cluster on, auto suggests 4 → set 6 for HA headroom.",
      links: [
        { label: "Summary of performance recommendations", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations" },
      ],
    },
    n_sh: {
      title: "Number of search heads",
      formula: "Standalone (SHC off): explicit count ≥1. With SHC: 1 OK (interim), 2 → raised to 3, ≥3 OK",
      body: "With Search Head Cluster off there is no Auto mode — you choose how many independent search heads (SHC is optional). Enabling SHC sets n_sh=1 (single-member interim); 0 is not allowed. Splunk does not support exactly 2 members for HA — SCPcalc rejects 2 and raises to 3.",
      example: "SHC off, n_sh=2 → two independent search heads. With SHC on, design raises 2→3; n_sh=1 keeps single-member SHC + deployer.",
      links: [
        { label: "SHC system requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/SHCsystemrequirements" },
      ],
    },
    retention_days: {
      title: "Retention days (frozenTimePeriodInSecs)",
      formula: "frozenTimePeriodInSecs = retention_days × 86400\n(also drives calculated maxTotalDataSizeMB ≈ Daily_OnDisk_MB × retention_days × headroom)",
      body: "Age-based searchable retention for an index (or blank on a source = use Policy total). This column is DAYS, not a manual MB size. Splunk freezes when age OR maxTotalDataSizeMB is hit first. Index size MB is computed at Calculate from daily on-disk × these days × headroom.",
      example: "90 days → frozenTimePeriodInSecs = 7,776,000. Calculated Index maxTotal ≈ daily on-disk × 90 × headroom.",
      links: [
        { label: "Set a retirement and archiving policy", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    max_total: {
      title: "maxTotalDataSizeMB (calculated Index size)",
      formula: "maxTotalDataSizeMB ≈ Daily_OnDisk_MB × retention_days × headroom\nhomePath.maxDataSizeMB ≈ Daily_OnDisk_MB × hot_warm_days × headroom",
      body: "You do not type Index maxTotalDataSizeMB directly. Official Splunk sizing starts from daily volume and retention; SCPcalc writes maxTotal / homePath / coldPath MB after Calculate. To cap disk, set Policy volume budgets (available_hot_gb / available_cold_gb → [volume:*] maxVolumeDataSizeMB).",
      example: "Windows 80 GB/day raw, Comp 0.5 → 40 GB/day on-disk; 60d retention × headroom 1.2 → maxTotal ≈ 40×1024×60×1.2 MB.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
        { label: "Configure index storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    hot_warm_days: {
      title: "hot_warm_days",
      formula: "homePath.maxDataSizeMB ≈ Daily_OnDisk_MB × hot_warm_days × headroom",
      body: "Days kept on the hot/warm (SSD) volume before aging to cold. With cold days, total searchable = hot + cold. Drives homePath.maxDataSizeMB budget.",
      example: "Daily on-disk 50 GB, hot_warm 30d, headroom 1.0 → homePath.maxDataSizeMB ≈ 50×1024×30 = 1,536,000.",
      links: [
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    cold_days: {
      title: "cold_days",
      formula: "retention_days = hot_warm_days + cold_days\ncold disk ≈ Daily_OnDisk × cold_days × headroom",
      body: "Days on cold searchable storage before freeze. Edit hot + cold (or disk GB in Plan by disk mode) — total searchable days updates automatically. Archive on freeze is separate and does not add days.",
      example: "Hot 10d + Cold 30d → total 40d searchable; Archive off → delete after freeze.",
      links: [
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
      ],
    },
    cold_path_max: {
      title: "coldPath.maxDataSizeMB (auto)",
      formula: "coldPath.maxDataSizeMB = maxTotalDataSizeMB − homePath.maxDataSizeMB\ncold_days = retention_days − hot_warm_days",
      body: "After Calculate, coldPath.maxDataSizeMB is the Index remainder after homePath. You plan cold with cold days (or cold disk GB); SCPcalc writes the MB field to indexes.conf.",
      example: "maxTotal 3,443,200 − homePath 1,721,600 → coldPath.maxDataSizeMB = 1,721,600.",
      links: [
        { label: "indexes.conf (coldPath.maxDataSizeMB)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
      ],
    },
    headroom: {
      title: "headroom",
      formula: "Optional: size caps × headroom\nSplunk base: Daily × Days × Comp (no spare multiplier)\nOperational: keep ≥20% disk free on index volumes",
      body: "Splunk capacity examples (Estimate your storage requirements) use daily ingest × retention × compression with no built-in spare factor. Use headroom here only if you want larger maxTotalDataSizeMB / volume caps than the official base. Separately, Splunk recommends keeping at least 20% free space on index volumes for performance; indexing pauses below minFreeSpace (default 5 GB).",
      example: "Official searchable: 100 GB/day × 8d × Comp=1.0 = 800 GB. headroom 1.2 → plan 960 GB caps in indexes.conf.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
        { label: "Optimize for peak performance (20% free)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/OptimizeSplunkforpeakperformance" },
        { label: "Set limits on disk usage (minFreeSpace)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Setlimitsondiskusage" },
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
      body: "Cold bucket volume. HDD/SAN/NAS/NFS allowed but search is slower. Keep DMA/tstats off cold HDD.",
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
    archive_days: {
      title: "Days kept in archive",
      formula: "Archive_GB ≈ Daily_Raw × 0.15 × archive_days × (RF if indexer_cluster & not archive_single_copy)\nNo headroom on archive — rawdata-only sizing",
      body: "After searchable retention, frozen buckets move to coldToFrozenDir. Splunk 4.2+ archives rawdata only (~15% of pre-indexed ingest), not full searchable on-disk (no TSIDX). Splunk does not auto-purge archive — you manage retention on the archive path. In a cluster, each peer archives its own copies when configured identically (× RF unless single-copy script).",
      example: "100 GB/day raw, 90d, RF=2 cluster → 100×0.15×90×2 = 2,700 GB (not 9,000 GB using full on-disk).",
      links: [
        { label: "Archive indexed data", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/back-up-and-archive-your-indexes/archive-indexed-data" },
        { label: "Estimate storage (15% rawdata)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    archive_single_copy: {
      title: "Archive single copy (custom script)",
      formula: "When checked: Archive_GB ≈ Daily_Raw × 0.15 × archive_days (no × RF)",
      body: "Splunk states archiving only one cluster copy is not feasible to automate reliably with coldToFrozenDir alone — use coldToFrozenScript to route peers to unique paths. Check this when your script archives a single copy and you want sizing without RF multiplication.",
      example: "RF=3, 100 GB/day, 90d → default 4,050 GB; single-copy checked → 1,350 GB.",
      links: [
        { label: "Archive indexed data — cluster copies", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/back-up-and-archive-your-indexes/archive-indexed-data" },
      ],
    },
    archive_frozen: {
      title: "Archive on freeze",
      formula: "archive_frozen=false → omit coldToFrozenDir (Splunk deletes)\ntrue → coldToFrozenDir = frozen_path/<index>/frozendb",
      body: "Searchable disk (hot/warm/cold) is sized separately from archive. When on, frozen buckets keep rawdata on the archive path; archive capacity uses Daily_Raw × 0.15 × days (× RF in cluster by default).",
      example: "Compliance → enable Archive on freeze, set frozen_path, size archive_days on rawdata formula.",
      links: [
        { label: "Set a retirement and archiving policy", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy" },
        { label: "Archive indexed data", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/back-up-and-archive-your-indexes/archive-indexed-data" },
      ],
    },
    enable_dma: {
      title: "DMA / tstats",
      formula: "ES official (dma_pct=0): DMA_GB = Daily_Raw × 3.4 × dma_years (cluster-wide total)\nOverride (dma_pct>0): Daily_OnDisk × retention × headroom × dma_pct",
      body: "Data model acceleration stores summaries on volume:summaries (tstatsHomePath). ES official formula assumes default ES/CIM data models and their retention mix for up to dma_years. Cardinality and custom models vary — measure in your environment.",
      example: "ES on, 100 GB/day, dma_years=1 → 340 GB summaries/DMA budget (not 10% of searchable on-disk).",
      links: [
        { label: "ES DMA storage and retention", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.6/installation/configure-data-models-for-splunk-enterprise-security" },
        { label: "Accelerate data models", url: "https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Acceleratedatamodels" },
      ],
    },
    dma_pct: {
      title: "DMA override (%)",
      formula: "Only when >0:\nDMA_GB ≈ Daily_OnDisk × retention_days × headroom × dma_pct\nLeave 0 for ES official: Daily_Raw × 3.4 × dma_years",
      body: "Legacy planning fraction of searchable on-disk. Not the ES official formula. Use when you have measured DMA size as a percent of searchable data, or for non-ES DMA without the ×3.4/year rule.",
      example: "dma_pct=0.10 override: 50 GB/day on-disk, 90d, headroom 1 → ~460 GB DMA budget.",
      links: [
        { label: "ES DMA storage and retention", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.6/installation/configure-data-models-for-splunk-enterprise-security" },
      ],
    },
    dma_years: {
      title: "DMA planning years",
      formula: "DMA_GB = Daily_Raw × 3.4 × dma_years\n(cluster-wide across all indexers)",
      body: "ES official planning horizon at default accelerated data model retention settings (Splunk docs example uses 1 year). Uses raw/license ingest volume, not on-disk searchable size. Does not scale with index retention_days unless you change dma_years.",
      example: "100 GB/day × 3.4 × 1 = 340 GB; × 2 years → 680 GB (planning only — validate with short retention test).",
      links: [
        { label: "ES DMA storage and retention", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.6/installation/configure-data-models-for-splunk-enterprise-security" },
        { label: "Reference hardware (DMA on SSD)", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
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
    summaries_path: {
      title: "summaries_path",
      formula: "[volume:summaries] ; tstatsHomePath = volume:summaries/<index>/datamodel_summary  # if DMA",
      body: "Fast volume for DMA/tstats (tstatsHomePath). Prefer SSD/NVMe and keep separate from cold. tstatsHomePath is emitted only when DMA/ES is enabled.",
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
    configure_sources: {
      title: "Log sources",
      body: "The main index row always exists and mirrors total_daily_gb until you add or enable another log source. Then main steps aside so you assign volumes and index names yourself.",
      example: "Budget 500 GB/day → main shows 500 GB/day. Add Windows at 200 GB/day → main turns off; you split the rest across your indexes.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
      ],
    },
    available_hot_gb: {
      title: "[volume:hotwarm] maxVolumeDataSizeMB",
      formula: "available_hot_gb → maxVolumeDataSizeMB ≈ GB × 1024 (conf); fit vs Σ homePath.maxDataSizeMB",
      body: "Disk budget for the hot/warm volume stanza — not per-index maxTotalDataSizeMB. SCPcalc maps this to [volume:hotwarm] maxVolumeDataSizeMB after Calculate. Path for that volume is on the Paths tab.",
      example: "9300 GB → maxVolumeDataSizeMB ≈ 9,523,200 (like path=/hot with a size cap).",
      links: [
        { label: "Configure index storage", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage" },
      ],
    },
    available_cold_gb: {
      title: "[volume:cold] maxVolumeDataSizeMB",
      formula: "available_cold_gb → cold volume cap; fit vs Σ (maxTotal − homePath)",
      body: "Disk budget for the cold volume stanza ([volume:cold] maxVolumeDataSizeMB). Paths tab sets path=; this sets the size cap.",
      example: "8600 GB cold budget → cold volume maxVolumeDataSizeMB in conf.",
      links: [
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
      ],
    },
    dma_volume_gb: {
      title: "DMA volume (auto)",
      formula: "dma_pct=0: Daily_Raw × 3.4 × dma_years (cluster-wide)\nOverride (dma_pct>0): Daily_OnDisk × retention × headroom × dma_pct",
      body: "Auto-calculated Data Model Acceleration budget for [volume:_splunk_summaries] (tstatsHomePath). Updates when daily ingest, dma_years, or dma_pct changes — not a manual cap.",
      example: "100 GB/day raw, dma_years=1 → 340 GB DMA (ES official).",
      links: [
        { label: "ES DMA storage and retention", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.6/installation/configure-data-models-for-splunk-enterprise-security" },
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    available_summaries_gb: {
      title: "DMA volume (auto)",
      formula: "Same as dma_volume_gb — legacy field name in plan JSON",
      body: "Auto-calculated DMA size written to available_summaries_gb in the plan payload.",
      example: "100 GB/day → 340 GB at dma_years=1.",
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
      formula: "DMA_GB (ES: Daily_Raw × 3.4 × dma_years when dma_pct=0)",
      body: "Budget for volume:summaries — DMA/tstatsHomePath only. ES official DMA uses raw ingest × 3.4/year, not a percent of searchable on-disk. Keep on SSD/NVMe separate from cold.",
      example: "100 GB/day ES, dma_years=1 → ~340 GB DMA.",
      links: [
        { label: "ES DMA storage and retention", url: "https://help.splunk.com/en/splunk-enterprise-security-8/install/8.6/installation/configure-data-models-for-splunk-enterprise-security" },
        { label: "Reference hardware", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware" },
      ],
    },
    "Archive need (GB · total)": {
      title: "Archive need (GB · total)",
      formula: "Archive_GB ≈ Daily_Raw × 0.15 × archive_days × (RF if cluster & not single-copy)",
      body: "Cluster-wide frozen archive capacity (rawdata only). Not included in searchable hot/cold totals. SF does not apply; headroom does not apply.",
      example: "100 GB/day, 90d, RF=2 → 2,700 GB total archive.",
      links: [
        { label: "Archive indexed data", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/back-up-and-archive-your-indexes/archive-indexed-data" },
      ],
    },
    "Archive need · per Indexer": {
      title: "Archive need · per Indexer",
      formula: "Archive_total_GB ÷ N_IDX",
      body: "Average archive disk per indexer peer for planning display. Physical copies follow RF distribution across peers — not necessarily equal per node.",
      example: "2,700 GB total ÷ 10 indexers → 270 GB per indexer (display average).",
      links: [
        { label: "Archive indexed data — cluster", url: "https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/back-up-and-archive-your-indexes/archive-indexed-data" },
      ],
    },
    "Hot/Warm need (GB · total)": {
      title: "Hot/Warm need (GB · total)",
      formula: "Σ homePath.maxDataSizeMB / 1024\n≈ Daily_OnDisk × hot_warm_days × headroom",
      body: "Cluster-wide SSD hot/warm budget. Official Splunk base uses Comp × days without headroom; headroom multiplies caps when set >1.",
      example: "100 GB/day on-disk, 1d hot, headroom 1.0 → 100 GB; headroom 1.2 → 120 GB.",
      links: [
        { label: "Estimate your storage requirements", url: "https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements" },
        { label: "indexes.conf", url: "https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf" },
      ],
    },
    "Cold need (GB · total)": {
      title: "Cold need (GB · total)",
      formula: "Σ (maxTotal − homePath) / 1024\n≈ Daily_OnDisk × cold_days × headroom",
      body: "Cluster-wide cold searchable tier between hot/warm and freeze.",
      example: "100 GB/day on-disk, 7d cold, headroom 1.0 → 700 GB cold need.",
      links: [
        { label: "How the indexer stores indexes", url: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes" },
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
    indexer_cluster: "Turn ON → RF/SF matter, Comp becomes 0.15×RF+0.35×SF (usually more disk), and you get a cluster manager. RF/SF stay ≤ peer count. Turn OFF → standalone Comp≈0.5 and no cluster manager requirement.",
    rf: "RF must be ≤ indexer count (one copy per peer). Raise RF → more disk. Lower RF → less disk; SF is also capped by RF.",
    sf: "SF must be ≤ RF. Raise SF → more searchable TSIDX copies → more disk. Lower SF → fewer searchable replicas after a failure.",
    shc: "Turn ON → add a deployer; members must be 1 (single-member interim, no HA) or ≥3 (HA). Exactly 2 is rejected and raised to 3 per Splunk SHC docs. Turn OFF → SH count follows users×volume×searches without SHC rules.",
    smartstore: "Turn ON → local disk becomes mainly cache (30 days, or 90 with ES) and remote object storage holds the bulk. Turn OFF → all searchable retention must fit on local hot/cold volumes.",
    has_es: "Turn ON → dedicated ES SH/SHC, higher IDX floors, DMA guidance, and SmartStore cache 90 days if SmartStore is on. Turn OFF → those ES floors and extras drop out of the design.",
    has_itsi: "Turn ON → ITSI gets its own SH and an indexer floor from daily volume (e.g. ceil(D/100)). Turn OFF → that ITSI-specific floor disappears.",
    concurrent_users: "More concurrent users → the official users×volume table often recommends more search heads and indexers. Fewer users → baseline N_SH / N_IDX can drop.",
    concurrent_searches: "Raise searches running at once → more Search Head cores/nodes. Lower that peak → fewer Search Heads may be enough if users×volume already covers it.",
    saved_searches: "A much higher saved-search count → more schedule pressure and a warning to consider SHC (≥200). Lowering it mainly reduces that warning, not a hard node formula.",
    n_idx: "Cluster off → independent indexers (min 1). Cluster on → peers (min 2); RF/SF are clamped so they never exceed this count.",
    n_sh: "SHC off → set how many independent search heads (min 1), no Auto. With SHC: 1 = interim single-member; 2 is invalid (raised to 3); ≥3 = HA.",
    retention_days: "This is DAYS (age). Longer → larger calculated Index maxTotalDataSizeMB. Shorter → freeze sooner. You do not type maxTotal MB here — Calculate writes it.",
    hot_warm_days: "More hot/warm days → larger homePath.maxDataSizeMB; less of the same total stays on cold.",
    cold_days: "More cold days → larger cold disk need and longer total searchable time (hot + cold). Archive does not add days — it only chooses keep vs delete after freeze.",
    cold_path_max: "After Calculate, coldPath.maxDataSizeMB = maxTotal − homePath. Plan cold with cold days or cold volume GB.",
    max_total: "Index maxTotalDataSizeMB is calculated from daily × days × headroom. Volume-level caps are Policy available_* GB.",
    headroom: "Raise headroom above 1.0 → every size cap grows (optional spare on top of official Splunk base). Lower → tighter caps. Splunk still recommends ≥20% disk free operationally — separate from this multiplier.",
    hot_path: "Sets [volume:hotwarm] path=. Wrong/slow path (e.g. NFS for hot) risks ingest/search — not just a label.",
    cold_path: "Sets [volume:cold] path=. Slower media → colder searches get slower; path must exist and have enough space.",
    frozen_path: "Only matters when Archive on freeze is on: change it → coldToFrozenDir targets the new archive tree. Wrong path → freeze/archive fails when buckets retire.",
    archive_frozen: "Turn ON → at freeze, buckets move to frozen_path (rawdata archive sized at 15%×days×RF). Turn OFF → at freeze, buckets are deleted (no coldToFrozenDir).",
    archive_days: "Longer archive days → more rawdata archive (Daily_Raw × 0.15 × days × RF). Shorter → less. Not full on-disk searchable size.",
    archive_single_copy: "Check ON → archive sizing skips RF multiplier (custom single-copy script). OFF in cluster → × RF per Splunk docs.",
    enable_dma: "Turn ON → ES official DMA (daily_raw × 3.4 × dma_years) on summaries volume. Turn OFF → DMA budget removed.",
    dma_pct: "Leave 0 for ES official. Set >0 → legacy % of searchable on-disk instead of ×3.4/year.",
    dma_years: "More years → linear ES DMA growth (×3.4 per year of raw ingest). Default 1 matches Splunk docs example.",
    compression: "Set a measured C (e.g. 0.4) → all on-disk math uses that instead of 0.5 / RF-SF. Leave 0 → official default model. Higher C → more disk; lower C → less disk assumed.",
    remote_path: "Change the path → SmartStore conf points at that bucket/prefix. Each cluster needs its own unique path or objects can collide.",
    summaries_path: "Sets [volume:_splunk_summaries] path=. Putting it on cold HDD → DMA/tstats acceleration suffers.",
    total_daily_gb: "Raise D → storage and usually indexer (and sometimes SH) counts grow. Lower D → smaller disk plan and lighter node floors from volume.",
    available_hot_gb: "Raises [volume:hotwarm] maxVolumeDataSizeMB. Below need → Calculate errors (hard budget).",
    available_cold_gb: "Raises [volume:cold] maxVolumeDataSizeMB. Too low → Calculate errors on cold.",
    dma_volume_gb: "Auto from daily raw × 3.4 × dma_years (or dma_pct override). Not editable.",
    available_summaries_gb: "Legacy JSON key — holds auto-calculated DMA GB.",
    event_bytes: "Larger average raw event → same EPS becomes more Daily raw GB (then more on-disk after Comp). Smaller events → less daily volume from the same EPS.",
    daily_gb: "Raise this source’s raw daily GB → that index needs more disk after Comp; overall D rises so node counts may rise. Lower it → opposite. This is not “already compressed on disk”.",
    eps: "Raise raw EPS (when daily_gb mode is off) → estimated Daily raw GB rises with event_bytes; on-disk ≈ that × Comp. Not a disk-occupancy rate.",
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
    "summaries need GB": "Same as DMA need — ES official uses daily_raw × 3.4 × dma_years when dma_pct=0.",
    "DMA need (GB · total)": "Data model acceleration on volume:summaries. Sub-label shows dma_years horizon (or dma_pct override). Not index retention_days unless override mode.",
    "DMA need · per Indexer": "Cluster-wide DMA ÷ N_IDX (display average; summaries volume is deployment-wide).",
    "Archive need (GB · total)": "Grows with daily raw ingest, archive_days, and RF (cluster). Uses 15% rawdata formula — not searchable on-disk.",
    "Archive need · per Indexer": "Total archive ÷ N_IDX display average; physical layout depends on peer archive paths.",
    "Hot/Warm need (GB · total)": "Grows with hot_warm_days, daily on-disk, and optional headroom >1.",
    "Cold need (GB · total)": "Grows with cold days, daily on-disk, and optional headroom >1.",
    "SmartStore cache GB": "Grows with daily volume and cache days (30 → 90 when ES is on). That is local NVMe/SSD cache, not the full remote store.",
    "Max daily from disk": "More available disk or shorter retention/headroom → higher max daily. Less disk or longer retention → lower ingest ceiling.",
  },
  fa: {
    mode_sources: "فقط Daily یا EPS را به‌عنوان ورودی اصلی بگیرید. مقدار اصلی را بالا ببرید → حجم/دیسک/نود رشد می‌کند. عدد کوچک زیر کادر فقط تخمین واحد دیگر است (ورودی دوم نیست).",
    mode_total: "total_daily_gb را بالا ببرید → کل پلن برای روز بزرگ‌تر اسکیل می‌شود (دیسک بیشتر، معمولاً ایندکسر بیشتر). کمش کنید → فضای دیسک و تعداد نود سبک‌تر می‌شود. EPS کوچک زیر فیلد از میانگین اندازهٔ رویداد تخمین زده می‌شود.",
    mode_capacity: "دیسک موجود را بیشتر بدهید → تناسب بهتر و «سقف روزانه از روی دیسک» بالاتر می‌رود. بودجه را کم کنید → ممکن است هشدار SHORT و سقف روزانه پایین‌تر ببینید.",
    indexer_cluster: "روشن کنید → RF/SF مهم می‌شوند، Comp معمولاً 0.15×RF+0.35×SF می‌شود (دیسک بیشتر)، مدیر کلاستر و peer≥RF لازم است. خاموش کنید → Comp≈0.5 و بدون الزام cluster manager.",
    rf: "RF باید ≤ تعداد indexer باشد (هر کپی روی یک peer). بالا بردن RF → دیسک بیشتر. کم کردنش → دیسک کمتر؛ SF هم با RF سقف می‌گیرد.",
    sf: "SF باید ≤ RF باشد. بالا بردن SF → کپی searchable/TSIDX بیشتر → دیسک بیشتر. کم کردنش → بعد از خرابی، کپی searchable کمتر.",
    shc: "روشن کنید → deployer اضافه می‌شود؛ اعضا باید ۱ (تک‌عضوی موقت، بدون HA) یا ≥۳ (HA) باشند. دقیقاً ۲ رد و به ۳ ارتقا می‌یابد. خاموش کنید → تعداد SH بدون قوانین SHC می‌ماند.",
    smartstore: "روشن کنید → دیسک محلی عمدتاً کش می‌شود (۳۰ روز، با ES تا ۹۰) و بخش اصلی در object store است. خاموش کنید → کل retention قابل‌جستجو باید روی hot/cold محلی جا شود.",
    has_es: "روشن کنید → SH/SHC اختصاصی ES، کف بالاتر IDX، راهنمای DMA، و با SmartStore کش ۹۰ روزه. خاموش کنید → این کف‌ها و اضافات از طراحی خارج می‌شوند.",
    has_itsi: "روشن کنید → ITSI سرچ‌هد جدا و کف ایندکسر از حجم روزانه می‌گیرد (مثلاً ceil(D/100)). خاموش کنید → آن کف مخصوص ITSI حذف می‌شود.",
    concurrent_users: "کاربران همزمان بیشتر → جدول رسمی معمولاً SH و IDX بیشتری پیشنهاد می‌دهد. کمتر → خط پایه N_SH/N_IDX می‌تواند پایین بیاید.",
    concurrent_searches: "سرچ هم‌زمان در لحظه را بالا ببرید → هسته/تعداد Search Head بیشتر می‌شود. کمش کنید → اگر جدول کاربران×حجم کافی باشد Search Head کمتر کافی است.",
    saved_searches: "تعداد خیلی بالاتر → فشار زمان‌بندی و هشدار بررسی SHC (حدود ≥۲۰۰). کم کردن بیشتر همان هشدار را کم می‌کند، نه یک فرمول سخت نود.",
    n_idx: "بدون کلاستر → indexer مستقل (حداقل ۱). با کلاستر → peer (حداقل ۲)؛ RF/SF طوری محدود می‌شوند که از این تعداد بیشتر نشوند.",
    n_sh: "بدون SHC → تعداد search head مستقل (حداقل ۱)، بدون Auto. با SHC: ۱=تک‌عضوی موقت؛ ۲ نامعتبر (به ۳)؛ ≥۳=HA.",
    retention_days: "این ستون روز است (عمر). طولانی‌تر → maxTotalDataSizeMB محاسبه‌ای بزرگ‌تر. کوتاه‌تر → freeze زودتر. MB را اینجا تایپ نکنید — Calculate می‌نویسد.",
    hot_warm_days: "روزهای hot/warm بیشتر → homePath.maxDataSizeMB بزرگ‌تر؛ برای همان جمع کل کمتر روی cold می‌ماند.",
    cold_days: "روزهای cold بیشتر → نیاز دیسک cold و جمع زمان searchable (hot+cold) بیشتر. آرشیو روز اضافه نمی‌کند — فقط بعد از freeze نگه می‌دارد یا حذف می‌کند.",
    cold_path_max: "بعد از Calculate: coldPath.maxDataSizeMB = maxTotal − homePath. Cold را با روز cold یا GB volume cold برنامه‌ریزی کنید.",
    max_total: "maxTotal هر Index از روزانه × روز × headroom حساب می‌شود. سقف volume در Policy با available_* است.",
    headroom: "headroom بالای ۱.۰ → سقف‌های MB بزرگ‌تر (حاشیه اختیاری روی فرمول پایهٔ Splunk). پایین‌تر → چیدمان تنگ‌تر. همچنان ≥۲۰٪ فضای آزاد دیسک را عملاً نگه دارید — جدا از این ضریب.",
    hot_path: "مقدار [volume:hotwarm] path= را می‌گذارد. مسیر اشتباه/کند (مثل NFS برای hot) → ریسک ingest و سرچ.",
    cold_path: "مقدار [volume:cold] path= را می‌گذارد. رسانه کندتر → سرچ روی داده قدیمی‌تر کندتر می‌شود.",
    frozen_path: "فقط وقتی آرشیو هنگام Freeze روشن است: عوضش کنید → coldToFrozenDir به درخت آرشیو جدید می‌رود.",
    archive_frozen: "روشن → هنگام freeze به آرشیو (فرمول rawdata ۱۵٪×روز×RF). خاموش → حذف پیش‌فرض Splunk.",
    archive_days: "روز بیشتر → آرشیو بیشتر (Daily_Raw × ۰٫۱۵ × روز × RF). از ingest خام است نه on-disk searchable.",
    archive_single_copy: "روشن → ضرب RF در آرشیو نیست (اسکریپت تک‌نسخه). خاموش در کلاستر → × RF.",
    enable_dma: "روشن → tstatsHomePath و DMA روی summaries (پیش‌فرض ES: daily_raw × ۳٫۴ × dma_years). خاموش → بودجه DMA می‌افتد.",
    dma_pct: "۰ = رسمی ES ×۳٫۴/year. >۰ = درصد legacy از searchable on-disk × retention × headroom.",
    dma_years: "dma_years بیشتر → بودجه DMA رسمی ES خطی زیاد می‌شود (×۳٫۴ به ازای هر سال ingest خام).",
    compression: "C اندازه‌گیری‌شده بگذارید (مثلاً ۰.۴) → همهٔ محاسبات دیسک از همان استفاده می‌کنند. ۰ = مدل رسمی. C بالاتر → دیسک بیشتر فرض می‌شود؛ پایین‌تر → کمتر.",
    remote_path: "مسیر را عوض کنید → SmartStore به آن bucket/prefix می‌رود. هر کلاستر باید مسیر یکتا داشته باشد وگرنه objectها قاطی می‌شوند.",
    summaries_path: "مقدار [volume:_splunk_summaries] path= را می‌گذارد. گذاشتن روی HDD cold → شتاب‌دهی DMA/tstats ضعیف می‌شود.",
    total_daily_gb: "D را بالا ببرید → فضای ذخیره و معمولاً تعداد ایندکسر (گاهی SH) رشد می‌کند. کمش کنید → پلن دیسک و کف نودها سبک‌تر می‌شود.",
    available_hot_gb: "سقف [volume:hotwarm] maxVolumeDataSizeMB را بالا می‌برد. کمتر از نیاز → خطای Calculate (بودجه سخت).",
    available_cold_gb: "سقف [volume:cold] maxVolumeDataSizeMB را بالا می‌برد. خیلی کم → خطای Calculate روی cold.",
    dma_volume_gb: "خودکار از daily raw × ۳٫۴ × dma_years (یا override dma_pct). قابل ویرایش نیست.",
    available_summaries_gb: "کلید JSON قدیمی — همان DMA محاسبه‌شده.",
    event_bytes: "میانگین رویداد خام بزرگ‌تر → همان EPS تبدیل به GB خام روزانه بیشتر می‌شود (بعد روی دیسک × Comp). کوچک‌تر → حجم کمتر.",
    daily_gb: "GB خام روزانه این منبع را بالا ببرید → بعد از Comp دیسک بیشتر و D کل بالا می‌رود. این «حجم فشردهٔ روی دیسک» نیست.",
    eps: "EPS خام را بالا ببرید → GB خام روزانه با event_bytes زیاد می‌شود؛ روی دیسک ≈ همان × Comp. نرخ اشغال دیسک نیست.",
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
    "summaries need GB": "همان نیاز DMA — ES رسمی: daily_raw × ۳٫۴ × dma_years وقتی dma_pct=۰.",
    "نیاز DMA (GB · total)": "شتاب data model روی volume:summaries؛ زیرنویس افق dma_years (یا override dma_pct).",
    "نیاز DMA · per Indexer": "DMA کل ÷ N_IDX (میانگین نمایشی).",
    "نیاز Archive (GB · total)": "با ingest خام، روز آرشیو و RF (کلاستر) زیاد می‌شود — فرمول ۱۵٪ rawdata، نه on-disk searchable.",
    "نیاز Archive · per Indexer": "جمع آرشیو ÷ N_IDX — میانگین نمایشی؛ چیدمان فیزیکی به مسیر هر peer بستگی دارد.",
    "نیاز Hot/Warm (GB · total)": "با روز hot/warm، on-disk روزانه و headroom اختیاری >۱ زیاد می‌شود.",
    "نیاز Cold (GB · total)": "با روز cold، on-disk روزانه و headroom اختیاری >۱ زیاد می‌شود.",
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
    mode_total: ["حجم کل روزانه", "سقف بودجه در مرحله Volume؛ اگر منابع کمتر باشند اسکیل‌آپ می‌شود؛ اگر بیشتر شوند خطا می‌دهد."],
    mode_capacity: ["دیسک موجود باکت‌ها", "بودجه hot/cold اختیاری؛ تناسب دیسک و سقف روزانه/retention — قابل ترکیب با منابع/total."],
    indexer_cluster: ["کلاستر ایندکسر", "روشن = RF/SF فعال و ضریب 0.15×RF+0.35×SF. خاموش = برنامه‌ریزی standalone با Comp≈0.5."],
    rf: ["Replication Factor", "تعداد کپی rawdata در کلاستر. SF نباید از RF بیشتر باشد."],
    sf: ["Search Factor", "تعداد کپی searchable دارای TSIDX. هزینه دیسک بیشتر از کپی فقط-raw است."],
    shc: ["Search Head Cluster", "اعضا: ۱ (موقت) یا ≥۳ — هرگز ۲؛ + deployer. تأخیر ≤200ms."],
    smartstore: ["SmartStore", "داده گرم عمدتاً در object store؛ کش محلی NVMe/SSD. با ES کش ۹۰ روزه."],
    has_es: ["Enterprise Security", "SH اختصاصی، کف سخت‌افزار ۱۶ هسته/۳۲GB، جدا از ITSI، کش SmartStore ۹۰ روز."],
    has_itsi: ["ITSI", "SH جدا از ES؛ KV≥۳۰GB آزاد؛ N_IDX نمونه ≈ ceil(D/100)."],
    concurrent_users: ["کاربران همزمان", "ردیف جدول رسمی کاربران × حجم روزانه برای N_SH/N_IDX."],
    concurrent_searches: ["سرچ در لحظه", "اجباری؛ هر سرچ فعال ≤۱ هسته CPU؛ تعداد Search Head طوری بالا می‌رود که مجموع هسته‌ها ≥ این عدد باشد."],
    saved_searches: ["سرچ ذخیره‌شده", "بعد Dimensions؛ تعداد بالا → ظرفیت بیشتر / بررسی SHC."],
    n_idx: ["n_idx", "بدون کلاستر: تعداد صریح ≥۱ (مستقل). با کلاستر: حداقل ۲ peer؛ کمتر از کف توصیه → هشدار؛ RF همچنان حداقل peer را سخت اعمال می‌کند."],
    n_sh: ["n_sh", "بدون SHC: تعداد صریح ≥۱. با SHC: ۱ مجاز (موقت)، ۲ نامعتبر→۳، ≥۳ برای HA."],
    retention_days: ["روز نگهداری (زمان)", "ستون روز است نه MB. frozenTimePeriodInSecs = روز × ۸۶۴۰۰. حجم Index (maxTotalDataSizeMB) در Calculate از روزانه × روز × headroom حساب می‌شود."],
    hot_warm_days: ["hot_warm_days", "روزهای روی SSD hot/warm؛ مبنای homePath.maxDataSizeMB."],
    cold_days: ["cold_days", "روزهای cold searchable؛ جمع searchable = hot + cold."],
    cold_path_max: ["coldPath.maxDataSizeMB (خودکار)", "بعد از Calculate: = maxTotal − homePath. SCPcalc خودش می‌نویسد."],
    max_total: ["maxTotalDataSizeMB (محاسبه‌ای)", "دستی وارد نمی‌شود؛ از حجم روزانه × retention × headroom. سقف دیسک volume در Policy با available_* است."],
    headroom: ["headroom", "اختیاری روی سقف MB (پیش‌فرض ۱٫۰). فرمول پایه Splunk ندارد؛ ≥۲۰٪ فضای آزاد دیسک را عملاً رعایت کنید."],
    hot_path: ["hot_path", "[volume:hotwarm] path — فقط دیسک محلی/SSD، نه NFS."],
    cold_path: ["cold_path", "[volume:cold] path؛ HDD/NFS مجاز ولی کندتر."],
    frozen_path: ["frozen_path", "مسیر آرشیو فقط اگر آرشیو هنگام Freeze روشن باشد."],
    archive_frozen: ["آرشیو هنگام Freeze", "روشن = coldToFrozenDir و سایز آرشیو با rawdata×۰٫۱۵×روز×RF؛ خاموش = حذف پیش‌فرض Splunk."],
    archive_days: ["روز Archive", "بعد از freeze — فرمول: Daily_Raw × ۰٫۱۵ × روز × (RF در کلاستر). فقط rawdata."],
    archive_single_copy: ["آرشیو تک‌نسخه", "برای coldToFrozenScript سفارشی — بدون ضرب RF در سایز آرشیو."],
    enable_dma: ["DMA / tstats", "پیش‌فرض ES: daily_raw × ۳٫۴ × dma_years روی volume:summaries."],
    dma_pct: ["Override DMA", "۰ = رسمی ES؛ >۰ = درصد legacy از searchable on-disk."],
    dma_years: ["سال‌های DMA", "افق برنامه‌ریزی رسمی ES — ضریب ۳٫۴ به ازای هر سال ingest خام."],
    compression: ["compression", "۰ = خودکار؛ >۰ = ضریب اندازه‌گیری‌شده C."],
    remote_path: ["remote_path", "مسیر object store برای SmartStore."],
    summaries_path: ["summaries_path", "[volume:_splunk_summaries] path — SSD برای DMA/tstats."],
    total_daily_gb: ["total_daily_gb", "حجم مجوز/ingest روزانه به گیگابایت."],
    available_hot_gb: ["volume:hotwarm maxVolumeDataSizeMB", "بودجه دیسک volume hot — نه maxTotal هر Index."],
    available_cold_gb: ["volume:cold maxVolumeDataSizeMB", "بودجه دیسک volume cold."],
    available_summaries_gb: ["volume:_splunk_summaries", "حجم DMA خودکار (کلید JSON قدیمی)."],
    event_bytes: ["event_bytes", "میانگین بایت هر رویداد خام ورودی (قبل از فشرده‌سازی) — نه اندازه روی دیسک. با EPS → GB خام روزانه؛ روی دیسک ≈ همان × Comp (~۵۰٪)."],
    daily_gb: ["daily_gb", "GB/روز حجم خام/لایسنس (pre-indexed) — نه حجم فشرده روی دیسک. روی دیسک ≈ daily_gb × Comp."],
    eps: ["EPS", "رویداد بر ثانیهٔ داده خام ورودی. مستند Splunk از حجم pre-indexed شروع می‌کند بعد ~۵۰٪ برای دیسک. EPS یعنی «GB روی دیسک» نیست."],
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
    ["Archive need (GB · total)", "آرشیو frozen: Daily_Raw × ۰٫۱۵ × روز × RF — فقط rawdata."],
    ["Archive need · per Indexer", "میانگین آرشیو per peer = جمع ÷ N_IDX."],
    ["Hot/Warm need (GB · total)", "بودجه SSD hot/warm — on-disk × روز hot × headroom اختیاری."],
    ["Cold need (GB · total)", "بودجه cold searchable — on-disk × روز cold × headroom اختیاری."],
    ["نیاز Archive (GB · total)", "آرشیو frozen: Daily_Raw × ۰٫۱۵ × روز × RF — فقط rawdata."],
    ["نیاز Archive · per Indexer", "میانگین آرشیو per peer = جمع ÷ N_IDX."],
    ["نیاز DMA (GB · total)", "volume:summaries — فقط DMA رسمی ES (×۳٫۴/year)."],
    ["نیاز Hot/Warm (GB · total)", "بودجه SSD hot/warm — on-disk × روز hot × headroom اختیاری."],
    ["نیاز Cold (GB · total)", "بودجه cold searchable — on-disk × روز cold × headroom اختیاری."],
  ].forEach(([k, body]) => {
    if (fa[k]) fa[k].body = body;
  });
  // Re-apply FA impacts after clone/localize so English impact text is not left behind
  Object.keys(SCP_TIP_IMPACTS.fa).forEach((k) => {
    if (fa[k]) fa[k].impact = SCP_TIP_IMPACTS.fa[k];
  });
})();
