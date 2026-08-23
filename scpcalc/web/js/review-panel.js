/**
 * Final wizard Review step: full summary + live plan preview (metrics + charts).
 */
import { state } from "./state.js";
import { t, localizeFlow } from "./i18n.js";
import { escapeAttr } from "./util.js";
import {
  dailyGBFromEPS,
  formatDailyGB,
  formatEPS,
  numOr0,
  resolveEventBytes,
  epsFromDailyGB,
} from "./volume-convert.js";
import {
  buildPlanBody,
  collectGlobals,
  fillReview,
} from "./plan-form.js";
import { runPlan } from "./engine.js";
import { renderAllCharts } from "./charts.js";
import { planSourceDiskNeeds } from "./source-sizing.js";
import { formatDiskGB, roundDiskGB } from "./retention-convert.js";
import {
  buildMetricSections,
  renderMetricSectionsHTML,
  renderRetentionStorageHTML,
  renderIndexRowsHTML,
  indexesTableHeaderHTML,
  formatDmaNeedDisplay,
  resolveDmaNeedGB,
} from "./plan-display.js";

let previewSeq = 0;
let previewTimer = 0;

export function scheduleReviewPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    void loadReviewPreview();
  }, 280);
}

function yn(v) {
  return v ? t("ctx_on") : t("ctx_off");
}

/** Show Auto only when clustering is on and count is still unset; standalone always has an explicit count. */
function countOrAuto(n, clustered) {
  const v = Number(n);
  if (v > 0) return String(v);
  return clustered ? t("review_count_auto") : "1";
}

function kv(label, value) {
  return `<li><span>${escapeAttr(label)}</span><strong>${value}</strong></li>`;
}

function kvGroup(title) {
  return `<li class="review-kv-group"><span>${escapeAttr(title)}</span></li>`;
}

function budgetCap(gb) {
  return t("review_budget_cap_fmt").replace("{n}", String(gb || 0));
}

function formatReviewDmaVolume(g, gb) {
  if (!g.enable_dma) return "";
  if (!(numOr0(gb) > 0)) return t("dma_volume_need_ingest");
  return formatDmaNeedDisplay(gb, g);
}

function formatReviewIndexTotal({ idxGB, dmaGB, dailyGB, g }) {
  if (!(dailyGB > 0)) return t("review_idx_no_volume");
  const parts = [];
  if (idxGB > 0) parts.push(`${formatDiskGB(roundDiskGB(idxGB))} GB`);
  if (g.enable_dma && dmaGB > 0) parts.push(`${formatDiskGB(roundDiskGB(dmaGB))} GB DMA`);
  if (parts.length) return parts.join(" + ");
  return g.enable_dma ? t("dma_volume_need_ingest") : t("review_idx_size_pending");
}

function reviewSrcTotalColumnLabel(g) {
  const nIdx = Math.max(1, Math.floor(numOr0(g.n_idx) || 1));
  if (g.indexer_cluster && nIdx > 1) return t("review_src_total_per_idx");
  return t("review_src_total_cluster");
}

function reviewSrcTotalColumnHeader(g) {
  const label = reviewSrcTotalColumnLabel(g);
  return `<span class="tip-mark" data-tip="review_src_total">${escapeAttr(label)}</span>`;
}

function renderReviewViz(data) {
  const host = document.getElementById("review-viz");
  if (!host) return;
  host.hidden = false;
  const g = collectGlobals();
  host.innerHTML = renderRetentionStorageHTML(data, g, state.rows);
}

function clearReviewViz() {
  const host = document.getElementById("review-viz");
  if (!host) return;
  host.hidden = true;
  host.innerHTML = "";
}

export function fillReviewSummary() {
  const host = document.getElementById("review-summary");
  if (!host) return;
  const g = collectGlobals();
  const enabled = state.rows.filter((r) => r.enabled);
  const livePlan = planSourceDiskNeeds(state.rows, g);
  const sizedByRow = new Map(livePlan.rows.map((s) => [s.row, s]));
  const planIndexes = state.reviewPreview?.indexes || [];
  const byIndex = new Map(planIndexes.map((ix) => [String(ix.index_name || ""), ix]));
  const previewData = state.reviewPreview;
  const totalDma =
    resolveDmaNeedGB(previewData, g, state.rows) || (g.enable_dma ? livePlan.needSum : 0);
  let idxTotalGB = 0;
  let dmaTotalGB = 0;
  const archiveDays = g.archive_frozen ? Math.max(0, Math.floor(numOr0(g.archive_days))) : 0;
  let ingestSum = 0;
  for (const r of enabled) {
    const bytes = resolveEventBytes(r, state.rows);
    let gb = numOr0(r.daily_gb);
    const eps = numOr0(r.eps);
    if (!(gb > 0) && eps > 0) gb = dailyGBFromEPS(eps, bytes);
    ingestSum += gb;
  }
  const srcRows = enabled
    .map((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      let gb = numOr0(r.daily_gb);
      let eps = numOr0(r.eps);
      if (!(gb > 0) && eps > 0) gb = dailyGBFromEPS(eps, bytes);
      if (!(eps > 0) && gb > 0) eps = epsFromDailyGB(gb, bytes);
      const vol = `${formatDailyGB(gb)} GB/d = ${formatEPS(eps)} EPS`;
      const retDays =
        Number(r.retention_days) > 0
          ? Math.floor(Number(r.retention_days))
          : Math.max(0, Math.floor(numOr0(g.retention_days)));
      const ret =
        Number(r.retention_days) > 0
          ? t("review_days").replace("{n}", String(retDays))
          : t("review_days_global").replace("{n}", String(retDays));
      const hw =
        Number(r.hot_warm_days) > 0
          ? t("review_days").replace("{n}", String(r.hot_warm_days))
          : t("review_days_global").replace("{n}", String(g.hot_warm_days));
      const totalTimeDays = retDays + archiveDays;
      const totalTime = t("review_days").replace("{n}", String(totalTimeDays));
      const archiveTxt = g.archive_frozen
        ? t("review_days").replace("{n}", String(archiveDays))
        : yn(false);
      const ix = byIndex.get(String(r.index_name || ""));
      const sized = sizedByRow.get(r);
      const idxGB =
        ix?.max_total_data_size_mb > 0
          ? Number(ix.max_total_data_size_mb) / 1024
          : numOr0(sized?.maxTotalGB);
      const dmaGB =
        g.enable_dma && ingestSum > 0 && totalDma > 0
          ? (totalDma * gb) / ingestSum
          : g.enable_dma
            ? numOr0(sized?.dmaGB)
            : 0;
      if (idxGB > 0) idxTotalGB += idxGB;
      if (dmaGB > 0) dmaTotalGB += dmaGB;
      const idxTotal = formatReviewIndexTotal({ idxGB, dmaGB, dailyGB: gb, g });
      return `<tr>
        <td>${escapeAttr(r.label)}</td>
        <td>${escapeAttr(r.index_name)}</td>
        <td>${escapeAttr(vol)}</td>
        <td>${r.event_bytes}</td>
        <td>${escapeAttr(ret)}</td>
        <td>${escapeAttr(hw)}</td>
        <td>${escapeAttr(totalTime)}</td>
        <td>${escapeAttr(archiveTxt)}</td>
        <td class="review-src-idx-total">${escapeAttr(idxTotal)}</td>
      </tr>`;
    })
    .join("");

  const srcFooter =
    enabled.length > 0
      ? `<tr class="review-src-total">
          <th scope="row" colspan="8">${reviewSrcTotalColumnHeader(g)}</th>
          <td class="review-src-idx-total">${formatReviewIndexTotal({
            idxGB: idxTotalGB,
            dmaGB: dmaTotalGB,
            dailyGB: ingestSum,
            g,
          })}</td>
        </tr>`
      : "";

  const coldDays = Math.max(0, Number(g.retention_days) - Number(g.hot_warm_days));
  const archiveVal = g.archive_frozen
    ? `${yn(true)} · ${t("review_days").replace("{n}", String(g.archive_days || 0))} ${localizeFlow("→")} ${escapeAttr(g.frozen_path)}`
    : yn(false);
  const totalDaily =
    g.total_daily_gb > 0 ? `${formatDailyGB(g.total_daily_gb)} GB/day` : t("review_not_set");

  host.innerHTML = `
    <div class="review-summary-pair">
      <section class="review-block">
        <h4 data-i18n="ctx_from_topology">${t("ctx_from_topology")}</h4>
        <ul class="review-kv">
          ${kv(t("idx_cluster"), yn(g.indexer_cluster))}
          ${kv(t("lbl_rf"), String(g.rf))}
          ${kv(t("lbl_sf"), String(g.sf))}
          ${kv(t("lbl_n_idx"), countOrAuto(g.n_idx, g.indexer_cluster))}
          ${kv(t("shc"), yn(g.search_head_cluster))}
          ${kv(t("lbl_users"), String(g.concurrent_users))}
          ${kv(t("lbl_searches"), String(g.concurrent_searches))}
          ${kv(t("lbl_saved"), String(g.saved_searches))}
          ${kv(t("lbl_n_sh"), countOrAuto(g.n_sh, g.search_head_cluster))}
          ${kv(t("lbl_has_es"), yn(g.has_es))}
          ${kv(t("lbl_has_itsi"), yn(g.has_itsi))}
          ${kv(t("lbl_dma"), yn(g.enable_dma))}
          ${kv(t("lbl_smartstore"), yn(g.smartstore))}
        </ul>
      </section>
      <section class="review-block">
        <h4 data-i18n="ctx_from_retention">${t("ctx_from_retention")}</h4>
        <ul class="review-kv">
          ${kv(t("lbl_retention"), t("review_days").replace("{n}", String(g.retention_days)))}
          ${kv(t("lbl_hot_warm"), t("review_days").replace("{n}", String(g.hot_warm_days)))}
          ${kv(t("lbl_cold_days"), t("review_days").replace("{n}", String(coldDays)))}
          ${kv(t("lbl_archive_days"), g.archive_frozen ? t("review_days").replace("{n}", String(g.archive_days || 0)) : yn(false))}
          ${kv(t("lbl_headroom"), String(g.headroom))}
          ${kv(t("lbl_archive"), archiveVal)}
          ${kvGroup(t("review_paths_group"))}
          ${kv(t("lbl_hot_path"), escapeAttr(g.hot_path))}
          ${kv(t("lbl_cold_path"), escapeAttr(g.cold_path))}
          ${kv(t("lbl_frozen_path"), escapeAttr(g.frozen_path))}
          ${g.enable_dma ? kv(t("lbl_sum_path"), escapeAttr(g.summaries_path)) : ""}
          ${kv(t("lbl_total_daily"), totalDaily)}
          ${kvGroup(t("review_budget_group"))}
          ${kv(t("lbl_avail_hot"), budgetCap(g.available_hot_gb))}
          ${kv(t("lbl_avail_cold"), budgetCap(g.available_cold_gb))}
          ${g.enable_dma ? kv(t("lbl_dma_volume"), formatReviewDmaVolume(g, g.available_summaries_gb)) : ""}
          <li class="review-kv-note"><span>${escapeAttr(t("review_budget_note"))}</span></li>
        </ul>
      </section>
    </div>
    <section class="review-block">
      <h4 data-i18n="ctx_from_sources">${t("ctx_from_sources")}</h4>
      <p class="hint">${t("ctx_vol_mode")} · ${t("ctx_sources_on").replace("{n}", String(enabled.length))} · Σ ≈ ${formatDailyGB(ingestSum)} GB/day${
        g.total_daily_gb > 0 ? ` · ${t("ctx_scale_note").replace("{t}", formatDailyGB(g.total_daily_gb))}` : ""
      }</p>
      <div class="table-wrap">
        <table class="src-table review-src-table">
          <thead>
            <tr>
              <th>${t("col_source")}</th>
              <th>${t("col_index")}</th>
              <th>${t("col_vol_pair")}</th>
              <th>${t("col_event_bytes")}</th>
              <th>${t("col_ret")}</th>
              <th>${t("col_hw")}</th>
              <th>${t("col_total_time")}</th>
              <th>${t("col_archive")}</th>
              <th class="review-src-total-col">${reviewSrcTotalColumnHeader(g)}</th>
            </tr>
          </thead>
          <tbody>${srcRows || `<tr><td colspan="9">${t("review_no_sources")}</td></tr>`}</tbody>
          ${srcFooter ? `<tfoot>${srcFooter}</tfoot>` : ""}
        </table>
      </div>
    </section>`;
}

function renderPreviewMetrics(data) {
  const host = document.getElementById("review-metrics");
  if (!host) return;
  const g = collectGlobals();
  host.innerHTML = renderMetricSectionsHTML(buildMetricSections(data, g, state.rows));
}

function renderPreviewIndexes(data) {
  const host = document.getElementById("review-indexes");
  if (!host) return;
  const indexes = data?.indexes || [];
  if (!indexes.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const g = collectGlobals();
  host.hidden = false;
  host.innerHTML = `
    <h4 class="review-subhead">${t("ix_table_title")}</h4>
    <p class="hint">${t("review_indexes_hint")}</p>
    <div class="table-wrap">
      <table class="src-table review-src-table review-ix-table">
        <thead>${indexesTableHeaderHTML({ g })}</thead>
        <tbody>${renderIndexRowsHTML(indexes, { data, g })}</tbody>
      </table>
    </div>`;
}

export async function loadReviewPreview() {
  const status = document.getElementById("review-preview-status");
  const err = document.getElementById("err");
  fillReviewSummary();
  fillReview();
  const seq = ++previewSeq;
  if (status) {
    status.hidden = false;
    status.textContent = t("review_preview_loading");
  }
  try {
    const data = await runPlan(buildPlanBody());
    if (seq !== previewSeq) return;
    state.reviewPreview = data;
    fillReviewSummary();
    renderReviewViz(data);
    renderPreviewMetrics(data);
    renderPreviewIndexes(data);
    renderAllCharts(data, { hostId: "review-charts", idPrefix: "review", rows: state.rows });
    if (status) {
      status.textContent = t("review_preview_ready");
    }
    if (err) err.hidden = true;
  } catch (ex) {
    if (seq !== previewSeq) return;
    state.reviewPreview = null;
    clearReviewViz();
    const host = document.getElementById("review-metrics");
    if (host) host.innerHTML = "";
    const ix = document.getElementById("review-indexes");
    if (ix) { ix.hidden = true; ix.innerHTML = ""; }
    if (status) {
      status.textContent = t("review_preview_error");
    }
    if (err) {
      err.hidden = false;
      err.textContent = ex.message || String(ex);
    }
  }
}
