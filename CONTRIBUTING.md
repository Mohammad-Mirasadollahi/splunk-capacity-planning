# Contributing

## Knowledge pack (`docs/`)

1. Edit **English** first (`docs/en/`) — source of truth.  
2. Update matching **فارسی** (`docs/fa/`) with the same section skeleton and citation URLs.  
3. Run:

```bash
python3 tools/check_en_fa_sync.py
python3 tools/add_lang_switcher.py   # if you added a new paired file
```

## Calculator (`scpcalc/`)

```bash
cd scpcalc
make test
make build
```

- Keep CLI and Web on the **same** `internal/calc` engine.  
- Update `scpcalc/docs/` if formulas or API change.  
- Do not commit binaries (`bin/`, `dist/`).

## Pull requests

Use the PR template checklist. Tags like `scpcalc-v0.1.0` publish Release binaries via GitHub Actions.
