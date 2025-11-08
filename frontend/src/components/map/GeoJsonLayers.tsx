import { useState, useEffect, useRef } from 'react'
import { GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import { DragSelection } from './DragSelection'
import type { PathOptions, Layer } from 'leaflet'
import type { Feature } from 'geojson'

interface GeoJSONData {
  type: string
  features: any[]
}

export function GeoJsonLayers() {
  const map = useMap()
  const { selectedZones, addSelectedZone, removeSelectedZone, clearSelectedZones } = useSimulationStore()
  const [neighborhoodsData, setNeighborhoodsData] = useState<GeoJSONData | null>(null)
  const clickStartTime = useRef<number>(0)
  const clickStartPos = useRef<{ x: number; y: number } | null>(null)
  const mapClickStartTime = useRef<number>(0)
  const mapClickStartPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const loadNeighborhoods = async () => {
      try {
        const response = await fetch('/geojson/neighborhoods.geojson')
        const data = await response.json()
        setNeighborhoodsData(data)
      } catch (error) {
        console.error('Failed to load neighborhoods data:', error)
      }
    }

    loadNeighborhoods()
  }, [])

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
      if (e.originalEvent.shiftKey) {
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
    const isSelected = featureId && selectedZones.includes(featureId.toString())
    
    return {
      fillColor: isSelected ? '#475569' : '#1e293b',
      fillOpacity: isSelected ? 0.4 : 0.15,
      color: isSelected ? '#64748b' : '#334155',
      weight: isSelected ? 2 : 0.5,
    }
  }

  return (
    <>
      {neighborhoodsData && (
        <>
          <GeoJSON
            key={`neighborhoods-${selectedZones.join(',')}`}
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
      )}
    </>
  )
}

