# Changelog

All notable changes to this repository are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/)-style sections so GitHub Releases can show what actually changed between versions.

## 0.3.3 — 2026-07-24

- Fixed wizard shell layouts, tip delay, EPS decimals, Hot 7d / Cold 30d / Archive defaults

## 0.3.2 — 2026-07-21

### Fixed

- **homePath vs maxTotal** — When `hot_warm_days` was greater than `retention_days`, the engine only warned but still wrote `homePath.maxDataSizeMB` larger than `maxTotalDataSizeMB` (invalid Splunk sizing). Hot/warm days are now clamped to retention so `homePath ≤ maxTotal` and cold is the remainder.
- **Empty legacy Calculate** — The single-index `Calculate` path treated “no indexes” as failure but returned a nil error, which could look like success with an empty result. It now returns a clear error.
- **Duplicate cluster metrics** — Results overview no longer shows Cluster manager / SHC deployer cards twice.

## 0.3.1 — 2026-07-19

### Changed

- **Quick Start** — Avg event size and headroom are single volume drivers; Apply still seeds defaults that you can override afterward.

## 0.3.0 — 2026-07-19

### Added

- **Wizard Quick Start** — Estimate from EPS or daily volume, with optional Apply defaults.

### Changed

- Wizard order: Volume / Retention first, Cluster second (clearer planning flow).

## 0.2.0 — 2026-07-17

### Added

- **Retention time ↔ disk** — Plan by hot+cold days or by searchable hot/cold GB; the other side converts via daily on-disk × days × headroom (same dual-edit pattern as GB/day ↔ EPS). Archive-on-freeze stays policy-only.
- **Nodes inventory** — Resources expands roles into labeled nodes (Indexer → Peer `peer-01`…, Search Head, CM, Deployer, …) with select, search, and full specs.
- **Fullscreen + Copy** on Design, Resources, Settings, Nodes, and Per-index panels.
- **indexes.conf header** — Author, GitHub/docs/calc links, and a dynamic plan snapshot from wizard settings.

### Changed

- Charts show storage / retention layer **totals**.
- Wizard: Back hidden on Topology (step 1); Cancel closes.

### Docs / site

- Bilingual README + `scpcalc/README.md` updated for the 0.2 UX.
- GitHub Pages `/calc/` rebuilds via CI (WASM); Release binaries + GHCR package `ghcr.io/mohammad-mirasadollahi/scpcalc`.

## 0.1.4 — 2026-07-17

### Added

- SHC sizing rules (1 or ≥3) plus Manager / Deployer guidance.
- Cluster Yes/No prompts and issue templates.

### Changed

- Wizard Back sits beside Next; Persian RTL arrow direction fixed.

## 0.1.3 — 2026-07-17

### Added

- **GitHub Package (GHCR)** — container image `ghcr.io/mohammad-mirasadollahi/scpcalc`.

### Changed

- CLI Release and GHCR aligned with wizard UX (Daily/EPS volume mode, full Review preview).
- Hardened Pages / CI deploy.

## 0.1.2 — 2026-07-17

### Added

- One-click release helper (`tools/release.sh`).
- Bilingual README.
- Search Head concurrent-search sizing.
- Docs language mode.

## 0.1.1 — 2026-07-17

### Added

- **Flexible planning** — Combine source volumes, `total_daily_gb`, and available disk budgets; the engine infers the plan (no exclusive mode).
- **Shareable plans** — Export URL (`#scp1…` / `#scp1z…`); Import accepts that URL or a `.json` file.
- Clearer Web UI labels/hints (EN/FA) and typography (DM Sans / Fraunces / Vazirmatn).
- Richer Resources / Per-index columns (CPU physical/logical, network, find-in-table).

### Changed

- Charts: borders cleaned up; dark-theme chart-type dropdown; charts with fewer than two meaningful values stay hidden.
- Wizard steps: Topology → Retention → Sources → Review.

### Docs / site

- CPU physical vs logical / virtualization notes aligned with Splunk references.
- Live docs + calculator on GitHub Pages.

## 0.1.0 — 2026-07-17

### Added

- Bilingual capacity-planning knowledge pack (`docs/en`, `docs/fa`).
- Portable SCPcalc CLI + embedded Web UI + WASM for static hosting.
