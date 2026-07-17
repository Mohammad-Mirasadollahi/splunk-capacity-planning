#!/bin/bash
set -e
cd "$(dirname "$0")/.."
export GO="${GO:-go}"
make test
make build
BIN=./bin/scpcalc
pkill -f './bin/scpcalc serve|./scpcalc serve' 2>/dev/null || true
sleep 0.4
"$BIN" serve --addr 0.0.0.0:12345 > live-serve.log 2>&1 &
echo $! > live-serve.pid
sleep 0.7
curl -s -X POST http://127.0.0.1:12345/api/v1/plan -H 'Content-Type: application/json' -d '{
  "mode":"total","total_daily_gb":800,"retention_days":90,"hot_warm_days":30,"headroom":1.2,
  "indexer_cluster":true,"rf":3,"sf":2,"search_head_cluster":true,"smartstore":true,
  "has_es":true,"has_itsi":false,"concurrent_users":12,
  "available_hot_gb":20000,"available_cold_gb":40000,"available_summaries_gb":2000,
  "sources":[]
}' > /tmp/plan2.json
python3 - <<'PY'
import json
d=json.load(open('/tmp/plan2.json'))
print('raw', d['total_daily_raw_gb'], 'comp', d['compression_factor'])
des=d['design']
print('N_SH', des['n_sh'], 'N_IDX', des['n_idx'], 'ES', des['has_es'], 'cache', des.get('local_cache_total_gb'))
print('--- structure ---')
print(des['structure_text'][:700])
PY
