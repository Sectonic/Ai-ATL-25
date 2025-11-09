import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { GeoJsonLayers } from './GeoJsonLayers'
import { NeighborhoodMask } from './NeighborhoodMask'
import { EventMarkers } from './EventMarkers'
import { EventBlinkAnimation } from './EventBlinkAnimation'
import { LoadingAnimation } from './LoadingAnimation'
import type { EventNotification } from '../../stores/simulationStore'

const ATLANTA_CENTER: [number, number] = [33.7490, -84.3880]
const DEFAULT_ZOOM = 13
const MIN_ZOOM = 12
const MAX_ZOOM = 18

const ATLANTA_BOUNDS: [[number, number], [number, number]] = [
  [33.60, -84.75],
  [33.90, -84.05],
]

interface MapContentProps {
  selectedEvent: EventNotification | null
}

export function MapContent({ selectedEvent }: MapContentProps) {
  const isEventSelected = selectedEvent !== null

  return (
    <div className="absolute inset-0 z-0 transition-opacity duration-300">
      <MapContainer
        center={ATLANTA_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={ATLANTA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={!isEventSelected}
        dragging={!isEventSelected}
        doubleClickZoom={!isEventSelected}
        touchZoom={!isEventSelected}
        zoomSnap={0.8}
        boxZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <NeighborhoodMask />
        <GeoJsonLayers disabled={isEventSelected} />
        <LoadingAnimation />
        <EventMarkers />
        <EventBlinkAnimation event={selectedEvent} />
      </MapContainer>
    </div>
  )
}

