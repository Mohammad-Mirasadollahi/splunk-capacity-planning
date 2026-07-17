# Contributing

## Knowledge pack (`docs/`)

1. Edit **English** first (`docs/en/`) — source of truth.  
2. Update matching **فارسی** (`docs/fa/`) with the same section skeleton and citation URLs.  
3. Run:

```bash
python3 tools/check_en_fa_sync.py
python3 tools/add_lang_switcher.py   # if you added a new paired file
```

## Calculator (`scpcalc/` → brand **SCPcalc**)

```bash
cd scpcalc
make test
make build
```

- Keep CLI and Web on the **same** `internal/calc` engine.  
- Update `scpcalc/docs/` if formulas or API change.  
- Plan **Export URL / Import** (`web/js/share-url.js`) must stay in sync with `snapshot()` / `applySnapshot()` in `plan-form.js`.  
- Do not commit binaries (`bin/`, `dist/`).

## Pull requests

## Releases

Create a GitHub Release (binaries + WASM) with the one-click helper from the repo root:

```bash
./tools/release.sh
```

It asks **why** you are releasing (product help for patch/minor/major), then bumps `scpcalc/VERSION`, updates `CHANGELOG.md`, runs tests, commits, tags `scpcalc-vX.Y.Z`, and pushes. GitHub Actions builds and attaches the artifacts.

Use the PR template checklist. Tags like `scpcalc-v0.1.1` publish Release binaries via GitHub Actions.

Record user-facing changes in [`CHANGELOG.md`](CHANGELOG.md).
