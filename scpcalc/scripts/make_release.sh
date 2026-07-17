#!/usr/bin/env bash
# Build versioned release artifacts into scpcalc/releases/ (gitignored).
# Does NOT publish to GitHub — use tag push scpcalc-v* or: gh release create …
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GO="${GO:-go}"
VERSION="${1:-${VERSION:-}}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
fi
VERSION="${VERSION#v}"
TAG="scpcalc-v${VERSION}"
OUT="$ROOT/releases/${TAG}"
mkdir -p "$OUT"

echo "==> Release $TAG → $OUT"
export VERSION
bash "$ROOT/scripts/build_wasm.sh"

# Compress WASM for download size (keep raw for embed/serve).
gzip -9 -c "$ROOT/web/wasm/scpcalc.wasm" > "$OUT/scpcalc-${VERSION}-wasm.gz"
cp "$ROOT/web/wasm/scpcalc.wasm" "$OUT/scpcalc-${VERSION}.wasm"
cp "$ROOT/web/wasm/wasm_exec.js" "$OUT/wasm_exec.js"

export CGO_ENABLED=0
for pair in linux/amd64 linux/arm64 windows/amd64 darwin/amd64 darwin/arm64; do
  GOOS=${pair%/*}
  GOARCH=${pair#*/}
  EXT=""
  [[ "$GOOS" == "windows" ]] && EXT=".exe"
  NAME="scpcalc-${VERSION}-${GOOS}-${GOARCH}${EXT}"
  echo "  building $NAME"
  (cd "$ROOT" && GOOS="$GOOS" GOARCH="$GOARCH" "$GO" build \
    -ldflags "-X main.version=${VERSION}" \
    -o "$OUT/$NAME" .)
done

(
  cd "$OUT"
  sha256sum scpcalc-* wasm_exec.js > SHA256SUMS 2>/dev/null || shasum -a 256 scpcalc-* wasm_exec.js > SHA256SUMS
)

cat > "$OUT/README.txt" <<EOF
scpcalc ${VERSION}

Binaries: CLI + embedded Web UI (run: ./scpcalc-${VERSION}-<os>-<arch> serve)
WASM:     scpcalc-${VERSION}.wasm (+ wasm_exec.js) for static browser hosting
          scpcalc-${VERSION}-wasm.gz — same engine, gzip for smaller download

Tag: ${TAG}
EOF

echo "==> Done: $OUT"
ls -lh "$OUT"
echo
echo "Publish later with:"
echo "  git tag ${TAG} && git push origin ${TAG}"
echo "  # or: gh release create ${TAG} $OUT/* --generate-notes"
