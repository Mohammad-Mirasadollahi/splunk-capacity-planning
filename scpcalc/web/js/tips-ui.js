import { escapeAttr } from "./util.js";
import { lang } from "./i18n.js";

const tipPop = document.getElementById("tip-pop");
let tipHideTimer = null;
let tipAnchor = null;

export function tipCatalog() {
  const pack = window.SCP_TIPS || {};
  return pack[lang()] || pack.en || {};
}

function renderTipHTML(tip) {
  if (!tip) return "";
  const links = (tip.links || [])
    .map(
      (L) =>
        `<a class="tip-doc" href="${L.url}" target="_blank" rel="noopener noreferrer">${escapeAttr(L.label)} ↗</a>`
    )
    .join("");
  return `<div class="tip-inner">
      <strong class="tip-title">${escapeAttr(tip.title || "")}</strong>
      <p class="tip-body">${escapeAttr(tip.body || "")}</p>
      <pre class="tip-formula">${escapeAttr(tip.formula || "")}</pre>
      <p class="tip-example"><span>${lang() === "fa" ? "مثال" : "Example"}</span> ${escapeAttr(tip.example || "")}</p>
      <div class="tip-links">${links}</div>
    </div>`;
}

function positionTip(anchor) {
  if (!tipPop || !anchor) return;
  const r = anchor.getBoundingClientRect();
  tipPop.hidden = false;
  const tw = tipPop.offsetWidth || 340;
  const th = tipPop.offsetHeight || 200;
  let left = r.left + r.width / 2 - tw / 2;
  let top = r.bottom + 10;
  left = Math.max(10, Math.min(left, window.innerWidth - tw - 10));
  if (top + th > window.innerHeight - 10) {
    top = r.top - th - 10;
  }
  tipPop.style.left = `${left}px`;
  tipPop.style.top = `${Math.max(10, top)}px`;
}

function showTip(anchor) {
  const key = anchor.getAttribute("data-tip");
  const tip = tipCatalog()[key];
  if (!tip || !tipPop) return;
  clearTimeout(tipHideTimer);
  tipAnchor = anchor;
  tipPop.innerHTML = renderTipHTML(tip);
  positionTip(anchor);
}

function scheduleHideTip() {
  clearTimeout(tipHideTimer);
  tipHideTimer = setTimeout(() => {
    if (tipPop) tipPop.hidden = true;
    tipAnchor = null;
  }, 220);
}

export function bindTips(root) {
  (root || document).querySelectorAll("[data-tip]").forEach((el) => {
    if (el.dataset.tipBound === "1") return;
    el.dataset.tipBound = "1";
    el.classList.add("tip-mark");
    el.addEventListener("mouseenter", () => showTip(el));
    el.addEventListener("mouseleave", scheduleHideTip);
    el.addEventListener("focus", () => showTip(el));
    el.addEventListener("blur", scheduleHideTip);
  });
}

export function initTips() {
  tipPop?.addEventListener("mouseenter", () => clearTimeout(tipHideTimer));
  tipPop?.addEventListener("mouseleave", scheduleHideTip);
  window.addEventListener(
    "scroll",
    () => {
      if (tipAnchor && tipPop && !tipPop.hidden) positionTip(tipAnchor);
    },
    true
  );
  bindTips(document);
}

export function refreshOpenTip() {
  if (tipAnchor && tipPop && !tipPop.hidden) showTip(tipAnchor);
}
