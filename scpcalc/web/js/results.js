import { state, reduceMotion } from "./state.js";
import { escapeAttr } from "./util.js";
import { tipCatalog, bindTips } from "./tips-ui.js";
import { activateTab } from "./tabs.js";
import { buildPlanBody } from "./plan-form.js";
import { setConfText, syncVolStateFromGlobals } from "./conf-editor.js";
import { renderAllCharts } from "./charts.js";
import { closeWizard, showStep } from "./wizard.js";
import { runPlan } from "./engine.js";

export async function runCalculate() {
  const err = document.getElementById("err");
  const btnCalc = document.getElementById("btn-wiz-calc");
  const out = document.getElementById("out");
  const metrics = document.getElementById("metrics");
  const designEl = document.getElementById("design");
  const resourcesEl = document.getElementById("resources");
  const settingsEl = document.getElementById("settings");
  const resBody = document.getElementById("res-body");
  const ixBody = document.getElementById("ix-body");

  if (err) err.hidden = true;
  btnCalc?.classList.add("loading");
  try {
    const body = buildPlanBody();
    const data = await runPlan(body);

    const d = data.design || {};
    const shLabel = d.combined_instance
      ? "1 combined"
      : d.n_sh_es && d.n_sh_itsi
        ? `${d.n_sh} (ES ${d.n_sh_es} + ITSI ${d.n_sh_itsi})`
        : d.n_sh;
    const rowsM = [
      ["Mode", data.mode],
      ["Concurrent users", d.concurrent_users],
      ["Total daily raw GB/day", data.total_daily_raw_gb],
      ["Compression factor", data.compression_factor],
      ["Total on-disk GB/day", data.total_daily_on_disk_gb],
      ["Total searchable TB", data.total_searchable_tb],
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
          const cpu = r.cpu_cores ? `${r.cpu_cores}c / ${r.vcpu} vCPU` : "—";
          const ram = r.ram_gb ? `${r.ram_gb} GB` : "—";
          const disk = r.disk_gb_hint ? `≈${Math.round(r.disk_gb_hint)} GB` : "—";
          return `<tr title="${escapeAttr(r.notes || "")}">
            <td>${escapeAttr(r.role)}</td>
            <td>${r.count}</td>
            <td>${escapeAttr(r.tier)}</td>
            <td>${cpu}</td>
            <td>${ram}</td>
            <td>${escapeAttr(r.storage_type || "")}</td>
            <td>${disk}</td>
          </tr>`;
        })
        .join("");
    }

    if (ixBody) {
      ixBody.innerHTML = (data.indexes || [])
        .map((ix) => {
          const sum = ix.summary_index_name
            ? `${ix.summary_index_name}<br><small>${ix.summary_daily_raw_gb} GB/d → ${ix.summary_max_total_data_size_mb} MB</small>`
            : "—";
          return `<tr>
            <td>${escapeAttr(ix.index_name)}</td>
            <td>${ix.daily_raw_gb}</td>
            <td>${ix.daily_on_disk_gb}</td>
            <td>${ix.searchable_tb}</td>
            <td>${ix.max_total_data_size_mb}</td>
            <td>${ix.home_path_max_data_size_mb}</td>
            <td>${sum}</td>
          </tr>`;
        })
        .join("");
    }

    state.lastConf = data.indexes_conf || "";
    state.lastConfGenerated = state.lastConf;
    syncVolStateFromGlobals();
    setConfText(state.lastConf, true);
    state.lastPlan = data;
    renderAllCharts(data);
    closeWizard();
    if (out) {
      out.hidden = false;
      activateTab("results", "overview");
      out.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }
  } catch (ex) {
    if (err) {
      err.hidden = false;
      err.textContent = ex.message || String(ex);
    }
    showStep(4);
  } finally {
    btnCalc?.classList.remove("loading");
  }
}
