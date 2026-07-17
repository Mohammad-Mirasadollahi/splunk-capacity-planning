import { state } from "./state.js";
import { escapeAttr } from "./util.js";

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

export function renderRows() {
  const srcBody = document.getElementById("src-body");
  if (!srcBody) return;
  srcBody.innerHTML = state.rows
    .map((r, i) => {
      const title = r.notes ? ` title="${escapeAttr(r.notes)}"` : "";
      return `<tr data-i="${i}">
          <td><input type="checkbox" data-f="enabled" ${r.enabled ? "checked" : ""}></td>
          <td${title}><input type="text" data-f="label" value="${escapeAttr(r.label)}"></td>
          <td><input type="text" data-f="index_name" value="${escapeAttr(r.index_name)}"></td>
          <td><input type="number" data-f="event_bytes" min="1" step="1" value="${r.event_bytes}"></td>
          <td><input type="number" data-f="daily_gb" min="0" step="any" value="${r.daily_gb}" placeholder="GB/day"></td>
          <td><input type="number" data-f="eps" min="0" step="any" value="${r.eps}" placeholder="EPS"></td>
          <td class="src-col-adv"><input type="number" data-f="retention_days" min="0" step="1" value="${r.retention_days}" placeholder="glob"></td>
          <td class="src-col-adv"><input type="number" data-f="hot_warm_days" min="0" step="1" value="${r.hot_warm_days}" placeholder="glob"></td>
          <td class="src-col-adv"><input type="checkbox" data-f="enable_summary" ${r.enable_summary ? "checked" : ""}></td>
          <td class="src-col-adv"><input type="number" data-f="summary_daily_gb" min="0" step="any" value="${r.summary_daily_gb}" placeholder="auto%"></td>
          <td><button type="button" class="btn-x" data-rm="${i}" aria-label="Remove">×</button></td>
        </tr>`;
    })
    .join("");
}

export function bindSourcesTable() {
  const srcBody = document.getElementById("src-body");
  if (!srcBody) return;

  srcBody.addEventListener("change", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const i = Number(tr.dataset.i);
    const f = e.target.dataset.f;
    if (!f || !state.rows[i]) return;
    if (e.target.type === "checkbox") state.rows[i][f] = e.target.checked;
    else state.rows[i][f] = e.target.value;
  });
  srcBody.addEventListener("input", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const i = Number(tr.dataset.i);
    const f = e.target.dataset.f;
    if (!f || !state.rows[i] || e.target.type === "checkbox") return;
    state.rows[i][f] = e.target.value;
  });
  srcBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rm]");
    if (!btn) return;
    state.rows.splice(Number(btn.dataset.rm), 1);
    renderRows();
  });

  document.getElementById("btn-add")?.addEventListener("click", () => {
    state.rows.push(blankCustom());
    renderRows();
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
