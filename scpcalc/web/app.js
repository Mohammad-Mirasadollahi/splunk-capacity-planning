/**
 * SCPcalc web UI entry — wires modular packages under ./js/
 */
import { state, SAVE_KEY, STEPS, reduceMotion } from "./js/state.js";
import { I18N, lang, setI18nHooks, bindLangSwitcher, t } from "./js/i18n.js";
import { initTips, bindTips, refreshOpenTip } from "./js/tips-ui.js";
import { bindModalChrome, closeModal } from "./js/modal.js";
import { initTabBars, setTabsHooks } from "./js/tabs.js";
import { bindSourcesTable, rowFromPreset, renderRows } from "./js/sources.js";
import { bindPlanFormChrome, snapshot, applySnapshot, fillReview } from "./js/plan-form.js";
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
  hasShareHash,
} from "./js/share-url.js";

function flashSave(msg) {
  const saveMsg = document.getElementById("save-msg");
  if (!saveMsg) return;
  saveMsg.hidden = false;
  saveMsg.textContent = msg;
  setTimeout(() => {
    saveMsg.hidden = true;
  }, 2400);
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

async function tryLoadFromShareURL() {
  if (!hasShareHash()) return false;
  try {
    const data = await decodeSnapshotHash(location.hash);
    if (!data) return false;
    applySnapshot(data);
    flashSave(t("share_loaded"));
    openWizard(typeof state.step === "number" ? state.step : 0);
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

  document.getElementById("btn-share-url")?.addEventListener("click", () => {
    void copyShareURL();
  });
  document.getElementById("btn-share-url-out")?.addEventListener("click", () => {
    void copyShareURL();
  });

  document.getElementById("file-import")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      applySnapshot(JSON.parse(await f.text()));
      flashSave(I18N[lang()].loaded);
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
  state.rows = (data.sources || []).map(rowFromPreset);
  const prefer = new Set(["windows", "linux"]);
  state.rows.forEach((r) => {
    if (prefer.has(r.key)) r.enabled = true;
  });
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
    refreshOpenTip();
    if (state.step === 4) fillReview();
  },
});
setTabsHooks({ onChartsTab: renderAllCharts });

bindLangSwitcher();
initTips();
bindAtmosphere();
initTabBars();
bindModalChrome({
  onEscapeWizard: closeWizard,
  onEscapeOther: (el) => closeModal(el),
});
bindPlanFormChrome();
bindSourcesTable();
bindWizard();
bindConfEditor();
bindPersistence();
bindCalculate();
bindResultTableFind();

boot().catch((ex) => {
  flashSave("Failed to load presets: " + (ex.message || ex));
});
