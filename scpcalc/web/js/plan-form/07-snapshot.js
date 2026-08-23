/**
 * Snapshot / restore / plan body for Calculate.
 */
import { state } from "../state.js";
import { dailyGBFromEPS, epsFromDailyGB, numOr0, resolveEventBytes } from "../volume-convert.js";
import { normalizeSnapshotRows, renderRows, setConfigureSources, hasManualSources, collapseToMainOnly, enterManualSourceMode } from "../sources.js";
import { syncCapacityPair, readCapacityPlanMode } from "./03-capacity-bridge.js";
import { syncArchiveFields } from "./04-archive-sync.js";
import { readVolumeInputMode, syncVolumeInputMode } from "./05-volume-mode.js";
import { applyGlobals, collectGlobals } from "./06-globals.js";

/** Migrate wizard step from older snapshots. */
export function migrateWizardStep(data) {
  let step = typeof data?.step === "number" ? data.step : 0;
  const ver = Number(data?.version) || 0;
  // v3 and earlier: step 0 was Mode; drop it.
  if (ver < 4 && (data?.globals?.mode != null || ver === 3)) {
    step = Math.max(0, step - 1);
  }
  // v6 and earlier: Topology was step 0, Retention step 1.
  // v7+: Volume/Retention first (0), Topology/Cluster second (1).
  if (ver < 7) {
    if (step === 0) step = 1;
    else if (step === 1) step = 0;
  }
  // v8+: Overview inserted at step 0 — shift prior v7 steps up by one.
  if (ver < 8) {
    step = Math.min(4, step + 1);
  }
  // v9+: Volume and Retention split; Sources folded into Volume.
  // v8: 0 Overview, 1 Vol+Ret, 2 Cluster, 3 Sources, 4 Review
  // v9: 0 Overview, 1 Volume(+Sources), 2 Retention, 3 Cluster, 4 Review
  if (ver < 9) {
    if (step === 2) step = 3;
    else if (step === 3) step = 1;
  }
  // v10+: Retention nested into Volume; 4 top-level steps.
  // v9: 0 Overview, 1 Volume, 2 Retention, 3 Cluster, 4 Review
  // v10: 0 Overview, 1 Volume, 2 Cluster, 3 Review
  if (ver < 10) {
    if (step === 2) step = 1;
    else if (step === 3) step = 2;
    else if (step === 4) step = 3;
  }
  return Math.max(0, Math.min(3, step));
}

export function snapshot() {
  return {
    version: 11,
    configure_sources: state.configureSources,
    volume_input_mode: readVolumeInputMode(),
    capacity_plan_mode: readCapacityPlanMode(),
    globals: collectGlobals(),
    rows: state.rows,
    step: state.step,
  };
}

export function applySnapshot(data) {
  if (!data || !Array.isArray(data.rows)) throw new Error("invalid save file");
  if (data.capacity_plan_mode && data.globals) {
    data.globals.capacity_plan_mode = data.capacity_plan_mode;
  }
  applyGlobals(data.globals);
  state.rows = normalizeSnapshotRows(data.rows);
  const configureSources =
    typeof data.configure_sources === "boolean" ? data.configure_sources : hasManualSources(state.rows);
  setConfigureSources(configureSources);
  if (configureSources) {
    if (hasManualSources(state.rows)) enterManualSourceMode({ keepConfigureFlag: true });
  } else {
    collapseToMainOnly();
  }
  renderRows();
  state.step = migrateWizardStep(data);
  const mode =
    data.volume_input_mode ||
    data.globals?.volume_input_mode ||
    (state.rows.some((r) => Number(r.eps) > 0 && !(Number(r.daily_gb) > 0)) ? "eps" : "daily_gb");
  syncVolumeInputMode(mode);
  syncArchiveFields();
  syncCapacityPair("mode");
}

export function buildPlanBody(overrides = {}) {
  syncCapacityPair(null);
  const g = { ...collectGlobals(), ...overrides };
  syncVolumeInputMode("daily_gb");
  const sources = state.rows
    .filter((r) => r.enabled)
    .map((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      // Prefer explicit Daily GB; if only EPS is set, derive GB. Engine plans from volume.
      let daily = numOr0(r.daily_gb);
      let eps = numOr0(r.eps);
      if (!(daily > 0) && eps > 0) daily = dailyGBFromEPS(eps, bytes);
      if (!(eps > 0) && daily > 0) eps = epsFromDailyGB(daily, bytes);
      const row = {
        key: r.key,
        label: r.label,
        index_name: String(r.index_name || "").trim(),
        event_bytes: bytes > 0 ? bytes : 500,
        daily_gb: daily,
        eps: eps,
      };
      const ret = Number(r.retention_days);
      if (ret > 0) row.retention_days = ret;
      const hw = Number(r.hot_warm_days);
      if (hw > 0) row.hot_warm_days = hw;
      return row;
    });
  const { capacity_plan_mode: _mode, ...payload } = g;
  return { ...payload, sources };
}
