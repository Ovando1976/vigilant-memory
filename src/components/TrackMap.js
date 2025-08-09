import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function TrackMap({ pickupCoords, dropoffCoords, driverCoords }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: pickupCoords || [-64.9307, 18.3419],
      zoom: 12,
      pitch: 45,
      bearing: -20,
      antialias: true,
    });

    mapInstance.current = map;

    map.on('load', () => {
      // Fit bounds around pickup & dropoff
      const bounds = new mapboxgl.LngLatBounds();
      if (pickupCoords) bounds.extend([pickupCoords.lng, pickupCoords.lat]);
      if (dropoffCoords) bounds.extend([dropoffCoords.lng, dropoffCoords.lat]);
      if (driverCoords) bounds.extend([driverCoords.lng, driverCoords.lat]);
      map.fitBounds(bounds, { padding: 100, duration: 1200 });

      // Add pickup + dropoff markers
      if (pickupCoords) {
        new mapboxgl.Marker({ color: '#0077b6' })
          .setLngLat([pickupCoords.lng, pickupCoords.lat])
          .addTo(map);
      }
      if (dropoffCoords) {
        new mapboxgl.Marker({ color: '#ff6f5b' })
          .setLngLat([dropoffCoords.lng, dropoffCoords.lat])
          .addTo(map);
      }

      // Draw route line
      if (pickupCoords && dropoffCoords) {
        const routeGeoJSON = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [pickupCoords.lng, pickupCoords.lat],
                  [dropoffCoords.lng, dropoffCoords.lat],
                ],
              },
            },
          ],
        };

        map.addSource('routeLine', {
          type: 'geojson',
          data: routeGeoJSON,
        });

        map.addLayer({
          id: 'routeLineLayer',
          type: 'line',
          source: 'routeLine',
          paint: {
            'line-color': '#00e676',
            'line-width': 5,
            'line-opacity': 0.8,
            'line-dasharray': [2, 4],
          },
        });
      }
    });

    return () => map.remove();
  }, [pickupCoords, dropoffCoords, driverCoords]);

  // 🟢 Real-time driver marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !driverCoords) return;

    const { lat, lng } = driverCoords;

    if (!driverMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.background = '#00e676';
      el.style.borderRadius = '50%';
      el.style.boxShadow = '0 0 12px rgba(0,0,0,0.5)';
      driverMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      driverMarkerRef.current.setLngLat([lng, lat]);
    }

    // Fly camera to driver
    map.flyTo({
      center: [lng, lat],
      zoom: 14,
      speed: 0.8,
      curve: 1,
    });
  }, [driverCoords]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '10px',
        border: '2px solid #ccc',
      }}
    />
  );
}
