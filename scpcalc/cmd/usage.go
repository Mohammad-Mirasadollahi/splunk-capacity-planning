package cmd

import (
	"fmt"
	"os"
)

func printUsage() {
	fmt.Fprintf(os.Stderr, `SCPcalc — portable Splunk capacity calculator

Usage:
  scpcalc calc [flags]
  scpcalc serve [--addr HOST:PORT] [--host HOST] [--port PORT]
  scpcalc version

serve defaults (override via .env / env / flags):
  host  0.0.0.0
  port  12345
  file  .env  (see .env.example)

calc — same engine as the web UI / POST /api/v1/plan

Input:
  --plan FILE              full PlanInput JSON (use - for stdin)
  --sources FILE           JSON array of source rows (merged into plan)

Mode & volume:
  --mode sources|total|capacity   (default sources)
  --total-daily-gb FLOAT          mode=total (or capacity with known ingest)
  --available-hot-gb FLOAT        mode=capacity
  --available-cold-gb FLOAT
  --available-summaries-gb FLOAT

Retention & paths:
  --retention-days INT     (default 90)
  --hot-warm-days INT      (default 30)
  --headroom FLOAT         (default 1.2)
  --summary-pct FLOAT      (default 0.10)
  --summary-retention-days INT
  --hot-path --cold-path --frozen-path --summaries-path STRING
  --archive-frozen         coldToFrozenDir instead of delete
  --compression FLOAT      measured C; 0 = derive from RF/SF

Topology (users × volume → N_SH / N_IDX):
  --concurrent-users INT   (default 8)
  --indexer-cluster
  --search-head-cluster
  --rf INT --sf INT        used when indexer-cluster (defaults 3/2)
  --n-idx INT --n-sh INT   0 = auto from table + floors
  --smartstore [--remote-path STRING]
  --has-es --has-itsi
  --es-smartstore          alias: has-es + smartstore
  --enable-dma / --no-dma  DMA/tstats (default: on when ES)
  --dma-pct FLOAT          (default 0.10)

Legacy single-index (if no --plan/--sources):
  --daily-gb FLOAT
  --eps FLOAT --event-bytes FLOAT
  --index-name STRING

Output:
  --json                   PlanResult JSON (full design + conf)
  --conf-out FILE          write indexes.conf
  --design-out FILE        write design narrative (node plan + structure + resources + settings)
`)
}
