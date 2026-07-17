/**
 * SCPcalc web UI entry — wires modular packages under ./js/
 */
import { state, SAVE_KEY, STEPS, reduceMotion } from "./js/state.js";
import { I18N, lang, setI18nHooks, bindLangSwitcher, t } from "./js/i18n.js";
import { initTips, bindTips, refreshOpenTip } from "./js/tips-ui.js";
import { bindModalChrome, closeModal, openModal } from "./js/modal.js";
import { initTabBars, setTabsHooks } from "./js/tabs.js";
import { bindSourcesTable, rowFromPreset, renderRows } from "./js/sources.js";
import { applyDemoSourceDefaults, demoGlobals } from "./js/defaults.js";
import { bindPlanFormChrome, snapshot, applySnapshot, applyGlobals, fillReview, syncArchiveFields, syncColdVolumePreview } from "./js/plan-form.js";
import { bindConfEditor, getConfText, copyConf } from "./js/conf-editor.js";
import { renderAllCharts } from "./js/charts.js";
import { bindWizard, openWizard, closeWizard, showStep } from "./js/wizard.js";
import { runCalculate, bindResultTableFind } from "./js/results.js";
import { downloadText } from "./js/util.js";
import { initEngine, fetchPresets, engineMode } from "./js/engine.js";
import {
  applyShareHashToLocation,
  copyText,
  decodeSnapshotHash,
  extractShareFragment,
  hasShareHash,
} from "./js/share-url.js";
import { bindFeaturePrompts } from "./js/feature-prompt.js";
import { bindNumberSteppers } from "./js/number-stepper.js";

function flashSave(msg) {
  const saveMsg = document.getElementById("save-msg");
  if (!saveMsg) return;
  saveMsg.hidden = false;
  saveMsg.textContent = msg;
  setTimeout(() => {
    saveMsg.hidden = true;
  }, 2800);
}

function bindAtmosphere() {
  if (reduceMotion) return;
  window.addEventListener(
    "pointermove",
    (e) => {
      document.documentElement.style.setProperty("--mx", `${(e.clientX / window.innerWidth) * 100}%`);
      document.documentElement.style.setProperty("--my", `${(e.clientY / window.innerHeight) * 100}%`);
    },
    { passive: true }
  );
}

async function copyShareURL() {
  try {
    const url = await applyShareHashToLocation(snapshot());
    await copyText(url);
    flashSave(t("share_copied"));
  } catch (ex) {
    const msg = String(ex.message || ex);
    flashSave(msg.includes("too large") ? t("share_too_large") : msg);
  }
}

async function applyPlanFromShareText(raw, { openAtStep } = {}) {
  const frag = extractShareFragment(raw);
  if (!frag) throw new Error(t("share_invalid"));
  const data = await decodeSnapshotHash(frag);
  if (!data) throw new Error(t("share_invalid"));
  applySnapshot(data);
  if (location.hash.replace(/^#/, "") !== frag) {
    history.replaceState(null, "", `${location.pathname}${location.search}#${frag}`);
  }
  flashSave(t("share_loaded"));
  const step = typeof openAtStep === "number" ? openAtStep : typeof state.step === "number" ? state.step : 0;
  openWizard(step);
  return true;
}

async function tryLoadFromShareURL() {
  if (!hasShareHash()) return false;
  try {
    await applyPlanFromShareText(location.hash);
    return true;
  } catch (ex) {
    flashSave(t("share_invalid") + " " + String(ex.message || ex));
    return false;
  }
}

function bindPersistence() {
  document.getElementById("btn-save")?.addEventListener("click", () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
      flashSave(I18N[lang()].saved);
    } catch (ex) {
      flashSave(String(ex.message || ex));
    }
  });

  function doLoad() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        flashSave(I18N[lang()].nothing);
        return;
      }
      applySnapshot(JSON.parse(raw));
      flashSave(I18N[lang()].loaded);
      openWizard(typeof state.step === "number" ? state.step : 0);
    } catch (ex) {
      flashSave(String(ex.message || ex));
    }
  }
  document.getElementById("btn-load-home")?.addEventListener("click", doLoad);

  document.getElementById("btn-export")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scpcalc-plan.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  ["btn-export-url-home", "btn-export-url", "btn-export-url-out"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      void copyShareURL();
    });
  });

  const importModal = document.getElementById("import-modal");
  document.getElementById("btn-import-home")?.addEventListener("click", () => {
    const ta = document.getElementById("import-url-input");
    if (ta) ta.value = "";
    openModal(importModal);
    setTimeout(() => ta?.focus(), 50);
  });

  document.getElementById("btn-import-url-apply")?.addEventListener("click", async () => {
    const raw = document.getElementById("import-url-input")?.value || "";
    try {
      await applyPlanFromShareText(raw);
      closeModal(importModal);
    } catch (ex) {
      flashSave(String(ex.message || ex));
    }
  });

  document.getElementById("file-import")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      applySnapshot(JSON.parse(await f.text()));
      flashSave(I18N[lang()].loaded);
      closeModal(importModal);
      openWizard(0);
    } catch (ex) {
      flashSave(String(ex.message || ex));
    }
    e.target.value = "";
  });

  document.getElementById("btn-dl-conf")?.addEventListener("click", () => {
    const text = getConfText();
    if (text) downloadText("indexes.conf", text);
  });
  document.getElementById("btn-dl-design")?.addEventListener("click", () => {
    if (state.lastDesignTxt) downloadText("scpcalc-design.txt", state.lastDesignTxt);
  });
  document.getElementById("btn-copy-conf-home")?.addEventListener("click", async () => {
    await copyConf();
    flashSave(t("copied"));
  });

  window.addEventListener("hashchange", () => {
    if (!hasShareHash()) return;
    void tryLoadFromShareURL();
  });
}

function bindCalculate() {
  const form = document.getElementById("form");
  document.getElementById("btn-wiz-calc")?.addEventListener("click", runCalculate);
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.step === STEPS - 1) runCalculate();
  });
}

async function boot() {
  await initEngine();
  const data = await fetchPresets();
  state.rows = (data.sources || []).map((p) => applyDemoSourceDefaults(rowFromPreset(p)));
  applyGlobals(demoGlobals());
  renderRows();
  showStep(0);
  const badge = document.getElementById("engine-badge");
  if (badge) {
    badge.textContent = engineMode() === "wasm" ? "engine: browser (WASM)" : "engine: local API";
    badge.hidden = false;
  }
  await tryLoadFromShareURL();
}

// —— bootstrap ——
setI18nHooks({
  onAfterSetLang() {
    bindTips(document);
    syncArchiveFields();
    syncColdVolumePreview();
    refreshOpenTip();
    renderRows();
    if (state.step === STEPS - 1) fillReview();
  },
});
setTabsHooks({ onChartsTab: renderAllCharts });

bindLangSwitcher();
initTips();
bindAtmosphere();
initTabBars();
bindModalChrome({
  onEscapeWizard: closeWizard,
  onEscapeOther: (el) => {
    if (el?.id === "feature-prompt-modal") {
      document.getElementById("feature-prompt-no")?.click();
      return;
    }
    closeModal(el);
  },
});
bindPlanFormChrome();
bindFeaturePrompts();
bindNumberSteppers();
bindSourcesTable();
bindWizard();
bindConfEditor();
bindPersistence();
bindCalculate();
bindResultTableFind();

boot().catch((ex) => {
  flashSave("Failed to load presets: " + (ex.message || ex));
});
