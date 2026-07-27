/**
 * Volume input mode (Daily GB = EPS pair); planning always uses Daily GB.
 */
import { state } from "../state.js";
import { t } from "../i18n.js";
import { refreshTotalCounterpart, renderRows } from "../sources.js";

export function syncVolumeInputMode(_mode, { convert: _convert = false } = {}) {
  // Dual GB = EPS inputs are always shown; planning uses Daily GB.
  state.volumeInputMode = "daily_gb";
  const volHead = document.getElementById("col-vol-label");
  if (volHead) {
    volHead.setAttribute("data-i18n", "col_vol_pair");
    volHead.setAttribute("data-tip", "daily_gb");
    volHead.textContent = t("col_vol_pair");
  }
  document.querySelectorAll(".src-col-event-bytes").forEach((el) => {
    el.hidden = false;
  });
  renderRows();
  refreshTotalCounterpart();
}

export function readVolumeInputMode() {
  return "daily_gb";
}
