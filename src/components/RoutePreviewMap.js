// src/components/RoutePreviewMap.jsx
import React, { useMemo, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, DirectionsRenderer } from "@react-google-maps/api";
import useGoogleMaps from "../hooks/useGoogleMaps"
import { CircularProgress, Box, Alert } from "@mui/material";
import { useArgonController } from "../context/ArgonControllerContext";

/* ---------- constants ---------- */
const CENTER_FALLBACK = { lat: 18.3419, lng: -64.9307 }; // Charlotte Amalie
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

/* Light‑mode map style from Snazzy Maps “Blue Water” */
const LIGHT_STYLE = [
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
  { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b9d3c2" }] },
];

/* Simple dark style – you can replace with your own */
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#000000" }] },
];

/* GTA neon vibe */
const GTA_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1f1b24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#f0f" }] },
  { featureType: "water", stylers: [{ color: "#00f1ff" }] },
];

export default function RoutePreviewMap({ pickupCoords, dropoffCoords }) {
  const [{ darkMode, gtaMode }] = useArgonController();

  /* ----- Google SDK loader ----- */
  const { isLoaded, loadError } = useGoogleMaps();


  /* ----- map & directions refs ----- */
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);

  /* ----- derive center / bounds ----- */
  const center = pickupCoords || dropoffCoords || CENTER_FALLBACK;

  /* ----- map options (memoised) ----- */
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      styles: gtaMode ? GTA_STYLE : darkMode ? DARK_STYLE : LIGHT_STYLE,
    }),
    [darkMode, gtaMode]
  );

  /* ----- fit map bounds when markers change ----- */
  useEffect(() => {
    if (!mapRef.current || !(pickupCoords || dropoffCoords)) return;
    const bounds = new window.google.maps.LatLngBounds();
    pickupCoords && bounds.extend(pickupCoords);
    dropoffCoords && bounds.extend(dropoffCoords);
    mapRef.current.fitBounds(bounds, 64); // padding
  }, [pickupCoords, dropoffCoords, isLoaded]);

  /* ----- request driving directions ----- */
  const shouldRequestRoute = pickupCoords && dropoffCoords && isLoaded && !directions;

  useEffect(() => {
    if (!shouldRequestRoute) return;
    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: pickupCoords,
        destination: dropoffCoords,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") setDirections(result);
        else console.warn("Directions request failed:", status);
      }
    );
  }, [shouldRequestRoute, pickupCoords, dropoffCoords]);

  /* ---------- render ---------- */
  if (loadError)
    return <Alert severity="error">Map failed to load – check API key</Alert>;

  if (!isLoaded)
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={13}
      options={mapOptions}
      onLoad={(map) => (mapRef.current = map)}
    >
      {/* markers */}
      {pickupCoords && (
        <Marker
          position={pickupCoords}
          label="P"
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#00bcd4",
            fillOpacity: 1,
            strokeWeight: 0,
          }}
        />
      )}

      {dropoffCoords && (
        <Marker
          position={dropoffCoords}
          label="D"
          icon={{
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: "#ff9100",
            fillOpacity: 1,
            strokeWeight: 0,
          }}
        />
      )}

      {/* route polyline or DirectionsRenderer */}
      {directions ? (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#00E676",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          }}
        />
      ) : (
        pickupCoords &&
        dropoffCoords && (
          <Polyline
            path={[pickupCoords, dropoffCoords]}
            options={{
              strokeColor: "#4285F4",
              strokeOpacity: 0.6,
              strokeWeight: 4,
              strokeDasharray: [8, 8],
            }}
          />
        )
      )}
    </GoogleMap>
  );
}