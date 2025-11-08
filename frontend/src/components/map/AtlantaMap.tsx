import { useEffect, useState, lazy, Suspense } from 'react'
import { useSimulationStore } from '../../stores/simulationStore'

const MapContent = lazy(() => import('./MapContent').then(m => ({ default: m.MapContent })))

export function AtlantaMap() {
  const [isClient, setIsClient] = useState(false)
  const { eventNotifications, selectedEventId } = useSimulationStore()
  const selectedEvent = eventNotifications.find((e) => e.id === selectedEventId) || null

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div className="absolute inset-0 z-0 bg-gray-900" />
  }

  return (
    <Suspense fallback={<div className="absolute inset-0 z-0 bg-[#020202]" />}>
      <MapContent selectedEvent={selectedEvent} />
    </Suspense>
  )
}

