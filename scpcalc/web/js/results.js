import { state, reduceMotion } from "./state.js";
import { escapeAttr } from "./util.js";
import { tipCatalog, bindTips } from "./tips-ui.js";
import { activateTab } from "./tabs.js";
import { buildPlanBody } from "./plan-form.js";
import { setConfText, syncVolStateFromGlobals } from "./conf-editor.js";
import { renderAllCharts } from "./charts.js";
import { closeWizard, showStep } from "./wizard.js";
import { runPlan } from "./engine.js";
import { t } from "./i18n.js";
import { askSuggestions, updateAutoRecBadges, pendingSuggestions } from "./suggestions.js";

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
    resBody.innerHTML = (d.resources || [])
      .map((r) => {
        const phys = r.cpu_physical_cores || r.cpu_cores || 0;
        const logi = r.cpu_logical_vcpu || r.vcpu || 0;
        const cpuPhys = phys ? `${phys} physical @ ≥2 GHz` : "—";
        const cpuLog = logi ? `${logi} logical / vCPU (HT 2×)` : "—";
        const ram = r.ram_gb ? `${r.ram_gb} GB` : "—";
        const disk = r.disk_gb_hint ? `≈${Math.round(r.disk_gb_hint)} GB` : "—";
        const net = r.network || "—";
        const virt = r.virt_cpu_rule || (phys ? "Reserve full CPU/RAM — no oversubscribe" : "—");
        const para = r.splunk_parallelization || "—";
        const iops = r.iops_hint || (r.iops_min ? `≥${r.iops_min} IOPS` : "—");
        const raid = r.raid_hint || "—";
        const notes = r.notes || "—";
        const find = [
          r.role,
          r.count,
          r.tier,
          cpuPhys,
          cpuLog,
          ram,
          iops,
          raid,
          r.storage_type,
          disk,
          net,
          virt,
          para,
          notes,
          "physical",
          "logical",
          "vCPU",
          "RAID",
          "IOPS",
        ]
          .filter(Boolean)
          .join(" ");
        return `<tr data-find="${escapeAttr(find)}" title="${escapeAttr([r.cpu_logical_rule, r.virt_cpu_rule, r.splunk_parallelization, r.iops_hint, r.raid_hint, r.notes].filter(Boolean).join(" | "))}">
            <td>${escapeAttr(r.role)}</td>
            <td>${r.count}</td>
            <td>${escapeAttr(r.tier)}</td>
            <td><strong>${escapeAttr(cpuPhys)}</strong></td>
            <td>${escapeAttr(cpuLog)}</td>
            <td>${ram}</td>
            <td class="cell-notes">${escapeAttr(iops)}</td>
            <td class="cell-notes">${escapeAttr(raid)}</td>
            <td>${escapeAttr(r.storage_type || "")}</td>
            <td>${disk}</td>
            <td>${escapeAttr(net)}</td>
            <td class="cell-notes">${escapeAttr(virt)}</td>
            <td class="cell-notes">${escapeAttr(para)}</td>
            <td class="cell-notes">${escapeAttr(notes)}</td>
          </tr>`;
      })
      .join("");
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
            <td>${escapeAttr(ix.index_name)}</td>
            <td>${escapeAttr(label)}</td>
            <td>${ix.event_bytes ?? "—"}</td>
            <td>${ix.daily_raw_gb}</td>
            <td>${ix.daily_on_disk_gb}</td>
            <td>${ix.searchable_tb}</td>
            <td>${ix.max_total_data_size_mb}</td>
            <td>${ix.home_path_max_data_size_mb}</td>
            <td>${coldMB}</td>
            <td>${escapeAttr(ix.max_data_size || "—")}</td>
            <td>${frozenDays}</td>
            <td>${escapeAttr(sum)}</td>
          </tr>`;
      })
      .join("");
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

  if (err) err.hidden = true;
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
    showStep(3);
  } finally {
    btnCalc?.classList.remove("loading");
  }
}
