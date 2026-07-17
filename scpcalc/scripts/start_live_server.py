#!/usr/bin/env python3
"""Start scpcalc serve on 0.0.0.0:12345, verify endpoints, optional screenshot."""
from __future__ import annotations

import json
import shutil
import signal
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "bin" / "scpcalc"
LOG = ROOT / "live-serve.log"
PIDF = ROOT / "live-serve.pid"
PROOF = ROOT / "live-proof.json"


def main() -> int:
    # kill previous
    if PIDF.exists():
        try:
            old = int(PIDF.read_text().strip())
            Path(f"/proc/{old}").exists() and __import__("os").kill(old, signal.SIGTERM)
        except Exception:
            pass
        time.sleep(0.3)

    log = LOG.open("w", encoding="utf-8")
    proc = subprocess.Popen(
        [str(BIN), "serve", "--addr", "0.0.0.0:12345"],
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    PIDF.write_text(str(proc.pid))
    time.sleep(0.9)

    proof: dict = {"pid": proc.pid, "keep_running": True}
    with urllib.request.urlopen("http://127.0.0.1:12345/api/v1/health", timeout=3) as r:
        proof["health"] = json.loads(r.read().decode())
    with urllib.request.urlopen("http://127.0.0.1:12345/", timeout=3) as r:
        html = r.read().decode()
        proof["html_markers"] = {
            "atmosphere": "atmosphere" in html,
            "glass": "glass" in html,
            "cta": 'class="cta"' in html,
            "orb": "orb-a" in html,
        }
    chrome = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    proof["chrome"] = chrome
    if chrome:
        shot = ROOT / "live-ui.png"
        subprocess.run(
            [
                chrome,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--window-size=1280,900",
                f"--screenshot={shot}",
                "http://127.0.0.1:12345/",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        proof["screenshot"] = str(shot) if shot.exists() else None
        proof["screenshot_bytes"] = shot.stat().st_size if shot.exists() else 0

    # leave server running for browser MCP / user
    log.flush()
    PROOF.write_text(json.dumps(proof, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(proof, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
