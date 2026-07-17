#!/usr/bin/env bash
# Build Go WASM engine into web/wasm/ for browser / GitHub Pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GO="${GO:-go}"
VERSION="${VERSION:-dev}"
OUT="$ROOT/web/wasm"
mkdir -p "$OUT"

GOROOT="$("$GO" env GOROOT)"
WASM_EXEC="$GOROOT/misc/wasm/wasm_exec.js"
if [[ ! -f "$WASM_EXEC" ]]; then
  WASM_EXEC="$GOROOT/lib/wasm/wasm_exec.js"
fi
if [[ ! -f "$WASM_EXEC" ]]; then
  echo "error: wasm_exec.js not found under GOROOT=$GOROOT" >&2
  exit 1
fi
cp "$WASM_EXEC" "$OUT/wasm_exec.js"

echo "Building WASM → $OUT/scpcalc.wasm"
CDPATH= cd "$ROOT"
CGO_ENABLED=0 GOOS=js GOARCH=wasm "$GO" build \
  -ldflags "-X main.Version=${VERSION}" \
  -o "$OUT/scpcalc.wasm" \
  ./cmd/wasm

# Reject empty / placeholder artifacts (would embed a broken UI).
MIN_WASM=100000
SZ=$(wc -c < "$OUT/scpcalc.wasm" | tr -d ' ')
if [[ "$SZ" -lt "$MIN_WASM" ]]; then
  echo "error: scpcalc.wasm too small (${SZ} bytes) — build failed?" >&2
  exit 1
fi
EXEC_SZ=$(wc -c < "$OUT/wasm_exec.js" | tr -d ' ')
if [[ "$EXEC_SZ" -lt 1000 ]]; then
  echo "error: wasm_exec.js looks invalid (${EXEC_SZ} bytes)" >&2
  exit 1
fi

ls -la "$OUT/scpcalc.wasm" "$OUT/wasm_exec.js"
echo "WASM build OK (${SZ} bytes)"
