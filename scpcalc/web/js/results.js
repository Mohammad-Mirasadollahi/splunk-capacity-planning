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
  wire("res-find", "res-body", "res-find-count");
  wire("ix-find", "ix-body", "ix-find-count");
  wire("node-find", "node-pick-body", "node-find-count");
}

function renderNodeDetail() {
  const nodes = state.planNodes || [];
  const selected = nodes.filter((n) => n.selected);
  const body = document.getElementById("node-detail-body");
  const wrap = document.getElementById("node-detail-wrap");
  const empty = document.getElementById("node-detail-empty");
  if (!body) return;
  if (!selected.length) {
    body.innerHTML = "";
    if (wrap) wrap.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }
  if (wrap) wrap.hidden = false;
  if (empty) empty.hidden = true;
  body.innerHTML = selected
    .map((n) => {
      const s = formatLayerSpecs(n.layer || {});
      const find = [n.label, n.id, n.role, n.tier, s.cpuPhys, s.cpuLog, s.ram, s.iops, s.raid, s.storage, s.disk, s.net, s.virt, s.para, s.notes]
        .filter(Boolean)
        .join(" ");
      return `<tr data-find="${escapeAttr(find)}">
        <td><strong>${escapeAttr(n.label)}</strong></td>
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
  bindTips(body);
}

function renderNodePicker() {
  const body = document.getElementById("node-pick-body");
  if (!body) return;
  const nodes = state.planNodes || [];
  body.innerHTML = nodes
    .map((n, i) => {
      const s = formatLayerSpecs(n.layer || {});
      const find = [n.label, n.id, n.role, n.tier, s.ram, s.cpuPhys, s.disk, "peer", "node"].filter(Boolean).join(" ");
      return `<tr data-node-idx="${i}" data-find="${escapeAttr(find)}" class="${n.selected ? "is-node-selected" : ""}">
        <td class="col-check"><input type="checkbox" data-node-check ${n.selected ? "checked" : ""} aria-label="${escapeAttr(n.id)}"></td>
        <td><span class="node-label-pill">${escapeAttr(n.label)}</span></td>
        <td><code>${escapeAttr(n.id)}</code></td>
        <td>${escapeAttr(n.role)}</td>
        <td>${escapeAttr(n.tier)}</td>
        <td>${escapeAttr(s.ram)}</td>
        <td>${escapeAttr(s.cpuPhys)}</td>
        <td>${escapeAttr(s.disk)}</td>
      </tr>`;
    })
    .join("");
  applyTableFind("node-find", "node-pick-body", "node-find-count");
  renderNodeDetail();
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
      renderNodeDetail();
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
      renderNodeDetail();
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
  const resBody = document.getElementById("res-body");
  const ixBody = document.getElementById("ix-body");

  const d = data.design || {};
  updateAutoRecBadges(d);

  const shLabel = d.combined_instance
    ? "1 combined"
    : d.n_sh_es && d.n_sh_itsi
      ? `${d.n_sh} (ES ${d.n_sh_es} + ITSI ${d.n_sh_itsi})`
      : d.n_sh;
  const rowsM = [
    ["Concurrent users", d.concurrent_users],
    ["Peak concurrent searches", d.concurrent_searches],
    ["Saved / scheduled searches", d.saved_searches],
    ["Total daily raw GB/day", data.total_daily_raw_gb],
    ["Compression factor", data.compression_factor],
    ["Total on-disk GB/day", data.total_daily_on_disk_gb],
    ["Total searchable TB", data.total_searchable_tb],
    ["Auto N_SH", d.auto_n_sh || d.n_sh],
    ["Auto N_IDX", d.auto_n_idx || d.n_idx],
    ["N_SH", shLabel],
    ["N_IDX", d.combined_instance ? "1 combined" : d.n_idx],
    ["hot need GB", d.hot_need_gb],
    ["cold need GB", d.cold_need_gb],
    ["summaries need GB", d.summaries_need_gb],
  ];
  if (d.base_n_sh || d.base_n_idx) {
    rowsM.splice(7, 0, [
      "Table baseline (SH+IDX)",
      d.combined_instance && d.base_n_sh === 1 && d.base_n_idx === 1
        ? "combined"
        : `${d.base_n_sh || "—"} + ${d.base_n_idx || "—"}`,
    ]);
  }
  if (d.cluster_manager) rowsM.push(["Cluster manager", 1]);
  if (d.shc_deployer) rowsM.push(["SHC deployer", 1]);
  if (d.max_daily_gb_from_disk) rowsM.push(["Max daily from disk", d.max_daily_gb_from_disk]);
  if (d.local_cache_total_gb) rowsM.push(["SmartStore cache GB", d.local_cache_total_gb]);

  if (metrics) {
    metrics.innerHTML = rowsM
      .map(([k, v], i) => {
        const tipKey = tipCatalog()[k] ? k : "";
        const label = tipKey
          ? `<span class="tip-mark k" data-tip="${escapeAttr(tipKey)}">${escapeAttr(k)}</span>`
          : `<span class="k">${escapeAttr(k)}</span>`;
        return `<article class="metric-card" style="animation-delay:${i * 35}ms">${label}<span class="v">${v ?? "—"}</span></article>`;
      })
      .join("");
    if (d.node_plan_text) {
      metrics.innerHTML += `<article class="metric-card wide" style="animation-delay:${rowsM.length * 35}ms"><span class="k tip-mark" data-tip="N_SH">How node counts were chosen</span><pre class="metric-pre">${escapeAttr(d.node_plan_text)}</pre></article>`;
    }
    if (data.warnings?.length) {
      metrics.innerHTML += data.warnings
        .map(
          (w, i) =>
            `<article class="metric-card warn" style="animation-delay:${(rowsM.length + 1 + i) * 35}ms"><span class="k">Warning</span><span class="v">${escapeAttr(w)}</span></article>`
        )
        .join("");
    }
    bindTips(metrics);
  }

  if (designEl) designEl.textContent = d.structure_text || "";
  if (settingsEl) settingsEl.textContent = d.settings_text || "";
  if (resourcesEl) resourcesEl.textContent = d.resources_text || "";
  state.lastDesignTxt = [d.node_plan_text || "", d.structure_text || "", d.resources_text || "", d.settings_text || ""]
    .filter(Boolean)
    .join("\n\n");

  if (resBody) {
    state.planNodes = expandResourceNodes(d.resources || []);
    renderNodePicker();

    resBody.innerHTML = (d.resources || [])
      .map((r) => {
        const s = formatLayerSpecs(r);
        const find = [
          r.role,
          r.count,
          r.tier,
          s.cpuPhys,
          s.cpuLog,
          s.ram,
          s.iops,
          s.raid,
          r.storage_type,
          s.disk,
          s.net,
          s.virt,
          s.para,
          s.notes,
          "physical",
          "logical",
          "vCPU",
          "RAID",
          "IOPS",
        ]
          .filter(Boolean)
          .join(" ");
        const softTip = [
          r.cpu_logical_rule,
          r.virt_cpu_rule,
          r.splunk_parallelization,
          r.iops_hint,
          r.raid_hint,
          r.notes,
        ]
          .filter(Boolean)
          .join(" | ");
        return `<tr data-find="${escapeAttr(find)}"${softTip ? ` data-soft-tip="${escapeAttr(softTip)}" data-soft-tip-title="${escapeAttr(r.role || "Layer")}"` : ""}>
            <td>${escapeAttr(r.role)}</td>
            <td>${r.count}</td>
            <td>${escapeAttr(r.tier)}</td>
            <td><strong>${escapeAttr(s.cpuPhys)}</strong></td>
            <td>${escapeAttr(s.cpuLog)}</td>
            <td>${s.ram}</td>
            <td class="cell-notes">${escapeAttr(s.iops)}</td>
            <td class="cell-notes">${escapeAttr(s.raid)}</td>
            <td>${escapeAttr(r.storage_type || "")}</td>
            <td>${s.disk}</td>
            <td>${escapeAttr(s.net)}</td>
            <td class="cell-notes">${escapeAttr(s.virt)}</td>
            <td class="cell-notes">${escapeAttr(s.para)}</td>
            <td class="cell-notes">${escapeAttr(s.notes)}</td>
          </tr>`;
      })
      .join("");
    bindTips(resBody);
  }

  if (ixBody) {
    ixBody.innerHTML = (data.indexes || [])
      .map((ix) => {
        const frozenDays =
          ix.frozen_time_period_in_secs != null
            ? Math.round(Number(ix.frozen_time_period_in_secs) / 86400)
            : "—";
        const sum = ix.summary_index_name
          ? `${ix.summary_index_name} · ${ix.summary_daily_raw_gb} GB/d · ${ix.summary_max_total_data_size_mb} MB`
          : "—";
        const label = ix.label || ix.key || "—";
        const coldMB =
          ix.cold_path_max_data_size_mb != null
            ? ix.cold_path_max_data_size_mb
            : Math.max(0, Number(ix.max_total_data_size_mb || 0) - Number(ix.home_path_max_data_size_mb || 0));
        const find = [
          ix.index_name,
          label,
          ix.event_bytes,
          ix.daily_raw_gb,
          ix.daily_on_disk_gb,
          ix.searchable_tb,
          ix.max_total_data_size_mb,
          ix.home_path_max_data_size_mb,
          coldMB,
          ix.max_data_size,
          frozenDays,
          sum,
        ]
          .filter((x) => x != null && x !== "")
          .join(" ");
        return `<tr data-find="${escapeAttr(find)}">
            <td data-sort="${escapeAttr(String(ix.index_name || ""))}">${escapeAttr(ix.index_name)}</td>
            <td data-sort="${escapeAttr(String(label))}">${escapeAttr(label)}</td>
            <td data-sort="${Number(ix.event_bytes) || 0}">${ix.event_bytes ?? "—"} <span class="unit">B</span></td>
            <td data-sort="${Number(ix.daily_raw_gb) || 0}">${ix.daily_raw_gb} <span class="unit">GB/d</span></td>
            <td data-sort="${Number(ix.daily_on_disk_gb) || 0}">${ix.daily_on_disk_gb} <span class="unit">GB/d</span></td>
            <td data-sort="${Number(ix.searchable_tb) || 0}">${ix.searchable_tb} <span class="unit">TB</span></td>
            <td data-sort="${Number(ix.max_total_data_size_mb) || 0}">${ix.max_total_data_size_mb} <span class="unit">MB</span></td>
            <td data-sort="${Number(ix.home_path_max_data_size_mb) || 0}">${ix.home_path_max_data_size_mb} <span class="unit">MB</span></td>
            <td data-sort="${Number(coldMB) || 0}">${coldMB} <span class="unit">MB</span></td>
            <td data-sort="${escapeAttr(String(ix.max_data_size || ""))}">${escapeAttr(ix.max_data_size || "—")}</td>
            <td data-sort="${frozenDays === "—" ? -1 : Number(frozenDays) || 0}">${frozenDays}${frozenDays === "—" ? "" : ` <span class="unit">d</span>`}</td>
            <td data-sort="${escapeAttr(sum)}">${escapeAttr(sum)}</td>
          </tr>`;
      })
      .join("");
    bindTips(document.querySelector("#ix-table thead"));
    bindTableSort("ix-table");
    applyTableFind("ix-find", "ix-body", "ix-find-count");
  }

  bindResultTableFind();
  applyTableFind("res-find", "res-body", "res-find-count");
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
    showStep(diskBudget ? 2 : 1);
    activateTab(diskBudget ? "reten" : "volume", diskBudget ? "ret-policy" : "vol-sources");
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
      showStep(msg.includes("available_summaries") ? 1 : 2);
      if (!msg.includes("available_summaries")) activateTab("reten", "ret-policy");
      else activateTab("volume", "vol-budget");
    } else {
      showStep(STEPS - 1);
    }
  } finally {
    btnCalc?.classList.remove("loading");
  }
}
