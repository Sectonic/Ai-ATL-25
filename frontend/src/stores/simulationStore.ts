import { create } from 'zustand'

export type SimulationStatus = 'idle' | 'loading' | 'complete'

export interface EventNotification {
  id: string
  zoneId: string
  zoneName: string
  type: 'traffic' | 'housing' | 'population' | 'economic' | 'environmental'
  description: string
  severity: 'low' | 'medium' | 'high'
  timestamp: number
  coordinates: [number, number]
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

interface SimulationState {
  simulationStatus: SimulationStatus
  selectedZones: string[]
  eventNotifications: EventNotification[]
  promptText: string
  processedPrompt: string
  zoneData: Record<string, ZoneData>
  cityMetrics: CityMetrics
  layerVisibility: LayerVisibility
  
  setSimulationStatus: (status: SimulationStatus) => void
  setPromptText: (text: string) => void
  setProcessedPrompt: (text: string) => void
  addSelectedZone: (zoneId: string) => void
  removeSelectedZone: (zoneId: string) => void
  clearSelectedZones: () => void
  setSelectedZones: (zones: string[]) => void
  addEventNotification: (event: EventNotification) => void
  clearEventNotifications: () => void
  updateZoneData: (zoneId: string, data: Partial<ZoneData>) => void
  updateCityMetrics: (metrics: Partial<CityMetrics>) => void
  toggleLayerVisibility: (layer: keyof LayerVisibility) => void
  resetSimulation: () => void
}

const initialCityMetrics: CityMetrics = {
  population: 498715,
  averageIncome: 68500,
  unemploymentRate: 3.8,
  housingAffordabilityIndex: 72,
  trafficCongestionIndex: 68,
  airQualityIndex: 85,
  crimeRate: 4.2,
}

export const useSimulationStore = create<SimulationState>((set) => ({
  simulationStatus: 'idle',
  selectedZones: [],
  eventNotifications: [],
  promptText: '',
  processedPrompt: '',
  zoneData: {},
  cityMetrics: initialCityMetrics,
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
  
  setProcessedPrompt: (text) => set({ processedPrompt: text }),
  
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
  
  updateZoneData: (zoneId, data) =>
    set((state) => ({
      zoneData: {
        ...state.zoneData,
        [zoneId]: {
          ...state.zoneData[zoneId],
          ...data,
        },
      },
    })),
  
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
      processedPrompt: '',
      eventNotifications: [],
      zoneData: {},
      cityMetrics: initialCityMetrics,
    }),
}))

