import { GeoJSON, useMap } from 'react-leaflet'
import { useSimulationStore } from '../../stores/simulationStore'
import type { PathOptions } from 'leaflet'

const mockNeighborhoodGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { id: 'midtown', name: 'Midtown' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.3930, 33.7938],
          [-84.3730, 33.7938],
          [-84.3730, 33.7738],
          [-84.3930, 33.7738],
          [-84.3930, 33.7938],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'buckhead', name: 'Buckhead' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.3791, 33.8582],
          [-84.3591, 33.8582],
          [-84.3591, 33.8382],
          [-84.3791, 33.8382],
          [-84.3791, 33.8582],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'downtown', name: 'Downtown' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.4000, 33.7670],
          [-84.3800, 33.7670],
          [-84.3800, 33.7470],
          [-84.4000, 33.7470],
          [-84.4000, 33.7670],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'decatur', name: 'Decatur' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.3063, 33.7848],
          [-84.2863, 33.7848],
          [-84.2863, 33.7648],
          [-84.3063, 33.7648],
          [-84.3063, 33.7848],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'west-end', name: 'West End' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.4243, 33.7456],
          [-84.4043, 33.7456],
          [-84.4043, 33.7256],
          [-84.4243, 33.7256],
          [-84.4243, 33.7456],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'virginia-highland', name: 'Virginia Highland' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.3605, 33.7953],
          [-84.3405, 33.7953],
          [-84.3405, 33.7753],
          [-84.3605, 33.7753],
          [-84.3605, 33.7953],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'old-fourth-ward', name: 'Old Fourth Ward' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.3792, 33.7732],
          [-84.3592, 33.7732],
          [-84.3592, 33.7532],
          [-84.3792, 33.7532],
          [-84.3792, 33.7732],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { id: 'grant-park', name: 'Grant Park' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-84.3805, 33.7494],
          [-84.3605, 33.7494],
          [-84.3605, 33.7294],
          [-84.3805, 33.7294],
          [-84.3805, 33.7494],
        ]],
      },
    },
  ],
}

const mockBeltlineGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { id: 'beltline', name: 'Atlanta BeltLine' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-84.3880, 33.7900],
          [-84.3700, 33.7800],
          [-84.3600, 33.7600],
          [-84.3700, 33.7400],
          [-84.3900, 33.7300],
          [-84.4100, 33.7400],
          [-84.4200, 33.7600],
          [-84.4100, 33.7800],
          [-84.3880, 33.7900],
        ],
      },
    },
  ],
}

export function GeoJsonLayers() {
  const map = useMap()
  const { layerVisibility, selectedZones, addSelectedZone, removeSelectedZone } = useSimulationStore()

  const handleFeatureClick = (featureId: string) => {
    if (selectedZones.includes(featureId)) {
      removeSelectedZone(featureId)
    } else {
      addSelectedZone(featureId)
    }
  }

  const getNeighborhoodStyle = (feature: any): PathOptions => {
    const isSelected = selectedZones.includes(feature.properties.id)
    return {
      fillColor: isSelected ? '#3b82f6' : '#1e293b',
      fillOpacity: isSelected ? 0.3 : 0.1,
      color: isSelected ? '#60a5fa' : '#475569',
      weight: isSelected ? 3 : 1,
    }
  }

  const beltlineStyle: PathOptions = {
    color: '#22d3ee',
    weight: 3,
    opacity: 0.8,
  }

  const cityLimitsStyle: PathOptions = {
    fillColor: 'transparent',
    color: '#64748b',
    weight: 2,
    opacity: 0.6,
    dashArray: '5, 10',
  }

  return (
    <>
      {layerVisibility.neighborhoods && (
        <GeoJSON
          data={mockNeighborhoodGeoJSON}
          style={getNeighborhoodStyle}
          onEachFeature={(feature, layer) => {
            layer.on({
              click: () => handleFeatureClick(feature.properties.id),
            })
            layer.bindTooltip(feature.properties.name, {
              permanent: false,
              direction: 'center',
            })
          }}
        />
      )}
      {layerVisibility.beltline && (
        <GeoJSON
          data={mockBeltlineGeoJSON}
          style={beltlineStyle}
        />
      )}
      {layerVisibility.cityLimits && (
        <GeoJSON
          data={{
            type: 'Feature',
            properties: { name: 'City Limits' },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-84.55, 33.65],
                [-84.20, 33.65],
                [-84.20, 33.89],
                [-84.55, 33.89],
                [-84.55, 33.65],
              ]],
            },
          }}
          style={cityLimitsStyle}
        />
      )}
    </>
  )
}

