import { state } from "./state.js";
import { downloadText, escapeRegExp } from "./util.js";
import { t } from "./i18n.js";
import { collectGlobals } from "./plan-form.js";

function confEl() {
  return document.getElementById("conf");
}
function confEditor() {
  return document.getElementById("conf-editor");
}
function confStatus() {
  return document.getElementById("conf-status");
}

export function getConfText() {
  const ed = confEditor();
  return ed ? ed.value : state.lastConf;
}

export function setConfText(text, asGenerated) {
  state.lastConf = text || "";
  const c = confEl();
  if (c) c.textContent = state.lastConf;
  const ed = confEditor();
  if (ed) ed.value = state.lastConf;
  if (asGenerated) state.lastConfGenerated = state.lastConf;
}

export function flashConfStatus(msg) {
  const el = confStatus();
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
  setTimeout(() => {
    el.hidden = true;
  }, 2500);
}

export async function copyConf() {
  const text = getConfText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    flashConfStatus(t("copied"));
  } catch (_) {
    confEditor()?.select();
    document.execCommand("copy");
    flashConfStatus(t("copied"));
  }
}

export function syncRenameFieldsFromState() {
  const map = {
    "rn-hot-name": state.volState.hotName,
    "rn-cold-name": state.volState.coldName,
    "rn-sum-name": state.volState.sumName,
    "rn-hot-path": state.volState.hotPath,
    "rn-cold-path": state.volState.coldPath,
    "rn-sum-path": state.volState.sumPath,
    "rn-frozen-path": state.volState.frozenPath,
  };
  Object.entries(map).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  });
}

function readRenameFields() {
  return {
    hotName: (document.getElementById("rn-hot-name")?.value || "hotwarm").trim(),
    coldName: (document.getElementById("rn-cold-name")?.value || "cold").trim(),
    sumName: (document.getElementById("rn-sum-name")?.value || "summaries").trim(),
    hotPath: (document.getElementById("rn-hot-path")?.value || "/hot").trim(),
    coldPath: (document.getElementById("rn-cold-path")?.value || "/cold").trim(),
    sumPath: (document.getElementById("rn-sum-path")?.value || "/summaries").trim(),
    frozenPath: (document.getElementById("rn-frozen-path")?.value || "/frozen").trim(),
  };
}

function renameVolumeId(text, from, to) {
  if (!from || from === to) return text;
  const reStanza = new RegExp(`\\[volume:${escapeRegExp(from)}\\]`, "g");
  const reRef = new RegExp(`volume:${escapeRegExp(from)}(?=/|\\b)`, "g");
  return text.replace(reStanza, `[volume:${to}]`).replace(reRef, `volume:${to}`);
}

function renameFsPath(text, from, to) {
  if (!from || from === to) return text;
  const fromTrim = from.replace(/\/+$/, "") || from;
  const toTrim = to.replace(/\/+$/, "") || to;
  let out = text;
  out = out.replace(new RegExp(`(^|\\n)(path\\s*=\\s*)${escapeRegExp(from)}\\b`, "gm"), `$1$2${to}`);
  out = out.replace(new RegExp(`(^|\\n)(path\\s*=\\s*)${escapeRegExp(fromTrim)}\\b`, "gm"), `$1$2${toTrim}`);
  out = out.replace(new RegExp(`(=\\s*)${escapeRegExp(fromTrim)}/`, "g"), `$1${toTrim}/`);
  return out;
}

export function applyVolumeRenames() {
  const next = readRenameFields();
  let text = getConfText();
  if (!text) return;

  const vols = [
    [state.volState.sumName, next.sumName],
    [state.volState.hotName, next.hotName],
    [state.volState.coldName, next.coldName],
  ].sort((a, b) => b[0].length - a[0].length);
  vols.forEach(([from, to]) => {
    text = renameVolumeId(text, from, to);
  });

  const paths = [
    [state.volState.sumPath, next.sumPath],
    [state.volState.hotPath, next.hotPath],
    [state.volState.coldPath, next.coldPath],
    [state.volState.frozenPath, next.frozenPath],
  ].sort((a, b) => b[0].length - a[0].length);
  paths.forEach(([from, to]) => {
    text = renameFsPath(text, from, to);
  });

  Object.assign(state.volState, next);
  setConfText(text, false);
  syncRenameFieldsFromState();
  flashConfStatus(t("renamed_ok"));
}

export function findNextInEditor() {
  const needle = document.getElementById("conf-find")?.value || "";
  const ed = confEditor();
  if (!needle || !ed) return;
  const src = ed.value;
  const start = Math.max(state.confFindPos, ed.selectionEnd || 0);
  let idx = src.indexOf(needle, start);
  if (idx < 0 && start > 0) idx = src.indexOf(needle, 0);
  if (idx < 0) {
    flashConfStatus(t("find_none"));
    return;
  }
  ed.focus();
  ed.setSelectionRange(idx, idx + needle.length);
  state.confFindPos = idx + needle.length;
  const line = src.slice(0, idx).split("\n").length;
  ed.scrollTop = Math.max(0, (line - 4) * 18);
}

export function replaceOneInEditor() {
  const needle = document.getElementById("conf-find")?.value || "";
  const rep = document.getElementById("conf-replace")?.value ?? "";
  const ed = confEditor();
  if (!needle || !ed) return;
  const start = ed.selectionStart;
  const end = ed.selectionEnd;
  const selected = ed.value.slice(start, end);
  if (selected === needle) {
    ed.setRangeText(rep, start, end, "end");
    state.lastConf = ed.value;
    flashConfStatus(`${t("replaced_n")} 1`);
    return;
  }
  findNextInEditor();
  if (ed.value.slice(ed.selectionStart, ed.selectionEnd) === needle) {
    const s = ed.selectionStart;
    const e = ed.selectionEnd;
    ed.setRangeText(rep, s, e, "end");
    state.lastConf = ed.value;
    flashConfStatus(`${t("replaced_n")} 1`);
  }
}

export function replaceAllInEditor() {
  const needle = document.getElementById("conf-find")?.value || "";
  const rep = document.getElementById("conf-replace")?.value ?? "";
  const ed = confEditor();
  if (!needle || !ed) return;
  const parts = ed.value.split(needle);
  const count = parts.length - 1;
  if (count <= 0) {
    flashConfStatus(t("find_none"));
    return;
  }
  ed.value = parts.join(rep);
  state.lastConf = ed.value;
  flashConfStatus(`${t("replaced_n")} ${count}`);
}

export function syncVolStateFromGlobals() {
  const g = collectGlobals();
  state.volState.hotPath = g.hot_path || "/hot";
  state.volState.coldPath = g.cold_path || "/cold";
  state.volState.sumPath = g.summaries_path || "/summaries";
  state.volState.frozenPath = g.frozen_path || "/frozen";
  syncRenameFieldsFromState();
}

export function bindConfEditor() {
  const ed = confEditor();
  ed?.addEventListener("input", () => {
    state.lastConf = ed.value;
  });

  document.getElementById("btn-find-next")?.addEventListener("click", findNextInEditor);
  document.getElementById("btn-replace-one")?.addEventListener("click", replaceOneInEditor);
  document.getElementById("btn-replace-all")?.addEventListener("click", replaceAllInEditor);
  document.getElementById("btn-copy-conf")?.addEventListener("click", copyConf);
  document.getElementById("btn-download-conf-ed")?.addEventListener("click", () => {
    const text = getConfText();
    if (text) downloadText("indexes.conf", text);
  });
  document.getElementById("btn-apply-rename")?.addEventListener("click", applyVolumeRenames);
  document.getElementById("btn-reset-conf")?.addEventListener("click", () => {
    setConfText(state.lastConfGenerated || state.lastConf, false);
    flashConfStatus(t("reset_conf"));
  });

  document.getElementById("conf-find")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      findNextInEditor();
    }
  });

  document.querySelectorAll('[data-tabs="results"] [data-tab="conf"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setConfText(state.lastConf || state.lastConfGenerated, false);
      syncRenameFieldsFromState();
    });
  });

  const out = document.getElementById("out");
  document.addEventListener("keydown", (e) => {
    const confPanel = document.querySelector('.results .tab-panel[data-panel="conf"]');
    const confOpen = confPanel && !confPanel.hidden && out && !out.hidden;
    if (!confOpen) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      document.getElementById("conf-find")?.focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
      e.preventDefault();
      document.getElementById("conf-replace")?.focus();
    }
  });
}
