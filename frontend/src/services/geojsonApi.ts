import { useQuery } from '@tanstack/react-query'

const fetchGeoJSON = async (path: string): Promise<GeoJSON.FeatureCollection> => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON from ${path}`)
  }
  return response.json()
}

export const useNeighborhoods = () => {
  return useQuery({
    queryKey: ['geojson', 'neighborhoods'],
    queryFn: () => fetchGeoJSON('/geojson/neighborhoods.geojson'),
  })
}

export const useNeighborhoodsMask = () => {
  return useQuery({
    queryKey: ['geojson', 'neighborhoodsMask'],
    queryFn: () => fetchGeoJSON('/geojson/neighborhoodsMask.geojson'),
  })
}

