import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { GeoJsonLayers } from './GeoJsonLayers'
import { EventMarkers } from './EventMarkers'

const ATLANTA_CENTER: [number, number] = [33.7490, -84.3880]
const DEFAULT_ZOOM = 12

export function AtlantaMap() {
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={ATLANTA_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJsonLayers />
        <EventMarkers />
      </MapContainer>
    </div>
  )
}

