#!/usr/bin/env python3
"""Insert a References pointer near the top of guides 01–04 if missing."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EN_PTR = (
    "> **References (read first):** [`00-References.md`](00-References.md) — master official citation index\n"
)
FA_PTR = (
    "> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md) — فهرست اصلی استنادهای رسمی\n"
)

for lang, ptr in (("en", EN_PTR), ("fa", FA_PTR)):
    for path in sorted((ROOT / "docs" / lang).glob("0[1-4]-*.md")):
        text = path.read_text(encoding="utf-8")
        if "00-References.md" in text[:2500]:
            print("skip", path.name)
            continue
        # Insert after the metadata blockquote group (after first blank line following > lines under H1)
        marker = "**Update:**" if lang == "en" else "**آپدیت:**"
        if marker not in text:
            marker = "**Update:**" if "> **Update:**" in text else "**آپدیت:**"
        idx = text.find(marker)
        if idx < 0:
            print("no marker", path)
            continue
        # end of that line
        end = text.find("\n", idx)
        if end < 0:
            continue
        # skip following blank lines
        insert_at = end + 1
        while insert_at < len(text) and text[insert_at] == "\n":
            insert_at += 1
        text = text[:insert_at] + "\n" + ptr + "\n" + text[insert_at:]
        path.write_text(text, encoding="utf-8")
        print("updated", path.relative_to(ROOT))
