import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNeighborhoods } from '../../services/geojsonApi'

interface PulsingNeighborhood {
  layer: L.GeoJSON
  paths: Array<L.Path>
  phase: number
}

export function LoadingAnimation() {
  const map = useMap()
  const { data: neighborhoodsData, isLoading: neighborhoodsLoading } = useNeighborhoods()
  const animationRef = useRef<number | undefined>(undefined)
  const neighborhoodsRef = useRef<Array<PulsingNeighborhood>>([])
  const timeRef = useRef<number>(0)

  useEffect(() => {
    if (neighborhoodsLoading || !neighborhoodsData) {
      return
    }

    neighborhoodsRef.current.forEach(neighborhood => {
      map.removeLayer(neighborhood.layer)
    })
    neighborhoodsRef.current = []

    const featuresWithCenters = neighborhoodsData.features.map((feature) => {
      const allCoords: Array<[number, number]> = []
      
      if (feature.geometry && feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach((ring: Array<Array<number>>) => {
          ring.forEach((coord: Array<number>) => {
            if (coord.length >= 2) {
              allCoords.push([coord[1], coord[0]])
            }
          })
        })
      } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: Array<Array<Array<number>>>) => {
          polygon.forEach((ring: Array<Array<number>>) => {
            ring.forEach((coord: Array<number>) => {
              if (coord.length >= 2) {
                allCoords.push([coord[1], coord[0]])
              }
            })
          })
        })
      }
      
      const centerLng = allCoords.length > 0 
        ? allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length
        : 0
      
      return {
        feature,
        centerLng,
      }
    })

    const minLng = Math.min(...featuresWithCenters.map(f => f.centerLng))
    const maxLng = Math.max(...featuresWithCenters.map(f => f.centerLng))
    const lngRange = maxLng - minLng

    featuresWithCenters.forEach(({ feature, centerLng }) => {
      const paths: Array<L.Path> = []
      const geoJsonLayer = L.geoJSON(feature, {
        style: {
          fillColor: 'transparent',
          fillOpacity: 0,
          color: '#FFFFFF',
          weight: 1.5,
          opacity: 0,
        },
        interactive: false,
        onEachFeature: (_feat, pathLayer) => {
          if (pathLayer instanceof L.Path) {
            paths.push(pathLayer)
          }
        },
      }).addTo(map)

      geoJsonLayer.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Path && !paths.includes(layer)) {
          paths.push(layer)
        }
      })

      const normalizedPosition = (centerLng - minLng) / lngRange
      const phase = normalizedPosition * Math.PI * 4

      neighborhoodsRef.current.push({
        layer: geoJsonLayer,
        paths,
        phase,
      })
    })

    const animate = () => {
      timeRef.current += 0.075

      neighborhoodsRef.current.forEach((neighborhood) => {
        const pulse = (Math.sin(timeRef.current - neighborhood.phase) + 1) / 2
        const smoothPulse = pulse * pulse * (3 - 2 * pulse)
        const opacity = smoothPulse * 0.15

        neighborhood.paths.forEach((path) => {
          path.setStyle({
            fillOpacity: 0,
            opacity,
          })
        })
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      neighborhoodsRef.current.forEach(neighborhood => {
        map.removeLayer(neighborhood.layer)
      })
      neighborhoodsRef.current = []
    }
  }, [map, neighborhoodsData, neighborhoodsLoading])

  return null
}