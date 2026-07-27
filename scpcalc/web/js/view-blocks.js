import { t } from "./i18n.js";
import { copyText } from "./share-url.js";

/** Home slot so fullscreen can portal to <body> (escape .glass containing block). */
const homeMap = new WeakMap();

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
  const tables = [...block.querySelectorAll("table")].filter((tbl) => !tbl.closest("[hidden]"));
  if (tables.length) {
    return tables.map((tbl) => tableToText(tbl)).filter(Boolean).join("\n\n");
  }
  const pre = block.querySelector("pre");
  if (pre) return pre.textContent || "";
  const ta = block.querySelector("textarea");
  if (ta) return ta.value || "";
  return (block.querySelector(".view-block-body")?.innerText || "").trim();
}

function rememberHome(block) {
  if (homeMap.has(block)) return;
  homeMap.set(block, {
    parent: block.parentNode,
    next: block.nextSibling,
  });
}

function restoreHome(block) {
  const home = homeMap.get(block);
  if (!home?.parent || !home.parent.isConnected) return;
  if (home.next && home.next.parentNode === home.parent) {
    home.parent.insertBefore(block, home.next);
  } else {
    home.parent.appendChild(block);
  }
}

function syncChrome(block, on) {
  const expandBtn = block.querySelector("[data-view-expand]");
  const closeBtn = block.querySelector("[data-view-collapse]");
  if (expandBtn) {
    expandBtn.hidden = on;
    expandBtn.setAttribute("aria-expanded", on ? "true" : "false");
  }
  if (closeBtn) {
    closeBtn.hidden = !on;
  }
  block.setAttribute("aria-modal", on ? "true" : "false");
  if (on) block.setAttribute("role", "dialog");
  else block.removeAttribute("role");
}

function setExpanded(block, on) {
  if (on) {
    // Close any other fullscreen first
    document.querySelectorAll(".view-block.is-fullscreen").forEach((b) => {
      if (b !== block) setExpanded(b, false);
    });
    rememberHome(block);
    // Portal to body so backdrop-filter / overflow on .glass cannot trap position:fixed
    if (block.parentElement !== document.body) {
      document.body.appendChild(block);
    }
    block.classList.add("is-fullscreen");
    document.body.classList.add("view-fullscreen");
    syncChrome(block, true);
    block.querySelector("[data-view-collapse]")?.focus({ preventScroll: true });
  } else {
    block.classList.remove("is-fullscreen");
    syncChrome(block, false);
    restoreHome(block);
    if (!document.querySelector(".view-block.is-fullscreen")) {
      document.body.classList.remove("view-fullscreen");
    }
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

    block.querySelector("[data-view-copy]")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void copyBlock(block);
    });
    block.querySelector("[data-view-expand]")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setExpanded(block, true);
    });
    block.querySelector("[data-view-collapse]")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setExpanded(block, false);
      block.querySelector("[data-view-expand]")?.focus({ preventScroll: true });
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
      open.querySelector("[data-view-expand]")?.focus({ preventScroll: true });
    },
    true
  );

  // Leaving a Results tab while fullscreen must not leave a stranded portal
  document.querySelectorAll('[data-tabs="results"] [data-tab]').forEach((btn) => {
    if (btn.dataset.viewFsGuard === "1") return;
    btn.dataset.viewFsGuard = "1";
    btn.addEventListener("click", () => collapseAll());
  });
}

export { collapseAll as collapseViewBlocks };
