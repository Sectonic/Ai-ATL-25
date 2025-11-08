import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { GeoJsonLayers } from './GeoJsonLayers'
import { NeighborhoodMask } from './NeighborhoodMask'
import { EventMarkers } from './EventMarkers'
import { EventBlinkAnimation } from './EventBlinkAnimation'
import { RoadLoadingAnimation } from './RoadLoadingAnimation'
import { useSimulationStore } from '../../stores/simulationStore'
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
  const { simulationStatus } = useSimulationStore()
  const isLoading = simulationStatus === 'loading'

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
        scrollWheelZoom={true}
        zoomSnap={0.8}
        boxZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <NeighborhoodMask />
        <GeoJsonLayers />
        {isLoading && <RoadLoadingAnimation />}
        <EventMarkers />
        <EventBlinkAnimation event={selectedEvent} />
      </MapContainer>
    </div>
  )
}

