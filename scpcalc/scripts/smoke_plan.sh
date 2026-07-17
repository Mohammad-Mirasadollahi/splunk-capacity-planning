#!/bin/bash
set -e
cd /root/splunk-capacity-planning/scpcalc
if [ -f live-serve.pid ]; then
  kill "$(cat live-serve.pid)" 2>/dev/null || true
fi
pkill -f './scpcalc serve' 2>/dev/null || true
sleep 0.5
./scpcalc serve --addr 0.0.0.0:12345 > live-serve.log 2>&1 &
echo $! > live-serve.pid
sleep 0.8
echo "=== PRESETS ==="
curl -s http://127.0.0.1:12345/api/v1/presets | head -c 500
echo
echo "=== PLAN ==="
curl -s -X POST http://127.0.0.1:12345/api/v1/plan \
  -H 'Content-Type: application/json' \
  -d '{"retention_days":60,"hot_warm_days":30,"headroom":1,"summary_pct":0.1,"hot_path":"/data/hot","cold_path":"/data/cold","frozen_path":"/data/frozen","summaries_path":"/data/summaries","sources":[{"key":"windows","label":"Windows","index_name":"windows","daily_gb":50,"event_bytes":1200,"enable_summary":true},{"key":"sysmon","label":"Sysmon","index_name":"sysmon","eps":500,"event_bytes":2000}]}' \
  > /tmp/plan.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/plan.json"))
print("raw", d["total_daily_raw_gb"], "sum", d["total_summary_raw_gb"])
print("windows_summary", "windows_summary" in d["indexes_conf"])
print(d["indexes_conf"][:600])
PY
echo "=== UI ==="
curl -s http://127.0.0.1:12345/ | grep -o 'Log sources\|btn-dl-conf\|src-table' | head
