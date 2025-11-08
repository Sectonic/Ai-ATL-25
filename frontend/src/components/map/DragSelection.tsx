import { useState, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { Rectangle } from 'react-leaflet'
import L from 'leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import type { Feature } from 'geojson'

interface DragSelectionProps {
  features: Feature[]
}

export function DragSelection({ features }: DragSelectionProps) {
  const map = useMap()
  const { selectedZones, addSelectedZone } = useSimulationStore()
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null)
  const [endPoint, setEndPoint] = useState<L.LatLng | null>(null)
  const isShiftPressed = useRef(false)

  useMapEvents({
    mousedown: (e: L.LeafletMouseEvent) => {
      if (!e.originalEvent.shiftKey) {
        return
      }

      const target = e.originalEvent.target as HTMLElement
      if (target === map.getContainer() || 
          target.classList.contains('leaflet-container') ||
          target.classList.contains('leaflet-pane') ||
          target.classList.contains('leaflet-map-pane')) {
        setIsDragging(true)
        setStartPoint(e.latlng)
        setEndPoint(e.latlng)
        isShiftPressed.current = true
        map.dragging.disable()
        e.originalEvent.preventDefault()
        e.originalEvent.stopPropagation()
      }
    },
    mousemove: (e: L.LeafletMouseEvent) => {
      if (isDragging && startPoint) {
        setEndPoint(e.latlng)
        e.originalEvent.preventDefault()
      }
    },
    mouseup: () => {
      map.dragging.enable()
      
      if (isDragging && startPoint && endPoint) {
        const distance = startPoint.distanceTo(endPoint)
        if (distance > 0.001) {
          handleSelectionComplete()
        }
        setIsDragging(false)
        setStartPoint(null)
        setEndPoint(null)
      }
    },
    keydown: (e: L.LeafletKeyboardEvent) => {
      if (e.originalEvent.key === 'Shift') {
        isShiftPressed.current = true
      }
    },
    keyup: (e: L.LeafletKeyboardEvent) => {
      if (e.originalEvent.key === 'Shift') {
        isShiftPressed.current = false
        if (isDragging) {
          map.dragging.enable()
          setIsDragging(false)
          setStartPoint(null)
          setEndPoint(null)
        }
      }
    },
  })

  const handleSelectionComplete = () => {
    if (!startPoint || !endPoint) return

    const bounds = L.latLngBounds([startPoint, endPoint])
    const selectedFeatureIds: string[] = []

    features.forEach((feature) => {
      if (!feature.properties) return
      
      const featureId = feature.properties.OBJECTID_1 || 
                       feature.properties.OBJECTID || 
                       feature.properties.id || 
                       feature.properties.NAME
      
      if (!featureId) return

      let centerLat = 0
      let centerLng = 0
      let pointCount = 0

      if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates[0]
        coordinates.forEach((coord: number[]) => {
          centerLat += coord[1]
          centerLng += coord[0]
          pointCount++
        })
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon[0].forEach((coord: number[]) => {
            centerLat += coord[1]
            centerLng += coord[0]
            pointCount++
          })
        })
      }

      if (pointCount > 0) {
        centerLat /= pointCount
        centerLng /= pointCount
        const centerPoint = L.latLng(centerLat, centerLng)

        if (bounds.contains(centerPoint)) {
          selectedFeatureIds.push(featureId.toString())
        }
      }
    })

    if (selectedFeatureIds.length > 0) {
      selectedFeatureIds.forEach((id) => {
        if (!selectedZones.includes(id)) {
          addSelectedZone(id)
        }
      })
    }
  }

  if (!isDragging || !startPoint || !endPoint) {
    return null
  }

  const bounds = L.latLngBounds([startPoint, endPoint])

  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }}
    />
  )
}

