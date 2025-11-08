import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLngBoundsExpression } from 'leaflet'
import { GeoJsonLayers } from './GeoJsonLayers'
import { EventMarkers } from './EventMarkers'

const ATLANTA_CENTER: [number, number] = [33.7490, -84.3880]
const DEFAULT_ZOOM = 13
const MIN_ZOOM = 12
const MAX_ZOOM = 18

const ATLANTA_BOUNDS: LatLngBoundsExpression = [
  [33.60, -84.75],
  [33.90, -84.05],
]

export function AtlantaMap() {
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={ATLANTA_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={ATLANTA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={true}
        zoomSnap={0.8}
        boxZoom={false}
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

