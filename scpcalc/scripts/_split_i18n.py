#!/usr/bin/env python3
"""Split i18n-dict.js into modular category files (en + fa)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "web" / "js"
SRC = ROOT / "i18n-dict.js"
OUT = ROOT / "i18n-dict"

# (module_name, predicate(key) -> bool) — first match wins
MODULES: list[tuple[str, callable]] = [
    (
        "01-shell",
        lambda k: k
        in {
            "eyebrow",
            "nav_docs",
            "lede",
            "hero_title",
            "hero_hint",
            "start_wizard",
            "wizard_eyebrow",
            "wizard_title",
            "volume",
            "retention",
            "calculate",
            "calc_busy",
            "export_json",
            "import_json",
            "err",
            "results_title",
            "design",
            "resources",
            "indexes_conf",
            "settings",
            "download_conf",
            "download_json",
            "copy_conf",
            "copied",
            "copy_fail",
            "share_link",
            "share_btn",
            "share_copied",
            "share_fail",
            "share_empty",
            "open_fullscreen",
            "exit_fullscreen",
            "lang_en",
            "lang_fa",
        }
        or k.startswith("step_"),
    ),
    (
        "02-overview-quick",
        lambda k: k.startswith("overview_")
        or k.startswith("quick_")
        or k.startswith("vol_drivers")
        or k
        in {
            "tab_ret_overview",
            "tab_vol_budget",
            "tab_vol_sources",
            "tab_ret_policy",
            "tab_ret_paths",
            "tab_cluster",
            "tab_apps",
            "tab_advanced",
            "tab_sources_basic",
            "tab_sources_advanced",
            "tab_src_volume",
            "tab_src_retention",
        },
    ),
    (
        "03-errors-budget",
        lambda k: k.startswith("err_")
        or k.startswith("cap_")
        or k.startswith("policy_")
        or k.startswith("disk_")
        or k
        in {
            "col_idx_scale_tip",
            "cold_vol_auto",
            "cold_vol_auto_zero",
            "total_title",
            "total_eps_hint",
            "sources_hint",
            "sources_basic_hint",
            "sources_adv_hint",
        },
    ),
    (
        "04-topology",
        lambda k: k.startswith("fp_")
        or k.startswith("idx_")
        or k.startswith("shc")
        or k
        in {
            "topology",
            "idx_cluster",
            "users",
            "lbl_rf",
            "hint_rf",
            "lbl_sf",
            "hint_sf",
            "lbl_users",
            "hint_users",
            "lbl_searches",
            "hint_searches",
            "lbl_saved",
            "hint_saved",
            "lbl_n_idx",
            "hint_n_idx",
            "lbl_n_sh",
            "hint_n_sh",
            "hint_shc_n_sh",
            "sec_idx_cluster",
            "sec_idx_cluster_hint",
            "sec_shc",
            "sec_shc_hint",
            "sec_apps",
            "sec_apps_hint",
            "sec_advanced",
            "sec_advanced_hint",
            "es",
            "itsi",
            "dma",
            "smartstore",
            "remote_path",
            "compression",
            "lbl_compression",
            "hint_compression",
            "ph_remote",
            "auto_rec_prefix",
            "auto_rec_apply",
        }
        or (k.startswith("lbl_") and k in {
            "lbl_has_es",
            "lbl_has_itsi",
            "lbl_dma",
            "lbl_smartstore",
            "lbl_dma_pct",
        })
        or k.startswith("hint_dma")
        or k.startswith("hint_es")
        or k.startswith("hint_itsi")
        or k.startswith("hint_smart")
        or k.startswith("hint_remote"),
    ),
    (
        "05-volume-fields",
        lambda k: k.startswith("lbl_")
        or k.startswith("hint_")
        or k.startswith("ph_")
        or k.startswith("mode_")
        or k.startswith("sec_vol")
        or k.startswith("sec_policy")
        or k.startswith("sec_paths")
        or k.startswith("sec_sources")
        or k.startswith("vol_"),
    ),
    (
        "06-context-review",
        lambda k: k.startswith("ctx_") or k.startswith("review_"),
    ),
    (
        "07-sources-table",
        lambda k: k.startswith("col_")
        or k.startswith("src_")
        or k.startswith("table_")
        or k.startswith("sort_")
        or k.startswith("find_")
        or k.startswith("replace_")
        or k.startswith("import_")
        or k.startswith("suggest_")
        or k
        in {
            "add_row",
            "add_custom",
            "dup_row",
            "remove_row",
            "enable_all",
            "disable_all",
            "on",
            "off",
            "yes",
            "no",
            "back",
            "next",
            "prev",
            "finish",
            "close",
            "cancel",
            "apply",
            "skip",
            "save",
            "reset",
            "clear",
            "search",
            "filter",
            "actions",
            "optional",
            "required",
            "advanced",
            "basic",
            "custom",
            "demo",
            "blank",
            "global",
            "per_index",
            "summary",
            "enabled",
            "disabled",
        },
    ),
    (
        "08-results-charts",
        lambda k: k.startswith("res_")
        or k.startswith("chart_")
        or k.startswith("charts_")
        or k.startswith("node_")
        or k.startswith("design_")
        or k.startswith("conf_")
        or k.startswith("settings_")
        or k.startswith("export_")
        or k.startswith("download_")
        or k.startswith("copy_")
        or k.startswith("share_")
        or k.startswith("open_")
        or k.startswith("exit_"),
    ),
    (
        "09-indexes",
        lambda k: k.startswith("ix_"),
    ),
    (
        "10-misc",
        lambda k: True,
    ),
]


def parse_lang_block(text: str, name: str) -> dict[str, str]:
    if name == "en":
        m = re.search(r"\n  en: \{(\n.*?\n)  \},\n  fa:", text, re.S)
    else:
        m = re.search(r"\n  fa: \{(\n.*?\n)  \},\n\};", text, re.S)
    if not m:
        raise SystemExit(f"cannot find lang block {name}")
    body = m.group(1)
    out: dict[str, str] = {}
    # Double- or single-quoted JS strings (credit_html uses single quotes)
    for m in re.finditer(
        r"^    ([a-zA-Z0-9_]+):\s*(?:\"((?:\\.|[^\"\\])*)\"|'((?:\\.|[^'\\])*)')",
        body,
        re.M,
    ):
        key = m.group(1)
        raw = m.group(2) if m.group(2) is not None else m.group(3)
        quote = '"' if m.group(2) is not None else "'"
        out[key] = (quote, raw)
    return out


def assign_module(key: str) -> str:
    for name, pred in MODULES:
        if pred(key):
            return name
    return "10-misc"


def write_partial(path: Path, export_name: str, entries: dict[str, tuple[str, str]]) -> None:
    lines = [f"/** @type {{Record<string, string>}} */", f"export const {export_name} = {{"]
    for k in sorted(entries):
        quote, raw = entries[k]
        lines.append(f"  {k}: {quote}{raw}{quote},")
    lines.append("};")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    en = parse_lang_block(text, "en")
    fa = parse_lang_block(text, "fa")
    if set(en) != set(fa):
        only_en = sorted(set(en) - set(fa))
        only_fa = sorted(set(fa) - set(en))
        print("WARN key mismatch en-only", len(only_en), only_en[:10])
        print("WARN key mismatch fa-only", len(only_fa), only_fa[:10])

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "en").mkdir(exist_ok=True)
    (OUT / "fa").mkdir(exist_ok=True)

    buckets_en: dict[str, dict[str, str]] = {}
    buckets_fa: dict[str, dict[str, str]] = {}
    for k, v in en.items():
        mod = assign_module(k)
        buckets_en.setdefault(mod, {})[k] = v
        if k in fa:
            buckets_fa.setdefault(mod, {})[k] = fa[k]

    module_names = [m for m, _ in MODULES if m in buckets_en]
    for mod in module_names:
        safe = mod.replace("-", "_")
        # export const shell_en / overview_quick_en from 01-shell -> shell
        short = re.sub(r"^\d+-", "", mod).replace("-", "_")
        write_partial(OUT / "en" / f"{mod}.js", f"{short}", buckets_en[mod])
        write_partial(OUT / "fa" / f"{mod}.js", f"{short}", buckets_fa.get(mod, {}))
        print(f"{mod}: en={len(buckets_en[mod])} fa={len(buckets_fa.get(mod, {}))}")

    # barrel for en / fa
    en_imports = []
    en_spreads = []
    fa_imports = []
    fa_spreads = []
    for mod in module_names:
        short = re.sub(r"^\d+-", "", mod).replace("-", "_")
        ident_en = f"en_{short}"
        ident_fa = f"fa_{short}"
        en_imports.append(f'import {{ {short} as {ident_en} }} from "./i18n-dict/en/{mod}.js";')
        fa_imports.append(f'import {{ {short} as {ident_fa} }} from "./i18n-dict/fa/{mod}.js";')
        en_spreads.append(f"  ...{ident_en},")
        fa_spreads.append(f"  ...{ident_fa},")

    barrel = ROOT / "i18n-dict.js"
    barrel.write_text(
        "\n".join(
            [
                "/* i18n-dict.js — barrel: merges language modules */",
                "",
                *en_imports,
                *fa_imports,
                "",
                "export const I18N = {",
                "  en: {",
                *en_spreads,
                "  },",
                "  fa: {",
                *fa_spreads,
                "  },",
                "};",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print("wrote", barrel)
    print("total keys", len(en))


if __name__ == "__main__":
    main()
