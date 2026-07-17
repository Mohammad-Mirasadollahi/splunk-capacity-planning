import { state } from "./state.js";

/** @type {null | ((plan: object) => void)} */
let onChartsTab = null;

export function setTabsHooks(hooks) {
  onChartsTab = hooks?.onChartsTab || null;
}

export function activateTab(tabsName, panelId) {
  const bar = document.querySelector(`[data-tabs="${tabsName}"]`);
  if (!bar) return;
  const btn = bar.querySelector(`[data-tab="${panelId}"]`);
  if (btn) btn.click();
}

export function initTabBars() {
  document.querySelectorAll("[data-tabs]").forEach((bar) => {
    const scope = bar.parentElement;
    if (!scope) return;
    bar.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.tab;
        bar.querySelectorAll("[data-tab]").forEach((b) => {
          const on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        if (bar.dataset.tabs === "sources-cols") {
          // Legacy: volume vs retention used to share one tab bar; now separate sections.
          return;
        }
        scope.querySelectorAll(":scope > .tab-panel").forEach((p) => {
          const on = p.dataset.panel === id;
          p.hidden = !on;
          p.classList.toggle("is-active", on);
        });
        if (id === "charts" && state.lastPlan) {
          setTimeout(() => onChartsTab?.(state.lastPlan), 40);
        }
      });
    });
  });
}
