// src/lib/backend.js
export const BACKEND_ENABLED =
  String(process.env.REACT_APP_ENABLE_BACKEND || "0") === "1";

export const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

export async function apiFetch(path, init = {}) {
  if (!BACKEND_ENABLED) {
    const err = new Error("backend_disabled");
    err.code = "backend_disabled";
    throw err;
  }
  const url = path.startsWith("http") ? path : `${path}`;
  // In CRA, /api is proxied to API_BASE. Keep path as /api/… here.
  const r = await fetch(url, { credentials: "include", ...init });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(json?.error || `HTTP ${r.status}`);
    err.code = json?.error || "http_error";
    err.detail = json;
    throw err;
  }
  return json;
}