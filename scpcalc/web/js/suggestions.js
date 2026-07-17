import { openModal, closeModal } from "./modal.js";
import { syncClusterFields, syncToggleUI } from "./plan-form.js";
import { t } from "./i18n.js";

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
        <input type="checkbox" data-suggest-id="${s.id}" checked>
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
  const sh = document.getElementById("auto-n-sh");
  const idx = document.getElementById("auto-n-idx");
  if (sh) {
    if (design?.auto_n_sh > 0) {
      sh.hidden = false;
      sh.textContent = `${t("auto_rec_prefix")} ${design.auto_n_sh}`;
    } else sh.hidden = true;
  }
  if (idx) {
    if (design?.auto_n_idx > 0) {
      idx.hidden = false;
      idx.textContent = `${t("auto_rec_prefix")} ${design.auto_n_idx}`;
    } else idx.hidden = true;
  }
}
