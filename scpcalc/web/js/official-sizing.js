/**
 * Modal: official Splunk-recommended N_IDX / N_SH with separate Apply actions.
 */
import { openModal, closeModal } from "./modal.js";
import { t } from "./i18n.js";
import { applyRecommendedCount } from "./suggestions.js";
import { syncClusterFields, syncToggleUI, buildPlanBody } from "./plan-form.js";
import { runPlan } from "./engine.js";

function modalEl() {
  return document.getElementById("official-sizing-modal");
}

function currentCounts(design) {
  return {
    n_idx: Number(design?.n_idx) || 0,
    n_sh: Number(design?.n_sh) || 0,
    auto_n_idx: Number(design?.auto_n_idx) || 0,
    auto_n_sh: Number(design?.auto_n_sh) || 0,
    daily: Number(design?.daily_gb_for_counts) || 0,
    users: Number(design?.concurrent_users) || 0,
    searches: Number(design?.concurrent_searches) || 0,
    has_es: !!design?.has_es,
    has_itsi: !!design?.has_itsi,
    combined: !!design?.combined_instance,
  };
}

function idxReason(c) {
  const parts = [
    t("official_sizing_idx_reason")
      .replace("{d}", String(Math.round(c.daily * 10) / 10))
      .replace("{u}", String(c.users)),
  ];
  if (c.has_es) parts.push(t("official_sizing_idx_es"));
  if (c.has_itsi) parts.push(t("official_sizing_idx_itsi"));
  return parts.join(" ");
}

function shReason(c) {
  return t("official_sizing_sh_reason")
    .replace("{u}", String(c.users))
    .replace("{s}", String(c.searches))
    .replace("{d}", String(Math.round(c.daily * 10) / 10));
}

function cardHTML({ id, title, recommended, current, reason, canApply }) {
  const same = recommended > 0 && recommended === current;
  const status = !recommended
    ? t("official_sizing_na")
    : same
      ? t("official_sizing_already")
      : t("official_sizing_diff").replace("{cur}", String(current)).replace("{rec}", String(recommended));
  const disabled = !canApply || !recommended || same ? "disabled" : "";
  return `<div class="suggest-item official-sizing-card" data-role="${id}">
    <span class="official-sizing-card-body">
      <strong>${title}</strong>
      <em>${reason}</em>
      <span class="official-sizing-meta">
        <span>${t("official_sizing_recommended")}: <b>${recommended || "—"}</b></span>
        <span>${status}</span>
      </span>
    </span>
    <button type="button" class="cta official-sizing-apply" data-apply-role="${id}" ${disabled}>
      <span class="cta-label">${t("official_sizing_apply")}</span>
      <span class="cta-glow" aria-hidden="true"></span>
    </button>
  </div>`;
}

/**
 * @param {object} design
 * @param {{ onApplied?: (data: object) => void }} [opts]
 */
export function openOfficialSizingModal(design, opts = {}) {
  const list = document.getElementById("official-sizing-list");
  const modal = modalEl();
  if (!list || !modal || !design) return;

  const c = currentCounts(design);
  const recIdx = c.combined ? 1 : c.auto_n_idx;
  const recSh = c.combined ? 1 : c.auto_n_sh;

  list.innerHTML = [
    cardHTML({
      id: "n_idx",
      title: t("official_sizing_idx_title"),
      recommended: recIdx,
      current: c.n_idx,
      reason: idxReason(c),
      canApply: recIdx > 0,
    }),
    cardHTML({
      id: "n_sh",
      title: t("official_sizing_sh_title"),
      recommended: recSh,
      current: c.n_sh,
      reason: shReason(c),
      canApply: recSh > 0,
    }),
  ].join("");

  list.onclick = async (ev) => {
    const btn = ev.target.closest("[data-apply-role]");
    if (!btn || btn.disabled) return;
    const role = btn.dataset.applyRole;
    const recommended = role === "n_idx" ? recIdx : recSh;
    if (!(recommended > 0)) return;

    btn.disabled = true;
    btn.classList.add("loading");
    try {
      const form = document.getElementById("form");
      if (role === "n_idx" && recommended >= 2) {
        const el = form?.elements?.namedItem("indexer_cluster");
        if (el && "checked" in el) el.checked = true;
      }
      if (role === "n_sh" && recommended >= 3) {
        const el = form?.elements?.namedItem("search_head_cluster");
        if (el && "checked" in el) el.checked = true;
      }
      applyRecommendedCount(role, recommended, { silent: false });
      syncClusterFields();
      syncToggleUI();
      const data = await runPlan(buildPlanBody());
      closeModal(modal);
      opts.onApplied?.(data);
    } catch (ex) {
      btn.disabled = false;
      btn.classList.remove("loading");
      const err = document.getElementById("err");
      if (err) {
        err.hidden = false;
        err.textContent = ex.message || String(ex);
      }
    }
  };

  openModal(modal);
}

export function bindOfficialSizingButton(getDesign, onApplied) {
  const btn = document.getElementById("btn-official-sizing");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    const design = getDesign?.();
    if (!design) return;
    openOfficialSizingModal(design, { onApplied });
  });
}

export function syncOfficialSizingButton(design) {
  const btn = document.getElementById("btn-official-sizing");
  if (!btn) return;
  const has = !!(design && (design.auto_n_idx > 0 || design.auto_n_sh > 0 || design.combined_instance));
  btn.hidden = !has;
}
