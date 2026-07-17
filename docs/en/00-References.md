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
  <a href="../en/00-References.md" aria-current="page" style="font-weight:700; text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/00-References.md" style="text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(default: English)</span>
</nav>


# Official References (Read First)

> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  
> **Doc channel:** Enterprise **`/latest/`** (resolved **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · synced 2026-07-17  
> **Update:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)


> **Canonical premium apps:** ES planning is on **help.splunk.com ES 8.5** (classic `/ES/latest/Install/DeploymentPlanning` on docs.splunk.com does not resolve). ITSI Plan is on **help.splunk.com ITSI 5.0** (ahead of docs.splunk.com `/ITSI/latest/` when that still resolves to 4.21.x). Bump with `--es-version` / `--itsi-version`.



---

## Table of Contents

- [0) How to Use This Reference File](#0-how-to-use-this-reference-file)
- [1) Local Docs ↔ Official Sources Map](#1-local-docs--official-sources-map)
- [2) Primary Official Sources (Clickable)](#2-primary-official-sources-clickable)
- [3) Claim → Source Cheat Sheet](#3-claim--source-cheat-sheet)
- [4) Full Canonical URL Table](#4-full-canonical-url-table)
- [5) In-Document Citation Rule](#5-in-document-citation-rule)

---

## 0) How to Use This Reference File

1. Start here when you need the **official Splunk URL** for any claim.  
2. Then open the matching local guide (`01`–`04`).  
3. Every local guide also cites sources **inline** next to each section; this file is the **front index**.  
4. Enterprise Capacity links use `/latest/` (today **10.4**). ES/ITSI use help.splunk.com (**8.5** / **5.0**).

**Reading order:**

```text
00-References  →  01-Infrastructure  →  02-Storage (TB)  →  03-Disk/Media  →  04-IOPS  →  05-Index/Buckets/indexes.conf
```

**Companion calculator (SCPcalc):** open the live UI at [`/calc/`](../../calc/) (GitHub Pages). Fill topology, retention, optional totals/disk budgets, and sources in one wizard (no exclusive “mode”). Use **Export URL** to share a plan link, or **Import** to paste it back. Details: [`scpcalc/README.md`](../../scpcalc/README.md#save--export--import).

---

## 1) Local Docs ↔ Official Sources Map

| Local doc | Primary official manuals |
|---|---|
| [01-Infrastructure-Sizing](01-Infrastructure-Sizing.md) | Capacity Planning (Intro, Dimensions, Components, Reference hardware, Performance summary); ES 8.5 planning (min specs / scaling / performance); ITSI 5.0 Plan; SmartStore system requirements |
| [02-Storage-Sizing](02-Storage-Sizing.md) | Estimate your storage requirements; Buckets and indexer clusters; SmartStore system requirements; Reference hardware; ES / ITSI |
| [03-Disk-Media-IOPS-and-Storage-Topology](03-Disk-Media-IOPS-and-Storage-Topology.md) | Reference hardware (storage types); System requirements (FS / NFS / CIFS); SmartStore; ES virtualization |
| [04-IOPS-Sizing-by-Storage-Architecture](04-IOPS-Sizing-by-Storage-Architecture.md) | Reference hardware (800 IOPS, 4000×N); System requirements; SmartStore; ES concurrent IOPS / thick provision |
| [05-Index-Buckets-Retention-and-indexes-conf](05-Index-Buckets-Retention-and-indexes-conf.md) | How indexes are stored; retirement/archiving; Configure index storage; indexes.conf; Estimate storage (event→GB/day) |

---

## 2) Primary Official Sources (Clickable)

### Capacity Planning Manual

| Topic | URL |
|---|---|
| Introduction to capacity planning | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| Dimensions of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| Components of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| **Reference hardware** | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| Summary of performance recommendations | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |

### Installation Manual

| Topic | URL |
|---|---|
| System requirements (filesystems, NFS, CIFS, VM I/O) | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |

### Managing Indexers and Clusters

| Topic | URL |
|---|---|
| Buckets and indexer clusters | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| SmartStore system requirements | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| About SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/AboutSmartStore |

### Distributed Search

| Topic | URL |
|---|---|
| Whether to colocate management components | https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents |

### Premium Apps

| Topic | URL |
|---|---|
| ES minimum specifications (production) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| ES considerations for scaling deployments | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| ES Performance reference | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| Plan your ITSI deployment (5.0) | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| PCI deployment planning | https://docs.splunk.com/Documentation/PCI/latest/Install/DeploymentPlanning |

---

## 3) Claim → Source Cheat Sheet

| Claim used in this pack | Official source |
|---|---|
| Insufficient storage I/O is the most common limitation | Reference hardware → storage type section |
| Hot/warm (+ DMA) → **SSD**; SmartStore local → **NVMe or SSD** | Reference hardware storage-type table |
| Install volume / HDD SH → **≥ 800 sustained IOPS** | Reference hardware notes |
| Search Head → **≥ 300 GB** dedicated | Reference hardware storage-type table |
| Never hot/warm on network volumes; NFS/DFS OK for cold (slower search) | Reference hardware notes |
| Indexing stops if index volume free space **&lt; 5 GB** | Reference hardware notes |
| Shared SSD-level array ≈ **4000 IOPS × N indexers** | Reference hardware → Virtualized Infrastructures |
| Indexer VM ingest ~**10–15%** slower than bare metal | Reference hardware → Virtualized Infrastructures |
| Cluster latency: indexer **≤ 100 ms**, SHC **≤ 200 ms** | Reference hardware → Network latency limits |
| Compression planning ≈ **15% rawdata + 35% TSIDX ≈ 50%** | Estimate your storage requirements |
| Example: 100 GB/day × 30 days → **1.5 TB** | Estimate your storage requirements |
| RF copies carry rawdata; SF searchable copies carry TSIDX | Buckets and indexer clusters |
| SmartStore cache **30 days** indexed; **90 days** with ES | SmartStore system requirements |
| SmartStore network prefer **10 Gbps** | SmartStore system requirements |
| NFS: no hot/warm; hard mounts only; no WAN; no soft mounts | System requirements → NFS |
| Prefer **block-level** storage over file-level for indexing | System requirements → NFS |
| Linux index FS: ext3/ext4/btrfs/XFS (+ NFS with caveats) | System requirements → Supported file systems |
| ES: SH/IDX ≥ **16 physical cores / 32 GB / 32 vCPU** | ES 8.5 minimum specifications |
| CPU sizing basis = **physical cores**; with HT assign **2× vCPU** | Reference hardware paired tables + ES min specs (16 physical / 32 vCPU) |
| Hypervisor: **reserve** CPU/RAM; **do not oversubscribe** | Reference hardware virtualization + ES performance reference |
| Splunk pipeline/parallelization only with **spare CPU above minimum** | Reference hardware pipeline sets; ITSI Plan parallelization note |
| ES scaling table uses **detections** (not correlation-search label) | ES 8.5 considerations for scaling |
| ES: thick preferred; concurrent IOPS test on all indexers | ES 8.5 Performance reference |
| ITSI HW minima; KPI sizing example tables; KV ≥ **30 GB** free | ITSI 5.0 Plan |
| Performance SH×IDX count table by users × daily volume | Summary of performance recommendations |
| Min reference indexer ~**300 GB/day** with search load | Summary of performance recommendations / Reference hardware |
| Index bucket lifecycle Hot→Warm→Cold→Frozen→Thawed | How the indexer stores indexes / Retirement policy |
| `maxDataSize` auto=750MB; auto_high_volume=10GB (64-bit); use high-volume if ≳10GB/day | indexes.conf |
| Freeze by age (`frozenTimePeriodInSecs`) **or** size (`maxTotalDataSizeMB`) — whichever first | Set a retirement and archiving policy |
| Default frozen policy deletes unless `coldToFrozenDir` / script | Archive indexed data |
| `thawedPath` cannot use `volume:` | indexes.conf |
| Daily volume from EPS × avg event bytes; on-disk ≈ 50% of raw for planning | Estimate your storage requirements + event-count method in doc 05 |

---

## 4) Full Canonical URL Table

Same IDs as [`VERSION.md`](../../VERSION.md):

| ID | Title | Canonical latest URL |
|---|---|---|
| cap-intro | Introduction to capacity planning | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| cap-dimensions | Dimensions of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| cap-components | Components of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| cap-reference-hw | Reference hardware | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| cap-perf-summary | Summary of performance recommendations | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| cap-storage-estimate | Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| install-sysreq | System requirements | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |
| idx-buckets-clusters | Buckets and indexer clusters | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| idx-smartstore-req | SmartStore system requirements | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| idx-smartstore-about | About SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/AboutSmartStore |
| dist-colocate-mgmt | Colocate management components | https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents |
| es-min-specs | ES minimum specifications (production) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| es-scaling | ES considerations for scaling deployments | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| es-perf-ref | ES Performance reference | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| itsi-plan | Plan your ITSI deployment (5.0) | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| idx-how-stores | How the indexer stores indexes | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes |
| idx-retire | Set a retirement and archiving policy | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy |
| idx-configure-storage | Configure index storage | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage |
| idx-archive | Archive indexed data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata |
| admin-indexes-conf | indexes.conf | https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf |
| pci-plan | PCI deployment planning | https://docs.splunk.com/Documentation/PCI/latest/Install/DeploymentPlanning |

---

## 5) In-Document Citation Rule

In guides `01`–`05`, every substantive section must include either:

- **Source:** / **ارجاع:** with a link to one of the URLs above, **or**  
- A pointer back to this file plus the claim row in §3  

Engineering-only helpers (e.g. RAID write-penalty algebra in doc `04`) must stay labeled **ENGINEERING** and must not be presented as Splunk RAID mandates.

---

## Continue to sizing guides

1. [01 — Infrastructure Sizing](01-Infrastructure-Sizing.md)  
2. [02 — Storage Sizing](02-Storage-Sizing.md)  
3. [03 — Disk Media, IOPS & Topology](03-Disk-Media-IOPS-and-Storage-Topology.md)  
4. [04 — IOPS by Storage Architecture](04-IOPS-Sizing-by-Storage-Architecture.md)  
5. [05 — Index Buckets, Event Size & indexes.conf](05-Index-Buckets-Retention-and-indexes-conf.md)

</div>
</div>
