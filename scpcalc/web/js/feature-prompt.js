/**
 * Reusable Yes/No feature prompts (SHC, indexer cluster, …).
 * "Don't show" prefs live in localStorage and vanish when the user clears site data.
 */
import { openModal, closeModal } from "./modal.js";
import { t } from "./i18n.js";
import { syncClusterFields, syncSHCMemberHint, syncToggleUI, syncArchiveFields } from "./plan-form.js";

const DONT_ASK_KEY = "scpcalc:feature-prompt:dont-ask";

/** @typedef {{ id: string, titleKey: string, bodyKey: string, docUrl?: string, checkboxId: string, highlightSelector?: string }} FeaturePromptSpec */

/** @type {{ spec: FeaturePromptSpec, resolve: (v: boolean) => void }[]} */
const queue = [];
let busy = false;

function loadDontAsk() {
  try {
    const raw = localStorage.getItem(DONT_ASK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDontAsk(map) {
  try {
    localStorage.setItem(DONT_ASK_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function isDontAsk(id) {
  return !!loadDontAsk()[id];
}

export function setDontAsk(id, on) {
  const map = loadDontAsk();
  if (on) map[id] = true;
  else delete map[id];
  saveDontAsk(map);
}

function root() {
  return document.getElementById("feature-prompt-modal");
}

function applyEnable(spec) {
  const cb = document.getElementById(spec.checkboxId);
  if (cb && !cb.checked) {
    cb.checked = true;
  }
  if (spec.checkboxId === "indexer_cluster") syncClusterFields();
  else if (spec.checkboxId === "search_head_cluster") {
    syncSHCMemberHint();
    syncToggleUI();
  } else if (spec.checkboxId === "archive_frozen") syncArchiveFields();
  else syncToggleUI();

  const el =
    (spec.highlightSelector && document.querySelector(spec.highlightSelector)?.closest(".wiz-section, .subpanel, .field.check, fieldset, .glass-chip")) ||
    cb?.closest(".wiz-section, .subpanel, .field.check, fieldset") ||
    (spec.highlightSelector ? document.querySelector(spec.highlightSelector) : null);
  if (el) {
    el.classList.add("is-prompt-enabled");
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setTimeout(() => el.classList.remove("is-prompt-enabled"), 2200);
  }
}

function finish(accepted, { persistDont } = {}) {
  const cur = queue[0];
  if (!cur) return;
  const dontEl = document.getElementById("feature-prompt-dont");
  if (persistDont || dontEl?.checked) setDontAsk(cur.spec.id, true);
  if (accepted) applyEnable(cur.spec);
  closeModal(root());
  queue.shift();
  busy = false;
  cur.resolve(accepted);
  drain();
}

function show(spec) {
  const modal = root();
  if (!modal) {
    queue.shift()?.resolve(false);
    busy = false;
    drain();
    return;
  }
  const title = document.getElementById("feature-prompt-title");
  const body = document.getElementById("feature-prompt-body");
  const doc = document.getElementById("feature-prompt-doc");
  const dont = document.getElementById("feature-prompt-dont");
  if (title) title.textContent = t(spec.titleKey);
  if (body) body.textContent = t(spec.bodyKey);
  if (doc) {
    if (spec.docUrl) {
      doc.hidden = false;
      doc.innerHTML = `${t("fp_doc_prefix")} <a href="${spec.docUrl}" target="_blank" rel="noopener noreferrer">${spec.docUrl.replace(/^https:\/\//, "")}</a>`;
    } else {
      doc.hidden = true;
      doc.textContent = "";
    }
  }
  if (dont) dont.checked = false;
  openModal(modal);
}

function drain() {
  if (busy || !queue.length) return;
  const next = queue[0];
  const cb = document.getElementById(next.spec.checkboxId);
  if (isDontAsk(next.spec.id) || cb?.checked) {
    queue.shift();
    next.resolve(false);
    drain();
    return;
  }
  busy = true;
  show(next.spec);
}

/**
 * Ask the user whether to enable a related feature after a meaningful number change.
 * @param {FeaturePromptSpec} spec
 * @returns {Promise<boolean>} true if user accepted and the feature was enabled
 */
export function askFeaturePrompt(spec) {
  return new Promise((resolve) => {
    if (!spec?.id || !spec.checkboxId) {
      resolve(false);
      return;
    }
    if (isDontAsk(spec.id)) {
      resolve(false);
      return;
    }
    const cb = document.getElementById(spec.checkboxId);
    if (cb?.checked) {
      resolve(false);
      return;
    }
    // Deduplicate same id already waiting
    if (queue.some((q) => q.spec.id === spec.id) || (busy && queue[0]?.spec.id === spec.id)) {
      resolve(false);
      return;
    }
    queue.push({ spec, resolve });
    drain();
  });
}

export const PROMPT_SHC = {
  id: "enable_shc",
  titleKey: "fp_shc_title",
  bodyKey: "fp_shc_body",
  docUrl: "https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/SHCsystemrequirements",
  checkboxId: "search_head_cluster",
  highlightSelector: "#search_head_cluster",
};

export const PROMPT_IDX_CLUSTER = {
  id: "enable_indexer_cluster",
  titleKey: "fp_idx_title",
  bodyKey: "fp_idx_body",
  docUrl: "https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Aboutclusters",
  checkboxId: "indexer_cluster",
  highlightSelector: "#indexer_cluster",
};

export const PROMPT_ARCHIVE = {
  id: "enable_archive_frozen",
  titleKey: "fp_archive_title",
  bodyKey: "fp_archive_body",
  checkboxId: "archive_frozen",
  highlightSelector: "#archive_frozen",
};

export const PROMPT_SMARTSTORE = {
  id: "enable_smartstore",
  titleKey: "fp_smartstore_title",
  bodyKey: "fp_smartstore_body",
  checkboxId: "smartstore",
  highlightSelector: "#smartstore",
};

function numVal(el) {
  const n = Number(el?.value);
  return Number.isFinite(n) ? n : 0;
}

function watchChange(selector, handler) {
  const el = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!el || el.dataset.fpBound === "1") return;
  el.dataset.fpBound = "1";
  el.addEventListener("change", () => handler(el));
}

/**
 * Bind number fields that can imply clustering / related topology toggles.
 */
export function bindFeaturePrompts() {
  const modal = root();
  if (!modal || modal.dataset.bound === "1") return;
  modal.dataset.bound = "1";

  document.getElementById("feature-prompt-yes")?.addEventListener("click", () => finish(true));
  document.getElementById("feature-prompt-no")?.addEventListener("click", () => finish(false));
  document.getElementById("feature-prompt-dont-btn")?.addEventListener("click", () => finish(false, { persistDont: true }));
  modal.querySelectorAll("[data-fp-dismiss]").forEach((el) => {
    el.addEventListener("click", () => finish(false));
  });

  // Search-head count → SHC
  watchChange('input[name="n_sh"]', (el) => {
    const n = numVal(el);
    if (n >= 1) void askFeaturePrompt(PROMPT_SHC);
  });

  // Indexer count → indexer cluster (2+ peers is when clustering usually matters)
  watchChange('input[name="n_idx"]', (el) => {
    const n = numVal(el);
    if (n >= 2) void askFeaturePrompt(PROMPT_IDX_CLUSTER);
  });

  // SH load signals → SHC
  watchChange('input[name="concurrent_users"]', (el) => {
    if (numVal(el) >= 12) void askFeaturePrompt(PROMPT_SHC);
  });
  watchChange('input[name="concurrent_searches"]', (el) => {
    if (numVal(el) > 16) void askFeaturePrompt(PROMPT_SHC);
  });
  watchChange('input[name="saved_searches"]', (el) => {
    if (numVal(el) >= 200) void askFeaturePrompt(PROMPT_SHC);
  });

  // Long retention → archive frozen
  watchChange('input[name="retention_days"]', (el) => {
    if (numVal(el) >= 180) void askFeaturePrompt(PROMPT_ARCHIVE);
  });

  // Large total daily → indexer cluster + optionally SmartStore
  watchChange('input[name="total_daily_gb"]', (el) => {
    const n = numVal(el);
    if (n >= 100) void askFeaturePrompt(PROMPT_IDX_CLUSTER);
    if (n >= 500) void askFeaturePrompt(PROMPT_SMARTSTORE);
  });
}
