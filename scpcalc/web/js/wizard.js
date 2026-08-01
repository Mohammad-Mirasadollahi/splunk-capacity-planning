import { t } from "./i18n.js";
import { openModal, closeModal } from "./modal.js";
import { fillReview } from "./plan-form.js";
import { bindWizardContinuity, refreshWizardContext } from "./wizard-continuity.js";
import { loadReviewPreview } from "./review-panel.js";
import { validateSearchLoad, focusSearchLoadField } from "./search-load.js";
import { activateTab } from "./tabs.js";
import { state, STEPS, reduceMotion } from "./state.js";

const wizardModal = () => document.getElementById("wizard-modal");

function syncWizardBackLabel() {
  const btnBack = document.getElementById("btn-wiz-back");
  if (!btnBack) return;
  btnBack.setAttribute("data-i18n", "back");
  btnBack.textContent = t("back");
  // No tooltip on Back — label alone is enough.
  btnBack.removeAttribute("data-soft-tip");
  btnBack.removeAttribute("data-soft-tip-title");
  btnBack.removeAttribute("title");
}

export function showStep(n) {
  state.step = Math.max(0, Math.min(STEPS - 1, n));
  const btnBack = document.getElementById("btn-wiz-back");
  const btnNext = document.getElementById("btn-wiz-next");
  const btnCalc = document.getElementById("btn-wiz-calc");

  document.querySelectorAll(".wiz-pane").forEach((p) => {
    const on = Number(p.dataset.pane) === state.step;
    p.hidden = !on;
    p.classList.toggle("is-active", on);
    if (on) {
      p.scrollTop = 0;
      p.querySelectorAll(":scope > .tab-panel.is-active").forEach((panel) => {
        panel.scrollTop = 0;
      });
    }
  });
  document.querySelectorAll("#wizard-steps li").forEach((li) => {
    const i = Number(li.dataset.step);
    li.classList.toggle("is-active", i === state.step);
    li.classList.toggle("is-done", i < state.step);
  });
  // First step: only Cancel closes the wizard — Back has nowhere to go.
  if (btnBack) {
    btnBack.hidden = state.step === 0;
    btnBack.disabled = state.step === 0;
  }
  const last = state.step === STEPS - 1;
  if (btnNext) {
    btnNext.hidden = last;
    btnNext.disabled = last;
    btnNext.setAttribute("aria-hidden", last ? "true" : "false");
  }
  if (btnCalc) {
    btnCalc.hidden = !last;
    btnCalc.disabled = !last;
  }
  refreshWizardContext(state.step, { remountSources: state.step === 1 });
  if (last) {
    fillReview();
    void loadReviewPreview();
  }
  syncWizardBackLabel();
  if (state.step === 0 || state.step === 1) {
    import("./quick-start.js")
      .then((m) => m.syncQuickFromGlobals?.())
      .catch(() => {});
  }
}

export function openWizard(atStep) {
  if (typeof atStep === "number") state.step = atStep;
  showStep(state.step);
  openModal(wizardModal());
  import("./quick-start.js")
    .then((m) => m.syncQuickFromGlobals?.())
    .catch(() => {});
}

export function closeWizard() {
  closeModal(wizardModal());
}

export function bindWizard() {
  bindWizardContinuity();
  document.getElementById("btn-open-wizard")?.addEventListener("click", () => openWizard(0));
  document.getElementById("btn-reopen-wizard")?.addEventListener("click", () => openWizard(state.step));
  wizardModal()?.querySelectorAll("[data-close-wizard]").forEach((el) => {
    el.addEventListener("click", closeWizard);
  });

  document.getElementById("btn-wiz-back")?.addEventListener("click", () => {
    if (state.step <= 0) return;
    showStep(state.step - 1);
  });
  document.getElementById("btn-wiz-next")?.addEventListener("click", () => {
    // Topology step: require peak concurrent searches before leaving.
    if (state.step === 2) {
      const check = validateSearchLoad();
      if (!check.ok) {
        const err = document.getElementById("err");
        if (err) {
          err.hidden = false;
          err.textContent = check.message;
        }
        activateTab("topo", "topo-cluster");
        focusSearchLoadField();
        return;
      }
      const err = document.getElementById("err");
      if (err?.textContent === t("err_concurrent_searches")) {
        err.hidden = true;
        err.textContent = "";
      }
    }
    showStep(state.step + 1);
  });
  document.querySelectorAll("#wizard-steps li").forEach((li) => {
    li.addEventListener("click", () => {
      const target = Number(li.dataset.step);
      if (state.step === 2 && target > 2) {
        const check = validateSearchLoad();
        if (!check.ok) {
          const err = document.getElementById("err");
          if (err) {
            err.hidden = false;
            err.textContent = check.message;
          }
          activateTab("topo", "topo-cluster");
          focusSearchLoadField();
          return;
        }
      }
      showStep(target);
    });
  });
}

export { reduceMotion, syncWizardBackLabel };
