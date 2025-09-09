// src/lib/apiClient.js
export const BACKEND_ENABLED =
  String(process.env.REACT_APP_ENABLE_BACKEND || "1") === "1";

export async function apiFetch(path, init = {}) {
  if (!BACKEND_ENABLED) {
    const err = new Error("backend_disabled");
    err.code = "backend_disabled";
    throw err;
  }
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error || `HTTP ${res.status}`);
    err.code = json?.error || "http_error";
    err.detail = json;
    throw err;
  }
  return json;
}
