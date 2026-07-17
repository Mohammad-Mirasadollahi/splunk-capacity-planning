import { reduceMotion } from "./state.js";

export function openModal(el) {
  if (!el) return;
  el.hidden = false;
  document.body.classList.add("modal-open");
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
  if (!el) return;
  el.hidden = true;
  if (![...document.querySelectorAll(".modal-root")].some((m) => !m.hidden)) {
    document.body.classList.remove("modal-open");
  }
}

export function bindModalChrome({ onEscapeWizard, onEscapeOther } = {}) {
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
