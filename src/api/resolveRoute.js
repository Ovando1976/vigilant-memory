const ENABLE_BACKEND = process.env.REACT_APP_ENABLE_BACKEND === "1";
const BASE = ENABLE_BACKEND ? (process.env.REACT_APP_API_BASE_URL || "/api") : null;

export async function resolveRoute(payload) {
  if (!BASE) return { ok: true, stub: true, data: null };
  const res = await fetch(`${BASE}/resolve-route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`resolve-route ${res.status}`);
  return res.json();
}