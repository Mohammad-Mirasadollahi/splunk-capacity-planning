# Splunk Capacity Planning

Official Splunk **Capacity Planning** guidance (Infrastructure + Storage), extracted into bilingual docs for GitHub — plus a portable **CLI + Web** calculator (**SCPcalc**).

**Designed by [Mohammad Mirasadollahi](https://github.com/Mohammad-Mirasadollahi)** · **GitHub:** [Mohammad-Mirasadollahi/splunk-capacity-planning](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

**Live site (GitHub Pages):** [Documentation](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/) · [SCPcalc calculator](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/)

Named after Splunk’s Capacity Planning Manual — see [Introduction to capacity planning](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise).

**License:** [MIT](LICENSE) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

## Calculator (SCPcalc)

Portable single binary (Go): **CLI + local Web UI**, same engine — also runs **in the browser via WebAssembly** (no server needed for GitHub Pages).

Estimates searchable storage / retention MB fields, recommends **N_SH / N_IDX** from concurrent users × daily volume × clustering, drafts hardware layers + **`indexes.conf`**.

| | |
|---|---|
| **User guide (full CLI + UI + API)** | [`scpcalc/README.md`](scpcalc/README.md) |
| **Static Web UI (WASM)** | [`calc/`](calc/) — built in CI for Pages at `/calc/` (WASM **not** committed) |
| Design | [`scpcalc/docs/`](scpcalc/docs/) (HLD · LLD · Logic · Language) |
| Download | GitHub **Releases** (tag `scpcalc-v*`) |
| Local build | `cd scpcalc && make test && make wasm && make build` |

```bash
cd scpcalc && make build

./bin/scpcalc serve                 # http://0.0.0.0:12345  (embeds WASM UI)

./bin/scpcalc calc --daily-gb 800 --concurrent-users 12 \
  --indexer-cluster --rf 3 --sf 2 --search-head-cluster

./bin/scpcalc calc --plan plan.json --json --conf-out indexes.conf

# Static site for Pages (no backend; WASM built in CI, not committed):
make pages-calc                     # → ../calc/ (gitignored except README)
make release                        # → scpcalc/releases/scpcalc-v* (gitignored)
# Tag scpcalc-v0.1.0 → GitHub Actions attaches binaries + WASM to the Release
```

Config: [`scpcalc/.env.example`](scpcalc/.env.example) → `.env` (`SCPCALC_HOST` / `SCPCALC_PORT`, default port **12345**).

## Language (docs pack)

| | |
|---|---|
| **Default** | **English** (`docs/en/`) |
| Alternate | فارسی (`docs/fa/`) |
| Hub | [`index.html`](index.html)?`lang=en` (GitHub Pages) |
| In every doc | Language switcher: **English** · **فارسی** |

**English is the source of truth.** Persian docs must stay structurally synced (same files, section skeleton, citation URLs, version banners).

```bash
python3 tools/check_en_fa_sync.py
python3 tools/add_lang_switcher.py   # if you added a new paired file
```

**Doc policy:** Enterprise `/latest/` (**10.4**), ES **8.5** (help.splunk.com), ITSI **5.0** (help.splunk.com). Refresh: `python3 tools/sync_latest_docs.py --check-remote --apply`. See [`VERSION.md`](VERSION.md) · [`docs/en/00-References.md`](docs/en/00-References.md).

## Structure

```text
splunk-capacity-planning/
├── LICENSE / CONTRIBUTING.md / README.md / CHANGELOG.md
├── index.html / view.html / assets/   ← docs language hub (Pages)
├── docs/en + docs/fa                  ← knowledge pack
├── tools/                             ← doc sync scripts
├── scpcalc/                           ← portable calculator (Go)
└── .github/workflows/
    ├── bilingual-sync.yml
    ├── scpcalc-ci.yml
    ├── scpcalc-pages.yml              ← docs + /calc/ deploy
    └── scpcalc-release.yml
```

## Quick start (English — default)

0. **[Official References](docs/en/00-References.md)**  
1. [Infrastructure Sizing](docs/en/01-Infrastructure-Sizing.md)  
2. [Storage Sizing](docs/en/02-Storage-Sizing.md)  
3. [Disk Media, IOPS & Storage Topology](docs/en/03-Disk-Media-IOPS-and-Storage-Topology.md)  
4. [IOPS by Storage Architecture](docs/en/04-IOPS-Sizing-by-Storage-Architecture.md)  
5. [Index Buckets, Event Size & indexes.conf](docs/en/05-Index-Buckets-Retention-and-indexes-conf.md)

## فارسی

0. **[مراجع رسمی](docs/fa/00-References.md)**  
1. [سایزینگ زیرساخت](docs/fa/01-Infrastructure-Sizing.md)  
2. [سایزینگ Storage](docs/fa/02-Storage-Sizing.md)  
3. [رسانه دیسک، IOPS و توپولوژی Storage](docs/fa/03-Disk-Media-IOPS-and-Storage-Topology.md)  
4. [سایزینگ IOPS بر اساس معماری Storage](docs/fa/04-IOPS-Sizing-by-Storage-Architecture.md)  
5. [Bucketها، حجم Event و indexes.conf](docs/fa/05-Index-Buckets-Retention-and-indexes-conf.md)

## GitHub Pages

1. Settings → Pages → source: **GitHub Actions** (workflow [`scpcalc-pages.yml`](.github/workflows/scpcalc-pages.yml)), or deploy from branch `/` if you publish a built site locally.  
2. Language defaults to **English**; use **فارسی** to switch.  
3. Docs render via `view.html`. The calculator is also on Pages at **`/calc/`** (browser WASM; large `.wasm` built in CI, not committed). For LAN demos use `scpcalc serve` (SCPcalc binary) from a Release.  
   Live: [docs hub](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/) · [calculator](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/).  
   Use **Export URL** / **Import** (paste link) to share a full plan via the URL hash — see [`scpcalc/README.md`](scpcalc/README.md#save--export--import).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). PRs that touch docs must pass `check_en_fa_sync.py`; PRs that touch `scpcalc/` must pass `go test ./...`.

## Official sources (summary)

**Full index:** [docs/en/00-References.md](docs/en/00-References.md) · [docs/fa/00-References.md](docs/fa/00-References.md) · [`VERSION.md`](VERSION.md)

- [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)
- [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)
- [System requirements](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)
- [Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations)
- [ES 8.5 planning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment)
- [ITSI 5.0 Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)
- [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)
