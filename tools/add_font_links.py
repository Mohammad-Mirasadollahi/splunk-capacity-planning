#!/usr/bin/env python3
"""
GitHub GFM does not allow <link> or <style> in Markdown (sanitized → visible as text).

Typography for docs on GitHub relies on wrapper div inline styles + system font
fallbacks. Site viewer (view.html) loads fonts from assets/view.css instead.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs"


def main() -> int:
    print(
        "skip: do not inject Google Fonts <link> into docs/*.md "
        "(GitHub Markdown sanitizer shows them as plain text)."
    )
    for lang in ("en", "fa"):
        for path in sorted((ROOT / lang).glob("*.md")):
            if "fonts.googleapis.com" in path.read_text(encoding="utf-8"):
                print(f"warn: still has font link chrome: {path.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
