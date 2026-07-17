# Changelog

All notable changes to this repository are documented here.

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
