/**
 * Fade/collapse the carry-forward wizard-context banner while scrolling down
 * inside the wizard (any step / inner tab / nested table); restore on scroll up.
 */
import { reduceMotion } from "./state.js";

const SCROLL_DELTA = 6;
const TOP_REVEAL_PX = 20;

function contextEl() {
  return document.getElementById("wizard-context");
}

function wizardModal() {
  return document.getElementById("wizard-modal");
}

function isVerticalScrollable(el) {
  if (!(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  const oy = style.overflowY;
  if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

/** Nearest scrollable ancestor inside the wizard (excluding the context banner). */
function scrollRootWithinWizard(el) {
  const modal = wizardModal();
  const ctx = contextEl();
  if (!modal || !el || !modal.contains(el)) return null;
  if (ctx?.contains(el)) return null;

  let node = el;
  while (node && node !== modal) {
    if (node === ctx) return null;
    if (isVerticalScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

export function resetWizardContextScroll() {
  contextEl()?.classList.remove("is-scroll-collapsed");
}

function bindWizardContextScroll() {
  const modal = wizardModal();
  if (!modal || modal.dataset.ctxScrollBound === "1") return;
  modal.dataset.ctxScrollBound = "1";

  const lastTop = new WeakMap();

  modal.addEventListener(
    "scroll",
    (e) => {
      if (reduceMotion) return;
      const root = scrollRootWithinWizard(e.target);
      if (!root) return;

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
