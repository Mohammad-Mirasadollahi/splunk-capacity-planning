/**
 * Shared source sizing — mirrors Go calc.normalizeSources + per-index MB math
 * (before applyPerPeer). Used by Sources previews and live volume-budget checks.
 */
import { state } from "./state.js";
import { dailyGBFromEPS, numOr0, resolveEventBytes } from "./volume-convert.js";
import {
  dailyOnDiskFromRaw,
  estimateCompression,
  formatDiskGB,
  roundDiskGB,
} from "./retention-convert.js";

/** Raw daily GB for one row (prefer daily_gb, else EPS×bytes). */
export function rowDailyRawGB(row, rows = state.rows) {
  let daily = numOr0(row?.daily_gb);
  if (!(daily > 0) && numOr0(row?.eps) > 0) {
    daily = dailyGBFromEPS(row.eps, resolveEventBytes(row, rows));
  }
  return daily > 0 ? daily : 0;
}

/**
 * Same under-fill scale as Go normalizeSources: when Σ sources < total_daily_gb,
 * inflate each active source so planning uses the declared total.
 * Over-fill is not scaled (Validate / budget UI errors instead).
 */
export function underfillScaleFactor(rows, totalDailyGB) {
  const cap = numOr0(totalDailyGB);
  if (!(cap > 0)) return 1;
  let sum = 0;
  for (const r of rows || []) {
    if (!r?.enabled) continue;
    sum += rowDailyRawGB(r, rows);
  }
  if (!(sum > 0) || sum >= cap - 0.01) return 1;
  return cap / sum;
}

export function resolveRowRetention(row, g) {
  let ret = numOr0(row?.retention_days);
  if (!(ret > 0)) ret = Math.max(0, Math.floor(numOr0(g.retention_days)));
  return ret;
}

export function resolveRowHotWarm(row, g, ret) {
  let hw = numOr0(row?.hot_warm_days);
  if (!(hw > 0)) hw = Math.max(0, Math.floor(numOr0(g.hot_warm_days)));
  if (ret > 0 && hw > ret) hw = ret;
  return hw;
}

/** Go: Round(onDisk_GB * 1024 * days * headroom) → MB. */
export function sizeMBFromOnDiskDays(onDiskGB, days, headroom) {
  const d = Math.max(0, Math.floor(Number(days) || 0));
  const rate = numOr0(onDiskGB);
  const h = Number(headroom) > 0 ? Number(headroom) : 1.2;
  if (!(d > 0) || !(rate > 0)) return 0;
  return Math.round(rate * 1024 * d * h);
}

/** Same as Go MB → GB for display. */
export function sizeGBFromOnDiskDays(onDiskGB, days, headroom) {
  const mb = sizeMBFromOnDiskDays(onDiskGB, days, headroom);
  return mb > 0 ? mb / 1024 : 0;
}

/**
 * Per enabled source: scaled daily, on-disk, retention, home/cold need (cluster-wide, pre-peer).
 * @returns {{ scale: number, rows: Array, needHot: number, needCold: number, needSum: number, warnings: string[] }}
 */
export function planSourceDiskNeeds(rows, g) {
  const list = rows || state.rows;
  const scale = underfillScaleFactor(list, g.total_daily_gb);
  const comp = estimateCompression({
    compression: g.compression,
    indexer_cluster: g.indexer_cluster,
    rf: g.rf,
    sf: g.sf,
  });
  const headroom = Number(g.headroom) >= 1 ? Number(g.headroom) : 1.2;
  const summaryPct = numOr0(g.summary_pct) > 0 ? numOr0(g.summary_pct) : 0.1;
  const summaryRet = Math.max(1, Math.floor(numOr0(g.summary_retention_days) || g.retention_days || 1));
  const dmaOn = !!g.enable_dma || !!g.has_es;
  const dmaPct = numOr0(g.dma_pct) > 0 ? numOr0(g.dma_pct) : 0.1;

  let needHot = 0;
  let needCold = 0;
  let needSum = 0;
  let totalOnDisk = 0;
  const warnings = [];
  const outRows = [];

  for (const r of list) {
    if (!r?.enabled) continue;
    const raw = rowDailyRawGB(r, list);
    if (!(raw > 0)) continue;
    const daily = raw * scale;
    const onDisk = dailyOnDiskFromRaw(daily, comp);
    totalOnDisk += onDisk;
    const ret = resolveRowRetention(r, g);
    let hw = numOr0(r.hot_warm_days);
    if (!(hw > 0)) hw = Math.max(0, Math.floor(numOr0(g.hot_warm_days)));
    if (ret > 0 && hw > ret) {
      warnings.push(`${r.index_name || r.label || "source"}: hot_warm_days > retention_days`);
      hw = ret;
    }
    const maxMB = sizeMBFromOnDiskDays(onDisk, ret, headroom);
    const homeMB = sizeMBFromOnDiskDays(onDisk, hw, headroom);
    const maxGB = maxMB / 1024;
    const homeGB = homeMB / 1024;
    const coldGB = Math.max(0, maxGB - homeGB);
    needHot += homeGB;
    needCold += coldGB;

    if (r.enable_summary) {
      let sumRaw = numOr0(r.summary_daily_gb);
      if (!(sumRaw > 0)) sumRaw = daily * summaryPct;
      const sumOnDisk = dailyOnDiskFromRaw(sumRaw, comp);
      let sumHW = hw;
      if (sumHW > summaryRet) sumHW = summaryRet;
      needSum += sizeGBFromOnDiskDays(sumOnDisk, summaryRet, headroom);
    }

    outRows.push({
      row: r,
      dailyRaw: daily,
      onDisk,
      retention: ret,
      hotWarm: hw,
      maxTotalMB: maxMB,
      homeMB,
      maxTotalGB: maxGB,
      homeGB,
      coldGB,
      scale,
    });
  }

  if (dmaOn && totalOnDisk > 0) {
    const dmaRet = Math.max(1, Math.floor(numOr0(g.retention_days) || 1));
    needSum += sizeGBFromOnDiskDays(totalOnDisk, dmaRet, headroom) * dmaPct;
  }

  return {
    scale,
    rows: outRows,
    needHot,
    needCold,
    needSum,
    totalOnDisk,
    warnings,
  };
}

export function formatSizeGB(n) {
  if (!(n > 0)) return "—";
  return formatDiskGB(roundDiskGB(n));
}

export function formatSizeMB(n) {
  if (!(n > 0)) return "—";
  return `${Math.round(n).toLocaleString()} MB`;
}
