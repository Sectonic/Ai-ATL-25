import { useEffect, useRef } from 'react'
import { useNeighborhoods } from '../services/geojsonApi'
import { useSimulationStore } from '../stores/simulationStore'
import type { ZoneData, NeighborhoodProperties } from '../stores/simulationStore'

const calculateTrafficFlow = (carDependence: number, densityIndex: number): number => {
  return Math.round(carDependence + (densityIndex * 100))
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

      const neighborhoodName = feature.properties.name
      
      if (!neighborhoodName) return

      if (initializedZonesRef.current.has(neighborhoodName)) return
      
      if (neighborhoodName in currentZoneData) return

      const props = feature.properties
      
      const properties: NeighborhoodProperties = {
        name: props.name,
        npu: props.npu || '',
        area_acres: props.area_acres || 0,
        population_total: props.population_total || 0,
        median_age: props.median_age || 0,
        population_density: props.population_density || 0,
        median_income: props.median_income || 0,
        median_home_value: props.median_home_value || 0,
        affordability_index: props.affordability_index || 0,
        housing_units: props.housing_units || 0,
        households: props.households || 0,
        vacant_units: props.vacant_units || 0,
        vacancy_rate: props.vacancy_rate || 0,
        owner_occupancy: props.owner_occupancy || 0,
        housing_density: props.housing_density || 0,
        education_distribution: props.education_distribution || {
          high_school_or_less: 0,
          some_college: 0,
          bachelors: 0,
          graduate: 0,
        },
        race_distribution: props.race_distribution || {
          white: 0,
          black: 0,
          asian: 0,
          mixed: 0,
          hispanic: 0,
        },
        diversity_index: props.diversity_index || 0,
        commute: props.commute || {
          avg_minutes: 0,
          car_dependence: 0,
          transit_usage: 0,
        },
        derived: props.derived || {
          higher_ed_percent: 0,
          density_index: 0,
        },
      }

      const zoneDataEntry: ZoneData = {
        zoneId: neighborhoodName,
        zoneName: neighborhoodName,
        population: Math.round(properties.population_total),
        housingUnits: Math.round(properties.housing_units),
        trafficFlow: calculateTrafficFlow(
          properties.commute.car_dependence,
          properties.derived.density_index
        ),
        economicIndex: calculateEconomicIndex(
          properties.median_home_value,
          properties.median_income
        ),
        properties,
      }

      updateZoneData(neighborhoodName, zoneDataEntry)
      initializedZonesRef.current.add(neighborhoodName)
    })
  }, [neighborhoodsData, isLoading, updateZoneData])
}

