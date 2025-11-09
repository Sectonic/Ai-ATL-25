import { useRef, useMemo } from 'react'
import { GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import { useNeighborhoods } from '../../services/geojsonApi'
import { DragSelection } from './DragSelection'
import { getEventColor } from '../../lib/eventColors'
import type { PathOptions, Layer } from 'leaflet'
import type { Feature } from 'geojson'

interface GeoJsonLayersProps {
  disabled?: boolean
}

export function GeoJsonLayers({ disabled = false }: GeoJsonLayersProps) {
  const map = useMap()
  const {
    selectedZones,
    addSelectedZone,
    removeSelectedZone,
    clearSelectedZones,
    selectedEventId,
    simulationStatus,
    setHoveredNeighborhood,
    eventNotifications
  } = useSimulationStore()
  const { data: neighborhoodsData, isLoading } = useNeighborhoods()
  const clickStartTime = useRef<number>(0)
  const clickStartPos = useRef<{ x: number; y: number } | null>(null)
  const mapClickStartTime = useRef<number>(0)
  const mapClickStartPos = useRef<{ x: number; y: number } | null>(null)

  const zoneEventMetrics = useMemo(() => {
    const metricsMap = new Map<string, { positivity: number; severity: number }>()

    eventNotifications.forEach(event => {
      const existing = metricsMap.get(event.zoneName)
      if (existing) {
        const count = (existing as any).count || 1
        metricsMap.set(event.zoneName, {
          positivity: (existing.positivity * count + event.positivity) / (count + 1),
          severity: (existing.severity * count + event.severity) / (count + 1),
          ...({ count: count + 1 } as any)
        })
      } else {
        metricsMap.set(event.zoneName, {
          positivity: event.positivity,
          severity: event.severity,
          ...({ count: 1 } as any)
        })
      }
    })

    return metricsMap
  }, [eventNotifications])

  useMapEvents({
    mousedown: (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.shiftKey) {
        return
      }
      
      const target = e.originalEvent.target as HTMLElement
      const isMapBackground = target === map.getContainer() || 
                              target.classList.contains('leaflet-container') ||
                              target.classList.contains('leaflet-pane') ||
                              target.classList.contains('leaflet-map-pane')
      
      if (isMapBackground) {
        mapClickStartTime.current = Date.now()
        mapClickStartPos.current = {
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY,
        }
      }
    },
    click: (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.shiftKey || selectedEventId || simulationStatus === 'loading') {
        return
      }

      const target = e.originalEvent.target as HTMLElement
      const isMapBackground = target === map.getContainer() || 
                              target.classList.contains('leaflet-container') ||
                              target.classList.contains('leaflet-pane') ||
                              target.classList.contains('leaflet-map-pane')
      
      if (isMapBackground && mapClickStartPos.current) {
        const timeDiff = Date.now() - mapClickStartTime.current
        const isQuickClick = timeDiff < 200
        
        if (isQuickClick) {
          const moveDistance = Math.sqrt(
            Math.pow(e.originalEvent.clientX - mapClickStartPos.current.x, 2) +
            Math.pow(e.originalEvent.clientY - mapClickStartPos.current.y, 2)
          )
          
          if (moveDistance <= 5) {
            clearSelectedZones()
          }
        }
      }
    },
  })

  const handleFeatureClick = (feature: any, e: L.LeafletMouseEvent) => {
    if (selectedEventId || simulationStatus === 'loading') {
      return
    }

    const timeDiff = Date.now() - clickStartTime.current
    const isQuickClick = timeDiff < 200
    
    if (isQuickClick && clickStartPos.current) {
      const moveDistance = Math.sqrt(
        Math.pow(e.originalEvent.clientX - clickStartPos.current.x, 2) +
        Math.pow(e.originalEvent.clientY - clickStartPos.current.y, 2)
      )
      
      if (moveDistance > 5) {
        return
      }
    }

    const featureName = feature.properties.name
    if (featureName) {
      if (selectedZones.includes(featureName)) {
        removeSelectedZone(featureName)
      } else {
        addSelectedZone(featureName)
      }
    }
  }

  const getFeatureStyle = (feature: any): PathOptions => {
    const featureName = feature.properties.name
    const isSelected = featureName && selectedZones.includes(featureName)
    const eventMetrics = featureName ? zoneEventMetrics.get(featureName) : null

    let fillColor = '#808080'
    let fillOpacity = isSelected ? 0.30 : 0
    let strokeColor = isSelected ? '#FFFFFF' : '#606060'
    let strokeOpacity = isSelected ? 0.7 : 0.4

    if (eventMetrics) {
      const eventColor = getEventColor(eventMetrics.positivity, eventMetrics.severity)
      fillColor = eventColor
      fillOpacity = isSelected ? 0.35 : 0.12
      strokeColor = eventColor
      strokeOpacity = isSelected ? 0.85 : 0.65
    }

    return {
      fillColor,
      fillOpacity,
      color: strokeColor,
      weight: isSelected ? 1.5 : eventMetrics ? 1.0 : 0.8,
      opacity: strokeOpacity,
    }
  }

  if (isLoading || !neighborhoodsData) {
    return null
  }

  return (
    <>
      <GeoJSON
        key={`neighborhoods-${selectedZones.join(',')}-${selectedEventId}-${simulationStatus}-${eventNotifications.length}`}
        data={neighborhoodsData}
        style={getFeatureStyle}
        onEachFeature={(feature: Feature, layer: Layer) => {
          const pathElement = (layer as any)._path
          if (pathElement) {
            pathElement.style.transition = 'fill 0.4s ease-in-out, fill-opacity 0.4s ease-in-out, stroke 0.3s ease-in-out, stroke-width 0.3s ease-in-out, stroke-opacity 0.3s ease-in-out'
          }

          layer.on({
            mousedown: (e: L.LeafletMouseEvent) => {
              clickStartTime.current = Date.now()
              clickStartPos.current = {
                x: e.originalEvent.clientX,
                y: e.originalEvent.clientY,
              }
            },
            click: (e: L.LeafletMouseEvent) => {
              handleFeatureClick(feature, e)
            },
            mouseover: () => {
              const featureName = feature.properties?.name
              if (featureName) {
                setHoveredNeighborhood(featureName)
              }
            },
            mouseout: () => {
              setHoveredNeighborhood(null)
            },
          })
        }}
      />
      {!disabled && <DragSelection features={neighborhoodsData.features} />}
    </>
  )
}