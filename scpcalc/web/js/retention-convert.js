/**
 * Retention days ↔ searchable disk GB (hot/cold layers).
 * Need_GB ≈ daily_on_disk_GB × days × headroom
 * daily_on_disk_GB ≈ daily_raw_GB × compression
 */
import { numOr0 } from "./volume-convert.js";

export function estimateCompression({ compression = 0, indexer_cluster = false, rf = 1, sf = 1 } = {}) {
  const c = Number(compression);
  if (Number.isFinite(c) && c > 0) return c;
  if (indexer_cluster) return 0.15 * Math.max(1, Number(rf) || 1) + 0.35 * Math.max(1, Number(sf) || 1);
  return 0.5;
}

export function dailyOnDiskFromRaw(dailyRawGB, compression) {
  const raw = numOr0(dailyRawGB);
  const comp = Number(compression);
  if (!(raw > 0) || !(comp > 0)) return 0;
  return raw * comp;
}

/** Searchable disk need for one layer (GB). */
export function diskGBFromDays(days, dailyOnDiskGB, headroom = 1.2) {
  const d = Math.max(0, Math.floor(Number(days) || 0));
  const rate = numOr0(dailyOnDiskGB);
  const h = Number(headroom) > 0 ? Number(headroom) : 1;
  if (!(d > 0) || !(rate > 0)) return 0;
  return rate * d * h;
}

/** Whole days that fit in a disk budget for one layer. */
export function daysFromDiskGB(diskGB, dailyOnDiskGB, headroom = 1.2) {
  const disk = numOr0(diskGB);
  const rate = numOr0(dailyOnDiskGB);
  const h = Number(headroom) > 0 ? Number(headroom) : 1;
  if (!(disk > 0) || !(rate > 0) || !(h > 0)) return 0;
  return Math.max(0, Math.floor(disk / (rate * h)));
}

export function roundDiskGB(n) {
  if (!(n > 0)) return 0;
  if (n >= 100) return Math.round(n);
  if (n >= 10) return Math.round(n * 10) / 10;
  return Math.round(n * 100) / 100;
}

export function formatDiskGB(n) {
  if (!(n > 0)) return "—";
  return roundDiskGB(n).toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : 2 });
}
