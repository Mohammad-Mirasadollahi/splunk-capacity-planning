<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

<div dir="ltr" lang="en" style="text-align:left; font-family: 'Source Sans 3', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height:1.7; max-width:980px;">

<style>
  .en-doc { direction: ltr; text-align: left; }
  .en-doc, .en-doc p, .en-doc li, .en-doc td, .en-doc th {
    font-family: 'Source Sans 3', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    text-align: left;
  }
  .en-doc h1, .en-doc h2, .en-doc h3, .en-doc h4 {
    font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
    text-align: left;
  }
  .en-doc code, .en-doc pre {
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
  }
  .en-doc table { width: 100%; }
</style>

<div class="en-doc">

<nav class="lang-switch" aria-label="Language" style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; font-family:inherit; font-size:0.95rem;">
  <span style="opacity:0.75;">Language:</span>
  <a href="../en/02-Storage-Sizing.md" aria-current="page" style="font-weight:700; text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/02-Storage-Sizing.md" style="text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(default: English)</span>
</nav>


# Splunk Storage Sizing

> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  
> **Doc channel:** Enterprise **`/latest/`** (resolved **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · synced 2026-07-17  
> **Update:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)






> **References (read first):** [`00-References.md`](00-References.md) — master official citation index  
> **Next:** After you know TB totals, configure per-index buckets and retention in [`05-Index-Buckets-Retention-and-indexes-conf.md`](05-Index-Buckets-Retention-and-indexes-conf.md).

---

## Table of Contents

- [0) Splunk Storage Logic at a Glance](#0-splunk-storage-logic-at-a-glance)
- [1) Official Compression Model](#1-official-compression-model)
  - [1.1 Official File Ratios](#11-official-file-ratios)
  - [1.2 Base Formula (Non-Cluster)](#12-base-formula-non-cluster)
  - [1.3 Inputs Required for Index Storage Planning](#13-inputs-required-for-index-storage-planning)
- [2) Measuring Real Compression from a Sample (Official Method)](#2-measuring-real-compression-from-a-sample-official-method)
  - [2.1 On *nix](#21-on-nix)
  - [2.2 On Windows](#22-on-windows)
- [3) Storage Types by Role and Bucket Tier](#3-storage-types-by-role-and-bucket-tier)
  - [3.1 Official Disk Type Table](#31-official-disk-type-table)
  - [3.2 Data Aging (Hot → Warm → Cold → Frozen)](#32-data-aging-hot--warm--cold--frozen)
- [4) Storage in an Indexer Cluster (Replication Factor and Search Factor)](#4-storage-in-an-indexer-cluster-replication-factor-and-search-factor)
  - [4.1 Which Files Are Replicated?](#41-which-files-are-replicated)
  - [4.2 Cluster Storage Formula (From Official Ratios + RF/SF Behavior)](#42-cluster-storage-formula-from-official-ratios--rfsf-behavior)
  - [4.3 Hot Buckets in a Cluster](#43-hot-buckets-in-a-cluster)
  - [4.4 Multisite](#44-multisite)
- [5) SmartStore Storage Sizing](#5-smartstore-storage-sizing)
  - [5.1 Hybrid Model](#51-hybrid-model)
  - [5.2 Local Cache Size (Official Recommended Formula)](#52-local-cache-size-official-recommended-formula)
  - [5.3 Enterprise Security Cache Exception](#53-enterprise-security-cache-exception)
  - [5.4 Remote Object Store](#54-remote-object-store)
  - [5.5 SmartStore Infrastructure Considerations Related to Storage](#55-smartstore-infrastructure-considerations-related-to-storage)
- [6) Storage for Premium Apps](#6-storage-for-premium-apps)
  - [6.1 Enterprise Security — Data Model Acceleration (DMA)](#61-enterprise-security--data-model-acceleration-dma)
  - [6.2 ITSI — Summary / KV Store / Internal Indexes](#62-itsi--summary--kv-store--internal-indexes)
- [7) Search Head Storage](#7-search-head-storage)
- [8) Storage Calculation Workbook (Operational Formulas)](#8-storage-calculation-workbook-operational-formulas)
  - [8.1 Non-Clustered Indexers](#81-non-clustered-indexers)
  - [8.2 Clustered Indexers (rawdata/TSIDX Model)](#82-clustered-indexers-rawdatatsidx-model)
  - [8.3 Splitting Hot/Warm vs Cold (Optional but Recommended)](#83-splitting-hotwarm-vs-cold-optional-but-recommended)
  - [8.4 SmartStore](#84-smartstore)
  - [8.5 Final Total per Indexer (Capacity Checklist)](#85-final-total-per-indexer-capacity-checklist)
- [9) End-to-End Examples](#9-end-to-end-examples)
  - [Example A — Core Splunk, No Cluster](#example-a--core-splunk-no-cluster)
  - [Example B — Cluster RF=3 SF=2, No SmartStore](#example-b--cluster-rf3-sf2-no-smartstore)
  - [Example C — SmartStore + ES](#example-c--smartstore--es)
  - [Example D — Aligned with ES Small Table](#example-d--aligned-with-es-small-table)
- [10) Virtualized / Shared Storage IOPS (Operational Capacity)](#10-virtualized--shared-storage-iops-operational-capacity)
- [11) Storage Decision Flow](#11-storage-decision-flow)
- [12) Official References for This Document](#12-official-references-for-this-document)
- [13) Reminder](#13-reminder)

---

## 0) Splunk Storage Logic at a Glance

```text
Raw incoming data (license / ingest volume)
        │
        ▼
   Indexing process
   ┌────────────────────────────┐
   │ rawdata  ≈ 15% of original │  ← compressed events
   │ TSIDX    ≈ 35% of original │  ← index terms
   │ combined ≈ 50% of original │  ← official planning rule
   └────────────────────────────┘
        │
        ▼
   Bucket lifecycle: Hot → Warm → Cold → Frozen
        │
        ├── No cluster:  space ≈ D × Days × 0.5
        ├── Cluster:    space ≈ D × Days × (0.15×RF + 0.35×SF)
        └── SmartStore: local cache (working-set days) + remote object store (full retention)
```

---

## 1) Official Compression Model

### 1.1 Official File Ratios

During ingest, indexing creates several on-disk file types:

| File | Contents | Approximate ratio to pre-indexed data |
|---|---|---|
| **rawdata** | Source data as compressed events | **≈ 15%** |
| **TSIDX (index files)** | Terms pointing into rawdata | **≈ 35%** |
| **Combined** | rawdata + TSIDX | **≈ 50%** |

Official documentation notes that data structure and fields affect compression, and customers typically have diverse sources with different compression characteristics. For storage planning, **aggregate compression remains 50%**.

**Source:**  
[Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements) — Capacity Planning Manual (rawdata 15% / TSIDX 35% / combined ~50%)

### 1.2 Base Formula (Non-Cluster)

Disk allocation guidance:

```text
Storage_GB ≈ Daily_License_GB × Retention_Days × 0.5
```

Equivalent form:

```text
Storage_GB ≈ (Daily_License_GB × Retention_Days) / 2
```

**Official documentation example:**  
Retaining 30 days at ingest = 100 GB/day:

```text
Storage = 100 × 30 / 2 = 1,500 GB = 1.5 TB
```

With 2 indexers, divide equally:

```text
Per_Indexer = 1,500 / 2 = 750 GB
```

> This example does not include OS space, other software thresholds, or non-Splunk considerations.

**Source:**  
Same *Estimate your storage requirements* page — 100 GB/day × 30 days example paragraph

### 1.3 Inputs Required for Index Storage Planning

Per the same manual, plan index capacity using:

1. Data volume per day (license basis)
2. Retention period
3. Number of indexers
4. (Optional) Data value / search speed needs / audit or archive requirements
5. (Optional) Measured compression from a sample
6. (Optional) Index cluster → additional calculations
7. (Optional) SmartStore
8. (Optional) Enterprise Security → DMA storage and retention

**Source:**  
[Estimate your storage requirements → Planning the index storage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

---

## 2) Measuring Real Compression from a Sample (Official Method)

To replace the default 50% with your environment’s measured ratio:

### 2.1 On *nix

1. Take a sample from a data source and note its on-disk size.
2. Index the sample (file monitor or one-shot).
3. Go to `$SPLUNK_HOME/var/lib/splunk/defaultdb/db`
4. Run: `du -ch hot_v*` and read the `total` line.
5. Compare sample size to indexed size.

### 2.2 On Windows

Documentation describes using `du.exe` from Microsoft TechNet and `for /d` loops over `hot_v*` to sum rawdata, then `dir /s` for total index size.

**Output:** ratio `Indexed_Size / Sample_Size` = your measured compression factor (`C`). Then:

```text
Storage_GB ≈ Daily_GB × Retention_Days × C
```

**Source:**  
[Estimate your storage requirements → Use a data sample to calculate compression](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

---

## 3) Storage Types by Role and Bucket Tier

### 3.1 Official Disk Type Table

| Role / tier | Recommended type | Notes |
|---|---|---|
| Search Head | SSD or HDD (≥800 IOPS) | Minimum 300 GB dedicated; busy SH → SSD |
| Indexer Hot + Warm + DMA | **SSD** | Default path shared for hot/warm and data model acceleration |
| SmartStore local | **NVMe or SSD** + remote object store | Short-term cache + bucket retrieval from cloud |
| Cold | HDD / SAN / NAS / NFS | Lower cost/slower; search is slower |
| Frozen | SAN / NAS / NFS / HDD | Archive; default delete |

**Critical rules:**

- Splunk install volume ≥ **800 sustained IOPS**
- Index storage separate from OS/swap
- Maintain free space; indexing **stops** if index volume free space < **5 GB**
- **Never** place hot/warm on a network volume (hurts indexing latency)
- NFS/DFS acceptable for cold, with slower search

**Source:**  
[Reference hardware → What storage type should I use for a role? / Notes about optimizing…](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.2 Data Aging (Hot → Warm → Cold → Frozen)

From bucket architecture:

| Stage | Practical storage meaning |
|---|---|
| **Hot** | Actively written; fastest disk (SSD) |
| **Warm** | Read-only for search; usually same volume as hot |
| **Cold** | Moved from warm by space/time policy; may use separate, cheaper volume |
| **Frozen** | Archive or delete; not searchable unless restored |

**Source (bucket stages):**  
[Buckets and indexer clusters → Bucket stages](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters)

Cross-references on that page point to *How the indexer stores indexes*, *Storage considerations*, and *Configure index storage*.

For `maxHotSpanSecs`, `maxDataSize`, `frozenTimePeriodInSecs`, `homePath`/`coldPath`/`thawedPath`, see *Managing Indexers and Clusters → How the indexer stores indexes / Configure index storage*.

---

## 4) Storage in an Indexer Cluster (Replication Factor and Search Factor)

### 4.1 Which Files Are Replicated?

From **Buckets and indexer clusters**:

- Each bucket contains at least:
  - **rawdata** (compressed processed events plus information needed to rebuild the index)
  - **index/TSIDX files** (on searchable copies only)
- **All** copies (searchable and non-searchable) hold rawdata.
- Only **searchable** copies hold TSIDX.
- If `searchFactor = 1`, target peers keep rawdata only (saves space).
- If `searchFactor > 1`, multiple peers build TSIDX.

Conceptual official example: `RF=3`, `SF=2` → three rawdata copies; two searchable copies (with TSIDX).

**Source:**  
[Buckets and indexer clusters → Data files / Bucket searchability](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters)

### 4.2 Cluster Storage Formula (From Official Ratios + RF/SF Behavior)

Combining:

- 15% / 35% ratios in *Estimate your storage requirements*
- File distribution by RF/SF in *Buckets and indexer clusters*

For the whole cluster (sum of all peer disk, before per-node split):

```text
Cluster_Storage_GB =
    Daily_Ingest_GB
  × Retention_Days
  × ( 0.15 × ReplicationFactor  +  0.35 × SearchFactor )
```

**Interpretation:**

- For each day of ingest, rawdata footprint scales as `0.15 × RF`
- TSIDX footprint scales as `0.35 × SF`

#### Non-cluster special case

`RF=1`, `SF=1`:

```text
0.15×1 + 0.35×1 = 0.50
```

This matches the official 50% rule.

#### Cluster numeric example

Assume: `D=500 GB/day`, `Days=90`, `RF=3`, `SF=2`

```text
Multiplier = 0.15×3 + 0.35×2 = 0.45 + 0.70 = 1.15
Cluster_Storage = 500 × 90 × 1.15 = 51,750 GB ≈ 50.5 TB
```

With 5 balanced peers:

```text
Per_Peer ≈ 51,750 / 5 ≈ 10,350 GB ≈ 10.1 TB
```

> **Reference note:** *Estimate your storage requirements* directs you to *Storage requirement examples* in Managing Indexers and Clusters for index clusters. The formula above is the standard Splunk model from official rawdata/TSIDX percentages and RF/SF policy. Validate numbers against *Storage requirement examples* for your Enterprise version at implementation time.

**Sources for the formula:**  
1. [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements) — percentages and cluster pointer  
2. [Buckets and indexer clusters](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters) — rawdata on all copies, TSIDX on searchable copies

### 4.3 Hot Buckets in a Cluster

In SmartStore system requirements (and generally for clusters), hot buckets follow replication/search factor policy and use **more space per bucket** than a warm bucket of the same size.

**Source:**  
[SmartStore system requirements → Local storage requirements (indexer clusters bullets)](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

### 4.4 Multisite

In multisite deployments, primary set counts and site replication policy can create more copies than single-site. Bucket documentation explains that each site maintains its own primary set for search affinity.

For precise multisite sizing, read RF/SF in a **site-aware** way from `indexes.conf` / cluster manager and apply the multiplier using actual rawdata and searchable copy counts.

**Source:**  
[Buckets and indexer clusters → primacy / multisite note](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters)

---

## 5) SmartStore Storage Sizing

### 5.1 Hybrid Model

SmartStore:

- Short-term read/write and cache for object-store retrieval → **local NVMe/SSD**
- Long-term bucket retention → **remote object store** (S3 / GCS / Azure Blob / S3-compatible)

**Source:**  
[Reference hardware → Indexer: SmartStore](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

### 5.2 Local Cache Size (Official Recommended Formula)

Documentation states local storage for cached data should match the **expected working set**.

**Recommended for best results:**

```text
Local_Cache_GB ≈ Daily_Indexed_GB × 30
```

Because indexed size is typically about **50%** of ingest:

```text
Daily_Indexed_GB ≈ 0.5 × Daily_Ingest_GB
Local_Cache_GB  ≈ 0.5 × Daily_Ingest_GB × 30
               ≈ Daily_Ingest_GB × 15
```

**Official example:** If an indexer adds about 100 GB/day **indexed** → recommended cache **3000 GB**.

**Minimum:** At least **7–10 days** of data in cache (searches often target the last 7–10 days).

### 5.3 Enterprise Security Cache Exception

With **Splunk Enterprise Security**, provision local cache for **90 days** of indexed data instead of 30:

```text
Local_Cache_ES_GB ≈ Daily_Indexed_GB × 90
                 ≈ 0.5 × Daily_Ingest_GB × 90
                 ≈ Daily_Ingest_GB × 45
```

**Source:**  
[SmartStore system requirements → Local storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements) — *For use with Splunk Enterprise Security, provision enough local storage to accommodate 90 days' worth of indexed data, rather than the otherwise recommended 30 days.* Indexed size ≈ 50% of ingest; cross-reference to estimating storage requirements.

### 5.4 Remote Object Store

```text
Remote_Store_GB ≈ Daily_Ingest_GB × Retention_Days × Cluster_Multiplier
```

With SmartStore, most retention lives on remote storage; local disk is cache/working set only. Apply `Cluster_Multiplier` using the same RF/SF logic (and SmartStore warm-on-remote behavior) for your cluster design. Each cluster must use a unique `path` in `indexes.conf` (sharing paths across clusters is not supported).

**Source:**  
Same page — CAUTION on unique `path`; Remote store requirements

### 5.5 SmartStore Infrastructure Considerations Related to Storage

| Item | Official value/rule |
|---|---|
| Network to remote store | **10 Gbps** per indexer for optimal performance |
| Port | Standard HTTPS to object store |
| Local disk type on-prem | SSD preferred |
| AWS | NVMe SSD instance storage (e.g., i3en/i3) |
| GCP | n1-highmem-64/32 + zonal SSD PD |
| Azure | E-series (Edv4/Edsv4) + SSD |
| Cache partition | Cache shares a partition with OS, Splunk binaries, artifacts, and non-SmartStore indexes → include in sizing |

**Source:**  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 6) Storage for Premium Apps

### 6.1 Enterprise Security — Data Model Acceleration (DMA)

#### Storage location

Reference hardware places **data model acceleration** storage on the same volume as indexer hot/warm by default → must be **SSD** and counted in hot/warm capacity.

**Source:**  
[Reference hardware → Indexer: Hot and warm index storage, data model storage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

#### Capacity Planning pointer for DMA

*Estimate your storage requirements* states that if you run ES:

> See **Data model acceleration storage and retention** in the Install and Upgrade Splunk Enterprise Security manual.

**Source:**  
[Estimate your storage requirements → Planning the index storage (optional ES bullet)](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

#### Official ES constraints on DMA

From ES Performance reference:

- DMA uses indexer processing and storage; accelerated data is stored in indexes.
- DMA load depends on accelerated data model count, data type, cardinality, and volume.
- Limit DMA to specific indexes for better performance.
- For additional space: see **Data model acceleration storage and retention**.
- TSIDX retention settings do not change DMA retention.

**Source:**  
[Performance reference for Splunk Enterprise Security → Constraints on data model acceleration / retention](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

#### Practical calculation (mandatory ES DMA page reference)

```text
1) List accelerated data models in ES/CIM
2) For each DM: read Daily_Volume_in_DM and Summary_Retention_Days from
   datamodels.conf / ES "Data model acceleration storage and retention"
3) Calculate Storage_DMA per ES page formulas and sum
4) Add Storage_DMA to SSD hot/warm capacity on each indexer
```

> Because ES versions differ, take exact DMA multipliers from **Data model acceleration storage and retention** for your ES version rather than guessing constants here.

### 6.2 ITSI — Summary / KV Store / Internal Indexes

| Item | Storage requirement | Source |
|---|---|---|
| Free space in `$SPLUNK_HOME` | Minimum **30 GB** (KV store and local SH data) | [Plan your ITSI deployment → KV store size limits](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment) |
| `itsi_summary` and KPI data | Best practice: forward from SH to indexers; space on indexer tier | Same doc → Forward search head data |
| KV store batch limits | `max_size_per_batch_save_mb` (default 50 MB); 1.5× if needed | KV store section |
| `max_size_per_result_mb` | Default 500 MB; guidance ~500 MB per 1,000 KPIs | Same section |
| Event Analytics internal license stack | Internal notable/episode volume on separate stack; not counted against daily license | License requirements |

For ITSI summary index disk, read retention per ITSI index in *Configure indexes in ITSI* and sum using the base 50% formula (or RF/SF).

---

## 7) Search Head Storage

Official minimums:

- ≥ **300 GB** dedicated storage
- Heavy ad-hoc/scheduled search → **SSD**
- If HDD → ≥ **800 sustained IOPS**
- Splunk install volume separately ≥ 800 IOPS

On a dedicated ITSI SH, also maintain ≥ **30 GB** free in `$SPLUNK_HOME` for KV store.

**Source:**  
[Reference hardware → Search Head storage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[Plan your ITSI deployment → KV store size limits](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

---

## 8) Storage Calculation Workbook (Operational Formulas)

Definitions:

```text
D      = Daily ingest (GB/day)   # license volume
R      = Retention in hot+warm+cold searchable days
C      = Compression factor     # default 0.50; or from sample
RF     = Replication Factor     # 1 if non-cluster
SF     = Search Factor          # 1 if non-cluster
N_IDX  = Number of indexers / peers
```

### 8.1 Non-Clustered Indexers

```text
Total_Index_Storage_GB = D × R × C
Per_Indexer_GB         = Total_Index_Storage_GB / N_IDX
```

Default: `C = 0.5`

### 8.2 Clustered Indexers (rawdata/TSIDX Model)

```text
M = 0.15×RF + 0.35×SF
Total_Cluster_Storage_GB = D × R × M
Per_Peer_GB              = Total_Cluster_Storage_GB / N_IDX
```

### 8.3 Splitting Hot/Warm vs Cold (Optional but Recommended)

If `R_hotwarm` days stay on SSD and the remainder to `R_total` goes to cold:

```text
SSD_GB  = D × R_hotwarm × M
Cold_GB = D × (R_total - R_hotwarm) × M_cold
```

Usually use the same `M` for cold unless using tsidx reduction (which can limit some ES searches — see ES Performance reference).

### 8.4 SmartStore

```text
# Indexed daily estimate (official ≈ 50%)
D_indexed = 0.5 × D

# Local cache per indexer (balanced distribution assumed)
Cache_Days = 90 if ES else 30          # per SmartStore system requirements
# Operational minimum:
Cache_Days = max(Cache_Days, 7..10)

Local_Cache_Total_GB = D_indexed × Cache_Days
Local_Cache_Per_IDX  = Local_Cache_Total_GB / N_IDX
# + OS/binaries/artifacts on same partition

Remote_GB ≈ D × R × M_remote           # long-term retention on object store
```

### 8.5 Final Total per Indexer (Capacity Checklist)

```text
Per_Indexer_Provision_GB =
    Per_Indexer_Index_or_Cache_GB
  + DMA_Share_GB                 # if ES
  + ITSI_Index_Share_GB          # if ITSI indexes on same tier
  + OS_and_Splunk_Binaries_GB
  + Headroom_GB                  # practical: 15–25% free; never approach 5 GB threshold
```

---

## 9) End-to-End Examples

### Example A — Core Splunk, No Cluster

```text
D=200 GB/day, R=90 days, N_IDX=2, C=0.5

Total = 200 × 90 × 0.5 = 9,000 GB = 9 TB
Per_IDX = 4.5 TB  (+ OS + headroom)
Disk type: SSD for hot/warm
```

**Source logic:** [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

### Example B — Cluster RF=3 SF=2, No SmartStore

```text
D=1,000 GB/day, R=365 days, N_IDX=10
M = 0.15×3 + 0.35×2 = 1.15

Total = 1000 × 365 × 1.15 = 419,750 GB ≈ 410 TB
Per_Peer ≈ 41 TB
```

**Source logic:** Estimate (15/35) + Buckets/clusters (RF/SF files)

### Example C — SmartStore + ES

```text
D=2,000 GB/day, N_IDX=24, ES enabled, Retention remote=1 year

D_indexed/day total ≈ 1000 GB
Cache_Days = 90
Local_Cache_Total ≈ 1000 × 90 = 90,000 GB = 90 TB
Per_IDX local ≈ 90 TB / 24 ≈ 3.75 TB SSD/NVMe
  (+ binaries/OS on same partition)

Remote object store ≈ per M and SmartStore replication design for 365 days
Network: 10 Gbps per indexer to object store
```

**Source:** [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements) (90-day ES cache, 50% indexed, 10 Gbps)

### Example D — Aligned with ES Small Table

From Infrastructure doc: Small ES = 300 GB/day, 3 indexers.  
Assume searchable hot/warm+cold retention = 90 days, RF=3 SF=2:

```text
M=1.15
Total = 300 × 90 × 1.15 = 31,050 GB ≈ 30.3 TB
Per_IDX ≈ 10.1 TB SSD-capable storage
+ DMA (from ES DMA page)
```

---

## 10) Virtualized / Shared Storage IOPS (Operational Capacity)

Insufficient storage I/O is the most common Splunk infrastructure bottleneck.

Official shared-array example:

- 10 indexers at SSD-level performance
- Need about **4000 IOPS × 10 = 40,000 concurrent IOPS** for indexers alone
- Plus IOPS for other workloads on the same array

For ES on VMs: test IOPS on **all indexer nodes simultaneously**; thick provisioning is preferred.

**Source:**  
[Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[ES Performance reference → virtualized environments](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

For test methodology, Reference hardware points to *How to test my storage system using FIO* on Splunk Answers.

---

## 11) Storage Decision Flow

```text
START
  ├─ Collect D, R, N_IDX, Apps, Cluster?, SmartStore?
  ├─ C = 0.5 or measure from sample
  │
  ├─ if SmartStore:
  │     Local = D_indexed × (90 if ES else 30)   # min 7-10 days
  │     Remote = f(D, R, RF/SF, object-store design)
  │     Local disk = NVMe/SSD
  │
  ├─ else if Cluster:
  │     Total = D × R × (0.15×RF + 0.35×SF)
  │     Split hot/warm SSD vs cold HDD/NAS
  │
  ├─ else:
  │     Total = D × R × C
  │
  ├─ if ES: add DMA from ES "Data model acceleration storage and retention"
  ├─ if ITSI: add ITSI index retention + 30 GB KV on SH
  ├─ add OS/binaries/headroom; enforce >> 5 GB free
  └─ validate IOPS (≥800 install; hot/warm SSD; cluster latency limits)
END
```

---

## 12) Official References for This Document

| # | Document | Section | Use in storage sizing | URL |
|---|---|---|---|---|
| 1 | Estimate your storage requirements | Full topic | 15%/35%/50%, base formula, sample, cluster/ES/SmartStore pointers | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| 2 | Reference hardware | Storage type by role + notes | Disk types, 800 IOPS, 300 GB SH, no NFS for hot/warm, stop below 5 GB | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| 3 | Buckets and indexer clusters | Data files / stages / searchability | RF rawdata copies, SF TSIDX copies, aging | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| 4 | SmartStore system requirements | Local / remote / network | 30-day cache, ES 90-day, 50% indexed, 10 Gbps | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| 5 | Performance reference for Splunk Enterprise Security | DMA constraints | DMA location, pointer to DMA retention sizing | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| 6 | Plan your ITSI deployment | KV store / index forwarding | 30 GB free, summaries on indexers | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| 7 | Storage requirement examples | Managing Indexers | Cluster calculation validation | Linked from Estimate your storage requirements |
| 8 | Data model acceleration storage and retention | ES Install Manual | DMA space calculation | Linked from Estimate and ES Performance reference |

---

## 13) Reminder

- 50% is an **aggregate planning estimate**, not a per-sourcetype guarantee.
- For production, replace initial estimates with sample compression measurement and ongoing disk/IOPS monitoring.
- The 5 GB free threshold is a hard stop for indexing; maintain much higher operational headroom.

</div>
</div>
