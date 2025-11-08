import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMartaBusRoutes, useMartaTrainRoutes } from '../../services/geojsonApi'

export function RoadLoadingAnimation() {
  const map = useMap()
  const { data: busRoutes, isLoading: busLoading } = useMartaBusRoutes()
  const { data: trainRoutes, isLoading: trainLoading } = useMartaTrainRoutes()
  const animationRef = useRef<number>()
  const progressRef = useRef<number>(0)
  const pulseRef = useRef<number>(0)
  const polylineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (busLoading || trainLoading || !busRoutes || !trainRoutes) {
      return
    }

    const allRoutes = [...(busRoutes.features || []), ...(trainRoutes.features || [])]
    if (allRoutes.length === 0) {
      return
    }

    const allCoordinates: [number, number][] = []
    
    allRoutes.slice(0, 150).forEach((feature) => {
      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates as [number, number][]
        allCoordinates.push(...coords)
      } else if (feature.geometry.type === 'MultiLineString') {
        feature.geometry.coordinates.forEach((line) => {
          allCoordinates.push(...(line as [number, number][]))
        })
      }
    })

    if (allCoordinates.length === 0) {
      return
    }

    const segmentLength = Math.max(50, Math.floor(allCoordinates.length * 0.1))
    
    const updatePolyline = () => {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
      }

      const startIndex = Math.floor(progressRef.current * (allCoordinates.length - segmentLength))
      const endIndex = Math.min(startIndex + segmentLength, allCoordinates.length)
      const segment = allCoordinates.slice(startIndex, endIndex)

      if (segment.length > 1) {
        const polyline = L.polyline(segment, {
          color: '#ef4444',
          weight: 2,
          opacity: 0.4,
          fillOpacity: 0,
        }).addTo(map)
        
        polylineRef.current = polyline
      }
    }

    updatePolyline()

    const animate = () => {
      progressRef.current = (progressRef.current + 0.003) % 1
      pulseRef.current = (pulseRef.current + 0.015) % 1
      
      const pulse = Math.sin(pulseRef.current * Math.PI * 2) * 0.08 + 0.92
      
      updatePolyline()
      
      if (polylineRef.current) {
        polylineRef.current.setStyle({
          opacity: 0.3 + pulse * 0.15,
          weight: 1.8 + pulse * 0.4,
        })
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
      }
    }
  }, [map, busRoutes, trainRoutes, busLoading, trainLoading])

  return null
}

