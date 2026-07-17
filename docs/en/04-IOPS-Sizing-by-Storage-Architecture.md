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
  .tag-official { background: #e8f5e9; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.85em; }
  .tag-eng { background: #fff3e0; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.85em; }
</style>

<div class="en-doc">

<nav class="lang-switch" aria-label="Language" style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; font-family:inherit; font-size:0.95rem;">
  <span style="opacity:0.75;">Language:</span>
  <a href="../en/04-IOPS-Sizing-by-Storage-Architecture.md" aria-current="page" style="font-weight:700; text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/04-IOPS-Sizing-by-Storage-Architecture.md" style="text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(default: English)</span>
</nav>


# IOPS Sizing by Storage Architecture

> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  
> **Doc channel:** Enterprise **`/latest/`** (resolved **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · synced 2026-07-17  
> **Update:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)





> **References (read first):** [`00-References.md`](00-References.md) — master official citation index

---

## Table of Contents

- [0) Two Layers of Guidance (Read First)](#0-two-layers-of-guidance-read-first)
- [1) Official Splunk IOPS / Media Targets](#1-official-splunk-iops--media-targets)
- [2) Inventory Your Implemented Structure](#2-inventory-your-implemented-structure)
- [3) Target IOPS by Role and Topology](#3-target-iops-by-role-and-topology)
- [4) Media Class: HDD vs SSD vs NVMe](#4-media-class-hdd-vs-ssd-vs-nvme)
- [5) RAID Present vs Absent — Effect on Usable IOPS](#5-raid-present-vs-absent--effect-on-usable-iops)
- [6) Disk Count Workbook](#6-disk-count-workbook)
- [7) End-to-End Examples by Architecture](#7-end-to-end-examples-by-architecture)
- [8) Pass / Fail Matrix](#8-pass--fail-matrix)
- [9) Measurement Procedure (Mandatory)](#9-measurement-procedure-mandatory)
- [10) Official Citation Index](#10-official-citation-index)

---

## 0) Two Layers of Guidance (Read First)

| Layer | What it is | Label in this doc |
|---|---|---|
| **A — Official Splunk** | Numbers and media rules from Capacity Planning / Installation / SmartStore / ES | <span class="tag-official">OFFICIAL</span> |
| **B — Engineering bridge** | How RAID level, disk count, and drive class combine to **reach** those official targets (Splunk does **not** publish RAID formulas) | <span class="tag-eng">ENGINEERING</span> |

**Rule:** Layer B never overrides Layer A. If FIO shows you miss the official floor, the architecture fails — regardless of how many disks or which RAID you bought.

Companion docs:

- `03-Disk-Media-IOPS-and-Storage-Topology.md` — allowed media / NFS / filesystem rules  
- `02-Storage-Sizing.md` — **capacity (TB)**, not IOPS  
- This doc — **IOPS & disk structure** for the design you implement  

---

## 1) Official Splunk IOPS / Media Targets

### 1.1 Hard floors <span class="tag-official">OFFICIAL</span>

| Target | Value | Applies to |
|---|---|---|
| Sustained IOPS (minimum) | **≥ 800** | Volume where **Splunk is installed** |
| Sustained IOPS (minimum) | **≥ 800** | Search Head if built on **HDD** |
| Dedicated SH space | **≥ 300 GB** | Search Head storage |
| Indexer hot / warm / DMA media | **SSD** | Not optional for that role |
| SmartStore local media | **NVMe or SSD** | Plus remote object store |
| Hot / warm on network | **Forbidden** | No NFS/DFS/CIFS for hot/warm |
| Index free space | Keep free space; indexing **stops** if **&lt; 5 GB** free on index volume | All index volumes |
| Prefer block storage for indexing | Prefer **block-level** over file-level | Installation Manual (NFS discussion) |

**Source:** [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware); [System requirements](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

### 1.2 Shared / virtual SSD-level array model <span class="tag-official">OFFICIAL</span>

When multiple indexers share an array that must deliver **SSD-level** performance:

```text
IOPS_array_for_indexers ≥ 4000 × N_indexers
```

Official example: **10 indexers** → **40,000 concurrent IOPS** for indexers **alone**, plus IOPS for every other workload on the same array.

For ES on VMs: measure IOPS with **all indexer nodes running the test simultaneously**; prefer **thick** provisioning.

**Source:** [Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware); [ES DeploymentPlanning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

### 1.3 Per-host local SSD (non-shared) <span class="tag-official">OFFICIAL</span> + <span class="tag-eng">ENGINEERING</span>

Splunk mandates **SSD** for hot/warm but does **not** publish a second numeric IOPS floor specifically labeled “per local indexer SSD volume” beyond the install-volume **800** rule and the shared-array **4000×N** example.

**Practical target used in this workbook:**

| Host pattern | IOPS target to design/measure against |
|---|---|
| Local hot/warm SSD (dedicated disks on the indexer) | Meet **media = SSD**, install vol ≥ **800**, and prove with FIO that sustained random I/O is healthy under concurrent index+search load |
| If you want a numeric planning anchor consistent with Splunk’s shared example | Treat **~4000 sustained IOPS per indexer** as the **SSD-level planning anchor** when sizing arrays or when comparing local designs to the official shared example |
| HDD Search Head | **≥ 800 sustained** (explicit) |
| Busy Search Head | Prefer **SSD** (explicit) — then validate with FIO under scheduled+ad-hoc load |

---

## 2) Inventory Your Implemented Structure

Fill this before calculating anything:

```text
A. Role(s) on this volume:  [ ] OS/Splunk install  [ ] SH  [ ] IDX hot+warm(+DMA)  [ ] cold  [ ] frozen  [ ] SmartStore cache
B. Media class:             [ ] HDD  [ ] SATA/SAS SSD  [ ] NVMe SSD  [ ] Mixed
C. Attachment:              [ ] Local DAS  [ ] Shared SAN  [ ] NAS/NFS (cold/frozen only)  [ ] Cloud disk  [ ] Cloud NVMe instance store
D. RAID:                    [ ] None / JBOD / single disk  [ ] RAID 0  [ ] RAID 1  [ ] RAID 10  [ ] RAID 5  [ ] RAID 6  [ ] Other: ___
E. Disk count in set:       N_disks = ___
F. Vendor rated IOPS/disk:  I_disk = ___   (from datasheet; prefer measured FIO later)
G. Number of indexers:      N_idx = ___
H. Other VMs/workloads on same array?  [ ] Yes (list)  [ ] No
I. Thick or thin (VM)?      [ ] Thick  [ ] Thin  [ ] N/A
J. SmartStore?              [ ] No  [ ] Yes (local cache days: 30 / 90 if ES)
```

---

## 3) Target IOPS by Role and Topology

### 3.1 Decision tree <span class="tag-official">OFFICIAL</span>

```text
START
 │
 ├─ Volume = Splunk install (any role)
 │     → Target ≥ 800 sustained IOPS
 │
 ├─ Role = Search Head
 │     ├─ Media = HDD  → Target ≥ 800 sustained IOPS; capacity ≥ 300 GB
 │     └─ Media = SSD/NVMe → Preferred for heavy search; still keep install ≥ 800; validate with FIO
 │
 ├─ Role = Indexer hot + warm (+ DMA)
 │     ├─ Media MUST be SSD (or SmartStore path below)
 │     ├─ MUST NOT be network volume
 │     ├─ If SHARED SSD-level array across indexers:
 │     │     → Array IOPS ≥ 4000 × N_idx  (+ other workloads)
 │     └─ If LOCAL dedicated SSD/NVMe per indexer:
 │           → Media = SSD/NVMe; design so measured sustained IOPS supports index+search
 │             (planning anchor often aligned to ~4000/indexer when comparing to official shared example)
 │
 ├─ Role = SmartStore cache
 │     → Local NVMe or SSD; size from doc 02; network to object store prefer 10 Gbps
 │
 ├─ Role = Cold / Frozen
 │     → HDD/SAN/NAS/NFS/CIFS per rules in doc 03
 │     → No official IOPS floor published for cold; search latency tracks storage speed
 │     → Unreliable cold can impact indexing operations (official warning)
 │
 └─ END → Prove with FIO (and concurrent multi-indexer tests if shared/ES)
```

### 3.2 Quick target table

| Structure | Official media | Official IOPS / performance target |
|---|---|---|
| SH on HDD | HDD allowed | ≥ **800** sustained |
| SH on SSD/NVMe | Preferred if busy | Install ≥ **800**; validate search load |
| IDX hot/warm local SSD | **SSD required** | High-performance R/W; no network |
| IDX hot/warm local NVMe | Fits SmartStore “NVMe or SSD”; also fine as high-perf local SSD-class | Same as SSD class + measure |
| N indexers on shared SSD array | SSD-level | **4000 × N** concurrent (+ others) |
| SmartStore local | NVMe or SSD | Cache working set; 10 Gbps to remote |
| Cold on NFS | Allowed only cold/frozen | Hard mount rules; slower search |
| Hot/warm on NFS | **Invalid** | Do not implement |

---

## 4) Media Class: HDD vs SSD vs NVMe

### 4.1 What Splunk allows where <span class="tag-official">OFFICIAL</span>

| Media | Search Head | IDX Hot/Warm + DMA | SmartStore local | Cold | Frozen |
|---|---|---|---|---|---|
| **HDD** | Yes if ≥ 800 IOPS | **No** (SSD required) | Not preferred | Yes | Yes |
| **SSD** | Yes (preferred when busy) | **Yes (required)** | Yes | Possible but usually wasteful | Possible |
| **NVMe** | Yes (SSD-class) | Yes (SSD-class / SmartStore preferred) | **Preferred on many clouds** | Unusual | Unusual |
| **SAN/NAS block or NFS** | Not for replacing hot/warm rules | Hot/warm **not** on network | Remote = object store, not NFS hot path | Yes (with caveats) | Yes |

### 4.2 Planning implications <span class="tag-eng">ENGINEERING</span>

Use **vendor datasheet + FIO**, not marketing peak IOPS.

Typical order of magnitude for **random** small-block I/O (illustrative only — replace with your measured values):

| Media (single drive, rough) | Random IOPS order of magnitude |
|---|---|
| Enterprise HDD (15K/10K/7.2K) | Hundreds (often well below SSD) |
| SATA/SAS SSD | Thousands to tens of thousands |
| NVMe SSD | Often tens of thousands+ |

**Splunk-relevant conclusion:**

- Building hot/warm on **HDD** fails the **media** rule even if you RAID many spindles.  
- Building hot/warm on **SSD/NVMe** can pass if measured sustained IOPS meets your topology target (§3).  
- **NVMe** is explicitly called out for SmartStore local (and AWS instance store examples); treat it as the high-performance local tier.

---

## 5) RAID Present vs Absent — Effect on Usable IOPS

### 5.1 Official position <span class="tag-official">OFFICIAL</span>

Current Reference hardware does **not** require a specific RAID level. You may use:

- No RAID (single disk / JBOD / NVMe namespaces)  
- Hardware or software RAID  
- Vendor shared array RAID behind a LUN  

…as long as **media + sustained IOPS + placement rules** are met.

### 5.2 Engineering RAID factors (to estimate usable IOPS) <span class="tag-eng">ENGINEERING</span>

These factors are **industry storage engineering**, used only to estimate whether a disk set can hit Splunk’s official targets. Confirm with your RAID/controller vendor (penalties vary).

Let:

```text
I_disk   = measured or datasheet sustained random IOPS of ONE drive (your FIO/vendor number)
N_disks  = number of drives in the RAID/JBOD set serving this volume
W        = write penalty factor (approx.)
```

| Layout | Approx. usable read IOPS | Approx. usable write IOPS | Notes for Splunk designs |
|---|---|---|---|
| **No RAID / single disk** | ≈ `I_disk` | ≈ `I_disk` | Simple; no redundancy |
| **JBOD** (each disk separate) | Per-disk only | Per-disk only | Capacity sums; IOPS do **not** automatically aggregate unless FS/LVM stripes |
| **RAID 0** (stripe) | ≈ `N_disks × I_disk` | ≈ `N_disks × I_disk` | Max performance; **no** fault tolerance |
| **RAID 1** (2-disk mirror) | ≈ up to `2 × I_disk` (read) | ≈ `I_disk` (write) | Redundancy; write ≈ one disk |
| **RAID 10** (mirrored stripes) | ≈ `(N_disks/2) × I_disk` (often higher on reads) | ≈ `(N_disks/2) × I_disk` | Common high-perf redundant pattern |
| **RAID 5** | ≈ `(N_disks - 1) × I_disk` (read-ish) | ≈ `(N_disks × I_disk) / 4` (classic ~4× write penalty) | Write-heavy indexing often suffers |
| **RAID 6** | ≈ `(N_disks - 2) × I_disk` (read-ish) | ≈ `(N_disks × I_disk) / 6` (classic ~6× write penalty) | Even heavier write penalty |

**Indexing is write- and read-intensive** on hot/warm. Layouts with large write penalties (classic RAID 5/6) often need **more disks** or **SSD/NVMe** to still clear Splunk’s performance bar.

### 5.3 Minimum check formula <span class="tag-eng">ENGINEERING</span> → must satisfy <span class="tag-official">OFFICIAL</span>

```text
I_usable_write ≈ f(RAID, N_disks, I_disk)     # from table above / vendor
I_usable_read  ≈ g(RAID, N_disks, I_disk)

For install or HDD SH:
  min(I_usable_read, I_usable_write, measured_FIO) ≥ 800

For shared SSD-level indexer array:
  measured_concurrent_IOPS_across_all_indexers ≥ 4000 × N_idx
  (+ headroom for other workloads)

For local hot/warm SSD/NVMe:
  media ∈ {SSD, NVMe}
  AND measured sustained IOPS under mixed R/W load is acceptable
  (planning anchor: compare against ~4000/indexer when useful)
```

**Always replace estimates with FIO.** Splunk explicitly points to FIO testing from Reference hardware.

---

## 6) Disk Count Workbook

### 6.1 Solve for disks (engineering) <span class="tag-eng">ENGINEERING</span>

Given a write-oriented target `T` (IOPS) and RAID write model:

```text
# RAID 0
N_disks ≥ ceil(T / I_disk)

# RAID 10 (approx write ≈ (N/2)*I_disk)
N_disks ≥ ceil(2 × T / I_disk)   # and N even

# RAID 5 (approx write ≈ N*I_disk/4)
N_disks ≥ ceil(4 × T / I_disk)

# RAID 6 (approx write ≈ N*I_disk/6)
N_disks ≥ ceil(6 × T / I_disk)

# RAID 1 (2 disks)
OK only if I_disk (write) ≥ T
```

Then apply **official** constraints:

1. If volume is hot/warm → disks must be **SSD or NVMe** (HDD count cannot “fix” media).  
2. If shared array → after RAID math, still prove **4000×N_idx** concurrent.  
3. If install/HDD SH → `T ≥ 800`.  

### 6.2 Capacity vs IOPS (do not confuse)

| Need | Document | Inputs |
|---|---|---|
| How many **TB** | `02-Storage-Sizing.md` | Daily ingest, retention, RF/SF, SmartStore days |
| How many **IOPS / disks** | **This document** | Role, media, RAID, N_disks, shared vs local |

A large HDD RAID can have lots of TB and still **fail** Splunk hot/warm because media ≠ SSD.

---

## 7) End-to-End Examples by Architecture

### Example A — Local SSD, **no RAID**, 1 disk hot/warm per indexer

```text
Structure: DAS, 1× SSD, no RAID, N_idx = 6
Official: media OK (SSD); not network
Engineering: I_usable ≈ I_disk
Action: FIO the SSD; ensure install vol ≥ 800; under load confirm indexer health
Risk: no disk redundancy (operational risk, not a Splunk RAID mandate)
```

### Example B — Local **NVMe**, dual disk **RAID 1**

```text
Structure: 2× NVMe, RAID 1, hot/warm
Official: NVMe/SSD-class OK for high-perf / SmartStore-style local
Engineering: write ≈ I_disk; read can benefit from both
Action: FIO write path ≥ planning target; monitor rebuild impact
```

### Example C — Local **RAID 10** on 8× SSD

```text
Structure: 8× SSD RAID 10, local to indexer
Engineering: write ≈ (8/2)*I_disk = 4*I_disk
If I_disk sustained random write ≈ 20k → rough write ≈ 80k (estimate only)
Official gate: still SSD + FIO proof; install ≥ 800 on OS volume (separate)
```

### Example D — Shared SAN, SSD LUNs, **RAID 5** behind array, 12 indexers

```text
Official target: 4000 × 12 = 48,000 concurrent IOPS for indexers alone
Engineering: RAID 5 write penalty means more backend SSDs needed to sustain that
Also add IOPS for SH VMs / other apps on same array
ES: thick LUNs; FIO from all 12 indexers at once
```

### Example E — Many **HDD** in RAID 10 for hot/warm

```text
Official: FAIL on media — hot/warm require SSD
Even if IOPS math with 24 HDDs looks large, structure is non-compliant
Use HDDs for cold/frozen only
```

### Example F — SmartStore: local **NVMe** cache + S3, 20 indexers

```text
Official: local NVMe/SSD; remote object store; prefer 10 Gbps
Cache capacity: doc 02 (30 days indexed, or 90 if ES)
IOPS: size NVMe so cache R/W + hydration never starves indexing/search
Array formula 4000×N still useful if cache disks are on shared storage
```

### Example G — Cold on **NFS**, 4× HDD NAS

```text
Official: allowed for cold/frozen only; hard mounts; no WAN; no hot/warm
IOPS: no Splunk numeric floor; slower search expected
Do not share one NFS cold path as SPOF across cluster peers
```

### Example H — Search Head on **HDD RAID 1** (2 disks)

```text
Official: HDD allowed if sustained IOPS ≥ 800; ≥ 300 GB
Engineering: write ≈ I_disk → each HDD must support ≥ 800 sustained (or FIO of the mirror vol ≥ 800)
If busy SH: prefer moving to SSD per Reference hardware
```

---

## 8) Pass / Fail Matrix

| Check | Pass condition |
|---|---|
| Media for hot/warm | SSD or NVMe (SmartStore local: NVMe or SSD) |
| Hot/warm path | Not NFS/DFS/CIFS/network |
| Install volume FIO | ≥ **800** sustained IOPS |
| HDD SH FIO | ≥ **800** sustained IOPS |
| Shared SSD array | Concurrent ≥ **4000 × N_idx** (+ others) |
| RAID choice | Any, **if** above pass (no Splunk-required level) |
| Disk count | Enough that **measured** IOPS pass (estimates only for planning) |
| Thin vs thick (ES/VM) | Prefer thick; reserved IOPS |
| Free space | Always &gt;&gt; 5 GB on index volumes |
| Filesystem | Supported (e.g. ext4/XFS on Linux) |

---

## 9) Measurement Procedure (Mandatory)

Estimates in §5–§6 are for **planning**. Acceptance is measurement.

1. Separate OS/install volume from index volume (official).  
2. Run FIO (or vendor equivalent) as referenced from Reference hardware (“How to test my storage system using FIO”).  
3. Record **sustained** random R/W IOPS, latency, and queue depth under realistic concurrency.  
4. If shared array or ES: run tests from **all indexers simultaneously**.  
5. Compare to §3 targets; if fail → add disks / change RAID / move to SSD/NVMe / split workloads — then re-measure.  
6. Document the inventory from §2 next to the FIO results for auditability.

---

## 10) Official Citation Index

| # | Source | What you may cite as Splunk-official |
|---|---|---|
| 1 | [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) | Media by role; ≥800 IOPS; 300 GB SH; no hot/warm on network; 5 GB stop; **4000×N** shared SSD IOPS example; FIO pointer |
| 2 | [System requirements](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements) | Filesystems; NFS/CIFS rules; prefer block-level; VM disk I/O sensitivity |
| 3 | [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements) | NVMe/SSD local; cloud disk types; 10 Gbps |
| 4 | [ES DeploymentPlanning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security) | Concurrent IOPS tests; thick vs thin |

RAID write-penalty / disk-count algebra in §5–§6 is **engineering**, not a Splunk RAID specification.

---

## Reminder

- **Official:** media class + placement + ≥800 + 4000×N (shared SSD-level) + measure with FIO.  
- **Engineering:** RAID yes/no, RAID level, and disk count are tools to **hit** those targets.  
- **HDD** cannot be “IOPS-stacked” into compliance for hot/warm — SSD/NVMe is required there.

</div>
</div>
