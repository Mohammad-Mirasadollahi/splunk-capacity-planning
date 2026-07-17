/**
 * Shareable plan URLs via location.hash.
 * Format: #scp1.<payload>  (uncompressed base64url JSON)
 *         #scp1z.<payload> (deflate-raw + base64url JSON)
 */

const HASH_PLAIN = "scp1.";
const HASH_ZIP = "scp1z.";
const MAX_HASH_CHARS = 28000;

function bytesToBase64Url(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(b64url) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflateRaw(bytes) {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("decompress unsupported");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function utf8Encode(str) {
  return new TextEncoder().encode(str);
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

/** @returns {string|null} hash fragment without leading #, or null if too long */
export async function encodeSnapshotHash(snapshot) {
  const json = JSON.stringify(snapshot);
  const raw = utf8Encode(json);
  const zipped = await deflateRaw(raw);
  if (zipped && zipped.length < raw.length * 0.95) {
    const payload = HASH_ZIP + bytesToBase64Url(zipped);
    if (payload.length <= MAX_HASH_CHARS) return payload;
  }
  const plain = HASH_PLAIN + bytesToBase64Url(raw);
  if (plain.length > MAX_HASH_CHARS) return null;
  return plain;
}

/** Extract `#scp1…` / `#scp1z…` fragment from a full URL, hash, or pasted text. */
export function extractShareFragment(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  // Full URL with hash
  try {
    if (/^https?:\/\//i.test(text) || text.startsWith("//")) {
      const u = new URL(text.startsWith("//") ? `https:${text}` : text);
      if (u.hash) {
        const frag = u.hash.replace(/^#/, "");
        if (frag.startsWith(HASH_PLAIN) || frag.startsWith(HASH_ZIP)) return frag;
      }
    }
  } catch {
    /* fall through */
  }

  // Hash-only or fragment pasted alone
  let h = text.replace(/^#/, "");
  const hashIdx = h.indexOf("#scp1");
  if (hashIdx >= 0) h = h.slice(hashIdx + 1);
  // Accidental query leftovers after hash in some browsers
  const amp = h.indexOf("&");
  if (amp >= 0) h = h.slice(0, amp);
  if (h.startsWith(HASH_PLAIN) || h.startsWith(HASH_ZIP)) return h;
  return null;
}

/** @returns {object|null} parsed snapshot */
export async function decodeSnapshotHash(hash) {
  const h = extractShareFragment(hash);
  if (!h) return null;

  let compressed = false;
  let payload = "";
  if (h.startsWith(HASH_ZIP)) {
    compressed = true;
    payload = h.slice(HASH_ZIP.length);
  } else if (h.startsWith(HASH_PLAIN)) {
    payload = h.slice(HASH_PLAIN.length);
  } else {
    return null;
  }
  if (!payload) return null;

  const bytes = base64UrlToBytes(payload);
  const jsonBytes = compressed ? await inflateRaw(bytes) : bytes;
  const data = JSON.parse(utf8Decode(jsonBytes));
  if (!data || !Array.isArray(data.rows)) throw new Error("invalid share URL");
  return data;
}

export function hasShareHash(hash = location.hash) {
  return !!extractShareFragment(hash);
}

/** Build absolute share URL and write hash onto current location. */
export async function buildShareURL(snapshot) {
  const fragment = await encodeSnapshotHash(snapshot);
  if (!fragment) throw new Error("plan too large for URL — use Export .json");
  const url = new URL(location.href);
  url.hash = fragment;
  return url.toString();
}

export async function applyShareHashToLocation(snapshot) {
  const fragment = await encodeSnapshotHash(snapshot);
  if (!fragment) throw new Error("plan too large for URL — use Export .json");
  if (location.hash.replace(/^#/, "") !== fragment) {
    history.replaceState(null, "", `${location.pathname}${location.search}#${fragment}`);
  }
  return `${location.origin}${location.pathname}${location.search}#${fragment}`;
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
