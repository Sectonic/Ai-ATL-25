import { create } from 'zustand'

export type SimulationStatus = 'idle' | 'loading' | 'complete'

export interface Comment {
  id: string
  userName: string
  userInitials: string
  comment: string
  timestamp: number
}

export type NeighborhoodMetrics = Partial<NeighborhoodProperties> & {
  zoneId: string
  zoneName: string
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
  metrics?: NeighborhoodMetrics
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
  baseline_description?: string
  current_events?: string[]
  neighboring_neighborhoods?: string[]
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
  originalNeighborhoodData: Record<string, NeighborhoodProperties>
  simulatedNeighborhoodData: Record<string, NeighborhoodProperties>
  neighborhoodDeltas: Record<string, Partial<NeighborhoodProperties>>
  layerVisibility: LayerVisibility
  zonesAnalyzing: number | null

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
  initializeSimulationData: (neighborhoods: Record<string, NeighborhoodProperties>) => void
  updateMetricsFromEvent: (event: EventNotification) => void
  calculateDeltas: () => void
  toggleLayerVisibility: (layer: keyof LayerVisibility) => void
  setZonesAnalyzing: (count: number | null) => void
  resetSimulation: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  simulationStatus: 'idle',
  selectedZones: [],
  eventNotifications: [],
  selectedEventId: null,
  previousMapView: null,
  promptText: '',
  simulationSummary: '',
  originalNeighborhoodData: {},
  simulatedNeighborhoodData: {},
  neighborhoodDeltas: {},
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
  zonesAnalyzing: null,

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

  initializeSimulationData: (neighborhoods) =>
    set({
      originalNeighborhoodData: neighborhoods,
      simulatedNeighborhoodData: JSON.parse(JSON.stringify(neighborhoods)),
      neighborhoodDeltas: {},
    }),

  updateMetricsFromEvent: (event) =>
    set((state) => {
      if (!event.metrics) return state

      const metrics = event.metrics
      const zoneId = metrics.zoneId

      if (!state.simulatedNeighborhoodData[zoneId]) {
        return state
      }

      const currentSimulated = state.simulatedNeighborhoodData[zoneId]
      const updatedSimulated: NeighborhoodProperties = {
        ...currentSimulated,
        ...(metrics.population_total !== undefined && { population_total: metrics.population_total }),
        ...(metrics.median_age !== undefined && { median_age: metrics.median_age }),
        ...(metrics.population_density !== undefined && { population_density: metrics.population_density }),
        ...(metrics.median_income !== undefined && { median_income: metrics.median_income }),
        ...(metrics.median_home_value !== undefined && { median_home_value: metrics.median_home_value }),
        ...(metrics.affordability_index !== undefined && { affordability_index: metrics.affordability_index }),
        ...(metrics.housing_units !== undefined && { housing_units: metrics.housing_units }),
        ...(metrics.households !== undefined && { households: metrics.households }),
        ...(metrics.vacant_units !== undefined && { vacant_units: metrics.vacant_units }),
        ...(metrics.vacancy_rate !== undefined && { vacancy_rate: metrics.vacancy_rate }),
        ...(metrics.owner_occupancy !== undefined && { owner_occupancy: metrics.owner_occupancy }),
        ...(metrics.housing_density !== undefined && { housing_density: metrics.housing_density }),
        ...(metrics.education_distribution !== undefined && { education_distribution: metrics.education_distribution }),
        ...(metrics.race_distribution !== undefined && { race_distribution: metrics.race_distribution }),
        ...(metrics.diversity_index !== undefined && { diversity_index: metrics.diversity_index }),
        ...(metrics.livability_index !== undefined && { livability_index: metrics.livability_index }),
        ...(metrics.commute !== undefined && { commute: metrics.commute }),
        ...(metrics.derived !== undefined && { derived: metrics.derived }),
      }

      return {
        simulatedNeighborhoodData: {
          ...state.simulatedNeighborhoodData,
          [zoneId]: updatedSimulated,
        },
      }
    }),

  calculateDeltas: () =>
    set((state) => {
      const deltas: Record<string, Partial<NeighborhoodProperties>> = {}

      for (const [zoneId, simulated] of Object.entries(state.simulatedNeighborhoodData)) {
        const original = state.originalNeighborhoodData[zoneId]
        if (!original) continue

        const delta: Partial<NeighborhoodProperties> = {}

        if (simulated.population_total !== original.population_total) {
          delta.population_total = simulated.population_total - original.population_total
        }
        if (simulated.median_age !== original.median_age) {
          delta.median_age = simulated.median_age - original.median_age
        }
        if (simulated.population_density !== original.population_density) {
          delta.population_density = simulated.population_density - original.population_density
        }
        if (simulated.median_income !== original.median_income) {
          delta.median_income = simulated.median_income - original.median_income
        }
        if (simulated.median_home_value !== original.median_home_value) {
          delta.median_home_value = simulated.median_home_value - original.median_home_value
        }
        if (simulated.affordability_index !== original.affordability_index) {
          delta.affordability_index = simulated.affordability_index - original.affordability_index
        }
        if (simulated.housing_units !== original.housing_units) {
          delta.housing_units = simulated.housing_units - original.housing_units
        }
        if (simulated.households !== original.households) {
          delta.households = simulated.households - original.households
        }
        if (simulated.vacant_units !== original.vacant_units) {
          delta.vacant_units = simulated.vacant_units - original.vacant_units
        }
        if (simulated.vacancy_rate !== original.vacancy_rate) {
          delta.vacancy_rate = simulated.vacancy_rate - original.vacancy_rate
        }
        if (simulated.owner_occupancy !== original.owner_occupancy) {
          delta.owner_occupancy = simulated.owner_occupancy - original.owner_occupancy
        }
        if (simulated.housing_density !== original.housing_density) {
          delta.housing_density = simulated.housing_density - original.housing_density
        }
        if (simulated.diversity_index !== original.diversity_index) {
          delta.diversity_index = simulated.diversity_index - original.diversity_index
        }
        if (simulated.livability_index !== original.livability_index) {
          delta.livability_index = simulated.livability_index - original.livability_index
        }

        if (simulated.education_distribution) {
          const eduChanged =
            simulated.education_distribution.high_school_or_less !== original.education_distribution.high_school_or_less ||
            simulated.education_distribution.some_college !== original.education_distribution.some_college ||
            simulated.education_distribution.bachelors !== original.education_distribution.bachelors ||
            simulated.education_distribution.graduate !== original.education_distribution.graduate

          if (eduChanged) {
            delta.education_distribution = {
              high_school_or_less: simulated.education_distribution.high_school_or_less - original.education_distribution.high_school_or_less,
              some_college: simulated.education_distribution.some_college - original.education_distribution.some_college,
              bachelors: simulated.education_distribution.bachelors - original.education_distribution.bachelors,
              graduate: simulated.education_distribution.graduate - original.education_distribution.graduate,
            }
          }
        }

        if (simulated.race_distribution) {
          const raceChanged =
            simulated.race_distribution.white !== original.race_distribution.white ||
            simulated.race_distribution.black !== original.race_distribution.black ||
            simulated.race_distribution.asian !== original.race_distribution.asian ||
            simulated.race_distribution.mixed !== original.race_distribution.mixed ||
            simulated.race_distribution.hispanic !== original.race_distribution.hispanic

          if (raceChanged) {
            delta.race_distribution = {
              white: simulated.race_distribution.white - original.race_distribution.white,
              black: simulated.race_distribution.black - original.race_distribution.black,
              asian: simulated.race_distribution.asian - original.race_distribution.asian,
              mixed: simulated.race_distribution.mixed - original.race_distribution.mixed,
              hispanic: simulated.race_distribution.hispanic - original.race_distribution.hispanic,
            }
          }
        }

        if (simulated.commute) {
          const commuteChanged =
            simulated.commute.avg_minutes !== original.commute.avg_minutes ||
            simulated.commute.car_dependence !== original.commute.car_dependence ||
            simulated.commute.transit_usage !== original.commute.transit_usage

          if (commuteChanged) {
            delta.commute = {
              avg_minutes: simulated.commute.avg_minutes - original.commute.avg_minutes,
              car_dependence: simulated.commute.car_dependence - original.commute.car_dependence,
              transit_usage: simulated.commute.transit_usage - original.commute.transit_usage,
            }
          }
        }

        if (simulated.derived) {
          const derivedChanged =
            simulated.derived.higher_ed_percent !== original.derived.higher_ed_percent ||
            simulated.derived.density_index !== original.derived.density_index

          if (derivedChanged) {
            delta.derived = {
              higher_ed_percent: simulated.derived.higher_ed_percent - original.derived.higher_ed_percent,
              density_index: simulated.derived.density_index - original.derived.density_index,
            }
          }
        }

        if (Object.keys(delta).length > 0) {
          deltas[zoneId] = delta
        }
      }

      return { neighborhoodDeltas: deltas }
    }),

  toggleLayerVisibility: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),

  setZonesAnalyzing: (count) => set({ zonesAnalyzing: count }),

  resetSimulation: () =>
    set({
      simulationStatus: 'idle',
      selectedZones: [],
      promptText: '',
      simulationSummary: '',
      eventNotifications: [],
      selectedEventId: null,
      previousMapView: null,
      simulatedNeighborhoodData: {},
      neighborhoodDeltas: {},
      zonesAnalyzing: null,
    }),
}))
