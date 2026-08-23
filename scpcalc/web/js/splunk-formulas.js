/**
 * Official Splunk capacity formulas (mirrors internal/splunkform).
 * @see https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements
 * @see https://help.splunk.com/en/splunk-enterprise-security-8/install/8.6/installation/configure-data-models-for-splunk-enterprise-security
 */

export const SPLUNK_RAWDATA_RATIO = 0.15;
export const SPLUNK_ES_DMA_GB_PER_YEAR = 3.4;

/** Frozen archive: rawdata only (~15% of ingest); cluster default × RF copies. */
export function archiveNeedGB(dailyRaw, archiveDays, { indexer_cluster, rf, archive_single_copy } = {}) {
  const raw = Number(dailyRaw);
  const days = Math.max(0, Math.floor(Number(archiveDays) || 0));
  if (!(raw > 0) || !(days > 0)) return 0;
  let copies = 1;
  if (indexer_cluster && !archive_single_copy && Number(rf) > 1) {
    copies = Math.floor(Number(rf));
  }
  return raw * SPLUNK_RAWDATA_RATIO * days * copies;
}

/** DMA summaries budget GB (cluster-wide). dma_pct > 0 = legacy override. */
export function dmaNeedGB(dailyRaw, dailyOnDisk, comp, { dma_pct, dma_years, headroom, retention_days } = {}) {
  const pct = Number(dma_pct);
  if (pct > 0) {
    const ret = Math.max(1, Math.floor(Number(retention_days) || 1));
    const h = Number(headroom) > 0 ? Number(headroom) : 1;
    const onDisk = Number(dailyOnDisk) > 0 ? Number(dailyOnDisk) : Number(dailyRaw) * (comp > 0 ? comp : 0.5);
    return (onDisk * ret * h * pct);
  }
  const years = Number(dma_years) > 0 ? Number(dma_years) : 1;
  let raw = Number(dailyRaw);
  if (!(raw > 0) && Number(dailyOnDisk) > 0) {
    const c = comp > 0 ? comp : 0.5;
    raw = Number(dailyOnDisk) / c;
  }
  if (!(raw > 0)) return 0;
  return raw * SPLUNK_ES_DMA_GB_PER_YEAR * years;
}
