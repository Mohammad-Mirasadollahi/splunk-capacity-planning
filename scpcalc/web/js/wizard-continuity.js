import {
  dailyGBFromEPS,
  formatDailyGB,
  formatEPS,
  numOr0,
  resolveEventBytes,
  totalEPSFromDailyGB,
} from "./volume-convert.js";
import { state } from "./state.js";
import { t } from "./i18n.js";
import { collectGlobals, readVolumeInputMode, fillReview } from "./plan-form.js";
import { renderRows, refreshTotalCounterpart } from "./sources.js";
import { setSoftTip } from "./tips-ui.js";
import { syncQuickFromGlobals } from "./quick-start.js";

/** When true, summary_retention_days tracks retention_days. */
let summaryRetentionLinked = true;

export function markSummaryRetentionEdited() {
  summaryRetentionLinked = false;
}

export function estimateEnabledDailyGB(rows, _mode) {
  let sum = 0;
  for (const r of rows || []) {
    if (!r.enabled) continue;
    let daily = numOr0(r.daily_gb);
    if (!(daily > 0) && numOr0(r.eps) > 0) {
      daily = dailyGBFromEPS(r.eps, resolveEventBytes(r, rows));
    }
    sum += daily;
  }
  return sum;
}

function buildContextHTML(step) {
  const g = collectGlobals();
  const mode = readVolumeInputMode();
  const enabled = state.rows.filter((r) => r.enabled);
  const bits = [];

  // Step order v10+: 0=Overview, 1=Volume, 2=Cluster, 3=Review
  if (step >= 2) {
    const vol = [];
    if (g.total_daily_gb > 0) {
      vol.push(t("ctx_total_daily").replace("{n}", formatDailyGB(g.total_daily_gb)));
      const eps = totalEPSFromDailyGB(g.total_daily_gb, state.rows);
      if (eps > 0) vol.push(t("ctx_total_eps").replace("{n}", formatEPS(eps)));
    }
    vol.push(t("ctx_headroom").replace("{h}", String(g.headroom)));
    const coldDays = Math.max(0, (g.retention_days || 0) - (g.hot_warm_days || 0));
    vol.push(
      t("ctx_retention")
        .replace("{r}", String(g.retention_days))
        .replace("{hw}", String(g.hot_warm_days))
        .replace("{c}", String(coldDays))
    );
    const srcSum = estimateEnabledDailyGB(enabled, mode);
    vol.push(t("ctx_sources_on").replace("{n}", String(enabled.length)));
    if (srcSum > 0) vol.push(t("ctx_sources_sum").replace("{n}", formatDailyGB(srcSum)));
    if (g.available_hot_gb || g.available_cold_gb) {
      vol.push(
        t("ctx_disk")
          .replace("{h}", String(g.available_hot_gb || 0))
          .replace("{c}", String(g.available_cold_gb || 0))
      );
    }
    bits.push(`<strong>${t("ctx_from_sources")}</strong> ${vol.join(" · ")}`);
  }

  if (step >= 3) {
    const topo = [];
    topo.push(
      g.indexer_cluster
        ? t("ctx_idx_cluster_on").replace("{rf}", String(g.rf)).replace("{sf}", String(g.sf))
        : t("ctx_idx_cluster_off")
    );
    topo.push(
      g.search_head_cluster
        ? t("ctx_shc_on").replace("{u}", String(g.concurrent_users)).replace("{s}", String(g.concurrent_searches))
        : t("ctx_shc_off").replace("{u}", String(g.concurrent_users)).replace("{s}", String(g.concurrent_searches))
    );
    if (g.n_idx > 0) topo.push(t("ctx_n_idx").replace("{n}", String(g.n_idx)));
    if (g.n_sh > 0) topo.push(t("ctx_n_sh").replace("{n}", String(g.n_sh)));
    const apps = [];
    if (g.has_es) apps.push("ES");
    if (g.has_itsi) apps.push("ITSI");
    if (g.enable_dma) apps.push("DMA");
    if (g.smartstore) apps.push("SmartStore");
    if (apps.length) topo.push(apps.join(" · "));
    bits.push(`<strong>${t("ctx_from_topology")}</strong> ${topo.join(" · ")}`);
  }

  if (!bits.length) return "";
  return `<p class="wizard-context-title">${t("ctx_title")}</p><ul class="wizard-context-list">${bits
    .map((b) => `<li>${b}</li>`)
    .join("")}</ul>`;
}

export function syncLinkedSummaryRetention() {
  if (!summaryRetentionLinked) return;
  const ret = document.querySelector('input[name="retention_days"]');
  const sum = document.querySelector('input[name="summary_retention_days"]');
  if (ret && sum) sum.value = ret.value || sum.value;
}

export function applyInheritedSourcePlaceholders() {
  const g = collectGlobals();
  document.querySelectorAll('#src-body input[data-f="retention_days"]').forEach((el) => {
    el.placeholder = String(g.retention_days || 37);
    setSoftTip(el, t("ctx_inherit_ret").replace("{n}", String(g.retention_days || 37)));
  });
  document.querySelectorAll('#src-body input[data-f="hot_warm_days"]').forEach((el) => {
    el.placeholder = String(g.hot_warm_days || 7);
    setSoftTip(el, t("ctx_inherit_hw").replace("{n}", String(g.hot_warm_days || 7)));
  });
}

export function refreshWizardContext(step = state.step, { remountSources = false } = {}) {
  const el = document.getElementById("wizard-context");
  if (!el) return;
  if (step <= 1) {
    el.hidden = true;
    el.innerHTML = "";
    syncQuickFromGlobals();
    syncLinkedSummaryRetention();
    if (remountSources) renderRows();
    applyInheritedSourcePlaceholders();
    return;
  }
  syncLinkedSummaryRetention();
  const html = buildContextHTML(step);
  el.innerHTML = html;
  el.hidden = !html;
  if (remountSources) renderRows();
  applyInheritedSourcePlaceholders();
  refreshTotalCounterpart();
  if (step === 3) {
    fillReview();
    import("./review-panel.js")
      .then((m) => m.scheduleReviewPreview?.())
      .catch(() => {});
  }
}

export function bindWizardContinuity() {
  const form = document.getElementById("form");
  if (!form || form.dataset.continuityBound === "1") return;
  form.dataset.continuityBound = "1";

  form.addEventListener("change", (e) => {
    const name = e.target?.name || e.target?.dataset?.f;
    if (name === "summary_retention_days") markSummaryRetentionEdited();
    if (name === "retention_days" || name === "hot_warm_days" || name === "cold_days") {
      syncLinkedSummaryRetention();
      applyInheritedSourcePlaceholders();
    }
    if (name === "total_daily_gb") syncQuickFromGlobals();
    if (state.step >= 2) refreshWizardContext(state.step);
  });
  form.addEventListener("input", (e) => {
    const name = e.target?.name || e.target?.dataset?.f;
    if (name === "summary_retention_days") markSummaryRetentionEdited();
    if (name === "retention_days" || name === "hot_warm_days" || name === "cold_days") {
      syncLinkedSummaryRetention();
      applyInheritedSourcePlaceholders();
    }
    if (name === "total_daily_gb") syncQuickFromGlobals();
    if (state.step >= 2) refreshWizardContext(state.step);
  });
}
