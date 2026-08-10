<div dir="ltr" lang="en" style="text-align:left; font-family: 'Source Sans 3', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height:1.7; max-width:980px;">

<div class="en-doc" style="direction:ltr; text-align:left;">

<nav class="lang-switch" aria-label="Language" style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; font-family:inherit; font-size:0.95rem;">
  <span style="opacity:0.75;">Language:</span>
  <a href="../en/05-Index-Buckets-Retention-and-indexes-conf.md" aria-current="page" style="font-weight:700; text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/05-Index-Buckets-Retention-and-indexes-conf.md" style="text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(default: English)</span>
</nav>

# Index Buckets, Event Size & indexes.conf Retention

> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  
> **Doc channel:** Enterprise **`/latest/`** (resolved **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · synced 2026-07-17  
> **Update:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)

> **References (read first):** [`00-References.md`](00-References.md) — master official citation index  
> **Prerequisites:** [`02-Storage-Sizing.md`](02-Storage-Sizing.md) (TB capacity) → this doc turns those TB into **per-index / per-volume** `indexes.conf` settings.

---

## Table of Contents

- [0) How This Doc Fits the Earlier Stages](#0-how-this-doc-fits-the-earlier-stages)
- [1) Event Size — How to Estimate Daily Volume](#1-event-size--how-to-estimate-daily-volume)
  - [1.1 Official Planning Path (Preferred)](#11-official-planning-path-preferred)
  - [1.2 Event-Count Method (When You Only Have EPS)](#12-event-count-method-when-you-only-have-eps)
  - [1.3 From Daily Raw Volume to On-Disk Index Size](#13-from-daily-raw-volume-to-on-disk-index-size)
- [2) Bucket States (Official Lifecycle)](#2-bucket-states-official-lifecycle)
- [3) How Each Bucket Transition Is Calculated](#3-how-each-bucket-transition-is-calculated)
  - [3.1 Hot → Warm](#31-hot--warm)
  - [3.2 Warm → Cold](#32-warm--cold)
  - [3.3 Cold → Frozen (Retire / Archive)](#33-cold--frozen-retire--archive)
  - [3.4 Frozen → Thawed (Restore)](#34-frozen--thawed-restore)
- [4) Key indexes.conf Settings (What They Really Control)](#4-key-indexesconf-settings-what-they-really-control)
- [5) Volumes — Best-Practice Layout from Prior Sizing](#5-volumes--best-practice-layout-from-prior-sizing)
- [6) Workbook — From Capacity Docs to indexes.conf](#6-workbook--from-capacity-docs-to-indexesconf)
- [7) Review of the Sample Configuration (May Contain Mistakes)](#7-review-of-the-sample-configuration-may-contain-mistakes)
  - [7.1 What Looks Correct](#71-what-looks-correct)
  - [7.2 Problems / Risks](#72-problems--risks)
  - [7.3 Corrected Pattern (Best Practice)](#73-corrected-pattern-best-practice)
- [8) Numeric Example (Windows Index)](#8-numeric-example-windows-index)
- [9) Official References for This Document](#9-official-references-for-this-document)
- [10) Reminder](#10-reminder)

---

## 0) How This Doc Fits the Earlier Stages

```text
01 Infrastructure  →  how many SH / IDX, CPU/RAM floors
02 Storage (TB)    →  how much disk for hot/warm/cold/SmartStore/DMA
03 Disk / media    →  SSD vs HDD, FS, NFS rules
04 IOPS            →  performance of that disk
05 THIS DOC        →  translate TB + retention into indexes.conf
                       (volumes, homePath/coldPath, freeze, archive, buckets)
```

**Rule:** Never invent `maxTotalDataSizeMB` / volume sizes first. Derive them from:

1. Daily license / ingest volume per index (GB/day)  
2. Retention days (searchable)  
3. Compression ≈ **50%** (or measured) from [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)  
4. Cluster RF/SF if applicable (doc `02`)  
5. Separate budget for DMA / `tstats` summaries  

---

## 1) Event Size — How to Estimate Daily Volume

Splunk capacity and storage manuals plan from **daily data volume** (license / ingest GB/day), not from a single fixed “event size.” Event size is only a way to **estimate** that daily volume when you start from EPS (events per second).

### 1.1 Official Planning Path (Preferred)

1. Measure or estimate **Daily_License_GB** (raw data presented to indexing).  
2. Apply compression ≈ **50%** for on-disk hot/warm/cold planning (or measure from a sample bucket).  
3. Multiply by retention days and RF/SF as in doc `02`.

**Source:** [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

### 1.2 Event-Count Method (When You Only Have EPS)

```text
Avg_Event_Bytes  = measured mean size of one event (after parsing / before or as licensed — be consistent)
EPS              = events per second (peak or average — document which)
Daily_Raw_GB     = EPS × 86400 × Avg_Event_Bytes / (1024³)
```

**How to measure average event size (operational best practice):**

- Take a representative sample of the source (Windows Event Log, syslog, JSON, …).  
- Or from Splunk: use license / introspection / `eventcount` + `_raw` length over a known window.  
- Do **not** assume one universal size: Windows Security events, DNS, and firewall logs differ by orders of magnitude.

| Source family (illustrative only — measure yours) | Typical ballpark |
|---|---|
| Short syslog | ~200–500 bytes |
| Windows Event Log | ~0.5–2+ KB |
| Verbose JSON / cloud | often multi-KB |

These ballparks are **not** Splunk-published constants; treat them as placeholders until measured.

### 1.3 From Daily Raw Volume to On-Disk Index Size

```text
Daily_OnDisk_GB ≈ Daily_Raw_GB × 0.5          # non-cluster planning default
# Cluster (doc 02):
Daily_OnDisk_GB ≈ Daily_Raw_GB × (0.15×RF + 0.35×SF)
```

Then:

```text
Index_Searchable_TB ≈ Daily_OnDisk_GB × Retention_Days / 1024
```

That searchable TB is what you encode into `maxTotalDataSizeMB` (plus headroom) and into volume caps.

---

## 2) Bucket States (Official Lifecycle)

An **index** is a set of **buckets**. Each bucket holds a rawdata journal + tsidx (+ metadata) for a limited time range.

| State | Official meaning | Searchable? | Default location idea |
|---|---|---|---|
| **Hot** | Newly indexed data; open for writing; one or more hot buckets per index | Yes | `homePath` (`…/db`) |
| **Warm** | Rolled from hot; not written; many warm buckets | Yes | same `homePath` |
| **Cold** | Rolled from warm; often cheaper storage | Yes | `coldPath` (`…/colddb`) |
| **Frozen** | Rolled from cold; **deleted by default**, or archived if configured | No | archive path / script |
| **Thawed** | Restored from archive for search | Yes | `thawedPath` (`…/thaweddb`) |

**Sources:**  
[How the indexer stores indexes](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes)  
[Set a retirement and archiving policy](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy)

SmartStore note: the cold state does not ordinarily exist the same way; retention is configured differently (see doc `02` + SmartStore retention topics).

---

## 3) How Each Bucket Transition Is Calculated

Settings live in `indexes.conf`. Several limits can fire; **whichever condition is met first** drives the roll (age **or** size).

### 3.1 Hot → Warm

A hot bucket rolls to warm when (among other triggers):

| Control | Official role | Typical values |
|---|---|---|
| `maxDataSize` | Max hot bucket size (MB) before roll | `auto` = **750 MB**; `auto_high_volume` = **10 GB** (64-bit). Spec: use `auto_high_volume` for indexes that get **> ~10 GB/day** |
| `maxHotBuckets` | Max concurrent hot buckets | Default often `auto` / small integer |
| `maxHotIdleSecs` | Roll if idle too long | Optional |
| `maxHotSpanSecs` | Limit time span inside one hot bucket | Optional |
| Indexer restart | Also rolls hot → warm | Operational |

**Calculation mindset:**

```text
Target_Hot_Bucket_MB = maxDataSize   # e.g. 10240 for auto_high_volume on 64-bit
Hot_Buckets_Open    ≤ maxHotBuckets (per pipeline rules in spec)
```

Larger buckets → fewer buckets to search (often better). Too large → slower freeze/move operations. Spec recommends `auto` / `auto_high_volume` rather than arbitrary huge values without Support guidance.

**Source:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf) — `maxDataSize`, `maxHotBuckets`, …

### 3.2 Warm → Cold

Warm buckets stay under `homePath`. They move to `coldPath` when:

| Control | Official role |
|---|---|
| `maxWarmDBCount` | Max number of warm buckets (default **300**). Oldest warm → cold when exceeded. `0` = roll to cold ASAP. Spec max legal **4294967295** |
| `homePath.maxDataSizeMB` | Max size of hot+warm on `homePath`. When exceeded, oldest (by latest time) warm buckets move to cold until under the cap |
| Volume `maxVolumeDataSizeMB` on the hot/warm volume | Can chill buckets across indexes on that volume |

**Calculation mindset:**

```text
Home_Cap_MB ≈ Daily_OnDisk_MB × HotWarm_Days × Safety
# Example: keep ~14 days on SSD hot/warm:
Home_Cap_MB ≈ Daily_OnDisk_MB × 14 × 1.2
```

If you set `maxWarmDBCount` extremely high (e.g. 4294967295), you **disable count-based** warm→cold and rely on **size** (`homePath.maxDataSizeMB` / volume trim). That is valid, but then size caps **must** be correct.

**Source:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf) — `maxWarmDBCount`, `homePath.maxDataSizeMB`

### 3.3 Cold → Frozen (Retire / Archive)

Cold → frozen when **either**:

| Control | Official role |
|---|---|
| `frozenTimePeriodInSecs` | Age: every event in the bucket must be older than this many seconds (default ≈ **6 years**) |
| `maxTotalDataSizeMB` | Size of hot+warm+cold for the index (default **500000** MB). Oldest data freezes when exceeded. **Does not include thawed** |
| `coldPath.maxDataSizeMB` | Cap on cold only; exceeding freezes oldest cold buckets |
| Volume trim on cold volume | Oldest across indexes on that volume |

**Critical official caution:** `maxTotalDataSizeMB` can be hit **before** `frozenTimePeriodInSecs`. Default frozen policy is **delete** → unintended data loss if archive is not configured.

**Archive (keep frozen data):**

- `coldToFrozenDir = /path/to/archive` **or**  
- `coldToFrozenScript = /path/to/script`  
- If both set, **`coldToFrozenDir` wins**

```text
Retention_Days = frozenTimePeriodInSecs / 86400
# Example: 5184000 → 60 days
```

**Sources:**  
[Set a retirement and archiving policy](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy)  
[Archive indexed data](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata)  
[indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf)

### 3.4 Frozen → Thawed (Restore)

Archived buckets can be restored into `thawedPath` (searchable). Official constraint: **`thawedPath` must be a real filesystem path — it may not be defined via a `volume:` stanza.**

**Source:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf) — `thawedPath`; [Restore archived data](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Restorearchiveddata)

---

## 4) Key indexes.conf Settings (What They Really Control)

| Setting | Controls | Planning link |
|---|---|---|
| `homePath` | Hot + warm location | Fast disk (SSD) from docs `02`/`03` |
| `coldPath` | Cold location | Often larger / cheaper disk |
| `thawedPath` | Restored archives | Writable path; **not** `volume:` |
| `maxDataSize` | Hot bucket roll size | `auto` vs `auto_high_volume` by daily volume |
| `homePath.maxDataSizeMB` | Hot+warm footprint | Days on fast disk × daily on-disk |
| `coldPath.maxDataSizeMB` | Cold footprint | Optional; else use index/volume totals |
| `maxTotalDataSizeMB` | Searchable index cap (H+W+C) | Retention × daily on-disk (+ headroom) |
| `frozenTimePeriodInSecs` | Time-based freeze | Retention SLA in seconds |
| `coldToFrozenDir` / `Script` | Archive instead of delete | Compliance / legal hold |
| `maxWarmDBCount` | Warm count before chill | Or set huge + use size caps |
| `tstatsHomePath` | DMA / tsidx summaries | Prefer dedicated summary volume (SSD/NVMe) |
| `[volume:…]` + `maxVolumeDataSizeMB` | Shared disk budget across indexes | Sum of index caps ≤ volume ≤ filesystem |

---

## 5) Volumes — Best-Practice Layout from Prior Sizing

Official volumes let many indexes share one disk budget (`maxVolumeDataSizeMB` trims oldest buckets across indexes that reference that volume).

**Best-practice layout (non-SmartStore):**

```text
[volume:hotwarm]     → SSD/NVMe path   # homePath for indexes
[volume:cold]        → large disk      # coldPath
[volume:summaries]   → SSD/NVMe path   # tstatsHomePath / DMA  ★ separate from cold
# frozen archive     → usually absolute path or dedicated archive mount (not searchable)
```

**Rules of thumb aligned with Splunk docs + common practice:**

1. **One filesystem path → one primary volume role.** Avoid two volume stanzas that both claim the **same** `path=` with large independent `maxVolumeDataSizeMB` (double-counts capacity in your head; both compete for the same free space).  
2. Put **DMA / `tstatsHomePath`** on a **summary** volume (often SSD), not mixed blindly with cold buckets on HDD.  
3. `maxVolumeDataSizeMB` limits databases that **reference** the volume — it is **not** automatically “size of the mount.” Leave filesystem headroom (Splunk also warns indexing can stop when free space is very low — see Reference hardware notes in earlier docs).  
4. `thawedPath` stays an absolute path (cannot be `volume:`).

**Source:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf) — Volumes; [Configure index storage](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage)

---

## 6) Workbook — From Capacity Docs to indexes.conf

```text
Inputs (from docs 01–02):
  D_raw_GB_day_index   = daily license volume for THIS index
  R_days               = searchable retention
  HotWarm_days         = days to keep on fast disk (≤ R_days)
  Comp                 = 0.5 (or measured)
  Headroom             = 1.15 … 1.30

Daily_OnDisk_MB = D_raw_GB_day_index × Comp × 1024

maxTotalDataSizeMB    ≈ Daily_OnDisk_MB × R_days × Headroom
homePath.maxDataSizeMB≈ Daily_OnDisk_MB × HotWarm_days × Headroom
frozenTimePeriodInSecs= R_days × 86400

maxDataSize =
  auto_high_volume   if D_raw_GB_day_index ≳ 10
  auto               otherwise

coldToFrozenDir       = set if you must ARCHIVE instead of delete
tstatsHomePath        = volume:summaries/<index>/datamodel_summary   # if DMA
```

Cluster: inflate Daily_OnDisk using RF/SF formulas from doc `02` before filling these MB fields **per peer** as appropriate to your topology.

---

## 7) Review of the Sample Configuration (May Contain Mistakes)

Sample provided for review:

```ini
[volume:_splunk_summaries]
path = /cold
maxVolumeDataSizeMB = 8600000

[volume:hotwarm]
path = /hot
maxVolumeDataSizeMB = 9300000

[volume:cold]
path = /cold
maxVolumeDataSizeMB = 8600000

[volume:frozen]
path = /frozen

[windows]
homePath = volume:hotwarm/windows/db
coldPath = volume:cold/windows/colddb
thawedPath = /cold/windows/thaweddb
homePath.maxDataSizeMB = 1721600
maxWarmDBCount = 4294967295
frozenTimePeriodInSecs = 5184000
maxDataSize = auto_high_volume
coldToFrozenDir = /frozen/windows/frozendb
tstatsHomePath = volume:_splunk_summaries/windows/datamodel_summary
maxTotalDataSizeMB = 3443200
```

Second fragment:

```ini
[volume:summary]
path=/opt/data/

[_audit]
tstatsHomePath = volume:summary/audit/datamodel_summary
```

### 7.1 What Looks Correct

| Item | Assessment |
|---|---|
| Split `homePath` on `/hot` vs `coldPath` on `/cold` | Aligns with official guidance to put cold on different (often cheaper) storage |
| `thawedPath` as absolute path under `/cold/...` | Satisfies “thawedPath may not be defined in terms of a volume” |
| `frozenTimePeriodInSecs = 5184000` | = **60 days** — clear time policy |
| `maxTotalDataSizeMB = 3443200` (~3.28 TiB) ≈ **2 ×** `homePath.maxDataSizeMB = 1721600` | Consistent with “~half on hot/warm, ~half on cold” for a 60-day searchable window **if** daily on-disk matches (see §8) |
| `maxDataSize = auto_high_volume` | Correct **if** this index truly ingests ≳ ~10 GB/day (per spec guidance) |
| `coldToFrozenDir` set | Archives instead of silent delete — good for retention compliance |
| `maxWarmDBCount = 4294967295` | Effectively disables warm-**count** rolling; size-based via `homePath.maxDataSizeMB` — valid **if** that size is intentional |

### 7.2 Problems / Risks

1. **`volume:_splunk_summaries` and `volume:cold` share `path = /cold` with the same `maxVolumeDataSizeMB = 8600000`.**  
   - Both logical volumes compete for **one** filesystem.  
   - Capacity planning that adds 8600 GB + 8600 GB is **wrong** for a single mount.  
   - DMA summaries on the same HDD cold mount fight cold buckets for IOPS/space (docs `02`/`03` prefer SSD/NVMe for acceleration storage).

2. **`volume:frozen` is unused** by `[windows]` (archive goes to `coldToFrozenDir = /frozen/windows/...`). Harmless clutter, or incomplete if other indexes expected `volume:frozen/...`.

3. **No `coldPath.maxDataSizeMB`.** Relying only on `maxTotalDataSizeMB` + volume trim is OK, but then volume math must be honest (see #1).

4. **Second sample:** `[volume:summary]` has **no** `maxVolumeDataSizeMB` — summaries can grow until the mount fills. `[_audit]` only overrides `tstatsHomePath`; that is fine as a partial stanza **if** paths inherit from defaults/cluster bundle — but confirm `_audit` still has valid `homePath` / `coldPath` / `thawedPath` from default.

5. **Verify the MB numbers against real daily ingest** (next section). Large caps without matching ingest/retention math cause either wasted disk or early freeze.

### 7.3 Corrected Pattern (Best Practice)

```ini
# Fast disk for hot/warm
[volume:hotwarm]
path = /hot
maxVolumeDataSizeMB = <from doc 02 hot/warm budget across indexes>

# Large disk for cold ONLY
[volume:cold]
path = /cold
maxVolumeDataSizeMB = <from doc 02 cold budget across indexes>

# Separate SSD/NVMe for DMA / tstats (do NOT reuse /cold)
[volume:summaries]
path = /summaries
maxVolumeDataSizeMB = <DMA budget from doc 02>

[windows]
homePath = volume:hotwarm/windows/db
coldPath = volume:cold/windows/colddb
thawedPath = /cold/windows/thaweddb
homePath.maxDataSizeMB = <Daily_OnDisk_MB × HotWarm_days × headroom>
maxTotalDataSizeMB = <Daily_OnDisk_MB × R_days × headroom>
frozenTimePeriodInSecs = <R_days × 86400>
maxDataSize = auto_high_volume
coldToFrozenDir = /frozen/windows/frozendb
tstatsHomePath = volume:summaries/windows/datamodel_summary
# maxWarmDBCount: leave default 300 OR keep ultra-high only if size caps are trusted
```

---

## 8) Numeric Example (Windows Index)

From the sample numbers:

```text
R_days                 = 5184000 / 86400 = 60
maxTotalDataSizeMB     = 3443200
homePath.maxDataSizeMB = 1721600

Implied average daily on-disk for this index (if size limit binds near day 60):
  Daily_OnDisk_MB ≈ 3443200 / 60 ≈ 57387 MB/day ≈ 56 GB/day on-disk

Implied daily RAW (≈50% compression planning):
  Daily_Raw_GB ≈ 56 / 0.5 ≈ 112 GB/day   # for THIS index alone, on THIS indexer copy
```

Hot/warm cap ≈ half of total → about **30 days** of on-disk data on `/hot` if growth is steady (`1721600 / 57387 ≈ 30 days`). That is a coherent design **only if** real Windows ingest is near that magnitude. If real ingest is e.g. 10 GB/day raw (~5 GB/day on-disk), these caps are far oversized (wastes reservation / confuses ops) but won’t delete early; if ingest is higher, `maxTotalDataSizeMB` freezes **before** 60 days.

**Event-size cross-check example:**

```text
Assume Avg_Event = 1200 bytes, need Daily_Raw ≈ 112 GB
EPS ≈ 112 × 1024³ / (86400 × 1200) ≈ ≈ 1270 events/s average
```

If your measured Windows EPS×size is far from this, **retune** `maxTotalDataSizeMB` / `homePath.maxDataSizeMB` with the workbook in §6 — do not trust the sample caps blindly.

---

## 9) Official References for This Document

| # | Topic | URL |
|---|---|---|
| 1 | How the indexer stores indexes | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes |
| 2 | Set a retirement and archiving policy | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy |
| 3 | Configure index storage | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage |
| 4 | Archive indexed data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata |
| 5 | Restore archived data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Restorearchiveddata |
| 6 | indexes.conf spec | https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf |
| 7 | Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| 8 | Use multiple partitions for index data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Usemultiplepartitionsforindexdata |

---

## 10) Reminder

Retirement settings can **delete** data without prompting. Always pair size/age caps with an intentional archive policy (`coldToFrozenDir` / script) when compliance requires keep-on-freeze. Validate every MB figure against measured daily volume — sample stanzas from the field are starting points, not ground truth.

</div>
</div>
