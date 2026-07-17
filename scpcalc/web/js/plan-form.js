import { state } from "./state.js";
import { num } from "./util.js";
import { t } from "./i18n.js";
import { normalizeSnapshotRows, refreshTotalCounterpart, renderRows } from "./sources.js";
import { convertRowsForMode, resolveEPS, resolveEventBytes, dailyGBFromEPS, formatDailyGB, numOr0 } from "./volume-convert.js";

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
}

export function syncVolumeInputMode(mode, { convert = false } = {}) {
  const prev = state.volumeInputMode === "eps" ? "eps" : "daily_gb";
  const next = mode === "eps" ? "eps" : "daily_gb";
  state.volumeInputMode = next;
  const table = document.getElementById("src-table");
  if (table) {
    table.classList.toggle("src-table--vol-gb", next === "daily_gb");
    table.classList.toggle("src-table--vol-eps", next === "eps");
  }
  document.querySelectorAll('input[name="volume_input_mode"]').forEach((el) => {
    el.checked = el.value === next;
    const chip = el.closest(".mode-chip");
    if (chip) {
      chip.classList.toggle("is-on", el.checked);
      chip.classList.toggle("is-off", !el.checked);
    }
  });
  const volHead = document.getElementById("col-vol-label");
  if (volHead) {
    volHead.setAttribute("data-i18n", next === "eps" ? "col_eps" : "col_daily_gb");
    volHead.setAttribute("data-tip", next === "eps" ? "eps" : "daily_gb");
    volHead.textContent = t(next === "eps" ? "col_eps" : "col_daily_gb");
  }
  const note = document.getElementById("vol-mode-exclusive-note");
  if (note) note.hidden = false;
  // Event size is always needed for the live Daily↔EPS counterpart.
  document.querySelectorAll(".src-col-event-bytes").forEach((el) => {
    el.hidden = false;
  });
  if (convert && prev !== next) {
    convertRowsForMode(state.rows, next);
  }
  renderRows();
  refreshTotalCounterpart();
}

export function readVolumeInputMode() {
  const checked = document.querySelector('input[name="volume_input_mode"]:checked');
  return checked?.value === "eps" ? "eps" : "daily_gb";
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
  return {
    retention_days: num(fd, "retention_days", 90),
    hot_warm_days: num(fd, "hot_warm_days", 30),
    headroom: num(fd, "headroom", 1.2),
    summary_pct: num(fd, "summary_pct", 0.1),
    summary_retention_days: num(fd, "summary_retention_days", 90),
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
  syncClusterFields();
  syncToggleUI();
}

/** Migrate wizard step from older 5-step (mode-first) snapshots. */
export function migrateWizardStep(data) {
  let step = typeof data?.step === "number" ? data.step : 0;
  const ver = Number(data?.version) || 0;
  // v3 and earlier: step 0 was Mode; drop it.
  if (ver < 4 && (data?.globals?.mode != null || ver === 3)) {
    step = Math.max(0, step - 1);
  }
  return Math.max(0, Math.min(3, step));
}

export function snapshot() {
  return {
    version: 5,
    volume_input_mode: readVolumeInputMode(),
    globals: collectGlobals(),
    rows: state.rows,
    step: state.step,
  };
}

export function applySnapshot(data) {
  if (!data || !Array.isArray(data.rows)) throw new Error("invalid save file");
  applyGlobals(data.globals);
  state.rows = normalizeSnapshotRows(data.rows);
  renderRows();
  state.step = migrateWizardStep(data);
  const mode =
    data.volume_input_mode ||
    data.globals?.volume_input_mode ||
    (state.rows.some((r) => Number(r.eps) > 0 && !(Number(r.daily_gb) > 0)) ? "eps" : "daily_gb");
  syncVolumeInputMode(mode);
  syncToggleUI();
}

export function buildPlanBody() {
  const g = collectGlobals();
  const mode = readVolumeInputMode();
  syncVolumeInputMode(mode);
  const sources = state.rows
    .filter((r) => r.enabled)
    .map((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      const row = {
        key: r.key,
        label: r.label,
        index_name: String(r.index_name || "").trim(),
        event_bytes: bytes,
        daily_gb: 0,
        eps: 0,
        enable_summary: !!r.enable_summary,
      };
      if (mode === "daily_gb") {
        row.daily_gb = Number(r.daily_gb) || 0;
      } else {
        row.eps = resolveEPS(r, state.rows).eps;
        if (!(row.event_bytes > 0)) row.event_bytes = 500;
      }
      const ret = Number(r.retention_days);
      if (ret > 0) row.retention_days = ret;
      const hw = Number(r.hot_warm_days);
      if (hw > 0) row.hot_warm_days = hw;
      const sg = Number(r.summary_daily_gb);
      if (r.enable_summary && sg > 0) row.summary_daily_gb = sg;
      if (r.summary_index_name) row.summary_index_name = String(r.summary_index_name).trim();
      return row;
    });
  return { ...g, sources };
}

export function fillReview() {
  const reviewBox = document.getElementById("review-box");
  if (!reviewBox) return;
  const g = collectGlobals();
  const enabled = state.rows.filter((r) => r.enabled);
  const mode = readVolumeInputMode();
  let srcSum = 0;
  enabled.forEach((r) => {
    if (mode === "eps") {
      srcSum += dailyGBFromEPS(resolveEPS(r, state.rows).eps, resolveEventBytes(r, state.rows));
    } else {
      srcSum += numOr0(r.daily_gb);
    }
  });
  const lines = [
    `— From topology —`,
    `Indexer cluster: ${g.indexer_cluster} (RF=${g.rf} SF=${g.sf}) | n_idx=${g.n_idx || "auto"}`,
    `Search head cluster: ${g.search_head_cluster} | users=${g.concurrent_users} searches=${g.concurrent_searches} saved=${g.saved_searches} | n_sh=${g.n_sh || "auto"}`,
    `apps: ES=${g.has_es} ITSI=${g.has_itsi} DMA=${g.enable_dma} SmartStore=${g.smartstore}`,
    `— From retention —`,
    `retention: ${g.retention_days}d | hot_warm: ${g.hot_warm_days}d | headroom: ${g.headroom} | summary_ret: ${g.summary_retention_days}d`,
    `archive_frozen: ${g.archive_frozen}${g.archive_frozen ? ` → ${g.frozen_path}` : ""}`,
    `paths: ${g.hot_path} | ${g.cold_path} | ${g.frozen_path} | ${g.summaries_path}`,
  ];
  if (g.total_daily_gb) lines.push(`total_daily_gb: ${g.total_daily_gb} (sources scale to this when both set)`);
  if (g.available_hot_gb || g.available_cold_gb || g.available_summaries_gb) {
    lines.push(
      `disk budget GB: hot=${g.available_hot_gb || 0} cold=${g.available_cold_gb || 0} summaries=${g.available_summaries_gb || 0}`
    );
  }
  lines.push(`— From sources —`);
  lines.push(`volume input: ${mode} (raw/pre-indexed) | enabled=${enabled.length} | Σ sources ≈ ${formatDailyGB(srcSum)} GB/day`);
  enabled.forEach((r) => {
    const ret = Number(r.retention_days) > 0 ? `${r.retention_days}d` : `global ${g.retention_days}d`;
    const hw = Number(r.hot_warm_days) > 0 ? `${r.hot_warm_days}d` : `global ${g.hot_warm_days}d`;
    const vol =
      mode === "eps"
        ? `EPS ${r.eps || resolveEPS(r, state.rows).eps || 0}`
        : `${r.daily_gb || 0} GB/d`;
    lines.push(
      `  - ${r.label} → index=${r.index_name} | ${vol} | event_bytes=${r.event_bytes} | ret=${ret} | hw=${hw}${r.enable_summary ? " | +summary" : ""}`
    );
  });
  lines.push(`— Calculate uses all of the above together —`);
  reviewBox.textContent = lines.join("\n");
}

export function bindPlanFormChrome() {
  document.querySelectorAll('.field.check input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.id === "indexer_cluster") syncClusterFields();
      else if (input.id === "search_head_cluster") {
        syncSHCMemberHint();
        syncToggleUI();
      } else if (input.id === "has_es" && input.checked) {
        const dma = document.getElementById("enable_dma");
        if (dma) dma.checked = true;
        syncToggleUI();
      } else syncToggleUI();
    });
  });
  document.querySelector('input[name="n_sh"]')?.addEventListener("change", syncSHCMemberHint);
  document.querySelector('input[name="n_sh"]')?.addEventListener("input", syncSHCMemberHint);
  syncClusterFields();
  syncToggleUI();

  document.querySelectorAll('input[name="volume_input_mode"]').forEach((el) => {
    el.addEventListener("change", () => syncVolumeInputMode(readVolumeInputMode(), { convert: true }));
  });
  syncVolumeInputMode(state.volumeInputMode || "daily_gb");
}
