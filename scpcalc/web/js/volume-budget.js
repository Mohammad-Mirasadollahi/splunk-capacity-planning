/**
 * Volume-step budgets vs Sources / disk need.
 * total_daily_gb and available_* are caps — exceeding them is an error.
 * Disk need matches Go calc: per-source retention/hot-warm (+ under-fill scale).
 */
import { state } from "./state.js";
import { t } from "./i18n.js";
import { formatDailyGB, numOr0 } from "./volume-convert.js";
import { estimateEnabledDailyGB } from "./wizard-continuity.js";
import { collectGlobals, readVolumeInputMode } from "./plan-form.js";
import { planSourceDiskNeeds, formatSizeGB } from "./source-sizing.js";

/** @returns {{ ok: boolean, message: string, warn: string }} */
export function checkVolumeBudgets() {
  const g = collectGlobals();
  const mode = readVolumeInputMode();
  const sum = estimateEnabledDailyGB(state.rows, mode);
  const cap = numOr0(g.total_daily_gb);
  let warn = "";

  if (cap > 0 && sum > cap + 0.01) {
    return {
      ok: false,
      message: t("err_sources_exceed_total")
        .replace("{sum}", formatDailyGB(sum))
        .replace("{cap}", formatDailyGB(cap)),
      warn: "",
    };
  }

  const plan = planSourceDiskNeeds(state.rows, g);
  if (plan.warnings.length) {
    warn = t("err_hot_warm_gt_retention").replace("{detail}", plan.warnings[0]);
  }

  const hot = numOr0(g.available_hot_gb);
  const cold = numOr0(g.available_cold_gb);
  const sumCap = numOr0(g.available_summaries_gb);
  const diskBudget = hot + cold;
  const needHot = plan.needHot;
  const needCold = plan.needCold;
  const needSum = plan.needSum;

  if (diskBudget > 0 && (needHot > 0 || needCold > 0)) {
    if (hot > 0 && needHot > hot + 1) {
      return {
        ok: false,
        message: t("err_disk_exceeds_hot")
          .replace("{need}", formatSizeGB(needHot))
          .replace("{cap}", formatSizeGB(hot)),
        warn,
      };
    }
    if (cold > 0 && needCold > cold + 1) {
      return {
        ok: false,
        message: t("err_disk_exceeds_cold")
          .replace("{need}", formatSizeGB(needCold))
          .replace("{cap}", formatSizeGB(cold)),
        warn,
      };
    }
    const needTotal = needHot + needCold;
    if (needTotal > diskBudget + 1) {
      return {
        ok: false,
        message: t("err_disk_exceeds_budget")
          .replace("{need}", formatSizeGB(needTotal))
          .replace("{cap}", formatSizeGB(diskBudget)),
        warn,
      };
    }
  }

  if (sumCap > 0 && needSum > sumCap + 1) {
    return {
      ok: false,
      message: t("err_disk_exceeds_summaries")
        .replace("{need}", formatSizeGB(needSum))
        .replace("{cap}", formatSizeGB(sumCap)),
      warn,
    };
  }

  return { ok: true, message: "", warn };
}

export function refreshVolumeBudgetUI() {
  const el = document.getElementById("volume-budget-err");
  const reviewErr = document.getElementById("err");
  const check = checkVolumeBudgets();
  if (el) {
    if (!check.ok) {
      el.hidden = false;
      el.classList.remove("volume-budget-warn");
      el.classList.add("err");
      el.textContent = check.message;
    } else if (check.warn) {
      el.hidden = false;
      el.classList.remove("err");
      el.classList.add("volume-budget-warn");
      el.textContent = check.warn;
    } else {
      el.hidden = true;
      el.textContent = "";
      el.classList.remove("volume-budget-warn");
    }
  }
  if (check.ok && reviewErr && reviewErr.dataset?.budgetErr === "1") {
    reviewErr.hidden = true;
    reviewErr.textContent = "";
    delete reviewErr.dataset.budgetErr;
  }
  import("./sources.js").then((m) => m.refreshIndexSizePreviews?.()).catch(() => {});
  return check;
}
