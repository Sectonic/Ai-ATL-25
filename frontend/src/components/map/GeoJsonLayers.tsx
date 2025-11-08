import { useRef, useMemo } from 'react'
import { GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import { DragSelection } from './DragSelection'
import { useNeighborhoods } from '../../services/geojsonApi'
import { hasEventsInNeighborhood } from '../../lib/eventNeighborhoodUtils'
import type { PathOptions, Layer } from 'leaflet'
import type { Feature } from 'geojson'

export function GeoJsonLayers() {
  const map = useMap()
  const { selectedZones, addSelectedZone, removeSelectedZone, clearSelectedZones, selectedEventId, simulationStatus, eventNotifications } = useSimulationStore()
  const { data: neighborhoodsData, isLoading } = useNeighborhoods()
  
  const selectedEventNeighborhoodId = useMemo(() => {
    if (!selectedEventId) return null
    const event = eventNotifications.find((e) => e.id === selectedEventId)
    return event?.zoneId || null
  }, [selectedEventId, eventNotifications])
  const clickStartTime = useRef<number>(0)
  const clickStartPos = useRef<{ x: number; y: number } | null>(null)
  const mapClickStartTime = useRef<number>(0)
  const mapClickStartPos = useRef<{ x: number; y: number } | null>(null)

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

    const featureId = feature.properties.OBJECTID_1 || feature.properties.OBJECTID || feature.properties.id || feature.properties.NAME
    if (featureId) {
      if (selectedZones.includes(featureId.toString())) {
        removeSelectedZone(featureId.toString())
      } else {
        addSelectedZone(featureId.toString())
      }
    }
  }

  const getFeatureStyle = (feature: any): PathOptions => {
    const featureId = feature.properties.OBJECTID_1 || feature.properties.OBJECTID || feature.properties.id || feature.properties.NAME
    const featureIdStr = featureId?.toString()
    const isSelected = featureIdStr && selectedZones.includes(featureIdStr)
    const hasEvents = featureIdStr && hasEventsInNeighborhood(eventNotifications, featureIdStr)
    const isSelectedEventNeighborhood = featureIdStr === selectedEventNeighborhoodId
    
    if (isSelectedEventNeighborhood) {
      return {
        fillColor: '#fbbf24',
        fillOpacity: 0.3,
        color: '#f59e0b',
        weight: 3,
      }
    }
    
    if (isSelected) {
      return {
        fillColor: '#475569',
        fillOpacity: 0.4,
        color: '#64748b',
        weight: 2,
      }
    }
    
    if (hasEvents) {
      return {
        fillColor: '#3b82f6',
        fillOpacity: 0.25,
        color: '#60a5fa',
        weight: 1.5,
      }
    }
    
    return {
      fillColor: '#1e293b',
      fillOpacity: 0.15,
      color: '#334155',
      weight: 0.5,
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
          })
        }}
      />
      <DragSelection features={neighborhoodsData.features} />
    </>
  )
}

