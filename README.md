# Splunk Capacity Planning

Official Splunk **Capacity Planning** guidance (Infrastructure + Storage), extracted into bilingual docs for GitHub — plus a portable **CLI + Web** calculator (**SCPcalc**).

**Designed by [Mohammad Mirasadollahi](https://github.com/Mohammad-Mirasadollahi)** · **GitHub:** [Mohammad-Mirasadollahi/splunk-capacity-planning](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

**Language:** **English** (this page) · [فارسی](README.fa.md)  
**Live site:** [Documentation hub](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=en) · [SCPcalc calculator](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/?lang=en)

Named after Splunk’s Capacity Planning Manual — see [Introduction to capacity planning](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise).

**License:** [MIT](LICENSE) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

## Documentation hub

Browse the bilingual capacity-planning pack in the designed GitHub Pages site (not only raw Markdown):

| | |
|---|---|
| **Documentation (English)** | [mohammad-mirasadollahi.github.io/…/?lang=en](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=en) |
| **مستندات (فارسی)** | [mohammad-mirasadollahi.github.io/…/?lang=fa](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa) |
| **Source Markdown** | [`docs/en/`](docs/en/) · [`docs/fa/`](docs/fa/) |

## Calculator (SCPcalc)

Portable single binary (Go): **CLI + local Web UI**, same engine — also runs **in the browser via WebAssembly** (no server needed for GitHub Pages).

Estimates searchable storage / retention MB fields, recommends **N_SH / N_IDX** from concurrent users × daily volume × concurrent searches × clustering, drafts hardware layers + **`indexes.conf`**.

| | |
|---|---|
| **User guide (full CLI + UI + API)** | [`scpcalc/README.md`](scpcalc/README.md) |
| **Static Web UI (WASM)** | [`calc/`](calc/) — built in CI for Pages at `/calc/` (WASM **not** committed) |
| Design | [`scpcalc/docs/`](scpcalc/docs/) (HLD · LLD · Logic · Language) |
| Download | GitHub **Releases** (tag `scpcalc-v*`) — create with [`./tools/release.sh`](tools/release.sh) |
| **GitHub Package** | Container: [`ghcr.io/mohammad-mirasadollahi/scpcalc`](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/pkgs/container/scpcalc) |
| Local build | `cd scpcalc && make test && make wasm && make build` |

```bash
cd scpcalc && make build

./bin/scpcalc serve                 # http://0.0.0.0:12345  (embeds WASM UI)

./bin/scpcalc calc --daily-gb 800 --concurrent-users 12 \
  --indexer-cluster --rf 3 --sf 2 --search-head-cluster

./bin/scpcalc calc --plan plan.json --json --conf-out indexes.conf

# GitHub Package (container) — CLI + Web UI on port 12345:
docker pull ghcr.io/mohammad-mirasadollahi/scpcalc:latest
docker run --rm -p 12345:12345 ghcr.io/mohammad-mirasadollahi/scpcalc:latest
# or: docker run --rm ghcr.io/mohammad-mirasadollahi/scpcalc:latest calc --daily-gb 100 --json

# Static site for Pages (no backend; WASM built in CI, not committed):
make pages-calc                     # → ../calc/ (gitignored except README)
make release                        # → scpcalc/releases/scpcalc-v* (gitignored)
# Tag scpcalc-v0.1.0 → GitHub Actions attaches binaries + WASM to the Release
# and publishes the container package to GHCR
```

Config: [`scpcalc/.env.example`](scpcalc/.env.example) → `.env` (`SCPCALC_HOST` / `SCPCALC_PORT`, default port **12345**).

## Language

| | |
|---|---|
| **Default** | **English** — this README + [`docs/en/`](docs/en/) |
| فارسی | Separate page: [`README.fa.md`](README.fa.md) + [`docs/fa/`](docs/fa/) |
| Live hub | [Pages (English)](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=en) · [Pages (فارسی)](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa) |

**English is the source of truth.** Persian docs must stay structurally synced (same files, section skeleton, citation URLs, version banners).

```bash
python3 tools/check_en_fa_sync.py
python3 tools/add_lang_switcher.py   # if you added a new paired file
```

**Doc policy:** Enterprise `/latest/` (**10.4**), ES **8.5** (help.splunk.com), ITSI **5.0** (help.splunk.com). Refresh: `python3 tools/sync_latest_docs.py --check-remote --apply`. See [`VERSION.md`](VERSION.md) · [`docs/en/00-References.md`](docs/en/00-References.md).

## Structure

```text
splunk-capacity-planning/
├── LICENSE / CONTRIBUTING.md / README.md / README.fa.md / CHANGELOG.md
├── index.html / view.html / assets/   ← docs language hub (Pages)
├── docs/en + docs/fa                  ← knowledge pack
├── tools/                             ← doc sync scripts
├── scpcalc/                           ← portable calculator (Go)
└── .github/workflows/
    ├── bilingual-sync.yml
    ├── scpcalc-ci.yml
    ├── scpcalc-pages.yml              ← docs + /calc/ deploy
    ├── scpcalc-release.yml            ← binaries on tag scpcalc-v*
    └── scpcalc-package.yml            ← GitHub Package (GHCR container)
```

## Quick start

0. **[Official References](docs/en/00-References.md)**  
1. [Infrastructure Sizing](docs/en/01-Infrastructure-Sizing.md)  
2. [Storage Sizing](docs/en/02-Storage-Sizing.md)  
3. [Disk Media, IOPS & Storage Topology](docs/en/03-Disk-Media-IOPS-and-Storage-Topology.md)  
4. [IOPS by Storage Architecture](docs/en/04-IOPS-Sizing-by-Storage-Architecture.md)  
5. [Index Buckets, Event Size & indexes.conf](docs/en/05-Index-Buckets-Retention-and-indexes-conf.md)

Persian guide list → [`README.fa.md`](README.fa.md).

## GitHub Pages

1. Settings → Pages → source: **GitHub Actions** (workflow [`scpcalc-pages.yml`](.github/workflows/scpcalc-pages.yml)).  
2. Language defaults to **English**; click **فارسی** on the live site (or open [`?lang=fa`](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa)).  
3. Docs render via `view.html`. Calculator: **`/calc/`** (browser WASM; large `.wasm` built in CI).  
   Live: [docs hub](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/) · [calculator](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/).  
   Use **Export URL** / **Import** to share a plan via the URL hash — see [`scpcalc/README.md`](scpcalc/README.md#save--export--import).

## Questions, features & bugs

Use **[GitHub Issues](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new/choose)** — pick the template that matches what you need:

| You want… | Open this | Include |
|---|---|---|
| **Help / a question** (how to size, how SCPcalc works, docs unclear) | [Question](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new?template=question.yml) | What you tried, links to docs/UI, expected outcome |
| **A new feature** (CLI flag, UI step, export format, …) | [Feature request](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new?template=feature_request.yml) | Problem, proposed idea, why it helps |
| **A bug** (wrong numbers, crash, broken Pages/CLI/Docker) | [Bug report](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new?template=bug_report.yml) | SCPcalc version (`scpcalc version`), OS, steps to reproduce, expected vs actual; attach **Export URL** or plan JSON if relevant |

Before opening an issue, skim [`CHANGELOG.md`](CHANGELOG.md) and the [latest Release](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/releases/latest) — the fix or feature may already ship. For calculator behavior, the live UI is useful for screenshots: [SCPcalc on Pages](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/).

**Security / private data:** do not paste production credentials, license keys, or customer-identifying logs into public issues. Redact plan JSON if needed.

Code contributions → [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). PRs that touch docs must pass `check_en_fa_sync.py`; PRs that touch `scpcalc/` must pass `go test ./...`.

## Official sources (summary)

**Full index:** [docs/en/00-References.md](docs/en/00-References.md) · [`VERSION.md`](VERSION.md)

- [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)
- [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)
- [System requirements](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)
- [Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations)
- [ES 8.5 planning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment)
- [ITSI 5.0 Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)
- [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)
