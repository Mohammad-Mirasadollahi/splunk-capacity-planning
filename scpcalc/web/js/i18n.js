import { I18N } from "./i18n-dict.js";
import { LANG_KEY, state } from "./state.js";

let onAfterSetLang = null;

export function setI18nHooks(hooks) {
  onAfterSetLang = hooks?.onAfterSetLang || null;
}

export function lang() {
  try {
    const s = localStorage.getItem(LANG_KEY);
    if (s === "en" || s === "fa") return s;
  } catch (_) {}
  return "en";
}

/** Flip LTR flow arrows for Persian/RTL UI (→ becomes ←, etc.). */
export function localizeFlow(text) {
  if (text == null) return text;
  const s = String(text);
  if (lang() !== "fa") return s;
  return s
    .replaceAll("→", "←")
    .replaceAll("⟶", "⟵")
    .replaceAll("⇒", "⇐")
    .replaceAll("↗", "↖");
}

export function t(key) {
  const raw = (I18N[lang()] || I18N.en)[key] || key;
  return localizeFlow(raw);
}

export function setLang(next) {
  const l = next === "fa" ? "fa" : "en";
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch (_) {}
  document.documentElement.lang = l;
  document.body.dataset.lang = l;
  document.body.dir = l === "fa" ? "rtl" : "ltr";
  const docsURL = `https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=${l}`;
  document.querySelectorAll("#link-docs-hub, #link-docs-hub-btn, #link-docs-hub-hero, a[data-docs-hub]").forEach((a) => {
    a.setAttribute("href", docsURL);
  });
  document.querySelectorAll(".lang button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.lang === l));
  });
  const dict = I18N[l];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (!dict[k]) return;
    const text = localizeFlow(dict[k]);
    if (el.classList.contains("cta") || el.querySelector?.(".cta-label")) {
      const label = el.querySelector(".cta-label") || el;
      label.textContent = text;
    } else {
      el.textContent = text;
    }
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const k = el.getAttribute("data-i18n-html");
    if (dict[k]) el.innerHTML = localizeFlow(dict[k]);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const k = el.getAttribute("data-i18n-placeholder");
    if (dict[k]) el.setAttribute("placeholder", localizeFlow(dict[k]));
  });
  onAfterSetLang?.(l);
}

export function bindLangSwitcher() {
  document.querySelectorAll(".lang button").forEach((b) => {
    b.addEventListener("click", () => setLang(b.dataset.lang));
  });
  setLang(lang());
}

export { I18N };
