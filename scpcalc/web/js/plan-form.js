import { state } from "./state.js";
import { num } from "./util.js";
import { t, localizeFlow } from "./i18n.js";
import { refreshOpenTip } from "./tips-ui.js";
import { normalizeSnapshotRows, refreshTotalCounterpart, renderRows } from "./sources.js";
import { dailyGBFromEPS, formatDailyGB, numOr0, resolveEventBytes, epsFromDailyGB } from "./volume-convert.js";
import {
  dailyOnDiskFromRaw,
  daysFromDiskGB,
  diskGBFromDays,
  estimateCompression,
  formatDiskGB,
  roundDiskGB,
} from "./retention-convert.js";

/** Mark checkbox chips on/off and show/hide fields with data-depends-on="<checkbox id>". */
export function syncToggleUI() {
  document.querySelectorAll('.field.check input[type="checkbox"]').forEach((input) => {
    const chip = input.closest(".field.check");
    if (!chip) return;
    const on = !!input.checked;
    chip.classList.toggle("is-on", on);
    chip.classList.toggle("is-off", !on);
    chip.setAttribute("aria-checked", on ? "true" : "false");
    if (input.id) {
      document.querySelectorAll(`[data-depends-on="${input.id}"]`).forEach((el) => {
        el.hidden = !on;
        el.classList.toggle("is-revealed", on);
        el.querySelectorAll("input, select, textarea").forEach((ctrl) => {
          ctrl.disabled = !on;
        });
      });
    }
  });
}

export function syncClusterFields() {
  const idxCluster = document.getElementById("indexer_cluster");
  const rfEl = document.getElementById("rf");
  const sfEl = document.getElementById("sf");
  if (!idxCluster || !rfEl || !sfEl) return;
  // Default RF=3, SF=2 (common Splunk cluster defaults). Keep these in the form
  // even when cluster is off; calc still forces RF=1/SF=1 when IndexerCluster=false.
  if (!Number(rfEl.value) || Number(rfEl.value) < 1) rfEl.value = 3;
  if (!Number(sfEl.value) || Number(sfEl.value) < 1) sfEl.value = 2;
  if (idxCluster.checked) {
    if (Number(rfEl.value) <= 1) rfEl.value = 3;
    if (Number(sfEl.value) <= 1) sfEl.value = 2;
    if (Number(sfEl.value) > Number(rfEl.value)) sfEl.value = Number(rfEl.value);
  }
  syncSHCMemberHint();
  syncToggleUI();
}

/** SHC members: 1 (single-member) or ≥3 — never 2 (Splunk SHC system requirements). */
export function syncSHCMemberHint() {
  const shc = document.getElementById("search_head_cluster");
  const nSh = document.querySelector('input[name="n_sh"]');
  const hint = document.getElementById("shc-n-sh-hint");
  if (!shc || !nSh) return;
  const n = Number(nSh.value);
  if (shc.checked && n === 2) {
    nSh.value = "3";
    nSh.setCustomValidity(t("shc_n_sh_two_invalid"));
    nSh.reportValidity();
    // Clear after showing so the form can still submit; engine also enforces.
    setTimeout(() => nSh.setCustomValidity(""), 2500);
  } else {
    nSh.setCustomValidity("");
  }
  if (hint) {
    hint.hidden = !shc.checked;
  }
}

export function syncArchiveFields() {
  syncToggleUI();
  const on = !!document.getElementById("archive_frozen")?.checked;
  const hintKey = on ? "hint_retention_archive" : "hint_retention_delete";
  const policyKey = on ? "hint_archive_policy_archive" : "hint_archive_policy_delete";
  const retentionHint = document.getElementById("hint_retention_dyn");
  if (retentionHint) {
    retentionHint.setAttribute("data-i18n", hintKey);
    retentionHint.textContent = t(hintKey);
  }
  const policyHint = document.getElementById("hint_archive_policy");
  if (policyHint) {
    policyHint.setAttribute("data-i18n", policyKey);
    policyHint.textContent = t(policyKey);
  }
  syncCapacityPair(null);
  refreshOpenTip();
}

function readIntDays(el, fallback = 0) {
  const n = Number(el?.value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function planningDailyRawGB() {
  const g = collectGlobals();
  if (g.total_daily_gb > 0) return g.total_daily_gb;
  let sum = 0;
  state.rows
    .filter((r) => r.enabled)
    .forEach((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      let daily = numOr0(r.daily_gb);
      if (!(daily > 0) && numOr0(r.eps) > 0) daily = dailyGBFromEPS(r.eps, bytes);
      sum += daily;
    });
  return sum;
}

export function planningDailyOnDiskGB() {
  const g = collectGlobals();
  const raw = planningDailyRawGB();
  const comp = estimateCompression({
    compression: g.compression,
    indexer_cluster: g.indexer_cluster,
    rf: g.rf,
    sf: g.sf,
  });
  return dailyOnDiskFromRaw(raw, comp);
}

/** Last edit direction for bridge refreshes: "time" (days→GB) or "disk" (GB→days). */
export function readCapacityPlanMode() {
  return state.capacityPlanMode === "disk" ? "disk" : "time";
}

function setCapSidesLinked() {
  ["cap-time-box", "cap-disk-box"].forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    box.classList.add("is-primary");
    box.classList.remove("is-counterpart");
    box.querySelectorAll("input:not([type=hidden]):not([type=checkbox])").forEach((el) => {
      if (el.name === "frozen_path") return;
      el.readOnly = false;
      el.classList.remove("is-counterpart-input");
    });
  });
}

function updateCapacityLabels() {
  const hotLbl = document.getElementById("lbl_cap_hot");
  const coldLbl = document.getElementById("lbl_cap_cold");
  const hotHint = document.getElementById("hint_cap_hot");
  const coldHint = document.getElementById("hint_cap_cold");
  const modeHint = document.getElementById("cap-mode-hint");
  if (hotLbl) {
    hotLbl.setAttribute("data-i18n", "lbl_avail_hot");
    hotLbl.textContent = t("lbl_avail_hot");
  }
  if (coldLbl) {
    coldLbl.setAttribute("data-i18n", "lbl_avail_cold");
    coldLbl.textContent = t("lbl_avail_cold");
  }
  if (hotHint) {
    hotHint.setAttribute("data-i18n", "hint_avail_hot");
    hotHint.textContent = t("hint_avail_hot");
  }
  if (coldHint) {
    coldHint.setAttribute("data-i18n", "hint_avail_cold");
    coldHint.textContent = t("hint_avail_cold");
  }
  if (modeHint) {
    modeHint.setAttribute("data-i18n", "cap_mode_hint_linked");
    modeHint.textContent = t("cap_mode_hint_linked");
  }
}

function syncRetentionTotal(hot, cold) {
  const total = Math.max(0, hot + cold);
  const hidden = document.getElementById("retention_days") || document.querySelector('input[name="retention_days"]');
  const out = document.getElementById("retention_total_out");
  if (hidden) hidden.value = String(total || "");
  if (out) out.textContent = total > 0 ? String(total) : "—";
  return total;
}

function syncDiskTotal(hotGB, coldGB) {
  const out = document.getElementById("disk_total_out");
  const sum = numOr0(hotGB) + numOr0(coldGB);
  if (out) {
    out.textContent = sum > 0 ? t("disk_total_fmt").replace("{n}", formatDiskGB(sum)) : "—";
  }
  const sumEl = document.getElementById("available_summaries_gb");
  updateDiskScenario(numOr0(hotGB), numOr0(coldGB), sum, numOr0(sumEl?.value));
  return sum;
}

function updateTimeScenario(hot, cold, total) {
  const el = document.getElementById("cap-time-scenario");
  if (!el) return;
  const archive = !!document.getElementById("archive_frozen")?.checked;
  const key = archive ? "cap_scenario_archive" : "cap_scenario_delete";
  el.setAttribute("data-i18n", key);
  el.textContent = t(key)
    .replace("{hot}", String(hot))
    .replace("{cold}", String(cold))
    .replace("{total}", String(total));
}

function updateDiskScenario(hotGB, coldGB, totalGB, summariesGB) {
  const el = document.getElementById("cap-disk-scenario");
  if (!el) return;
  el.setAttribute("data-i18n", "cap_scenario_disk");
  el.textContent = t("cap_scenario_disk")
    .replace("{hot}", formatDiskGB(hotGB))
    .replace("{cold}", formatDiskGB(coldGB))
    .replace("{total}", formatDiskGB(totalGB))
    .replace("{sum}", formatDiskGB(summariesGB));
}

/** Read-only coldPath preview after days are known. */
export function syncColdVolumePreview() {
  const out = document.getElementById("cold_vol_auto");
  if (!out) return;
  const hot = readIntDays(document.getElementById("hot_warm_days") || document.querySelector('input[name="hot_warm_days"]'));
  const coldEl = document.getElementById("cold_days");
  let cold = coldEl ? readIntDays(coldEl) : 0;
  const retHidden = document.getElementById("retention_days");
  const ret = retHidden ? readIntDays(retHidden) : hot + cold;
  if (!coldEl && ret > hot) cold = ret - hot;
  if (!ret) {
    out.textContent = "—";
    return;
  }
  if (cold <= 0) {
    out.textContent = t("cold_vol_auto_zero");
    return;
  }
  out.textContent = t("cold_vol_auto").replace("{days}", String(cold));
}

/**
 * Sync retention time ↔ searchable disk GB (both sides always editable).
 * Edit days → update GB; edit GB → update days. Bridge/rate refresh uses last direction.
 * @param {"hot_days"|"cold_days"|"hot_gb"|"cold_gb"|"mode"|"bridge"|null} edited
 */
export function syncCapacityPair(edited = null) {
  setCapSidesLinked();
  updateCapacityLabels();

  const hotDaysEl = document.getElementById("hot_warm_days") || document.querySelector('input[name="hot_warm_days"]');
  const coldDaysEl = document.getElementById("cold_days");
  const hotGBEl = document.getElementById("available_hot_gb") || document.querySelector('input[name="available_hot_gb"]');
  const coldGBEl = document.getElementById("available_cold_gb") || document.querySelector('input[name="available_cold_gb"]');
  if (!hotDaysEl || !coldDaysEl || !hotGBEl || !coldGBEl) {
    syncColdVolumePreview();
    return;
  }

  if (edited === "hot_days" || edited === "cold_days") state.capacityPlanMode = "time";
  else if (edited === "hot_gb" || edited === "cold_gb") state.capacityPlanMode = "disk";

  const g = collectGlobals();
  const headroom = g.headroom > 0 ? g.headroom : 1.2;
  const rate = planningDailyOnDiskGB();
  const bridge = document.getElementById("cap-disk-bridge");
  if (bridge) {
    if (!(rate > 0)) {
      bridge.setAttribute("data-i18n", "cap_bridge_need_volume");
      bridge.textContent = t("cap_bridge_need_volume");
    } else {
      bridge.setAttribute("data-i18n", "cap_bridge_hint");
      bridge.textContent = t("cap_bridge_hint").replace("{rate}", formatDiskGB(rate)).replace("{h}", String(headroom));
    }
  }

  const fromDays =
    edited === "hot_days" ||
    edited === "cold_days" ||
    ((edited === "bridge" || edited === "mode" || edited == null) && state.capacityPlanMode !== "disk");

  if (fromDays) {
    const hot = readIntDays(hotDaysEl, 0);
    const cold = readIntDays(coldDaysEl, 0);
    const total = syncRetentionTotal(hot, cold);
    updateTimeScenario(hot, cold, total);
    if (rate > 0) {
      if (document.activeElement !== hotGBEl) {
        const needHot = roundDiskGB(diskGBFromDays(hot, rate, headroom));
        hotGBEl.value = needHot > 0 ? String(needHot) : "";
      }
      if (document.activeElement !== coldGBEl) {
        const needCold = roundDiskGB(diskGBFromDays(cold, rate, headroom));
        coldGBEl.value = needCold > 0 ? String(needCold) : "";
      }
    }
    syncDiskTotal(numOr0(hotGBEl.value), numOr0(coldGBEl.value));
  } else {
    const hotGB = numOr0(hotGBEl.value);
    const coldGB = numOr0(coldGBEl.value);
    syncDiskTotal(hotGB, coldGB);
    if (rate > 0) {
      if (document.activeElement !== hotDaysEl) {
        hotDaysEl.value = String(daysFromDiskGB(hotGB, rate, headroom));
      }
      if (document.activeElement !== coldDaysEl) {
        coldDaysEl.value = String(daysFromDiskGB(coldGB, rate, headroom));
      }
    }
    const hot = readIntDays(hotDaysEl, 0);
    const cold = readIntDays(coldDaysEl, 0);
    const total = syncRetentionTotal(hot, cold);
    updateTimeScenario(hot, cold, total);
  }

  syncColdVolumePreview();
}

export function syncVolumeInputMode(_mode, { convert: _convert = false } = {}) {
  // Dual GB = EPS inputs are always shown; planning uses Daily GB.
  state.volumeInputMode = "daily_gb";
  const volHead = document.getElementById("col-vol-label");
  if (volHead) {
    volHead.setAttribute("data-i18n", "col_vol_pair");
    volHead.setAttribute("data-tip", "daily_gb");
    volHead.textContent = t("col_vol_pair");
  }
  document.querySelectorAll(".src-col-event-bytes").forEach((el) => {
    el.hidden = false;
  });
  renderRows();
  refreshTotalCounterpart();
}

export function readVolumeInputMode() {
  return "daily_gb";
}

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
  let retention = num(fd, "retention_days", 37);
  if (coldDaysRaw != null && String(coldDaysRaw) !== "") {
    const cold = Math.max(0, Math.floor(Number(coldDaysRaw) || 0));
    retention = Math.max(0, Math.floor(hotDays) + cold);
  }
  return {
    retention_days: retention,
    hot_warm_days: hotDays,
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
    concurrent_users: num(fd, "concurrent_users", 8),
    concurrent_searches: num(fd, "concurrent_searches", 8),
    saved_searches: num(fd, "saved_searches", 0),
    n_idx: num(fd, "n_idx", 0),
    n_sh: num(fd, "n_sh", 0),
    rf: indexerOn ? Number(val("rf", "3")) || 3 : 1,
    sf: indexerOn ? Number(val("sf", "2")) || 2 : 1,
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

/** Migrate wizard step from older snapshots. */
export function migrateWizardStep(data) {
  let step = typeof data?.step === "number" ? data.step : 0;
  const ver = Number(data?.version) || 0;
  // v3 and earlier: step 0 was Mode; drop it.
  if (ver < 4 && (data?.globals?.mode != null || ver === 3)) {
    step = Math.max(0, step - 1);
  }
  // v6 and earlier: Topology was step 0, Retention step 1.
  // v7+: Volume/Retention first (0), Topology/Cluster second (1).
  if (ver < 7) {
    if (step === 0) step = 1;
    else if (step === 1) step = 0;
  }
  // v8+: Overview inserted at step 0 — shift prior v7 steps up by one.
  if (ver < 8) {
    step = Math.min(4, step + 1);
  }
  // v9+: Volume and Retention split; Sources folded into Volume.
  // v8: 0 Overview, 1 Vol+Ret, 2 Cluster, 3 Sources, 4 Review
  // v9: 0 Overview, 1 Volume(+Sources), 2 Retention, 3 Cluster, 4 Review
  if (ver < 9) {
    if (step === 2) step = 3;
    else if (step === 3) step = 1;
  }
  // v10+: Retention nested into Volume; 4 top-level steps.
  // v9: 0 Overview, 1 Volume, 2 Retention, 3 Cluster, 4 Review
  // v10: 0 Overview, 1 Volume, 2 Cluster, 3 Review
  if (ver < 10) {
    if (step === 2) step = 1;
    else if (step === 3) step = 2;
    else if (step === 4) step = 3;
  }
  return Math.max(0, Math.min(3, step));
}

export function snapshot() {
  return {
    version: 10,
    volume_input_mode: readVolumeInputMode(),
    capacity_plan_mode: readCapacityPlanMode(),
    globals: collectGlobals(),
    rows: state.rows,
    step: state.step,
  };
}

export function applySnapshot(data) {
  if (!data || !Array.isArray(data.rows)) throw new Error("invalid save file");
  if (data.capacity_plan_mode && data.globals) {
    data.globals.capacity_plan_mode = data.capacity_plan_mode;
  }
  applyGlobals(data.globals);
  state.rows = normalizeSnapshotRows(data.rows);
  renderRows();
  state.step = migrateWizardStep(data);
  const mode =
    data.volume_input_mode ||
    data.globals?.volume_input_mode ||
    (state.rows.some((r) => Number(r.eps) > 0 && !(Number(r.daily_gb) > 0)) ? "eps" : "daily_gb");
  syncVolumeInputMode(mode);
  syncArchiveFields();
  syncCapacityPair("mode");
}

export function buildPlanBody(overrides = {}) {
  syncCapacityPair(null);
  const g = { ...collectGlobals(), ...overrides };
  syncVolumeInputMode("daily_gb");
  const sources = state.rows
    .filter((r) => r.enabled)
    .map((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      // Prefer explicit Daily GB; if only EPS is set, derive GB. Engine plans from volume.
      let daily = numOr0(r.daily_gb);
      let eps = numOr0(r.eps);
      if (!(daily > 0) && eps > 0) daily = dailyGBFromEPS(eps, bytes);
      if (!(eps > 0) && daily > 0) eps = epsFromDailyGB(daily, bytes);
      const row = {
        key: r.key,
        label: r.label,
        index_name: String(r.index_name || "").trim(),
        event_bytes: bytes > 0 ? bytes : 500,
        daily_gb: daily,
        eps: eps,
        enable_summary: !!r.enable_summary,
      };
      const ret = Number(r.retention_days);
      if (ret > 0) row.retention_days = ret;
      const hw = Number(r.hot_warm_days);
      if (hw > 0) row.hot_warm_days = hw;
      const sg = Number(r.summary_daily_gb);
      if (r.enable_summary && sg > 0) row.summary_daily_gb = sg;
      if (r.summary_index_name) row.summary_index_name = String(r.summary_index_name).trim();
      return row;
    });
  const { capacity_plan_mode: _mode, ...payload } = g;
  return { ...payload, sources };
}

export function fillReview() {
  const reviewBox = document.getElementById("review-box");
  if (!reviewBox) return;
  const g = collectGlobals();
  const enabled = state.rows.filter((r) => r.enabled);
  let srcSum = 0;
  enabled.forEach((r) => {
    const bytes = resolveEventBytes(r, state.rows);
    let daily = numOr0(r.daily_gb);
    if (!(daily > 0) && numOr0(r.eps) > 0) daily = dailyGBFromEPS(r.eps, bytes);
    srcSum += daily;
  });
  const coldDays = Math.max(0, g.retention_days - g.hot_warm_days);
  const lines = [
    `— From volume & retention —`,
    `plan by: ${g.capacity_plan_mode} | hot: ${g.hot_warm_days}d + cold: ${coldDays}d = total ${g.retention_days}d | headroom: ${g.headroom} | summary_ret: ${g.summary_retention_days}d`,
    `archive_frozen: ${g.archive_frozen}${g.archive_frozen ? ` → ${g.frozen_path}` : ""}`,
    `paths: ${g.hot_path} | ${g.cold_path} | ${g.frozen_path} | ${g.summaries_path}`,
  ];
  if (g.total_daily_gb) lines.push(`total_daily_gb: ${g.total_daily_gb} (budget ceiling; under-fill sources scale up)`);
  if (g.available_hot_gb || g.available_cold_gb || g.available_summaries_gb) {
    lines.push(
      `disk GB: hot=${g.available_hot_gb || 0} cold=${g.available_cold_gb || 0} summaries=${g.available_summaries_gb || 0}`
    );
  }
  lines.push(`— From topology / cluster —`);
  lines.push(
    `Indexer cluster: ${g.indexer_cluster} (RF=${g.rf} SF=${g.sf}) | n_idx=${g.n_idx || "auto"}`
  );
  lines.push(
    `Search head cluster: ${g.search_head_cluster} | users=${g.concurrent_users} searches=${g.concurrent_searches} saved=${g.saved_searches} | n_sh=${g.n_sh || "auto"}`
  );
  lines.push(`apps: ES=${g.has_es} ITSI=${g.has_itsi} DMA=${g.enable_dma} SmartStore=${g.smartstore}`);
  lines.push(`— From sources —`);
  lines.push(`volume input: GB/day = EPS (calc uses Daily GB) | enabled=${enabled.length} | Σ sources ≈ ${formatDailyGB(srcSum)} GB/day`);
  enabled.forEach((r) => {
    const ret = Number(r.retention_days) > 0 ? `${r.retention_days}d` : `global ${g.retention_days}d`;
    const hw = Number(r.hot_warm_days) > 0 ? `${r.hot_warm_days}d` : `global ${g.hot_warm_days}d`;
    const vol = `${r.daily_gb || 0} GB/d = ${r.eps || 0} EPS`;
    lines.push(
      `  - ${r.label} → index=${r.index_name} | ${vol} | event_bytes=${r.event_bytes} | ret=${ret} | hw=${hw}${r.enable_summary ? " | +summary" : ""}`
    );
  });
  lines.push(`— Calculate uses all of the above together —`);
  reviewBox.textContent = localizeFlow(lines.join("\n"));
}

export function bindPlanFormChrome() {
  document.querySelectorAll('.field.check input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.id === "indexer_cluster") {
        syncClusterFields();
        syncCapacityPair("bridge");
      } else if (input.id === "search_head_cluster") {
        syncSHCMemberHint();
        syncToggleUI();
      } else if (input.id === "archive_frozen") syncArchiveFields();
      else if (input.id === "has_es" && input.checked) {
        const dma = document.getElementById("enable_dma");
        if (dma) dma.checked = true;
        syncToggleUI();
      } else syncToggleUI();
    });
  });
  document.querySelector('input[name="n_sh"]')?.addEventListener("change", syncSHCMemberHint);
  document.querySelector('input[name="n_sh"]')?.addEventListener("input", syncSHCMemberHint);
  syncClusterFields();
  syncArchiveFields();

  const wire = (sel, edited) => {
    document.querySelectorAll(sel).forEach((el) => {
      const run = () => {
        syncCapacityPair(edited);
        import("./volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      };
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
  };
  wire('input[name="hot_warm_days"], #hot_warm_days', "hot_days");
  wire('input[name="cold_days"], #cold_days', "cold_days");
  wire('input[name="available_hot_gb"], #available_hot_gb', "hot_gb");
  wire('input[name="available_cold_gb"], #available_cold_gb', "cold_gb");
  document.querySelectorAll('input[name="available_summaries_gb"], #available_summaries_gb').forEach((el) => {
    const run = () => {
      const hot = numOr0(document.getElementById("available_hot_gb")?.value);
      const cold = numOr0(document.getElementById("available_cold_gb")?.value);
      syncDiskTotal(hot, cold);
      import("./volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
    };
    el.addEventListener("input", run);
    el.addEventListener("change", run);
  });
  wire(
    'input[name="headroom"], input[name="total_daily_gb"], input[name="compression"], input[name="rf"], input[name="sf"]',
    "bridge"
  );

  syncCapacityPair("bridge");
  syncVolumeInputMode("daily_gb");
}
