import { create } from 'zustand'

export type SimulationStatus = 'idle' | 'loading' | 'complete'

export interface Comment {
  id: string
  userName: string
  userInitials: string
  comment: string
  timestamp: number
}

export interface EventMetrics {
  zoneId: string
  zoneName: string
  population?: number
  populationChange?: number
  housingUnits?: number
  housingUnitsChange?: number
  trafficFlow?: number
  trafficFlowChange?: number
  economicIndex?: number
  economicIndexChange?: number
  averageIncome?: number
  averageIncomeChange?: number
  unemploymentRate?: number
  unemploymentRateChange?: number
  housingAffordabilityIndex?: number
  housingAffordabilityIndexChange?: number
  trafficCongestionIndex?: number
  trafficCongestionIndexChange?: number
  airQualityIndex?: number
  airQualityIndexChange?: number
  livabilityIndex?: number
  livabilityIndexChange?: number
}

export interface EventNotification {
  id: string
  zoneId: string
  zoneName: string
  type: string
  title: string
  description: string
  severity: number
  positivity: number
  coordinates: [number, number]
  comments: Comment[]
  metrics?: EventMetrics
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
  livability_index: number
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
  zoneMetrics: Record<string, EventMetrics>
  cityMetrics: EventMetrics
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
  updateMetricsFromEvent: (event: EventNotification) => void
  toggleLayerVisibility: (layer: keyof LayerVisibility) => void
  resetSimulation: () => void
}

const createEmptyMetrics = (zoneId: string, zoneName: string): EventMetrics => ({
  zoneId,
  zoneName,
})

export const useSimulationStore = create<SimulationState>((set) => ({
  simulationStatus: 'idle',
  selectedZones: [],
  eventNotifications: [],
  selectedEventId: null,
  previousMapView: null,
  promptText: '',
  simulationSummary: '',
  zoneMetrics: {},
  cityMetrics: createEmptyMetrics('city', 'Atlanta'),
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

  updateMetricsFromEvent: (event) =>
    set((state) => {
      if (!event.metrics) return state

      const metrics = event.metrics
      const updatedZoneMetrics = {
        ...state.zoneMetrics,
        [metrics.zoneId]: {
          ...state.zoneMetrics[metrics.zoneId],
          ...metrics,
        },
      }

      const updatedCityMetrics: EventMetrics = {
        ...state.cityMetrics,
        population: metrics.population !== undefined ? metrics.population : state.cityMetrics.population,
        populationChange: metrics.populationChange !== undefined ? metrics.populationChange : state.cityMetrics.populationChange,
        averageIncome: metrics.averageIncome !== undefined ? metrics.averageIncome : state.cityMetrics.averageIncome,
        averageIncomeChange: metrics.averageIncomeChange !== undefined ? metrics.averageIncomeChange : state.cityMetrics.averageIncomeChange,
        unemploymentRate: metrics.unemploymentRate !== undefined ? metrics.unemploymentRate : state.cityMetrics.unemploymentRate,
        unemploymentRateChange: metrics.unemploymentRateChange !== undefined ? metrics.unemploymentRateChange : state.cityMetrics.unemploymentRateChange,
        housingAffordabilityIndex: metrics.housingAffordabilityIndex !== undefined ? metrics.housingAffordabilityIndex : state.cityMetrics.housingAffordabilityIndex,
        housingAffordabilityIndexChange: metrics.housingAffordabilityIndexChange !== undefined ? metrics.housingAffordabilityIndexChange : state.cityMetrics.housingAffordabilityIndexChange,
        trafficCongestionIndex: metrics.trafficCongestionIndex !== undefined ? metrics.trafficCongestionIndex : state.cityMetrics.trafficCongestionIndex,
        trafficCongestionIndexChange: metrics.trafficCongestionIndexChange !== undefined ? metrics.trafficCongestionIndexChange : state.cityMetrics.trafficCongestionIndexChange,
        airQualityIndex: metrics.airQualityIndex !== undefined ? metrics.airQualityIndex : state.cityMetrics.airQualityIndex,
        airQualityIndexChange: metrics.airQualityIndexChange !== undefined ? metrics.airQualityIndexChange : state.cityMetrics.airQualityIndexChange,
        livabilityIndex: metrics.livabilityIndex !== undefined ? metrics.livabilityIndex : state.cityMetrics.livabilityIndex,
        livabilityIndexChange: metrics.livabilityIndexChange !== undefined ? metrics.livabilityIndexChange : state.cityMetrics.livabilityIndexChange,
      }

      return {
        zoneMetrics: updatedZoneMetrics,
        cityMetrics: updatedCityMetrics,
      }
    }),

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
      zoneMetrics: {},
      cityMetrics: createEmptyMetrics('city', 'Atlanta'),
    }),
}))
