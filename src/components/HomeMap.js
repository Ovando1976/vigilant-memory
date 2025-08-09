import React, { useRef, useEffect } from 'react';
import mapboxgl from '../lib/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function HomeMap({ pickupCoords, dropoffCoords }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-64.9307, 18.3419],
      zoom: 12,
      pitch: 45,
      bearing: -20,
      antialias: true,
    });

    mapInstance.current = map;

    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      map.remove();
    };
  }, []);

  // Update pickup/dropoff markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Remove existing markers before adding new ones
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
  }

    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
      dropoffMarkerRef.current = null;
    }

    if (!pickupCoords || !dropoffCoords) return;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([pickupCoords.lng, pickupCoords.lat]);
    bounds.extend([dropoffCoords.lng, dropoffCoords.lat]);

    map.fitBounds(bounds, { padding: 100, duration: 1600 });

    pickupMarkerRef.current = new mapboxgl.Marker({ color: '#0077b6' })
      .setLngLat([pickupCoords.lng, pickupCoords.lat])
      .addTo(map);

    dropoffMarkerRef.current = new mapboxgl.Marker({ color: '#ff6f5b' })
      .setLngLat([dropoffCoords.lng, dropoffCoords.lat])
      .addTo(map);

    // Optionally reset markers when dependencies change or component unmounts
    return () => {
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
    };
  }, [pickupCoords, dropoffCoords]);

  // Update driver markers live
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Remove old driver markers
    driverMarkersRef.current.forEach((marker) => marker.remove());
    driverMarkersRef.current = [];

    // Add new markers
    drivers.forEach((driver) => {
  const el = document.createElement('div');
  el.className = 'driver-icon';

  el.style.width = '24px';
  el.style.height = '24px';
  el.style.backgroundImage = "url('/icons/car.svg')";
  el.style.backgroundSize = 'contain';
  el.style.backgroundRepeat = 'no-repeat';
  el.style.transform = `rotate(${driver.heading || 0}deg)`;
  el.style.transition = 'transform 0.3s ease-out';

  const marker = new mapboxgl.Marker(el)
    .setLngLat([driver.lng, driver.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<strong>Driver ID:</strong> ${driver.id}<br/>
         <strong>Status:</strong> ${driver.status}`
      )
    )
    .addTo(map);

  driverMarkersRef.current.push(marker);
});
  }, [drivers]);

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
