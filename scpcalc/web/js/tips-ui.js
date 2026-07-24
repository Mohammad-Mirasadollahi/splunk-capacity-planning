import { escapeAttr } from "./util.js";
import { lang, localizeFlow, t } from "./i18n.js";

const tipPop = document.getElementById("tip-pop");
let tipHideTimer = null;
let tipShowTimer = null;
let tipAnchor = null;

/** Delay before show so a quick mouse pass does not flash the tip. */
const TIP_SHOW_DELAY_MS = 550;
const TIP_HIDE_DELAY_MS = 220;

export function tipCatalog() {
  const pack = window.SCP_TIPS || {};
  return pack[lang()] || pack.en || {};
}

function tipText(s) {
  return escapeAttr(localizeFlow(s || ""));
}

function archiveFrozenOn() {
  return !!document.getElementById("archive_frozen")?.checked;
}

/** Clone tip and inject Archive-on-freeze state into Index volume tip. */
function enrichTip(key, tip) {
  if (!tip) return tip;
  if (key !== "retention_days" && key !== "archive_frozen") return tip;
  const isFa = lang() === "fa";
  const on = archiveFrozenOn();
  const base = key === "archive_frozen" ? tipCatalog().retention_days || tip : tip;
  const out = { ...base, links: base.links };
  out.title = isFa ? "حجم کلی Index" : "Index volume (maxTotalDataSizeMB)";
  if (on) {
    out.body = isFa
      ? "سقف حجم searchable یک Index در Splunk (hot+warm+cold) تا زمان freeze. فرمول: ingest روزانه روی دیسک × روز × headroom. Freeze روی عمر یا حجم — هرکدام زودتر. آرشیو هنگام Freeze روشن است → بعد از freeze داده به مسیر آرشیو می‌رود (coldToFrozenDir)."
      : "Total searchable size budget for one Splunk Index (hot+warm+cold) until freeze. Sized as daily on-disk × retention_days × headroom. Freeze triggers on age OR size — whichever comes first. Archive on freeze is ON → after freeze, buckets move to the archive path (coldToFrozenDir).";
    out.example = isFa
      ? "۹۰ روز → frozenTimePeriodInSecs = ۷٬۷۷۶٬۰۰۰. حجم Index ≈ روزانه روی دیسک × ۹۰ × headroom؛ سپس آرشیو."
      : "90 days → frozenTimePeriodInSecs = 7,776,000. Index volume ≈ daily on-disk × 90 × headroom; then archive.";
    out.impact = isFa
      ? "نگهداری طولانی‌تر → حجم Index بزرگ‌تر قبل از آرشیو. کوتاه‌تر → زودتر به آرشیو می‌رود. خاموش کردن آرشیو → به‌جای آرشیو، حذف."
      : "Longer retention → larger Index volume before archive. Shorter → freezes to archive sooner. Turn Archive off → delete instead of archive.";
  } else {
    out.body = isFa
      ? "سقف حجم searchable یک Index در Splunk (hot+warm+cold) تا زمان freeze. فرمول: ingest روزانه روی دیسک × روز × headroom. Freeze روی عمر یا حجم — هرکدام زودتر. آرشیو هنگام Freeze خاموش است → بعد از freeze داده حذف می‌شود (بدون coldToFrozenDir)."
      : "Total searchable size budget for one Splunk Index (hot+warm+cold) until freeze. Sized as daily on-disk × retention_days × headroom. Freeze triggers on age OR size — whichever comes first. Archive on freeze is OFF → after freeze, buckets are deleted (no coldToFrozenDir).";
    out.example = isFa
      ? "۹۰ روز → frozenTimePeriodInSecs = ۷٬۷۷۶٬۰۰۰. حجم Index ≈ روزانه روی دیسک × ۹۰ × headroom؛ سپس حذف."
      : "90 days → frozenTimePeriodInSecs = 7,776,000. Index volume ≈ daily on-disk × 90 × headroom; then delete.";
    out.impact = isFa
      ? "نگهداری طولانی‌تر → حجم Index بزرگ‌تر قبل از حذف. کوتاه‌تر → زودتر حذف می‌شود. روشن کردن آرشیو → به‌جای حذف، به مسیر آرشیو می‌رود."
      : "Longer retention → larger Index volume before delete. Shorter → deletes sooner. Turn Archive on → move to archive path instead of delete.";
  }
  return out;
}

function renderTipHTML(tip) {
  if (!tip) return "";
  const links = (tip.links || [])
    .map(
      (L) =>
        `<a class="tip-doc" href="${L.url}" target="_blank" rel="noopener noreferrer">${escapeAttr(L.label)} ${lang() === "fa" ? "↖" : "↗"}</a>`
    )
    .join("");
  const isFa = lang() === "fa";
  const exampleBlock = tip.example
    ? `<p class="tip-example"><span>${isFa ? "مثال" : "Example"}</span> ${tipText(tip.example)}</p>`
    : "";
  const impactBlock = tip.impact
    ? `<p class="tip-impact"><span>${isFa ? "اگر عوض شود" : "If you change this"}</span> ${tipText(tip.impact)}</p>`
    : "";
  const formulaBlock = tip.formula
    ? `<pre class="tip-formula">${tipText(tip.formula)}</pre>`
    : "";
  const titleBlock = tip.title ? `<strong class="tip-title">${tipText(tip.title)}</strong>` : "";
  const bodyBlock = tip.body ? `<p class="tip-body">${tipText(tip.body)}</p>` : "";
  const linksBlock = links ? `<div class="tip-links">${links}</div>` : "";
  return `<div class="tip-inner">
      ${titleBlock}
      ${bodyBlock}
      ${formulaBlock}
      ${exampleBlock}
      ${impactBlock}
      ${linksBlock}
    </div>`;
}

/** Plain-text / pipe-separated soft tip (replaces native browser title tooltips). */
function renderSoftTipHTML(text, heading) {
  const raw = String(text || "").trim();
  if (!raw && !heading) return "";
  const parts = raw
    .split(/\s*\|\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const headingBlock = heading ? `<strong class="tip-title">${tipText(heading)}</strong>` : "";
  if (parts.length <= 1 && !heading) {
    return `<div class="tip-inner tip-inner--soft"><p class="tip-body">${tipText(raw)}</p></div>`;
  }
  if (parts.length <= 1) {
    return `<div class="tip-inner tip-inner--soft">${headingBlock}<p class="tip-body">${tipText(parts[0] || raw)}</p></div>`;
  }
  const items = parts.map((p) => `<li>${tipText(p)}</li>`).join("");
  return `<div class="tip-inner tip-inner--soft">${headingBlock}<ul class="tip-soft-list">${items}</ul></div>`;
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
  if (!tipPop || !anchor) return;
  const tipKey = anchor.getAttribute("data-soft-tip-key");
  const soft = tipKey ? t(tipKey) : anchor.getAttribute("data-soft-tip");
  const key = anchor.getAttribute("data-tip");
  let html = "";
  if (soft) {
    tipPop.classList.add("is-soft");
    const heading =
      tipKey && soft
        ? anchor.getAttribute("data-soft-tip-title") ||
          (anchor.getAttribute("data-i18n") ? t(anchor.getAttribute("data-i18n")) : anchor.textContent?.trim() || "")
        : anchor.getAttribute("data-soft-tip-title") || "";
    html = renderSoftTipHTML(soft, heading);
  } else if (key) {
    tipPop.classList.remove("is-soft");
    const tip = enrichTip(key, tipCatalog()[key]);
    html = renderTipHTML(tip);
  }
  if (!html) return;
  clearTimeout(tipHideTimer);
  clearTimeout(tipShowTimer);
  tipShowTimer = null;
  tipAnchor = anchor;
  tipPop.innerHTML = html;
  positionTip(anchor);
}

function scheduleShowTip(anchor) {
  clearTimeout(tipHideTimer);
  clearTimeout(tipShowTimer);
  tipShowTimer = setTimeout(() => {
    tipShowTimer = null;
    showTip(anchor);
  }, TIP_SHOW_DELAY_MS);
}

function scheduleHideTip() {
  clearTimeout(tipShowTimer);
  tipShowTimer = null;
  clearTimeout(tipHideTimer);
  tipHideTimer = setTimeout(() => {
    if (tipPop) tipPop.hidden = true;
    tipAnchor = null;
  }, TIP_HIDE_DELAY_MS);
}

function wireTipEl(el) {
  if (el.dataset.tipBound === "1") return;
  el.dataset.tipBound = "1";
  el.classList.add("tip-mark");
  // Kill native browser tooltips that clash with dark UI.
  if (el.hasAttribute("title") && !el.getAttribute("data-soft-tip")) {
    el.setAttribute("data-soft-tip", el.getAttribute("title") || "");
    el.removeAttribute("title");
  } else if (el.hasAttribute("title")) {
    el.removeAttribute("title");
  }
  el.addEventListener("mouseenter", () => scheduleShowTip(el));
  el.addEventListener("mouseleave", scheduleHideTip);
  el.addEventListener("focus", () => showTip(el));
  el.addEventListener("blur", scheduleHideTip);
}

export function bindTips(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-tip], [data-soft-tip], [data-soft-tip-key]").forEach(wireTipEl);
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

/** Set a soft tip on an element (replaces native title). */
export function setSoftTip(el, text, title) {
  if (!el) return;
  const body = String(text || "").trim();
  if (!body) {
    el.removeAttribute("data-soft-tip");
    el.removeAttribute("data-soft-tip-title");
    el.removeAttribute("title");
    return;
  }
  el.setAttribute("data-soft-tip", body);
  if (title) el.setAttribute("data-soft-tip-title", String(title));
  else el.removeAttribute("data-soft-tip-title");
  el.removeAttribute("title");
  el.dataset.tipBound = "";
  wireTipEl(el);
}
