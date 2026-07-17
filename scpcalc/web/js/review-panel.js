/**
 * Final wizard Review step: full summary + live plan preview (metrics + charts).
 */
import { state } from "./state.js";
import { t } from "./i18n.js";
import { escapeAttr } from "./util.js";
import {
  buildPlanBody,
  collectGlobals,
  fillReview,
  readVolumeInputMode,
} from "./plan-form.js";
import {
  dailyGBFromEPS,
  formatDailyGB,
  formatEPS,
  numOr0,
  resolveEPS,
  resolveEventBytes,
} from "./volume-convert.js";
import { runPlan } from "./engine.js";
import { renderAllCharts } from "./charts.js";

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

export function fillReviewSummary() {
  const host = document.getElementById("review-summary");
  if (!host) return;
  const g = collectGlobals();
  const mode = readVolumeInputMode();
  const enabled = state.rows.filter((r) => r.enabled);
  let srcSum = 0;
  const srcRows = enabled
    .map((r) => {
      let vol;
      if (mode === "eps") {
        const eps = resolveEPS(r, state.rows).eps;
        const gb = dailyGBFromEPS(eps, resolveEventBytes(r, state.rows));
        srcSum += gb;
        vol = `EPS ${formatEPS(eps)} (≈ ${formatDailyGB(gb)} GB/d)`;
      } else {
        const gb = numOr0(r.daily_gb);
        srcSum += gb;
        vol = `${formatDailyGB(gb)} GB/d`;
      }
      const ret = Number(r.retention_days) > 0 ? `${r.retention_days}d` : `${g.retention_days}d (global)`;
      const hw = Number(r.hot_warm_days) > 0 ? `${r.hot_warm_days}d` : `${g.hot_warm_days}d (global)`;
      return `<tr>
        <td>${escapeAttr(r.label)}</td>
        <td>${escapeAttr(r.index_name)}</td>
        <td>${escapeAttr(vol)}</td>
        <td>${r.event_bytes}</td>
        <td>${escapeAttr(ret)}</td>
        <td>${escapeAttr(hw)}</td>
        <td>${r.enable_summary ? "yes" : "—"}</td>
      </tr>`;
    })
    .join("");

  host.innerHTML = `
    <section class="review-block">
      <h4 data-i18n="ctx_from_topology">${t("ctx_from_topology")}</h4>
      <ul class="review-kv">
        <li><span>Indexer cluster</span><strong>${yn(g.indexer_cluster)} · RF=${g.rf} / SF=${g.sf} · n_idx=${g.n_idx || "auto"}</strong></li>
        <li><span>Search head cluster</span><strong>${yn(g.search_head_cluster)} · users=${g.concurrent_users} · searches=${g.concurrent_searches} · saved=${g.saved_searches} · n_sh=${g.n_sh || "auto"}</strong></li>
        <li><span>Apps</span><strong>ES=${yn(g.has_es)} · ITSI=${yn(g.has_itsi)} · DMA=${yn(g.enable_dma)} · SmartStore=${yn(g.smartstore)}</strong></li>
      </ul>
    </section>
    <section class="review-block">
      <h4 data-i18n="ctx_from_retention">${t("ctx_from_retention")}</h4>
      <ul class="review-kv">
        <li><span>Retention</span><strong>${g.retention_days}d searchable · ${g.hot_warm_days}d hot/warm · headroom ${g.headroom} · summary ${g.summary_retention_days}d</strong></li>
        <li><span>Archive</span><strong>${yn(g.archive_frozen)}${g.archive_frozen ? ` → ${escapeAttr(g.frozen_path)}` : ""}</strong></li>
        <li><span>Paths</span><strong>${escapeAttr(g.hot_path)} · ${escapeAttr(g.cold_path)} · ${escapeAttr(g.frozen_path)} · ${escapeAttr(g.summaries_path)}</strong></li>
        <li><span>Total / disk</span><strong>total=${g.total_daily_gb || "—"} GB/d · hot=${g.available_hot_gb || 0} · cold=${g.available_cold_gb || 0} · sum=${g.available_summaries_gb || 0}</strong></li>
      </ul>
    </section>
    <section class="review-block">
      <h4 data-i18n="ctx_from_sources">${t("ctx_from_sources")}</h4>
      <p class="hint">${t("ctx_vol_mode").replace("{m}", mode === "eps" ? "EPS" : "Daily GB")} · ${t("ctx_sources_on").replace("{n}", String(enabled.length))} · Σ ≈ ${formatDailyGB(srcSum)} GB/day${
        g.total_daily_gb > 0 ? ` · ${t("ctx_scale_note").replace("{t}", formatDailyGB(g.total_daily_gb))}` : ""
      }</p>
      <div class="table-wrap">
        <table class="src-table review-src-table">
          <thead>
            <tr>
              <th>${t("col_source")}</th>
              <th>${t("col_index")}</th>
              <th>${t("col_daily_gb")}</th>
              <th>${t("col_event_bytes")}</th>
              <th>${t("col_ret")}</th>
              <th>${t("col_hw")}</th>
              <th>${t("col_summary")}</th>
            </tr>
          </thead>
          <tbody>${srcRows || `<tr><td colspan="7">${t("review_no_sources")}</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
}

function renderPreviewMetrics(data) {
  const host = document.getElementById("review-metrics");
  if (!host) return;
  const d = data.design || {};
  const rows = [
    ["Total daily raw GB/day", data.total_daily_raw_gb],
    ["Compression factor", data.compression_factor],
    ["Total on-disk GB/day", data.total_daily_on_disk_gb],
    ["Total searchable TB", data.total_searchable_tb],
    ["Auto N_SH", d.auto_n_sh || d.n_sh],
    ["Auto N_IDX", d.auto_n_idx || d.n_idx],
    ["N_SH", d.n_sh],
    ["N_IDX", d.n_idx],
    ["hot need GB", d.hot_need_gb],
    ["cold need GB", d.cold_need_gb],
    ["summaries need GB", d.summaries_need_gb],
  ];
  if (d.cluster_manager) rows.push(["Cluster manager", 1]);
  if (d.shc_deployer) rows.push(["SHC deployer", 1]);
  if (d.max_daily_gb_from_disk) rows.push(["Max daily from disk", d.max_daily_gb_from_disk]);
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
          `<article class="metric-card warn"><span class="k">Warning</span><span class="v">${escapeAttr(w)}</span></article>`
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
    renderPreviewMetrics(data);
    renderAllCharts(data, { hostId: "review-charts", idPrefix: "review" });
    if (status) {
      status.textContent = t("review_preview_ready");
    }
    if (err) err.hidden = true;
  } catch (ex) {
    if (seq !== previewSeq) return;
    state.reviewPreview = null;
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
