import { t } from "./i18n.js";

/** Filter table rows by a search query; optional count label. */
export function applyTableFind(inputId, tbodyId, countId) {
  const input = document.getElementById(inputId);
  const tbody = document.getElementById(tbodyId);
  const countEl = countId ? document.getElementById(countId) : null;
  if (!input || !tbody) return;
  const q = (input.value || "").trim().toLowerCase();
  let shown = 0;
  let total = 0;
  tbody.querySelectorAll("tr").forEach((tr) => {
    total += 1;
    const hay = (tr.dataset.find || tr.textContent || "").toLowerCase();
    const match = !q || hay.includes(q);
    tr.hidden = !match;
    tr.classList.toggle("is-find-hit", Boolean(q && match));
    if (match) shown += 1;
  });
  if (countEl) {
    if (!q) {
      countEl.hidden = true;
      countEl.textContent = "";
    } else {
      countEl.hidden = false;
      countEl.textContent = t("table_find_count").replace("{n}", String(shown)).replace("{t}", String(total));
    }
  }
}

export function bindTableFind(inputId, tbodyId, countId) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.bound === "1") return;
  input.dataset.bound = "1";
  const run = () => applyTableFind(inputId, tbodyId, countId);
  input.addEventListener("input", run);
  input.addEventListener("search", run);
}
