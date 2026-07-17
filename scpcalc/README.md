# SCPcalc

Portable **Splunk Capacity Planning** calculator — **CLI + local Web UI** in one Go binary, plus a **browser WASM** engine for static hosting (GitHub Pages).

**Designed by [Mohammad Mirasadollahi](https://github.com/Mohammad-Mirasadollahi)** · **Repository:** [splunk-capacity-planning](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

Same engine for CLI, `serve`, and in-browser WASM: multi-index storage sizing, **N_SH / N_IDX** from concurrent users × daily volume × **concurrent searches** × clustering, hardware layers, design narrative, and a draft **`indexes.conf`**.

| | |
|---|---|
| Design docs | [`docs/01-HLD.md`](docs/01-HLD.md) · [`02-LLD.md`](docs/02-LLD.md) · [`03-Logic-and-Formulas.md`](docs/03-Logic-and-Formulas.md) · [`04-Language-and-Portability.md`](docs/04-Language-and-Portability.md) |
| Knowledge pack (formulas & citations) | [`../docs/en/`](../docs/en/) — start at [`00-References.md`](../docs/en/00-References.md) |
| Default listen | **`0.0.0.0:12345`** (override via `.env` / flags) |

**Not a substitute for Splunk Professional Services.** Outputs are guidelines aligned to official Capacity Planning tables; premium-app KPI/detection load is only partially automated (see [Non-goals](#non-goals)).

---

## Features

- **Inputs:** per-source volumes, optional `total_daily_gb`, optional disk budgets — combinable (no exclusive planning mode)
- **Multi-index:** `daily_gb` and/or EPS × event size; optional summary indexes
- **Node counts:** `concurrent_users` × daily volume → platform table; then raise `N_SH` so total SH cores cover `concurrent_searches` (1 active search ≤ 1 CPU core); then SHC / indexer-cluster / ES / ITSI floors. `saved_searches` is a Dimensions input (warnings / SH notes).
- **Topology:** indexer cluster (RF/SF), SHC (+ deployer), SmartStore (local cache + remote size), ES, ITSI
- **Storage:** compression from RF/SF or measured `C`; DMA/tstats; optional frozen archive (`coldToFrozenDir`)
- **Conf:** per-peer MB fields when `N_IDX > 1`; volume stanzas; downloadable draft
- **UI:** wizard (EN/FA) with plain-language labels, charts, tips with official Splunk links, conf editor; share via Export URL / Import

---

## Install

### GitHub Releases

1. Open repository **Releases** (tags `scpcalc-v*`).
2. Download `scpcalc-<os>-<arch>` and verify `SHA256SUMS`.
3. `chmod +x scpcalc-*` (Unix) and run.

### Build from source

```bash
cd scpcalc
make test
make wasm          # Go → WebAssembly for browser UI
make build
./bin/scpcalc version
```

### Releases (binaries + WASM — not in git)

Version file: [`VERSION`](VERSION) (currently `0.1.2`).

**One-click release** (from repo root) — product help asks *why*, then bumps version, CHANGELOG, commit, tag, and push:

```bash
./tools/release.sh
# or non-interactive:
./tools/release.sh --bump patch --reason "Fix share URL import on Safari" --yes
./tools/release.sh --help
./tools/release.sh --dry-run --bump minor --reason "Preview only"
```

Manual equivalent:

```bash
cd scpcalc
make release              # → releases/scpcalc-v0.1.2/ (gitignored)
# Publish on GitHub by tagging:
git tag scpcalc-v0.1.2 && git push origin scpcalc-v0.1.2
# Actions builds binaries + WASM and attaches them to the Release.
```

Large files are **gitignored** (`*.wasm`, `calc/*` UI export, `releases/`). CI builds WASM for Pages (`/calc/`) and for each tagged Release.

Requires a recent Go toolchain (see `go.mod`).

---

## Quick start

```bash
cp .env.example .env          # optional
./bin/scpcalc serve           # http://0.0.0.0:12345

# CLI — same engine as the Web UI
./bin/scpcalc calc --daily-gb 800 --concurrent-users 12 \
  --indexer-cluster --rf 3 --sf 2 --search-head-cluster

./bin/scpcalc calc --plan plan.json --json
./bin/scpcalc calc --daily-gb 100 --conf-out indexes.conf --design-out design.txt
```

Open **http://127.0.0.1:12345** → Start wizard → Calculate → Overview / Design / Resources / Settings / indexes.conf.

---

## How node counts are chosen

1. **Base:** Splunk [Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations) — daily ingest **D** × concurrent SH users **U** → baseline `N_SH` / `N_IDX` (or one combined node for tiny labs).
2. **Concurrent search volume:** [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — each active search ≤ **1 CPU core**. Raise `N_SH` to `ceil(S / 16)` when peak concurrent searches **S** need more cores. [Dimensions](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment) also list **saved searches** as a sizing input.
3. **Indexer cluster:** never stay combined; peers ≥ **RF**; + cluster manager.
4. **SHC:** `N_SH` ≥ **3** + deployer.
5. **ES / ITSI:** indexer floors from doc tables / `≈ceil(D/100)` for ITSI.
5. **Overrides:** `--n-idx` / `--n-sh` (or JSON `n_idx` / `n_sh`); `0` = auto. Values below floors warn; RF / SHC still hard-raise when clustering is on.

CLI and Overview both print the step-by-step **NODE COUNTS** rationale.

---

## Volume inputs (combinable)

There is **no exclusive planning mode**. Fill any combination:

| Input | Effect |
|---|---|
| `sources[]` with `daily_gb` or `eps`+`event_bytes` | Size those indexes |
| `total_daily_gb` | Synthesize `main` if no sources, or scale source rows to the total |
| `available_hot_gb` / `available_cold_gb` (/ summaries) | Fit badges + max daily / max retention from disk |

`--mode` on the CLI is **deprecated** and ignored; the result label (`sources`/`total`/`capacity`) is inferred for display only.

---

## CLI reference

```text
scpcalc calc [flags]
scpcalc serve [--addr HOST:PORT] [--host HOST] [--port PORT]
scpcalc version
scpcalc help
```

### `serve`

| Flag | Meaning |
|---|---|
| `--addr HOST:PORT` | Full listen address (wins) |
| `--host HOST` | Bind host (default `0.0.0.0`) |
| `--port PORT` | Bind port (default `12345`) |

Resolution: **CLI → process env → `.env` → defaults**.

### `calc` — same `PlanInput` as the Web UI / `POST /api/v1/plan`

#### Input files

| Flag | Meaning |
|---|---|
| `--plan FILE` | Full plan JSON (`-` = stdin). Flags overlay non-zero / explicitly set fields. |
| `--sources FILE` | JSON array of source rows (merged into the plan) |

#### Volume (combinable)

| Flag | Meaning |
|---|---|
| `--total-daily-gb FLOAT` | Optional aggregate daily ingest |
| `--available-hot-gb FLOAT` | Optional hot/warm disk budget |
| `--available-cold-gb FLOAT` | Optional cold disk budget |
| `--available-summaries-gb FLOAT` | Optional summaries / DMA disk |
| `--mode …` | Deprecated; ignored (inferred from fields) |

#### Retention & paths

| Flag | Default / notes |
|---|---|
| `--retention-days INT` | `90` |
| `--hot-warm-days INT` | `30` |
| `--headroom FLOAT` | `1.2` |
| `--summary-pct FLOAT` | `0.10` |
| `--summary-retention-days INT` | defaults to retention |
| `--hot-path` `--cold-path` `--frozen-path` `--summaries-path` | volume paths |
| `--archive-frozen` | emit `coldToFrozenDir` instead of delete |
| `--compression FLOAT` | measured C; `0` = derive from RF/SF (or 0.5 standalone) |

#### Topology (users × searches × volume → N_SH / N_IDX)

| Flag | Meaning |
|---|---|
| `--concurrent-users INT` | Concurrent SH users **U** (default `8`) — Performance Recommendations row |
| `--concurrent-searches INT` | Peak concurrent searches **S** (default = U); raise N_SH so cores ≥ S (1 search ≤ 1 CPU core) |
| `--saved-searches INT` | Total saved/scheduled searches (Dimensions); default `0` |
| `--indexer-cluster` | Enable indexer clustering |
| `--search-head-cluster` | Enable SHC (floor ≥ 3 SH + deployer) |
| `--rf INT` `--sf INT` | Used when indexer cluster on (defaults `3` / `2`) |
| `--n-idx INT` `--n-sh INT` | `0` = auto from table + search-core + floors |
| `--smartstore` | SmartStore sizing hints |
| `--remote-path STRING` | Object-store path hint |
| `--has-es` `--has-itsi` | Premium apps (floors / separate SH tiers) |
| `--es-smartstore` | Alias: ES + SmartStore |
| `--enable-dma` / `--no-dma` | DMA/tstats (default on when ES if unset) |
| `--dma-pct FLOAT` | Fraction for DMA estimate (default `0.10`) |

Legacy convenience (if no `--plan` / `--sources`): `--daily-gb`, `--eps`, `--event-bytes`, `--index-name`.  
Without `--plan`: if `--rf` or `--sf` &gt; 1 and `--indexer-cluster` was not passed, cluster is implied (same idea as `Input.ToPlan`).  
With `--plan`: `"indexer_cluster": false` in JSON is never overridden by RF/SF in that file.

#### Output

| Flag | Meaning |
|---|---|
| *(default)* | Human report: totals, **node counts + rationale**, design, resources, settings, indexes, `indexes.conf` |
| `--json` | Full `PlanResult` JSON (same shape as the API) |
| `--conf-out FILE` | Write `indexes.conf` |
| `--design-out FILE` | Write node plan + structure + resources + settings |

### Examples

```bash
# Users × volume × clustering → node counts
./bin/scpcalc calc --daily-gb 800 --concurrent-users 12 \
  --indexer-cluster --rf 3 --sf 2 --search-head-cluster

# ES floor on indexers
./bin/scpcalc calc --daily-gb 200 --concurrent-users 8 --has-es --indexer-cluster

# Capacity reverse (max daily / max retention from disk)
./bin/scpcalc calc --mode capacity \
  --available-hot-gb 2000 --available-cold-gb 8000 \
  --retention-days 90 --hot-warm-days 30 --concurrent-users 8

# Full plan from JSON + files
./bin/scpcalc calc --plan plan.json --json --conf-out indexes.conf --design-out design.txt

# Pipe plan on stdin
cat plan.json | ./bin/scpcalc calc --plan - --json
```

### Sample `plan.json`

See also [`examples/plan.sample.json`](examples/plan.sample.json).

```json
{
  "concurrent_users": 12,
  "indexer_cluster": true,
  "rf": 3,
  "sf": 2,
  "search_head_cluster": true,
  "retention_days": 90,
  "hot_warm_days": 30,
  "headroom": 1.2,
  "hot_path": "/hot",
  "cold_path": "/cold",
  "frozen_path": "/frozen",
  "summaries_path": "/summaries",
  "total_daily_gb": 500,
  "available_hot_gb": 10000,
  "available_cold_gb": 20000,
  "available_summaries_gb": 2000,
  "sources": [
    {
      "key": "windows",
      "label": "Windows",
      "index_name": "windows",
      "daily_gb": 400,
      "event_bytes": 1200
    },
    {
      "key": "linux",
      "label": "Linux",
      "index_name": "linux",
      "daily_gb": 100,
      "event_bytes": 300
    }
  ]
}
```

First-run Web UI seeds the same volume defaults (`total_daily_gb` 500, hot/cold/summaries disk budgets, Windows 400 + Linux 100 GB/day raw) so Calculate works before you edit anything.

**Volume mode:** choose **Daily GB** *or* **EPS** (not both as primary inputs). Under each number the other unit is estimated from average event size; sources without an EPS inherit the average EPS of filled sources.

---

## Web UI

1. `./bin/scpcalc serve` → open `http://127.0.0.1:12345`  
   (or GitHub Pages: `https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/`)
2. **Start wizard:** topology → retention (Volumes: optional total/disk) → sources → review → **Calculate**
3. **Results tabs:** Overview (metrics + node-count rationale) · Charts · Design · Resources · Settings · Per index · indexes.conf (editor / rename)
4. Language toggle **EN / FA**; hover dotted labels for formula + example + official links
5. Download design text / `indexes.conf` from the results toolbar

### Save / Export / Import

| Action | Where | What it does |
|---|---|---|
| **Save** / **Load** | Wizard sources · hero | Browser `localStorage` on this device |
| **Export .json** | Wizard sources | Download a full plan snapshot file |
| **Export URL** | Hero · wizard · results | Copies a shareable link with the plan encoded in the URL hash (`#scp1…` / `#scp1z…`) — paste into docs or send to a colleague |
| **Import** | Hero | Paste an Export URL / hash **or** choose a `.json` file |

Opening an Export URL (or pasting it in **Import**) restores globals + sources and opens the wizard. Large plans that do not fit in a URL should use **Export .json**.

Wizard fields use clear labels (for example “Number of indexers” with “Leave 0 to calculate automatically”). Technical tip popovers still expose formulas and official Splunk links. Field names in JSON/CLI remain the API identifiers (`n_idx`, `rf`, …).

---

## HTTP API

Same process as `serve`:

| Method | Path | Body / notes |
|---|---|---|
| `GET` | `/api/v1/health` | `{status, version}` |
| `GET` | `/api/v1/presets` | Event-size catalog |
| `POST` | `/api/v1/plan` | **Primary** — `PlanInput` → `PlanResult` (+ `design`) |
| `POST` | `/api/v1/calculate` | Legacy single-index `Input` → `Result` |

```bash
curl -s http://127.0.0.1:12345/api/v1/health
curl -s -X POST http://127.0.0.1:12345/api/v1/plan \
  -H 'Content-Type: application/json' \
  -d @plan.json | jq '.design.n_sh, .design.n_idx, .design.node_plan_text'
```

Validation errors → HTTP **400** `{"error":"..."}` (CLI: stderr + exit **1**).

---

## Configuration (`.env`)

Copy [`.env.example`](.env.example) → `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `SCPCALC_HOST` | `0.0.0.0` | Bind host |
| `SCPCALC_PORT` | `12345` | Bind port |
| `SCPCALC_ADDR` | _(empty)_ | Optional full `host:port` (cleared if `--host`/`--port` set) |
| `SCPCALC_ENV_FILE` | _(empty)_ | Alternate env file path |

Priority: **CLI flags → OS env → `.env` → defaults**. Existing OS env vars are never overwritten by `.env`.

```bash
./bin/scpcalc serve --host 127.0.0.1 --port 12345
./bin/scpcalc serve --addr 0.0.0.0:12345
```

---

## Develop / test

```bash
make test          # go test ./...  (calc, arch, confgen, model, config, server, presets, cmd)
make html          # assemble web/html/ partials → web/index.html
make build         # html + wasm → bin/scpcalc
make live-test     # full CLI + HTTP API + UI asset feature matrix → live-test.json
make dist          # cross-compile → dist/
```

`make live-test` runs [`scripts/live_test.py`](scripts/live_test.py): builds assertions for node counts (SHC/RF/ES/ITSI), SmartStore, DMA, archive, capacity/total modes, `--plan`/`--conf-out`, `/api/v1/plan`, static modules, and plan-form fields.

Edit the UI markup under `web/html/` (partials + `index.html.tmpl`); `make html` / `make build` regenerates `web/index.html` for embed and Pages.
| Package | Focus |
|---|---|
| `cmd` | CLI `calc` / `serve` (full plan parity with UI) |
| `internal/calc` | Compression, retention MB, plan modes, summaries |
| `internal/arch` | `RecommendCounts` / `ResolveNodeCounts`, resources, narratives |
| `internal/confgen` | Volume / index stanzas |
| `internal/model` | Validation / defaults |
| `internal/config` | `.env` + addr resolution |
| `internal/server` | HTTP API + embedded UI |
| `web` | SPA modules (`web/js/*`, `web/css/*`) |

---

## Non-goals

Kept honest vs the knowledge pack / HLD:

- Full ITSI KPI / entity load tables (indexer floor uses a simple guideline)
- Full ES detection / skip-search capacity modeling
- Multisite RF/SF site topology
- Detailed BOM, Heavy Forwarder fleets, IOPS/latency engines

Use the pack docs for those topics; the calculator applies documented floors and storage math.

---

## License

MIT — see repository root [`LICENSE`](../LICENSE).
