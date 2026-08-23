/**
 * Shared plan display — Preview metrics / Retention+Storage / indexes table.
 * Used by Review wizard and Results Overview so values stay identical.
 */
import { t } from "./i18n.js";
import { escapeAttr } from "./util.js";
import { numOr0 } from "./volume-convert.js";

export function formatStorageAmt(gb) {
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

/** Hot + cold + archive (+ DMA) → Total Storage. */
export function totalStorageGB(data, g) {
  const d = data?.design || {};
  const hot = numOr0(d.hot_need_gb);
  const cold = numOr0(d.cold_need_gb);
  const arch = g?.archive_frozen ? numOr0(d.archive_need_gb) : 0;
  const dma = numOr0(d.dma_need_gb);
  return hot + cold + arch + dma;
}

/**
 * @returns {{ id: string, title: string, rows: [string, unknown][] }[]}
 */
export function buildMetricSections(data, g) {
  const globals = g || {};
  const d = data?.design || {};
  const nIdx = Math.max(1, Math.floor(numOr0(d.n_idx) || numOr0(data?.indexer_peers) || 1));
  const hotAll = numOr0(d.hot_need_gb);
  const coldAll = numOr0(d.cold_need_gb);
  const archAll = globals.archive_frozen ? numOr0(d.archive_need_gb) : 0;
  const dmaAll = numOr0(d.dma_need_gb);
  const totalStore = hotAll + coldAll + archAll + dmaAll;

  const volume = {
    id: "volume",
    title: t("metric_sec_volume"),
    rows: [
      [t("review_m_daily_raw"), data.total_daily_raw_gb],
      [t("review_m_compression"), data.compression_factor],
      [t("review_m_daily_ondisk"), data.total_daily_on_disk_gb],
      [t("review_m_searchable_tb"), data.total_searchable_tb],
      [t("review_m_total_storage"), formatStorageAmt(totalStore)],
    ],
  };

  const topology = {
    id: "topology",
    title: t("metric_sec_topology"),
    rows: [
      [t("review_m_auto_sh"), d.auto_n_sh || d.n_sh],
      [t("review_m_auto_idx"), d.auto_n_idx || d.n_idx],
      [t("review_m_n_sh_total"), d.n_sh],
      [t("review_m_n_idx_total"), nIdx],
    ],
  };
  if (d.base_n_sh || d.base_n_idx) {
    topology.rows.push([
      t("review_m_table_baseline"),
      d.combined_instance && d.base_n_sh === 1 && d.base_n_idx === 1
        ? t("review_combined")
        : `${d.base_n_sh || "—"} + ${d.base_n_idx || "—"}`,
    ]);
  }
  if (d.cluster_manager) topology.rows.push([t("review_m_cm"), 1]);
  if (d.shc_deployer) topology.rows.push([t("review_m_deployer"), 1]);
  if (d.concurrent_users != null) topology.rows.unshift([t("lbl_users"), d.concurrent_users]);
  if (d.concurrent_searches != null) topology.rows.splice(1, 0, [t("lbl_searches"), d.concurrent_searches]);
  if (d.saved_searches != null) topology.rows.splice(2, 0, [t("lbl_saved"), d.saved_searches]);

  const storageTotal = {
    id: "storage-total",
    title: t("metric_sec_storage_total"),
    rows: [
      [t("review_m_need_hot_total"), formatStorageAmt(hotAll)],
      [t("review_m_need_cold_total"), formatStorageAmt(coldAll)],
    ],
  };
  if (globals.archive_frozen) {
    storageTotal.rows.push([t("review_m_need_archive_total"), formatStorageAmt(archAll)]);
  }
  if (dmaAll > 0) {
    storageTotal.rows.push([t("review_m_need_dma_total"), formatStorageAmt(dmaAll)]);
  }
  storageTotal.rows.push([t("review_m_total_storage"), formatStorageAmt(totalStore)]);

  const storagePer = {
    id: "storage-per",
    title: t("metric_sec_storage_per"),
    rows: [
      [t("review_m_hot_per_idx"), formatStorageAmt(hotAll / nIdx)],
      [t("review_m_cold_per_idx"), formatStorageAmt(coldAll / nIdx)],
      [t("review_m_archive_per_idx"), globals.archive_frozen ? formatStorageAmt(archAll / nIdx) : "—"],
    ],
  };

  const other = {
    id: "other",
    title: t("metric_sec_other"),
    rows: [],
  };
  if (d.max_daily_gb_from_disk) other.rows.push([t("review_m_max_daily_disk"), d.max_daily_gb_from_disk]);
  if (d.local_cache_total_gb) other.rows.push([t("review_m_smartstore_cache"), d.local_cache_total_gb]);
  if (d.node_plan_text) other.rows.push([t("review_m_node_plan"), d.node_plan_text]);

  const sections = [volume, topology, storageTotal, storagePer];
  if (other.rows.length) sections.push(other);
  if (data.warnings?.length) {
    sections.push({
      id: "warnings",
      title: t("metric_sec_warnings"),
      rows: data.warnings.map((w) => [t("review_m_warning"), w]),
      warn: true,
    });
  }
  return sections;
}

export function renderMetricSectionsHTML(sections, { tipLookup = null, animate = false } = {}) {
  return sections
    .map((sec) => {
      const cards = (sec.rows || [])
        .map(([k, v], i) => {
          const tipKey = tipLookup && tipLookup[k] ? k : "";
          const label = tipKey
            ? `<span class="tip-mark k" data-tip="${escapeAttr(tipKey)}">${escapeAttr(k)}</span>`
            : `<span class="k">${escapeAttr(k)}</span>`;
          const isPre = typeof v === "string" && String(v).includes("\n");
          const val = isPre
            ? `<pre class="metric-pre">${escapeAttr(String(v))}</pre>`
            : `<span class="v">${v ?? "—"}</span>`;
          const delay = animate ? ` style="animation-delay:${i * 35}ms"` : "";
          const wide = isPre ? " wide" : "";
          const warn = sec.warn ? " warn" : "";
          return `<article class="metric-card${wide}${warn}"${delay}>${label}${val}</article>`;
        })
        .join("");
      return `<section class="metric-section" data-metric-sec="${escapeAttr(sec.id)}">
        <h5 class="metric-section-title">${escapeAttr(sec.title)}</h5>
        <div class="metrics metric-section-grid">${cards}</div>
      </section>`;
    })
    .join("");
}

export function renderRetentionStorageHTML(data, g) {
  const globals = g || {};
  const seg = retentionSegments(globals);
  const d = data?.design || {};
  const nIdx = Math.max(1, Math.floor(numOr0(d.n_idx) || numOr0(data?.indexer_peers) || 1));
  const hotAll = numOr0(d.hot_need_gb);
  const coldAll = numOr0(d.cold_need_gb);
  const archAll = globals.archive_frozen ? numOr0(d.archive_need_gb) : 0;
  const totalAll = hotAll + coldAll + archAll;
  const hotPer = hotAll / nIdx;
  const coldPer = coldAll / nIdx;
  const archPer = archAll / nIdx;
  const totalPer = totalAll / nIdx;
  const pct = (days) => (seg.total > 0 ? (100 * days) / seg.total : 0);

  return `
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
          pct(seg.hot) > 0 ? ` · ${seg.hot}d` : ""
        }</span></li>
        <li><i class="retention-swatch retention-swatch--cold" aria-hidden="true"></i><span>${t("review_tier_cold")}${
          pct(seg.cold) > 0 ? ` · ${seg.cold}d` : ""
        }</span></li>
        <li><i class="retention-swatch retention-swatch--archived" aria-hidden="true"></i><span>${t(
          "review_tier_archived"
        )}${pct(seg.archived) > 0 ? ` · ${seg.archived}d` : ""}</span></li>
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

export function indexColdMB(ix) {
  if (ix.cold_path_max_data_size_mb != null) return ix.cold_path_max_data_size_mb;
  return Math.max(0, Number(ix.max_total_data_size_mb || 0) - Number(ix.home_path_max_data_size_mb || 0));
}

/** Same row HTML for Review preview Per-index and Results Per index. */
export function renderIndexRowsHTML(indexes) {
  return (indexes || [])
    .map((ix) => {
      const frozenDays =
        ix.frozen_time_period_in_secs != null
          ? Math.round(Number(ix.frozen_time_period_in_secs) / 86400)
          : "—";
      const label = ix.label || ix.key || "—";
      const coldMB = indexColdMB(ix);
      const find = [
        ix.index_name,
        label,
        ix.event_bytes,
        ix.daily_raw_gb,
        ix.daily_on_disk_gb,
        ix.searchable_tb,
        ix.max_total_data_size_mb,
        ix.home_path_max_data_size_mb,
        coldMB,
        ix.max_data_size,
        frozenDays,
      ]
        .filter((x) => x != null && x !== "")
        .join(" ");
      return `<tr data-find="${escapeAttr(find)}">
          <td data-sort="${escapeAttr(String(ix.index_name || ""))}">${escapeAttr(ix.index_name)}</td>
          <td data-sort="${escapeAttr(String(label))}">${escapeAttr(label)}</td>
          <td data-sort="${Number(ix.event_bytes) || 0}">${ix.event_bytes ?? "—"} <span class="unit">B</span></td>
          <td data-sort="${Number(ix.daily_raw_gb) || 0}">${ix.daily_raw_gb} <span class="unit">GB/d</span></td>
          <td data-sort="${Number(ix.daily_on_disk_gb) || 0}">${ix.daily_on_disk_gb} <span class="unit">GB/d</span></td>
          <td data-sort="${Number(ix.searchable_tb) || 0}">${ix.searchable_tb} <span class="unit">TB</span></td>
          <td data-sort="${Number(ix.max_total_data_size_mb) || 0}">${ix.max_total_data_size_mb} <span class="unit">MB</span></td>
          <td data-sort="${Number(ix.home_path_max_data_size_mb) || 0}">${ix.home_path_max_data_size_mb} <span class="unit">MB</span></td>
          <td data-sort="${Number(coldMB) || 0}">${coldMB} <span class="unit">MB</span></td>
          <td data-sort="${escapeAttr(String(ix.max_data_size || ""))}">${escapeAttr(ix.max_data_size || "—")}</td>
          <td data-sort="${frozenDays === "—" ? -1 : Number(frozenDays) || 0}">${frozenDays}${
            frozenDays === "—" ? "" : ` <span class="unit">d</span>`
          }</td>
        </tr>`;
    })
    .join("");
}

export function indexesTableHeaderHTML() {
  return `<tr>
    <th data-i18n="ix_index">${t("ix_index")}</th>
    <th data-i18n="ix_label">${t("ix_label")}</th>
    <th data-i18n="ix_event_bytes">${t("ix_event_bytes")}</th>
    <th data-i18n="ix_daily_raw">${t("ix_daily_raw")}</th>
    <th data-i18n="ix_on_disk">${t("ix_on_disk")}</th>
    <th data-i18n="ix_searchable">${t("ix_searchable")}</th>
    <th data-i18n="ix_max_total">${t("ix_max_total")}</th>
    <th data-i18n="ix_home">${t("ix_home")}</th>
    <th data-i18n="ix_cold">${t("ix_cold")}</th>
    <th data-i18n="ix_max_data">${t("ix_max_data")}</th>
    <th data-i18n="ix_frozen_days">${t("ix_frozen_days")}</th>
  </tr>`;
}
