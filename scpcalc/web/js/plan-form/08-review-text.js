/**
 * Plain-text review dump (#review-box) for the Review step.
 */
import { state } from "../state.js";
import { localizeFlow } from "../i18n.js";
import { dailyGBFromEPS, formatDailyGB, numOr0, resolveEventBytes } from "../volume-convert.js";
import { collectGlobals } from "./06-globals.js";

export function fillReview() {
  const reviewBox = document.getElementById("review-box");
  if (!reviewBox) return;
  const g = collectGlobals();
  const enabled = state.rows.filter((r) => r.enabled);
  let srcSum = 0;
  enabled.forEach((r) => {
    const bytes = resolveEventBytes(r, state.rows);
    let daily = numOr0(r.daily_gb);
    if (!(daily > 0) && numOr0(r.eps) > 0) daily = dailyGBFromEPS(r.eps, bytes);
    srcSum += daily;
  });
  const coldDays = Math.max(0, g.retention_days - g.hot_warm_days);
  const lines = [
    `— From volume & retention —`,
    `plan by: ${g.capacity_plan_mode} | hot: ${g.hot_warm_days}d + cold: ${coldDays}d = total ${g.retention_days}d | headroom: ${g.headroom} | summary_ret: ${g.summary_retention_days}d`,
    `archive_frozen: ${g.archive_frozen}${g.archive_frozen ? ` → ${g.frozen_path} · archive_days=${g.archive_days || 0}` : ""}`,
    `paths: ${g.hot_path} | ${g.cold_path} | ${g.frozen_path} | ${g.summaries_path}`,
  ];
  if (g.total_daily_gb) lines.push(`total_daily_gb: ${g.total_daily_gb} (budget ceiling; under-fill sources scale up)`);
  if (g.available_hot_gb || g.available_cold_gb || g.available_summaries_gb) {
    lines.push(
      `disk GB: hot=${g.available_hot_gb || 0} cold=${g.available_cold_gb || 0} summaries=${g.available_summaries_gb || 0}`
    );
  }
  lines.push(`— From topology / cluster —`);
  lines.push(`Indexer cluster: ${g.indexer_cluster} (RF=${g.rf} SF=${g.sf}) | n_idx=${g.n_idx}`);
  lines.push(
    `Search head cluster: ${g.search_head_cluster} | users=${g.concurrent_users} searches=${g.concurrent_searches} saved=${g.saved_searches} | n_sh=${g.n_sh}`
  );
  lines.push(`apps: ES=${g.has_es} ITSI=${g.has_itsi} DMA=${g.enable_dma} SmartStore=${g.smartstore}`);
  lines.push(`— From sources —`);
  lines.push(
    `volume input: GB/day = EPS (calc uses Daily GB) | enabled=${enabled.length} | Σ sources ≈ ${formatDailyGB(srcSum)} GB/day`
  );
  enabled.forEach((r) => {
    const ret = Number(r.retention_days) > 0 ? `${r.retention_days}d` : `global ${g.retention_days}d`;
    const hw = Number(r.hot_warm_days) > 0 ? `${r.hot_warm_days}d` : `global ${g.hot_warm_days}d`;
    const vol = `${r.daily_gb || 0} GB/d = ${r.eps || 0} EPS`;
    lines.push(
      `  - ${r.label} → index=${r.index_name} | ${vol} | event_bytes=${r.event_bytes} | ret=${ret} | hw=${hw}${r.enable_summary ? " | +summary" : ""}`
    );
  });
  lines.push(`— Calculate uses all of the above together —`);
  reviewBox.textContent = localizeFlow(lines.join("\n"));
}
