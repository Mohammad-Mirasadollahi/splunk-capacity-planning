/**
 * Validate required search-load inputs (peak concurrent searches at one moment).
 */
import { t } from "./i18n.js";

export function readConcurrentSearches() {
  const el = document.getElementById("concurrent_searches") || document.querySelector('input[name="concurrent_searches"]');
  if (!el) return 0;
  const raw = String(el.value ?? "").trim();
  if (raw === "") return 0;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function setSearchLoadError(message) {
  const box = document.getElementById("search-load-err");
  if (!box) return;
  if (message) {
    box.hidden = false;
    box.textContent = message;
  } else {
    box.hidden = true;
    box.textContent = "";
  }
}

/** @returns {{ ok: true } | { ok: false, message: string }} */
export function validateSearchLoad() {
  const searches = readConcurrentSearches();
  if (!(searches > 0)) {
    const message = t("err_concurrent_searches");
    setSearchLoadError(message);
    return { ok: false, message };
  }
  const usersEl = document.getElementById("concurrent_users");
  const users = Math.floor(Number(usersEl?.value) || 0);
  if (!(users > 0)) {
    const message = t("err_concurrent_searches");
    setSearchLoadError(message);
    return { ok: false, message };
  }
  setSearchLoadError("");
  return { ok: true };
}

export function focusSearchLoadField() {
  const el = document.getElementById("concurrent_searches");
  el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  el?.focus?.();
  el?.reportValidity?.();
}
