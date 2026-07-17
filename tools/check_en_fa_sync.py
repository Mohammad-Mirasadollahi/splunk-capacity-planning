#!/usr/bin/env python3
"""
Enforce structural sync between docs/en and docs/fa.

English is the source of truth. Persian must mirror:
  - the same filenames
  - the same numbered section skeleton (## / ### markers)
  - the same official Splunk / help.splunk.com citation URLs
  - the same resolved product versions in the doc-channel banner

Usage:
  python3 tools/check_en_fa_sync.py
  python3 tools/check_en_fa_sync.py --json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EN = ROOT / "docs" / "en"
FA = ROOT / "docs" / "fa"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.+?)\s*$")
URL_RE = re.compile(r"https?://[^\s\)\]\>\"']+")
SECTION_NUM_RE = re.compile(r"^(\d+(?:\.\d+)*)\)?\s+")
PHASE_RE = re.compile(r"^(Phase|مرحله)\s+([A-F])\b", re.I)
BANNER_VER_RE = re.compile(
    r"(?:resolved|resolve)\s+\*\*([0-9.]+)\*\*.*?"
    r"ES\s+\*\*([0-9.]+)\*\*.*?"
    r"ITSI\s+\*\*([0-9.]+)\*\*",
    re.I | re.S,
)


def skeleton(text: str) -> list[str]:
    """Normalized section keys comparable across languages."""
    keys: list[str] = []
    for line in text.splitlines():
        m = HEADING_RE.match(line)
        if not m:
            continue
        level = len(m.group(1))
        title = m.group(2).strip()
        # Drop TOC-only anchors noise; keep structural markers
        num = SECTION_NUM_RE.match(title)
        if num:
            keys.append(f"h{level}:{num.group(1)}")
            continue
        phase = PHASE_RE.match(title)
        if phase:
            keys.append(f"h{level}:phase-{phase.group(2).upper()}")
            continue
        # Stable non-numbered headings by level + token count (weak) — skip TOC
        if title.lower() in {"table of contents", "سرفصل"}:
            continue
        # Keep a coarse marker so accidental section drops still fail
        keys.append(f"h{level}:other")
    return keys


def citation_urls(text: str) -> set[str]:
    urls = set()
    for u in URL_RE.findall(text):
        u = u.rstrip(".,;")
        if "docs.splunk.com" in u or "help.splunk.com" in u:
            urls.add(u)
    return urls


def banner_versions(text: str) -> tuple[str, str, str] | None:
    m = BANNER_VER_RE.search(text)
    if not m:
        return None
    return m.group(1), m.group(2), m.group(3)


def check_pair(name: str) -> list[dict]:
    issues: list[dict] = []
    en_path = EN / name
    fa_path = FA / name
    if not en_path.exists():
        issues.append({"file": name, "code": "missing_en", "detail": str(en_path)})
        return issues
    if not fa_path.exists():
        issues.append({"file": name, "code": "missing_fa", "detail": f"{name} missing in docs/fa (EN is source of truth)"})
        return issues

    en = en_path.read_text(encoding="utf-8")
    fa = fa_path.read_text(encoding="utf-8")

    en_sk = skeleton(en)
    fa_sk = skeleton(fa)
    if en_sk != fa_sk:
        # Find first divergence for a readable message
        detail = "section skeleton differs"
        for i, (a, b) in enumerate(zip(en_sk, fa_sk)):
            if a != b:
                detail = f"first diverge at index {i}: en={a} fa={b}"
                break
        else:
            detail = f"length en={len(en_sk)} fa={len(fa_sk)}"
        issues.append(
            {
                "file": name,
                "code": "skeleton_mismatch",
                "detail": detail,
                "en_count": len(en_sk),
                "fa_count": len(fa_sk),
            }
        )

    en_urls = citation_urls(en)
    fa_urls = citation_urls(fa)
    missing_in_fa = sorted(en_urls - fa_urls)
    extra_in_fa = sorted(fa_urls - en_urls)
    if missing_in_fa:
        issues.append(
            {
                "file": name,
                "code": "urls_missing_in_fa",
                "detail": f"{len(missing_in_fa)} EN citation URL(s) absent in FA",
                "urls": missing_in_fa[:20],
            }
        )
    if extra_in_fa:
        issues.append(
            {
                "file": name,
                "code": "urls_extra_in_fa",
                "detail": f"{len(extra_in_fa)} FA citation URL(s) not in EN",
                "urls": extra_in_fa[:20],
            }
        )

    en_ver = banner_versions(en)
    fa_ver = banner_versions(fa)
    if en_ver and fa_ver and en_ver != fa_ver:
        issues.append(
            {
                "file": name,
                "code": "banner_version_mismatch",
                "detail": f"en={en_ver} fa={fa_ver}",
            }
        )
    elif en_ver and not fa_ver:
        issues.append({"file": name, "code": "banner_missing_fa", "detail": "FA missing resolved version banner"})
    elif fa_ver and not en_ver:
        issues.append({"file": name, "code": "banner_missing_en", "detail": "EN missing resolved version banner"})

    # Language switcher presence
    if 'class="lang-switch"' not in en and "class='lang-switch'" not in en:
        issues.append({"file": name, "code": "missing_lang_switch_en", "detail": "EN doc lacks language switcher"})
    if 'class="lang-switch"' not in fa and "class='lang-switch'" not in fa:
        issues.append({"file": name, "code": "missing_lang_switch_fa", "detail": "FA doc lacks language switcher"})

    return issues


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    en_files = {p.name for p in EN.glob("*.md")}
    fa_files = {p.name for p in FA.glob("*.md")}
    issues: list[dict] = []

    only_en = sorted(en_files - fa_files)
    only_fa = sorted(fa_files - en_files)
    for name in only_en:
        issues.append({"file": name, "code": "missing_fa", "detail": "present in EN, absent in FA"})
    for name in only_fa:
        issues.append({"file": name, "code": "extra_fa", "detail": "present in FA, absent in EN (unexpected)"})

    for name in sorted(en_files & fa_files):
        issues.extend(check_pair(name))

    if args.json:
        print(json.dumps({"ok": not issues, "issues": issues}, ensure_ascii=False, indent=2))
    else:
        if not issues:
            print("[ok] docs/en and docs/fa are structurally synced")
        else:
            print(f"[fail] {len(issues)} bilingual sync issue(s):")
            for i in issues:
                print(f"  - {i['file']}: {i['code']} — {i['detail']}")
                if i.get("urls"):
                    for u in i["urls"][:5]:
                        print(f"      {u}")

    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
