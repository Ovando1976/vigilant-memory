// src/pages/TestMap.js
import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function TestMap() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer
        center={[18.3419, -64.9307]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[18.3419, -64.9307]} />
      </MapContainer>
    </div>
  );
}
