// src/components/LiveMap.js
import React, { useRef, useMemo, useEffect } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import useGoogleMaps from '../../hooks/useGoogleMaps';
import { CircularProgress, Box, Alert } from '@mui/material';
import { useArgonController } from '../../context/ArgonControllerContext';

/* ---------- constants ---------- */
const CENTER_FALLBACK = { lat: 18.3419, lng: -64.9307 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const LIGHT_STYLE = [
  { featureType: 'water', stylers: [{ color: '#b9d3c2' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
];
const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
];
const GTA_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1f1b24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#f0f' }] },
  { featureType: 'water', stylers: [{ color: '#00f1ff' }] },
];

/* ---------- helpers ---------- */
function decodePolyline(encoded) {
  if (!encoded || !window.google?.maps?.geometry?.encoding) return null;
  return window.google.maps.geometry.encoding.decodePath(encoded);
}

export default function LiveMap({
  pickupCoords,
  dropoffCoords,
  driverPosition,
  routePolyline, // array of {lat,lng} OR encoded string
  traveledPath = [], // array of past driver coords
}) {
  const [{ darkMode, gtaMode }] = useArgonController();

  /* ----- Google SDK loader ----- */
  const { isLoaded, loadError } = useGoogleMaps();

  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);

  /* ----- map options ----- */
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      styles: gtaMode ? GTA_STYLE : darkMode ? DARK_STYLE : LIGHT_STYLE,
    }),
    [darkMode, gtaMode],
  );

  /* ----- ensure routePolyline is array of LatLng --- */
  const routePath = useMemo(() => {
    if (!routePolyline) return null;
    if (Array.isArray(routePolyline)) return routePolyline;
    // encoded string
    return decodePolyline(routePolyline);
  }, [routePolyline, isLoaded]);

  /* ----- fit bounds when inputs change ----- */
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let any = false;

    [pickupCoords, dropoffCoords, driverPosition]
      .filter(Boolean)
      .forEach((p) => {
        bounds.extend(p);
        any = true;
      });

    if (routePath && routePath.length) {
      routePath.forEach((p) => bounds.extend(p));
      any = true;
    }

    if (any) mapRef.current.fitBounds(bounds, 80);
  }, [isLoaded, pickupCoords, dropoffCoords, driverPosition, routePath]);

  /* ----- rotate car icon based on heading ----- */
  useEffect(() => {
    if (!driverMarkerRef.current || !driverPosition?.heading) return;
    driverMarkerRef.current.setIcon({
      ...driverMarkerRef.current.getIcon(),
      rotation: driverPosition.heading,
    });
  }, [driverPosition?.heading]);

  /* ---------- render ---------- */
  if (loadError)
    return <Alert severity="error">Map failed to load – check API key</Alert>;

  if (!isLoaded)
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );

  const center =
    driverPosition || pickupCoords || dropoffCoords || CENTER_FALLBACK;

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={13}
      options={mapOptions}
      onLoad={(map) => (mapRef.current = map)}
    >
      {/* pickup / drop‑off markers */}
      {pickupCoords && (
        <Marker
          position={pickupCoords}
          label="P"
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#00bcd4',
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
            fillColor: '#ff9100',
            fillOpacity: 1,
            strokeWeight: 0,
          }}
        />
      )}

      {/* planned route */}
      {routePath && (
        <Polyline
          path={routePath}
          options={{
            strokeColor: '#8e24aa',
            strokeOpacity: 0.8,
            strokeWeight: 4,
          }}
        />
      )}

      {/* breadcrumb trail */}
      {traveledPath.length > 1 && (
        <Polyline
          path={traveledPath}
          options={{
            strokeColor: '#00e676',
            strokeOpacity: 0.9,
            strokeWeight: 6,
          }}
        />
      )}

      {/* live driver icon */}
      {driverPosition && (
        <Marker
          position={driverPosition}
          ref={driverMarkerRef}
          icon={{
            path:
              'M20.95,2.06c-5.26-1.3-10.64-1.3-15.9,0C2.35,2.56,0,5.12,0,8v6c0,2.88,2.35,5.44,5.05,5.94v2.22c0,0.55,0.45,1,1,1h2' +
              'v-2h12v2h2c0.55,0,1-0.45,1-1v-2.22C21.65,19.44,24,16.88,24,14V8C24,5.12,21.65,2.56,20.95,2.06z',
            fillColor: '#00e5ff',
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 1,
            anchor: new window.google.maps.Point(12, 12),
            rotation: driverPosition.heading || 0,
          }}
        />
      )}
    </GoogleMap>
  );
}
