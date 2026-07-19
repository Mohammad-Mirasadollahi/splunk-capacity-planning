/**
 * First-run demo defaults (raw / pre-indexed ingest).
 * Aligned with README sample plan + UI placeholders / tips.js examples:
 *   total_daily_gb=500 with windows:linux ≈ 4:1, disk budgets 10k/20k hot/cold.
 */
export const DEMO_TOTAL_DAILY_GB = 500;
export const DEMO_AVAILABLE_HOT_GB = 10000;
export const DEMO_AVAILABLE_COLD_GB = 20000;
export const DEMO_AVAILABLE_SUMMARIES_GB = 2000;

/** Per-preset default daily_gb (raw). Keys match presets catalog. */
export const DEMO_SOURCE_DAILY_GB = {
  windows: 400,
  linux: 100,
};

/** Prefer these sources enabled on first load. */
export const DEMO_ENABLED_SOURCES = ["windows", "linux"];

export function demoGlobals() {
  return {
    total_daily_gb: DEMO_TOTAL_DAILY_GB,
    available_hot_gb: DEMO_AVAILABLE_HOT_GB,
    available_cold_gb: DEMO_AVAILABLE_COLD_GB,
    available_summaries_gb: DEMO_AVAILABLE_SUMMARIES_GB,
  };
}

export function applyDemoSourceDefaults(row) {
  const gb = DEMO_SOURCE_DAILY_GB[row.key];
  if (gb != null && (row.daily_gb === "" || row.daily_gb == null)) {
    row.daily_gb = gb;
  }
  if (DEMO_ENABLED_SOURCES.includes(row.key)) {
    row.enabled = true;
  }
  return row;
}

function round1(n) {
  return Math.round(Number(n) || 0);
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

/**
 * Recommended wizard defaults from a target daily raw ingest (GB/day).
 * Used by Quick Start → Apply.
 */
export function defaultsFromDailyGB(dailyGB) {
  const d = Math.max(0, Number(dailyGB) || 0);
  const scale = d > 0 ? d / DEMO_TOTAL_DAILY_GB : 1;

  let concurrent_users = 8;
  let concurrent_searches = 8;
  let saved_searches = 20;
  if (d >= 1000) {
    concurrent_users = 24;
    concurrent_searches = 40;
    saved_searches = 200;
  } else if (d >= 500) {
    concurrent_users = 16;
    concurrent_searches = 24;
    saved_searches = 100;
  } else if (d >= 100) {
    concurrent_users = 12;
    concurrent_searches = 16;
    saved_searches = 50;
  }

  return {
    total_daily_gb: round3(d),
    available_hot_gb: Math.max(100, round1(DEMO_AVAILABLE_HOT_GB * scale)),
    available_cold_gb: Math.max(100, round1(DEMO_AVAILABLE_COLD_GB * scale)),
    available_summaries_gb: Math.max(50, round1(DEMO_AVAILABLE_SUMMARIES_GB * scale)),
    concurrent_users,
    concurrent_searches,
    saved_searches,
    hot_warm_days: 30,
    retention_days: 90,
    headroom: 1.2,
    n_idx: 0,
    n_sh: 0,
    indexer_cluster: d >= 100,
    search_head_cluster: concurrent_users >= 12,
    smartstore: d >= 500,
    rf: 3,
    sf: 2,
  };
}

/** Scale demo Windows/Linux sources so they sum to totalGB (4:1). */
export function scaleDemoSourcesToTotal(rows, totalGB) {
  const d = Math.max(0, Number(totalGB) || 0);
  const keys = DEMO_ENABLED_SOURCES;
  const weights = keys.map((k) => DEMO_SOURCE_DAILY_GB[k] || 0);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  for (const r of rows || []) {
    const i = keys.indexOf(r.key);
    if (i < 0) continue;
    r.enabled = true;
    r.daily_gb = d > 0 ? round3((d * weights[i]) / wsum) : "";
  }
  return rows;
}
