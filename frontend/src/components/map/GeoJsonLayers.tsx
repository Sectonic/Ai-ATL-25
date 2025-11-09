import { useRef } from 'react'
import { GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import { useNeighborhoods } from '../../services/geojsonApi'
import { DragSelection } from './DragSelection'
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
    setHoveredNeighborhood
  } = useSimulationStore()
  const { data: neighborhoodsData, isLoading } = useNeighborhoods()
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
    
    return {
      fillColor: '#808080',
      fillOpacity: isSelected ? 0.30 : 0,
      color: isSelected ? '#FFFFFF' : '#606060',
      weight: isSelected ? 1.5 : 0.8,
      opacity: isSelected ? 0.7 : 0.4,
    }
  }

  if (isLoading || !neighborhoodsData) {
    return null
  }

  return (
    <>
      <GeoJSON
        key={`neighborhoods-${selectedZones.join(',')}-${selectedEventId}-${simulationStatus}`}
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