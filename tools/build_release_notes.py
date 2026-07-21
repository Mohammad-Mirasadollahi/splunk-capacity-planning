#!/usr/bin/env python3
"""Build a GitHub Release body from CHANGELOG.md for a given version.

Usage:
  python3 tools/build_release_notes.py 0.3.2
  python3 tools/build_release_notes.py 0.3.2 --out /tmp/notes.md
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHANGELOG = ROOT / "CHANGELOG.md"
REPO = "Mohammad-Mirasadollahi/splunk-capacity-planning"
PAGES = "https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/"
PKG = "ghcr.io/mohammad-mirasadollahi/scpcalc"


def extract_section(text: str, version: str) -> tuple[str, str]:
    """Return (heading_rest, body) for '## VERSION …' section."""
    lines = text.splitlines()
    start = None
    heading = ""
    for i, line in enumerate(lines):
        if line.startswith("## ") and re.match(rf"^##\s+{re.escape(version)}\b", line):
            start = i
            heading = line[3:].strip()
            break
    if start is None:
        return "", ""
    end = len(lines)
    for j in range(start + 1, len(lines)):
        if lines[j].startswith("## "):
            end = j
            break
    body = "\n".join(lines[start + 1 : end]).strip()
    return heading, body


def previous_tag(version: str) -> str | None:
    """Best-effort previous scpcalc tag from CHANGELOG order."""
    text = CHANGELOG.read_text(encoding="utf-8")
    versions = re.findall(r"^##\s+(\d+\.\d+\.\d+)\b", text, flags=re.M)
    if version not in versions:
        return None
    idx = versions.index(version)
    if idx + 1 >= len(versions):
        return None
    return f"scpcalc-v{versions[idx + 1]}"


def build_notes(version: str) -> str:
    text = CHANGELOG.read_text(encoding="utf-8")
    heading, section = extract_section(text, version)
    if not section:
        section = f"- See `CHANGELOG.md` for SCPcalc {version}."

    title = heading or version
    prev = previous_tag(version)
    compare = (
        f"https://github.com/{REPO}/compare/{prev}...scpcalc-v{version}"
        if prev
        else f"https://github.com/{REPO}/releases/tag/scpcalc-v{version}"
    )

    parts = [
        f"# SCPcalc {version}",
        "",
        f"**{title}**",
        "",
        "## What's Changed",
        "",
        section,
        "",
        "## Get this release",
        "",
        f"- **Binaries** — CLI + embedded Web UI (`scpcalc serve`) attached below (linux / windows / mac, amd64 & arm64).",
        f"- **WASM** — `scpcalc-{version}.wasm` / `scpcalc-{version}-wasm.gz` + `wasm_exec.js` for static browser hosting.",
        f"- **Container** — `{PKG}:{version}` (also `:latest` on newest release).",
        f"- **Online calculator** — {PAGES}",
        "",
        "```bash",
        f"docker pull {PKG}:{version}",
        f"docker run --rm -p 12345:12345 {PKG}:{version}",
        "```",
        "",
        f"**Full changelog:** {compare}",
        "",
        f"Docs: `scpcalc/docs/` · Knowledge pack: `docs/en/` · Repo changelog: [`CHANGELOG.md`](https://github.com/{REPO}/blob/main/CHANGELOG.md)",
    ]
    return "\n".join(parts).rstrip() + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("version", help="Semver without prefix, e.g. 0.3.2")
    ap.add_argument("--out", type=Path, help="Write notes to this file")
    args = ap.parse_args()
    if not re.fullmatch(r"\d+\.\d+\.\d+", args.version):
        print("error: version must be X.Y.Z", file=sys.stderr)
        return 2
    notes = build_notes(args.version)
    if args.out:
        args.out.write_text(notes, encoding="utf-8")
    else:
        sys.stdout.write(notes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
