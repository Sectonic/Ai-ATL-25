import { create } from 'zustand'

export type SimulationStatus = 'idle' | 'loading' | 'complete'

export interface Comment {
  id: string
  userName: string
  userInitials: string
  comment: string
  timestamp: number
}

export interface EventNotification {
  id: string
  zoneId: string
  zoneName: string
  type: 'traffic' | 'housing' | 'population' | 'economic' | 'environmental'
  description: string
  severity: number
  positivity: number
  timestamp: number
  coordinates: [number, number]
  comments: Comment[]
}

export interface NeighborhoodProperties {
  name: string
  npu: string
  area_acres: number
  population_total: number
  median_age: number
  population_density: number
  median_income: number
  median_home_value: number
  affordability_index: number
  housing_units: number
  households: number
  vacant_units: number
  vacancy_rate: number
  owner_occupancy: number
  housing_density: number
  education_distribution: {
    high_school_or_less: number
    some_college: number
    bachelors: number
    graduate: number
  }
  race_distribution: {
    white: number
    black: number
    asian: number
    mixed: number
    hispanic: number
  }
  diversity_index: number
  commute: {
    avg_minutes: number
    car_dependence: number
    transit_usage: number
  }
  derived: {
    higher_ed_percent: number
    density_index: number
  }
}

export interface ZoneData {
  zoneId: string
  zoneName: string
  population: number
  populationChange?: number
  housingUnits: number
  housingUnitsChange?: number
  trafficFlow: number
  trafficFlowChange?: number
  economicIndex: number
  economicIndexChange?: number
  properties: NeighborhoodProperties
}

export interface CityMetrics {
  population: number
  populationChange?: number
  averageIncome: number
  averageIncomeChange?: number
  unemploymentRate: number
  unemploymentRateChange?: number
  housingAffordabilityIndex: number
  housingAffordabilityIndexChange?: number
  trafficCongestionIndex: number
  trafficCongestionIndexChange?: number
  airQualityIndex: number
  airQualityIndexChange?: number
  crimeRate: number
  crimeRateChange?: number
}

export interface LayerVisibility {
  buildings: boolean
  neighborhoods: boolean
  zoning: boolean
  councilDistricts: boolean
  policeZones: boolean
  publicProperty: boolean
  beltline: boolean
  cityLimits: boolean
  beltlineSubareas: boolean
}

interface MapView {
  center: [number, number]
  zoom: number
}

interface SimulationState {
  simulationStatus: SimulationStatus
  selectedZones: string[]
  eventNotifications: EventNotification[]
  selectedEventId: string | null
  previousMapView: MapView | null
  promptText: string
  simulationSummary: string
  zoneData: Record<string, ZoneData>
  cityMetrics: CityMetrics
  layerVisibility: LayerVisibility
  
  setSimulationStatus: (status: SimulationStatus) => void
  setPromptText: (text: string) => void
  setSimulationSummary: (summary: string) => void
  addSelectedZone: (zoneId: string) => void
  removeSelectedZone: (zoneId: string) => void
  clearSelectedZones: () => void
  setSelectedZones: (zones: string[]) => void
  addEventNotification: (event: EventNotification) => void
  clearEventNotifications: () => void
  setSelectedEventId: (id: string | null) => void
  setPreviousMapView: (view: MapView | null) => void
  updateZoneData: (zoneId: string, data: Partial<ZoneData>) => void
  updateCityMetrics: (metrics: Partial<CityMetrics>) => void
  toggleLayerVisibility: (layer: keyof LayerVisibility) => void
  resetSimulation: () => void
}

const computeCityMetrics = (zoneData: Record<string, ZoneData>): CityMetrics => {
  const zones = Object.values(zoneData)
  if (zones.length === 0) {
    return {
      population: 0,
      averageIncome: 0,
      unemploymentRate: 0,
      housingAffordabilityIndex: 0,
      trafficCongestionIndex: 0,
      airQualityIndex: 0,
      crimeRate: 0,
    }
  }

  const totalPopulation = zones.reduce((sum, z) => sum + z.population, 0)
  const totalIncome = zones.reduce((sum, z) => sum + (z.properties?.median_income || 0) * z.population, 0)
  const avgIncome = totalPopulation > 0 ? totalIncome / totalPopulation : 0
  
  const avgAffordability = zones.reduce((sum, z) => sum + (z.properties?.affordability_index || 0), 0) / zones.length
  const avgCarDependence = zones.reduce((sum, z) => sum + (z.properties?.commute?.car_dependence || 0), 0) / zones.length
  const avgDensityIndex = zones.reduce((sum, z) => sum + (z.properties?.derived?.density_index || 0), 0) / zones.length
  
  const trafficCongestion = Math.min(100, avgCarDependence + (avgDensityIndex * 100))
  const environmentalScore = Math.max(0, 100 - trafficCongestion)
  const airQuality = environmentalScore

  return {
    population: totalPopulation,
    averageIncome: Math.round(avgIncome),
    unemploymentRate: 0,
    housingAffordabilityIndex: Math.round(avgAffordability * 10),
    trafficCongestionIndex: Math.round(trafficCongestion),
    airQualityIndex: Math.round(airQuality),
    crimeRate: 0,
  }
}

export const useSimulationStore = create<SimulationState>((set) => ({
  simulationStatus: 'idle',
  selectedZones: [],
  eventNotifications: [],
  selectedEventId: null,
  previousMapView: null,
  promptText: '',
  simulationSummary: '',
  zoneData: {},
  cityMetrics: computeCityMetrics({}),
  layerVisibility: {
    buildings: false,
    neighborhoods: true,
    zoning: false,
    councilDistricts: false,
    policeZones: false,
    publicProperty: false,
    beltline: true,
    cityLimits: true,
    beltlineSubareas: false,
  },
  
  setSimulationStatus: (status) => set({ simulationStatus: status }),
  
  setPromptText: (text) => set({ promptText: text }),
  
  setSimulationSummary: (summary) => set({ simulationSummary: summary }),
  
  addSelectedZone: (zoneId) =>
    set((state) => ({
      selectedZones: state.selectedZones.includes(zoneId)
        ? state.selectedZones
        : [...state.selectedZones, zoneId],
    })),
  
  removeSelectedZone: (zoneId) =>
    set((state) => ({
      selectedZones: state.selectedZones.filter((id) => id !== zoneId),
    })),
  
  clearSelectedZones: () => set({ selectedZones: [] }),
  
  setSelectedZones: (zones) => set({ selectedZones: zones }),
  
  addEventNotification: (event) =>
    set((state) => ({
      eventNotifications: [...state.eventNotifications, event],
    })),
  
  clearEventNotifications: () => set({ eventNotifications: [] }),
  
  setSelectedEventId: (id) => set((state) => ({ 
    selectedEventId: id,
    selectedZones: id ? [] : state.selectedZones, 
  })),
  
  setPreviousMapView: (view) => set({ previousMapView: view }),
  
  updateZoneData: (zoneId, data) =>
    set((state) => {
      const updatedZoneData = {
        ...state.zoneData,
        [zoneId]: {
          ...state.zoneData[zoneId],
          ...data,
        },
      }
      return {
        zoneData: updatedZoneData,
        cityMetrics: computeCityMetrics(updatedZoneData),
      }
    }),
  
  updateCityMetrics: (metrics) =>
    set((state) => ({
      cityMetrics: {
        ...state.cityMetrics,
        ...metrics,
      },
    })),
  
  toggleLayerVisibility: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),
  
  resetSimulation: () =>
    set({
      simulationStatus: 'idle',
      selectedZones: [],
      promptText: '',
      simulationSummary: '',
      eventNotifications: [],
      selectedEventId: null,
      previousMapView: null,
      zoneData: {},
      cityMetrics: computeCityMetrics({}),
    }),
}))

