import { Marker, Popup, useMap } from 'react-leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import L from 'leaflet'
import { useEffect } from 'react'

const createEventIcon = (severity: 'low' | 'medium' | 'high') => {
  const colors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
  }
  
  const color = colors[severity]
  
  return L.divIcon({
    html: `
      <div class="relative">
        <div class="absolute inset-0 animate-ping opacity-75" style="background: ${color}; border-radius: 50%; width: 20px; height: 20px;"></div>
        <div style="background: ${color}; border-radius: 50%; width: 20px; height: 20px; border: 2px solid white;"></div>
      </div>
    `,
    className: 'event-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

export function EventMarkers() {
  const { eventNotifications } = useSimulationStore()
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
          icon={createEventIcon(event.severity)}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold text-slate-900">{event.zoneName}</div>
              <div className="text-slate-600 mt-1">{event.description}</div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

