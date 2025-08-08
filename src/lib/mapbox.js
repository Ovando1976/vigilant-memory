import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token is missing. Please set REACT_APP_MAPBOX_TOKEN.');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

export default mapboxgl;
