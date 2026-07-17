import { state } from "./state.js";
import { num } from "./util.js";
import { activateTab } from "./tabs.js";
import { normalizeSnapshotRows, renderRows } from "./sources.js";

export function currentMode() {
  const form = document.getElementById("form");
  const m = form?.querySelector('input[name="mode"]:checked');
  return m ? m.value : "sources";
}

export function syncClusterFields() {
  const idxCluster = document.getElementById("indexer_cluster");
  const rfEl = document.getElementById("rf");
  const sfEl = document.getElementById("sf");
  if (!idxCluster || !rfEl || !sfEl) return;
  const on = idxCluster.checked;
  rfEl.disabled = !on;
  sfEl.disabled = !on;
  if (!on) {
    rfEl.value = 1;
    sfEl.value = 1;
  } else if (Number(rfEl.value) <= 1) {
    rfEl.value = 3;
    sfEl.value = 2;
  }
}

export function syncModeUI() {
  const m = currentMode();
  const totalBox = document.getElementById("total-box");
  const capBox = document.getElementById("capacity-box");
  if (totalBox) totalBox.hidden = m === "sources";
  if (capBox) capBox.hidden = m !== "capacity";
  if ((m === "total" || m === "capacity") && state.step === 2) {
    if (totalBox) totalBox.hidden = false;
    activateTab("reten", "ret-vol");
  }
}

export function collectGlobals() {
  const form = document.getElementById("form");
  const fd = new FormData(form);
  return {
    mode: currentMode(),
    retention_days: num(fd, "retention_days", 90),
    hot_warm_days: num(fd, "hot_warm_days", 30),
    headroom: num(fd, "headroom", 1.2),
    summary_pct: num(fd, "summary_pct", 0.1),
    summary_retention_days: num(fd, "summary_retention_days", 90),
    hot_path: String(fd.get("hot_path") || "/hot"),
    cold_path: String(fd.get("cold_path") || "/cold"),
    frozen_path: String(fd.get("frozen_path") || "/frozen"),
    summaries_path: String(fd.get("summaries_path") || "/summaries"),
    indexer_cluster: fd.get("indexer_cluster") === "on",
    search_head_cluster: fd.get("search_head_cluster") === "on",
    smartstore: fd.get("smartstore") === "on",
    has_es: fd.get("has_es") === "on",
    has_itsi: fd.get("has_itsi") === "on",
    enable_dma: fd.get("enable_dma") === "on",
    archive_frozen: fd.get("archive_frozen") === "on",
    concurrent_users: num(fd, "concurrent_users", 8),
    n_idx: num(fd, "n_idx", 0),
    n_sh: num(fd, "n_sh", 0),
    rf: num(fd, "rf", 1),
    sf: num(fd, "sf", 1),
    compression: num(fd, "compression", 0),
    dma_pct: num(fd, "dma_pct", 0.1),
    remote_path: String(fd.get("remote_path") || "").trim(),
    total_daily_gb: num(fd, "total_daily_gb", 0),
    available_hot_gb: num(fd, "available_hot_gb", 0),
    available_cold_gb: num(fd, "available_cold_gb", 0),
    available_summaries_gb: num(fd, "available_summaries_gb", 0),
  };
}

export function applyGlobals(g) {
  if (!g) return;
  const form = document.getElementById("form");
  if (g.mode) {
    const r = form.querySelector(`input[name="mode"][value="${g.mode}"]`);
    if (r) r.checked = true;
    syncModeUI();
  }
  for (const k of [
    "retention_days",
    "hot_warm_days",
    "headroom",
    "summary_pct",
    "summary_retention_days",
    "hot_path",
    "cold_path",
    "frozen_path",
    "summaries_path",
    "concurrent_users",
    "n_idx",
    "n_sh",
    "rf",
    "sf",
    "compression",
    "dma_pct",
    "remote_path",
    "total_daily_gb",
    "available_hot_gb",
    "available_cold_gb",
    "available_summaries_gb",
  ]) {
    const el = form.elements.namedItem(k);
    if (el && g[k] != null) el.value = g[k];
  }
  for (const k of ["indexer_cluster", "search_head_cluster", "smartstore", "has_es", "has_itsi", "enable_dma", "archive_frozen"]) {
    const el = form.elements.namedItem(k);
    if (el) el.checked = !!g[k];
  }
  syncClusterFields();
}

export function snapshot() {
  return { version: 3, globals: collectGlobals(), rows: state.rows, step: state.step };
}

export function applySnapshot(data) {
  if (!data || !Array.isArray(data.rows)) throw new Error("invalid save file");
  applyGlobals(data.globals);
  state.rows = normalizeSnapshotRows(data.rows);
  renderRows();
  if (typeof data.step === "number") state.step = data.step;
}

export function buildPlanBody() {
  const g = collectGlobals();
  const sources = state.rows
    .filter((r) => r.enabled)
    .map((r) => {
      const row = {
        key: r.key,
        label: r.label,
        index_name: String(r.index_name || "").trim(),
        event_bytes: Number(r.event_bytes) || 0,
        daily_gb: Number(r.daily_gb) || 0,
        eps: Number(r.eps) || 0,
        enable_summary: !!r.enable_summary,
      };
      const ret = Number(r.retention_days);
      if (ret > 0) row.retention_days = ret;
      const hw = Number(r.hot_warm_days);
      if (hw > 0) row.hot_warm_days = hw;
      const sg = Number(r.summary_daily_gb);
      if (sg > 0) row.summary_daily_gb = sg;
      if (r.summary_index_name) row.summary_index_name = String(r.summary_index_name).trim();
      return row;
    });
  return { ...g, sources };
}

export function fillReview() {
  const reviewBox = document.getElementById("review-box");
  if (!reviewBox) return;
  const g = collectGlobals();
  const enabled = state.rows.filter((r) => r.enabled);
  const lines = [
    `mode: ${g.mode}`,
    `indexer_cluster: ${g.indexer_cluster} (RF=${g.rf} SF=${g.sf})`,
    `search_head_cluster: ${g.search_head_cluster}`,
    `smartstore: ${g.smartstore} | ES: ${g.has_es} | ITSI: ${g.has_itsi}`,
    `users: ${g.concurrent_users} | n_idx=${g.n_idx || "auto"} n_sh=${g.n_sh || "auto"}`,
    `retention: ${g.retention_days}d | hot_warm: ${g.hot_warm_days}d | headroom: ${g.headroom}`,
    `paths: ${g.hot_path} | ${g.cold_path} | ${g.frozen_path} | ${g.summaries_path}`,
  ];
  if (g.total_daily_gb) lines.push(`total_daily_gb: ${g.total_daily_gb}`);
  if (g.available_hot_gb || g.available_cold_gb || g.available_summaries_gb) {
    lines.push(
      `disk budget GB: hot=${g.available_hot_gb || 0} cold=${g.available_cold_gb || 0} summaries=${g.available_summaries_gb || 0}`
    );
  }
  lines.push(`sources enabled: ${enabled.length}`);
  enabled.forEach((r) => {
    const vol = Number(r.daily_gb) > 0 ? `${r.daily_gb} GB/d` : `EPS ${r.eps || 0}`;
    lines.push(
      `  - ${r.label} → index=${r.index_name} | ${vol} | event_bytes=${r.event_bytes}${r.enable_summary ? " | +summary" : ""}`
    );
  });
  reviewBox.textContent = lines.join("\n");
}

export function bindPlanFormChrome() {
  const form = document.getElementById("form");
  document.getElementById("indexer_cluster")?.addEventListener("change", syncClusterFields);
  syncClusterFields();

  const hasEsEl = document.getElementById("has_es");
  const enableDmaEl = document.getElementById("enable_dma");
  if (hasEsEl && enableDmaEl) {
    hasEsEl.addEventListener("change", () => {
      if (hasEsEl.checked) enableDmaEl.checked = true;
    });
  }

  form?.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", syncModeUI));
  syncModeUI();
}
