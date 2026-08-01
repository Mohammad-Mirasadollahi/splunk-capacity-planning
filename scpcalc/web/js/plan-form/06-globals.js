/**
 * Read / write wizard globals from the #form element.
 */
import { state } from "../state.js";
import { num } from "../util.js";
import { syncClusterFields } from "./02-cluster-sync.js";
import { readCapacityPlanMode } from "./03-capacity-bridge.js";
import { syncArchiveFields } from "./04-archive-sync.js";

export function collectGlobals() {
  const form = document.getElementById("form");
  const fd = new FormData(form);
  const val = (name, fallback = "") => {
    const el = form.elements.namedItem(name);
    if (el && "value" in el) return String(el.value);
    const fromFd = fd.get(name);
    return fromFd != null ? String(fromFd) : fallback;
  };
  const indexerOn = fd.get("indexer_cluster") === "on";
  const archiveOn = fd.get("archive_frozen") === "on";
  const smartOn = fd.get("smartstore") === "on";
  const dmaOn = fd.get("enable_dma") === "on";
  const hotDays = num(fd, "hot_warm_days", 7);
  const coldDaysRaw = fd.get("cold_days");
  let coldDays = 0;
  let retention = num(fd, "retention_days", 37);
  if (coldDaysRaw != null && String(coldDaysRaw) !== "") {
    coldDays = Math.max(0, Math.floor(Number(coldDaysRaw) || 0));
    retention = Math.max(0, Math.floor(hotDays) + coldDays);
  } else {
    coldDays = Math.max(0, Math.floor(retention) - Math.floor(hotDays));
  }
  return {
    retention_days: retention,
    hot_warm_days: hotDays,
    cold_days: coldDays,
    headroom: num(fd, "headroom", 1.2),
    summary_pct: num(fd, "summary_pct", 0.1),
    summary_retention_days: num(fd, "summary_retention_days", 37),
    hot_path: val("hot_path", "/hot") || "/hot",
    cold_path: val("cold_path", "/cold") || "/cold",
    frozen_path: val("frozen_path", "/frozen") || "/frozen",
    summaries_path: val("summaries_path", "/summaries") || "/summaries",
    indexer_cluster: indexerOn,
    search_head_cluster: fd.get("search_head_cluster") === "on",
    smartstore: smartOn,
    has_es: fd.get("has_es") === "on",
    has_itsi: fd.get("has_itsi") === "on",
    enable_dma: dmaOn,
    archive_frozen: archiveOn,
    archive_days: archiveOn ? Math.max(0, Math.floor(num(fd, "archive_days", 0))) : 0,
    concurrent_users: num(fd, "concurrent_users", 8),
    // Peak searches at one moment (Reference hardware: 1 active search ≤ 1 CPU core).
    // Default 8 matches the field default / concurrent_users demo baseline.
    concurrent_searches: (() => {
      const raw = val("concurrent_searches", "").trim();
      if (raw === "") return 8;
      const n = Math.floor(Number(raw));
      return Number.isFinite(n) && n > 0 ? n : 8;
    })(),
    saved_searches: num(fd, "saved_searches", 0),
    n_idx: (() => {
      let n = num(fd, "n_idx", 0);
      if (indexerOn) n = Math.max(2, n > 0 ? n : 3);
      else n = Math.max(1, n); // standalone: explicit count, never Auto (0)
      return n;
    })(),
    n_sh: (() => {
      let n = num(fd, "n_sh", 0);
      const shcOn = fd.get("search_head_cluster") === "on";
      if (shcOn) {
        if (!(n > 0)) n = 1; // SHC on: never 0; default single-member interim
        if (n === 2) n = 3;
      } else {
        n = Math.max(1, n); // standalone: explicit count, never Auto (0)
      }
      return n;
    })(),
    rf: (() => {
      if (!indexerOn) return 1;
      const peers = (() => {
        let n = num(fd, "n_idx", 0);
        return Math.max(2, n > 0 ? n : 3);
      })();
      let rf = Number(val("rf", "3")) || 3;
      if (rf < 1) rf = 1;
      if (rf > peers) rf = peers; // Splunk: RF ≤ peer count
      return rf;
    })(),
    sf: (() => {
      if (!indexerOn) return 1;
      const peers = (() => {
        let n = num(fd, "n_idx", 0);
        return Math.max(2, n > 0 ? n : 3);
      })();
      let rf = Number(val("rf", "3")) || 3;
      if (rf < 1) rf = 1;
      if (rf > peers) rf = peers;
      let sf = Number(val("sf", "2")) || 2;
      if (sf < 1) sf = 1;
      if (sf > rf) sf = rf; // Splunk: SF ≤ RF
      return sf;
    })(),
    compression: num(fd, "compression", 0),
    dma_pct: Number(val("dma_pct", "0.1")) || 0.1,
    remote_path: smartOn ? val("remote_path", "").trim() : "",
    total_daily_gb: num(fd, "total_daily_gb", 0),
    available_hot_gb: num(fd, "available_hot_gb", 0),
    available_cold_gb: num(fd, "available_cold_gb", 0),
    available_summaries_gb: num(fd, "available_summaries_gb", 0),
    capacity_plan_mode: readCapacityPlanMode(),
  };
}

export function applyGlobals(g) {
  if (!g) return;
  const form = document.getElementById("form");
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
    "concurrent_searches",
    "saved_searches",
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
    "archive_days",
  ]) {
    const el = form.elements.namedItem(k);
    if (el && g[k] != null) el.value = g[k];
  }
  for (const k of ["indexer_cluster", "search_head_cluster", "smartstore", "has_es", "has_itsi", "enable_dma", "archive_frozen"]) {
    const el = form.elements.namedItem(k);
    if (el) el.checked = !!g[k];
  }
  const coldEl = document.getElementById("cold_days");
  if (coldEl) {
    const ret = Number(g.retention_days) || 0;
    const hw = Number(g.hot_warm_days) || 0;
    coldEl.value = String(Math.max(0, ret - hw));
  }
  state.capacityPlanMode = g.capacity_plan_mode === "disk" ? "disk" : "time";
  syncClusterFields();
  syncArchiveFields();
}
