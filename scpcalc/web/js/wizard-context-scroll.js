/**
 * Fade/collapse the carry-forward wizard-context banner while scrolling down
 * inside the wizard; restore it when scrolling up or near the top.
 */
import { reduceMotion } from "./state.js";

const SCROLL_DELTA = 6;
const TOP_REVEAL_PX = 20;

function contextEl() {
  return document.getElementById("wizard-context");
}

function isScrollRoot(el) {
  if (!el?.classList) return false;
  return el.classList.contains("wiz-pane") || el.classList.contains("tab-panel");
}

export function resetWizardContextScroll() {
  contextEl()?.classList.remove("is-scroll-collapsed");
}

function bindWizardContextScroll() {
  const modal = document.getElementById("wizard-modal");
  if (!modal || modal.dataset.ctxScrollBound === "1") return;
  modal.dataset.ctxScrollBound = "1";

  const lastTop = new WeakMap();

  modal.addEventListener(
    "scroll",
    (e) => {
      if (reduceMotion) return;
      const root = e.target;
      if (!isScrollRoot(root)) return;

      const ctx = contextEl();
      if (!ctx || ctx.hidden) return;

      const top = root.scrollTop;
      const prev = lastTop.get(root) ?? top;
      lastTop.set(root, top);

      if (top <= TOP_REVEAL_PX) {
        ctx.classList.remove("is-scroll-collapsed");
        return;
      }

      const delta = top - prev;
      if (Math.abs(delta) < SCROLL_DELTA) return;

      if (delta > 0) ctx.classList.add("is-scroll-collapsed");
      else ctx.classList.remove("is-scroll-collapsed");
    },
    { capture: true, passive: true }
  );
}

export function initWizardContextScroll() {
  bindWizardContextScroll();
}
