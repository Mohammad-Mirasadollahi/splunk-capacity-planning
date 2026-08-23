# Changelog

All notable changes to this repository are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/)-style sections so GitHub Releases can show what actually changed between versions.

## 0.4.17 — 2026-08-23

- Fix main page scroll lock after closing wizard or fullscreen overlays

## 0.4.16 — 2026-08-23

- Remove duplicate Enable custom sources CTA; Main index selectable alongside catalog indexes

## 0.4.15 — 2026-08-23

- Sources: single scroll, mouse wheel in wizard, readable table inputs

## 0.4.14 — 2026-08-23

- Sources: restore add/index toolbar, presets catalog, scroll and inputs

## 0.4.13 — 2026-08-23

- Log sources toggle, main-only mode, fullscreen table

## 0.4.12 — 2026-08-23

- Remove DMA auto-calc note from Review budget hint

## 0.4.11 — 2026-08-23

- CPU by role chart alongside RAM in Preview/Results charts

## 0.4.10 — 2026-08-23

- Modal open locks background scroll; modal content scrolls

## 0.4.9 — 2026-08-23

- Preview charts show GB on DMA and aligned live values

## 0.4.8 — 2026-08-23

- DMA amounts show GB unit (e.g. 96 GB DMA)

## 0.4.7 — 2026-08-23

- Review sources Total column per-indexer label and tooltip

## 0.4.6 — 2026-08-23

- Wizard context fade works on all wizard tabs and nested scroll areas

## 0.4.5 — 2026-08-23

- Wizard context banner fades on scroll down, returns on scroll up

## 0.4.4 — 2026-08-23

- Remove Summary Index UI; DMA-only storage when enabled; Review live totals

## 0.4.3 — 2026-08-23

- Centralized form control sizing; fix stretched Policy volume inputs

## 0.4.2 — 2026-08-23

- DMA included in Storage Required totals, per-indexer/per-index disk, and Policy disk total when enabled

## 0.4.1 — 2026-08-23

- Review/Storage show DMA need with dma_years horizon; docs updated

## 0.4.0 — 2026-08-01

### Added

- **Official node-count modal** — Results button “How many servers do I need?” opens guidance from Splunk Capacity Planning tables; separate Apply for Indexers and Search Heads.
- **Search load section** — Topology form requires concurrent Search Head users and searches running at the same moment (default 8); drives CPU/RAM and node counts per Reference hardware.

### Changed

- **Hardware SKUs (CPU/RAM)** — Indexer and Search Head tiers follow official Reference hardware / ES 8.5 / ITSI 5.0: per-peer ingest, concurrent searches, concurrent users, and app floors (ES/ITSI ≥ 16c/32GB — not automatic High).
- **ES indexer floors** — Overlapping ES scaling bands take the higher peer count (625 GB–&lt;15 TB → 24; 15 TB → 150).
- Clearer user-facing labels (no `N_IDX` / `N_SH` jargon in the official sizing UI).

### Commits since 0.3.4

- `release: SCPcalc 0.4.0 — official hardware sizing, search load, node-count Apply modal`

## 0.3.4 — 2026-07-27

### Fixed

- **Results fullscreen** — Per index / Nodes / Design / Settings / Resources: expand now portals the panel to `document.body` so `.glass` `backdrop-filter` / `overflow` no longer traps `position:fixed`. Expand/collapse buttons honor `[hidden]` again.
- **Number steppers** — +/- controls stay inside the input chrome (flex frame, not absolute overlays).

### Added

- **Overview ingest banner** — Results Overview leads with total daily volume (GB/day) and EPS.
- **Total Storage** metric plus sectioned Preview / Overview metrics; shared Retention / Storage / Per-index rendering so Preview and Results stay identical.
- Review: hide Next on last step; Sources Total Time + Archive columns.

### Changed

- Hardware-by-role table removed; single Nodes table carries full hardware specs.
- Modular wizard CSS / i18n / plan-form barrels; RF/SF clamped to indexer count.

### Commits since 0.3.3

- `fix(ui): portal Results fullscreen; show Overview ingest banner`
- `feat(ui): unify Review Preview with Results Overview`
- `fix(ui): contain number steppers inside input chrome`
- `feat(ui): modular wizard assets, RF/SF clamps, Review totals`

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
