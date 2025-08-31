// src/components/RoutePreviewMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { useTheme } from "@mui/material";

// --- Brand styles (light/dark) ---
// Tweak colors to your palette if desired.
const MAP_STYLES = {
  light: [
    { elementType: "geometry", stylers: [{ color: "#f7fbff" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#3b5172" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#d7e3f4" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#c6d6ee" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfe7ff" }] }
  ],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#0b1425" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#a1b3d0" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0b1425" }] },
    { featureType: "administrative", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#122138" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a2b4a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#083654" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0e1b31" }] }
  ]
};

// Inline SVG marker icons (pickup = dot, dropoff = flag)
const pickupSvg = {
  path: "M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z",
  anchor: { x: 12, y: 12 },
  scaledSize: { width: 24, height: 24 },
  fillColor: "#22c55e",
  fillOpacity: 1,
  strokeWeight: 0
};
const flagSvg = {
  path: "M3 2h10l-2 3l2 3H3v8H1V2h2z",
  anchor: { x: 6, y: 16 },
  scaledSize: { width: 16, height: 16 },
  fillColor: "#60a5fa",
  fillOpacity: 1,
  strokeWeight: 0
};

const containerStyle = {
  width: "100%",
  height: "100%"
};

export default function RoutePreviewMap({
  pickupCoords,
  dropoffCoords,
  routeGeoJSON, // optional: { type:'LineString', coordinates:[[lng,lat],...] }
  googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey
  });

  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  // Convert GeoJSON to {lat,lng} path if provided
  const polyPath = useMemo(() => {
    if (!routeGeoJSON?.coordinates?.length) return null;
    return routeGeoJSON.coordinates.map(([lng, lat]) => ({ lat, lng }));
  }, [routeGeoJSON]);

  const center = useMemo(() => {
    if (pickupCoords) return { lat: pickupCoords.lat, lng: pickupCoords.lng };
    return { lat: 18.34, lng: -64.93 }; // STT default
  }, [pickupCoords]);

  // Fit bounds to pickup/dropoff
  useEffect(() => {
    if (!map || !pickupCoords || !dropoffCoords || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pickupCoords);
    bounds.extend(dropoffCoords);
    map.fitBounds(bounds, 64); // padding
  }, [map, pickupCoords, dropoffCoords]);

  const onLoad = (m) => {
    mapRef.current = m;
    setMap(m);
  };

  const options = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy",
      styles: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
      backgroundColor: isDark ? "#0b1425" : "#f7fbff"
    }),
    [isDark]
  );

  // Route line styling
  const routeOptions = useMemo(
    () => ({
      strokeColor: "#38bdf8", // lagoon blue
      strokeOpacity: 0.9,
      strokeWeight: 5,
      clickable: false
    }),
    []
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: isDark
          ? "0 10px 30px rgba(0,0,0,.45)"
          : "0 10px 24px rgba(11,18,32,.12)"
      }}
    >
      {isLoaded && (
        <GoogleMap
          onLoad={onLoad}
          mapContainerStyle={containerStyle}
          center={center}
          zoom={12}
          options={options}
        >
          {/* Pickup */}
          {pickupCoords && (
            <Marker
              position={pickupCoords}
              icon={pickupSvg}
              title="Pickup"
            />
          )}

          {/* Dropoff */}
          {dropoffCoords && (
            <Marker
              position={dropoffCoords}
              icon={flagSvg}
              title="Dropoff"
            />
          )}

          {/* Route line (optional if you pass GeoJSON) */}
          {polyPath && <Polyline path={polyPath} options={routeOptions} />}
        </GoogleMap>
      )}
    </div>
  );
}