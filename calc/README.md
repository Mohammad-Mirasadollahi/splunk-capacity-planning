# scpcalc static Web UI (GitHub Pages)

This directory is **generated** — WASM/binaries are **not** committed (keeps the git repo small).

**Designed by [Mohammad Mirasadollahi](https://github.com/Mohammad-Mirasadollahi)** · [Repository](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

```bash
cd scpcalc
make pages-calc          # local preview → ../calc/
```

**CI:** `.github/workflows/scpcalc-pages.yml` builds WASM and deploys docs + `/calc/` on push to `main`/`master` (and `workflow_dispatch`).

After Pages is enabled: `https://<user>.github.io/<repo>/calc/`
