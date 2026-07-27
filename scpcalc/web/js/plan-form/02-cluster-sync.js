/**
 * Indexer cluster / SHC field sync (peer counts, RF/SF clamps).
 */
import { t } from "../i18n.js";
import { syncToggleUI } from "./01-toggle-ui.js";

export function syncClusterFields() {
  const idxCluster = document.getElementById("indexer_cluster");
  const rfEl = document.getElementById("rf");
  const sfEl = document.getElementById("sf");
  if (!idxCluster || !rfEl || !sfEl) return;
  // Default RF=3, SF=2 (common Splunk cluster defaults). Keep these in the form
  // even when cluster is off; calc still forces RF=1/SF=1 when IndexerCluster=false.
  if (!Number(rfEl.value) || Number(rfEl.value) < 1) rfEl.value = 3;
  if (!Number(sfEl.value) || Number(sfEl.value) < 1) sfEl.value = 2;
  if (idxCluster.checked) {
    if (Number(rfEl.value) <= 1) rfEl.value = 3;
    if (Number(sfEl.value) <= 1) sfEl.value = 2;
  }
  syncIndexerPeerCount();
  syncClusterRFSF();
  syncSHCMemberHint();
  syncToggleUI();
}

/**
 * Splunk indexer cluster: each bucket copy lives on a separate peer → RF ≤ n_idx;
 * searchable copies cannot exceed raw copies → 1 ≤ SF ≤ RF.
 * @see https://help.splunk.com/.../replication-factor
 */
export function syncClusterRFSF({ announce = false } = {}) {
  const idxCluster = document.getElementById("indexer_cluster");
  const rfEl = document.getElementById("rf");
  const sfEl = document.getElementById("sf");
  const nIdx = document.getElementById("n_idx") || document.querySelector('input[name="n_idx"]');
  if (!idxCluster || !rfEl || !sfEl) return;
  if (!idxCluster.checked) {
    rfEl.removeAttribute("max");
    sfEl.removeAttribute("max");
    rfEl.setCustomValidity("");
    sfEl.setCustomValidity("");
    return;
  }
  const peers = Math.max(2, Math.floor(Number(nIdx?.value) || 0) || 2);
  rfEl.min = "1";
  rfEl.max = String(peers);
  let rf = Math.floor(Number(rfEl.value));
  let clamped = false;
  if (!Number.isFinite(rf) || rf < 1) {
    rf = Math.min(3, peers);
    clamped = true;
  }
  if (rf > peers) {
    rf = peers;
    clamped = true;
  }
  rfEl.value = String(rf);

  sfEl.min = "1";
  sfEl.max = String(rf);
  let sf = Math.floor(Number(sfEl.value));
  if (!Number.isFinite(sf) || sf < 1) {
    sf = Math.min(2, rf);
    clamped = true;
  }
  if (sf > rf) {
    sf = rf;
    clamped = true;
  }
  sfEl.value = String(sf);

  if (announce && clamped) {
    rfEl.setCustomValidity(t("idx_rf_sf_peer_limit"));
    rfEl.reportValidity();
    setTimeout(() => {
      rfEl.setCustomValidity("");
      sfEl.setCustomValidity("");
    }, 2800);
  } else {
    rfEl.setCustomValidity("");
    sfEl.setCustomValidity("");
  }
}

/** Indexer cluster: default 3 peers on enable; never allow fewer than 2.
 *  Cluster off: explicit standalone count (≥1), no Auto — multiple indexers may run independently. */
let prevIndexerClusterOn = undefined;

export function syncIndexerPeerCount() {
  const idxCluster = document.getElementById("indexer_cluster");
  const nIdx = document.getElementById("n_idx") || document.querySelector('input[name="n_idx"]');
  if (!idxCluster || !nIdx) return;
  const on = !!idxCluster.checked;
  const newlyOn = prevIndexerClusterOn === false && on;
  if (on) {
    nIdx.min = "2";
    const n = Number(nIdx.value);
    if (newlyOn) {
      nIdx.value = "3";
      nIdx.dataset.autoSeeded = "3";
      nIdx.setCustomValidity("");
    } else if (!Number.isFinite(n) || n < 2) {
      const wasTypedBelow = Number.isFinite(n) && n > 0 && n < 2;
      nIdx.value = !Number.isFinite(n) || n <= 0 ? "3" : "2";
      if (wasTypedBelow) {
        nIdx.setCustomValidity(t("idx_n_idx_min"));
        nIdx.reportValidity();
        setTimeout(() => nIdx.setCustomValidity(""), 2500);
      } else {
        nIdx.setCustomValidity("");
      }
    } else {
      nIdx.setCustomValidity("");
    }
  } else {
    nIdx.min = "1";
    const n = Number(nIdx.value);
    if (!Number.isFinite(n) || n < 1) nIdx.value = "1";
    nIdx.setCustomValidity("");
  }
  const announceRF = on && prevIndexerClusterOn === true;
  prevIndexerClusterOn = on;
  syncClusterRFSF({ announce: announceRF });
}

/** SHC: on enable default n_sh=1; never 0; never exactly 2 (→3). Cluster off: explicit ≥1, SHC optional. */
let prevSHCOn = undefined;

export function syncSHCMemberHint() {
  const shc = document.getElementById("search_head_cluster");
  const nSh = document.querySelector('input[name="n_sh"]');
  const hint = document.getElementById("shc-n-sh-hint");
  if (!shc || !nSh) return;
  const on = !!shc.checked;
  const newlyOn = prevSHCOn === false && on;
  const n = Number(nSh.value);
  if (on) {
    nSh.min = "1";
    if (newlyOn) {
      nSh.value = "1";
      delete nSh.dataset.autoSeeded;
      nSh.setCustomValidity("");
    } else if (n === 2) {
      nSh.value = "3";
      nSh.setCustomValidity(t("shc_n_sh_two_invalid"));
      nSh.reportValidity();
      setTimeout(() => nSh.setCustomValidity(""), 2500);
    } else if (!Number.isFinite(n) || n < 1) {
      nSh.value = "1";
      nSh.setCustomValidity("");
    } else {
      nSh.setCustomValidity("");
    }
  } else {
    nSh.min = "1";
    if (!Number.isFinite(n) || n < 1) nSh.value = "1";
    nSh.setCustomValidity("");
  }
  if (hint) hint.hidden = !on;
  prevSHCOn = on;
}
