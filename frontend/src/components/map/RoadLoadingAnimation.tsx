import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNeighborhoods } from '../../services/geojsonApi'
import { useSimulationStore } from '../../stores/simulationStore'

const ATLANTA_BOUNDS = {
  south: 33.60,
  north: 33.90,
  west: -84.75,
  east: -84.05,
}

const ATLANTA_CENTER_LNG = -84.3880
const MAX_NORTH_LAT = 33.85
const MIN_SOUTH_LAT = 33.70
const MAX_WEST_LNG = -84.55

interface PulsingNeighborhood {
  layer: L.GeoJSON
  paths: Array<L.Path>
  phase: number
}


const convertCoordinates = (coords: [number, number][]): [number, number][] => {
  return coords.map(coord => [coord[1], coord[0]])
}

const isWithinMappedArea = (path: [number, number][]): boolean => {
  if (path.length === 0) return false
  
  const coordsInBounds = path.filter(coord => {
    const [lat, lng] = coord
    return lat >= ATLANTA_BOUNDS.south &&
           lat <= ATLANTA_BOUNDS.north &&
           lng >= ATLANTA_BOUNDS.west &&
           lng <= ATLANTA_BOUNDS.east
  })
  
  return coordsInBounds.length > path.length * 0.5
}

const isWithinLatitudeBounds = (path: [number, number][]): boolean => {
  if (path.length === 0) return false
  
  const allCoordsInBounds = path.every(coord => {
    const [lat] = coord
    return lat >= MIN_SOUTH_LAT && lat <= MAX_NORTH_LAT
  })
  
  return allCoordsInBounds
}

const isWithinWestBoundary = (path: [number, number][]): boolean => {
  if (path.length === 0) return false
  
  const allCoordsInBounds = path.every(coord => {
    const [, lng] = coord
    return lng >= MAX_WEST_LNG
  })
  
  return allCoordsInBounds
}

const isOnLeftSide = (path: [number, number][]): boolean => {
  if (path.length === 0) return false
  const avgLng = path.reduce((sum, coord) => sum + coord[1], 0) / path.length
  return avgLng < ATLANTA_CENTER_LNG
}

const isNeighborhoodInBounds = (feature: any): boolean => {
  if (!feature.geometry || !feature.geometry.coordinates) return false
  
  const allCoords: Array<[number, number]> = []
  
  if (feature.geometry.type === 'Polygon') {
    feature.geometry.coordinates.forEach((ring: Array<Array<number>>) => {
      ring.forEach((coord: Array<number>) => {
        if (coord.length >= 2) {
          allCoords.push([coord[1], coord[0]])
        }
      })
    })
  } else if (feature.geometry.type === 'MultiPolygon') {
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
  
  if (allCoords.length === 0) return false
  
  const coordsInBounds = allCoords.filter(coord => {
    const [lat, lng] = coord
    return lat >= MIN_SOUTH_LAT &&
           lat <= MAX_NORTH_LAT &&
           lng >= MAX_WEST_LNG &&
           lng <= ATLANTA_BOUNDS.east
  })
  
  return coordsInBounds.length > allCoords.length * 0.5
}

export function RoadLoadingAnimation() {
  const map = useMap()
  const { simulationStatus } = useSimulationStore()
  const { data: neighborhoodsData, isLoading: neighborhoodsLoading } = useNeighborhoods()
  const animationRef = useRef<number | undefined>(undefined)
  const neighborhoodsRef = useRef<Array<PulsingNeighborhood>>([])
  const timeRef = useRef<number>(0)

  const isLoading = simulationStatus === 'loading'

  useEffect(() => {
    if (!isLoading) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      animationRef.current = undefined
      neighborhoodsRef.current.forEach(neighborhood => {
        map.removeLayer(neighborhood.layer)
      })
      neighborhoodsRef.current = []
      return
    }

    if (neighborhoodsLoading || !neighborhoodsData) {
      return
    }

    neighborhoodsRef.current.forEach(neighborhood => {
      map.removeLayer(neighborhood.layer)
    })
    neighborhoodsRef.current = []

    const neighborhoodsWithFemales = neighborhoodsData.features
      .map((feature, index) => {
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
        
        const avgLng = allCoords.length > 0 
          ? allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length
          : 0
        
        return {
          feature,
          index,
          femaleCount: (feature.properties?.gender_FEM as number) || 0,
          isLeftSide: avgLng < ATLANTA_CENTER_LNG,
        }
      })
      .filter(item => item.femaleCount > 0 && item.isLeftSide)
      .sort((a, b) => b.femaleCount - a.femaleCount)

    const topFemaleNeighborhoods = neighborhoodsWithFemales.slice(0, Math.ceil(neighborhoodsWithFemales.length * 0.2))

    topFemaleNeighborhoods.forEach((item, index) => {
      const paths: Array<L.Path> = []
      const geoJsonLayer = L.geoJSON(item.feature, {
        style: {
          fillColor: '#D3D3D3',
          fillOpacity: 0.01,
          color: '#D3D3D3',
          weight: 1,
          opacity: 0.01,
        },
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

      neighborhoodsRef.current.push({
        layer: geoJsonLayer,
        paths,
        phase: (index / topFemaleNeighborhoods.length) * Math.PI * 2,
      })
    })

    console.log('RoadLoadingAnimation: Created', neighborhoodsRef.current.length, 'neighborhoods')

    const animate = () => {
      timeRef.current += 0.01

      neighborhoodsRef.current.forEach((neighborhood) => {
        const pulse = (Math.sin(timeRef.current + neighborhood.phase) + 1) / 2
        const fillOpacity = 0.01 + pulse * 0.04
        const opacity = 0.01 + pulse * 0.06

        neighborhood.paths.forEach((path) => {
          path.setStyle({
            fillOpacity,
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
  }, [map, isLoading, neighborhoodsData, neighborhoodsLoading])

  return null
}

