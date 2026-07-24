#!/usr/bin/env python3
"""Comprehensive live integration test for scpcalc.

Covers: unit-adjacent CLI paths, HTTP API (plan/calculate/presets/health),
static UI assets, and feature assertions (node counts, SHC/RF/ES/ITSI,
SmartStore, DMA, archive, capacity, multi-index, per-peer MB, conf).
"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "bin" / "scpcalc"
OUT = ROOT / "live-test.json"
LOG = ROOT / "live-serve.log"
PORT = int(os.environ.get("SCPCALC_LIVE_PORT", "18345"))
BASE = f"http://127.0.0.1:{PORT}"

CHECKS: list[dict] = []


def ok(name: str, cond: bool, detail: str = "") -> None:
    CHECKS.append({"name": name, "ok": bool(cond), "detail": detail})
    mark = "PASS" if cond else "FAIL"
    line = f"[{mark}] {name}"
    if detail and not cond:
        line += f" — {detail}"
    elif detail and cond and len(detail) < 120:
        line += f" — {detail}"
    print(line)
    if not cond:
        if detail:
            print(f"       detail: {detail[:500]}")


def fail_hard(msg: str) -> int:
    print(f"FATAL: {msg}", file=sys.stderr)
    return 1


def http_json(method: str, path: str, body: dict | None = None, timeout: float = 8):
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else {}, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"error": raw}
        return e.code, parsed, raw


def http_bytes(path: str, timeout: float = 5) -> tuple[int, bytes]:
    with urllib.request.urlopen(BASE + path, timeout=timeout) as r:
        return r.status, r.read()


def run_cli(args: list[str], timeout: float = 20) -> tuple[int, str, str]:
    proc = subprocess.run(
        [str(BIN), *args],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return proc.returncode, proc.stdout, proc.stderr


def wait_health(proc: subprocess.Popen, attempts: int = 40) -> bool:
    for _ in range(attempts):
        if proc.poll() is not None:
            return False
        try:
            code, data, _ = http_json("GET", "/api/v1/health")
            if code == 200 and data.get("status") == "ok":
                return True
        except Exception:
            pass
        time.sleep(0.15)
    return False


def almost(a: float, b: float, rel: float = 0.02, abs_tol: float = 0.05) -> bool:
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) <= max(abs_tol, rel * max(abs(float(a)), abs(float(b)), 1e-9))


def gib() -> float:
    return 1024.0 * 1024.0 * 1024.0


def run_algo_via_cli() -> None:
    """Verify docs/03 formulas against CLI --json output."""
    print("\n=== ALGORITHMS (CLI) ===")

    # Comp standalone = 0.5; daily_gb wins
    code, out, err = run_cli(
        [
            "calc",
            "--daily-gb",
            "100",
            "--eps",
            "99999",
            "--event-bytes",
            "99999",
            "--retention-days",
            "60",
            "--hot-warm-days",
            "30",
            "--headroom",
            "1.0",
            "--json",
        ]
    )
    p = json.loads(out) if code == 0 else {}
    ok("algo.daily_gb_wins", code == 0 and almost(p.get("total_daily_raw_gb"), 100), str(p.get("total_daily_raw_gb")))
    ok("algo.comp_standalone_0_5", almost(p.get("compression_factor"), 0.5), str(p.get("compression_factor")))
    ok("algo.ondisk_raw_x_comp", almost(p.get("total_daily_on_disk_gb"), 50), str(p.get("total_daily_on_disk_gb")))
    ix = (p.get("indexes") or [{}])[0]
    # maxTotal = 50*1024*60*1 = 3072000
    ok("algo.maxTotal_formula", ix.get("max_total_data_size_mb") == 3072000, str(ix.get("max_total_data_size_mb")))
    # home = 50*1024*30*1 = 1536000
    ok("algo.homePath_formula", ix.get("home_path_max_data_size_mb") == 1536000, str(ix.get("home_path_max_data_size_mb")))
    ok("algo.frozen_secs", ix.get("frozen_time_period_in_secs") == 60 * 86400, str(ix.get("frozen_time_period_in_secs")))
    ok("algo.maxDataSize_high_vol", ix.get("max_data_size") == "auto_high_volume", str(ix.get("max_data_size")))
    # searchable TB = 50*60/1024
    ok("algo.searchable_tb", almost(ix.get("searchable_tb"), 50 * 60 / 1024), str(ix.get("searchable_tb")))

    # EPS path
    eps, eb = 1000.0, 500.0
    expect_raw = eps * 86400 * eb / gib()
    code, out, err = run_cli(
        ["calc", "--eps", str(eps), "--event-bytes", str(eb), "--retention-days", "30", "--hot-warm-days", "7", "--json"]
    )
    p = json.loads(out) if code == 0 else {}
    ok("algo.eps_daily_raw", code == 0 and almost(p.get("total_daily_raw_gb"), expect_raw, rel=0.01), f"got={p.get('total_daily_raw_gb')} want≈{expect_raw:.4f}")

    # Cluster Comp = 0.15*RF + 0.35*SF = 0.15*3+0.35*2 = 1.15
    code, out, err = run_cli(
        [
            "calc",
            "--daily-gb",
            "10",
            "--indexer-cluster",
            "--rf",
            "3",
            "--sf",
            "2",
            "--retention-days",
            "90",
            "--hot-warm-days",
            "30",
            "--headroom",
            "1.2",
            "--json",
        ]
    )
    p = json.loads(out) if code == 0 else {}
    ok("algo.comp_cluster_rf_sf", almost(p.get("compression_factor"), 1.15), str(p.get("compression_factor")))
    ok("algo.ondisk_cluster", almost(p.get("total_daily_on_disk_gb"), 11.5), str(p.get("total_daily_on_disk_gb")))

    # Measured compression override
    code, out, err = run_cli(["calc", "--daily-gb", "20", "--compression", "0.4", "--json"])
    p = json.loads(out) if code == 0 else {}
    ok("algo.comp_measured_override", almost(p.get("compression_factor"), 0.4) and almost(p.get("total_daily_on_disk_gb"), 8), str(p.get("compression_factor")))

    # Performance table: U=12, D=800 → 2 SH + 4 IDX (before SHC)
    code, out, err = run_cli(["calc", "--daily-gb", "800", "--concurrent-users", "12", "--json"])
    p = json.loads(out) if code == 0 else {}
    d = p.get("design") or {}
    ok("algo.table_800_12", d.get("n_sh") == 2 and d.get("n_idx") == 4, f"n_sh={d.get('n_sh')} n_idx={d.get('n_idx')}")
    ok("algo.table_baseline", d.get("base_n_sh") == 2 and d.get("base_n_idx") == 4)

    # Combined small cell
    code, out, err = run_cli(["calc", "--daily-gb", "1", "--concurrent-users", "2", "--json"])
    p = json.loads(out) if code == 0 else {}
    d = p.get("design") or {}
    ok("algo.combined_small", d.get("combined_instance") is True, str(d.get("combined_instance")))

    # ES floors
    for daily, want in [(300, 3), (1024, 10), (5000, 24)]:
        code, out, err = run_cli(
            ["calc", "--daily-gb", str(daily), "--has-es", "--indexer-cluster", "--rf", "3", "--sf", "2", "--json"]
        )
        p = json.loads(out) if code == 0 else {}
        d = p.get("design") or {}
        ok(f"algo.es_floor_D{daily}", d.get("n_idx", 0) >= want, f"n_idx={d.get('n_idx')} want>={want}")

    # ITSI ceil(D/100)
    code, out, err = run_cli(["calc", "--daily-gb", "250", "--has-itsi", "--json"])
    p = json.loads(out) if code == 0 else {}
    d = p.get("design") or {}
    ok("algo.itsi_ceil_d100", d.get("n_idx", 0) >= 3, str(d.get("n_idx")))

    # Summary pct
    with tempfile.TemporaryDirectory() as td:
        plan = Path(td) / "p.json"
        plan.write_text(
            json.dumps(
                {
                    "retention_days": 90,
                    "hot_warm_days": 30,
                    "headroom": 1.0,
                    "summary_pct": 0.10,
                    "summary_retention_days": 90,
                    "sources": [
                        {
                            "key": "w",
                            "index_name": "windows",
                            "daily_gb": 100,
                            "enable_summary": True,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        code, out, err = run_cli(["calc", "--plan", str(plan), "--json"])
        p = json.loads(out) if code == 0 else {}
        ok("algo.summary_pct_10", code == 0 and almost(p.get("total_summary_raw_gb"), 10), str(p.get("total_summary_raw_gb")))
        ok("algo.summary_stanza", "windows_summary" in (p.get("indexes_conf") or ""))

    # Per-peer: cluster N_IDX=3 → MB fields ÷ 3
    with tempfile.TemporaryDirectory() as td:
        plan = Path(td) / "p.json"
        plan.write_text(
            json.dumps(
                {
                    "concurrent_users": 8,
                    "indexer_cluster": True,
                    "rf": 3,
                    "sf": 2,
                    "n_idx": 3,
                    "retention_days": 60,
                    "hot_warm_days": 30,
                    "headroom": 1.0,
                    "sources": [{"key": "w", "index_name": "windows", "daily_gb": 100}],
                }
            ),
            encoding="utf-8",
        )
        code, out, err = run_cli(["calc", "--plan", str(plan), "--json"])
        p = json.loads(out) if code == 0 else {}
        d = p.get("design") or {}
        ix = (p.get("indexes") or [{}])[0]
        # Comp=1.15, ondisk=115 GB/day, maxTotal cluster = 115*1024*60*1
        cluster_max = round(115 * 1024 * 60 * 1.0)
        peer_max = cluster_max // 3
        ok("algo.per_peer_n_idx", (p.get("indexer_peers") or 0) == 3 and d.get("n_idx") == 3)
        ok(
            "algo.per_peer_mb_div",
            ix.get("max_total_data_size_mb") == peer_max
            or almost(ix.get("max_total_data_size_mb"), peer_max, rel=0.01, abs_tol=2),
            f"peer={ix.get('max_total_data_size_mb')} want≈{peer_max} cluster_field={p.get('hot_volume_cluster_mb')}",
        )
        ok("algo.cluster_mb_present", (p.get("hot_volume_cluster_mb") or 0) > (p.get("hot_volume_budget_mb") or 0))

    # Capacity reverse
    code, out, err = run_cli(
        [
            "calc",
            "--mode",
            "capacity",
            "--available-hot-gb",
            "500",
            "--available-cold-gb",
            "1500",
            "--retention-days",
            "100",
            "--hot-warm-days",
            "30",
            "--headroom",
            "1.0",
            "--json",
        ]
    )
    p = json.loads(out) if code == 0 else {}
    d = p.get("design") or {}
    # Comp=0.5, avail=2000, maxDaily = 2000/(0.5*100*1) = 40
    ok(
        "algo.capacity_max_daily",
        almost(d.get("max_daily_gb_from_disk"), 40, rel=0.05),
        str(d.get("max_daily_gb_from_disk")),
    )

    # SmartStore cache & remote
    code, out, err = run_cli(
        [
            "calc",
            "--daily-gb",
            "100",
            "--smartstore",
            "--has-es",
            "--retention-days",
            "90",
            "--json",
        ]
    )
    p = json.loads(out) if code == 0 else {}
    d = p.get("design") or {}
    # ES cache days 90: 0.5*100*90=4500
    ok("algo.ss_cache_es_90", almost(d.get("local_cache_total_gb"), 4500), str(d.get("local_cache_total_gb")))
    # remote ≈ D*R*Comp; Comp with ES often still 0.5 if no cluster
    ok("algo.ss_remote", (d.get("remote_store_gb") or 0) > 0, str(d.get("remote_store_gb")))

    # Archive / DMA conf flags
    code, out, err = run_cli(
        ["calc", "--daily-gb", "50", "--archive-frozen", "--enable-dma", "--no-dma", "--json"]
    )
    # --no-dma after --enable-dma: last wins in parser? Actually both set dmaSet; last in argv wins.
    # Order above: enable then no → DMA off
    p = json.loads(out) if code == 0 else {}
    conf = p.get("indexes_conf") or ""
    ok("algo.archive_dir", "coldToFrozenDir" in conf)
    ok("algo.no_dma_no_tstats", "tstatsHomePath" not in conf)

    code, out, err = run_cli(["calc", "--daily-gb", "50", "--has-es", "--json"])
    p = json.loads(out) if code == 0 else {}
    conf = p.get("indexes_conf") or ""
    ok("algo.es_implies_dma_tstats", "tstatsHomePath" in conf)

    # Warnings: hot_warm > retention
    code, out, err = run_cli(
        ["calc", "--daily-gb", "10", "--retention-days", "10", "--hot-warm-days", "20", "--json"]
    )
    p = json.loads(out) if code == 0 else {}
    warns = " ".join(p.get("warnings") or []).lower()
    ok("algo.warn_hot_gt_ret", "hot_warm" in warns or "hot/warm" in warns or "retention" in warns, warns[:200])


def run_algo_via_api() -> None:
    """Cross-check key formulas through HTTP /api/v1/plan."""
    print("\n=== ALGORITHMS (API) ===")
    # Doc 05 reverse example: retention 60, hw 30, headroom 1, RF=SF=1
    # Target maxTotal ≈ 3443200 → Daily_OnDisk_MB ≈ 3443200/60 → Daily_Raw ≈ 112.08 at C=0.5
    daily = 112.08
    code, p, _ = http_json(
        "POST",
        "/api/v1/plan",
        {
            "retention_days": 60,
            "hot_warm_days": 30,
            "headroom": 1.0,
            "sources": [{"key": "x", "index_name": "main", "daily_gb": daily}],
        },
    )
    ix = (p.get("indexes") or [{}])[0]
    ok("algo.api_doc05_maxTotal", code == 200 and almost(ix.get("max_total_data_size_mb"), 3443200, rel=0.01, abs_tol=50), str(ix.get("max_total_data_size_mb")))

    # Cluster forces RF/SF defaults; off forces 1/1
    code, p, _ = http_json(
        "POST",
        "/api/v1/plan",
        {
            "indexer_cluster": False,
            "rf": 5,
            "sf": 3,
            "retention_days": 30,
            "hot_warm_days": 7,
            "sources": [{"key": "a", "index_name": "a", "daily_gb": 10}],
        },
    )
    ok("algo.api_cluster_off_comp", almost(p.get("compression_factor"), 0.5), str(p.get("compression_factor")))

    code, p, _ = http_json(
        "POST",
        "/api/v1/plan",
        {
            "indexer_cluster": True,
            "retention_days": 30,
            "hot_warm_days": 7,
            "concurrent_users": 8,
            "sources": [{"key": "a", "index_name": "a", "daily_gb": 10}],
        },
    )
    ok("algo.api_cluster_default_comp", almost(p.get("compression_factor"), 1.15), str(p.get("compression_factor")))
    d = p.get("design") or {}
    ok("algo.api_rf_peer_floor", d.get("n_idx", 0) >= 3, str(d.get("n_idx")))

    # total mode
    code, p, _ = http_json(
        "POST",
        "/api/v1/plan",
        {"mode": "total", "total_daily_gb": 77, "retention_days": 30, "hot_warm_days": 7, "concurrent_users": 4},
    )
    ok("algo.api_total_mode", code == 200 and almost(p.get("total_daily_raw_gb"), 77), str(p.get("total_daily_raw_gb")))

    # SmartStore remotePath in conf
    code, p, _ = http_json(
        "POST",
        "/api/v1/plan",
        {
            "smartstore": True,
            "remote_path": "s3://bucket/splunk",
            "retention_days": 90,
            "hot_warm_days": 30,
            "sources": [{"key": "a", "index_name": "a", "daily_gb": 20}],
        },
    )
    conf = p.get("indexes_conf") or ""
    ok("algo.api_ss_remote_volume", "volume:remote" in conf or "remotePath" in conf, conf[:200])


def main() -> int:
    if not BIN.exists():
        return fail_hard(f"missing binary: {BIN} (run make build first)")

    results: dict = {"binary": str(BIN), "base": BASE, "checks": CHECKS}

    run_algo_via_cli()

    # ── CLI feature matrix ─────────────────────────────────────────────
    print("\n=== CLI ===")
    code, out, err = run_cli(["version"])
    ok("cli.version", code == 0 and "SCPcalc" in out, out.strip())

    code, out, err = run_cli(
        [
            "calc",
            "--daily-gb",
            "800",
            "--concurrent-users",
            "12",
            "--indexer-cluster",
            "--rf",
            "3",
            "--sf",
            "2",
            "--search-head-cluster",
            "--json",
        ]
    )
    plan = {}
    if code == 0:
        plan = json.loads(out)
    d = plan.get("design") or {}
    ok("cli.cluster_shc.json", code == 0, err[:200] if code else "")
    ok("cli.cluster_shc.n_sh>=3", d.get("n_sh", 0) >= 3, str(d.get("n_sh")))
    ok("cli.cluster_shc.n_idx>=3", d.get("n_idx", 0) >= 3, str(d.get("n_idx")))
    ok("cli.cluster_shc.cm", d.get("cluster_manager") is True)
    ok("cli.cluster_shc.deployer", d.get("shc_deployer") is True)
    ok(
        "cli.cluster_shc.node_plan",
        "NODE COUNTS" in (d.get("node_plan_text") or ""),
        (d.get("node_plan_text") or "")[:80],
    )
    ok("cli.cluster_shc.conf", "[volume:hotwarm]" in (plan.get("indexes_conf") or ""))

    code, out, err = run_cli(
        ["calc", "--daily-gb", "200", "--concurrent-users", "8", "--has-es", "--indexer-cluster", "--json"]
    )
    es = json.loads(out) if code == 0 else {}
    ed = es.get("design") or {}
    ok("cli.es.n_idx_floor", code == 0 and ed.get("n_idx", 0) >= 3, str(ed.get("n_idx")))
    ok("cli.es.has_es", ed.get("has_es") is True)

    code, out, err = run_cli(
        ["calc", "--daily-gb", "250", "--concurrent-users", "8", "--has-itsi", "--json"]
    )
    itsi = json.loads(out) if code == 0 else {}
    ides = itsi.get("design") or {}
    # ceil(250/100)=3
    ok("cli.itsi.n_idx_floor", code == 0 and ides.get("n_idx", 0) >= 3, str(ides.get("n_idx")))

    code, out, err = run_cli(
        [
            "calc",
            "--daily-gb",
            "100",
            "--smartstore",
            "--remote-path",
            "s3://bucket/splunk",
            "--has-es",
            "--json",
        ]
    )
    ss = json.loads(out) if code == 0 else {}
    sd = ss.get("design") or {}
    ok("cli.smartstore.cache", code == 0 and (sd.get("local_cache_total_gb") or 0) > 0, str(sd.get("local_cache_total_gb")))
    ok("cli.smartstore.es_cache_days", sd.get("smartstore_cache_days") == 90, str(sd.get("smartstore_cache_days")))
    ok("cli.smartstore.remote", (sd.get("remote_store_gb") or 0) > 0)

    code, out, err = run_cli(
        [
            "calc",
            "--daily-gb",
            "50",
            "--archive-frozen",
            "--enable-dma",
            "--dma-pct",
            "0.15",
            "--compression",
            "0.4",
            "--json",
        ]
    )
    dma = json.loads(out) if code == 0 else {}
    conf = dma.get("indexes_conf") or ""
    ok("cli.archive.coldToFrozenDir", code == 0 and "coldToFrozenDir" in conf)
    ok("cli.dma.tstats", "tstatsHomePath" in conf)
    ok("cli.compression.override", abs((dma.get("compression_factor") or 0) - 0.4) < 0.001)

    code, out, err = run_cli(
        [
            "calc",
            "--mode",
            "capacity",
            "--available-hot-gb",
            "500",
            "--available-cold-gb",
            "2000",
            "--retention-days",
            "90",
            "--hot-warm-days",
            "30",
            "--concurrent-users",
            "8",
            "--json",
        ]
    )
    cap = json.loads(out) if code == 0 else {}
    cd = cap.get("design") or {}
    ok("cli.capacity.mode", code == 0 and cap.get("mode") == "capacity")
    ok(
        "cli.capacity.reverse",
        (cd.get("max_daily_gb_from_disk") or 0) > 0 or (cd.get("max_retention_days_from_disk") or 0) > 0,
        json.dumps({k: cd.get(k) for k in ("max_daily_gb_from_disk", "max_retention_days_from_disk")}),
    )

    code, out, err = run_cli(
        ["calc", "--mode", "total", "--total-daily-gb", "120", "--concurrent-users", "8", "--json"]
    )
    tot = json.loads(out) if code == 0 else {}
    ok("cli.total.mode", code == 0 and abs((tot.get("total_daily_raw_gb") or 0) - 120) < 0.01)

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        plan_path = td_path / "plan.json"
        sources_path = td_path / "sources.json"
        conf_out = td_path / "indexes.conf"
        design_out = td_path / "design.txt"
        plan_path.write_text(
            json.dumps(
                {
                    "mode": "sources",
                    "concurrent_users": 12,
                    "indexer_cluster": True,
                    "rf": 3,
                    "sf": 2,
                    "search_head_cluster": True,
                    "retention_days": 60,
                    "hot_warm_days": 30,
                    "headroom": 1.2,
                    "summary_pct": 0.1,
                    "hot_path": "/data/hot",
                    "cold_path": "/data/cold",
                    "frozen_path": "/data/frozen",
                    "summaries_path": "/data/summaries",
                    "sources": [
                        {
                            "key": "windows",
                            "label": "Windows",
                            "index_name": "windows",
                            "daily_gb": 50,
                            "event_bytes": 1200,
                            "enable_summary": True,
                        },
                        {
                            "key": "sysmon",
                            "label": "Sysmon",
                            "index_name": "sysmon",
                            "eps": 500,
                            "event_bytes": 2000,
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )
        sources_path.write_text(
            json.dumps(
                [
                    {
                        "key": "a",
                        "index_name": "app",
                        "label": "App",
                        "daily_gb": 10,
                    }
                ]
            ),
            encoding="utf-8",
        )
        code, out, err = run_cli(
            [
                "calc",
                "--plan",
                str(plan_path),
                "--conf-out",
                str(conf_out),
                "--design-out",
                str(design_out),
                "--json",
            ]
        )
        multi = json.loads(out) if code == 0 else {}
        conf_txt = conf_out.read_text(encoding="utf-8") if conf_out.exists() else ""
        des_txt = design_out.read_text(encoding="utf-8") if design_out.exists() else ""
        ok("cli.plan_file", code == 0 and multi.get("total_daily_raw_gb", 0) > 50)
        ok("cli.plan_file.summary_stanza", "windows_summary" in (multi.get("indexes_conf") or ""))
        ok("cli.conf_out", "[windows]" in conf_txt and "[sysmon]" in conf_txt)
        ok("cli.design_out", "NODE COUNTS" in des_txt)
        # per-peer: N_IDX should be >= 3 with cluster; volume MB should be present
        md = multi.get("design") or {}
        ok(
            "cli.plan_file.per_peer_flag",
            md.get("n_idx", 0) >= 3 and (multi.get("indexer_peers") or 0) >= 3,
            f"n_idx={md.get('n_idx')} peers={multi.get('indexer_peers')}",
        )

        code, out, err = run_cli(["calc", "--sources", str(sources_path), "--concurrent-users", "4", "--json"])
        src = json.loads(out) if code == 0 else {}
        ok("cli.sources_file", code == 0 and abs((src.get("total_daily_raw_gb") or 0) - 10) < 0.01)

    code, out, err = run_cli(["calc", "--daily-gb", "-1"])
    ok("cli.validation_error", code != 0)

    code, out, err = run_cli(
        ["calc", "--daily-gb", "800", "--concurrent-users", "12", "--indexer-cluster", "--rf", "3", "--sf", "2"]
    )
    ok("cli.human.node_section", code == 0 and "node counts" in out.lower())
    ok("cli.human.n_sh", "N_SH:" in out)
    ok("cli.human.resources", "resource" in out.lower() or "CPU=" in out)
    ok("cli.human.conf_block", "indexes.conf" in out)

    # ── HTTP server ────────────────────────────────────────────────────
    print("\n=== HTTP / UI ===")
    log = LOG.open("w", encoding="utf-8")
    proc = subprocess.Popen(
        [str(BIN), "serve", "--addr", f"127.0.0.1:{PORT}"],
        stdout=log,
        stderr=subprocess.STDOUT,
        cwd=str(ROOT),
    )
    results["pid"] = proc.pid
    try:
        if not wait_health(proc):
            log_tail = LOG.read_text(encoding="utf-8", errors="replace")[-800:]
            ok("http.health_up", False, f"server died or no health; log={log_tail}")
            results["ok"] = False
            results["checks"] = CHECKS
            OUT.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
            return 1
        ok("http.health_up", True)
        run_algo_via_api()

        code, health, _ = http_json("GET", "/api/v1/health")
        ok("api.health", code == 200 and health.get("status") == "ok", json.dumps(health))

        code, presets, _ = http_json("GET", "/api/v1/presets")
        sources = presets.get("sources") or []
        ok("api.presets", code == 200 and len(sources) >= 3, f"count={len(sources)}")

        # method checks
        code, _, _ = http_json("POST", "/api/v1/health")
        ok("api.health_method", code == 405)
        code, _, _ = http_json("GET", "/api/v1/plan")
        ok("api.plan_method", code == 405)

        code, bad, _ = http_json("POST", "/api/v1/plan", {})
        ok("api.plan_validation_400", code == 400 and "error" in bad, str(bad)[:160])

        code, legacy, _ = http_json(
            "POST",
            "/api/v1/calculate",
            {
                "daily_gb": 100,
                "retention_days": 60,
                "hot_warm_days": 30,
                "headroom": 1.2,
                "index_name": "windows",
            },
        )
        ok(
            "api.calculate_legacy",
            code == 200
            and legacy.get("daily_raw_gb") == 100
            and "[windows]" in (legacy.get("indexes_conf") or ""),
        )

        full_plan = {
            "mode": "sources",
            "concurrent_users": 12,
            "indexer_cluster": True,
            "rf": 3,
            "sf": 2,
            "search_head_cluster": True,
            "smartstore": True,
            "remote_path": "s3://bucket/path",
            "has_es": True,
            "has_itsi": True,
            "enable_dma": True,
            "dma_pct": 0.1,
            "archive_frozen": True,
            "compression": 0,
            "retention_days": 90,
            "hot_warm_days": 30,
            "headroom": 1.2,
            "summary_pct": 0.1,
            "summary_retention_days": 90,
            "hot_path": "/hot",
            "cold_path": "/cold",
            "frozen_path": "/frozen",
            "summaries_path": "/summaries",
            "sources": [
                {
                    "key": "windows",
                    "label": "Windows",
                    "index_name": "windows",
                    "daily_gb": 80,
                    "event_bytes": 1200,
                    "enable_summary": True,
                },
                {
                    "key": "fw",
                    "label": "Firewall",
                    "index_name": "firewall",
                    "eps": 1000,
                    "event_bytes": 500,
                },
            ],
        }
        code, plan, _ = http_json("POST", "/api/v1/plan", full_plan)
        design = plan.get("design") or {}
        conf = plan.get("indexes_conf") or ""
        ok("api.plan_ok", code == 200 and plan.get("total_daily_raw_gb", 0) > 80)
        ok(
            "api.plan.n_sh_shc",
            design.get("n_sh", 0) >= 2
            and (design.get("n_sh_es") or 0) + (design.get("n_sh_itsi") or 0) == design.get("n_sh", 0),
            f"n_sh={design.get('n_sh')} es={design.get('n_sh_es')} itsi={design.get('n_sh_itsi')}",
        )
        ok("api.plan.n_idx_es", design.get("n_idx", 0) >= 3, str(design.get("n_idx")))
        ok("api.plan.node_plan_text", "NODE COUNTS" in (design.get("node_plan_text") or ""))
        ok("api.plan.structure", "Node counts" in (design.get("structure_text") or "") or "DESIGN STRUCTURE" in (design.get("structure_text") or ""))
        ok("api.plan.resources", len(design.get("resources") or []) >= 2)
        ok("api.plan.resources_text", bool(design.get("resources_text")))
        ok("api.plan.settings_text", bool(design.get("settings_text")))
        ok("api.plan.cluster_manager", design.get("cluster_manager") is True)
        ok("api.plan.shc_deployer", design.get("shc_deployer") is True)
        ok("api.plan.smartstore_cache", (design.get("local_cache_total_gb") or 0) > 0)
        ok("api.plan.remote_store", (design.get("remote_store_gb") or 0) > 0)
        ok("api.plan.archive", "coldToFrozenDir" in conf)
        ok("api.plan.dma_tstats", "tstatsHomePath" in conf)
        ok("api.plan.summary_index", "windows_summary" in conf)
        ok("api.plan.multi_index", "[windows]" in conf and "[firewall]" in conf)
        ok("api.plan.per_peer", (plan.get("indexer_peers") or 0) >= 3 and (plan.get("hot_volume_budget_mb") or 0) > 0)
        # ES+ITSI separate tiers
        ok(
            "api.plan.es_itsi_tiers",
            (design.get("n_sh_es") or 0) >= 1 and (design.get("n_sh_itsi") or 0) >= 1,
            f"es={design.get('n_sh_es')} itsi={design.get('n_sh_itsi')}",
        )

        # capacity via API
        code, cap_api, _ = http_json(
            "POST",
            "/api/v1/plan",
            {
                "mode": "capacity",
                "available_hot_gb": 1000,
                "available_cold_gb": 4000,
                "retention_days": 90,
                "hot_warm_days": 30,
                "concurrent_users": 8,
            },
        )
        cap_d = cap_api.get("design") or {}
        ok(
            "api.capacity",
            code == 200
            and (
                (cap_d.get("max_daily_gb_from_disk") or 0) > 0
                or (cap_d.get("max_retention_days_from_disk") or 0) > 0
            ),
        )

        # duplicate index names should fail
        code, dup, _ = http_json(
            "POST",
            "/api/v1/plan",
            {
                "retention_days": 30,
                "hot_warm_days": 7,
                "sources": [
                    {"key": "a", "index_name": "same", "daily_gb": 1},
                    {"key": "b", "index_name": "same", "daily_gb": 1},
                ],
            },
        )
        ok("api.dup_index_400", code == 400, str(dup)[:160])

        # sources sum over total_daily_gb budget must fail
        code, over_src, _ = http_json(
            "POST",
            "/api/v1/plan",
            {
                "total_daily_gb": 100,
                "retention_days": 30,
                "hot_warm_days": 7,
                "headroom": 1,
                "sources": [
                    {"key": "a", "index_name": "a", "daily_gb": 80},
                    {"key": "b", "index_name": "b", "daily_gb": 40},
                ],
            },
        )
        ok(
            "api.sources_over_total_400",
            code == 400 and "total_daily_gb" in str(over_src).lower(),
            str(over_src)[:200],
        )

        # hot need over available_hot_gb budget must fail
        code, over_hot, _ = http_json(
            "POST",
            "/api/v1/plan",
            {
                "mode": "sources",
                "retention_days": 60,
                "hot_warm_days": 30,
                "headroom": 1,
                "available_hot_gb": 1,
                "sources": [{"key": "w", "index_name": "windows", "daily_gb": 100}],
            },
        )
        ok(
            "api.hot_over_budget_400",
            code == 400 and "available_hot_gb" in str(over_hot).lower(),
            str(over_hot)[:200],
        )

        # Static UI assets
        code, html_b = http_bytes("/")
        html = html_b.decode("utf-8", errors="replace")
        ok("ui.index", code == 200 and ("scpcalc" in html.lower() or "wizard" in html.lower() or "capacity" in html.lower()))
        for needle, name in [
            ("concurrent_users", "ui.field.concurrent_users"),
            ("indexer_cluster", "ui.field.indexer_cluster"),
            ("search_head_cluster", "ui.field.shc"),
            ("has_es", "ui.field.has_es"),
            ("has_itsi", "ui.field.has_itsi"),
            ("smartstore", "ui.field.smartstore"),
            ("enable_dma", "ui.field.dma"),
            ("archive_frozen", "ui.field.archive"),
            ("btn-wiz-calc", "ui.calc_button"),
            ('data-tab="overview"', "ui.tab.overview"),
            ('data-tab="design"', "ui.tab.design"),
            ("id=\"metrics\"", "ui.metrics"),
            ("type=\"module\"", "ui.es_module"),
            ("id=\"res-find\"", "ui.table.res_find"),
            ("id=\"ix-find\"", "ui.table.ix_find"),
            ("data-i18n=\"res_network\"", "ui.table.res_network"),
            ("data-i18n=\"ix_event_bytes\"", "ui.table.ix_event_bytes"),
        ]:
            ok(name, needle in html)

        assets = [
            "/app.css",
            "/css/01-base.css",
            "/css/03-layout.css",
            "/css/08-charts.css",
            "/app.js",
            "/tips.js",
            "/js/results.js",
            "/js/plan-form.js",
            "/js/wizard.js",
            "/js/i18n.js",
            "/js/charts.js",
            "/js/share-url.js",
            "/vendor/chart.umd.min.js",
        ]
        for path in assets:
            try:
                st, body = http_bytes(path)
                ok(f"ui.asset{path}", st == 200 and len(body) > 40, f"bytes={len(body)}")
            except Exception as e:  # noqa: BLE001
                ok(f"ui.asset{path}", False, str(e))

        # Entry stylesheet should import modular sheets
        _, app_css = http_bytes("/app.css")
        ac = app_css.decode("utf-8", errors="replace")
        ok("ui.css.modular_imports", "css/01-base.css" in ac and "08-charts" in ac)

        # WASM engine assets (browser calculator)
        for path in ["/wasm/scpcalc.wasm", "/wasm/wasm_exec.js", "/js/engine.js"]:
            try:
                st, body = http_bytes(path)
                ok(f"ui.asset{path}", st == 200 and len(body) > 100, f"bytes={len(body)}")
            except Exception as e:  # noqa: BLE001
                ok(f"ui.asset{path}", False, str(e))
        _, eng = http_bytes("/js/engine.js")
        ej = eng.decode("utf-8", errors="replace")
        ok("ui.engine.wasm_path", "scpcalc.wasm" in ej and "scpcalcPlan" in ej)
        _, charts_js = http_bytes("/js/charts.js")
        cj = charts_js.decode("utf-8", errors="replace")
        ok("ui.charts.hide_single", "chartIsUseful" in cj and "meaningful >= 2" in cj)

        _, share_js = http_bytes("/js/share-url.js")
        sj = share_js.decode("utf-8", errors="replace")
        ok("ui.share.url_hash", "scp1." in sj and "encodeSnapshotHash" in sj and "extractShareFragment" in sj)

        _, app_js = http_bytes("/app.js")
        aj = app_js.decode("utf-8", errors="replace")
        ok("ui.share.wired", "share-url.js" in aj and "tryLoadFromShareURL" in aj and "btn-export-url" in aj)
        ok("ui.share.button", 'id="btn-export-url-home"' in html and 'id="btn-import-home"' in html and 'id="import-modal"' in html)
        ok("ui.share.import_paste", 'id="import-url-input"' in html and "applyPlanFromShareText" in aj)
        # results.js should surface node plan
        _, results_js = http_bytes("/js/results.js")
        rj = results_js.decode("utf-8", errors="replace")
        ok("ui.results.node_plan", "node_plan_text" in rj)
        ok("ui.results.n_sh", "N_SH" in rj)
        ok("ui.results.table_find", "applyTableFind" in rj and "data-find" in rj)
        ok("ui.results.ix_columns", "frozen_time_period_in_secs" in rj and "event_bytes" in rj)
        ok("ui.results.res_columns", "cell-notes" in rj)
        ok("ui.results.cpu_physical", "physical" in rj)
        ok("ui.results.cpu_virt", "virt_cpu_rule" in rj and "splunk_parallelization" in rj)
        code_nj, nodes_js = http_bytes("/js/nodes.js")
        nj = nodes_js.decode("utf-8", errors="replace") if nodes_js else ""
        ok("ui.nodes.res_network", code_nj == 200 and "network" in nj)
        ok("ui.nodes.cpu_physical", "cpu_physical_cores" in nj)

        _, plan_form_b = http_bytes("/js/plan-form.js")
        pf = plan_form_b.decode("utf-8", errors="replace")
        for field in [
            "concurrent_users",
            "indexer_cluster",
            "search_head_cluster",
            "has_es",
            "enable_dma",
            "archive_frozen",
            "compression",
            "n_idx",
            "n_sh",
            "total_daily_gb",
            "available_hot_gb",
            "migrateWizardStep",
        ]:
            ok(f"ui.plan_form.{field}", field in pf)
        ok("ui.wizard.no_mode_step", 'data-i18n="step_mode"' not in html and 'name="mode"' not in html)
        ok("ui.wizard.four_steps", 'data-step="3"' in html and 'data-pane="3"' in html and 'data-step="4"' not in html)
        ok("ui.volume_drivers", 'id="volume-drivers"' in html and "Quick start — volume drivers" not in html)
        ok("ui.volume_budget_err", 'id="volume-budget-err"' in html)
        ok("ui.wizard.no_top_retention_step", 'data-i18n="step_retention"' not in html)
        ok("ui.wizard.no_top_sources_step", 'data-i18n="step_src"' not in html)
        ok(
            "ui.wizard.order_volume_cluster",
            'data-i18n="step_ret"' in html
            and 'data-i18n="step_topo"' in html
            and html.index('data-i18n="step_ret"') < html.index('data-i18n="step_topo"')
            and html.index('data-i18n="step_topo"') < html.index('data-i18n="step_review"'),
        )
        ok("ui.volume_tabs", 'data-tabs="volume"' in html and 'data-tab="vol-sources"' in html and 'data-tab="vol-policy"' in html)
        ok("ui.sources_under_volume", 'data-pane="1"' in html and 'id="src-table"' in html and "src-table--merged" in html)
        ok("ui.sources_merged_cols", 'data-i18n="col_ret"' in html and 'id="src-ret-table"' not in html)
        _, state_js = http_bytes("/js/state.js")
        ok("ui.wizard.steps_const", "STEPS = 4" in state_js.decode("utf-8", errors="replace"))
        _, pf_mig = http_bytes("/js/plan-form.js")
        ok("ui.snapshot_v10", b"version: 10" in pf_mig and b"ver < 10" in pf_mig)
        code_vb, budget_js = http_bytes("/js/volume-budget.js")
        ok("ui.volume_budget_js", code_vb == 200 and b"checkVolumeBudgets" in budget_js)
        ok("ui.csp_meta", "Content-Security-Policy" in html and "unsafe-eval" in html)
        _, sources_js = http_bytes("/js/sources.js")
        sj = sources_js.decode("utf-8", errors="replace")
        ok("ui.sources_field_ids", "const p = `src-${i}`" in sj or 'src-${i}' in sj)
        ok("ui.sources_merged_row", 'data-f="retention_days"' in sj and "retentionRowHTML" not in sj)

    except Exception as e:  # noqa: BLE001
        ok("http.exception", False, str(e))
    finally:
        proc.send_signal(signal.SIGTERM)
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        log.close()

    passed = sum(1 for c in CHECKS if c["ok"])
    failed = [c for c in CHECKS if not c["ok"]]
    results["summary"] = {"passed": passed, "failed": len(failed), "total": len(CHECKS)}
    results["ok"] = len(failed) == 0
    results["failures"] = failed
    OUT.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")

    print(f"\n=== SUMMARY: {passed}/{len(CHECKS)} passed ===")
    if failed:
        print("FAILURES:")
        for f in failed:
            print(f"  - {f['name']}: {f.get('detail', '')}")
    print(f"Wrote {OUT}")
    return 0 if results["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
