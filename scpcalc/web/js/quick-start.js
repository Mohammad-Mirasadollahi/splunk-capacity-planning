/**
 * Wizard Quick Start: EPS or daily GB → estimate, optional Apply defaults.
 */
import { state } from "./state.js";
import { t } from "./i18n.js";
import { escapeAttr } from "./util.js";
import {
  averageEventBytes,
  dailyGBFromEPS,
  epsFromDailyGB,
  formatDailyGB,
  formatEPS,
  numOr0,
} from "./volume-convert.js";
import { defaultsFromDailyGB, scaleDemoSourcesToTotal } from "./defaults.js";
import {
  applyGlobals,
  buildPlanBody,
  collectGlobals,
  syncArchiveFields,
  syncCapacityPair,
  syncClusterFields,
  syncToggleUI,
} from "./plan-form.js";
import { renderRows, refreshTotalCounterpart, syncRowVolumePair } from "./sources.js";
import { runPlan } from "./engine.js";
import { updateAutoRecBadges } from "./suggestions.js";

function roundVol(n, kind) {
  if (!(n > 0)) return "";
  if (kind === "eps") return Math.round(n * 1000) / 1000;
  return Math.round(n * 1000) / 1000;
}

function avgEventBytes() {
  return averageEventBytes(state.rows, { enabledOnly: true }) || 500;
}

export function syncQuickVolumePair(edited) {
  const gbEl = document.getElementById("quick_daily_gb");
  const epsEl = document.getElementById("quick_daily_eps");
  if (!gbEl || !epsEl) return;
  const bytes = avgEventBytes();
  if (edited === "eps") {
    const eps = numOr0(epsEl.value);
    const gb = eps > 0 ? roundVol(dailyGBFromEPS(eps, bytes), "gb") : "";
    gbEl.value = gb === "" ? "" : gb;
  } else if (edited === "gb" || edited == null) {
    const gb = numOr0(gbEl.value);
    const eps = gb > 0 ? roundVol(epsFromDailyGB(gb, bytes), "eps") : "";
    if (edited === "gb" || document.activeElement !== epsEl) {
      epsEl.value = eps === "" ? "" : eps;
    }
  }
}

/** Seed quick fields from the Volumes total when opening / after Apply. */
export function syncQuickFromGlobals() {
  const g = collectGlobals();
  const gbEl = document.getElementById("quick_daily_gb");
  if (!gbEl) return;
  if (g.total_daily_gb > 0) {
    gbEl.value = String(g.total_daily_gb);
  }
  syncQuickVolumePair("gb");
}

function readQuickDailyGB() {
  syncQuickVolumePair(null);
  return numOr0(document.getElementById("quick_daily_gb")?.value);
}

function applyVolumeDefaults(dailyGB) {
  const defaults = defaultsFromDailyGB(dailyGB);
  const current = collectGlobals();
  applyGlobals({
    ...current,
    ...defaults,
    // Keep paths / apps the user may already have set unless clustering toggles change.
    hot_path: current.hot_path || "/hot",
    cold_path: current.cold_path || "/cold",
    frozen_path: current.frozen_path || "/frozen",
    summaries_path: current.summaries_path || "/summaries",
    has_es: current.has_es,
    has_itsi: current.has_itsi,
    enable_dma: current.enable_dma,
    dma_pct: current.dma_pct,
    archive_frozen: current.archive_frozen,
    capacity_plan_mode: current.capacity_plan_mode || "time",
    summary_pct: current.summary_pct || 0.1,
    summary_retention_days: defaults.retention_days,
    compression: current.compression,
    remote_path: current.remote_path,
  });
  scaleDemoSourcesToTotal(state.rows, dailyGB);
  state.rows.forEach((r) => {
    if (numOr0(r.daily_gb) > 0) syncRowVolumePair(r, state.rows, "daily_gb");
  });
  renderRows();
  refreshTotalCounterpart();
  syncQuickFromGlobals();
  syncClusterFields();
  syncArchiveFields();
  syncCapacityPair("mode");
  syncToggleUI();
}

function renderQuickPreview(data, { applied }) {
  const out = document.getElementById("quick-estimate-out");
  if (!out) return;
  const d = data?.design || {};
  const res = data || {};
  const daily = Number(res.total_daily_raw_gb) || readQuickDailyGB();
  const nSh = d.auto_n_sh || d.n_sh || "—";
  const nIdx = d.combined_instance ? t("quick_combined") : d.auto_n_idx || d.n_idx || "—";
  const hot = d.hot_need_gb != null ? Math.round(d.hot_need_gb) : "—";
  const cold = d.cold_need_gb != null ? Math.round(d.cold_need_gb) : "—";
  const total =
    d.hot_need_gb != null || d.cold_need_gb != null
      ? Math.round((Number(d.hot_need_gb) || 0) + (Number(d.cold_need_gb) || 0) + (Number(d.summaries_need_gb) || 0))
      : "—";
  const appliedNote = applied ? t("quick_applied_note") : t("quick_estimate_only_note");
  out.hidden = false;
  out.innerHTML = `<p class="quick-estimate-title"><strong>${escapeAttr(t("quick_result_title"))}</strong></p>
    <ul class="quick-estimate-list">
      <li>${escapeAttr(t("quick_res_daily").replace("{n}", formatDailyGB(daily)).replace("{e}", formatEPS(epsFromDailyGB(daily, avgEventBytes()))))}</li>
      <li>${escapeAttr(t("quick_res_nodes").replace("{sh}", String(nSh)).replace("{idx}", String(nIdx)))}</li>
      <li>${escapeAttr(t("quick_res_disk").replace("{h}", String(hot)).replace("{c}", String(cold)).replace("{t}", String(total)))}</li>
    </ul>
    <p class="hint">${escapeAttr(appliedNote)}</p>`;
}

export async function runQuickEstimate() {
  const btn = document.getElementById("btn-quick-estimate");
  const out = document.getElementById("quick-estimate-out");
  const err = document.getElementById("err");
  const dailyGB = readQuickDailyGB();
  if (!(dailyGB > 0)) {
    if (out) {
      out.hidden = false;
      out.innerHTML = `<p class="hint">${escapeAttr(t("quick_need_volume"))}</p>`;
    }
    return;
  }

  const apply = !!document.getElementById("quick-apply-defaults")?.checked;
  btn?.classList.add("loading");
  if (err) err.hidden = true;
  try {
    if (apply) {
      applyVolumeDefaults(dailyGB);
      const data = await runPlan(buildPlanBody());
      updateAutoRecBadges(data.design);
      renderQuickPreview(data, { applied: true });
    } else {
      const data = await runPlan(buildPlanBody({ total_daily_gb: dailyGB }));
      renderQuickPreview(data, { applied: false });
    }
  } catch (ex) {
    if (out) {
      out.hidden = false;
      out.innerHTML = `<p class="hint">${escapeAttr(ex.message || String(ex))}</p>`;
    }
    if (err) {
      err.hidden = false;
      err.textContent = ex.message || String(ex);
    }
  } finally {
    btn?.classList.remove("loading");
  }
}

export function bindQuickStart() {
  const gbEl = document.getElementById("quick_daily_gb");
  const epsEl = document.getElementById("quick_daily_eps");
  if (gbEl && gbEl.dataset.quickBound !== "1") {
    gbEl.dataset.quickBound = "1";
    gbEl.addEventListener("input", () => syncQuickVolumePair("gb"));
    gbEl.addEventListener("change", () => syncQuickVolumePair("gb"));
  }
  if (epsEl && epsEl.dataset.quickBound !== "1") {
    epsEl.dataset.quickBound = "1";
    epsEl.addEventListener("input", () => syncQuickVolumePair("eps"));
    epsEl.addEventListener("change", () => syncQuickVolumePair("eps"));
  }
  const btn = document.getElementById("btn-quick-estimate");
  if (btn && btn.dataset.quickBound !== "1") {
    btn.dataset.quickBound = "1";
    btn.addEventListener("click", () => void runQuickEstimate());
  }
  syncQuickFromGlobals();
}
