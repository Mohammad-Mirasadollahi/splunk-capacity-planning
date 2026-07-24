/**
 * Volume-step budgets vs Sources / disk need.
 * total_daily_gb and available_* are caps — exceeding them is an error.
 */
import { state } from "./state.js";
import { t } from "./i18n.js";
import { formatDailyGB, numOr0 } from "./volume-convert.js";
import { estimateEnabledDailyGB } from "./wizard-continuity.js";
import { collectGlobals, readVolumeInputMode, planningDailyOnDiskGB } from "./plan-form.js";

/** @returns {{ ok: boolean, message: string }} */
export function checkVolumeBudgets() {
  const g = collectGlobals();
  const mode = readVolumeInputMode();
  const sum = estimateEnabledDailyGB(state.rows, mode);
  const cap = numOr0(g.total_daily_gb);

  if (cap > 0 && sum > cap + 0.01) {
    return {
      ok: false,
      message: t("err_sources_exceed_total")
        .replace("{sum}", formatDailyGB(sum))
        .replace("{cap}", formatDailyGB(cap)),
    };
  }

  const hot = numOr0(g.available_hot_gb);
  const cold = numOr0(g.available_cold_gb);
  const diskBudget = hot + cold;
  if (diskBudget > 0) {
    const dailyOnDisk = planningDailyOnDiskGB();
    const hotDays = Math.max(0, numOr0(g.hot_warm_days));
    const coldDays = Math.max(0, numOr0(g.cold_days));
    const headroom = Math.max(1, numOr0(g.headroom) || 1);
    if (dailyOnDisk > 0) {
      const needHot = dailyOnDisk * hotDays * headroom;
      const needCold = dailyOnDisk * coldDays * headroom;
      if (hot > 0 && needHot > hot + 1) {
        return {
          ok: false,
          message: t("err_disk_exceeds_hot")
            .replace("{need}", String(Math.round(needHot)))
            .replace("{cap}", String(Math.round(hot))),
        };
      }
      if (cold > 0 && needCold > cold + 1) {
        return {
          ok: false,
          message: t("err_disk_exceeds_cold")
            .replace("{need}", String(Math.round(needCold)))
            .replace("{cap}", String(Math.round(cold))),
        };
      }
      const needTotal = needHot + needCold;
      if (needTotal > diskBudget + 1) {
        return {
          ok: false,
          message: t("err_disk_exceeds_budget")
            .replace("{need}", String(Math.round(needTotal)))
            .replace("{cap}", String(Math.round(diskBudget))),
        };
      }
    }
  }

  return { ok: true, message: "" };
}

export function refreshVolumeBudgetUI() {
  const el = document.getElementById("volume-budget-err");
  const reviewErr = document.getElementById("err");
  const check = checkVolumeBudgets();
  if (el) {
    if (check.ok) {
      el.hidden = true;
      el.textContent = "";
    } else {
      el.hidden = false;
      el.textContent = check.message;
    }
  }
  // Clear a prior review error only when budgets are healthy again.
  if (check.ok && reviewErr && reviewErr.dataset?.budgetErr === "1") {
    reviewErr.hidden = true;
    reviewErr.textContent = "";
    delete reviewErr.dataset.budgetErr;
  }
  return check;
}
