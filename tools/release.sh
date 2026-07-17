#!/usr/bin/env bash
# tools/release.sh — one-click SCPcalc GitHub Release
#
# What it does (after you say WHY):
#   1) bumps scpcalc/VERSION
#   2) prepends CHANGELOG.md
#   3) commits on the current branch
#   4) creates annotated tag scpcalc-vX.Y.Z
#   5) pushes branch + tag → GitHub Actions builds binaries/WASM and publishes the Release
#
# Usage:
#   ./tools/release.sh                         # interactive (recommended)
#   ./tools/release.sh --help
#   ./tools/release.sh --dry-run --bump patch --reason "Fix share URL import"
#   ./tools/release.sh --bump minor --reason "Add concurrent search sizing" --yes
#   ./tools/release.sh --version 0.2.0 --reason "First 0.2 line" --yes
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="$ROOT/scpcalc/VERSION"
CHANGELOG="$ROOT/CHANGELOG.md"
REMOTE="${REMOTE:-origin}"
DRY_RUN=0
ASSUME_YES=0
NO_PUSH=0
NO_COMMIT=0
BUMP=""
REASON=""
EXPLICIT_VERSION=""

die() { echo "error: $*" >&2; exit 1; }
info() { echo "==> $*"; }
ok() { echo "    ✓ $*"; }

usage() {
  cat <<'EOF'
SCPcalc release helper — say WHY you want a release; the rest is automatic.

WHAT A RELEASE IS
  A Git tag scpcalc-vX.Y.Z. Pushing that tag starts GitHub Actions, which:
    • builds CLI binaries (linux/windows/mac, amd64/arm64)
    • builds WASM for the browser calculator
    • publishes them on the GitHub Releases page

WHEN TO BUMP (product help)
  patch  X.Y.(Z+1)   Bug fixes, UI polish, docs-only, small safe changes
  minor  X.(Y+1).0   New features users notice (new inputs, new exports, …)
  major  (X+1).0.0   Breaking CLI/API/plan format changes

WHY (required)
  One short sentence shown in the tag + CHANGELOG. Examples:
    • "Search Head sizing now uses concurrent searches per Splunk docs"
    • "Fix broken Import URL on Safari"
    • "Separate English/Persian README pages"

USAGE
  ./tools/release.sh
  ./tools/release.sh --bump patch --reason "…" --yes
  ./tools/release.sh --version 0.2.0 --reason "…" --yes
  ./tools/release.sh --dry-run --bump minor --reason "…"

FLAGS
  --bump patch|minor|major   Semver bump from scpcalc/VERSION
  --version X.Y.Z            Set exact version (skips --bump)
  --reason TEXT              Why this release (required unless interactive)
  --yes                      No confirmation prompt
  --dry-run                  Print steps only; touch nothing
  --no-push                  Commit + tag locally; do not push
  --no-commit                Only print/update files (advanced)
  -h, --help                 This help

REQUIREMENTS
  Clean or intentional git tree, push access to GitHub, and network for push.
  CI workflow: .github/workflows/scpcalc-release.yml
EOF
}

current_version() {
  tr -d '[:space:]' < "$VERSION_FILE"
}

bump_version() {
  local cur="$1" kind="$2"
  local major minor patch
  IFS=. read -r major minor patch <<<"$cur"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ && "$patch" =~ ^[0-9]+$ ]] \
    || die "VERSION '$cur' is not X.Y.Z"
  case "$kind" in
    patch) patch=$((patch + 1)) ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    major) major=$((major + 1)); minor=0; patch=0 ;;
    *) die "unknown bump '$kind' (use patch|minor|major)" ;;
  esac
  echo "${major}.${minor}.${patch}"
}

validate_semver() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "version must be X.Y.Z (got '$1')"
}

require_clean_enough() {
  # File-only modes don't create a release commit.
  if [[ "$NO_COMMIT" -eq 1 || "$DRY_RUN" -eq 1 ]]; then
    return 0
  fi
  if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
    echo
    echo "Working tree has uncommitted changes:"
    git -C "$ROOT" status -sb
    echo
    if [[ "$ASSUME_YES" -eq 1 ]]; then
      die "refusing --yes with a dirty tree; commit/stash first, or run interactively"
    fi
    read -r -p "Continue anyway and include these changes in the release commit? [y/N] " ans
    [[ "$ans" == "y" || "$ans" == "Y" ]] || die "aborted"
  fi
}

interactive() {
  local cur next
  cur="$(current_version)"
  echo
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           SCPcalc · one-click GitHub Release             ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo
  echo "Current version:  $cur"
  echo "Release tag form: scpcalc-vX.Y.Z"
  echo
  echo "Product help — pick a bump:"
  echo "  1) patch  → $(bump_version "$cur" patch)   bugfix / polish / docs"
  echo "  2) minor  → $(bump_version "$cur" minor)   new feature users notice"
  echo "  3) major  → $(bump_version "$cur" major)   breaking change"
  echo "  4) custom version"
  echo
  while [[ -z "$BUMP" && -z "$EXPLICIT_VERSION" ]]; do
    read -r -p "Choice [1-4] (default 1=patch): " choice
    choice="${choice:-1}"
    case "$choice" in
      1|patch) BUMP=patch ;;
      2|minor) BUMP=minor ;;
      3|major) BUMP=major ;;
      4|custom)
        read -r -p "Exact version X.Y.Z: " EXPLICIT_VERSION
        validate_semver "$EXPLICIT_VERSION"
        ;;
      *) echo "  pick 1, 2, 3, or 4" ;;
    esac
  done

  echo
  echo "Why are you releasing? (one sentence — goes into CHANGELOG + tag)"
  echo "Examples:"
  echo "  • Search Head sizing uses concurrent searches (Splunk Reference hardware)"
  echo "  • Fix Persian/English README split on GitHub"
  echo "  • Chart borders and share-URL import polish"
  echo
  while [[ -z "$REASON" ]]; do
    read -r -p "Reason: " REASON
    REASON="$(echo "$REASON" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -n "$REASON" ]] || echo "  reason is required"
  done
}

prepend_changelog() {
  local ver="$1" reason="$2" date tmp
  date="$(date -u +%Y-%m-%d)"
  tmp="$(mktemp)"
  if [[ -f "$CHANGELOG" ]] && grep -q '^# Changelog' "$CHANGELOG"; then
    python3 - "$CHANGELOG" "$ver" "$reason" "$date" "$tmp" <<'PY'
import sys
path, ver, reason, date, out = sys.argv[1:6]
text = open(path, encoding="utf-8").read()
lines = text.splitlines(keepends=True)
if not lines:
    open(out, "w", encoding="utf-8").write(
        f"# Changelog\n\n## {ver} — {date}\n\n- {reason}\n"
    )
    raise SystemExit
# Find first ## heading; keep everything before it as preamble
idx = 0
for i, line in enumerate(lines):
    if line.startswith("## "):
        idx = i
        break
else:
    idx = len(lines)
preamble = "".join(lines[:idx]).rstrip() + "\n\n"
rest = "".join(lines[idx:])
section = f"## {ver} — {date}\n\n- {reason}\n\n"
open(out, "w", encoding="utf-8").write(preamble + section + rest)
PY
  else
    cat > "$tmp" <<EOF
# Changelog

## ${ver} — ${date}

- ${reason}
EOF
  fi
  mv "$tmp" "$CHANGELOG"
}

# --- args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    --no-push) NO_PUSH=1; shift ;;
    --no-commit) NO_COMMIT=1; shift ;;
    --bump)
      BUMP="${2:-}"; [[ -n "$BUMP" ]] || die "--bump needs patch|minor|major"
      shift 2
      ;;
    --version)
      EXPLICIT_VERSION="${2:-}"; [[ -n "$EXPLICIT_VERSION" ]] || die "--version needs X.Y.Z"
      shift 2
      ;;
    --reason)
      REASON="${2:-}"; [[ -n "$REASON" ]] || die "--reason needs text"
      shift 2
      ;;
    *) die "unknown arg: $1 (try --help)" ;;
  esac
done

[[ -f "$VERSION_FILE" ]] || die "missing $VERSION_FILE"
command -v git >/dev/null || die "git is required"
git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null || die "not a git repo"

CUR="$(current_version)"
validate_semver "$CUR"

if [[ -z "$BUMP" && -z "$EXPLICIT_VERSION" ]] || [[ -z "$REASON" ]]; then
  if [[ -t 0 ]]; then
    interactive
  else
    [[ -n "$REASON" ]] || die "non-interactive mode needs --reason (see --help)"
    [[ -n "$BUMP" || -n "$EXPLICIT_VERSION" ]] || die "non-interactive mode needs --bump or --version"
  fi
fi

if [[ -n "$EXPLICIT_VERSION" ]]; then
  NEXT="$EXPLICIT_VERSION"
  validate_semver "$NEXT"
else
  BUMP="${BUMP:-patch}"
  NEXT="$(bump_version "$CUR" "$BUMP")"
fi

TAG="scpcalc-v${NEXT}"
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"

echo
info "Release plan"
echo "    branch:   $BRANCH"
echo "    version:  $CUR → $NEXT"
echo "    tag:      $TAG"
echo "    reason:   $REASON"
[[ "$DRY_RUN" -eq 1 ]] && echo "    mode:     DRY-RUN (no changes)"
[[ "$NO_PUSH" -eq 1 ]] && echo "    mode:     no-push"
echo

if [[ "$ASSUME_YES" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
  read -r -p "Create this release? [y/N] " confirm
  [[ "$confirm" == "y" || "$confirm" == "Y" ]] || die "aborted"
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  info "Would write $VERSION_FILE → $NEXT"
  info "Would prepend CHANGELOG.md with: ## $NEXT — $(date -u +%Y-%m-%d) / - $REASON"
  info "Would run: go test ./... (in scpcalc/)"
  info "Would commit: release: SCPcalc $NEXT — $REASON"
  info "Would tag:    $TAG"
  if [[ "$NO_PUSH" -eq 1 ]]; then
    info "Would skip push (--no-push)"
  else
    info "Would push:   $REMOTE $BRANCH + $TAG"
    info "Would wait:   GitHub Actions scpcalc-release.yml publishes binaries"
  fi
  ok "dry-run complete — nothing changed"
  exit 0
fi

require_clean_enough

# Ensure tag does not already exist
if git -C "$ROOT" rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  die "tag $TAG already exists"
fi
if git -C "$ROOT" ls-remote --tags "$REMOTE" "refs/tags/$TAG" 2>/dev/null | grep -q "$TAG"; then
  die "tag $TAG already exists on $REMOTE"
fi

info "Updating VERSION → $NEXT"
printf '%s\n' "$NEXT" > "$VERSION_FILE"
ok "$VERSION_FILE"

info "Updating CHANGELOG.md"
prepend_changelog "$NEXT" "$REASON"
ok "section $NEXT added"

info "Running tests"
(
  cd "$ROOT/scpcalc"
  go test ./...
)
ok "go test ./... passed"

if [[ "$NO_COMMIT" -eq 1 ]]; then
  info "Skipping commit/tag/push (--no-commit)"
  ok "VERSION + CHANGELOG updated only"
  exit 0
fi

info "Committing"
# Prefer Mohammad Mirasadollahi authorship for release commits (do not rewrite git config).
export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Mohammad Mirasadollahi}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-150103330+Mohammad-Mirasadollahi@users.noreply.github.com}"
export GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-Mohammad Mirasadollahi}"
export GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-150103330+Mohammad-Mirasadollahi@users.noreply.github.com}"
git -C "$ROOT" add "$VERSION_FILE" "$CHANGELOG"
git -C "$ROOT" commit -m "$(cat <<EOF
release: SCPcalc ${NEXT} — ${REASON}

EOF
)"
ok "commit created"

info "Tagging $TAG"
git -C "$ROOT" tag -a "$TAG" -m "$(cat <<EOF
SCPcalc ${NEXT}

${REASON}
EOF
)"
ok "annotated tag $TAG"

if [[ "$NO_PUSH" -eq 1 ]]; then
  info "Skipping push (--no-push)"
  echo
  echo "Local release ready. Publish when you want:"
  echo "  git push $REMOTE $BRANCH"
  echo "  git push $REMOTE $TAG"
  exit 0
fi

info "Pushing $BRANCH and $TAG to $REMOTE"
git -C "$ROOT" push "$REMOTE" "HEAD:$BRANCH"
git -C "$ROOT" push "$REMOTE" "$TAG"
ok "pushed"

echo
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Release $TAG started                                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo
echo "  Actions:  https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/actions"
echo "  Release:  https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/releases/tag/$TAG"
echo
echo "  CI builds binaries + WASM and attaches them automatically."
if command -v gh >/dev/null 2>&1; then
  echo
  echo "  Tip: watch the workflow with:"
  echo "    gh run watch --repo Mohammad-Mirasadollahi/splunk-capacity-planning"
fi
