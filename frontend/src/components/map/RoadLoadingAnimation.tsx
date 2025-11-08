import { useEffect, useRef } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMartaBusRoutes, useMartaTrainRoutes } from '../../services/geojsonApi'
import type { PathOptions } from 'leaflet'

export function RoadLoadingAnimation() {
  const map = useMap()
  const { data: busRoutes, isLoading: busLoading } = useMartaBusRoutes()
  const { data: trainRoutes, isLoading: trainLoading } = useMartaTrainRoutes()
  const animationRef = useRef<number>()
  const progressRef = useRef<number>(0)
  const layersRef = useRef<Map<string, L.Layer>>(new Map())

  useEffect(() => {
    if (busLoading || trainLoading || !busRoutes || !trainRoutes) {
      return
    }

    const allRoutes = [...(busRoutes.features || []), ...(trainRoutes.features || [])]
    if (allRoutes.length === 0) {
      return
    }

    const animate = () => {
      progressRef.current = (progressRef.current + 0.015) % 1
      
      layersRef.current.forEach((layer, layerId) => {
        if (layer && (layer as any).setStyle) {
          const index = parseInt(layerId.split('-')[1] || '0')
          const offset = (index * 0.05) % 1
          const progress = (progressRef.current + offset) % 1
          
          const intensity = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5
          const pulseIntensity = Math.sin(progress * Math.PI * 4) * 0.3 + 0.7
          
          const dashArray = `${20 * pulseIntensity} ${10 * (1 - pulseIntensity)}`
          
          ;(layer as any).setStyle({
            opacity: 0.4 + intensity * 0.6,
            weight: 2 + intensity * 3,
            dashArray: dashArray,
          })
        }
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [map, busRoutes, trainRoutes, busLoading, trainLoading])

  if (busLoading || trainLoading || !busRoutes || !trainRoutes) {
    return null
  }

  const allRoutes = [...(busRoutes.features || []), ...(trainRoutes.features || [])]
  if (allRoutes.length === 0) {
    return null
  }

  const getRouteStyle = (feature: GeoJSON.Feature, index: number): PathOptions => {
    const routeColor = feature.properties?.route_color 
      ? `#${feature.properties.route_color}` 
      : '#3b82f6'
    
    const offset = (index * 0.05) % 1
    const progress = (progressRef.current + offset) % 1
    const intensity = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5
    
    return {
      color: routeColor,
      weight: 2 + intensity * 2,
      opacity: 0.4 + intensity * 0.6,
      fillOpacity: 0,
      dashArray: `${15 + intensity * 10} ${10 - intensity * 5}`,
    }
  }

  return (
    <>
      {allRoutes.slice(0, 200).map((feature, index) => (
        <GeoJSON
          key={`route-${index}`}
          data={feature as GeoJSON.Feature}
          style={(f) => getRouteStyle(f, index)}
          onEachFeature={(feature, layer) => {
            layersRef.current.set(`route-${index}`, layer)
          }}
        />
      ))}
    </>
  )
}

