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
import { formatSizeGB, planSourceDiskNeeds } from "./source-sizing.js";

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

/** Format GB for Storage Required (matches sizing-tool style: 482.8 GB / 1.9 TB / 0.0). */
function formatStorageAmt(gb) {
  const n = Number(gb);
  if (!Number.isFinite(n) || n <= 0) return "0.0";
  if (n >= 1024) return `${(n / 1024).toFixed(1)} TB`;
  return `${n.toFixed(1)} GB`;
}

function retentionSegments(g) {
  const hot = Math.max(0, Math.floor(numOr0(g.hot_warm_days)));
  const ret = Math.max(0, Math.floor(numOr0(g.retention_days)));
  const cold = Math.max(0, ret - hot);
  const archived = g.archive_frozen ? Math.max(0, Math.floor(numOr0(g.archive_days))) : 0;
  const total = hot + cold + archived;
  return { hot, cold, archived, total: total || ret };
}

function renderReviewViz(data) {
  const host = document.getElementById("review-viz");
  if (!host) return;
  const g = collectGlobals();
  const seg = retentionSegments(g);
  const d = data?.design || {};
  const nIdx = Math.max(1, Math.floor(numOr0(d.n_idx) || numOr0(data?.indexer_peers) || 1));

  const hotAll = numOr0(d.hot_need_gb);
  const coldAll = numOr0(d.cold_need_gb);
  const archAll = g.archive_frozen ? numOr0(d.archive_need_gb) : 0;
  const totalAll = hotAll + coldAll + archAll;
  const hotPer = hotAll / nIdx;
  const coldPer = coldAll / nIdx;
  const archPer = archAll / nIdx;
  const totalPer = totalAll / nIdx;

  const pct = (days) => (seg.total > 0 ? (100 * days) / seg.total : 0);
  const hotPct = pct(seg.hot);
  const coldPct = pct(seg.cold);
  const archPct = pct(seg.archived);

  host.hidden = false;
  host.innerHTML = `
    <section class="review-retention" aria-label="${escapeAttr(t("review_retention_title"))}">
      <h4 data-i18n="review_retention_title">${t("review_retention_title")}</h4>
      <div class="retention-bar-row">
        <div class="retention-bar" role="img" aria-label="${escapeAttr(
          t("review_retention_total").replace("{n}", String(seg.total))
        )}">
          <span class="retention-seg retention-seg--hot" style="flex-grow:${seg.hot}" title="${escapeAttr(
            t("review_tier_hot")
          )}: ${seg.hot}d"></span>
          <span class="retention-seg retention-seg--cold" style="flex-grow:${seg.cold}" title="${escapeAttr(
            t("review_tier_cold")
          )}: ${seg.cold}d"></span>
          <span class="retention-seg retention-seg--archived" style="flex-grow:${Math.max(
            seg.archived,
            0
          )}" title="${escapeAttr(t("review_tier_archived"))}: ${seg.archived}d"></span>
        </div>
        <div class="retention-total">${t("review_retention_total").replace("{n}", String(seg.total))}</div>
      </div>
      <ul class="retention-legend">
        <li><i class="retention-swatch retention-swatch--hot" aria-hidden="true"></i><span>${t("review_tier_hot")}${
          hotPct > 0 ? ` · ${seg.hot}d` : ""
        }</span></li>
        <li><i class="retention-swatch retention-swatch--cold" aria-hidden="true"></i><span>${t("review_tier_cold")}${
          coldPct > 0 ? ` · ${seg.cold}d` : ""
        }</span></li>
        <li><i class="retention-swatch retention-swatch--archived" aria-hidden="true"></i><span>${t(
          "review_tier_archived"
        )}${archPct > 0 ? ` · ${seg.archived}d` : ""}</span></li>
      </ul>
    </section>
    <section class="review-storage" aria-label="${escapeAttr(t("review_storage_title"))}">
      <h4 data-i18n="review_storage_title">${t("review_storage_title")}</h4>
      <p class="hint review-storage-hint" data-i18n="review_storage_hint">${t("review_storage_hint")}</p>
      <div class="review-storage-table-wrap">
        <table class="review-storage-table">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">${t("review_per_indexer")}</th>
              <th scope="col">${t("review_all_indexers")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">${t("review_tier_hot")}</th>
              <td>${formatStorageAmt(hotPer)}</td>
              <td>${formatStorageAmt(hotAll)}</td>
            </tr>
            <tr>
              <th scope="row">${t("review_tier_cold")}</th>
              <td>${formatStorageAmt(coldPer)}</td>
              <td>${formatStorageAmt(coldAll)}</td>
            </tr>
            <tr>
              <th scope="row">${t("review_tier_archived")}</th>
              <td>${formatStorageAmt(archPer)}</td>
              <td>${formatStorageAmt(archAll)}</td>
            </tr>
            <tr class="review-storage-total">
              <th scope="row">${t("review_total")}</th>
              <td>${formatStorageAmt(totalPer)}</td>
              <td>${formatStorageAmt(totalAll)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>`;
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
  const sizedPlan = planSourceDiskNeeds(state.rows, g);
  const sizedByRow = new Map(sizedPlan.rows.map((s) => [s.row, s]));
  let srcSum = 0;
  let idxTotalGB = 0;
  const archiveDays = g.archive_frozen ? Math.max(0, Math.floor(numOr0(g.archive_days))) : 0;
  const srcRows = enabled
    .map((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      let gb = numOr0(r.daily_gb);
      let eps = numOr0(r.eps);
      if (!(gb > 0) && eps > 0) gb = dailyGBFromEPS(eps, bytes);
      if (!(eps > 0) && gb > 0) eps = epsFromDailyGB(gb, bytes);
      srcSum += gb;
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
      const sized = sizedByRow.get(r);
      const idxGB = sized?.maxTotalGB > 0 ? sized.maxTotalGB : 0;
      if (idxGB > 0) idxTotalGB += idxGB;
      const idxTotal =
        idxGB > 0 ? `${formatSizeGB(idxGB)} GB` : "—";
      return `<tr>
        <td>${escapeAttr(r.label)}</td>
        <td>${escapeAttr(r.index_name)}</td>
        <td>${escapeAttr(vol)}</td>
        <td>${r.event_bytes}</td>
        <td>${escapeAttr(ret)}</td>
        <td>${escapeAttr(hw)}</td>
        <td>${escapeAttr(totalTime)}</td>
        <td>${escapeAttr(archiveTxt)}</td>
        <td>${r.enable_summary ? yn(true) : "—"}</td>
        <td class="review-src-idx-total">${escapeAttr(idxTotal)}</td>
      </tr>`;
    })
    .join("");

  const srcFooter =
    enabled.length > 0
      ? `<tr class="review-src-total">
          <th scope="row" colspan="9">${escapeAttr(t("review_total"))}</th>
          <td class="review-src-idx-total">${
            idxTotalGB > 0 ? `${formatSizeGB(idxTotalGB)} GB` : "—"
          }</td>
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
          ${kv(t("lbl_summary_ret"), t("review_days").replace("{n}", String(g.summary_retention_days)))}
          ${kv(t("lbl_archive"), archiveVal)}
          ${kv(t("lbl_hot_path"), escapeAttr(g.hot_path))}
          ${kv(t("lbl_cold_path"), escapeAttr(g.cold_path))}
          ${kv(t("lbl_frozen_path"), escapeAttr(g.frozen_path))}
          ${kv(t("lbl_sum_path"), escapeAttr(g.summaries_path))}
          ${kv(t("lbl_total_daily"), totalDaily)}
          ${kv(t("lbl_avail_hot"), `${g.available_hot_gb || 0} GB`)}
          ${kv(t("lbl_avail_cold"), `${g.available_cold_gb || 0} GB`)}
          ${kv(t("lbl_avail_sum"), `${g.available_summaries_gb || 0} GB`)}
        </ul>
      </section>
    </div>
    <section class="review-block">
      <h4 data-i18n="ctx_from_sources">${t("ctx_from_sources")}</h4>
      <p class="hint">${t("ctx_vol_mode")} · ${t("ctx_sources_on").replace("{n}", String(enabled.length))} · Σ ≈ ${formatDailyGB(srcSum)} GB/day${
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
              <th>${t("col_summary")}</th>
              <th title="${escapeAttr(t("ix_tip_max_total"))}">${t("review_total")}</th>
            </tr>
          </thead>
          <tbody>${srcRows || `<tr><td colspan="10">${t("review_no_sources")}</td></tr>`}</tbody>
          ${srcFooter ? `<tfoot>${srcFooter}</tfoot>` : ""}
        </table>
      </div>
    </section>`;
}

function renderPreviewMetrics(data) {
  const host = document.getElementById("review-metrics");
  if (!host) return;
  const g = collectGlobals();
  const d = data.design || {};
  const nIdx = Math.max(1, Math.floor(numOr0(d.n_idx) || numOr0(data?.indexer_peers) || 1));
  const hotAll = numOr0(d.hot_need_gb);
  const coldAll = numOr0(d.cold_need_gb);
  const archAll = g.archive_frozen ? numOr0(d.archive_need_gb) : 0;
  const rows = [
    [t("review_m_daily_raw"), data.total_daily_raw_gb],
    [t("review_m_compression"), data.compression_factor],
    [t("review_m_daily_ondisk"), data.total_daily_on_disk_gb],
    [t("review_m_searchable_tb"), data.total_searchable_tb],
    [t("review_m_auto_sh"), d.auto_n_sh || d.n_sh],
    [t("review_m_auto_idx"), d.auto_n_idx || d.n_idx],
    [t("lbl_n_sh"), d.n_sh],
    [t("lbl_n_idx"), nIdx],
    [t("lbl_need_hot"), formatStorageAmt(hotAll)],
    [t("lbl_need_cold"), formatStorageAmt(coldAll)],
  ];
  if (g.archive_frozen) {
    rows.push([t("review_m_need_archive"), formatStorageAmt(archAll)]);
  }
  rows.push(
    [t("review_m_need_sum"), d.summaries_need_gb != null ? formatStorageAmt(d.summaries_need_gb) : "—"],
    [t("review_m_hot_per_idx"), formatStorageAmt(hotAll / nIdx)],
    [t("review_m_cold_per_idx"), formatStorageAmt(coldAll / nIdx)],
    [t("review_m_archive_per_idx"), g.archive_frozen ? formatStorageAmt(archAll / nIdx) : "—"]
  );
  if (d.cluster_manager) rows.push([t("review_m_cm"), 1]);
  if (d.shc_deployer) rows.push([t("review_m_deployer"), 1]);
  if (d.max_daily_gb_from_disk) rows.push([t("review_m_max_daily_disk"), d.max_daily_gb_from_disk]);
  host.innerHTML = rows
    .map(
      ([k, v]) =>
        `<article class="metric-card"><span class="k">${escapeAttr(k)}</span><span class="v">${v ?? "—"}</span></article>`
    )
    .join("");
  if (data.warnings?.length) {
    host.innerHTML += data.warnings
      .map(
        (w) =>
          `<article class="metric-card warn"><span class="k">${escapeAttr(t("review_m_warning"))}</span><span class="v">${escapeAttr(w)}</span></article>`
      )
      .join("");
  }
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
    renderReviewViz(data);
    renderPreviewMetrics(data);
    renderAllCharts(data, { hostId: "review-charts", idPrefix: "review" });
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
    if (status) {
      status.textContent = t("review_preview_error");
    }
    if (err) {
      err.hidden = false;
      err.textContent = ex.message || String(ex);
    }
  }
}
