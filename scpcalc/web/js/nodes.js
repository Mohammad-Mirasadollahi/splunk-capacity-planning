import { t } from "./i18n.js";

/** Friendly label + id prefix for a planning role. */
export function roleNodeMeta(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("combined")) return { labelKey: "node_label_combined", prefix: "combined" };
  if (r.includes("indexer")) return { labelKey: "node_label_peer", prefix: "peer" };
  if (r.includes("es search")) return { labelKey: "node_label_es_sh", prefix: "es-sh" };
  if (r.includes("itsi search")) return { labelKey: "node_label_itsi_sh", prefix: "itsi-sh" };
  if (r.includes("search head")) return { labelKey: "node_label_sh", prefix: "sh" };
  if (r.includes("cluster manager")) return { labelKey: "node_label_cm", prefix: "cm" };
  if (r.includes("deployer")) return { labelKey: "node_label_deployer", prefix: "deployer" };
  if (r.includes("dma")) return { labelKey: "node_label_dma", prefix: "dma" };
  if (r.includes("smartstore")) return { labelKey: "node_label_s2", prefix: "s2" };
  if (r.includes("frozen") || r.includes("archive")) return { labelKey: "node_label_frozen", prefix: "frozen" };
  return { labelKey: "node_label_node", prefix: "node" };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Expand role aggregates into labeled node instances (same specs per role). */
export function expandResourceNodes(resources) {
  const out = [];
  const counters = Object.create(null);
  for (const layer of resources || []) {
    const count = Math.max(1, Number(layer.count) || 1);
    const meta = roleNodeMeta(layer.role);
    const label = t(meta.labelKey);
    if (!counters[meta.prefix]) counters[meta.prefix] = 0;
    for (let i = 0; i < count; i++) {
      counters[meta.prefix] += 1;
      const idx = counters[meta.prefix];
      const id = `${meta.prefix}-${pad2(idx)}`;
      out.push({
        id,
        label,
        role: layer.role || "",
        tier: layer.tier || "",
        layer,
        selected: meta.prefix === "peer" || meta.prefix === "combined" || count === 1,
      });
    }
  }
  // If nothing selected (no peers), select first node
  if (out.length && !out.some((n) => n.selected)) out[0].selected = true;
  return out;
}

export function formatLayerSpecs(layer) {
  const phys = layer.cpu_physical_cores || layer.cpu_cores || 0;
  const logi = layer.cpu_logical_vcpu || layer.vcpu || 0;
  return {
    cpuPhys: phys ? `${phys} physical @ ≥2 GHz` : "—",
    cpuLog: logi ? `${logi} logical / vCPU (HT 2×)` : "—",
    ram: layer.ram_gb ? `${layer.ram_gb} GB` : "—",
    disk: layer.disk_gb_hint ? `≈${Math.round(layer.disk_gb_hint)} GB` : "—",
    net: layer.network || "—",
    virt: layer.virt_cpu_rule || (phys ? "Reserve full CPU/RAM — no oversubscribe" : "—"),
    para: layer.splunk_parallelization || "—",
    iops: layer.iops_hint || (layer.iops_min ? `≥${layer.iops_min} IOPS` : "—"),
    raid: layer.raid_hint || "—",
    storage: layer.storage_type || "—",
    notes: layer.notes || "—",
  };
}
