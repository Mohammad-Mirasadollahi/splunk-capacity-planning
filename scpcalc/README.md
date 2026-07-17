# SCPcalc

Portable **Splunk Capacity Planning** calculator — **CLI + local Web UI** in one Go binary, plus a **browser WASM** engine for static hosting (GitHub Pages).

**Designed by [Mohammad Mirasadollahi](https://github.com/Mohammad-Mirasadollahi)** · **Repository:** [splunk-capacity-planning](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

Same engine for CLI, `serve`, and in-browser WASM: multi-index storage sizing, **N_SH / N_IDX** from concurrent users × daily volume × clustering, hardware layers, design narrative, and a draft **`indexes.conf`**.

| | |
|---|---|
| Design docs | [`docs/01-HLD.md`](docs/01-HLD.md) · [`02-LLD.md`](docs/02-LLD.md) · [`03-Logic-and-Formulas.md`](docs/03-Logic-and-Formulas.md) · [`04-Language-and-Portability.md`](docs/04-Language-and-Portability.md) |
| Knowledge pack (formulas & citations) | [`../docs/en/`](../docs/en/) — start at [`00-References.md`](../docs/en/00-References.md) |
| Default listen | **`0.0.0.0:12345`** (override via `.env` / flags) |

**Not a substitute for Splunk Professional Services.** Outputs are guidelines aligned to official Capacity Planning tables; premium-app KPI/detection load is only partially automated (see [Non-goals](#non-goals)).

---

## Features

- **Modes:** `sources` (per-index ingest) · `total` (one daily GB figure) · `capacity` (fit / reverse from available disk)
- **Multi-index:** `daily_gb` and/or EPS × event size; optional summary indexes
- **Node counts:** `concurrent_users` × daily volume → platform table, then SHC / indexer-cluster / ES / ITSI floors
- **Topology:** indexer cluster (RF/SF), SHC (+ deployer), SmartStore (local cache + remote size), ES, ITSI
- **Storage:** compression from RF/SF or measured `C`; DMA/tstats; optional frozen archive (`coldToFrozenDir`)
- **Conf:** per-peer MB fields when `N_IDX > 1`; volume stanzas; downloadable draft
- **UI:** wizard (EN/FA), charts, tips with official Splunk links, conf editor — fully offline (embedded Chart.js, system fonts)

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

Version file: [`VERSION`](VERSION) (currently `0.1.0`).

```bash
cd scpcalc
make release              # → releases/scpcalc-v0.1.0/ (gitignored)
# Publish on GitHub by tagging:
git tag scpcalc-v0.1.0 && git push origin scpcalc-v0.1.0
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
2. **Indexer cluster:** never stay combined; peers ≥ **RF**; + cluster manager.
3. **SHC:** `N_SH` ≥ **3** + deployer.
4. **ES / ITSI:** indexer floors from doc tables / `≈ceil(D/100)` for ITSI.
5. **Overrides:** `--n-idx` / `--n-sh` (or JSON `n_idx` / `n_sh`); `0` = auto. Values below floors warn; RF / SHC still hard-raise when clustering is on.

CLI and Overview both print the step-by-step **NODE COUNTS** rationale.

---

## Planning modes

| Mode | When to use | Key inputs |
|---|---|---|
| `sources` (default) | You know per-source / per-index volume | `sources[]` with `daily_gb` or `eps`+`event_bytes` |
| `total` | “If ~D GB/day arrives…” | `total_daily_gb` (optional source split) |
| `capacity` | Disk budget is fixed | `available_hot_gb` / `available_cold_gb` (/ summaries); optional known ingest |

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

#### Mode & volume

| Flag | Meaning |
|---|---|
| `--mode sources\|total\|capacity` | Planning mode (default `sources`) |
| `--total-daily-gb FLOAT` | Aggregate daily ingest |
| `--available-hot-gb FLOAT` | Capacity mode — hot/warm disk |
| `--available-cold-gb FLOAT` | Capacity mode — cold disk |
| `--available-summaries-gb FLOAT` | Capacity mode — summaries / DMA disk |

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

#### Topology (users × volume → N_SH / N_IDX)

| Flag | Meaning |
|---|---|
| `--concurrent-users INT` | Concurrent SH users **U** (default `8`) |
| `--indexer-cluster` | Enable indexer clustering |
| `--search-head-cluster` | Enable SHC (floor ≥ 3 SH + deployer) |
| `--rf INT` `--sf INT` | Used when indexer cluster on (defaults `3` / `2`) |
| `--n-idx INT` `--n-sh INT` | `0` = auto from table + floors |
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

```json
{
  "mode": "sources",
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
  "sources": [
    {
      "key": "win",
      "label": "Windows",
      "index_name": "windows",
      "daily_gb": 50,
      "event_bytes": 400
    },
    {
      "key": "net",
      "label": "Network",
      "index_name": "network",
      "eps": 2000,
      "event_bytes": 800,
      "enable_summary": true
    }
  ]
}
```

---

## Web UI

1. `./bin/scpcalc serve` → open `http://127.0.0.1:12345`
2. **Start wizard:** mode → topology (cluster / apps / advanced) → retention → sources → review → **Calculate**
3. **Results tabs:** Overview (metrics + node-count rationale) · Charts · Design · Resources · Settings · Per index · indexes.conf (editor / rename)
4. Language toggle **EN / FA**; hover dotted labels for formula + example + official links
5. Download design text / `indexes.conf` from the results toolbar

Wizard fields match CLI / API (`concurrent_users`, clusters, ES/ITSI, DMA, SmartStore, compression, archive, disk budgets, …).

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
make build         # → bin/scpcalc
make live-test     # full CLI + HTTP API + UI asset feature matrix → live-test.json
make dist          # cross-compile → dist/
```

`make live-test` runs [`scripts/live_test.py`](scripts/live_test.py): builds assertions for node counts (SHC/RF/ES/ITSI), SmartStore, DMA, archive, capacity/total modes, `--plan`/`--conf-out`, `/api/v1/plan`, static modules, and plan-form fields.

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
