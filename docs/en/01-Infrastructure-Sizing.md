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
  <a href="../en/01-Infrastructure-Sizing.md" aria-current="page" style="font-weight:700; text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/01-Infrastructure-Sizing.md" style="text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(default: English)</span>
</nav>


# Splunk Infrastructure Sizing

> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  
> **Doc channel:** Enterprise **`/latest/`** (resolved **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · synced 2026-07-17  
> **Update:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)






> **References (read first):** [`00-References.md`](00-References.md) — master official citation index

---

## Table of Contents

- [0) How to Use This Document](#0-how-to-use-this-document)
- [1) Splunk Sizing Logic (Why and On What Basis)](#1-splunk-sizing-logic-why-and-on-what-basis)
  - [1.1 Purpose of Capacity Planning](#11-purpose-of-capacity-planning)
  - [1.2 Dimensions That Affect Performance](#12-dimensions-that-affect-performance)
  - [1.3 Two Primary Factors for Distributed Deployments](#13-two-primary-factors-for-distributed-deployments)
- [2) Architecture Components to Size](#2-architecture-components-to-size)
  - [2.1 Primary Roles](#21-primary-roles)
  - [2.2 Rationale for Separating Search and Index Tiers](#22-rationale-for-separating-search-and-index-tiers)
- [3) Official Reference Hardware](#3-official-reference-hardware)
  - [3.1 Single-Instance (S1 in SVA) — Minimum Production](#31-single-instance-s1-in-sva--minimum-production)
  - [3.2 Search Head — Minimum](#32-search-head--minimum)
  - [3.3 Indexer — Three Tiers](#33-indexer--three-tiers)
  - [3.4 Management Components](#34-management-components)
  - [3.5 Storage Type by Role (Infrastructure Summary)](#35-storage-type-by-role-infrastructure-summary)
  - [3.6 Latency Limits in Clusters](#36-latency-limits-in-clusters)
  - [3.7 Virtualization and Cloud](#37-virtualization-and-cloud)
  - [3.8 Physical cores vs logical cores (vCPU) — official mapping](#38-physical-cores-vs-logical-cores-vcpu--official-mapping)
  - [3.9 Virtualization parallelization vs Splunk parallelization](#39-virtualization-parallelization-vs-splunk-parallelization)
- [4) Official Search Head and Indexer Counts (Performance Recommendations)](#4-official-search-head-and-indexer-counts-performance-recommendations)
  - [4.1 Daily Indexing Volume × Total Users](#41-daily-indexing-volume--total-users)
  - [4.2 Practical Calculation Using the Table](#42-practical-calculation-using-the-table)
- [5) Premium Apps — Requirements and Scaling Tables](#5-premium-apps--requirements-and-scaling-tables)
- [6) Splunk Enterprise Security (ES)](#6-splunk-enterprise-security-es)
  - [6.1 Official ES Minimum Hardware (Production)](#61-official-es-minimum-hardware-production)
  - [6.2 ES Architecture Principles (Infrastructure)](#62-es-architecture-principles-infrastructure)
  - [6.3 ES Performance Test Indexers (Reference)](#63-es-performance-test-indexers-reference)
  - [6.4 ES Scaling Table (Data Ingestion / Indexers / Detections)](#64-es-scaling-table-data-ingestion--indexers--detections)
  - [6.5 Scaling Search Heads in ES](#65-scaling-search-heads-in-es)
  - [6.6 ES Sizing Constraints](#66-es-sizing-constraints)
  - [6.7 Virtualized ES](#67-virtualized-es)
  - [6.8 Step-by-Step ES Infrastructure Sizing](#68-step-by-step-es-infrastructure-sizing)
- [7) Splunk IT Service Intelligence (ITSI)](#7-splunk-it-service-intelligence-itsi)
  - [7.1 Official ITSI Minimum Hardware](#71-official-itsi-minimum-hardware)
  - [7.2 Important ITSI Architecture Rules](#72-important-itsi-architecture-rules)
  - [7.3 Key ITSI Capacity Planning Variables](#73-key-itsi-capacity-planning-variables)
  - [7.4 Official ITSI Example Tables](#74-official-itsi-example-tables)
  - [7.5 Step-by-Step ITSI Infrastructure Sizing](#75-step-by-step-itsi-infrastructure-sizing)
  - [7.6 Scaling SHC for ITSI](#76-scaling-shc-for-itsi)
- [8) Splunk App for PCI Compliance](#8-splunk-app-for-pci-compliance)
- [9) Other Roles and Related Apps (Infrastructure Summary)](#9-other-roles-and-related-apps-infrastructure-summary)
  - [9.1 SmartStore Notes Relevant to Infrastructure (Not Storage Alone)](#91-smartstore-notes-relevant-to-infrastructure-not-storage-alone)
- [10) Complete Infrastructure Sizing Algorithm (Executive Checklist)](#10-complete-infrastructure-sizing-algorithm-executive-checklist)
  - [Phase A — Inputs](#phase-a--inputs)
  - [Phase B — Base Node Counts (Platform)](#phase-b--base-node-counts-platform)
  - [Phase C — Apply Premium Apps](#phase-c--apply-premium-apps)
  - [Phase D — Specifications per Node](#phase-d--specifications-per-node)
  - [Phase E — Network and Virtualization](#phase-e--network-and-virtualization)
  - [Phase F — Infrastructure Document Output](#phase-f--infrastructure-document-output)
- [11) Official References Used in This Document](#11-official-references-used-in-this-document)
- [12) Official Splunk Reminder](#12-official-splunk-reminder)

---

## 0) How to Use This Document

1. Collect business inputs (daily volume, concurrent users, apps, retention).
2. Estimate Search Head and Indexer counts using the Performance Recommendations table first.
3. Select appropriate Reference Hardware for each role (Minimum / Mid-range / High-performance).
4. If you run ES or ITSI, apply that app’s hardware requirements and scaling tables **on top of** the base estimate.
5. Finally, calculate disk separately using the Storage sizing document.

---

## 1) Splunk Sizing Logic (Why and On What Basis)

### 1.1 Purpose of Capacity Planning

Official documentation states that Splunk Enterprise can scale to nearly any capacity, but you must plan to use that scalability effectively. The guide includes:

- High-level hardware guidance
- How resources are consumed under different conditions
- Reference Hardware
- A performance questionnaire to support scaling decisions

**Source:**  
[Introduction to capacity planning for Splunk Enterprise](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise) — Capacity Planning Manual

### 1.2 Dimensions That Affect Performance

Before sizing any node, define these dimensions:

| Dimension | Effect |
|---|---|
| Amount of incoming data | More ingest increases time spent processing each event |
| Amount of indexed data | As indexes grow, I/O bandwidth for store and search increases |
| Number of concurrent users | Concurrent users require more resources for search, reports, and dashboards |
| Number of saved searches | High saved-search counts need more capacity to run on schedule |
| Types of search | Search type changes indexer behavior (CPU-bound vs disk-bound) |
| Whether you run Splunk apps | Apps and solutions can require dedicated resources |

**Official note:** Optimizing each dimension individually does not guarantee peak performance; how they correlate in **your** use case matters. For example, low ingest + many users is not the same as high ingest + few users.

**Source:**  
[Dimensions of a Splunk Enterprise deployment](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment) — Capacity Planning Manual

### 1.3 Two Primary Factors for Distributed Deployments

In a distributed architecture, the two most important sizing inputs are:

1. **Daily data ingest volume**
2. **Concurrent search volume**

- **Indexing tier:** prioritize **high-performance storage**
- **Search tier:** prioritize **CPU cores and RAM**

Adding Search Head capacity increases search load on indexers, so indexers usually need to scale as well. Scaling can be vertical (stronger hardware) or horizontal (more nodes).

**Source:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — *Reference host specifications for distributed deployments*

---

## 2) Architecture Components to Size

### 2.1 Primary Roles

| Component | Role in sizing |
|---|---|
| **Indexer** | Processes and stores data; primary data store |
| **Search head** | Distributes searches to indexers; aggregates results |
| **Forwarder** | Sends data to indexers; typically does not index locally |
| **Deployment server** | Distributes apps/config to forwarders and non-clustered nodes |
| **Indexer cluster** | Replication for availability and data-loss prevention |
| **Management components** | Cluster Manager, License Manager, Monitoring Console, SHC Deployer, Agent Management, Heavy Forwarder |

**Source:**  
[Components of a Splunk Enterprise deployment](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment) — Capacity Planning Manual  
[Reference hardware → Recommended hardware for management components](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 2.2 Rationale for Separating Search and Index Tiers

In distributed deployments, indexing and search are split into separate tiers so each can scale independently without excessive mutual interference. This principle underpins Splunk Validated Architectures (SVA), on which Reference Hardware is based.

**Source:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — introduction and distributed deployment sections

---

## 3) Official Reference Hardware

> All specifications below come from **Reference hardware**. “x86 64-bit” means a CPU based on Intel Sandy Bridge or newer, or AMD Bulldozer 15h GEN3 or newer, with **AVX / SSE4.2 / AES-NI** support (required for App Key Value Store).

**Base source for this section:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.1 Single-Instance (S1 in SVA) — Minimum Production

| Specification | Official value |
|---|---|
| CPU | 12 physical cores or 24 vCPU @ ≥ 2 GHz |
| RAM | 12 GB |
| Network | 1 GbE NIC (optional second NIC for management) |
| OS | 64-bit Linux or Windows (per Supported OS) |
| Storage | Per indexer role table in the same manual |

If you need headroom for search concurrency or additional apps, move to mid-range or high-performance indexer specs. When a single instance is no longer sufficient, adopt distributed SVA models.

### 3.2 Search Head — Minimum

| Specification | Official value |
|---|---|
| CPU | 16 physical cores or 32 vCPU @ ≥ 2 GHz |
| RAM | 12 GB |
| Storage | SSD or HDD with ≥ 800 sustained IOPS; minimum **300 GB** dedicated |
| Performance note | Each active search consumes up to **1 CPU core**; count scheduled and ad-hoc searches |

### 3.3 Indexer — Three Tiers

#### Minimum Indexer

| Specification | Value |
|---|---|
| CPU | 12 physical cores / 24 vCPU @ ≥ 2 GHz |
| RAM | 12 GB |

#### Mid-Range Indexer (headroom for higher search concurrency)

| Specification | Value |
|---|---|
| CPU | 24 physical cores / 48 vCPU @ ≥ 2 GHz |
| RAM | 64 GB |

#### High-Performance Indexer (critical throughput and concurrency; Premium Apps)

| Specification | Value |
|---|---|
| CPU | 48 physical cores / 96 vCPU @ ≥ 2 GHz |
| RAM | 128 GB |

### 3.4 Management Components

Start with the same specifications as single-instance and adjust for deployment scale. Splunk recommends contacting Splunk account teams or Sales for finer detail. For colocation guidance, see [Whether to colocate management components](https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents) (Distributed Deployment Manual), linked from Reference hardware.

If you use a Heavy Forwarder in an intermediate tier and have spare resources, you can configure multiple pipeline sets for better data distribution (Reference hardware → *Manage pipeline sets for index parallelization*).

### 3.5 Storage Type by Role (Infrastructure Summary)

| Role | Recommended storage | Official notes |
|---|---|---|
| Search Head | SSD or HDD | HDD ≥ 800 IOPS; SH with heavy ad-hoc/scheduled search → SSD; minimum 300 GB |
| Indexer Hot/Warm + DMA | **SSD** | Hot/warm path and data model acceleration share the default path |
| Indexer SmartStore | NVMe/SSD + object store | Local cache + remote store |
| Indexer Cold | HDD / SAN / NAS / NFS | Search on cold is slower |
| Indexer Frozen | SAN / NAS / NFS / HDD | Default: delete after freeze |

**Official storage optimization rules (infrastructure level):**

- Splunk install volume ≥ **800 sustained IOPS**
- Index storage separate from OS/swap
- Indexing **stops** if free space on index volumes falls below **5 GB**
- **Never** place hot/warm on a network volume

**Source:**  
[Reference hardware → What storage type should I use for a role?](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.6 Latency Limits in Clusters

| Item | Official limit | Effect if exceeded |
|---|---|---|
| Indexer cluster nodes | ≤ **100 ms** | Slower indexing and recovery |
| Search head cluster | ≤ **200 ms** | Impact on captain election |

Official latency impact on cluster index time (1 TB) and recovery:

| Network latency | Cluster index time (1 TB) | Cluster node recovery |
|---|---|---|
| < 100 ms | 6202 s | 143 s |
| 300 ms | 6255 s (+1%) | 1265 s (+884%) |
| 600 ms | 7531 s (+21%) | 3048 s (+2131%) |

**Source:**  
[Reference hardware → Network latency limits for clustered deployments](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.7 Virtualization and Cloud

- The hypervisor must **reserve** resources matching the specifications above.
- Indexers on VMs are roughly **10–15%** slower than bare metal for data consumption; search performance is approximately similar to bare metal.
- Shared storage must provide enough IOPS for all instances concurrently. Official example: 10 indexers at SSD level → about **4000 IOPS × 10 = 40,000 concurrent IOPS** for indexers alone.
- In cloud environments, vCPU is not necessarily equivalent to a full physical core; follow the cloud vendor’s definition.

**Source:**  
[Reference hardware → Virtualized Infrastructures / Self-managed Splunk Enterprise in the cloud](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.8 Physical cores vs logical cores (vCPU) — official mapping

> **Planning unit = physical CPU cores.** Logical cores / vCPUs are listed separately and usually equal **2× physical** when hyper-threading (HT) is enabled.

| Term | Meaning in Splunk docs | What you must provision |
|---|---|---|
| **Physical CPU cores** | Real CPU cores on the socket (no HT counted twice) | This is the **sizing basis** (e.g. SH minimum **16 physical**, indexer minimum **12 physical**, ES SH/IDX **16 physical**) |
| **Logical / vCPU** | OS/hypervisor threads; with HT ≈ **2 × physical** | Assign this many vCPUs to the VM (e.g. ES **32 vCPU** for **16 physical**) |
| **Cloud vCPU** | Vendor-defined share of a core | May be **less** than one full physical core — do **not** assume 1 cloud vCPU = 1 physical core |

**Official paired examples (same row = same machine class):**

| Role | Physical | Logical / vCPU | Source |
|---|---|---|---|
| Combined / S1 minimum | 12 | 24 | [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) |
| Search head minimum | 16 | 32 | Reference hardware |
| Indexer minimum | 12 | 24 | Reference hardware |
| Indexer mid-range | 24 | 48 | Reference hardware |
| Indexer high-performance | 48 | 96 | Reference hardware |
| ES search head / indexer (production) | **16 physical CPU cores** | **32 vCPU** | [ES 8.5 minimum specifications](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment) |
| ITSI search head | 16 required (24+ recommended) | 32 required (48+ recommended) | [ITSI 5.0 Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment) |

**Rule of thumb used by this pack and calculator:**  
`vCPU_to_assign = 2 × physical_cores` when HT is on (matches Splunk’s paired tables). If HT is off, you still need the **physical** count; you cannot “meet” a 16-physical requirement with 16 HT threads on 8 physical cores.

### 3.9 Virtualization parallelization vs Splunk parallelization

These are **different** — do not confuse them.

| Topic | Allowed? | Official guidance |
|---|---|---|
| **Hypervisor CPU oversubscription** (sharing the same physical cores across VMs / “CPU parallelization” of guests) | **No** for production Splunk | Reserve the full CPU and RAM for each guest; do not oversubscribe. ES virtualization guidance: equivalent CPU/RAM to bare metal, reserve resources. |
| **Hyper-threading (logical threads on each physical core)** | **Yes (expected)** | Reference and ES tables publish physical **and** 2× vCPU. With HT enabled, assign the **vCPU** column to the VM. |
| **Splunk software parallelization** (index **pipeline sets**, index parallelization, batch-mode / parallel search) | **Yes, when spare CPU remains** | Heavy Forwarder / indexers: multiple pipeline sets when resources allow ([Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) → manage pipeline sets for index parallelization). ITSI: if indexer CPUs **exceed** the minimum, you may enable parallelization settings for specific use cases ([ITSI Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)). |
| **Search concurrency** | Plan cores | Each active search can consume up to **1 CPU core** (Reference hardware → search head). |

**Practical checklist:**

1. Size **physical cores** from the role table (or ES/ITSI floor).  
2. On VMs with HT: set guest **vCPU = 2 × physical**; **pin/reserve** that capacity — no oversubscribe.  
3. Only after the guest has spare cores above the minimum, enable Splunk **pipeline / parallelization** settings.  
4. Never “create” capacity by oversubscribing the hypervisor.

**Sources:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) · [ES 8.5 minimum specifications](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment) · [ES 8.5 performance reference (virtualized environments)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security) · [ITSI 5.0 Plan — hardware / parallelization](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

---

## 4) Official Search Head and Indexer Counts (Performance Recommendations)

> This table is a **guideline**; adjust for your use case.  
> A minimum reference-hardware indexer can ingest up to about **300 GB/day** while supporting concurrent search load.

**Source:**  
[Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations) — Capacity Planning Manual  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — reference machine definition

### 4.1 Daily Indexing Volume × Total Users

| Total users | < 2 GB/day | 2–300 GB/day | 300–600 GB/day | 600 GB–1 TB/day | 1–2 TB/day | 2–3 TB/day |
|---|---|---|---|---|---|---|
| < 4 | 1 combined | 1 combined | 1 SH + 2 IDX | 1 SH + 3 IDX | 1 SH + 7 IDX | 1 SH + 10 IDX |
| Up to 8 | 1 combined | 1 SH + 1 IDX | 1 SH + 2 IDX | 1 SH + 3 IDX | 1 SH + 8 IDX | 1 SH + 12 IDX |
| Up to 16 | 1 SH + 1 IDX | 1 SH + 1 IDX | 1 SH + 3 IDX | 2 SH + 4 IDX | 2 SH + 10 IDX | 2 SH + 15 IDX |
| Up to 24 | 1 SH + 1 IDX | 1 SH + 2 IDX | 2 SH + 3 IDX | 2 SH + 6 IDX | 2 SH + 12 IDX | 3 SH + 18 IDX |
| Up to 48 | 1 SH + 2 IDX | 1 SH + 2 IDX | 2 SH + 4 IDX | 2 SH + 7 IDX | 3 SH + 14 IDX | 3 SH + 21 IDX |

### 4.2 Practical Calculation Using the Table

**Inputs:**

- `D` = Daily ingest (GB/day)
- `U` = Total concurrent users (approximate row in the table)

**Outputs:**

- `N_SH`, `N_IDX` from the table above

**Example:**  
`D = 800 GB/day`, `U = 12` → row “Up to 16”, column “600 GB to 1 TB/day” → **2 Search Heads + 4 Indexers**

Then choose Minimum / Mid / High specs per indexer:

- No Premium App and moderate search → Minimum or Mid-range
- ES / ITSI / heavy search → Mid-range or High-performance (see sections below)

---

## 5) Premium Apps — Requirements and Scaling Tables

Reference hardware explicitly states that Premium Apps may require more than reference specs; consult each app’s documentation. Official examples include:

- Splunk Enterprise Security
- Splunk IT Service Intelligence
- Splunk App for PCI

**Source:**  
[Reference hardware → Premium Splunk app requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

---

## 6) Splunk Enterprise Security (ES)

> **Docs line:** ES **8.5** on [help.splunk.com](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning) (not classic docs.splunk.com `/ES/7.3.3/`).

### 6.1 Official ES Minimum Hardware (Production)

| Machine role | Minimum CPU | Minimum RAM | Minimum vCPU |
|---|---|---|---|
| Search head | **16 physical CPU cores** | **32 GB** | **32 vCPU** |
| Indexer | **16 physical CPU cores** | **32 GB** | **32 vCPU** |

Same minima apply to SHC peers as to standalone ES search heads. Increase above these floors for mid-range / high-performance reference hardware as load grows.

**Source:**  
[Minimum specifications for a production deployment (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment)

### 6.2 ES Architecture Principles (Infrastructure)

From ES **8.5** planning / performance topics:

| Topic | Official guidance |
|---|---|
| Preferred architecture | Distributed search (not single-instance for production) |
| Search Head | Dedicated SH or dedicated SHC |
| Apps on the same SH | CIM-compatible only (e.g., PCI Compliance and Add-on Builder allowed) |
| Real-time | ES uses indexed real-time; disabling it reduces indexing capacity |
| SHC | Increases search load on indexers → more indexers or more CPU |
| ES + ITSI | **Not supported** on the same SH/SHC (also confirmed in ITSI documentation) |
| Monitoring Console on ES SH | Standalone mode only |
| OS for ES SHC | **Linux-based SHC only**; Windows SHC not supported |

**Source:**  
[Performance reference for Splunk Enterprise Security (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

### 6.3 ES Performance Test Indexers (Reference)

In ES performance tests, indexers matched reference hardware with **32 GB RAM and 16 CPU cores**. All SH and indexer OS must be 64-bit.

**Source:** Same Performance reference page — *Performance test results*

### 6.4 ES Scaling Table (Data Ingestion / Indexers / Detections)

ES 8.5 uses **detections** (not the older “correlation searches” column label):

| Deployment size | Data ingestion / day | Number of indexers | Number of detections |
|---|---|---|---|
| Small | 300 GB | 3 | 20 |
| Mid-range | 1 TB | 10 | 60 |
| Mid-range to large | 625 GB/day to 15 TB/day | 24 | 60 |
| Large | 15 TB/day | 150 | 100 |
| Largest tested (SHC on-prem) | 45 TB (skip search ~4.9%) | 240 | 60 |
| Largest tested (single SH on-prem) | 25 TB (skip search ~1%) | 300 | — |

**Source:**  
[Considerations for scaling deployments (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments)

### 6.5 Scaling Search Heads in ES

| Factor | What to increase |
|---|---|
| High concurrent ad-hoc search | CPU + RAM |
| High real-time load or many concurrent logins | CPU |
| Many enabled **detections** | RAM |
| Large asset/identity lookups | RAM |

### 6.6 ES Sizing Constraints

| Criterion | Constraint |
|---|---|
| Detection search load | Number of detections and supporting searches |
| Data ingestion volume | Volume ingested into ES |
| DMA load | Number of accelerated data models, data type/cardinality, accelerated volume |
| Indexer cluster | Single-site or multi-site |
| Retention | TSIDX retention policy |

**Official warning for > 15 TB/day:** Some typical Splunk Enterprise settings may be insufficient with ES present; DMA affects cluster performance; engage a Field Architect.

**Source:** *Constraints impacting performance* in the ES 8.5 Performance reference

### 6.7 Virtualized ES

- Equivalent CPU/RAM to bare metal
- Reserve all resources; do not oversubscribe
- Test IOPS across **all indexers simultaneously**
- **Thick provision**; thin provisioning can hurt performance
- If hyper-threading is enabled: count vCPU as **double** physical cores (official example: 32 vCPU instead of 16 physical cores)

**Source:**  
[Performance reference (ES 8.5) → virtualized environments](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

### 6.8 Step-by-Step ES Infrastructure Sizing

```text
1) D_es = daily volume entering the security use case / ES
2) From ES table (section 6.4), read N_IDX and approximate detection count
3) Use a dedicated SH; if concurrency/detections are high → SHC
4) Each SH/IDX ≥ ES minima (16 physical cores / 32 GB / 32 vCPU);
   prefer Mid-range (24c/64GB) or High-performance as load grows
5) If using SHC, increase N_IDX versus a single SH
6) For ≥ 1 TB/day with ES → consult Professional Services (official ES recommendation)
7) Size storage separately per Storage doc (+ DMA)
```

**Numeric example:**  
Target: 300 GB/day security data, ~20 detections  
→ Per Small table: **3 Indexers** + dedicated SH  
Hardware floor: **16 physical cores / 32 GB / 32 vCPU** per SH and indexer (ES 8.5 minima).
---

## 7) Splunk IT Service Intelligence (ITSI)

### 7.1 Official ITSI Minimum Hardware

> These specs apply to dedicated ITSI search head infrastructure. If the SH is shared with other apps, more than 16 cores / 12 GB is required.

| Machine role | Minimum CPU | Minimum RAM | Minimum vCPU |
|---|---|---|---|
| Search head | 16 cores required, **24+ recommended**; or 32 vCPU @ ≥ 2 GHz | 12 GB required, **16+ recommended** | 32 vCPU required, 48+ recommended |
| Indexer | 16 cores | 32 GB | 32 vCPU required, 48+ recommended |

If indexer CPUs exceed the minimum, you can enable parallelization settings for specific use cases.

**Source:**  
[Plan your ITSI deployment → Hardware requirements (ITSI 5.0)](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

### 7.2 Important ITSI Architecture Rules

| Rule | Official detail |
|---|---|
| ITSI and ES on one SH/SHC | **Not supported** |
| Dedicated SH | Not mandatory, but recommended for scalability |
| KPI > ~200 discrete | SHC is more stable |
| Real-time | Must not be disabled on SH or indexer tiers used by ITSI (breaks notable grouping, anomaly detection, KPI alerting) |
| SSL on splunkd :8089 | Required |
| Java | 8.x–11.x or 17 on **search heads only** |
| KV store free space | Minimum **30 GB** free in `$SPLUNK_HOME` |
| HEC | Port 8088 for local traffic |
| Indexer clustering | Single-site and multisite supported; for multisite: summary replication + SH on `site0` |
| Forward SH data | Best practice: forward all internal data to indexers |

**Source:**  
[Plan your ITSI deployment (ITSI 5.0)](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment) — Search head considerations, Real-time, SSL, KV store, Compatibility

### 7.3 Key ITSI Capacity Planning Variables

Three primary variables:

1. Average KPI run time
2. KPI frequency (1 / 5 / 15 minute)
3. Number of entities referenced **per KPI**

Also consider: core count, total indexed data, concurrent users.

Constants in official Splunk examples:

- 5-minute KPIs
- 12 cores per SH and indexer
- Environment dedicated to ITSI
- Splunk Enterprise 6.6+
- **1 indexer per 100 GB indexed**
- “Entity” = per-KPI measure in KV store (not necessarily total system entities)

**Source:**  
[Plan your ITSI deployment → ITSI capacity planning / Indexer and search head sizing examples (ITSI 5.0)](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

### 7.4 Official ITSI Example Tables

#### Example Set 1 — Average KPI runtime = 10s

**A) 0 entities/KPI, 100 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 1 | 1 |
| 500 | 2 | 1 |
| 1,000 | 3 | 2 |

Official rough plan: `~(Per 500 KPIs → 1+ SH, 1+ IDX) + 1 Indexer`

**B) 50 entities/KPI, 500 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 5 | 1 |
| 500 | 5 | 2 |
| 1,000 | 5 | 3 |

Rough plan: `~(Per 333 KPIs → 1+ SH)`

#### Example Set 2 — Average KPI runtime = 5s

**A) 0 entities/KPI, 100 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 1 | 1 |
| 500 | 1 | 1 |
| 1,000 | 2 | 2 |

Rough plan: `~(Per 950 KPIs → 1+ SH), (Per 730 KPIs → 1+ IDX)`

**B) 50 entities/KPI, 500 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 5 | 1 |
| 500 | 5 | 1 |
| 1,000 | 5 | 3 |

Rough plan: `~(Per 333 KPIs → 1+ SH)`

**Critical official note:** KPI count ≠ KPI search count. With KPI base searches, actual search job demand depends on configuration, not KPI count alone.

### 7.5 Step-by-Step ITSI Infrastructure Sizing

```text
1) Measure KPI_count, KPI_freq, avg_runtime_sec, entities_per_KPI, D_gb_day
2) N_IDX_data ≈ ceil(D_gb_day / 100)   # official ITSI example rule
3) Using nearest Example Set (5s or 10s; 0 or 50 entities), read N_SH and N_IDX
4) N_IDX = max(N_IDX_data, N_IDX_from_examples)
5) Each node ≥ ITSI Hardware requirements table (not platform minimum alone)
6) If using Event Analytics/Episode Review → stable, healthy SHC required
7) Review KV store sizing and limits.conf per KV store section of ITSI Plan doc
```

**Example:**  
500 five-minute KPIs, runtime ≈ 10s, 50 entities/KPI, 500 GB/day  
→ From Example Set 1-B: **5 Indexers + 2 Search Heads**  
Hardware: SH ≥ 16c/12GB (prefer 24c/16GB+), Indexer ≥ 16c/32GB

### 7.6 Scaling SHC for ITSI

| Factor | Increase |
|---|---|
| High concurrent searches | CPU + RAM |
| High real-time / concurrent login | CPU |
| Many correlation searches | RAM |

**Source:** Table *Search head scaling considerations for Splunk IT Service Intelligence* in ITSI Plan documentation

---

## 8) Splunk App for PCI Compliance

Reference hardware lists PCI as a Premium App whose hardware/scaling documentation must be consulted.

From ES documentation:

- Installing PCI on the same Search Head as ES (as CIM-compatible) is permitted.
- Infrastructure sizing therefore follows **ES + platform**; PCI adds knowledge/search load on that SH and must be reflected in concurrency and RAM planning.

**Source:**  
[Reference hardware → Premium Splunk app requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[ES Performance reference → Guidelines to optimize performance / CIM-compatible apps (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

> For version-specific PCI hardware numbers, open the Install manual for your PCI version on docs.splunk.com (Deployment Planning / Hardware).

---

## 9) Other Roles and Related Apps (Infrastructure Summary)

| Topic | Sizing logic | Source |
|---|---|---|
| **Heavy Forwarder (intermediate)** | Start from single-instance reference; with spare resources, use multiple pipelines | Reference hardware → management components / pipeline sets |
| **License Manager / MC / Deployer / Cluster Manager** | Start from single-instance specs; scale with environment size | Reference hardware → management components |
| **SOAR** | Separate product; size from SOAR documentation | Product docs on docs.splunk.com |
| **UBA** | Architecture and sizing separate from ES SH | UBA documentation |
| **Machine Learning Toolkit** | CPU/RAM load on SH; include in concurrent search planning | Dimensions → Splunk apps |
| **SmartStore-enabled Indexer** | CPU similar to standard indexer; main difference is local cache + network to object store; prefer **10 Gbps** | [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements) |

### 9.1 SmartStore Notes Relevant to Infrastructure (Not Storage Alone)

- SmartStore indexers with S3 should run on AWS; GCS → GCP; Azure Blob → Azure; S3-compatible on-prem → on-prem datacenter
- On-prem SmartStore: same 64-bit Linux on all machines
- Version: standalone ≥ 7.2; in a cluster all nodes ≥ 7.2
- ES on SmartStore: local cache sized for **90 days** of indexed data (instead of the usual 30 days)

**Source:**  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 10) Complete Infrastructure Sizing Algorithm (Executive Checklist)

### Phase A — Inputs

```text
D          = total environment daily ingest (GB/day)
U          = concurrent / total users (per table rows)
Apps       = {Core, ES, ITSI, PCI, ...}
KPI_profile = (count, freq, runtime, entities_per_kpi) if ITSI
Corr       = detection count if ES
Cluster    = yes/no; RF/SF; single/multi-site
SmartStore = yes/no
```

### Phase B — Base Node Counts (Platform)

```text
(N_SH_base, N_IDX_base) = Lookup(Summary of performance recommendations, D, U)
```

**Table source:** [Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations)

### Phase C — Apply Premium Apps

```text
if ES in Apps:
    (N_IDX_es, _) = Lookup(ES scaling table, D)
    N_IDX = max(N_IDX_base, N_IDX_es)
    SH must be dedicated ES SH/SHC
    prefer Mid-range or High-perf indexer specs

if ITSI in Apps:
    N_IDX_itsi = max(ceil(D/100), from ITSI examples)
    N_SH_itsi  = from ITSI examples
    N_IDX = max(N_IDX, N_IDX_itsi)
    N_SH  = max(N_SH_base, N_SH_itsi)
    hardware ≥ ITSI hardware table
    ES and ITSI must NOT share SH/SHC

if both ES and ITSI:
    separate search tiers (at least two distinct SH/SHC)
    indexer tier may be shared if carefully designed (with PS)
```

### Phase D — Specifications per Node

```text
Indexer SKU:
  Core only, light search     → Minimum (12c/12GB) or Mid (24c/64GB)
  Premium / heavy search      → Mid (24c/64GB) or High (48c/128GB)
  ES production               → ≥ 16 physical cores / 32 GB / 32 vCPU (ES 8.5)
  ITSI production             → ≥ 16 cores / 32 GB IDX (ITSI 5.0)

Search Head SKU:
  Platform min                → 16c/12GB
  ITSI                        → 16c/12GB min; 24c/16GB+ recommended
  ES                          → ≥ 16 physical cores / 32 GB / 32 vCPU; scale with detections/concurrency
```

### Phase E — Network and Virtualization

```text
Cluster latency OK?  IDX ≤ 100ms, SHC ≤ 200ms
VM reserved resources? no oversubscribe
IOPS tested across all indexers simultaneously?
Hyperthreading → double vCPU vs physical (ES virtualization note)
```

### Phase F — Infrastructure Document Output

```text
- Bill of Materials: counts and specs for SH / IDX / HF / Mgmt
- App placement matrix (which app on which SH)
- Scaling triggers (e.g., > 300 GB/day per min indexer, KPI growth, detection growth)
- Reference Storage document for disk
```

---

## 11) Official References Used in This Document

| # | Document title | Relevant section | URL |
|---|---|---|---|
| 1 | Introduction to capacity planning | Overall capacity planning | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| 2 | Dimensions of a Splunk Enterprise deployment | Performance dimensions | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| 3 | Components of a Splunk Enterprise deployment | Roles and clusters | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| 4 | Reference hardware | CPU/RAM/storage type/latency/VM/Premium | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| 5 | Summary of performance recommendations | SH × IDX table | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| 6 | ES 8.5 minimum specifications | SH/IDX floors (16c / 32 GB / 32 vCPU) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| 7 | ES 8.5 scaling + performance reference | Detections table, DMA, virtualization | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| 8 | Plan your ITSI deployment (5.0) | Hardware + KPI sizing examples | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| 8 | SmartStore system requirements | HW/network/cache for SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |

---

## 12) Official Splunk Reminder

Tables and examples are **guidelines**. For large production deployments (especially ES ≥ 1 TB/day or complex multi-app environments), documentation explicitly recommends contacting Splunk Sales, Professional Services, or a Field Architect.

</div>
</div>
