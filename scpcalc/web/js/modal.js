import { reduceMotion } from "./state.js";

let scrollLockDepth = 0;
let savedScrollY = 0;
let scrollGuardBound = false;

function isScrollable(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  const style = getComputedStyle(el);
  const oy = style.overflowY;
  if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

/** Ordered scroll regions inside the wizard modal (outer → inner). */
function wizardScrollCandidates(from) {
  const root = from?.closest?.(".modal-root:not([hidden])");
  if (!root) return [];
  const out = [];
  const fs = from?.closest?.(".sources-panel.is-fullscreen");
  if (fs) out.push(fs);
  const panel = from?.closest?.(".wiz-pane > .tab-panel.is-active");
  if (panel) out.push(panel);
  const pane = root.querySelector(".wiz-pane.is-active:not(:has(> .tab-bar))");
  if (pane && from?.closest?.(".wiz-pane") === pane) out.push(pane);
  const body = root.querySelector(".wizard-body");
  if (body) out.push(body);
  return out.filter((el, i, arr) => el && arr.indexOf(el) === i);
}

/** Nearest scrollable region inside the open modal dialog. */
function scrollableWithinModal(from) {
  const root = from?.closest?.(".modal-root:not([hidden])");
  if (!root) return null;
  const boundary = root.querySelector(".modal") || root;
  let node = from;
  while (node && node !== boundary) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function pickModalScrollTarget(from) {
  const direct = scrollableWithinModal(from);
  if (direct) return direct;
  for (const el of wizardScrollCandidates(from)) {
    if (isScrollable(el)) return el;
    const max = el.scrollHeight - el.clientHeight;
    if (max > 1) return el;
  }
  return null;
}

function applyWheelScroll(e, scrollable) {
  const max = scrollable.scrollHeight - scrollable.clientHeight;
  if (max <= 0) {
    e.preventDefault();
    return;
  }
  const top = scrollable.scrollTop;
  const next = Math.max(0, Math.min(max, top + e.deltaY));
  if (next === top) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  scrollable.scrollTop = next;
}

/** Block wheel events from reaching the locked page behind the modal. */
function onModalWheel(e) {
  if (!document.body.classList.contains("modal-open")) return;

  const fsPanel = e.target.closest(".sources-panel.is-fullscreen");
  if (fsPanel) {
    applyWheelScroll(e, fsPanel);
    return;
  }

  const root = e.target.closest(".modal-root:not([hidden])");
  if (!root) {
    e.preventDefault();
    return;
  }

  const scrollable = pickModalScrollTarget(e.target);
  if (!scrollable) {
    e.preventDefault();
    return;
  }

  const max = scrollable.scrollHeight - scrollable.clientHeight;
  if (max <= 0) {
    e.preventDefault();
    return;
  }

  const top = scrollable.scrollTop;
  if (e.deltaY < 0 && top <= 0) {
    e.preventDefault();
    return;
  }
  if (e.deltaY > 0 && top >= max - 1) {
    e.preventDefault();
    return;
  }

  // Inputs/tables are not scroll containers — drive the wizard pane ourselves.
  if (scrollableWithinModal(e.target) !== scrollable) {
    applyWheelScroll(e, scrollable);
  }
}

function ensureScrollGuard() {
  if (scrollGuardBound) return;
  scrollGuardBound = true;
  document.addEventListener("wheel", onModalWheel, { passive: false, capture: true });
}

function lockPageScroll() {
  scrollLockDepth += 1;
  if (scrollLockDepth > 1) return;
  savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  scrollLockDepth = Math.max(0, scrollLockDepth - 1);
  if (scrollLockDepth > 0) return;
  const y = savedScrollY;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, y);
}

export function openModal(el) {
  if (!el) return;
  ensureScrollGuard();
  el.hidden = false;
  lockPageScroll();
  if (!reduceMotion) {
    el.querySelector(".modal")?.animate(
      [
        { opacity: 0, transform: "translateY(16px) scale(0.98)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
  }
}

export function closeModal(el) {
  if (!el || el.hidden) return;
  el.hidden = true;
  unlockPageScroll();
}

export function bindModalChrome({ onEscapeWizard, onEscapeOther } = {}) {
  ensureScrollGuard();
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-modal");
      const m = document.getElementById(id);
      if (m) openModal(m);
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      const root = el.closest(".modal-root");
      if (root) closeModal(root);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = [...document.querySelectorAll(".modal-root")].filter((m) => !m.hidden);
    if (!open.length) return;
    const top = open[open.length - 1];
    if (top.id === "wizard-modal") onEscapeWizard?.();
    else onEscapeOther?.(top);
  });
}
