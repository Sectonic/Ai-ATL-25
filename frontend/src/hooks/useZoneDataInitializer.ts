import { useEffect, useRef } from 'react'
import { useNeighborhoods } from '../services/geojsonApi'
import { useSimulationStore } from '../stores/simulationStore'
import type { ZoneData } from '../stores/simulationStore'

const calculateTrafficFlow = (population: number, area: number, commuteData: any): number => {
  if (area <= 0) return 0
  
  const density = population / area
  const baseTraffic = density * 0.5
  
  let commuteTraffic = 0
  if (commuteData) {
    const driveAlone = commuteData.commute_AC || 0
    const carpool = (commuteData.commute__1 || 0) + (commuteData.commute__2 || 0)
    const publicTransit = commuteData.commute__3 || 0
    const walk = commuteData.commute__4 || 0
    const other = (commuteData.commute__5 || 0) + (commuteData.commute__6 || 0)
    
    const totalCommuters = driveAlone + carpool + publicTransit + walk + other
    if (totalCommuters > 0) {
      const vehicleRatio = (driveAlone + carpool * 0.5) / totalCommuters
      commuteTraffic = vehicleRatio * 100
    }
  }
  
  return Math.round(baseTraffic + commuteTraffic)
}

const calculateEconomicIndex = (homeValue: number, income: number): number => {
  if (homeValue <= 0 && income <= 0) return 50
  
  const normalizedHomeValue = Math.min(Math.max(homeValue / 1000000, 0), 1) * 50
  const normalizedIncome = Math.min(Math.max(income / 200000, 0), 1) * 50
  return Math.round(normalizedHomeValue + normalizedIncome)
}

export function useZoneDataInitializer() {
  const { data: neighborhoodsData, isLoading } = useNeighborhoods()
  const { updateZoneData } = useSimulationStore()
  const initializedZonesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (isLoading || !neighborhoodsData) return

    const currentZoneData = useSimulationStore.getState().zoneData

    neighborhoodsData.features.forEach((feature) => {
      if (!feature.properties) return

      const zoneId = feature.properties.OBJECTID_1?.toString() || 
                     feature.properties.OBJECTID?.toString() || 
                     feature.properties.id?.toString()
      
      if (!zoneId) return

      if (initializedZonesRef.current.has(zoneId)) return
      
      if (zoneId in currentZoneData) return

      const props = feature.properties
      const population = props.populati_1 || props.population || 0
      const housingUnits = props.housinguni || 0
      const area = props.SQMILES || (props.ACRES ? props.ACRES / 640 : 0) || 0.1
      const homeValue = props.homevalue_ || props.homevalue || 0
      const income = props.householdi || 0
      
      const commuteData = {
        commute_AC: props.commute_AC || 0,
        commute__1: props.commute__1 || 0,
        commute__2: props.commute__2 || 0,
        commute__3: props.commute__3 || 0,
        commute__4: props.commute__4 || 0,
        commute__5: props.commute__5 || 0,
        commute__6: props.commute__6 || 0,
      }

      const zoneDataEntry: ZoneData = {
        zoneId,
        zoneName: props.NAME || `Zone ${zoneId}`,
        population: Math.round(population),
        housingUnits: Math.round(housingUnits),
        trafficFlow: calculateTrafficFlow(population, area, commuteData),
        economicIndex: calculateEconomicIndex(homeValue, income),
      }

      updateZoneData(zoneId, zoneDataEntry)
      initializedZonesRef.current.add(zoneId)
    })
  }, [neighborhoodsData, isLoading, updateZoneData])
}

