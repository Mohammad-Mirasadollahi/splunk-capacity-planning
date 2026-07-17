import { t } from "./i18n.js";
import { copyText } from "./share-url.js";

function flashStatus(block, msg) {
  const el = block.querySelector("[data-view-status]");
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.hidden = true;
    el.textContent = "";
  }, 2200);
}

function tableToText(table) {
  if (!table) return "";
  const lines = [];
  const head = table.tHead;
  if (head) {
    const cells = [...head.querySelectorAll("th")].map((th) => (th.textContent || "").trim().replace(/\s+/g, " "));
    if (cells.some(Boolean)) lines.push(cells.join("\t"));
  }
  const body = table.tBodies[0];
  if (body) {
    body.querySelectorAll("tr").forEach((tr) => {
      if (tr.hidden) return;
      const cells = [...tr.children].map((td) => (td.textContent || "").trim().replace(/\s+/g, " "));
      lines.push(cells.join("\t"));
    });
  }
  return lines.join("\n");
}

function blockText(block) {
  const tables = [...block.querySelectorAll("table")].filter((t) => !t.closest("[hidden]"));
  if (tables.length) {
    return tables.map((t) => tableToText(t)).filter(Boolean).join("\n\n");
  }
  const pre = block.querySelector("pre");
  if (pre) return pre.textContent || "";
  const ta = block.querySelector("textarea");
  if (ta) return ta.value || "";
  return (block.querySelector(".view-block-body")?.innerText || "").trim();
}

function setExpanded(block, on) {
  const expandBtn = block.querySelector("[data-view-expand]");
  const closeBtn = block.querySelector("[data-view-collapse]");
  block.classList.toggle("is-fullscreen", on);
  if (expandBtn) expandBtn.hidden = on;
  if (closeBtn) closeBtn.hidden = !on;
  if (on) {
    document.body.classList.add("view-fullscreen");
  } else if (!document.querySelector(".view-block.is-fullscreen")) {
    document.body.classList.remove("view-fullscreen");
  }
}

function collapseAll() {
  document.querySelectorAll(".view-block.is-fullscreen").forEach((b) => setExpanded(b, false));
}

async function copyBlock(block) {
  const text = blockText(block);
  if (!text) {
    flashStatus(block, t("copy_empty"));
    return;
  }
  try {
    await copyText(text);
    flashStatus(block, t("copied"));
  } catch (_) {
    flashStatus(block, t("copied"));
  }
}

export function bindViewBlocks() {
  document.querySelectorAll(".view-block").forEach((block) => {
    if (block.dataset.viewBound === "1") return;
    block.dataset.viewBound = "1";

    block.querySelector("[data-view-copy]")?.addEventListener("click", () => {
      void copyBlock(block);
    });
    block.querySelector("[data-view-expand]")?.addEventListener("click", () => {
      collapseAll();
      setExpanded(block, true);
      block.querySelector("[data-view-collapse]")?.focus();
    });
    block.querySelector("[data-view-collapse]")?.addEventListener("click", () => {
      setExpanded(block, false);
      block.querySelector("[data-view-expand]")?.focus();
    });
  });

  if (document.documentElement.dataset.viewEscBound === "1") return;
  document.documentElement.dataset.viewEscBound = "1";
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      const open = document.querySelector(".view-block.is-fullscreen");
      if (!open) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setExpanded(open, false);
      open.querySelector("[data-view-expand]")?.focus();
    },
    true
  );
}
