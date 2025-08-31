import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useMemo } from 'react';

const beaches = [
  {
    name: 'Magens Bay',
    position: { lat: 18.3624, lng: -64.9307 },
    description: 'Popular beach on St. Thomas.'
  },
  {
    name: 'Trunk Bay',
    position: { lat: 18.352, lng: -64.755 },
    description: 'Scenic beach on St. John.'
  }
];

export default function BeachMapWithControls({ onSelect }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const center = useMemo(() => beaches[0].position, []);

  function handleMarkerClick(beach) {
    if (onSelect) {
      onSelect({
        name: beach.name,
        type: 'beach',
        location: `${beach.position.lat}, ${beach.position.lng}`,
        description: beach.description
      });
    }
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {!isLoaded ? (
        <p>🧭 Loading map...</p>
      ) : (
        <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={center} zoom={10}>
          {beaches.map((beach) => (
            <Marker
              key={beach.name}
              position={beach.position}
              title={beach.name}
              onClick={() => handleMarkerClick(beach)}
            />
          ))}
        </GoogleMap>
      )}
    </div>
  );
}
