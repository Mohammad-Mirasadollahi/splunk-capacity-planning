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
  <a href="../en/03-Disk-Media-IOPS-and-Storage-Topology.md" aria-current="page" style="font-weight:700; text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/03-Disk-Media-IOPS-and-Storage-Topology.md" style="text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(default: English)</span>
</nav>


# Splunk Disk Media, IOPS, and Storage Topology

> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  
> **Doc channel:** Enterprise **`/latest/`** (resolved **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · synced 2026-07-17  
> **Update:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)





> **References (read first):** [`00-References.md`](00-References.md) — master official citation index

---

## Table of Contents

- [0) How This Document Relates to the Other Docs](#0-how-this-document-relates-to-the-other-docs)
- [1) Official Position on RAID](#1-official-position-on-raid)
- [2) Storage Type by Role (Media Matrix)](#2-storage-type-by-role-media-matrix)
- [3) IOPS and Volume Layout Rules](#3-iops-and-volume-layout-rules)
- [4) Network Storage: NFS, DFS, SAN, NAS, CIFS/SMB](#4-network-storage-nfs-dfs-san-nas-cifssmb)
- [5) Supported File Systems](#5-supported-file-systems)
- [6) SmartStore Local Disk Preferences](#6-smartstore-local-disk-preferences)
- [7) Virtualization, Thick/Thin Provisioning, Shared Arrays](#7-virtualization-thickthin-provisioning-shared-arrays)
- [8) Cloud Vendor Storage Hints](#8-cloud-vendor-storage-hints)
- [9) How to Validate Storage (FIO and Concurrent Tests)](#9-how-to-validate-storage-fio-and-concurrent-tests)
- [10) Decision Checklist](#10-decision-checklist)
- [11) Official Citation Index](#11-official-citation-index)

---

## 0) How This Document Relates to the Other Docs

| Document | Answers |
|---|---|
| `01-Infrastructure-Sizing` | How many nodes / CPU / RAM |
| `02-Storage-Sizing` | How many **GB/TB** (compression, RF/SF, SmartStore cache days) |
| **This doc (`03`)** | **What kind of disk / path / IOPS / filesystem / network storage** to use |

Splunk’s Capacity Planning Manual states that **insufficient storage I/O is the most commonly encountered limitation** in Splunk infrastructure.

**Source:** [Reference hardware → What storage type should I use for a role?](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

---

## 1) Official Position on RAID

### 1.1 What current official Capacity Planning docs specify

In the current **Reference hardware** topic (Splunk Enterprise **Latest 10.4** on docs.splunk.com), Splunk specifies:

- **Media class:** SSD, HDD, NVMe, SAN, NAS, network file systems  
- **Performance floors:** e.g. **≥ 800 sustained IOPS** for the Splunk install volume and for HDD-based search heads  
- **Placement rules:** never put **hot/warm** on network volumes; separate index volumes from OS/swap  

It does **not** prescribe RAID levels such as RAID 0, RAID 1, RAID 5, RAID 6, or RAID 10.

**Source:** [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — sections *What storage type should I use for a role?* and *Notes about optimizing Splunk software and storage usage* (no RAID-level table in this topic).

### 1.2 How to treat RAID in a Splunk design (faithful to docs)

| Approach | Aligned with official docs? |
|---|---|
| Choose any RAID (or software RAID / RAID-less NVMe) that delivers the **required media type + sustained IOPS** for that role | Yes — outcomes match Reference hardware |
| Claim “Splunk requires RAID 10” as a current Capacity Planning rule | **No** — not stated in current Reference hardware |
| Use Partner / TAP reference architectures that may include RAID layouts | Allowed as vendor guidance; Splunk says it does **not endorse** a particular hardware vendor | 

**Source:** [Reference hardware → Considerations for deploying Splunk software on partner infrastructure](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 1.3 Practical implication

Design storage so that:

1. Hot/warm (+ DMA) land on **SSD** (or SmartStore **NVMe/SSD** cache)  
2. Install volume and HDD search-head volumes meet **≥ 800 sustained IOPS**  
3. Cold/frozen may use HDD/SAN/NAS/NFS under the NFS/CIFS rules in the Installation Manual  

RAID is an implementation detail underneath those outcomes—not a separately mandated Splunk level in current Capacity Planning docs.

---

## 2) Storage Type by Role (Media Matrix)

Official table from Reference hardware:

| Role | Recommended storage type | Official notes (summary) |
|---|---|---|
| **Search Head** | SSD, HDD | High ad-hoc/scheduled load → prefer **SSD**. HDD must provide **≥ 800 sustained IOPS**. At least **300 GB** dedicated storage. |
| **Indexer: Hot + Warm + data model storage** | **SSD** | High-performance read/write. Hot and warm share the same volume path by default; **data model acceleration** uses that path by default. |
| **Indexer: SmartStore** | **NVMe or SSD** + remote object store | Local high-performance cache for short-term I/O and bucket retrieval from object storage. |
| **Indexer: Cold** | HDD, SAN, NAS, Network file systems | Often slower/cheaper; search latency depends on storage performance; unreliable cold can impact indexing operations. |
| **Indexer: Frozen** | SAN, NAS, Network file systems, HDD | Archival path; frozen buckets are **deleted by default** unless archived. |

**Source:** [Reference hardware → What storage type should I use for a role?](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 2.1 Mapping media to bucket tiers

| Bucket / data class | Official media guidance |
|---|---|
| Hot | SSD (with warm on same path by default) |
| Warm | SSD (same path as hot by default) |
| Data model acceleration | Same as hot/warm path by default → SSD |
| Cold | HDD / SAN / NAS / NFS (with NFS limits) |
| Frozen | SAN / NAS / NFS / HDD |
| SmartStore cache | NVMe or SSD local + object store |

**Source:** same Reference hardware table; SmartStore detail in [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 3) IOPS and Volume Layout Rules

### 3.1 Hard floors from Reference hardware

| Rule | Official requirement |
|---|---|
| Splunk **install** volume | **≥ 800 sustained IOPS** |
| Search Head on **HDD** | **≥ 800 sustained IOPS** |
| Search Head capacity | **≥ 300 GB** dedicated |
| Index vs OS | Index storage on a **separate volume** from OS / swap (OS/swap volume not recommended for Splunk data) |
| Free space | Always keep free space; performance drops as free space drops; indexing **stops** if index volume free space **&lt; 5 GB** |
| Hot/Warm placement | **Never** on network volumes |

**Source:** [Reference hardware → Notes about optimizing Splunk software and storage usage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.2 Shared-array IOPS example (virtual / shared storage)

Official example for sizing concurrent IOPS on a shared array that must deliver SSD-level performance:

```text
IOPS_needed_for_indexers ≈ 4000 IOPS × N_indexers
```

Example: **10 indexers** → **40,000 concurrent IOPS** for the indexers alone, **plus** IOPS for any other workloads on the same array.

**Source:** [Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.3 Why I/O matters for VMs

Installation Manual: Splunk needs **sustained access** to resources, **particularly disk I/O**, for indexing. Running in a VM or alongside other VMs can degrade indexing and search performance.

**Source:** [System requirements → Splunk Enterprise and virtual machines](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

---

## 4) Network Storage: NFS, DFS, SAN, NAS, CIFS/SMB

### 4.1 Reference hardware (Capacity Planning)

- **Never** store **hot and warm** buckets on network volumes — network latency dramatically decreases indexing performance.  
- Network shares such as **DFS** or **NFS** may be used for **cold** buckets; searches that include network-stored data are **slower**.  
- Cold may also use **SAN / NAS / network file systems**; frozen similarly lists SAN / NAS / NFS / HDD.

**Source:** [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 4.2 NFS — Installation Manual rules (authoritative detail)

When using NFS for Splunk indexing, consider file-level storage implications. Splunk guidance: **prefer block-level storage rather than file-level storage** for indexing data.

If you still use NFS (reliable, high-bandwidth, low-latency, or vendor HA clustered NFS), confirm vendor performance, features, and data integrity.

**Mandatory NFS guidelines:**

| Rule | Detail |
|---|---|
| Hot / Warm | **Do not** host hot or warm on NFS. Only **cold or frozen** on NFS. |
| Indexer cluster sharing | **Do not** share cold/frozen NFS among an indexer cluster (single point of failure). |
| Soft mounts | **Not supported**. Soft mounts error-and-continue on failure. |
| Hard mounts | Only **hard** NFS mounts are reliable with Splunk Enterprise. |
| Hard FSO / hard links | NFS implementation must support hard filesystem object links (hard links / shared inode). Confirm with vendor. |
| Attribute caching | **Do not** turn off NFS attribute caching. If another app needs it off, give Splunk a **separate** mount with caching enabled. |
| WAN | **Do not** use NFS over WAN — performance issues and possible **data loss**. |

**Source:** [System requirements → Considerations regarding Network File System (NFS)](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

### 4.3 CIFS / SMB (Windows)

Supported on shares hosted by **Windows machines only** for:

- Storage of **cold or frozen** index buckets  

Also:

- Confirm write permissions at **file and share** levels for the connecting user.  
- Third-party CIFS must be compatible with Splunk’s client implementation.  
- **Do not** index to a mapped network drive (e.g. `Y:\`); Splunk ignores indexes with a non-physical drive letter.

**Source:** [System requirements → Considerations regarding CIFS/SMB](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

### 4.4 SAN / NAS (as listed in Reference hardware)

| Use | Listed in official media table? |
|---|---|
| Cold | Yes — HDD, **SAN**, **NAS**, network file systems |
| Frozen | Yes — **SAN**, **NAS**, network file systems, HDD |
| Hot / Warm | **Not** listed — hot/warm require **SSD** (local high-performance), and network volumes are forbidden for hot/warm |

**Source:** Reference hardware storage-type table

---

## 5) Supported File Systems

Official support table for storing **index data**:

| Platform | File systems |
|---|---|
| **Linux** | ext3, ext4, btrfs, **XFS**, NFS 3/4 (with NFS caveats) |
| Windows | NTFS, FAT32, CIFS (caveats), SMB (caveats) |
| Solaris / FreeBSD / macOS / AIX | UF-only platforms — see full table in System requirements (universal forwarder contexts) |

If you use a filesystem **not** in the table, Splunk may run `locktest` at startup; failure means that FS/protocol is **not suitable**.

**Source:** [System requirements → Supported file systems and distributed file system protocols](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

---

## 6) SmartStore Local Disk Preferences

| Deployment | Preferred local storage (official) |
|---|---|
| On-prem Linux indexers | **SSD** preferred |
| AWS | **NVMe SSD** instance storage (e.g. i3en / i3) |
| GCP | n1-highmem-64 or n1-highmem-32 preferred + **zonal SSD** persistent disks |
| Azure | High-memory E-series (Edv4 / Edsv4) + **SSD** |
| On-prem SmartStore OS | Same **Linux 64-bit** on all machines; **no other OS** for on-prem SmartStore |

Cache sizing (capacity) is covered in `02-Storage-Sizing.md` (30 days indexed / **90 days for ES**). Network to object store: **10 Gbps** optimal.

**Source:** [SmartStore system requirements → Local storage requirements / Network](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 7) Virtualization, Thick/Thin Provisioning, Shared Arrays

### 7.1 Capacity Planning (platform)

- Hypervisor must provide **reserved** resources meeting reference specs.  
- Indexer in a VM: about **10–15%** slower data consume vs bare metal; search similar.  
- Shared storage must include contention from other VMs and enough IOPS per Splunk role (see §3.2).

**Source:** [Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 7.2 Enterprise Security (additional storage provisioning guidance)

From ES performance / virtualization guidance used in this pack:

- Same CPU/RAM as bare metal; **reserve** resources; do not oversubscribe.  
- Test storage **IOPS across all indexer nodes simultaneously**.  
- Prefer **thick provisioning**; **thin provisioning** may impact performance.  
- If hyper-threading is enabled, **double** the vCPU count vs physical cores (ES example: 32 vCPUs instead of 16 physical cores).

**Source:** [ES Install → Performance reference / DeploymentPlanning (virtualized environments)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

---

## 8) Cloud Vendor Storage Hints

- Cloud storage options vary widely in performance and price.  
- To keep search/indexing consistent, follow the **same role-based storage type recommendations** in Reference hardware.  
- vCPU is vendor-defined and may be only a fraction of a full core’s performance.

**Source:** [Reference hardware → Self-managed Splunk Enterprise in the cloud](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

SmartStore cloud instance/disk pairings: see §6.

---

## 9) How to Validate Storage (FIO and Concurrent Tests)

1. Reference hardware points to testing guidance: **How to test my storage system using FIO** on Splunk Answers (linked from the storage-type section).  
2. Confirm **≥ 800 sustained IOPS** on install (and HDD SH) volumes.  
3. For shared arrays / VMs: size concurrent IOPS with `4000 × N_indexers` as the official SSD-level example baseline, then add other workloads.  
4. For ES: run IOPS tests on **all indexers at once**.  
5. Confirm hot/warm are **not** on NFS/DFS/CIFS; confirm NFS cold mounts are **hard**, with attribute caching, no WAN.

**Sources:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[System requirements (NFS)](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)  
[ES DeploymentPlanning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

---

## 10) Decision Checklist

```text
□ Role identified (SH / IDX hot-warm / cold / frozen / SmartStore cache)
□ Media matches Reference hardware table (SSD for hot-warm+DMA; etc.)
□ Install volume ≥ 800 sustained IOPS; indexes off OS/swap volume
□ Free space policy >> 5 GB hard stop on index volumes
□ Hot/Warm NOT on network volumes
□ If NFS cold/frozen: hard mount, hard links supported, attr cache on, no WAN, not shared across cluster peers as single SPOF
□ If CIFS/SMB: Windows-hosted cold/frozen only; no mapped drive letters for indexing
□ Filesystem in supported table (e.g. Linux ext4/XFS/…)
□ If VM/shared array: reserved IOPS; 4000×N model checked; thick provision if ES
□ If SmartStore: SSD/NVMe local per platform table; 10 Gbps to object store
□ RAID level (if any) chosen only to meet the above — not as a separate Splunk mandate
□ For RAID / disk-count / per-architecture IOPS math, complete `04-IOPS-Sizing-by-Storage-Architecture.md`
```

---

## 11) Official Citation Index

| # | Document | Section | What it establishes | URL |
|---|---|---|---|---|
| 1 | Reference hardware | Storage type by role + notes | SSD/HDD/NVMe/SAN/NAS/NFS matrix; 800 IOPS; 300 GB SH; no hot/warm on network; 5 GB stop; shared 4000×N IOPS | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| 2 | System requirements | Supported file systems; NFS; CIFS/SMB; VMs | FS list; NFS/CIFS rules; block vs file-level preference; VM disk I/O | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |
| 3 | SmartStore system requirements | Local storage / network | SSD/NVMe by platform; 10 Gbps | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| 4 | ES Performance / Deployment planning | Virtualized environments | Thick vs thin; concurrent IOPS tests; HT vCPU doubling | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |

---

## Reminder

This document records **only** what Splunk’s current official manuals state about disk/media topology. It intentionally does **not** invent RAID-level prescriptions that are absent from current Reference hardware. When Partner/TAP guides recommend RAID layouts, treat them as vendor architectures that must still meet Splunk’s media and IOPS outcomes above.

</div>
</div>
