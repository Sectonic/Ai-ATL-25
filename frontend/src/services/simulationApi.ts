import type { EventNotification, NeighborhoodProperties } from '../stores/simulationStore'

export type SimulationChunk =
  | { type: 'event'; data: EventNotification }
  | { type: 'update'; data: { total: number } }
  | { type: 'complete'; data: { summary: string } }

const BACKEND_URL = 'http://localhost:8080/api/simulate'

export interface MinimalNeighborhoodContext {
  name: string
  baseline_description?: string
  current_events?: string[]
  neighboring_neighborhoods?: string[]
}

export function buildMinimalNeighborhoodContext(
  selectedZones: string[],
  neighborhoodsData: GeoJSON.FeatureCollection
): MinimalNeighborhoodContext[] {
  const zonesToProcess = selectedZones.length === 0
    ? neighborhoodsData.features.map((f) => f.properties?.name).filter(Boolean) as string[]
    : selectedZones

  return zonesToProcess
    .map((neighborhoodName) => {
      const feature = neighborhoodsData.features.find(
        (f) => f.properties?.name === neighborhoodName
      )

      if (!feature || !feature.properties) return null

      const props = feature.properties

      return {
        name: props.name || '',
        baseline_description: props.baseline_description,
        current_events: props.current_events,
        neighboring_neighborhoods: props.neighboring_neighborhoods,
      }
    })
    .filter((ctx) => ctx !== null) as MinimalNeighborhoodContext[]
}

export function buildNeighborhoodProperties(
  selectedZones: string[],
  neighborhoodsData: GeoJSON.FeatureCollection
): NeighborhoodProperties[] {
  const zonesToProcess = selectedZones.length === 0
    ? neighborhoodsData.features.map((f) => f.properties?.name).filter(Boolean) as string[]
    : selectedZones

  return zonesToProcess
    .map((neighborhoodName) => {
      const feature = neighborhoodsData.features.find(
        (f) => f.properties?.name === neighborhoodName
      )

      if (!feature || !feature.properties) return null

      const props = feature.properties

      return {
        name: props.name || '',
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
        education_distribution: {
          high_school_or_less: props.education_distribution?.high_school_or_less || 0,
          some_college: props.education_distribution?.some_college || 0,
          bachelors: props.education_distribution?.bachelors || 0,
          graduate: props.education_distribution?.graduate || 0,
        },
        race_distribution: {
          white: props.race_distribution?.white || 0,
          black: props.race_distribution?.black || 0,
          asian: props.race_distribution?.asian || 0,
          mixed: props.race_distribution?.mixed || 0,
          hispanic: props.race_distribution?.hispanic || 0,
        },
        diversity_index: props.diversity_index || 0,
        livability_index: props.livability_index || 0,
        commute: {
          avg_minutes: props.commute?.avg_minutes || 0,
          car_dependence: props.commute?.car_dependence || 0,
          transit_usage: props.commute?.transit_usage || 0,
        },
        derived: {
          higher_ed_percent: props.derived?.higher_ed_percent || 0,
          density_index: props.derived?.density_index || 0,
        },
        baseline_description: props.baseline_description,
        current_events: props.current_events,
        neighboring_neighborhoods: props.neighboring_neighborhoods,
      }
    })
    .filter((props) => props !== null) as NeighborhoodProperties[]
}

export async function* simulatePolicy(
  prompt: string,
  selectedZones: string[],
  neighborhoodsData: GeoJSON.FeatureCollection
): AsyncGenerator<SimulationChunk> {
  const neighborhoodContext = buildMinimalNeighborhoodContext(selectedZones, neighborhoodsData)
  const neighborhoodProperties = buildNeighborhoodProperties(selectedZones, neighborhoodsData)

  const zonesToSend = selectedZones.length === 0
    ? neighborhoodContext.map((ctx) => ctx.name)
    : selectedZones

  const payload = {
    prompt,
    selectedZones: zonesToSend,
    neighborhoodContext,
    neighborhoodProperties,
  }

  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  console.log('Backend response status:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Could not read error message')
    console.error('Backend error response:', errorText)
    throw new Error(`Backend error: ${response.status} ${response.statusText}\n${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() === '') continue

        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)

          try {
            const chunk = JSON.parse(jsonStr) as SimulationChunk

            if (chunk.type === 'event') {
              yield {
                type: 'event',
                data: {
                  ...chunk.data,
                  comments: [],
                },
              }
            } else if (chunk.type === 'update') {
              yield chunk
            } else if (chunk.type === 'complete') {
              yield chunk
            }
          } catch (e) {
            console.error('Failed to parse SSE chunk:', e, jsonStr)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
