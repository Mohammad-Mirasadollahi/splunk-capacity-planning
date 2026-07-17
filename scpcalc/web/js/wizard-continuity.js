import {
  dailyGBFromEPS,
  formatDailyGB,
  formatEPS,
  numOr0,
  resolveEventBytes,
  totalEPSFromDailyGB,
} from "./volume-convert.js";

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

  if (step >= 1) {
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

  if (step >= 2) {
    const ret = [
      t("ctx_retention").replace("{r}", String(g.retention_days)).replace("{hw}", String(g.hot_warm_days)),
      t("ctx_headroom").replace("{h}", String(g.headroom)),
    ];
    if (g.archive_frozen) ret.push(t("ctx_archive_on").replace("{p}", g.frozen_path || "/frozen"));
    if (g.total_daily_gb > 0) {
      ret.push(t("ctx_total_daily").replace("{n}", formatDailyGB(g.total_daily_gb)));
      const eps = totalEPSFromDailyGB(g.total_daily_gb, state.rows);
      if (eps > 0) ret.push(t("ctx_total_eps").replace("{n}", formatEPS(eps)));
    }
    if (g.available_hot_gb || g.available_cold_gb) {
      ret.push(
        t("ctx_disk")
          .replace("{h}", String(g.available_hot_gb || 0))
          .replace("{c}", String(g.available_cold_gb || 0))
      );
    }
    bits.push(`<strong>${t("ctx_from_retention")}</strong> ${ret.join(" · ")}`);
  }

  if (step >= 3) {
    const srcSum = estimateEnabledDailyGB(enabled, mode);
    const src = [
      t("ctx_vol_mode"),
      t("ctx_sources_on").replace("{n}", String(enabled.length)),
    ];
    if (srcSum > 0) src.push(t("ctx_sources_sum").replace("{n}", formatDailyGB(srcSum)));
    if (g.total_daily_gb > 0 && srcSum > 0) {
      src.push(t("ctx_scale_note").replace("{t}", formatDailyGB(g.total_daily_gb)));
    }
    bits.push(`<strong>${t("ctx_from_sources")}</strong> ${src.join(" · ")}`);
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
  document.querySelectorAll('#src-ret-body input[data-f="retention_days"]').forEach((el) => {
    el.placeholder = String(g.retention_days || 90);
    el.title = t("ctx_inherit_ret").replace("{n}", String(g.retention_days || 90));
  });
  document.querySelectorAll('#src-ret-body input[data-f="hot_warm_days"]').forEach((el) => {
    el.placeholder = String(g.hot_warm_days || 30);
    el.title = t("ctx_inherit_hw").replace("{n}", String(g.hot_warm_days || 30));
  });
}

export function refreshWizardContext(step = state.step, { remountSources = false } = {}) {
  const el = document.getElementById("wizard-context");
  if (!el) return;
  if (step <= 0) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  syncLinkedSummaryRetention();
  const html = buildContextHTML(step);
  el.innerHTML = html;
  el.hidden = !html;
  if (step >= 2) {
    if (remountSources) renderRows();
    applyInheritedSourcePlaceholders();
    refreshTotalCounterpart();
  }
  if (step === 3) {
    fillReview();
    // Live preview refresh while editing from context updates (debounced inside).
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
    if (name === "retention_days") syncLinkedSummaryRetention();
    if (state.step >= 1) refreshWizardContext(state.step);
  });
  form.addEventListener("input", (e) => {
    const name = e.target?.name || e.target?.dataset?.f;
    if (name === "summary_retention_days") markSummaryRetentionEdited();
    if (name === "retention_days") syncLinkedSummaryRetention();
    if (state.step >= 1) refreshWizardContext(state.step);
  });
}
