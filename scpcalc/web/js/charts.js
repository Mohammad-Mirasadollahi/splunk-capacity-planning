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

function buildChartDatasets(data) {
  const d = data.design || {};
  const indexes = data.indexes || [];
  const g = collectGlobals();
  const hotDays = g.hot_warm_days || 30;
  const ret = g.retention_days || 90;
  const coldDays = Math.max(ret - hotDays, 0);

  return {
    storage: {
      labels: ["hot/warm", "cold", "summaries"],
      values: [d.hot_need_gb || 0, d.cold_need_gb || 0, d.summaries_need_gb || 0],
    },
    retention: {
      labels: ["hot/warm days", "cold days", "total retention"],
      values: [hotDays, coldDays, ret],
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
  const bg = labels.map((_, i) => COLORS[i % COLORS.length]);
  const border = circular ? "#0a1a22" : bg;
  chartInstances[canvasId] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: t(CHART_DEFS.find((c) => c.id === chartId)?.titleKey || chartId),
          data: values,
          backgroundColor: circular ? bg : bg.map((c) => c + "cc"),
          borderColor: border,
          borderWidth: circular ? 2 : 1.5,
          tension: 0.35,
          fill: type === "line",
          pointRadius: type === "line" ? 3 : 0,
          pointHoverRadius: type === "line" ? 5 : 0,
          pointBorderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          // Cartesian charts already label categories on the axis; show series icons only for circular charts.
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
                const stroke = Array.isArray(ds.borderColor) ? ds.borderColor[i] : ds.borderColor;
                return {
                  text: String(text),
                  fillStyle: fill,
                  strokeStyle: stroke || fill,
                  lineWidth: 1,
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
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#9eb8c4", font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.06)" },
            },
          },
    },
  });
}

export function ensureChartCards() {
  const host = document.getElementById("charts-inline");
  if (!host || host.dataset.ready === "1") return;
  host.innerHTML = CHART_DEFS.map((def) => {
    const type = chartTypes[def.id] || def.defaultType;
    const opts = CHART_TYPE_OPTS.map(
      (o) => `<option value="${o}" ${o === type ? "selected" : ""}>${o}</option>`
    ).join("");
    return `<article class="chart-card" data-chart="${def.id}">
          <div class="chart-card-head">
            <h4 data-i18n="${def.titleKey}">${t(def.titleKey)}</h4>
            <label class="chart-type-label">
              <span data-i18n="chart_type">${t("chart_type")}</span>
              <select data-chart-type="${def.id}">${opts}</select>
            </label>
          </div>
          <div class="chart-canvas-wrap">
            <canvas id="chart-charts-inline-${def.id}"></canvas>
          </div>
        </article>`;
  }).join("");
  host.dataset.ready = "1";
  host.querySelectorAll("[data-chart-type]").forEach((sel) => {
    sel.addEventListener("change", () => {
      const id = sel.getAttribute("data-chart-type");
      chartTypes[id] = sel.value;
      if (state.lastPlan) renderAllCharts(state.lastPlan);
    });
  });
}

export function renderAllCharts(data) {
  if (!data) return;
  ensureChartCards();
  setLang(lang());
  const packs = buildChartDatasets(data);
  CHART_DEFS.forEach((def) => {
    const pack = packs[def.id] || { labels: [], values: [] };
    const type = chartTypes[def.id] || def.defaultType;
    chartTypes[def.id] = type;
    paintOne(`chart-charts-inline-${def.id}`, def.id, type, pack.labels, pack.values);
  });
}
