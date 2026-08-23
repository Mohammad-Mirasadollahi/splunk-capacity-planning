import { state } from "./state.js";
import { t, setLang, lang } from "./i18n.js";
import { collectGlobals } from "./plan-form.js";
import { formatStorageAmt, resolveDmaNeedGB } from "./plan-display.js";
import { formatDiskGB, roundDiskGB } from "./retention-convert.js";

const chartInstances = {};
const chartTypes = {};
const CHART_TYPE_OPTS = ["bar", "pie", "doughnut", "line", "polarArea"];
const COLORS = ["#3fe0c5", "#5aa8ff", "#ffb48a", "#c4a7ff", "#7ddea3", "#f6d365", "#ff8fab", "#89c2d9"];

function chartLegendLabelColor() {
  if (typeof document === "undefined") return "#9eb8c4";
  return getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#9eb8c4";
}

function chartAxisTickColor() {
  if (typeof document === "undefined") return "#9eb8c4";
  return getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#9eb8c4";
}

const CHART_DEFS = [
  { id: "storage", titleKey: "chart_storage", defaultType: "doughnut" },
  { id: "retention", titleKey: "chart_retention", defaultType: "bar" },
  { id: "index_daily", titleKey: "chart_index_daily", defaultType: "bar" },
  { id: "index_search", titleKey: "chart_index_search", defaultType: "bar" },
  { id: "budget", titleKey: "chart_budget", defaultType: "bar" },
  { id: "resources", titleKey: "chart_resources", defaultType: "bar" },
];

/** A chart is only useful when it compares at least two meaningful values. */
function chartIsUseful(labels, values) {
  if (!labels?.length || !values?.length) return false;
  let meaningful = 0;
  for (let i = 0; i < labels.length; i++) {
    const v = Number(values[i]);
    if (Number.isFinite(v) && v > 0) meaningful += 1;
  }
  return meaningful >= 2;
}

/** Legend / tooltip label with formatted GB (or TB) amount. */
function chartSliceLabel(label, gb) {
  const base = String(label || "");
  const n = Number(gb);
  if (!Number.isFinite(n) || n <= 0) return base;
  return `${base} · ${formatStorageAmt(n)}`;
}

function chartDaysLabel(label, days) {
  const base = String(label || "");
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return base;
  return `${base} · ${Math.round(n)}d`;
}

function chartValueUnit(chartId) {
  if (chartId === "retention") return "days";
  if (chartId === "index_search") return "TB";
  if (chartId === "resources") return "GB";
  return "GB";
}

function formatChartTooltipValue(chartId, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  const unit = chartValueUnit(chartId);
  if (unit === "days") return `${Math.round(n)} days`;
  if (unit === "TB") return `${n.toFixed(2)} TB`;
  return formatStorageAmt(n);
}

function buildChartDatasets(data, rows = null) {
  const d = data.design || {};
  const indexes = data.indexes || [];
  const g = collectGlobals();
  const srcRows = rows ?? state.rows ?? null;
  const hotDays = g.hot_warm_days || 7;
  const ret = g.retention_days || 37;
  const coldDays = Math.max(ret - hotDays, 0);

  const hotGB = d.hot_need_gb || 0;
  const coldGB = d.cold_need_gb || 0;
  const sumGB = resolveDmaNeedGB(data, g, srcRows);
  const archGB = g.archive_frozen ? d.archive_need_gb || 0 : 0;
  const storageLabels = [
    chartSliceLabel(t("chart_lbl_hot"), hotGB),
    chartSliceLabel(t("chart_lbl_cold"), coldGB),
  ];
  const storageValues = [hotGB, coldGB];
  if (g.enable_dma) {
    storageLabels.push(chartSliceLabel(t("chart_lbl_summaries"), sumGB));
    storageValues.push(sumGB);
  }
  if (archGB > 0) {
    storageLabels.push(chartSliceLabel(t("chart_lbl_archive"), archGB));
    storageValues.push(archGB);
  }
  const searchableTotal = hotGB + coldGB + archGB;
  const storageTotal = storageValues.reduce((a, b) => a + b, 0);
  return {
    storage: {
      labels: storageLabels,
      values: storageValues,
      total: storageTotal,
      searchableTotal,
      dmaTotal: g.enable_dma ? sumGB : 0,
      totalKey: "chart_storage_total",
      totalKeyDma: "chart_storage_total_dma",
    },
    retention: {
      labels: [
        chartDaysLabel(t("chart_lbl_hot_days"), hotDays),
        chartDaysLabel(t("chart_lbl_cold_days"), coldDays),
        chartDaysLabel(t("chart_lbl_total_days"), ret),
      ],
      values: [hotDays, coldDays, ret],
      total: ret,
      totalKey: "chart_retention_total",
    },
    index_daily: {
      labels: indexes.map((ix) => chartSliceLabel(ix.index_name, ix.daily_raw_gb || 0)),
      values: indexes.map((ix) => ix.daily_raw_gb || 0),
    },
    index_search: {
      labels: indexes.map((ix) => {
        const tb = ix.searchable_tb || 0;
        const base = ix.index_name;
        if (!(tb > 0)) return base;
        return `${base} · ${tb.toFixed(2)} TB`;
      }),
      values: indexes.map((ix) => ix.searchable_tb || 0),
    },
    budget: (() => {
      const labels = [
        chartSliceLabel(`${t("chart_lbl_hot")} need`, d.hot_need_gb || 0),
        chartSliceLabel(`${t("chart_lbl_hot")} avail`, d.hot_available_gb || 0),
        chartSliceLabel(`${t("chart_lbl_cold")} need`, d.cold_need_gb || 0),
        chartSliceLabel(`${t("chart_lbl_cold")} avail`, d.cold_available_gb || 0),
      ];
      const values = [
        d.hot_need_gb || 0,
        d.hot_available_gb || 0,
        d.cold_need_gb || 0,
        d.cold_available_gb || 0,
      ];
      if (g.enable_dma) {
        const dmaGB = resolveDmaNeedGB(data, g, srcRows);
        const dmaAvail = d.summaries_available_gb || dmaGB || 0;
        labels.push(
          chartSliceLabel(t("chart_lbl_dma_need"), dmaGB),
          chartSliceLabel(t("chart_lbl_dma_avail"), dmaAvail)
        );
        values.push(dmaGB, dmaAvail);
      }
      return { labels, values };
    })(),
    resources: {
      labels: (d.resources || []).filter((r) => r.ram_gb > 0).map((r) => `${r.role}×${r.count}`),
      values: (d.resources || []).filter((r) => r.ram_gb > 0).map((r) => r.ram_gb * (r.count || 1)),
    },
  };
}

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function paintOne(canvasId, chartId, type, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  destroyChart(canvasId);
  if (!labels.length) return;
  const circular = type === "pie" || type === "doughnut" || type === "polarArea";
  const isLine = type === "line";
  const bg = labels.map((_, i) => COLORS[i % COLORS.length]);
  const legendColor = chartLegendLabelColor();
  const tickColor = chartAxisTickColor();
  chartInstances[canvasId] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: t(CHART_DEFS.find((c) => c.id === chartId)?.titleKey || chartId),
          data: values,
          backgroundColor: circular ? bg : bg.map((c) => c + "cc"),
          borderColor: isLine ? COLORS[0] : bg.map(() => "transparent"),
          borderWidth: isLine ? 2 : 0,
          hoverBorderWidth: 0,
          tension: 0.35,
          fill: isLine,
          pointRadius: isLine ? 3 : 0,
          pointHoverRadius: isLine ? 5 : 0,
          pointBackgroundColor: isLine ? bg : undefined,
          pointBorderColor: isLine ? bg.map(() => "transparent") : undefined,
          pointBorderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: circular,
          position: "bottom",
          align: "center",
          labels: {
            color: legendColor,
            boxWidth: 12,
            boxHeight: 12,
            padding: 10,
            font: { size: 11, family: "Segoe UI, system-ui, sans-serif" },
            usePointStyle: true,
            pointStyle: "circle",
            pointStyleWidth: 10,
            generateLabels(chart) {
              const data = chart.data;
              const ds = data.datasets?.[0];
              if (!ds || !data.labels?.length) return [];
              return data.labels.map((text, i) => {
                const fill = Array.isArray(ds.backgroundColor)
                  ? ds.backgroundColor[i]
                  : ds.backgroundColor;
                return {
                  text: String(text),
                  fillStyle: fill,
                  strokeStyle: fill,
                  fontColor: legendColor,
                  lineWidth: 0,
                  hidden: false,
                  index: i,
                  datasetIndex: 0,
                  pointStyle: "circle",
                };
              });
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const raw = context.parsed?.y ?? context.parsed ?? context.raw ?? 0;
              const val = formatChartTooltipValue(chartId, raw);
              const line = context.label ? `${context.label}: ${val}` : val;
              return line;
            },
          },
        },
      },
      scales: circular
        ? {}
        : {
            x: {
              ticks: { color: tickColor, maxRotation: 45, minRotation: 0, font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.06)" },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: { color: tickColor, font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.06)" },
              border: { display: false },
            },
          },
    },
  });
}

export function ensureChartCards(hostId = "charts-inline", idPrefix = "charts-inline") {
  const host = document.getElementById(hostId);
  if (!host) return;
  if (host.dataset.ready === "1" && host.dataset.prefix === idPrefix && host.querySelector("[data-chart-total]")) {
    return;
  }
  host.dataset.prefix = idPrefix;
  host.innerHTML =
    `<p class="charts-empty hint" id="${idPrefix}-empty" hidden data-i18n="charts_none">${t("charts_none")}</p>` +
    CHART_DEFS.map((def) => {
      const type = chartTypes[def.id] || def.defaultType;
      const opts = CHART_TYPE_OPTS.map(
        (o) => `<option value="${o}" ${o === type ? "selected" : ""}>${o}</option>`
      ).join("");
      const canvasId = `chart-${idPrefix}-${def.id}`;
      return `<article class="chart-card" data-chart="${def.id}">
          <div class="chart-card-head">
            <h4 data-i18n="${def.titleKey}">${t(def.titleKey)}</h4>
            <label class="chart-type-label">
              <span data-i18n="chart_type">${t("chart_type")}</span>
              <select data-chart-type="${def.id}" data-chart-host="${idPrefix}">${opts}</select>
            </label>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="${canvasId}"></canvas>
          </div>
          <p class="chart-total" data-chart-total="${def.id}" hidden></p>
        </article>`;
    }).join("");
  host.dataset.ready = "1";
  host.querySelectorAll("[data-chart-type]").forEach((sel) => {
    if (sel.dataset.bound === "1") return;
    sel.dataset.bound = "1";
    sel.addEventListener("change", () => {
      const id = sel.getAttribute("data-chart-type");
      chartTypes[id] = sel.value;
      if (state.lastPlan) {
        renderAllCharts(state.lastPlan, {
          hostId: "charts-inline",
          idPrefix: "charts-inline",
          rows: state.rows,
        });
        if (document.getElementById("results-charts")) {
          renderAllCharts(state.lastPlan, {
            hostId: "results-charts",
            idPrefix: "results",
            rows: state.rows,
          });
        }
      }
      if (state.reviewPreview) {
        renderAllCharts(state.reviewPreview, {
          hostId: "review-charts",
          idPrefix: "review",
          rows: state.rows,
        });
      }
    });
  });
}

/**
 * @param {object} data plan result
 * @param {{ hostId?: string, idPrefix?: string }} [opts]
 */
export function renderAllCharts(data, opts = {}) {
  if (!data) return;
  const hostId = opts.hostId || "charts-inline";
  const idPrefix = opts.idPrefix || "charts-inline";
  ensureChartCards(hostId, idPrefix);
  setLang(lang());
  const host = document.getElementById(hostId);
  const emptyEl = document.getElementById(`${idPrefix}-empty`);
  const g = collectGlobals();
  const packs = buildChartDatasets(data, opts.rows);
  let shown = 0;
  CHART_DEFS.forEach((def) => {
    const pack = packs[def.id] || { labels: [], values: [] };
    const canvasId = `chart-${idPrefix}-${def.id}`;
    const card = host?.querySelector(`[data-chart="${def.id}"]`);
    const useful = chartIsUseful(pack.labels, pack.values);
    if (card) card.hidden = !useful;
    if (!useful) {
      destroyChart(canvasId);
      return;
    }
    shown += 1;
    const type = chartTypes[def.id] || def.defaultType;
    chartTypes[def.id] = type;
    paintOne(canvasId, def.id, type, pack.labels, pack.values);
    const totalEl = card?.querySelector(`[data-chart-total="${def.id}"]`);
    if (totalEl) {
      const total = Number(pack.total);
      if (Number.isFinite(total) && total > 0 && pack.totalKey) {
        totalEl.hidden = false;
        const fmtTotal = formatDiskGB(roundDiskGB(total));
        if (
          def.id === "storage" &&
          g.enable_dma &&
          pack.totalKeyDma &&
          Number(pack.dmaTotal) > 0
        ) {
          totalEl.textContent = t(pack.totalKeyDma)
            .replace("{n}", fmtTotal)
            .replace("{searchable}", formatDiskGB(roundDiskGB(Number(pack.searchableTotal) || 0)))
            .replace("{dma}", formatDiskGB(roundDiskGB(Number(pack.dmaTotal) || 0)));
        } else {
          totalEl.textContent = t(pack.totalKey).replace("{n}", fmtTotal);
        }
      } else {
        totalEl.hidden = true;
        totalEl.textContent = "";
      }
    }
  });
  if (emptyEl) emptyEl.hidden = shown > 0;
}
