/**
 * Replace native number spinners with glass-styled +/- controls.
 */
function stepValue(input, dir) {
  const step = Number(input.step) > 0 ? Number(input.step) : 1;
  const min = input.min !== "" ? Number(input.min) : Number.NEGATIVE_INFINITY;
  const max = input.max !== "" ? Number(input.max) : Number.POSITIVE_INFINITY;
  const raw = input.value === "" ? 0 : Number(input.value);
  const base = Number.isFinite(raw) ? raw : 0;
  let next = base + dir * step;
  // Avoid float noise for integer-ish steps
  if (Number.isInteger(step) || step >= 1) next = Math.round(next / step) * step;
  else next = Math.round(next * 1e6) / 1e6;
  next = Math.min(max, Math.max(min, next));
  input.value = String(next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function enhanceNumberInput(input) {
  if (!input || input.type !== "number" || input.dataset.stepper === "1") return;
  if (input.closest(".num-stepper")) {
    input.dataset.stepper = "1";
    return;
  }
  input.dataset.stepper = "1";

  const wrap = document.createElement("div");
  wrap.className = "num-stepper";
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const btns = document.createElement("div");
  btns.className = "num-stepper-btns";
  btns.setAttribute("aria-hidden", "false");

  const mkBtn = (dir, label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "num-step-btn";
    b.dataset.dir = String(dir);
    b.setAttribute("aria-label", label);
    b.tabIndex = -1;
    b.innerHTML =
      dir > 0
        ? '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 6.2 6 1.8l4.5 4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.8 6 6.2l4.5-4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (input.disabled || input.readOnly) return;
      stepValue(input, dir);
      input.focus({ preventScroll: true });
    });
    return b;
  };

  btns.appendChild(mkBtn(1, "Increase"));
  btns.appendChild(mkBtn(-1, "Decrease"));
  wrap.appendChild(btns);
}

export function bindNumberSteppers(root = document) {
  root.querySelectorAll('input[type="number"]').forEach(enhanceNumberInput);

  // Sources table rows are re-rendered — observe tbody additions
  const bodies = root.querySelectorAll("#src-body, #src-ret-body, .src-table tbody");
  bodies.forEach((tbody) => {
    if (tbody.dataset.stepperObs === "1") return;
    tbody.dataset.stepperObs = "1";
    const mo = new MutationObserver(() => {
      tbody.querySelectorAll('input[type="number"]').forEach(enhanceNumberInput);
    });
    mo.observe(tbody, { childList: true, subtree: true });
  });
}
