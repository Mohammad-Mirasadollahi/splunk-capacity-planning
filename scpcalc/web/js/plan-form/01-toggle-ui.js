/** Mark checkbox chips on/off and show/hide fields with data-depends-on="<checkbox id>". */

export function syncToggleUI() {
  document.querySelectorAll('.field.check input[type="checkbox"]').forEach((input) => {
    const chip = input.closest(".field.check");
    if (!chip) return;
    const on = !!input.checked;
    chip.classList.toggle("is-on", on);
    chip.classList.toggle("is-off", !on);
    chip.setAttribute("aria-checked", on ? "true" : "false");
    if (input.id) {
      document.querySelectorAll(`[data-depends-on="${input.id}"]`).forEach((el) => {
        el.hidden = !on;
        el.classList.toggle("is-revealed", on);
        el.querySelectorAll("input, select, textarea").forEach((ctrl) => {
          ctrl.disabled = !on;
        });
      });
    }
  });
}
