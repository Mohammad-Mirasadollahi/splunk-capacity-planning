import { escapeAttr } from "./util.js";
import { lang, localizeFlow } from "./i18n.js";

const tipPop = document.getElementById("tip-pop");
let tipHideTimer = null;
let tipAnchor = null;

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
  return `<div class="tip-inner">
      <strong class="tip-title">${tipText(tip.title || "")}</strong>
      <p class="tip-body">${tipText(tip.body || "")}</p>
      <pre class="tip-formula">${tipText(tip.formula || "")}</pre>
      ${exampleBlock}
      ${impactBlock}
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
  const tip = enrichTip(key, tipCatalog()[key]);
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
