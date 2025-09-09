import { apiFetch, BACKEND_ENABLED } from "./apiClient";
import { locationCoords } from "../data/locationCoords";

// small helpers
const toRad = (d) => (d * Math.PI) / 180;
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2),
    s2 = Math.sin(dLng / 2);
  const aa =
    s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}
function islandOf({ lat, lng }) {
  if (lat < 18.0) return "STX";
  return lng > -64.84 ? "STJ" : "STT";
}
function nearestNamed(point, islCode) {
  const entries = Object.entries(locationCoords);
  let best = null;
  for (const [name, coords] of entries) {
    const code = islandOf(coords);
    if (islCode && code !== islCode) continue;
    const d = haversineKm(point, coords);
    if (!best || d < best.dKm) best = { name, coords, dKm: d };
  }
  return best;
}

export async function resolveRoute({
  pickup,
  dropoff,
  pickupCoords,
  dropoffCoords,
  island,
  signal,
}) {
  // Prefer server if enabled
  if (BACKEND_ENABLED) {
    try {
      return await apiFetch("/api/resolve-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup,
          dropoff,
          pickupCoords,
          dropoffCoords,
          island,
        }),
        signal,
      });
    } catch (e) {
      if (e?.code !== "backend_disabled") throw e;
    }
  }

  // Client fallback: snap names/coords and validate island
  const fromCoords = pickupCoords || locationCoords[pickup];
  const toCoords = dropoffCoords || locationCoords[dropoff];

  if (!fromCoords || !toCoords) {
    const missing = !fromCoords ? "pickup" : "dropoff";
    const err = new Error("location_not_found");
    err.code = "location_not_found";
    err.missing = missing;
    throw err;
  }

  const fromName =
    pickup ||
    nearestNamed(fromCoords, islandOf(fromCoords))?.name ||
    "Custom A";
  const toName =
    dropoff || nearestNamed(toCoords, islandOf(toCoords))?.name || "Custom B";

  const islA = islandOf(fromCoords);
  const islB = islandOf(toCoords);
  if (islA !== islB) {
    const err = new Error("cross_island_not_supported");
    err.code = "cross_island_not_supported";
    err.fromIsland = islA;
    err.toIsland = islB;
    throw err;
  }

  const dKm = haversineKm(fromCoords, toCoords);
  const durationMin = Math.max(10, Math.round((dKm / 28) * 60));

  return {
    routeId: `${fromName.replace(/\s+/g, "_")}__${toName.replace(/\s+/g, "_")}`,
    island: islA,
    durationMin,
    from: { name: fromName, lat: fromCoords.lat, lng: fromCoords.lng },
    to: { name: toName, lat: toCoords.lat, lng: toCoords.lng },
  };
}
