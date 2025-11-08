import { Marker, useMap } from 'react-leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import L from 'leaflet'
import { useEffect } from 'react'
import { getEventColor } from '../../lib/eventColors'

const createEventIcon = (severity: number, positivity: number) => {
  const color = getEventColor(positivity, severity)
  const size = 16 + (severity * 8)
  
  return L.divIcon({
    html: `
      <div class="relative" style="width: ${size}px; height: ${size}px;">
        <div class="absolute inset-0 animate-ping opacity-75" style="background: ${color}; border-radius: 50%; width: ${size}px; height: ${size}px;"></div>
        <div style="background: ${color}; border-radius: 50%; width: ${size}px; height: ${size}px; border: 2px solid white; box-shadow: 0 2px ${4 + severity * 4}px rgba(0,0,0,${0.3 + severity * 0.3});"></div>
      </div>
    `,
    className: 'event-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function EventMarkers() {
  const { eventNotifications, setSelectedEventId } = useSimulationStore()
  const map = useMap()

  useEffect(() => {
    if (eventNotifications.length > 0) {
      const latestEvent = eventNotifications[eventNotifications.length - 1]
      map.setView(latestEvent.coordinates, map.getZoom(), {
        animate: true,
        duration: 0.5,
      })
    }
  }, [eventNotifications.length])

  return (
    <>
      {eventNotifications.map((event) => (
        <Marker
          key={event.id}
          position={event.coordinates}
          icon={createEventIcon(event.severity, event.positivity)}
          eventHandlers={{
            click: () => {
              setSelectedEventId(event.id)
            },
          }}
        />
      ))}
    </>
  )
}
