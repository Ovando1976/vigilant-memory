import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function TrackMap() {
  const mapRef = useRef(null);

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

    map.on('load', () => {
      map.flyTo({
        center: [-64.9307, 18.3419],
        zoom: 13,
        speed: 0.8,
        curve: 1.4,
        easing: (t) => t,
      });
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-[420px] rounded-xl shadow-xl border-2 border-blue-300"
    />
  );
}