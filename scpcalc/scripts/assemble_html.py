#!/usr/bin/env python3
"""Assemble web/index.html from modular partials under web/html/.

Usage:
  python3 scripts/assemble_html.py

Include syntax in templates (relative to web/html/):
  {{include path/to/file.html}}
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_DIR = ROOT / "web" / "html"
OUT = ROOT / "web" / "index.html"
TMPL = HTML_DIR / "index.html.tmpl"

INCLUDE_RE = re.compile(r"\{\{include\s+([^\s}]+)\}\}")


def expand(path: Path, stack: list[Path] | None = None) -> str:
    stack = list(stack or [])
    resolved = path.resolve()
    if resolved in stack:
        chain = " → ".join(str(p.relative_to(HTML_DIR)) for p in stack + [resolved])
        raise SystemExit(f"circular include: {chain}")
    if not path.is_file():
        raise SystemExit(f"missing partial: {path}")
    text = path.read_text()
    stack.append(resolved)

    def repl(m: re.Match[str]) -> str:
        rel = m.group(1).strip()
        # Drop trailing newlines so the template's own newlines control spacing.
        return expand(HTML_DIR / rel, stack).rstrip("\n")

    return INCLUDE_RE.sub(repl, text)


def main() -> int:
    if not TMPL.is_file():
        print(f"error: template not found: {TMPL}", file=sys.stderr)
        return 1
    assembled = expand(TMPL)
    # Ensure single trailing newline
    if not assembled.endswith("\n"):
        assembled += "\n"
    OUT.write_text(assembled)
    print(f"assembled {OUT.relative_to(ROOT)} ({len(assembled)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
