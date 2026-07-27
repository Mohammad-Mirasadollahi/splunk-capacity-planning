/**
 * Archive-on-freeze field sync and related retention hints.
 */
import { t } from "../i18n.js";
import { refreshOpenTip } from "../tips-ui.js";
import { syncToggleUI } from "./01-toggle-ui.js";
import { syncCapacityPair } from "./03-capacity-bridge.js";

export function syncArchiveFields() {
  syncToggleUI();
  const on = !!document.getElementById("archive_frozen")?.checked;
  const hintKey = on ? "hint_retention_archive" : "hint_retention_delete";
  const policyKey = on ? "hint_archive_policy_archive" : "hint_archive_policy_delete";
  const retentionHint = document.getElementById("hint_retention_dyn");
  if (retentionHint) {
    retentionHint.setAttribute("data-i18n", hintKey);
    retentionHint.textContent = t(hintKey);
  }
  const policyHint = document.getElementById("hint_archive_policy");
  if (policyHint) {
    policyHint.setAttribute("data-i18n", policyKey);
    policyHint.textContent = t(policyKey);
  }
  const daysEl = document.getElementById("archive_days");
  if (daysEl && on && !(Number(daysEl.value) > 0)) {
    daysEl.value = "90";
  }
  syncCapacityPair(null);
  refreshOpenTip();
}
