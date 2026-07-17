/**
 * Daily GB ↔ EPS conversion (raw / pre-indexed ingest).
 * Daily_Raw_GB = EPS × 86400 × event_bytes / 1024³
 */
export const SECONDS_PER_DAY = 86400;
export const BYTES_PER_GIB = 1024 ** 3;

export function numOr0(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Average positive EPS across rows (optionally only enabled). */
export function averageEPS(rows, { enabledOnly = true } = {}) {
  const vals = (rows || [])
    .filter((r) => (!enabledOnly || r.enabled) && numOr0(r.eps) > 0)
    .map((r) => numOr0(r.eps));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Average positive event_bytes across rows. */
export function averageEventBytes(rows, { enabledOnly = false } = {}) {
  const vals = (rows || [])
    .filter((r) => (!enabledOnly || r.enabled) && numOr0(r.event_bytes) > 0)
    .map((r) => numOr0(r.event_bytes));
  if (!vals.length) return 500;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function resolveEventBytes(row, rows) {
  const own = numOr0(row?.event_bytes);
  if (own > 0) return own;
  return averageEventBytes(rows);
}

/** Effective EPS for a row: explicit value, else average of sources that have EPS. */
export function resolveEPS(row, rows) {
  const own = numOr0(row?.eps);
  if (own > 0) return { eps: own, fromAvg: false };
  const avg = averageEPS(rows);
  if (avg > 0) return { eps: avg, fromAvg: true };
  return { eps: 0, fromAvg: false };
}

export function dailyGBFromEPS(eps, eventBytes) {
  const e = numOr0(eps);
  const b = numOr0(eventBytes);
  if (!(e > 0 && b > 0)) return 0;
  return (e * SECONDS_PER_DAY * b) / BYTES_PER_GIB;
}

export function epsFromDailyGB(dailyGB, eventBytes) {
  const g = numOr0(dailyGB);
  const b = numOr0(eventBytes);
  if (!(g > 0 && b > 0)) return 0;
  return (g * BYTES_PER_GIB) / (SECONDS_PER_DAY * b);
}

export function formatEPS(n) {
  if (!(n > 0)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatDailyGB(n) {
  if (!(n > 0)) return "—";
  if (n >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

/**
 * Fill blank EPS on enabled rows with the average of rows that already have EPS.
 * Does not overwrite explicit values.
 */
export function fillMissingEPSFromAverage(rows) {
  const avg = averageEPS(rows);
  if (!(avg > 0)) return false;
  let changed = false;
  for (const r of rows || []) {
    if (!r.enabled) continue;
    if (numOr0(r.eps) > 0) continue;
    r.eps = Math.round(avg * 1000) / 1000;
    changed = true;
  }
  return changed;
}

/** Convert stored primary values when switching volume mode. */
export function convertRowsForMode(rows, mode) {
  const list = rows || [];
  if (mode === "eps") {
    for (const r of list) {
      const gb = numOr0(r.daily_gb);
      const bytes = resolveEventBytes(r, list);
      if (gb > 0 && !(numOr0(r.eps) > 0)) {
        r.eps = Math.round(epsFromDailyGB(gb, bytes) * 1000) / 1000;
      }
    }
    fillMissingEPSFromAverage(list);
  } else {
    for (const r of list) {
      const { eps } = resolveEPS(r, list);
      const bytes = resolveEventBytes(r, list);
      if (eps > 0 && !(numOr0(r.daily_gb) > 0)) {
        r.daily_gb = Math.round(dailyGBFromEPS(eps, bytes) * 1000) / 1000;
      }
    }
  }
}

/** Counterpart label for one source row under the primary input. */
export function rowCounterpart(row, rows, mode) {
  const bytes = resolveEventBytes(row, rows);
  if (mode === "daily_gb") {
    const gb = numOr0(row.daily_gb);
    const eps = gb > 0 ? epsFromDailyGB(gb, bytes) : 0;
    return { kind: "eps", value: eps, fromAvg: false, eventBytes: bytes };
  }
  const { eps, fromAvg } = resolveEPS(row, rows);
  const gb = eps > 0 ? dailyGBFromEPS(eps, bytes) : 0;
  return { kind: "daily_gb", value: gb, fromAvg, eventBytes: bytes, eps };
}

/** Estimated total EPS from total_daily_gb using average event size of enabled sources. */
export function totalEPSFromDailyGB(totalDailyGB, rows) {
  const gb = numOr0(totalDailyGB);
  if (!(gb > 0)) return 0;
  const bytes = averageEventBytes(rows, { enabledOnly: true });
  return epsFromDailyGB(gb, bytes);
}
