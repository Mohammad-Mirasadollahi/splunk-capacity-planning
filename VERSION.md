# Splunk Capacity Planning — Canonical Documentation Sources (Always Latest)

This file is the **single source of truth** for which Splunk product docs this sizing pack tracks.

**Policy**

| Product | URL channel | Resolved (as of last sync) | Notes |
|---|---|---|---|
| Splunk Enterprise (Capacity / Indexer / Install) | `/Splunk/latest/` (docs.splunk.com) | **10.4** | Prefer `/latest/` always |
| **Enterprise Security** (planning / performance) | help.splunk.com ES **8.5** | **8.5** | Classic `/ES/latest/Install/DeploymentPlanning` does **not** resolve on docs.splunk.com. Current planning topics live under help.splunk.com (version picker: 8.5 … 8.0). |
| **ITSI** (Plan your deployment) | help.splunk.com ITSI **5.0** | **5.0** | help version picker lists **5.0** as current; docs.splunk.com `/ITSI/latest/` may still trail on 4.21.x |
| PCI | `/PCI/latest/` | latest | Topic may 404 if renamed |

```bash
python3 tools/sync_latest_docs.py --check-remote --apply
```

---

## versions

```yaml
policy: always_latest_per_product
splunk_enterprise:
  channel: latest
  resolved: "10.4"
  evidence: "Capacity/Reference hardware version picker Latest 10.4"
enterprise_security:
  channel: "help/8.5"
  resolved: "8.5"
  topics:
    - planning/minimum-specifications-for-a-production-deployment
    - planning/considerations-for-scaling-deployments
    - planning/performance-reference-for-splunk-enterprise-security
  evidence: "help.splunk.com ES install 8.5 version picker; SH/IDX minima 16 physical cores / 32 GB / 32 vCPU"
itsi:
  channel: "help/5.0"
  resolved: "5.0"
  topic: planning/plan-your-itsi-deployment
  evidence: "help.splunk.com ITSI install-and-upgrade version picker 5.0 (ahead of docs.splunk.com latest)"
pci:
  channel: latest
  resolved: "latest"
last_synced_utc: "2026-07-17"
```

---

## canonical_latest (authoritative link table)

| ID | Title | Canonical URL (current policy) |
|---|---|---|
| cap-intro | Introduction to capacity planning | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| cap-dimensions | Dimensions of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| cap-components | Components of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| cap-reference-hw | Reference hardware | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| cap-perf-summary | Summary of performance recommendations | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| cap-storage-estimate | Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| install-sysreq | System requirements (filesystems, NFS, CIFS, VM I/O) | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |
| idx-buckets-clusters | Buckets and indexer clusters | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| idx-smartstore-req | SmartStore system requirements | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| idx-smartstore-about | About SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/AboutSmartStore |
| dist-colocate-mgmt | Colocate management components | https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents |
| es-min-specs | ES minimum specifications (production) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| es-scaling | ES considerations for scaling deployments | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| es-perf-ref | ES Performance reference | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| itsi-plan | Plan your ITSI deployment | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| idx-how-stores | How the indexer stores indexes | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes |
| idx-retire | Set a retirement and archiving policy | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy |
| idx-configure-storage | Configure index storage | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage |
| idx-archive | Archive indexed data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata |
| admin-indexes-conf | indexes.conf | https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf |
| pci-plan | PCI deployment planning | https://docs.splunk.com/Documentation/PCI/latest/Install/DeploymentPlanning |

Human-facing index: [`docs/en/00-References.md`](docs/en/00-References.md) · [`docs/fa/00-References.md`](docs/fa/00-References.md)

---

## how_to_update

1. `python3 tools/sync_latest_docs.py --check-remote`  
2. When help.splunk.com publishes a newer ES planning line (e.g. 8.6):
   `python3 tools/sync_latest_docs.py --apply --es-version 8.6`  
3. When ITSI help moves past 5.0:
   `python3 tools/sync_latest_docs.py --apply --itsi-version 5.1`  
4. Spot-check `00-References.md` and ES/ITSI links in `01`–`04`.

### When Enterprise 10.5+ or newer ES/ITSI docs ship

```bash
python3 tools/sync_latest_docs.py --check-remote --apply
# For a new ES/ITSI help line:
python3 tools/sync_latest_docs.py --apply --es-version <new> --itsi-version <new>
```
