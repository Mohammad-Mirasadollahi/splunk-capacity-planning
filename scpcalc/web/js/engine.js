/**
 * Browser engine: Go WASM (preferred) with HTTP API fallback for `scpcalc serve`.
 */
let ready = null;
let mode = "pending"; // "wasm" | "api" | "pending"

function wasmBase() {
  // Prefer relative path so GitHub Pages /calc/ works.
  const scripts = document.querySelectorAll('script[type="module"]');
  for (const s of scripts) {
    if (s.src && s.src.includes("app.js")) {
      return new URL("./wasm/", s.src).href;
    }
  }
  return new URL("wasm/", window.location.href).href;
}

function apiBase() {
  return "";
}

async function fetchBytes(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.arrayBuffer();
}

async function loadWasm() {
  if (typeof globalThis.Go !== "function") {
    throw new Error("wasm_exec.js not loaded (Go runtime missing)");
  }
  const base = wasmBase();
  const go = new globalThis.Go();
  const wasmURL = new URL("scpcalc.wasm", base).href;

  let result;
  if (WebAssembly.instantiateStreaming) {
    try {
      const resp = await fetch(wasmURL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      result = await WebAssembly.instantiateStreaming(resp, go.importObject);
    } catch {
      const buf = await fetchBytes(wasmURL);
      result = await WebAssembly.instantiate(buf, go.importObject);
    }
  } else {
    const buf = await fetchBytes(wasmURL);
    result = await WebAssembly.instantiate(buf, go.importObject);
  }
  // Keep the Go scheduler alive (main blocks on select{}).
  void go.run(result.instance);
  for (let i = 0; i < 200; i++) {
    if (globalThis.scpcalcReady === true && typeof globalThis.scpcalcPlan === "function") {
      mode = "wasm";
      return;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("WASM engine did not become ready");
}

async function probeAPI() {
  try {
    const r = await fetch(`${apiBase()}/api/v1/health`, { method: "GET" });
    if (r.ok) {
      mode = "api";
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Initialize WASM first; fall back to HTTP API if wasm fails and API is up. */
export function initEngine() {
  if (ready) return ready;
  ready = (async () => {
    try {
      await loadWasm();
      return mode;
    } catch (wasmErr) {
      const apiOk = await probeAPI();
      if (apiOk) return mode;
      throw new Error(`engine unavailable (wasm: ${wasmErr.message || wasmErr})`);
    }
  })();
  return ready;
}

export function engineMode() {
  return mode;
}

export async function fetchPresets() {
  await initEngine();
  if (mode === "wasm") {
    const raw = globalThis.scpcalcPresets();
    const data = JSON.parse(raw || "{}");
    if (data.error) throw new Error(data.error);
    return data;
  }
  const res = await fetch(`${apiBase()}/api/v1/presets`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function runPlan(body) {
  await initEngine();
  if (mode === "wasm") {
    const raw = globalThis.scpcalcPlan(JSON.stringify(body));
    const data = JSON.parse(raw || "{}");
    if (data.error) throw new Error(data.error);
    return data;
  }
  const res = await fetch(`${apiBase()}/api/v1/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
