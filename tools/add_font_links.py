#!/usr/bin/env python3
from pathlib import Path

FA_LINK = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
"""

EN_LINK = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
"""

root = Path(__file__).resolve().parents[1] / "docs"

for p in (root / "fa").glob("*.md"):
    t = p.read_text(encoding="utf-8")
    if "fonts.googleapis.com" not in t:
        t = t.replace(
            '<div dir="rtl" lang="fa"',
            FA_LINK + "\n<div dir=\"rtl\" lang=\"fa\"",
            1,
        )
        p.write_text(t, encoding="utf-8")
        print("FA fonts:", p.name)

for p in (root / "en").glob("*.md"):
    t = p.read_text(encoding="utf-8")
    if "fonts.googleapis.com" not in t:
        t = t.replace(
            '<div dir="ltr" lang="en"',
            EN_LINK + "\n<div dir=\"ltr\" lang=\"en\"",
            1,
        )
        p.write_text(t, encoding="utf-8")
        print("EN fonts:", p.name)

for name in ("01-Infrastructure-Sizing.md", "02-Storage-Sizing.md"):
    old = root / name
    if old.exists():
        old.unlink()
        print("removed", old)

print("done")
