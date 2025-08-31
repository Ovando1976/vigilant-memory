// src/components/HomeMap.jsx
import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";

// Simple marker icon fix for Leaflet in bundlers
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/** Island metadata: rough bounds + preferred view */
const ISLANDS = {
  STT: {
    name: "St. Thomas",
    center: [18.3381, -64.9407],
    // [south, west], [north, east]
    bounds: [
      [18.26, -65.04],
      [18.40, -64.82],
    ],
    zoom: 12,
  },
  STJ: {
    name: "St. John",
    center: [18.333, -64.733],
    bounds: [
      [18.28, -64.78],
      [18.38, -64.67],
    ],
    zoom: 12,
  },
  STX: {
    name: "St. Croix",
    center: [17.735, -64.80],
    bounds: [
      [17.67, -64.91],
      [17.79, -64.68],
    ],
    zoom: 11.5,
  },
};

const inBounds = ([lat, lng], [[s, w], [n, e]]) => lat >= s && lat <= n && lng >= w && lng <= e;
const toRad = (d) => (d * Math.PI) / 180;
const haversineKm = ([lat1, lon1], [lat2, lon2]) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

function FlyToIsland({ island }) {
  const map = useMap();
  useEffect(() => {
    if (!island || !ISLANDS[island]) return;
    const { center, zoom } = ISLANDS[island];
    map.flyTo(center, zoom, { duration: 0.9 });
  }, [island, map]);
  return null;
}

function FitToRoute({ pickupCoords, dropoffCoords, fallbackIsland }) {
  const map = useMap();
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const b = L.latLngBounds([pickupCoords, dropoffCoords]).pad(0.25);
      map.fitBounds(b, { animate: true });
    } else if (fallbackIsland && ISLANDS[fallbackIsland]) {
      const { center, zoom } = ISLANDS[fallbackIsland];
      map.setView(center, zoom);
    }
  }, [pickupCoords, dropoffCoords, fallbackIsland, map]);
  return null;
}

function IslandClickHandler({ onIslandChange }) {
  const map = useMap();

  useMapEvent("click", (e) => {
    const pt = [e.latlng.lat, e.latlng.lng];

    // 1) If inside an island’s bounds, pick it
    let chosen = null;
    for (const [code, meta] of Object.entries(ISLANDS)) {
      if (inBounds(pt, meta.bounds)) {
        chosen = code;
        break;
      }
    }

    // 2) Else choose the nearest island center
    if (!chosen) {
      let best = null;
      let bestKm = Infinity;
      for (const [code, meta] of Object.entries(ISLANDS)) {
        const d = haversineKm(pt, meta.center);
        if (d < bestKm) {
          bestKm = d;
          best = code;
        }
      }
      chosen = best;
    }

    if (chosen) {
      const { center, zoom } = ISLANDS[chosen];
      map.flyTo(center, zoom, { duration: 0.9 });
      if (typeof onIslandChange === "function") onIslandChange(chosen);
    }
  });

  return null;
}

/**
 * Props:
 *  - island?: "STT" | "STJ" | "STX"
 *  - onIslandChange?: (code) => void
 *  - pickupCoords?: {lat,lng}
 *  - dropoffCoords?: {lat,lng}
 */
export default function HomeMap({
  island = "STT",
  onIslandChange,
  pickupCoords = null,
  dropoffCoords = null,
}) {
  const polyline = useMemo(() => {
    if (pickupCoords && dropoffCoords) return [pickupCoords, dropoffCoords];
    return null;
  }, [pickupCoords, dropoffCoords]);

  return (
    <MapContainer
      style={{ width: "100%", height: "100%" }}
      center={[18.33, -64.80]} // USVI overview
      zoom={10}
      scrollWheelZoom={true}
      minZoom={9}
      maxZoom={18}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* View managers */}
      <FitToRoute
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
        fallbackIsland={island}
      />
      <FlyToIsland island={island} />
      <IslandClickHandler onIslandChange={onIslandChange} />

      {/* Route visuals */}
      {pickupCoords && <Marker position={pickupCoords} />}
      {dropoffCoords && <Marker position={dropoffCoords} />}
      {polyline && <Polyline positions={polyline} />}
    </MapContainer>
  );
}