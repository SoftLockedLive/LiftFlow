export const STORAGE_PREFIX = "liftflow_";

// Keys the app stores as a bare string rather than JSON.
const RAW_STRING_KEYS = new Set(["liftflow_last_workout_day"]);

const TRANSFER_PARAM = "transfer=";
// Long URLs start failing somewhere past ~2 MB in Chrome; stay well under that.
const MAX_TRANSFER_LENGTH = 1_000_000;

export function getLiftFlowStorage() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .sort()
    .reduce((data, key) => {
      data[key] = localStorage.getItem(key);
      return data;
    }, {});
}

export function downloadBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: getLiftFlowStorage(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `liftflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Accepts a parsed backup file ({ data }) or a bare key/value map. Returns how many keys were written.
// Keys in the backup replace the same keys here; keys it doesn't mention are left alone.
// Skips anything that isn't a LiftFlow key or whose value the app couldn't read back.
export function importBackup(parsed) {
  const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
  const entries = Object.entries(data && typeof data === "object" ? data : {})
    .filter(([key]) => key.startsWith(STORAGE_PREFIX))
    .map(([key, value]) => [key, toStoredValue(key, value)])
    .filter(([, value]) => value !== null);

  entries.forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
  if (entries.length) window.dispatchEvent(new Event("liftflow-profile-updated"));
  return entries.length;
}

function toStoredValue(key, value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return JSON.stringify(value) ?? null;
  if (RAW_STRING_KEYS.has(key)) return value;
  try {
    JSON.parse(value);
    return value;
  } catch {
    return null;
  }
}

// Builds a link that carries this device's data to another origin in the URL fragment,
// which browsers never send to a server. Returns null if the data is too big for a URL.
export async function buildTransferUrl(origin) {
  const json = JSON.stringify(getLiftFlowStorage());
  const encoded = await encodeText(json);
  if (encoded.length > MAX_TRANSFER_LENGTH) return null;
  return `${origin}/#${TRANSFER_PARAM}${encoded}`;
}

// Read once when the app loads, so every component sees the same answer no matter which effect runs first.
let pendingTransfer = typeof window === "undefined" ? "" : readTransferHash();
export const arrivedWithTransfer = Boolean(pendingTransfer);

// Returns the transfer payload from the URL the app was opened with, at most once.
export function takeTransfer() {
  const encoded = pendingTransfer;
  pendingTransfer = "";
  return encoded;
}

function readTransferHash() {
  const hash = window.location.hash.slice(1);
  return hash.startsWith(TRANSFER_PARAM) ? hash.slice(TRANSFER_PARAM.length) : "";
}

export async function decodeTransfer(encoded) {
  return JSON.parse(await decodeText(encoded));
}

// "z." = gzip + base64url, "j." = plain base64url for browsers without CompressionStream.
async function encodeText(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") return `j.${toBase64Url(bytes)}`;
  const compressed = await streamBytes(bytes, new CompressionStream("gzip"));
  return `z.${toBase64Url(compressed)}`;
}

async function decodeText(encoded) {
  const [format, body] = [encoded.slice(0, 2), encoded.slice(2)];
  const bytes = fromBase64Url(body);
  if (format === "j.") return new TextDecoder().decode(bytes);
  if (format === "z.") return new TextDecoder().decode(await streamBytes(bytes, new DecompressionStream("gzip")));
  throw new Error("Unknown transfer format");
}

async function streamBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
