import { state } from "./state.js";

/** @type {null | ((plan: object) => void)} */
let onChartsTab = null;

export function setTabsHooks(hooks) {
  onChartsTab = hooks?.onChartsTab || null;
}

/** Keep window + nearest scroll parent fixed while tab panels swap height. */
function withStableScroll(anchor, run) {
  const winY = window.scrollY;
  /** @type {{ el: Element, top: number }[]} */
  const saved = [];
  let node = anchor;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && node.scrollHeight > node.clientHeight + 1) {
        saved.push({ el: node, top: node.scrollTop });
      }
    }
    node = node.parentElement;
  }
  run();
  const restore = () => {
    window.scrollTo(0, winY);
    for (const { el, top } of saved) {
      el.scrollTop = top;
    }
  };
  restore();
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
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
        withStableScroll(bar, () => {
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
  });
}
