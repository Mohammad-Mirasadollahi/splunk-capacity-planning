/**
 * Auto-compute DMA volume (ES official ×3.4/year) into available_summaries_gb hidden field.
 * User does not edit — only Data Model Acceleration sizing, not summary indexes.
 */
import { state } from "../state.js";
import { t } from "../i18n.js";
import { dailyGBFromEPS, numOr0, resolveEventBytes } from "../volume-convert.js";
import { estimateCompression, formatDiskGB, roundDiskGB } from "../retention-convert.js";
import { dmaNeedGB } from "../splunk-formulas.js";

export function planningDailyRawGB() {
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

function dmaEnabled() {
  return !!document.getElementById("enable_dma")?.checked || !!document.getElementById("has_es")?.checked;
}

/** Cluster-wide DMA GB from current form (0 when DMA off or no ingest). */
export function computeDmaVolumeGB() {
  if (!dmaEnabled()) return 0;
  const raw = planningDailyRawGB();
  const compression = numOr0(
    document.getElementById("compression")?.value ?? document.querySelector('input[name="compression"]')?.value
  );
  const indexerCluster = !!document.getElementById("indexer_cluster")?.checked;
  const rf = Number(document.getElementById("rf")?.value) || 1;
  const sf = Number(document.getElementById("sf")?.value) || 1;
  const comp = estimateCompression({ compression, indexer_cluster: indexerCluster, rf, sf });
  const onDisk = raw > 0 && comp > 0 ? raw * comp : 0;
  const headroom = Number(document.getElementById("headroom")?.value) || 1;
  const dmaPct = numOr0(document.getElementById("dma_pct")?.value ?? document.querySelector('input[name="dma_pct"]')?.value);
  const dmaYears = numOr0(document.getElementById("dma_years")?.value ?? document.querySelector('input[name="dma_years"]')?.value) || 1;
  const retention = Number(document.getElementById("retention_days")?.value) || 0;
  return dmaNeedGB(raw, onDisk, comp, {
    dma_pct: dmaPct,
    dma_years: dmaYears,
    headroom: headroom >= 1 ? headroom : 1,
    retention_days: retention,
  });
}

/** Refresh readonly DMA output + hidden available_summaries_gb. */
export function syncDmaVolumeGB() {
  const field = document.getElementById("dma-volume-field");
  const out = document.getElementById("dma_volume_out");
  const hidden = document.getElementById("available_summaries_gb");
  const on = dmaEnabled();
  const gb = on ? computeDmaVolumeGB() : 0;
  const rounded = roundDiskGB(gb);

  if (field) {
    field.hidden = !on;
    field.classList.toggle("is-revealed", on);
  }
  if (hidden) hidden.value = rounded > 0 ? String(rounded) : "0";
  if (out) {
    if (!on) out.textContent = "—";
    else if (rounded > 0) out.textContent = t("dma_volume_fmt").replace("{n}", formatDiskGB(rounded));
    else out.textContent = t("dma_volume_need_ingest");
  }
  return rounded;
}
