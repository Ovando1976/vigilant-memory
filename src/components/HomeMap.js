// src/components/HomeMap.js
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function HomeMap({ pickupCoords, dropoffCoords }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-64.9307, 18.3419], // Charlotte Amalie
      zoom: 12,
      pitch: 45,
      bearing: -20,
      antialias: true,
    });

    mapInstance.current = map;

    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !pickupCoords || !dropoffCoords) return;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([pickupCoords.lng, pickupCoords.lat]);
    bounds.extend([dropoffCoords.lng, dropoffCoords.lat]);

    map.fitBounds(bounds, {
      padding: 100,
      duration: 1600,
    });

    new mapboxgl.Marker({ color: '#0077b6' })
      .setLngLat([pickupCoords.lng, pickupCoords.lat])
      .addTo(map);

    new mapboxgl.Marker({ color: '#ff6f5b' })
      .setLngLat([dropoffCoords.lng, dropoffCoords.lat])
      .addTo(map);
  }, [pickupCoords, dropoffCoords]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '10px',
        border: '2px solid #64aef2',
      }}
    />
  );
}