/** Fullscreen chrome for the Log sources table inside the wizard. */

const homeMap = new WeakMap();

function rememberHome(panel) {
  if (homeMap.has(panel)) return;
  homeMap.set(panel, { parent: panel.parentNode, next: panel.nextSibling });
}

function restoreHome(panel) {
  const home = homeMap.get(panel);
  if (!home?.parent?.isConnected) return;
  if (home.next?.parentNode === home.parent) home.parent.insertBefore(panel, home.next);
  else home.parent.appendChild(panel);
}

function syncChrome(panel, on) {
  const expand = panel.querySelector("[data-sources-expand]");
  const collapse = panel.querySelector("[data-sources-collapse]");
  if (expand) {
    expand.hidden = on;
    expand.setAttribute("aria-expanded", on ? "true" : "false");
  }
  if (collapse) collapse.hidden = !on;
  panel.setAttribute("aria-modal", on ? "true" : "false");
  if (on) panel.setAttribute("role", "dialog");
  else panel.removeAttribute("role");
}

function setSourcesFullscreen(panel, on) {
  if (!panel) return;
  if (on) {
    document.querySelectorAll(".sources-panel.is-fullscreen").forEach((p) => {
      if (p !== panel) setSourcesFullscreen(p, false);
    });
    rememberHome(panel);
    if (panel.parentElement !== document.body) document.body.appendChild(panel);
    panel.classList.add("is-fullscreen");
    document.body.classList.add("sources-fullscreen");
    syncChrome(panel, true);
    panel.querySelector("[data-sources-collapse]")?.focus({ preventScroll: true });
  } else {
    panel.classList.remove("is-fullscreen");
    syncChrome(panel, false);
    restoreHome(panel);
    if (!document.querySelector(".sources-panel.is-fullscreen")) {
      document.body.classList.remove("sources-fullscreen");
    }
  }
}

export function collapseSourcesFullscreen() {
  document.querySelectorAll(".sources-panel.is-fullscreen").forEach((p) => setSourcesFullscreen(p, false));
}

export function bindSourcesFullscreen() {
  const panel = document.getElementById("sources-panel");
  if (!panel || panel.dataset.fsBound === "1") return;
  panel.dataset.fsBound = "1";

  panel.querySelector("[data-sources-expand]")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSourcesFullscreen(panel, true);
  });
  panel.querySelector("[data-sources-collapse]")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSourcesFullscreen(panel, false);
    panel.querySelector("[data-sources-expand]")?.focus({ preventScroll: true });
  });

  if (document.documentElement.dataset.sourcesEscBound === "1") return;
  document.documentElement.dataset.sourcesEscBound = "1";
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape") return;
      const open = document.querySelector(".sources-panel.is-fullscreen");
      if (!open) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setSourcesFullscreen(open, false);
      open.querySelector("[data-sources-expand]")?.focus({ preventScroll: true });
    },
    true
  );
}
