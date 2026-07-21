# Changelog

All notable changes to this repository are documented here.

## 0.3.2 — 2026-07-21

- Fix homePath exceeding maxTotal, empty-index success path, and duplicate cluster metric cards

## 0.3.1 — 2026-07-19

- Quick Start adds avg event size and headroom as single volume drivers; Apply seeds stay overridable

## 0.3.0 — 2026-07-19

- Wizard Quick Start: EPS or daily volume estimate with optional Apply defaults; Volume/Retention first, Cluster second

## 0.2.0 — 2026-07-17

### SCPcalc (calculator)

- **Retention time ↔ disk** — Policy mode: plan by hot+cold days or by searchable hot/cold GB; the other side converts via daily on-disk × days × headroom (same dual-edit pattern as GB/day = EPS). Total searchable days and total disk shown; Archive on freeze remains policy-only.
- **Nodes inventory** — Resources expands roles into labeled nodes (Indexer → **Peer** `peer-01`…, Search Head, CM, Deployer, …) with select, search, and full specs for the selection.
- **Fullscreen + Copy** — Design, Resources, Settings, Nodes, and Per-index panels.
- **Charts** — Storage and Retention cards show layer **totals**.
- **indexes.conf header** — Author Mohammad Mirasadollahi, GitHub/docs/calc links, and a dynamic plan snapshot from wizard settings.
- **Wizard** — Back hidden on Topology (step 1); Cancel closes.

### Docs / site

- Bilingual README + `scpcalc/README.md` updated for the 0.2 UX.
- GitHub Pages `/calc/` rebuilds via CI (WASM); Release binaries + **GHCR** package `ghcr.io/mohammad-mirasadollahi/scpcalc`.

## 0.1.4 — 2026-07-17

- SHC 1-or-≥3 + Manager/Deployer, cluster Yes/No prompts, wizard Back beside Next, Persian RTL arrows, and issue templates

## 0.1.3 — 2026-07-17

- Align CLI Release and GHCR with wizard UX (Daily/EPS volume mode, full Review preview) and hardened Pages/CI deploy
- **GitHub Package (GHCR)** — container image `ghcr.io/mohammad-mirasadollahi/scpcalc`

## 0.1.2 — 2026-07-17

- One-click release helper, bilingual README, Search Head concurrent-search sizing, and docs language mode

## 0.1.1 — 2026-07-17

### SCPcalc (calculator)

- **No exclusive planning mode** — fill any combination of source volumes, `total_daily_gb`, and available disk budgets; the engine infers the plan.
- **Shareable plans** — **Export URL** copies a link with the plan in the URL hash (`#scp1…` / `#scp1z…`); **Import** accepts paste of that URL or a `.json` file.
- **Clearer Web UI** — plain-language field labels and short hints (EN/FA), improved typography (DM Sans / Fraunces / Vazirmatn).
- **Charts** — segment borders removed; chart type dropdown styled for the dark theme; charts with fewer than two meaningful values stay hidden.
- **Resources / Per index** — richer columns (CPU physical/logical, network, Find-in-table).
- Wizard steps: Topology → Retention → Sources → Review.

### Knowledge pack

- CPU physical vs logical / virtualization / parallelization notes aligned with official Splunk references (`docs/en|fa/01`).
- Companion calculator pointers in `docs/en|fa/00-References.md`.

### GitHub Pages

- Live docs: https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/
- Live calculator: https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/

## 0.1.0 — initial public pack

- Bilingual capacity-planning knowledge pack (`docs/en`, `docs/fa`).
- Portable SCPcalc CLI + embedded Web UI + WASM for static hosting.
