/**
 * Wire form chrome: toggles, RF/SF/n_idx, capacity bridge listeners.
 */
import { numOr0 } from "../volume-convert.js";
import { syncToggleUI } from "./01-toggle-ui.js";
import {
  syncClusterFields,
  syncClusterRFSF,
  syncIndexerPeerCount,
  syncSHCMemberHint,
} from "./02-cluster-sync.js";
import { syncCapacityPair, syncDiskTotal } from "./03-capacity-bridge.js";
import { syncDmaVolumeGB } from "./dma-volume-sync.js";
import { syncArchiveFields } from "./04-archive-sync.js";
import { syncVolumeInputMode } from "./05-volume-mode.js";

export function bindPlanFormChrome() {
  document.querySelectorAll('.field.check input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.id === "indexer_cluster") {
        syncClusterFields();
        syncCapacityPair("bridge");
      } else if (input.id === "search_head_cluster") {
        syncSHCMemberHint();
        syncToggleUI();
      } else if (input.id === "archive_frozen") syncArchiveFields();
      else if (input.id === "has_es" && input.checked) {
        const dma = document.getElementById("enable_dma");
        if (dma) dma.checked = true;
        syncToggleUI();
        import("../volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      } else if (input.id === "configure_sources") {
        state.configureSources = input.checked;
        syncToggleUI();
        import("../volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      } else if (input.id === "enable_dma" || input.id === "has_es" || input.id === "has_itsi") {
        syncToggleUI();
        syncDmaVolumeGB();
        import("../volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      } else syncToggleUI();
    });
  });
  document.querySelector('input[name="n_sh"]')?.addEventListener("change", syncSHCMemberHint);
  document.querySelector('input[name="n_sh"]')?.addEventListener("input", syncSHCMemberHint);
  document.querySelector('input[name="n_idx"]')?.addEventListener("change", syncIndexerPeerCount);
  document.querySelector('input[name="n_idx"]')?.addEventListener("blur", syncIndexerPeerCount);
  document.querySelector('input[name="n_idx"]')?.addEventListener("input", () => syncClusterRFSF({ announce: false }));
  document.getElementById("rf")?.addEventListener("change", () => syncClusterRFSF({ announce: true }));
  document.getElementById("rf")?.addEventListener("input", () => syncClusterRFSF({ announce: false }));
  document.getElementById("sf")?.addEventListener("change", () => syncClusterRFSF({ announce: true }));
  document.getElementById("sf")?.addEventListener("input", () => syncClusterRFSF({ announce: false }));
  syncClusterFields();
  syncArchiveFields();

  const wire = (sel, edited) => {
    document.querySelectorAll(sel).forEach((el) => {
      const run = () => {
        syncCapacityPair(edited);
        syncDmaVolumeGB();
        import("../volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      };
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
  };
  wire('input[name="hot_warm_days"], #hot_warm_days', "hot_days");
  wire('input[name="cold_days"], #cold_days', "cold_days");
  wire('input[name="available_hot_gb"], #available_hot_gb', "hot_gb");
  wire('input[name="available_cold_gb"], #available_cold_gb', "cold_gb");
  document.querySelectorAll('input[name="archive_days"], #archive_days').forEach((el) => {
    const run = () => syncCapacityPair(null);
    el.addEventListener("input", run);
    el.addEventListener("change", run);
  });
  document.querySelectorAll('input[name="dma_years"], #dma_years, input[name="dma_pct"], #dma_pct').forEach((el) => {
    const run = () => syncDmaVolumeGB();
    el.addEventListener("input", run);
    el.addEventListener("change", run);
  });
  document
    .querySelectorAll('input[name="summary_pct"], #summary_pct, input[name="summary_retention_days"], #summary_retention_days')
    .forEach((el) => {
      const run = () => import("../volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
  document.querySelectorAll('#avg_event_bytes, input[name="avg_event_bytes"]').forEach((el) => {
    const run = () => {
      import("../sources.js")
        .then((m) => {
          m.refreshTotalCounterpart?.();
          m.refreshIndexSizePreviews?.();
        })
        .catch(() => {});
      import("../volume-budget.js").then((m) => m.refreshVolumeBudgetUI?.()).catch(() => {});
      syncCapacityPair("bridge");
    };
    el.addEventListener("input", run);
    el.addEventListener("change", run);
  });
  wire(
    'input[name="headroom"], input[name="total_daily_gb"], input[name="compression"], input[name="rf"], input[name="sf"]',
    "bridge"
  );

  syncCapacityPair("bridge");
  syncDmaVolumeGB();
  syncVolumeInputMode("daily_gb");
}
