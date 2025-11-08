import { useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { useSimulationStore, type EventNotification } from '../../stores/simulationStore'
import { motion, AnimatePresence } from 'framer-motion'

const severityColors = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
}

interface EventBlinkAnimationProps {
  event: EventNotification | null
}

export function EventBlinkAnimation({ event }: EventBlinkAnimationProps) {
  const map = useMap()
  const { setPreviousMapView, previousMapView } = useSimulationStore()
  const [pulseKey, setPulseKey] = useState(0)
  const [wasEventSelected, setWasEventSelected] = useState(false)
  const [pulsePosition, setPulsePosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (event) {
      if (!wasEventSelected) {
        const currentCenter = map.getCenter()
        const currentZoom = map.getZoom()
        
        setPreviousMapView({
          center: [currentCenter.lat, currentCenter.lng],
          zoom: currentZoom,
        })
        setWasEventSelected(true)
        setPulsePosition(null)
      }

      map.dragging.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()

      const zoomTimer = setTimeout(() => {
        map.setView(event.coordinates, 14, {
          animate: true,
          duration: 0.8,
        });
      }, 200)

      const pulseTimer = setTimeout(() => {
        const position = map.latLngToContainerPoint(event.coordinates)
        setPulsePosition({ x: position.x, y: position.y })
        setPulseKey(prev => prev + 1)
      }, 500)

      return () => {
        clearTimeout(zoomTimer)
        clearTimeout(pulseTimer)
      }
    } else {
      if (wasEventSelected && previousMapView) {
        map.setView(previousMapView.center, previousMapView.zoom, {
          animate: true,
          duration: 0.8,
        })
        setPreviousMapView(null)
        setWasEventSelected(false)
        setPulsePosition(null)
      }

      map.dragging.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
    }
  }, [event?.id, map, setPreviousMapView, previousMapView, wasEventSelected])

  if (!event || !pulsePosition) {
    return null
  }

  const color = severityColors[event.severity]

  return (
    <div className="pointer-events-none" style={{ position: 'absolute', inset: 0, zIndex: 400 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={pulseKey}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: pulsePosition.x,
            top: pulsePosition.y,
            width: '200px',
            height: '200px',
            marginLeft: '-100px',
            marginTop: '-100px',
            borderRadius: '50%',
            border: `3px solid ${color}`,
            boxShadow: `0 0 30px ${color}`,
          }}
        />
      </AnimatePresence>
    </div>
  )
}

