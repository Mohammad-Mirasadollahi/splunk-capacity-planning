#!/usr/bin/env python3
"""Reorganize Splunk sizing docs into en/ (default) and fa/ folders."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / "docs"

# No <style>/<link>: GitHub GFM sanitizes them and shows the markup as plain text.
FA_STYLE = """\
<div dir="rtl" lang="fa" style="direction:rtl; text-align:left; font-family: Vazirmatn, IRANSansX, IRANSans, Tahoma, 'Segoe UI', sans-serif; line-height:1.9; max-width:980px;">

<div class="fa-doc" style="direction:rtl; text-align:left;">

"""

FA_FOOTER = """

</div>
</div>
"""

# No <style>/<link>: GitHub GFM sanitizes them and shows the markup as plain text.
EN_STYLE = """\
<div dir="ltr" lang="en" style="direction:ltr; text-align:left; font-family: 'Source Sans 3', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height:1.7; max-width:980px;">

<div class="en-doc" style="direction:ltr; text-align:left;">

"""

EN_FOOTER = """

</div>
</div>
"""


def slugify(text: str) -> str:
    text = re.sub(r"[`*_#\[\]]", "", text)
    text = text.strip().lower()
    text = re.sub(r"[^\w\u0600-\u06ff\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"\s+", "-", text)
    return text.strip("-")


def build_toc(content: str, title: str) -> str:
    lines = [f"## {title}", ""]
    for line in content.splitlines():
        m = re.match(r"^(#{2,3})\s+(.*)$", line)
        if not m:
            continue
        level = len(m.group(1))
        heading = m.group(2).strip()
        if heading in ("سرفصل", "Table of Contents", "Contents"):
            continue
        indent = "  " * (level - 2)
        lines.append(f"{indent}- [{heading}](#{slugify(heading)})")
    lines.extend(["", "---", ""])
    return "\n".join(lines)


def insert_toc(content: str, toc_title: str) -> str:
    toc = build_toc(content, toc_title)
    parts = content.split("\n---\n", 1)
    if len(parts) == 2:
        return parts[0] + "\n\n---\n\n" + toc + parts[1].lstrip("\n")
    lines = content.splitlines(True)
    if not lines:
        return toc + content
    return lines[0] + "\n" + toc + "".join(lines[1:])


def wrap(content: str, style: str, footer: str) -> str:
    return style + content.rstrip() + footer


def main() -> None:
    mapping = {
        "01-Infrastructure-Sizing.md": root / "01-Infrastructure-Sizing.md",
        "02-Storage-Sizing.md": root / "02-Storage-Sizing.md",
    }
    (root / "fa").mkdir(parents=True, exist_ok=True)
    (root / "en").mkdir(parents=True, exist_ok=True)

    for name, src in mapping.items():
        content = src.read_text(encoding="utf-8")
        fa_body = insert_toc(content, "سرفصل")
        (root / "fa" / name).write_text(wrap(fa_body, FA_STYLE, FA_FOOTER), encoding="utf-8")
        print(f"FA OK {name}")

    print("Persian files ready")


if __name__ == "__main__":
    main()
