import { state } from "./state.js";
import { escapeAttr } from "./util.js";
import { t } from "./i18n.js";
import {
  fillMissingEPSFromAverage,
  formatDailyGB,
  formatEPS,
  rowCounterpart,
  totalEPSFromDailyGB,
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

function counterpartHTML(row, mode) {
  const c = rowCounterpart(row, state.rows, mode);
  if (!(c.value > 0)) {
    return `<span class="vol-counterpart is-empty">${escapeAttr(t("vol_counterpart_empty"))}</span>`;
  }
  if (c.kind === "eps") {
    const label = t("vol_counterpart_eps").replace("{n}", formatEPS(c.value));
    return `<span class="vol-counterpart" title="${escapeAttr(t("vol_counterpart_eps_title"))}">${escapeAttr(label)}</span>`;
  }
  const key = c.fromAvg ? "vol_counterpart_gb_avg" : "vol_counterpart_gb";
  const label = t(key).replace("{n}", formatDailyGB(c.value));
  const title = c.fromAvg ? t("vol_counterpart_gb_avg_title") : t("vol_counterpart_gb_title");
  return `<span class="vol-counterpart${c.fromAvg ? " is-avg" : ""}" title="${escapeAttr(title)}">${escapeAttr(label)}</span>`;
}

function volumeCell(r, on, mode) {
  if (mode === "eps") {
    return `<div class="vol-cell">
      <input type="number" data-f="eps" min="0" step="any" value="${r.eps}" placeholder="EPS" ${on ? "" : "disabled"}>
      ${counterpartHTML(r, mode)}
    </div>`;
  }
  return `<div class="vol-cell">
    <input type="number" data-f="daily_gb" min="0" step="any" value="${r.daily_gb}" placeholder="GB/day" ${on ? "" : "disabled"}>
    ${counterpartHTML(r, mode)}
  </div>`;
}

export function refreshTotalCounterpart() {
  const el = document.getElementById("total-daily-counterpart");
  const input = document.querySelector('input[name="total_daily_gb"]');
  if (!el || !input) return;
  const eps = totalEPSFromDailyGB(input.value, state.rows);
  if (!(eps > 0)) {
    el.textContent = t("vol_counterpart_empty");
    el.classList.add("is-empty");
    el.removeAttribute("title");
    return;
  }
  el.classList.remove("is-empty");
  el.textContent = t("vol_counterpart_eps").replace("{n}", formatEPS(eps));
  el.title = t("vol_total_counterpart_title");
}

function volumeRowHTML(r, i, mode) {
  const title = r.notes ? ` title="${escapeAttr(r.notes)}"` : "";
  const on = !!r.enabled;
  return `<tr data-i="${i}" class="${on ? "src-row-on" : "src-row-off"}">
    <td><input type="checkbox" data-f="enabled" class="src-toggle" ${on ? "checked" : ""} aria-label="Use source"></td>
    <td${title}><input type="text" data-f="label" value="${escapeAttr(r.label)}" ${on ? "" : "disabled"}></td>
    <td><input type="text" data-f="index_name" value="${escapeAttr(r.index_name)}" ${on ? "" : "disabled"}></td>
    <td class="src-col-event-bytes"><input type="number" data-f="event_bytes" min="1" step="1" value="${r.event_bytes}" ${on ? "" : "disabled"}></td>
    <td class="src-col-vol">${volumeCell(r, on, mode)}</td>
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
  const mode = state.volumeInputMode === "eps" ? "eps" : "daily_gb";
  if (mode === "eps") fillMissingEPSFromAverage(state.rows);

  if (srcBody) {
    srcBody.innerHTML = state.rows.map((r, i) => volumeRowHTML(r, i, mode)).join("");
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
      if (f === "daily_gb" || f === "eps" || f === "event_bytes" || f === "label" || f === "index_name") {
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
      const mode = state.volumeInputMode === "eps" ? "eps" : "daily_gb";
      const cell = tr.querySelector(".vol-cell");
      const tip = cell?.querySelector(".vol-counterpart");
      if (tip) {
        const wrap = document.createElement("div");
        wrap.innerHTML = counterpartHTML(state.rows[i], mode);
        tip.replaceWith(wrap.firstElementChild);
      }
      refreshTotalCounterpart();
    } else if (f === "label" || f === "index_name") {
      // Keep the paired table in sync without full remount of the active input.
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

export function bindSourcesTable() {
  bindTableBody(document.getElementById("src-body"));
  bindTableBody(document.getElementById("src-ret-body"));

  document.getElementById("btn-add")?.addEventListener("click", () => {
    state.rows.push(blankCustom());
    renderRows();
  });

  document.querySelector('input[name="total_daily_gb"]')?.addEventListener("input", () => {
    refreshTotalCounterpart();
  });
}

export function normalizeSnapshotRows(rows) {
  return rows.map((r) => ({
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
}
