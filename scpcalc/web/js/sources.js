import { state } from "./state.js";
import { escapeAttr } from "./util.js";
import { t } from "./i18n.js";
import { bindTips } from "./tips-ui.js";
import {
  averageEventBytes,
  dailyGBFromEPS,
  epsFromDailyGB,
  formatDailyGB,
  formatEPS,
  numOr0,
  resolveEventBytes,
} from "./volume-convert.js";

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
    enable_summary: false,
    summary_daily_gb: "",
    summary_index_name: "",
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
    enable_summary: false,
    summary_daily_gb: "",
    summary_index_name: "",
    enabled: false,
    notes: p.notes || "",
  };
}

function roundVol(n, kind) {
  if (!(n > 0)) return "";
  if (kind === "eps") return Math.round(n * 1000) / 1000;
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

function volumeCell(r, on) {
  return `<div class="vol-pair" role="group" aria-label="GB/day equals EPS">
    <input type="number" data-f="daily_gb" class="vol-gb" min="0" step="any" value="${escapeAttr(String(r.daily_gb ?? ""))}" placeholder="GB/day" ${on ? "" : "disabled"} aria-label="Daily GB">
    <span class="vol-eq" aria-hidden="true">=</span>
    <input type="number" data-f="eps" class="vol-eps" min="0" step="any" value="${escapeAttr(String(r.eps ?? ""))}" placeholder="EPS" ${on ? "" : "disabled"} aria-label="EPS">
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

/** Sync total_daily_gb ↔ total_daily_eps using average event size from sources. */
export function syncTotalVolumePair(edited) {
  const gbEl = document.getElementById("total_daily_gb") || document.querySelector('input[name="total_daily_gb"]');
  const epsEl = document.getElementById("total_daily_eps");
  if (!gbEl || !epsEl) return;
  const bytes = averageEventBytes(state.rows, { enabledOnly: true });
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

function volumeRowHTML(r, i) {
  const title = r.notes ? ` data-soft-tip="${escapeAttr(r.notes)}" data-soft-tip-title="${escapeAttr(r.label || r.index_name || "Source")}"` : "";
  const on = !!r.enabled;
  return `<tr data-i="${i}" class="${on ? "src-row-on" : "src-row-off"}"${title}>
    <td><input type="checkbox" data-f="enabled" class="src-toggle" ${on ? "checked" : ""} aria-label="Use source"></td>
    <td><input type="text" data-f="label" value="${escapeAttr(r.label)}" ${on ? "" : "disabled"}></td>
    <td><input type="text" data-f="index_name" value="${escapeAttr(r.index_name)}" ${on ? "" : "disabled"}></td>
    <td class="src-col-event-bytes"><input type="number" data-f="event_bytes" min="1" step="1" value="${r.event_bytes}" ${on ? "" : "disabled"}></td>
    <td class="src-col-vol">${volumeCell(r, on)}</td>
    <td><button type="button" class="btn-x" data-rm="${i}" aria-label="Remove">×</button></td>
  </tr>`;
}

function retentionRowHTML(r, i) {
  const on = !!r.enabled;
  const sumOn = !!r.enable_summary;
  return `<tr data-i="${i}" class="${on ? "src-row-on" : "src-row-off"}">
    <td><input type="checkbox" data-f="enabled" class="src-toggle" ${on ? "checked" : ""} aria-label="Use source"></td>
    <td><input type="text" data-f="label" value="${escapeAttr(r.label)}" ${on ? "" : "disabled"}></td>
    <td><input type="text" data-f="index_name" value="${escapeAttr(r.index_name)}" ${on ? "" : "disabled"}></td>
    <td><input type="number" data-f="retention_days" min="0" step="1" value="${r.retention_days}" placeholder="glob" ${on ? "" : "disabled"}></td>
    <td><input type="number" data-f="hot_warm_days" min="0" step="1" value="${r.hot_warm_days}" placeholder="glob" ${on ? "" : "disabled"}></td>
    <td><input type="checkbox" data-f="enable_summary" class="src-toggle" ${sumOn ? "checked" : ""} ${on ? "" : "disabled"}></td>
    <td class="src-col-sum-gb">${
      sumOn && on
        ? `<input type="number" data-f="summary_daily_gb" min="0" step="any" value="${r.summary_daily_gb}" placeholder="auto%">`
        : `<span class="src-dep-placeholder">—</span>`
    }</td>
  </tr>`;
}

export function renderRows() {
  const srcBody = document.getElementById("src-body");
  const retBody = document.getElementById("src-ret-body");
  if (!srcBody && !retBody) return;

  // Ensure linked pairs are consistent before paint (prefer GB as planning source of truth).
  state.rows.forEach((r) => {
    if (numOr0(r.daily_gb) > 0) syncRowVolumePair(r, state.rows, "daily_gb");
    else if (numOr0(r.eps) > 0) syncRowVolumePair(r, state.rows, "eps");
  });

  if (srcBody) {
    srcBody.innerHTML = state.rows.map((r, i) => volumeRowHTML(r, i)).join("");
    bindTips(srcBody);
  }
  if (retBody) {
    retBody.innerHTML = state.rows.map((r, i) => retentionRowHTML(r, i)).join("");
  }
  refreshTotalCounterpart();
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
      state.rows[i][f] = e.target.checked;
      if (f === "enabled" || f === "enable_summary") renderRows();
      else refreshTotalCounterpart();
    } else {
      state.rows[i][f] = e.target.value;
      if (f === "daily_gb" || f === "eps" || f === "event_bytes") {
        syncRowVolumePair(state.rows[i], state.rows, f);
        updatePairInputs(tr, state.rows[i]);
        refreshTotalCounterpart();
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
    } else if (f === "label" || f === "index_name") {
      const other =
        srcBody.id === "src-body"
          ? document.querySelector(`#src-ret-body tr[data-i="${i}"] input[data-f="${f}"]`)
          : document.querySelector(`#src-body tr[data-i="${i}"] input[data-f="${f}"]`);
      if (other && other !== e.target) other.value = e.target.value;
    }
  });
  srcBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rm]");
    if (!btn) return;
    state.rows.splice(Number(btn.dataset.rm), 1);
    renderRows();
  });
}

function bindTotalVolumePair() {
  const gbEl = document.getElementById("total_daily_gb") || document.querySelector('input[name="total_daily_gb"]');
  const epsEl = document.getElementById("total_daily_eps");
  if (!gbEl || gbEl.dataset.volPairBound === "1") return;
  gbEl.dataset.volPairBound = "1";
  const onGb = () => syncTotalVolumePair("gb");
  const onEps = () => syncTotalVolumePair("eps");
  gbEl.addEventListener("input", onGb);
  gbEl.addEventListener("change", onGb);
  epsEl?.addEventListener("input", onEps);
  epsEl?.addEventListener("change", onEps);
  syncTotalVolumePair("gb");
}

export function bindSourcesTable() {
  bindTableBody(document.getElementById("src-body"));
  bindTableBody(document.getElementById("src-ret-body"));
  bindTotalVolumePair();

  document.getElementById("btn-add")?.addEventListener("click", () => {
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
    enable_summary: !!r.enable_summary,
    summary_daily_gb: r.summary_daily_gb ?? "",
    summary_index_name: r.summary_index_name ?? "",
    enabled: r.enabled !== false,
    notes: r.notes || "",
  }));
  list.forEach((row) => {
    if (numOr0(row.daily_gb) > 0) syncRowVolumePair(row, list, "daily_gb");
    else if (numOr0(row.eps) > 0) syncRowVolumePair(row, list, "eps");
  });
  return list;
}
