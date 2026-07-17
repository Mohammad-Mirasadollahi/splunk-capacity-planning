import { state } from "./state.js";
import { t, setLang, lang } from "./i18n.js";
import { collectGlobals } from "./plan-form.js";

const chartInstances = {};
const chartTypes = {};
const CHART_TYPE_OPTS = ["bar", "pie", "doughnut", "line", "polarArea"];
const COLORS = ["#3fe0c5", "#5aa8ff", "#ffb48a", "#c4a7ff", "#7ddea3", "#f6d365", "#ff8fab", "#89c2d9"];

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

function buildChartDatasets(data) {
  const d = data.design || {};
  const indexes = data.indexes || [];
  const g = collectGlobals();
  const hotDays = g.hot_warm_days || 30;
  const ret = g.retention_days || 90;
  const coldDays = Math.max(ret - hotDays, 0);

  const hotGB = d.hot_need_gb || 0;
  const coldGB = d.cold_need_gb || 0;
  const sumGB = d.summaries_need_gb || 0;
  return {
    storage: {
      labels: [t("chart_lbl_hot"), t("chart_lbl_cold"), t("chart_lbl_summaries")],
      values: [hotGB, coldGB, sumGB],
      total: hotGB + coldGB + sumGB,
      totalKey: "chart_storage_total",
    },
    retention: {
      labels: [t("chart_lbl_hot_days"), t("chart_lbl_cold_days"), t("chart_lbl_total_days")],
      values: [hotDays, coldDays, ret],
      total: ret,
      totalKey: "chart_retention_total",
    },
    index_daily: {
      labels: indexes.map((ix) => ix.index_name),
      values: indexes.map((ix) => ix.daily_raw_gb || 0),
    },
    index_search: {
      labels: indexes.map((ix) => ix.index_name),
      values: indexes.map((ix) => ix.searchable_tb || 0),
    },
    budget: {
      labels: ["hot need", "hot avail", "cold need", "cold avail", "sum need", "sum avail"],
      values: [
        d.hot_need_gb || 0,
        d.hot_available_gb || 0,
        d.cold_need_gb || 0,
        d.cold_available_gb || 0,
        d.summaries_need_gb || 0,
        d.summaries_available_gb || 0,
      ],
    },
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
            color: "#c8d9e2",
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
      },
      scales: circular
        ? {}
        : {
            x: {
              ticks: { color: "#9eb8c4", maxRotation: 45, minRotation: 0, font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.06)" },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#9eb8c4", font: { size: 10 } },
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
      const prefix = sel.getAttribute("data-chart-host") || "charts-inline";
      chartTypes[id] = sel.value;
      if (state.lastPlan) renderAllCharts(state.lastPlan, { hostId, idPrefix: prefix });
      if (state.reviewPreview) renderAllCharts(state.reviewPreview, { hostId: "review-charts", idPrefix: "review" });
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
  const packs = buildChartDatasets(data);
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
        totalEl.textContent = t(pack.totalKey).replace(
          "{n}",
          total.toLocaleString(undefined, { maximumFractionDigits: total >= 100 ? 0 : 2 })
        );
      } else {
        totalEl.hidden = true;
        totalEl.textContent = "";
      }
    }
  });
  if (emptyEl) emptyEl.hidden = shown > 0;
}
