import { openModal, closeModal } from "./modal.js";
import { syncClusterFields, syncToggleUI } from "./plan-form.js";
import { escapeAttr } from "./util.js";

const suggestModal = () => document.getElementById("suggest-modal");
const SESSION_KEY = "scpcalc-suggest-dismissed";

function dismissedSet() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function rememberDismissed(ids) {
  const set = dismissedSet();
  ids.forEach((id) => set.add(id));
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
  } catch (_) {}
}

/** @returns {object[]} pending suggestions not yet dismissed this session */
export function pendingSuggestions(design) {
  const list = design?.suggestions || [];
  if (!list.length) return [];
  const dismissed = dismissedSet();
  return list.filter((s) => s?.id && !dismissed.has(s.id) && s.enable && Object.keys(s.enable).length);
}

/**
 * Show consent modal for topology suggestions.
 * @returns {Promise<"accept"|"skip"|null>} null if nothing to show
 */
export function askSuggestions(design) {
  const pending = pendingSuggestions(design);
  if (!pending.length) return Promise.resolve(null);

  const listEl = document.getElementById("suggest-list");
  const modal = suggestModal();
  if (!listEl || !modal) return Promise.resolve(null);

  listEl.innerHTML = pending
    .map(
      (s) => `<label class="suggest-item">
        <input type="checkbox" id="suggest-${escapeAttr(s.id)}" name="suggest_${escapeAttr(s.id)}" data-suggest-id="${s.id}" checked>
        <span>
          <strong>${s.title || s.id}</strong>
          <em>${s.reason || ""}</em>
        </span>
      </label>`
    )
    .join("");

  openModal(modal);

  return new Promise((resolve) => {
    const finish = (result) => {
      closeModal(modal);
      btnAccept?.removeEventListener("click", onAccept);
      btnSkip?.removeEventListener("click", onSkip);
      resolve(result);
    };
    const onAccept = () => {
      const chosen = [...listEl.querySelectorAll("input[data-suggest-id]:checked")].map((el) => el.dataset.suggestId);
      const skipped = pending.map((s) => s.id).filter((id) => !chosen.includes(id));
      rememberDismissed(skipped);
      const form = document.getElementById("form");
      pending.forEach((s) => {
        if (!chosen.includes(s.id)) return;
        Object.entries(s.enable || {}).forEach(([name, on]) => {
          const el = form?.elements?.namedItem(name);
          if (el && "checked" in el) el.checked = !!on;
        });
      });
      syncClusterFields();
      syncToggleUI();
      rememberDismissed(chosen);
      finish("accept");
    };
    const onSkip = () => {
      rememberDismissed(pending.map((s) => s.id));
      finish("skip");
    };
    const btnAccept = document.getElementById("btn-suggest-accept");
    const btnSkip = document.getElementById("btn-suggest-skip");
    btnAccept?.addEventListener("click", onAccept);
    btnSkip?.addEventListener("click", onSkip);
  });
}

export function updateAutoRecBadges(design) {
  wireAutoSeedGuards();
  // No Recommended badges under n_idx / n_sh — seed the field only.
  const sh = document.getElementById("auto-n-sh");
  const idx = document.getElementById("auto-n-idx");
  if (sh) {
    sh.hidden = true;
    sh.textContent = "";
    sh.removeAttribute("role");
    sh.removeAttribute("tabindex");
    sh.onclick = null;
    sh.onkeydown = null;
  }
  if (idx) {
    idx.hidden = true;
    idx.textContent = "";
    idx.removeAttribute("role");
    idx.removeAttribute("tabindex");
    idx.onclick = null;
    idx.onkeydown = null;
  }
  if (design?.auto_n_sh > 0) maybeSeedCount("n_sh", design.auto_n_sh);
  if (design?.auto_n_idx > 0) maybeSeedCount("n_idx", design.auto_n_idx);
}

/** Seed recommended count only while clustering is on (and field still empty/last-seeded).
 *  Standalone (cluster off): no Auto fill — user sets an explicit independent node count. */
function maybeSeedCount(inputName, recommended) {
  const el = document.querySelector(`input[name="${inputName}"]`);
  if (!el || !(recommended > 0)) return;
  if (inputName === "n_idx" && !document.getElementById("indexer_cluster")?.checked) return;
  if (inputName === "n_sh" && !document.getElementById("search_head_cluster")?.checked) return;
  const cur = Number(el.value);
  const stamped = Number(el.dataset.autoSeeded || 0);
  if (!(cur > 0) || (stamped > 0 && cur === stamped)) {
    applyRecommendedCount(inputName, recommended, { silent: true });
  }
}

function applyRecommendedCount(inputName, recommended, { silent = false } = {}) {
  const el = document.querySelector(`input[name="${inputName}"]`);
  if (!el || !(recommended > 0)) return;
  let nextN = recommended;
  if (inputName === "n_idx" && document.getElementById("indexer_cluster")?.checked) {
    nextN = Math.max(2, nextN);
  }
  const next = String(nextN);
  if (el.value === next && el.dataset.autoSeeded === next) return;
  el.value = next;
  el.dataset.autoSeeded = next;
  if (!silent) el.dispatchEvent(new Event("change", { bubbles: true }));
}

function wireAutoSeedGuards() {
  for (const name of ["n_idx", "n_sh"]) {
    const el = document.querySelector(`input[name="${name}"]`);
    if (!el || el.dataset.autoSeedGuard === "1") continue;
    el.dataset.autoSeedGuard = "1";
    el.addEventListener("input", () => {
      delete el.dataset.autoSeeded;
    });
  }
}
