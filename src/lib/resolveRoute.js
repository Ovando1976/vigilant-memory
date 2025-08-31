// src/lib/resolveRoute.js

// Canonical name aliases (expand anytime)
const ALIASES = {
  "bolongo": "Bolongo Bay",
  "bolongo bay": "Bolongo Bay",
  "airport (stt)": "Cyril E. King Airport",
  "yacht haven": "Yacht Haven - Havensight",
  "havensight": "Havensight Cruise Port",
  "cruz bay": "Cruz Bay Ferry",
  "red hook": "Red Hook Ferry",
};

const ISLAND_TO_CODE = {
  "st. thomas": "STT",
  "st thomas": "STT",
  stt: "STT",
  "st. john": "STJ",
  "st john": "STJ",
  stj: "STJ",
  "st. croix": "STX",
  "st croix": "STX",
  stx: "STX",
};

const norm = (s) => String(s || "").trim().toLowerCase();

const resolveAlias = (name) => {
  if (!name) return name;
  const key = norm(name);
  return ALIASES[key] || name;
};

const normalizeIsland = (island) => {
  if (!island) return island;
  const code = ISLAND_TO_CODE[norm(island)];
  // prefer code if we recognize it; otherwise pass through original
  return code || island;
};

/**
 * Build the /api/resolve-route payload (keeps free-text too).
 */
export function buildResolveRoutePayload({
  pickup,
  dropoff,
  pickupCoords,
  dropoffCoords,
  island, // STT | STJ | STX or label
}) {
  const canonicalPickup = resolveAlias(pickup);
  const canonicalDropoff = resolveAlias(dropoff);

  return {
    // server accepts either canonical names or text; we send both
    pickup: canonicalPickup || null,
    dropoff: canonicalDropoff || null,
    pickupText: pickup || null,
    dropoffText: dropoff || null,
    pickupCoords: pickupCoords || null,
    dropoffCoords: dropoffCoords || null,
    island: normalizeIsland(island) || null,
  };
}

/**
 * Build the /api/rides/price/preview payload.
 * Use when you want the server to price a route using names and/or exact pins.
 */
export function buildPricePreviewPayload({
  fromCoords,
  toCoords,
  islandCode,
  passengerCount,
  fromName,
  toName,
}) {
  const body = {
    island: normalizeIsland(islandCode) || null,
    passengerCount: Number.isFinite(passengerCount) ? passengerCount : 1,
    pickupCoords: fromCoords || null,
    dropoffCoords: toCoords || null,
  };
  if (fromName) body.pickup = resolveAlias(fromName);
  if (toName) body.dropoff = resolveAlias(toName);
  return body;
}

/**
 * Backwards-compatible resolver used across the app.
 * Accepts a single object with keys: { pickup, dropoff, pickupCoords, dropoffCoords, island }
 */
export async function resolveRoute({
  pickup,
  dropoff,
  pickupCoords,
  dropoffCoords,
  island,
  signal,
}) {
  const body = buildResolveRoutePayload({
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    island,
  });

  const r = await fetch("/api/resolve-route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    credentials: "include",
  });

  if (!r.ok) {
    let detail = null;
    try {
      detail = await r.json();
    } catch {
      /* ignore */
    }
    const code = detail?.error || "resolve_failed";
    const msg = detail?.message || "Could not resolve locations.";
    const err = new Error(msg);
    err.code = code;
    err.payload = detail || null;
    throw err;
  }

  // Expected success shape:
  // {
  //   island: "STT",
  //   from: { name, lat, lng },
  //   to:   { name, lat, lng },
  //   routeId: "STT-from__to",
  //   durationMin
  // }
  return await r.json();
}