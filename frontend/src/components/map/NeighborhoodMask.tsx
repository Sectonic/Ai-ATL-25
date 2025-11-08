import { GeoJSON } from 'react-leaflet'
import type { PathOptions } from 'leaflet'
import { useNeighborhoodsMask } from '../../services/geojsonApi'

export function NeighborhoodMask() {
  const { data: maskData, isLoading } = useNeighborhoodsMask()

  const maskStyle: PathOptions = {
    fillColor: '#000000',
    fillOpacity: 0.7,
    color: 'transparent',
    weight: 0,
    interactive: false,
  }

  if (isLoading || !maskData) {
    return null
  }

  return (
    <GeoJSON
      data={maskData}
      style={maskStyle}
      pane="overlayPane"
    />
  )
}

