import { state, reduceMotion, STEPS } from "./state.js";
import { escapeAttr } from "./util.js";
import { tipCatalog, bindTips } from "./tips-ui.js";
import { activateTab } from "./tabs.js";
import { buildPlanBody } from "./plan-form.js";
import { refreshVolumeBudgetUI } from "./volume-budget.js";
import { setConfText, syncVolStateFromGlobals } from "./conf-editor.js";
import { renderAllCharts } from "./charts.js";
import { closeWizard, showStep } from "./wizard.js";
import { runPlan } from "./engine.js";
import { t } from "./i18n.js";
import { askSuggestions, updateAutoRecBadges, pendingSuggestions } from "./suggestions.js";
import { expandResourceNodes, formatLayerSpecs } from "./nodes.js";
import {
  buildMetricSections,
  renderMetricSectionsHTML,
  renderRetentionStorageHTML,
  renderIndexRowsHTML,
} from "./plan-display.js";
import { collectGlobals } from "./plan-form.js";

function applyTableFind(inputId, tbodyId, countId) {
  const input = document.getElementById(inputId);
  const tbody = document.getElementById(tbodyId);
  const countEl = document.getElementById(countId);
  if (!input || !tbody) return;
  const q = (input.value || "").trim().toLowerCase();
  let shown = 0;
  let total = 0;
  tbody.querySelectorAll("tr").forEach((tr) => {
    total += 1;
    const hay = (tr.dataset.find || tr.textContent || "").toLowerCase();
    const match = !q || hay.includes(q);
    tr.hidden = !match;
    tr.classList.toggle("is-find-hit", Boolean(q && match));
    if (match) shown += 1;
  });
  if (countEl) {
    if (!q) {
      countEl.hidden = true;
      countEl.textContent = "";
    } else {
      countEl.hidden = false;
      countEl.textContent = t("table_find_count").replace("{n}", String(shown)).replace("{t}", String(total));
    }
  }
}

export function bindResultTableFind() {
  const wire = (inputId, tbodyId, countId) => {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("input", () => applyTableFind(inputId, tbodyId, countId));
    input.addEventListener("search", () => applyTableFind(inputId, tbodyId, countId));
  };
  wire("ix-find", "ix-body", "ix-find-count");
  wire("node-find", "node-pick-body", "node-find-count");
}

function renderNodePicker() {
  const body = document.getElementById("node-pick-body");
  if (!body) return;
  const nodes = state.planNodes || [];
  body.innerHTML = nodes
    .map((n, i) => {
      const s = formatLayerSpecs(n.layer || {});
      const find = [n.label, n.id, n.role, n.tier, s.cpuPhys, s.cpuLog, s.ram, s.iops, s.raid, s.storage, s.disk, s.net, s.virt, s.para, s.notes, "peer", "node"]
        .filter(Boolean)
        .join(" ");
      return `<tr data-node-idx="${i}" data-find="${escapeAttr(find)}" class="${n.selected ? "is-node-selected" : ""}">
        <td class="col-check"><input type="checkbox" id="node-sel-${i}" name="node_sel_${i}" data-node-check ${n.selected ? "checked" : ""} aria-label="${escapeAttr(n.id)}"></td>
        <td><span class="node-label-pill">${escapeAttr(n.label)}</span></td>
        <td><code>${escapeAttr(n.id)}</code></td>
        <td>${escapeAttr(n.role)}</td>
        <td>${escapeAttr(n.tier)}</td>
        <td><strong>${escapeAttr(s.cpuPhys)}</strong></td>
        <td>${escapeAttr(s.cpuLog)}</td>
        <td>${escapeAttr(s.ram)}</td>
        <td class="cell-notes">${escapeAttr(s.iops)}</td>
        <td class="cell-notes">${escapeAttr(s.raid)}</td>
        <td>${escapeAttr(s.storage)}</td>
        <td>${escapeAttr(s.disk)}</td>
        <td>${escapeAttr(s.net)}</td>
        <td class="cell-notes">${escapeAttr(s.virt)}</td>
        <td class="cell-notes">${escapeAttr(s.para)}</td>
        <td class="cell-notes">${escapeAttr(s.notes)}</td>
      </tr>`;
    })
    .join("");
  applyTableFind("node-find", "node-pick-body", "node-find-count");
  bindTips(body);
}

export function bindNodePicker() {
  const body = document.getElementById("node-pick-body");
  if (body && body.dataset.nodeBound !== "1") {
    body.dataset.nodeBound = "1";
    body.addEventListener("change", (e) => {
      const cb = e.target?.closest?.("[data-node-check]");
      if (!cb) return;
      const tr = cb.closest("tr");
      const idx = Number(tr?.dataset?.nodeIdx);
      if (!Number.isFinite(idx) || !state.planNodes?.[idx]) return;
      state.planNodes[idx].selected = !!cb.checked;
      tr.classList.toggle("is-node-selected", !!cb.checked);
    });
    body.addEventListener("click", (e) => {
      if (e.target?.closest?.("[data-node-check]")) return;
      const tr = e.target?.closest?.("tr[data-node-idx]");
      if (!tr) return;
      const idx = Number(tr.dataset.nodeIdx);
      const cb = tr.querySelector("[data-node-check]");
      if (!Number.isFinite(idx) || !state.planNodes?.[idx] || !cb) return;
      cb.checked = !cb.checked;
      state.planNodes[idx].selected = cb.checked;
      tr.classList.toggle("is-node-selected", cb.checked);
    });
  }
  const allBtn = document.getElementById("btn-node-select-all");
  if (allBtn && allBtn.dataset.bound !== "1") {
    allBtn.dataset.bound = "1";
    allBtn.addEventListener("click", () => {
      (state.planNodes || []).forEach((n) => {
        n.selected = true;
      });
      renderNodePicker();
    });
  }
  const noneBtn = document.getElementById("btn-node-select-none");
  if (noneBtn && noneBtn.dataset.bound !== "1") {
    noneBtn.dataset.bound = "1";
    noneBtn.addEventListener("click", () => {
      (state.planNodes || []).forEach((n) => {
        n.selected = false;
      });
      renderNodePicker();
    });
  }
}

/** Click column headers to sort. Uses data-sort on each <td> when present. */
export function bindTableSort(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const heads = table.querySelectorAll("thead th[data-sort-key]");
  if (!heads.length) return;
  if (table.dataset.sortBound === "1") return;
  table.dataset.sortBound = "1";

  heads.forEach((th, colIdx) => {
    th.classList.add("sortable");
    th.setAttribute("role", "columnheader");
    th.tabIndex = 0;
    if (!th.getAttribute("aria-sort")) th.setAttribute("aria-sort", "none");
    th.title = ""; // native title off — soft tip handles help
    const sortCol = () => {
      const asc = th.getAttribute("aria-sort") !== "ascending";
      heads.forEach((h) => {
        h.setAttribute("aria-sort", "none");
      });
      th.setAttribute("aria-sort", asc ? "ascending" : "descending");
      const tbody = table.tBodies[0];
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.sort((a, b) => {
        const ac = a.children[colIdx];
        const bc = b.children[colIdx];
        const av = ac?.dataset?.sort ?? ac?.textContent ?? "";
        const bv = bc?.dataset?.sort ?? bc?.textContent ?? "";
        const an = Number(av);
        const bn = Number(bv);
        const bothNum =
          Number.isFinite(an) &&
          Number.isFinite(bn) &&
          String(av).trim() !== "" &&
          String(bv).trim() !== "" &&
          !Number.isNaN(an) &&
          !Number.isNaN(bn);
        let cmp = 0;
        if (bothNum) cmp = an - bn;
        else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
        return asc ? cmp : -cmp;
      });
      rows.forEach((r) => tbody.appendChild(r));
      const findId = tableId === "ix-table" ? "ix-find" : tableId === "res-table" ? "res-find" : null;
      if (findId) {
        const countId = findId === "ix-find" ? "ix-find-count" : "res-find-count";
        const bodyId = findId === "ix-find" ? "ix-body" : "res-body";
        applyTableFind(findId, bodyId, countId);
      }
    };
    th.addEventListener("click", (e) => {
      // Don't steal clicks from tip interaction — tip is hover only.
      e.preventDefault();
      sortCol();
    });
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        sortCol();
      }
    });
  });
  bindTips(table.querySelector("thead"));
}

function renderPlanResult(data) {
  const err = document.getElementById("err");
  const out = document.getElementById("out");
  const metrics = document.getElementById("metrics");
  const designEl = document.getElementById("design");
  const resourcesEl = document.getElementById("resources");
  const settingsEl = document.getElementById("settings");
  const ixBody = document.getElementById("ix-body");

  const d = data.design || {};
  updateAutoRecBadges(d);

  const g = collectGlobals();
  const viz = document.getElementById("results-viz");
  if (viz) {
    viz.hidden = false;
    viz.innerHTML = renderRetentionStorageHTML(data, g);
  }
  if (metrics) {
    metrics.innerHTML = renderMetricSectionsHTML(buildMetricSections(data, g), {
      tipLookup: tipCatalog(),
      animate: true,
    });
    bindTips(metrics);
  }
  const overviewCharts = document.getElementById("results-charts");
  if (overviewCharts) {
    renderAllCharts(data, { hostId: "results-charts", idPrefix: "results" });
  }

  if (designEl) designEl.textContent = d.structure_text || "";
  if (settingsEl) settingsEl.textContent = d.settings_text || "";
  if (resourcesEl) resourcesEl.textContent = d.resources_text || "";
  state.lastDesignTxt = [d.node_plan_text || "", d.structure_text || "", d.resources_text || "", d.settings_text || ""]
    .filter(Boolean)
    .join("\n\n");

  state.planNodes = expandResourceNodes(d.resources || []);
  renderNodePicker();


  if (ixBody) {
    ixBody.innerHTML = renderIndexRowsHTML(data.indexes || []);
    bindTips(document.querySelector("#ix-table thead"));
    bindTableSort("ix-table");
    applyTableFind("ix-find", "ix-body", "ix-find-count");
  }

  bindResultTableFind();
  applyTableFind("ix-find", "ix-body", "ix-find-count");

  state.lastConf = data.indexes_conf || "";
  state.lastConfGenerated = state.lastConf;
  syncVolStateFromGlobals();
  setConfText(state.lastConf, true);
  state.lastPlan = data;
  renderAllCharts(data);
  if (err) err.hidden = true;
  closeWizard();
  if (out) {
    out.hidden = false;
    activateTab("results", "overview");
    out.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }
}

export async function runCalculate() {
  const err = document.getElementById("err");
  const btnCalc = document.getElementById("btn-wiz-calc");

  if (err) {
    err.hidden = true;
    delete err.dataset.budgetErr;
  }
  const budget = refreshVolumeBudgetUI();
  if (!budget.ok) {
    if (err) {
      err.hidden = false;
      err.textContent = budget.message;
      err.dataset.budgetErr = "1";
    }
    const diskBudget = /available_|disk need|دیسک|hot\/warm|hot\+cold|searchable disk/i.test(budget.message);
    showStep(1);
    activateTab("volume", diskBudget ? "vol-policy" : "vol-sources");
    return;
  }

  btnCalc?.classList.add("loading");
  try {
    let data = await runPlan(buildPlanBody());
    if (pendingSuggestions(data.design).length) {
      btnCalc?.classList.remove("loading");
      const decision = await askSuggestions(data.design);
      if (decision === "accept") {
        btnCalc?.classList.add("loading");
        data = await runPlan(buildPlanBody());
      }
    }
    renderPlanResult(data);
  } catch (ex) {
    if (err) {
      err.hidden = false;
      err.textContent = ex.message || String(ex);
    }
    const msg = String(ex.message || ex);
    if (msg.includes("total_daily_gb")) {
      showStep(1);
      activateTab("volume", "vol-sources");
    } else if (msg.includes("available_hot") || msg.includes("available_cold") || msg.includes("available_summaries")) {
      showStep(1);
      activateTab("volume", "vol-policy");
    } else {
      showStep(STEPS - 1);
    }
  } finally {
    btnCalc?.classList.remove("loading");
  }
}
