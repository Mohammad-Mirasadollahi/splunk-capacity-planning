#!/usr/bin/env python3
"""
Inject / refresh the bilingual language switcher into every docs/{en,fa}/*.md file.

English is default. Each doc links to its sibling in the other language.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

SWITCHER_RE = re.compile(
    r'<nav class="lang-switch"[\s\S]*?</nav>\s*',
    re.I,
)


def switcher_html(lang: str, filename: str) -> str:
    en_href = f"../en/{filename}"
    fa_href = f"../fa/{filename}"
    if lang == "en":
        return (
            f'<nav class="lang-switch" aria-label="Language" '
            f'style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; '
            f'font-family:inherit; font-size:0.95rem;">\n'
            f'  <span style="opacity:0.75;">Language:</span>\n'
            f'  <a href="{en_href}" aria-current="page" '
            f'style="font-weight:700; text-decoration:none;">English</a>\n'
            f'  <span aria-hidden="true">·</span>\n'
            f'  <a href="{fa_href}" style="text-decoration:none;">فارسی</a>\n'
            f'  <span style="opacity:0.55; margin-inline-start:0.5rem;">'
            f'(default: English)</span>\n'
            f"</nav>\n\n"
        )
    return (
        f'<nav class="lang-switch" aria-label="زبان" '
        f'style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; '
        f'font-family:inherit; font-size:0.95rem;">\n'
        f'  <span style="opacity:0.75;">زبان:</span>\n'
        f'  <a href="{en_href}" style="text-decoration:none;">English</a>\n'
        f'  <span aria-hidden="true">·</span>\n'
        f'  <a href="{fa_href}" aria-current="page" '
        f'style="font-weight:700; text-decoration:none;">فارسی</a>\n'
        f'  <span style="opacity:0.55; margin-inline-start:0.5rem;">'
        f'(پیش‌فرض: English)</span>\n'
        f"</nav>\n\n"
    )


def inject(path: Path, lang: str) -> bool:
    text = path.read_text(encoding="utf-8")
    block = switcher_html(lang, path.name)
    text2 = SWITCHER_RE.sub("", text)

    # Prefer placing after the visual wrapper opens
    markers = [
        '<div class="en-doc">\n',
        '<div class="fa-doc">\n',
    ]
    placed = False
    for marker in markers:
        if marker in text2:
            text2 = text2.replace(marker, marker + "\n" + block, 1)
            placed = True
            break
    if not placed:
        # Fallback: after first H1
        text2 = re.sub(
            r"(^# .+\n)",
            r"\1\n" + block,
            text2,
            count=1,
            flags=re.M,
        )

    if text2 != text:
        path.write_text(text2, encoding="utf-8")
        return True
    return False


def main() -> int:
    changed = 0
    for lang in ("en", "fa"):
        for path in sorted((DOCS / lang).glob("*.md")):
            if inject(path, lang):
                changed += 1
                print(f"[write] {path.relative_to(ROOT)}")
            else:
                print(f"[ok]    {path.relative_to(ROOT)}")
    print(f"[done] updated={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
