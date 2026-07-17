#!/usr/bin/env python3
"""
Keep Splunk Capacity Planning docs pointed at ALWAYS-LATEST official documentation.

Usage:
  python3 tools/sync_latest_docs.py --check-remote --apply
  python3 tools/sync_latest_docs.py --apply --stamp 2026-07-17

Policy (2026-07-17):
  - Splunk Enterprise Capacity/Indexer/Install: always /Splunk/latest/ on docs.splunk.com
  - Enterprise Security: help.splunk.com ES **8.5** planning topics (docs.splunk.com
    /ES/latest/Install/DeploymentPlanning does not resolve; classic peak was 7.3.3)
  - ITSI: help.splunk.com ITSI **5.0** Plan your deployment
    (docs.splunk.com /ITSI/latest/ still trails; help version picker lists 5.0 as current)
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
VERSION_MD = ROOT / "VERSION.md"

RESOLVED = {
    "Splunk": "10.4",
    "ES": "8.5",
    "ITSI": "5.0",
    "PCI": "latest",
}

# Classic docs.splunk.com channels (Enterprise + legacy rewrite targets)
URL_CHANNEL = {
    "Splunk": "latest",
    "ES": "7.3.3",  # only used if a classic ES path remains
    "ITSI": "latest",
    "PCI": "latest",
}

PRODUCT_ROOT = {
    "Splunk": f"https://docs.splunk.com/Documentation/Splunk/{URL_CHANNEL['Splunk']}",
    "ES": f"https://docs.splunk.com/Documentation/ES/{URL_CHANNEL['ES']}",
    "ITSI": f"https://docs.splunk.com/Documentation/ITSI/{URL_CHANNEL['ITSI']}",
    "PCI": f"https://docs.splunk.com/Documentation/PCI/{URL_CHANNEL['PCI']}",
}

# Canonical help.splunk.com URLs (current ES / ITSI truth)
HELP_ES_BASE = (
    "https://help.splunk.com/en/splunk-enterprise-security-8/install/"
    f"{RESOLVED['ES']}/planning"
)
HELP_ITSI_PLAN = (
    "https://help.splunk.com/en/splunk-it-service-intelligence/"
    "splunk-it-service-intelligence/install-and-upgrade/"
    f"{RESOLVED['ITSI']}/planning/plan-your-itsi-deployment"
)

HELP_TOPICS = {
    "es-min-specs": f"{HELP_ES_BASE}/minimum-specifications-for-a-production-deployment",
    "es-scaling": f"{HELP_ES_BASE}/considerations-for-scaling-deployments",
    "es-perf-ref": f"{HELP_ES_BASE}/performance-reference-for-splunk-enterprise-security",
    "es-deploy-considerations": f"{HELP_ES_BASE}/deployment-considerations",
    "es-planning": HELP_ES_BASE,
    "itsi-plan": HELP_ITSI_PLAN,
}

TOPICS = {
    "cap-intro": ("Splunk", "/Capacity/IntroductiontocapacityplanningforSplunkEnterprise"),
    "cap-dimensions": ("Splunk", "/Capacity/DimensionsofaSplunkEnterprisedeployment"),
    "cap-components": ("Splunk", "/Capacity/ComponentsofaSplunkEnterprisedeployment"),
    "cap-reference-hw": ("Splunk", "/Capacity/Referencehardware"),
    "cap-perf-summary": ("Splunk", "/Capacity/Summaryofperformancerecommendations"),
    "cap-storage-estimate": ("Splunk", "/Capacity/Estimateyourstoragerequirements"),
    "install-sysreq": ("Splunk", "/Installation/Systemrequirements"),
    "idx-buckets-clusters": ("Splunk", "/Indexer/Bucketsandclusters"),
    "idx-smartstore-req": ("Splunk", "/Indexer/SmartStoresystemrequirements"),
    "idx-smartstore-about": ("Splunk", "/Indexer/AboutSmartStore"),
    "dist-colocate-mgmt": ("Splunk", "/DistSearch/Colocatemanagementcomponents"),
    "pci-plan": ("PCI", "/Install/DeploymentPlanning"),
}

VERSIONED_URL_RE = re.compile(
    r"https://docs\.splunk\.com/Documentation/"
    r"(?P<product>Splunk|ES|ITSI|PCI)/"
    r"(?P<ver>latest|\d+(?:\.\d+)*)/"
    r"(?P<path>[^\s\)\"\'<>]+)"
)

# Map classic ES/ITSI docs URLs → help.splunk.com
CLASSIC_TO_HELP = [
    (
        re.compile(
            r"https://docs\.splunk\.com/Documentation/ES/(?:latest|\d+(?:\.\d+)*)/"
            r"Install/DeploymentPlanning[^\s\)\"\'<>]*"
        ),
        HELP_TOPICS["es-perf-ref"],
    ),
    (
        re.compile(
            r"https://docs\.splunk\.com/Documentation/ITSI/(?:latest|\d+(?:\.\d+)*)/"
            r"Install/Plan[^\s\)\"\'<>]*"
        ),
        HELP_TOPICS["itsi-plan"],
    ),
    # Already-help URLs: normalize version segment if present
    (
        re.compile(
            r"https://help\.splunk\.com/en/splunk-enterprise-security-8/install/"
            r"(?:\d+(?:\.\d+)*)/planning/minimum-specifications-for-a-production-deployment"
        ),
        HELP_TOPICS["es-min-specs"],
    ),
    (
        re.compile(
            r"https://help\.splunk\.com/en/splunk-enterprise-security-8/install/"
            r"(?:\d+(?:\.\d+)*)/planning/considerations-for-scaling-deployments"
        ),
        HELP_TOPICS["es-scaling"],
    ),
    (
        re.compile(
            r"https://help\.splunk\.com/en/splunk-enterprise-security-8/install/"
            r"(?:\d+(?:\.\d+)*)/planning/performance-reference-for-splunk-enterprise-security"
        ),
        HELP_TOPICS["es-perf-ref"],
    ),
    (
        re.compile(
            r"https://help\.splunk\.com/en/splunk-it-service-intelligence/"
            r"splunk-it-service-intelligence/install-and-upgrade/"
            r"(?:\d+(?:\.\d+)*)/planning/plan-your-itsi-deployment"
        ),
        HELP_TOPICS["itsi-plan"],
    ),
]


def canonical(product: str, path: str) -> str:
    p = path if path.startswith("/") else "/" + path
    return f"{PRODUCT_ROOT[product]}{p}"


def rewrite_text(text: str) -> tuple[str, int]:
    count = 0
    for pattern, dest in CLASSIC_TO_HELP:
        text2, n = pattern.subn(dest, text)
        count += n
        text = text2

    def repl(m: re.Match) -> str:
        nonlocal count
        product = m.group("product")
        path = m.group("path")
        # ES/ITSI classic paths already handled above; leave stray ES/ITSI alone
        if product in ("ES", "ITSI"):
            return m.group(0)
        new = canonical(product, "/" + path)
        if new != m.group(0):
            count += 1
        return new

    return VERSIONED_URL_RE.sub(repl, text), count


def replace_metadata_block(text: str, lang: str, synced: str) -> str:
    ent, es, itsi = RESOLVED["Splunk"], RESOLVED["ES"], RESOLVED["ITSI"]
    if lang == "en":
        new_meta = (
            f"> **Scope:** see document body (Infrastructure / Storage / Disk / IOPS)  \n"
            f"> **Doc channel:** Enterprise **`/latest/`** (resolved **{ent}**) · "
            f"ES **{es}** (help.splunk.com) · ITSI **{itsi}** (help.splunk.com) · synced {synced}  \n"
            f"> **Update:** `python3 tools/sync_latest_docs.py --apply` · "
            f"[`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)\n"
        )
    else:
        new_meta = (
            f"> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  \n"
            f"> **کانال مستند:** Enterprise **`/latest/`** (resolve **{ent}**) · "
            f"ES **{es}** (help.splunk.com) · ITSI **{itsi}** (help.splunk.com) · همگام‌سازی {synced}  \n"
            f"> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · "
            f"[`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)\n"
        )
    return re.sub(
        r"(# .+\n\n)(> .+\n(?:> .+\n)*)",
        r"\1" + new_meta + "\n",
        text,
        count=1,
    )


def update_version_md(synced: str) -> None:
    if not VERSION_MD.exists():
        return
    text = VERSION_MD.read_text(encoding="utf-8")

    def set_resolved(block_key: str, value: str, body: str) -> str:
        pattern = rf"({block_key}:[\s\S]*?resolved: \")[^\"]+(\")"
        return re.sub(pattern, lambda m: m.group(1) + value + m.group(2), body, count=1)

    text = set_resolved("splunk_enterprise", RESOLVED["Splunk"], text)
    text = set_resolved("enterprise_security", RESOLVED["ES"], text)
    text = set_resolved("itsi", RESOLVED["ITSI"], text)
    text = re.sub(
        r'last_synced_utc: "[^"]+"',
        f'last_synced_utc: "{synced}"',
        text,
        count=1,
    )
    text = re.sub(
        r"https://docs\.splunk\.com/Documentation/ES/(?:latest|\d+(?:\.\d+)*)/Install/DeploymentPlanning",
        HELP_TOPICS["es-perf-ref"],
        text,
    )
    text = re.sub(
        r"https://help\.splunk\.com/en/splunk-enterprise-security-8/install/"
        r"(?:\d+(?:\.\d+)*)/planning/performance-reference-for-splunk-enterprise-security",
        HELP_TOPICS["es-perf-ref"],
        text,
    )
    text = re.sub(
        r"https://docs\.splunk\.com/Documentation/ITSI/(?:latest|\d+(?:\.\d+)*)/Install/Plan",
        HELP_TOPICS["itsi-plan"],
        text,
    )
    text = re.sub(
        r"https://help\.splunk\.com/en/splunk-it-service-intelligence/"
        r"splunk-it-service-intelligence/install-and-upgrade/"
        r"(?:\d+(?:\.\d+)*)/planning/plan-your-itsi-deployment",
        HELP_TOPICS["itsi-plan"],
        text,
    )
    VERSION_MD.write_text(text, encoding="utf-8")


def iter_doc_files():
    for lang in ("en", "fa"):
        d = DOCS / lang
        if not d.exists():
            continue
        for p in sorted(d.glob("*.md")):
            yield lang, p


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check-remote", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--stamp", default=None)
    ap.add_argument("--es-version", default=None, help="Override ES help docs version (e.g. 8.5)")
    ap.add_argument("--itsi-version", default=None, help="Override ITSI help docs version (e.g. 5.0)")
    args = ap.parse_args()

    synced = args.stamp or date.today().isoformat()
    global HELP_ES_BASE, HELP_ITSI_PLAN, HELP_TOPICS
    if args.es_version:
        RESOLVED["ES"] = args.es_version
        HELP_ES_BASE = (
            "https://help.splunk.com/en/splunk-enterprise-security-8/install/"
            f"{RESOLVED['ES']}/planning"
        )
        HELP_TOPICS = {
            "es-min-specs": f"{HELP_ES_BASE}/minimum-specifications-for-a-production-deployment",
            "es-scaling": f"{HELP_ES_BASE}/considerations-for-scaling-deployments",
            "es-perf-ref": f"{HELP_ES_BASE}/performance-reference-for-splunk-enterprise-security",
            "es-deploy-considerations": f"{HELP_ES_BASE}/deployment-considerations",
            "es-planning": HELP_ES_BASE,
            "itsi-plan": HELP_ITSI_PLAN,
        }
    if args.itsi_version:
        RESOLVED["ITSI"] = args.itsi_version
        HELP_ITSI_PLAN = (
            "https://help.splunk.com/en/splunk-it-service-intelligence/"
            "splunk-it-service-intelligence/install-and-upgrade/"
            f"{RESOLVED['ITSI']}/planning/plan-your-itsi-deployment"
        )
        HELP_TOPICS["itsi-plan"] = HELP_ITSI_PLAN

    if args.check_remote:
        print(
            f"[info] Resolved docs: Enterprise={RESOLVED['Splunk']} "
            f"ES={RESOLVED['ES']} (help) ITSI={RESOLVED['ITSI']} (help)"
        )
        print(f"[info] ES min specs: {HELP_TOPICS['es-min-specs']}")
        print(f"[info] ES scaling:   {HELP_TOPICS['es-scaling']}")
        print(f"[info] ES perf ref:  {HELP_TOPICS['es-perf-ref']}")
        print(f"[info] ITSI plan:    {HELP_TOPICS['itsi-plan']}")

    if not args.apply and not args.check_remote:
        ap.print_help()
        return 2

    if not args.apply:
        return 0

    total = 0
    for lang, path in iter_doc_files():
        original = path.read_text(encoding="utf-8")
        text, n = rewrite_text(original)
        text = replace_metadata_block(text, lang, synced)
        if path.name.startswith(("01-", "02-", "03-", "04-", "05-")):
            if lang == "en" and "00-References.md" not in text[:3500]:
                text = text.replace(
                    f"synced {synced}  \n",
                    f"synced {synced}  \n> **References (read first):** [`00-References.md`](00-References.md)\n",
                    1,
                )
            if lang == "fa" and "00-References.md" not in text[:3500]:
                text = text.replace(
                    f"همگام‌سازی {synced}  \n",
                    f"همگام‌سازی {synced}  \n> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md)\n",
                    1,
                )
        if text != original:
            path.write_text(text, encoding="utf-8")
        total += n
        print(f"[write] {path.relative_to(ROOT)} url_rewrites={n}")

    readme = ROOT / "README.md"
    if readme.exists():
        t, n = rewrite_text(readme.read_text(encoding="utf-8"))
        t = re.sub(
            r"\*\*Doc policy:\*\*[^\n]+",
            f"**Doc policy:** Enterprise `/latest/` (**{RESOLVED['Splunk']}**), "
            f"ES **{RESOLVED['ES']}** (help.splunk.com), ITSI **{RESOLVED['ITSI']}** "
            f"(help.splunk.com), synced {synced}. "
            f"Refresh: `python3 tools/sync_latest_docs.py --check-remote --apply`. "
            f"See [`VERSION.md`](VERSION.md) · [`docs/en/00-References.md`](docs/en/00-References.md).",
            t,
            count=1,
        )
        readme.write_text(t, encoding="utf-8")
        total += n
        print(f"[write] README.md url_rewrites={n}")

    update_version_md(synced)
    print(
        f"[done] Enterprise={RESOLVED['Splunk']} ES={RESOLVED['ES']} "
        f"ITSI={RESOLVED['ITSI']} synced={synced} total_url_rewrites={total}"
    )
    print("[hint] After content edits, run: python3 tools/check_en_fa_sync.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
