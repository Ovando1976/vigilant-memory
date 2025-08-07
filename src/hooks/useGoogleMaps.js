import { useJsApiLoader } from '@react-google-maps/api';

const libraries = ['places', 'geometry']; // add more once; never change order

export default function useGoogleMaps() {
  return useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
    id: 'google-map-script', // optional but good practice
  });
}
