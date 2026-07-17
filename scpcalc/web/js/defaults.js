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
