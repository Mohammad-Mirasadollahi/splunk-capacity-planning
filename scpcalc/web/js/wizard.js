import { t } from "./i18n.js";
import { setSoftTip } from "./tips-ui.js";
import { openModal, closeModal } from "./modal.js";
import { fillReview } from "./plan-form.js";
import { bindWizardContinuity, refreshWizardContext } from "./wizard-continuity.js";
import { loadReviewPreview } from "./review-panel.js";
import { state, STEPS, reduceMotion } from "./state.js";

const wizardModal = () => document.getElementById("wizard-modal");

function syncWizardBackLabel() {
  const btnBack = document.getElementById("btn-wiz-back");
  if (!btnBack) return;
  btnBack.setAttribute("data-i18n", "back");
  btnBack.textContent = t("back");
  setSoftTip(btnBack, t("back"));
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
  if (btnNext) btnNext.hidden = last;
  if (btnCalc) btnCalc.hidden = !last;
  refreshWizardContext(state.step, { remountSources: state.step === 2 });
  if (last) {
    fillReview();
    void loadReviewPreview();
  }
  syncWizardBackLabel();
  if (state.step === 0) {
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
  document.getElementById("btn-wiz-next")?.addEventListener("click", () => showStep(state.step + 1));
  document.querySelectorAll("#wizard-steps li").forEach((li) => {
    li.addEventListener("click", () => showStep(Number(li.dataset.step)));
  });
}

export { reduceMotion, syncWizardBackLabel };
