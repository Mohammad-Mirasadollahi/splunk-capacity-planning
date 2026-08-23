/**
 * Retention time ↔ searchable disk GB bridge (capacity pair).
 * Avoids importing collectGlobals to prevent circular deps with globals.js.
 */
import { state } from "../state.js";
import { t } from "../i18n.js";
import { dailyGBFromEPS, numOr0, resolveEventBytes } from "../volume-convert.js";
import {
  dailyOnDiskFromRaw,
  daysFromDiskGB,
  diskGBFromDays,
  estimateCompression,
  formatDiskGB,
  roundDiskGB,
} from "../retention-convert.js";

function readIntDays(el, fallback = 0) {
  const n = Number(el?.value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function planningDailyRawGB() {
  const totalEl = document.getElementById("total_daily_gb") || document.querySelector('input[name="total_daily_gb"]');
  const total = numOr0(totalEl?.value);
  if (total > 0) return total;
  let sum = 0;
  state.rows
    .filter((r) => r.enabled)
    .forEach((r) => {
      const bytes = resolveEventBytes(r, state.rows);
      let daily = numOr0(r.daily_gb);
      if (!(daily > 0) && numOr0(r.eps) > 0) daily = dailyGBFromEPS(r.eps, bytes);
      sum += daily;
    });
  return sum;
}

export function planningDailyOnDiskGB() {
  const raw = planningDailyRawGB();
  const compression = numOr0(
    document.getElementById("compression")?.value ?? document.querySelector('input[name="compression"]')?.value
  );
  const indexerCluster = !!document.getElementById("indexer_cluster")?.checked;
  const rf = Number(document.getElementById("rf")?.value) || 1;
  const sf = Number(document.getElementById("sf")?.value) || 1;
  const comp = estimateCompression({
    compression,
    indexer_cluster: indexerCluster,
    rf,
    sf,
  });
  return dailyOnDiskFromRaw(raw, comp);
}

/** Last edit direction for bridge refreshes: "time" (days→GB) or "disk" (GB→days). */
export function readCapacityPlanMode() {
  return state.capacityPlanMode === "disk" ? "disk" : "time";
}

function setCapSidesLinked() {
  ["cap-time-box", "cap-disk-box"].forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    box.classList.add("is-primary");
    box.classList.remove("is-counterpart");
    box.querySelectorAll("input:not([type=hidden]):not([type=checkbox])").forEach((el) => {
      if (el.name === "frozen_path" || el.name === "archive_days") return;
      el.readOnly = false;
      el.classList.remove("is-counterpart-input");
    });
  });
}

function updateCapacityLabels() {
  const hotLbl = document.getElementById("lbl_cap_hot");
  const coldLbl = document.getElementById("lbl_cap_cold");
  const hotHint = document.getElementById("hint_cap_hot");
  const coldHint = document.getElementById("hint_cap_cold");
  const modeHint = document.getElementById("cap-mode-hint");
  if (hotLbl) {
    hotLbl.setAttribute("data-i18n", "lbl_avail_hot");
    hotLbl.textContent = t("lbl_avail_hot");
  }
  if (coldLbl) {
    coldLbl.setAttribute("data-i18n", "lbl_avail_cold");
    coldLbl.textContent = t("lbl_avail_cold");
  }
  if (hotHint) {
    hotHint.setAttribute("data-i18n", "hint_avail_hot");
    hotHint.textContent = t("hint_avail_hot");
  }
  if (coldHint) {
    coldHint.setAttribute("data-i18n", "hint_avail_cold");
    coldHint.textContent = t("hint_avail_cold");
  }
  if (modeHint) {
    modeHint.setAttribute("data-i18n", "cap_mode_hint_linked");
    modeHint.textContent = t("cap_mode_hint_linked");
  }
}

function syncRetentionTotal(hot, cold) {
  const total = Math.max(0, hot + cold);
  const hidden = document.getElementById("retention_days") || document.querySelector('input[name="retention_days"]');
  const out = document.getElementById("retention_total_out");
  if (hidden) hidden.value = String(total || "");
  if (out) out.textContent = total > 0 ? String(total) : "—";
  return total;
}

export function syncDiskTotal(hotGB, coldGB) {
  const out = document.getElementById("disk_total_out");
  const sum = numOr0(hotGB) + numOr0(coldGB);
  if (out) {
    out.textContent = sum > 0 ? t("disk_total_fmt").replace("{n}", formatDiskGB(sum)) : "—";
  }
  const sumEl = document.getElementById("available_summaries_gb");
  updateDiskScenario(numOr0(hotGB), numOr0(coldGB), sum, numOr0(sumEl?.value));
  return sum;
}

function updateTimeScenario(hot, cold, total) {
  const el = document.getElementById("cap-time-scenario");
  if (!el) return;
  const archive = !!document.getElementById("archive_frozen")?.checked;
  const archDays = archive ? Math.max(0, readIntDays(document.getElementById("archive_days"))) : 0;
  const key = archive ? "cap_scenario_archive" : "cap_scenario_delete";
  el.setAttribute("data-i18n", key);
  el.textContent = t(key)
    .replace("{hot}", String(hot))
    .replace("{cold}", String(cold))
    .replace("{total}", String(total))
    .replace("{arch}", String(archDays));
}

function updateDiskScenario(hotGB, coldGB, totalGB, summariesGB) {
  const el = document.getElementById("cap-disk-scenario");
  if (!el) return;
  el.setAttribute("data-i18n", "cap_scenario_disk");
  el.textContent = t("cap_scenario_disk")
    .replace("{hot}", formatDiskGB(hotGB))
    .replace("{cold}", formatDiskGB(coldGB))
    .replace("{total}", formatDiskGB(totalGB))
    .replace("{sum}", formatDiskGB(summariesGB));
}

/** Read-only coldPath preview after days are known. */
export function syncColdVolumePreview() {
  const out = document.getElementById("cold_vol_auto");
  if (!out) return;
  const hot = readIntDays(document.getElementById("hot_warm_days") || document.querySelector('input[name="hot_warm_days"]'));
  const coldEl = document.getElementById("cold_days");
  let cold = coldEl ? readIntDays(coldEl) : 0;
  const retHidden = document.getElementById("retention_days");
  const ret = retHidden ? readIntDays(retHidden) : hot + cold;
  if (!coldEl && ret > hot) cold = ret - hot;
  if (!ret) {
    out.textContent = "—";
    return;
  }
  if (cold <= 0) {
    out.textContent = t("cold_vol_auto_zero");
    return;
  }
  out.textContent = t("cold_vol_auto").replace("{days}", String(cold));
}

/**
 * Sync retention time ↔ searchable disk GB (both sides always editable).
 * Edit days → update GB; edit GB → update days. Bridge/rate refresh uses last direction.
 * @param {"hot_days"|"cold_days"|"hot_gb"|"cold_gb"|"mode"|"bridge"|null} edited
 */
export function syncCapacityPair(edited = null) {
  setCapSidesLinked();
  updateCapacityLabels();

  const hotDaysEl = document.getElementById("hot_warm_days") || document.querySelector('input[name="hot_warm_days"]');
  const coldDaysEl = document.getElementById("cold_days");
  const hotGBEl = document.getElementById("available_hot_gb") || document.querySelector('input[name="available_hot_gb"]');
  const coldGBEl = document.getElementById("available_cold_gb") || document.querySelector('input[name="available_cold_gb"]');
  if (!hotDaysEl || !coldDaysEl || !hotGBEl || !coldGBEl) {
    syncColdVolumePreview();
    return;
  }

  if (edited === "hot_days" || edited === "cold_days") state.capacityPlanMode = "time";
  else if (edited === "hot_gb" || edited === "cold_gb") state.capacityPlanMode = "disk";

  const headroomEl = document.getElementById("headroom") || document.querySelector('input[name="headroom"]');
  const headroomN = Number(headroomEl?.value);
  const headroom = headroomN >= 1 ? headroomN : 1;
  const rate = planningDailyOnDiskGB();
  const bridge = document.getElementById("cap-disk-bridge");
  if (bridge) {
    if (!(rate > 0)) {
      bridge.setAttribute("data-i18n", "cap_bridge_need_volume");
      bridge.textContent = t("cap_bridge_need_volume");
    } else {
      bridge.setAttribute("data-i18n", "cap_bridge_hint");
      bridge.textContent = t("cap_bridge_hint").replace("{rate}", formatDiskGB(rate)).replace("{h}", String(headroom));
    }
  }

  const fromDays =
    edited === "hot_days" ||
    edited === "cold_days" ||
    ((edited === "bridge" || edited === "mode" || edited == null) && state.capacityPlanMode !== "disk");

  if (fromDays) {
    const hot = readIntDays(hotDaysEl, 0);
    const cold = readIntDays(coldDaysEl, 0);
    const total = syncRetentionTotal(hot, cold);
    updateTimeScenario(hot, cold, total);
    if (rate > 0) {
      if (document.activeElement !== hotGBEl) {
        const needHot = roundDiskGB(diskGBFromDays(hot, rate, headroom));
        hotGBEl.value = needHot > 0 ? String(needHot) : "";
      }
      if (document.activeElement !== coldGBEl) {
        const needCold = roundDiskGB(diskGBFromDays(cold, rate, headroom));
        coldGBEl.value = needCold > 0 ? String(needCold) : "";
      }
    }
    syncDiskTotal(numOr0(hotGBEl.value), numOr0(coldGBEl.value));
  } else {
    const hotGB = numOr0(hotGBEl.value);
    const coldGB = numOr0(coldGBEl.value);
    syncDiskTotal(hotGB, coldGB);
    if (rate > 0) {
      if (document.activeElement !== hotDaysEl) {
        hotDaysEl.value = String(daysFromDiskGB(hotGB, rate, headroom));
      }
      if (document.activeElement !== coldDaysEl) {
        coldDaysEl.value = String(daysFromDiskGB(coldGB, rate, headroom));
      }
    }
    const hot = readIntDays(hotDaysEl, 0);
    const cold = readIntDays(coldDaysEl, 0);
    const total = syncRetentionTotal(hot, cold);
    updateTimeScenario(hot, cold, total);
  }

  syncColdVolumePreview();
  import("../sources.js").then((m) => m.refreshIndexSizePreviews?.()).catch(() => {});
}
