# SCPcalc — Language and Portability

## 1. Language choice: Go 1.22+

| Requirement | Go fit |
|---|---|
| Portable | Static binary; no target runtime |
| Cross-platform | `GOOS` / `GOARCH` matrix |
| CLI + local web | stdlib HTTP + `embed` |
| Config | Tiny `.env` loader (stdlib only) |
| Charts offline | Vendored Chart.js inside embed |
| GitHub Releases | Actions matrix build |
| Dependencies | **Zero** external Go modules |

**Also chosen for static hosting:** Go → **WebAssembly** (`cmd/wasm`) so the same engine runs in the browser on GitHub Pages without a server. Large `.wasm` artifacts are **gitignored** and built in CI / Releases.

**Not chosen:** Python+PyInstaller, Electron/Tauri, a separate JS rewrite of the formulas.

## 2. Portable definition

Copy the Release binary (and optionally a `.env` beside it) to any machine of that OS/arch:

```bash
./scpcalc version
./scpcalc calc --daily-gb 100 --retention-days 60 --concurrent-users 8
./scpcalc calc --plan plan.json --json
./scpcalc serve                 # http://0.0.0.0:12345
./scpcalc serve --port 12345
```

No installer or container required for v1.

## 3. Configuration portability

| Source | Example |
|---|---|
| Defaults | Host `0.0.0.0`, port `12345` |
| `.env` next to CWD or binary | `SCPCALC_PORT=12345` |
| OS environment | `export SCPCALC_HOST=127.0.0.1` |
| CLI | `--addr`, `--host`, `--port` |

Priority: **CLI → env → `.env` → defaults**. Existing OS env vars are never overwritten by `.env`.

## 4. UI language

- Default UI language: **English**
- Toggle: **فارسی** (stored in `localStorage`)
- Calculation tips (`tips.js`) ship EN + FA copy; formulas/links stay official English URLs

## 5. Build matrix

| GOOS | GOARCH | Artifact |
|---|---|---|
| linux | amd64 | `scpcalc-linux-amd64` |
| linux | arm64 | `scpcalc-linux-arm64` |
| windows | amd64 | `scpcalc-windows-amd64.exe` |
| darwin | amd64 | `scpcalc-darwin-amd64` |
| darwin | arm64 | `scpcalc-darwin-arm64` |

Tags: `scpcalc-vX.Y.Z` → Release workflow.

## 6. Module path

```text
github.com/splunk-capacity-planning/scpcalc
```

Adjust the GitHub owner segment when publishing under a different org.

## 7. What is embedded vs external

| Embedded in binary (after `make build` / `make wasm`) | External / not in git |
|---|---|
| Web UI, Chart.js (`web/vendor`), tips, CSS modules | `.env` beside binary (optional) |
| `wasm/scpcalc.wasm` + `wasm_exec.js` (browser engine) | Knowledge pack Markdown in repo |
| Calc / arch / conf engines | Release artifacts under `releases/` (gitignored) |

`make build` always runs `make wasm` first so embed never ships a UI without the engine. Static Pages `/calc/` is assembled in CI (`.github/workflows/scpcalc-pages.yml`).

No CDN font fetches — UI works fully offline.

## 8. Security note

`serve` binds to `0.0.0.0` by default for LAN demos. For local-only use set `SCPCALC_HOST=127.0.0.1`. There is no authentication — do not expose `serve` to the public internet. Prefer the static WASM UI on Pages for public demos.
