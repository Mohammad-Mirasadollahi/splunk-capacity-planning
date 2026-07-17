# WASM build output (gitignored binaries)

| File | In git? | How |
|---|---|---|
| `scpcalc.wasm` | **No** (~3MB) | `make wasm` / CI / GitHub Release |
| `wasm_exec.js` | **No** | copied from Go GOROOT by `scripts/build_wasm.sh` |

`make build` and `make pages-calc` always run `make wasm` first so embed + Pages stay consistent.
