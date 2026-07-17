# SCPcalc static Web UI (GitHub Pages)

This directory is **generated** — WASM/binaries are **not** committed (keeps the git repo small).

**Designed by [Mohammad Mirasadollahi](https://github.com/Mohammad-Mirasadollahi)** · [Repository](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

```bash
cd scpcalc
make pages-calc          # local preview → ../calc/
```

**CI:** `.github/workflows/scpcalc-pages.yml` builds WASM and deploys docs + `/calc/` on push to `main`/`master` (and `workflow_dispatch`).

**Live calculator:** [https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/)

### Share a plan (Export URL / Import)

1. Configure the wizard (or finish Calculate).
2. Click **Export URL** (hero, sources step, or results toolbar) — the link is copied (plan lives in `#scp1…` / `#scp1z…`).
3. Paste that link into docs, tickets, or chat.
4. Anyone opening the link (or pasting it under **Import** → *Load from URL*) gets the same plan restored.

Also supported: **Export .json** / **Import** → choose `.json` file, and **Save** / **Load** for this browser only.
