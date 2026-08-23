import { state } from "./state.js";
import { escapeAttr } from "./util.js";
import { t } from "./i18n.js";
import { bindTips } from "./tips-ui.js";
import {
  averageEventBytes,
  dailyGBFromEPS,
  epsFromDailyGB,
  formatEPS,
  numOr0,
  resolveEventBytes,
} from "./volume-convert.js";
import { DEMO_AVG_EVENT_BYTES } from "./defaults.js";
import { formatSizeGB, formatSizeMB, planSourceDiskNeeds, underfillScaleFactor } from "./source-sizing.js";
import { applyTableFind, bindTableFind } from "./table-find.js";

export const MAIN_INDEX_KEY = "main";

/** Default catch-all index — receives total_daily_gb until the user enables other sources. */
export function mainIndexRow(dailyGB = "") {
  return {
    key: MAIN_INDEX_KEY,
    label: "Main",
    index_name: "main",
    event_bytes: DEMO_AVG_EVENT_BYTES,
    daily_gb: dailyGB === "" || dailyGB == null ? "" : dailyGB,
    eps: "",
    retention_days: "",
    hot_warm_days: "",
    enabled: true,
    notes: "",
  };
}

export function isMainRow(r) {
  return r?.key === MAIN_INDEX_KEY;
}

export function hasManualSources(rows = state.rows) {
  return (rows || []).some((r) => r.enabled && !isMainRow(r));
}

function readTotalDailyGB() {
  return numOr0(
    document.getElementById("total_daily_gb")?.value ??
      document.querySelector('input[name="total_daily_gb"]')?.value
  );
}

export function ensureMainRow(rows = state.rows) {
  let main = rows.find((r) => isMainRow(r));
  if (!main) {
    main = mainIndexRow();
    rows.unshift(main);
  } else {
    const i = rows.indexOf(main);
    if (i > 0) {
      rows.splice(i, 1);
      rows.unshift(main);
    }
  }
  return main;
}

/** Keep main index in sync with Budget total in simple mode (custom sources off). */
export function syncMainFromTotal() {
  ensureMainRow();
  if (isConfigureSourcesEnabled()) return;
  const main = state.rows.find((r) => isMainRow(r));
  if (!main) return;
  main.enabled = true;
  const total = readTotalDailyGB();
  main.daily_gb = total > 0 ? roundVol(total, "gb") : "";
  syncRowVolumePair(main, state.rows, "daily_gb");
}

export function collapseToMainOnly() {
  ensureMainRow();
  const main = state.rows.find((r) => isMainRow(r));
  if (!main) return;
  state.rows = [main];
  main.enabled = true;
  syncMainFromTotal();
}

export function expandSourcesCatalog() {
  const presets = state.sourcePresets || [];
  ensureMainRow();
  const main = state.rows.find((r) => isMainRow(r));
  if (!presets.length) return;
  const built = buildRowsFromPresets(presets, { dailyGB: "" });
  const builtMain = built.find((r) => isMainRow(r)) || built[0];
  const byKey = new Map(state.rows.map((r) => [String(r.key || ""), r]));
  const merged = [main || builtMain];
  for (const row of built) {
    if (isMainRow(row)) continue;
    const existing = byKey.get(String(row.key || ""));
    merged.push(existing || row);
  }
  for (const row of state.rows) {
    if (isMainRow(row)) continue;
    if (row.key === "custom" || !built.some((b) => b.key === row.key)) {
      merged.push(row);
    }
  }
  state.rows = merged;
}

/** Toggle per-source table: off = main only; on = catalog + custom sources. */
export function applyConfigureSourcesMode(on) {
  setConfigureSources(on);
  if (on) {
    expandSourcesCatalog();
  } else {
    collapseToMainOnly();
  }
  renderRows();
  import("./volume-budget.js")
    .then((m) => m.refreshVolumeBudgetUI?.())
    .catch(() => {});
}

function rowsForDisplay() {
  ensureMainRow();
  if (!isConfigureSourcesEnabled()) {
    const main = state.rows.find((r) => isMainRow(r));
    return main ? [main] : [];
  }
  return state.rows;
}

/** Switch to per-source catalog mode (checkbox on); does not change which rows are enabled. */
export function enterManualSourceMode({ keepConfigureFlag = false } = {}) {
  ensureMainRow();
  if (!keepConfigureFlag) setConfigureSources(true);
}

export function maybeRestoreMainDefault() {
  ensureMainRow();
  if (hasManualSources()) return;
  if (isConfigureSourcesEnabled()) return;
  syncMainFromTotal();
}

/** Per-source table is optional; when off, planning uses total_daily_gb only. */
export function isConfigureSourcesEnabled() {
  const el = document.getElementById("configure_sources");
  if (el) return el.checked;
  return state.configureSources;
}

export function setConfigureSources(on) {
  state.configureSources = !!on;
  const el = document.getElementById("configure_sources");
  if (el) el.checked = state.configureSources;
  const panel = document.getElementById("sources-panel");
  if (panel) {
    panel.classList.toggle("sources-mode-custom", state.configureSources);
    panel.classList.toggle("sources-mode-simple", !state.configureSources);
  }
  import("./plan-form.js")
    .then((m) => m.syncToggleUI?.())
    .catch(() => {});
  import("./volume-budget.js")
    .then((m) => m.refreshVolumeBudgetUI?.())
    .catch(() => {});
}

export function syncConfigureSourcesUI() {
  const el = document.getElementById("configure_sources");
  if (!el) return;
  el.checked = state.configureSources;
  import("./plan-form.js")
    .then((m) => m.syncToggleUI?.())
    .catch(() => {});
}

/** Planning average event size: Quick Start field first, else enabled sources, else demo default. */
export function planningAvgEventBytes() {
  const fromQuick = numOr0(document.getElementById("avg_event_bytes")?.value);
  if (fromQuick > 0) return Math.round(fromQuick);
  const fromRows = averageEventBytes(state.rows, { enabledOnly: true });
  return fromRows > 0 ? Math.round(fromRows) : DEMO_AVG_EVENT_BYTES;
}

function indexSizeCellHTML(sized) {
  if (!sized) {
    return `<td class="src-col-idx-size"><span class="src-dep-placeholder">—</span></td>`;
  }
  const maxMB = formatSizeMB(sized.maxTotalMB);
  const maxGB = formatSizeGB(sized.maxTotalGB);
  const homeMB = formatSizeMB(sized.homeMB);
  const bytes = resolveEventBytes(sized.row, state.rows);
  const eps = sized.dailyRaw > 0 && bytes > 0 ? epsFromDailyGB(sized.dailyRaw, bytes) : numOr0(sized.row.eps);
  const epsTxt = formatEPS(eps);
  const dmaLine =
    sized.dmaGB > 0
      ? `<span class="src-idx-dma tip-mark" data-tip="dma_volume_gb" data-idx-dma="${sized.i}">${t("col_idx_dma_short").replace("{n}", formatSizeGB(sized.dmaGB))}</span>`
      : "";
  const scaleNote =
    sized.scale > 1.001
      ? `<span class="src-idx-scale" title="${escapeAttr(t("col_idx_scale_tip"))}">×${sized.scale.toFixed(2)}</span>`
      : "";
  return `<td class="src-col-idx-size">
    <output class="src-idx-size readonly-value" data-idx-size="${sized.i}" aria-live="polite" title="maxTotalDataSizeMB (cluster-wide, pre peer-split)">${maxMB}</output>
    <span class="src-idx-gb" data-idx-gb="${sized.i}">≈ ${maxGB} GB · ${epsTxt} EPS</span>
    <span class="src-idx-home tip-mark" data-tip="hot_warm_days" data-idx-home="${sized.i}" title="homePath.maxDataSizeMB">${t("col_idx_home_short").replace("{n}", homeMB)}</span>
    ${dmaLine}
    ${scaleNote}
  </td>`;
}

export function refreshIndexSizePreviews() {
  import("./plan-form.js")
    .then(({ collectGlobals }) => {
      const g = collectGlobals();
      const plan = planSourceDiskNeeds(state.rows, g);
      const byIndex = new Map();
      plan.rows.forEach((s) => {
        const idx = state.rows.indexOf(s.row);
        if (idx >= 0) byIndex.set(idx, s);
      });
      state.rows.forEach((r, i) => {
        const out = document.querySelector(`[data-idx-size="${i}"]`);
        const gbEl = document.querySelector(`[data-idx-gb="${i}"]`);
        const homeEl = document.querySelector(`[data-idx-home="${i}"]`);
        const tr = document.querySelector(`tr[data-i="${i}"]`);
        if (!out) return;
        const sized = byIndex.get(i);
        if (!r.enabled || !sized) {
          out.textContent = "—";
          if (gbEl) gbEl.textContent = "";
          if (homeEl) homeEl.textContent = t("col_idx_home_short").replace("{n}", "—");
          tr?.querySelector(".src-idx-scale")?.remove();
          return;
        }
        const bytes = resolveEventBytes(r, state.rows);
        const eps = sized.dailyRaw > 0 && bytes > 0 ? epsFromDailyGB(sized.dailyRaw, bytes) : numOr0(r.eps);
        out.textContent = formatSizeMB(sized.maxTotalMB);
        if (gbEl) gbEl.textContent = `≈ ${formatSizeGB(sized.maxTotalGB)} GB · ${formatEPS(eps)} EPS`;
        if (homeEl) homeEl.textContent = t("col_idx_home_short").replace("{n}", formatSizeMB(sized.homeMB));
        let dmaEl = tr?.querySelector(`[data-idx-dma="${i}"]`);
        if (sized.dmaGB > 0) {
          if (!dmaEl && tr) {
            dmaEl = document.createElement("span");
            dmaEl.className = "src-idx-dma tip-mark";
            dmaEl.dataset.tip = "dma_volume_gb";
            dmaEl.dataset.idxDma = String(i);
            tr.querySelector(".src-col-idx-size")?.appendChild(dmaEl);
          }
          if (dmaEl) dmaEl.textContent = t("col_idx_dma_short").replace("{n}", formatSizeGB(sized.dmaGB));
        } else {
          dmaEl?.remove();
        }
        let scaleEl = tr?.querySelector(".src-idx-scale");
        if (sized.scale > 1.001) {
          if (!scaleEl && tr) {
            scaleEl = document.createElement("span");
            scaleEl.className = "src-idx-scale";
            scaleEl.title = t("col_idx_scale_tip");
            tr.querySelector(".src-col-idx-size")?.appendChild(scaleEl);
          }
          if (scaleEl) scaleEl.textContent = `×${sized.scale.toFixed(2)}`;
        } else {
          scaleEl?.remove();
        }
      });
    })
    .catch(() => {});
}

export function blankCustom() {
  return {
    key: "custom",
    label: "Custom",
    index_name: "custom",
    event_bytes: 500,
    daily_gb: "",
    eps: "",
    retention_days: "",
    hot_warm_days: "",
    enabled: true,
    notes: "",
  };
}

export function rowFromPreset(p) {
  return {
    key: p.key,
    label: p.label,
    index_name: p.index_hint || p.key,
    event_bytes: p.event_bytes,
    daily_gb: "",
    eps: "",
    retention_days: "",
    hot_warm_days: "",
    enabled: false,
    notes: p.notes || "",
  };
}

function roundVol(n, kind) {
  if (!(n > 0)) return "";
  if (kind === "eps") return Math.round(n * 10) / 10;
  return Math.round(n * 1000) / 1000;
}

/** Keep daily_gb and eps linked for one source row. */
export function syncRowVolumePair(row, rows, edited) {
  const bytes = resolveEventBytes(row, rows);
  if (edited === "daily_gb") {
    const gb = numOr0(row.daily_gb);
    row.eps = gb > 0 ? roundVol(epsFromDailyGB(gb, bytes), "eps") : "";
  } else if (edited === "eps") {
    const eps = numOr0(row.eps);
    row.daily_gb = eps > 0 ? roundVol(dailyGBFromEPS(eps, bytes), "gb") : "";
  } else if (edited === "event_bytes") {
    const gb = numOr0(row.daily_gb);
    const eps = numOr0(row.eps);
    if (gb > 0) row.eps = roundVol(epsFromDailyGB(gb, bytes), "eps");
    else if (eps > 0) row.daily_gb = roundVol(dailyGBFromEPS(eps, bytes), "gb");
  }
}

function volumeCell(r, i, on) {
  const gbId = `src-${i}-daily_gb`;
  const epsId = `src-${i}-eps`;
  return `<div class="vol-pair" role="group" aria-label="GB/day equals EPS">
    <input type="number" id="${gbId}" data-f="daily_gb" class="vol-gb" min="0" step="any" value="${escapeAttr(String(r.daily_gb ?? ""))}" placeholder="GB/day" ${on ? "" : "disabled"} aria-label="Daily GB" autocomplete="off">
    <span class="vol-eq" aria-hidden="true">=</span>
    <input type="number" id="${epsId}" data-f="eps" class="vol-eps" min="0" step="any" value="${escapeAttr(String(r.eps ?? ""))}" placeholder="EPS" ${on ? "" : "disabled"} aria-label="EPS" autocomplete="off">
  </div>`;
}

function updatePairInputs(tr, row) {
  const gb = tr.querySelector('input[data-f="daily_gb"]');
  const eps = tr.querySelector('input[data-f="eps"]');
  if (gb && document.activeElement !== gb) gb.value = row.daily_gb === "" || row.daily_gb == null ? "" : row.daily_gb;
  if (eps && document.activeElement !== eps) eps.value = row.eps === "" || row.eps == null ? "" : row.eps;
}

export function refreshTotalCounterpart() {
  syncTotalVolumePair(null);
}

/** Sync total_daily_gb ↔ total_daily_eps using Volume-step avg event size (fallback: sources). */
export function syncTotalVolumePair(edited) {
  const gbEl = document.getElementById("total_daily_gb") || document.querySelector('input[name="total_daily_gb"]');
  const epsEl = document.getElementById("total_daily_eps");
  if (!gbEl || !epsEl) return;
  const bytes = planningAvgEventBytes();
  if (edited === "eps") {
    const eps = numOr0(epsEl.value);
    const gb = eps > 0 ? roundVol(dailyGBFromEPS(eps, bytes), "gb") : "";
    gbEl.value = gb === "" ? "" : gb;
  } else if (edited === "gb" || edited == null) {
    const gb = numOr0(gbEl.value);
    const eps = gb > 0 ? roundVol(epsFromDailyGB(gb, bytes), "eps") : "";
    if (edited === "gb" || document.activeElement !== epsEl) {
      epsEl.value = eps === "" ? "" : eps;
    }
  }
}

function rowFindText(r) {
  return [
    r.label,
    r.index_name,
    r.key,
    r.notes,
    r.daily_gb,
    r.eps,
    r.event_bytes,
    r.retention_days,
    r.hot_warm_days,
  ]
    .filter((v) => v !== "" && v != null)
    .join(" ");
}

function volumeRowHTML(r, i, sizedMap, { configureOn = true } = {}) {
  const title = r.notes ? ` data-soft-tip="${escapeAttr(r.notes)}" data-soft-tip-title="${escapeAttr(r.label || r.index_name || "Source")}"` : "";
  const simpleMain = !configureOn && isMainRow(r);
  const on = simpleMain ? true : !!r.enabled;
  const lockMain = isMainRow(r) && !configureOn;
  const p = `src-${i}`;
  const sized = on ? sizedMap.get(i) : null;
  const find = escapeAttr(rowFindText(r));
  const volDisabled = !on || simpleMain;
  return `<tr data-i="${i}" data-find="${find}" class="${on ? "src-row-on" : "src-row-off"}${simpleMain ? " src-row-main-only" : ""}"${title}>
    <td><input type="checkbox" id="${p}-enabled" data-f="enabled" class="src-toggle" ${on ? "checked" : ""} ${lockMain ? "disabled" : ""} aria-label="Use source"></td>
    <td><input type="text" id="${p}-label" data-f="label" value="${escapeAttr(r.label)}" ${on && configureOn ? "" : "disabled"} autocomplete="off"></td>
    <td><input type="text" id="${p}-index_name" data-f="index_name" value="${escapeAttr(r.index_name)}" ${on && configureOn ? "" : "disabled"} ${simpleMain ? "readonly" : ""} autocomplete="off"></td>
    <td class="src-col-event-bytes"><input type="number" id="${p}-event_bytes" data-f="event_bytes" min="1" step="1" value="${r.event_bytes}" ${on && configureOn && !simpleMain ? "" : "disabled"} autocomplete="off"></td>
    <td class="src-col-vol">${volumeCell(r, i, !volDisabled)}</td>
    <td><input type="number" id="${p}-retention_days" data-f="retention_days" min="0" step="1" value="${r.retention_days}" placeholder="glob" ${on && configureOn ? "" : "disabled"} autocomplete="off"></td>
    <td><input type="number" id="${p}-hot_warm_days" data-f="hot_warm_days" min="0" step="1" value="${r.hot_warm_days}" placeholder="glob" ${on && configureOn ? "" : "disabled"} autocomplete="off"></td>
    ${indexSizeCellHTML(sized)}
    <td>${
      !configureOn || isMainRow(r)
        ? `<span class="src-main-lock" title="${escapeAttr(isMainRow(r) ? t("main_row_locked") : "")}">—</span>`
        : `<button type="button" class="btn-x" data-rm="${i}" aria-label="Remove">×</button>`
    }</td>
  </tr>`;
}

function bumpBudgetsAndSizes() {
  import("./state.js").then(({ state: st }) => {
    st.capacityPlanMode = "time";
  }).catch(() => {});
  import("./plan-form.js")
    .then((m) => {
      m.syncCapacityPair?.("bridge");
      return import("./volume-budget.js");
    })
    .then((m) => m.refreshVolumeBudgetUI?.())
    .catch(() => {
      import("./volume-budget.js").then((vb) => vb.refreshVolumeBudgetUI?.()).catch(() => {});
    });
}

export function renderRows() {
  const srcBody = document.getElementById("src-body");
  if (!srcBody) return;

  state.rows.forEach((r) => {
    if (numOr0(r.daily_gb) > 0) syncRowVolumePair(r, state.rows, "daily_gb");
    else if (numOr0(r.eps) > 0) syncRowVolumePair(r, state.rows, "eps");
  });

  const configureOn = isConfigureSourcesEnabled();
  const displayRows = rowsForDisplay();

  import("./plan-form.js")
    .then(({ collectGlobals }) => {
      const g = collectGlobals();
      const plan = planSourceDiskNeeds(state.rows, g);
      const sizedMap = new Map();
      plan.rows.forEach((s) => {
        const idx = state.rows.indexOf(s.row);
        if (idx >= 0) sizedMap.set(idx, { ...s, i: idx });
      });
      srcBody.innerHTML = displayRows
        .map((r) => {
          const i = state.rows.indexOf(r);
          return volumeRowHTML(r, i, sizedMap, { configureOn });
        })
        .join("");
      bindTips(srcBody);
      applyTableFind("src-find", "src-body", "src-find-count");
      refreshTotalCounterpart();
      import("./volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
    })
    .catch(() => {
      srcBody.innerHTML = displayRows
        .map((r) => volumeRowHTML(r, state.rows.indexOf(r), new Map(), { configureOn }))
        .join("");
      bindTips(srcBody);
      applyTableFind("src-find", "src-body", "src-find-count");
      refreshTotalCounterpart();
    });
}

function bindTableBody(srcBody) {
  if (!srcBody) return;

  srcBody.addEventListener("change", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const i = Number(tr.dataset.i);
    const f = e.target.dataset.f;
    if (!f || !state.rows[i]) return;
    if (e.target.type === "checkbox") {
      const row = state.rows[i];
      if (f === "enabled") {
        if (e.target.checked && !isMainRow(row) && !isConfigureSourcesEnabled()) {
          applyConfigureSourcesMode(true);
        }
        row[f] = e.target.checked;
        if (!e.target.checked) maybeRestoreMainDefault();
      } else {
        row[f] = e.target.checked;
      }
      if (f === "enabled") renderRows();
      else bumpBudgetsAndSizes();
    } else {
      state.rows[i][f] = e.target.value;
      if (f === "daily_gb" || f === "eps" || f === "event_bytes") {
        syncRowVolumePair(state.rows[i], state.rows, f);
        updatePairInputs(tr, state.rows[i]);
        refreshTotalCounterpart();
        bumpBudgetsAndSizes();
      } else if (f === "retention_days" || f === "hot_warm_days") {
        bumpBudgetsAndSizes();
        refreshIndexSizePreviews();
      } else if (f === "label" || f === "index_name") {
        renderRows();
      }
    }
  });
  srcBody.addEventListener("input", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const i = Number(tr.dataset.i);
    const f = e.target.dataset.f;
    if (!f || !state.rows[i] || e.target.type === "checkbox") return;
    state.rows[i][f] = e.target.value;
    if (f === "daily_gb" || f === "eps" || f === "event_bytes") {
      syncRowVolumePair(state.rows[i], state.rows, f);
      updatePairInputs(tr, state.rows[i]);
      refreshTotalCounterpart();
      bumpBudgetsAndSizes();
    } else if (f === "retention_days" || f === "hot_warm_days") {
      bumpBudgetsAndSizes();
      refreshIndexSizePreviews();
    }
  });
  srcBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rm]");
    if (!btn) return;
    const i = Number(btn.dataset.rm);
    if (isMainRow(state.rows[i])) return;
    state.rows.splice(i, 1);
    maybeRestoreMainDefault();
    renderRows();
  });
}

function bindTotalVolumePair() {
  const gbEl = document.getElementById("total_daily_gb") || document.querySelector('input[name="total_daily_gb"]');
  const epsEl = document.getElementById("total_daily_eps");
  if (!gbEl || gbEl.dataset.volPairBound === "1") return;
  gbEl.dataset.volPairBound = "1";
  const onGb = () => {
    syncTotalVolumePair("gb");
    syncMainFromTotal();
    bumpBudgetsAndSizes();
  };
  const onEps = () => {
    syncTotalVolumePair("eps");
    syncMainFromTotal();
    bumpBudgetsAndSizes();
  };
  gbEl.addEventListener("input", onGb);
  gbEl.addEventListener("change", onGb);
  epsEl?.addEventListener("input", onEps);
  epsEl?.addEventListener("change", onEps);
  syncTotalVolumePair("gb");
}

export function bindSourcesTable() {
  bindTableBody(document.getElementById("src-body"));
  bindTableFind("src-find", "src-body", "src-find-count");
  bindTotalVolumePair();
  syncConfigureSourcesUI();

  document.getElementById("btn-add")?.addEventListener("click", () => {
    if (!isConfigureSourcesEnabled()) applyConfigureSourcesMode(true);
    state.rows.push(blankCustom());
    renderRows();
  });
}

export function normalizeSnapshotRows(rows) {
  const list = (rows || []).map((r) => ({
    key: r.key || "custom",
    label: r.label || r.index_name || "Custom",
    index_name: r.index_name || "custom",
    event_bytes: Number(r.event_bytes) || 500,
    daily_gb: r.daily_gb ?? "",
    eps: r.eps ?? "",
    retention_days: r.retention_days ?? "",
    hot_warm_days: r.hot_warm_days ?? "",
    enabled: r.enabled !== false,
    notes: r.notes || "",
  }));
  ensureMainRow(list);
  list.forEach((row) => {
    if (numOr0(row.daily_gb) > 0) syncRowVolumePair(row, list, "daily_gb");
    else if (numOr0(row.eps) > 0) syncRowVolumePair(row, list, "eps");
  });
  return list;
}

export function buildRowsFromPresets(presets, { dailyGB } = {}) {
  const main = mainIndexRow(dailyGB > 0 ? dailyGB : "");
  const catalog = (presets || []).map((p) => {
    const row = rowFromPreset(p);
    row.enabled = false;
    if (!(Number(row.event_bytes) > 0)) row.event_bytes = DEMO_AVG_EVENT_BYTES;
    return row;
  });
  return [main, ...catalog];
}

export { underfillScaleFactor, planSourceDiskNeeds };
