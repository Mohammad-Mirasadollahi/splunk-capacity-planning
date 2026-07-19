/**
 * Wizard Quick Start: volume drivers (GB/EPS, avg event size, headroom) →
 * estimate, optional Apply defaults. Fields are the real form inputs (no duplicates).
 */
import { state } from "./state.js";
import { t } from "./i18n.js";
import { escapeAttr } from "./util.js";
import {
  epsFromDailyGB,
  formatDailyGB,
  formatEPS,
  numOr0,
} from "./volume-convert.js";
import {
  DEMO_AVG_EVENT_BYTES,
  DEMO_HEADROOM,
  applyAvgEventBytesToSources,
  defaultsFromDailyGB,
  scaleDemoSourcesToTotal,
} from "./defaults.js";
import {
  applyGlobals,
  buildPlanBody,
  collectGlobals,
  syncArchiveFields,
  syncCapacityPair,
  syncClusterFields,
  syncToggleUI,
} from "./plan-form.js";
import { renderRows, refreshTotalCounterpart, syncRowVolumePair, syncTotalVolumePair } from "./sources.js";
import { runPlan } from "./engine.js";
import { updateAutoRecBadges } from "./suggestions.js";

export function readAvgEventBytes() {
  const n = numOr0(document.getElementById("avg_event_bytes")?.value);
  return n > 0 ? Math.round(n) : DEMO_AVG_EVENT_BYTES;
}

export function readQuickHeadroom() {
  const n = Number(document.getElementById("headroom")?.value);
  return Number.isFinite(n) && n >= 1 ? n : DEMO_HEADROOM;
}

function readQuickDailyGB() {
  syncTotalVolumePair(null);
  return numOr0(document.getElementById("total_daily_gb")?.value);
}

/** Keep avg-event field in sync with enabled sources when opening / after Apply. */
export function syncQuickFromGlobals() {
  const bytesEl = document.getElementById("avg_event_bytes");
  if (!bytesEl) return;
  const enabled = (state.rows || []).filter((r) => r.enabled && numOr0(r.event_bytes) > 0);
  if (enabled.length && !(numOr0(bytesEl.value) > 0)) {
    const avg = enabled.reduce((s, r) => s + numOr0(r.event_bytes), 0) / enabled.length;
    bytesEl.value = String(Math.round(avg));
  } else if (!(numOr0(bytesEl.value) > 0)) {
    bytesEl.value = String(DEMO_AVG_EVENT_BYTES);
  }
  syncTotalVolumePair("gb");
}

function applyVolumeDefaults(dailyGB) {
  const headroom = readQuickHeadroom();
  const eventBytes = readAvgEventBytes();
  const defaults = defaultsFromDailyGB(dailyGB, { headroom });
  const current = collectGlobals();
  applyGlobals({
    ...current,
    ...defaults,
    headroom, // user Quick Start margin wins
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
  scaleDemoSourcesToTotal(state.rows, dailyGB, { eventBytes });
  applyAvgEventBytesToSources(state.rows, eventBytes, { enabledOnly: true });
  state.rows.forEach((r) => {
    if (numOr0(r.daily_gb) > 0) syncRowVolumePair(r, state.rows, "daily_gb");
  });
  renderRows();
  refreshTotalCounterpart();
  const bytesEl = document.getElementById("avg_event_bytes");
  if (bytesEl) bytesEl.value = String(eventBytes);
  syncQuickFromGlobals();
  syncClusterFields();
  syncArchiveFields();
  syncCapacityPair("mode");
  syncToggleUI();
}

/** Estimate body: use Quick Start drivers without necessarily mutating sources. */
function buildEstimateBody(dailyGB, { applyEventBytesToSources }) {
  const headroom = readQuickHeadroom();
  const eventBytes = readAvgEventBytes();
  const body = buildPlanBody({ total_daily_gb: dailyGB, headroom });
  if (applyEventBytesToSources) {
    body.sources = (body.sources || []).map((s) => ({ ...s, event_bytes: eventBytes }));
  } else if (!(body.sources || []).length) {
    // Engine synthesizes from total; event size still matters for EPS display only.
  } else {
    body.sources = (body.sources || []).map((s) => ({
      ...s,
      event_bytes: eventBytes > 0 ? eventBytes : s.event_bytes || DEMO_AVG_EVENT_BYTES,
    }));
  }
  return body;
}

function renderQuickPreview(data, { applied }) {
  const out = document.getElementById("quick-estimate-out");
  if (!out) return;
  const d = data?.design || {};
  const res = data || {};
  const daily = Number(res.total_daily_raw_gb) || readQuickDailyGB();
  const bytes = readAvgEventBytes();
  const headroom = readQuickHeadroom();
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
      <li>${escapeAttr(
        t("quick_res_daily")
          .replace("{n}", formatDailyGB(daily))
          .replace("{e}", formatEPS(epsFromDailyGB(daily, bytes)))
      )}</li>
      <li>${escapeAttr(t("quick_res_drivers").replace("{b}", String(bytes)).replace("{h}", String(headroom)))}</li>
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
      const data = await runPlan(buildEstimateBody(dailyGB, { applyEventBytesToSources: false }));
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
  const bytesEl = document.getElementById("avg_event_bytes");
  if (bytesEl && bytesEl.dataset.quickBound !== "1") {
    bytesEl.dataset.quickBound = "1";
    const onBytes = () => {
      // Recalculate EPS↔GB with the new average event size (totals stay the single source of truth).
      const active = document.activeElement;
      const prefer = active?.id === "total_daily_eps" ? "eps" : "gb";
      syncTotalVolumePair(prefer);
    };
    bytesEl.addEventListener("input", onBytes);
    bytesEl.addEventListener("change", onBytes);
  }
  const btn = document.getElementById("btn-quick-estimate");
  if (btn && btn.dataset.quickBound !== "1") {
    btn.dataset.quickBound = "1";
    btn.addEventListener("click", () => void runQuickEstimate());
  }
  syncQuickFromGlobals();
}
