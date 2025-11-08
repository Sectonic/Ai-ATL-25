import type { EventNotification, ZoneData, CityMetrics, Comment, NeighborhoodProperties } from '../stores/simulationStore'

export type SimulationChunk =
  | { type: 'event'; data: EventNotification }
  | { type: 'zoneUpdate'; data: ZoneData }
  | { type: 'metricsUpdate'; data: Partial<CityMetrics> }
  | { type: 'complete'; data: { summary: string } }

const BACKEND_URL = 'http://localhost:8080/api/simulate'

const fakeUsers = [
  { name: 'Sarah Chen', initials: 'SC' },
  { name: 'Marcus Johnson', initials: 'MJ' },
  { name: 'Emily Rodriguez', initials: 'ER' },
  { name: 'David Kim', initials: 'DK' },
  { name: 'Jessica Williams', initials: 'JW' },
  { name: 'Michael Brown', initials: 'MB' },
  { name: 'Amanda Taylor', initials: 'AT' },
  { name: 'James Wilson', initials: 'JW' },
  { name: 'Lisa Anderson', initials: 'LA' },
  { name: 'Robert Martinez', initials: 'RM' },
]

const commentTemplates = {
  traffic: {
    positive: [
      'This is great! Traffic has been so much better lately.',
      'Finally some relief from the congestion. Thank you!',
      'Love seeing improvements to our transportation system.',
    ],
    negative: [
      'This made traffic worse, not better. What were they thinking?',
      'The construction is a nightmare. When will it end?',
      'This is going to cause more problems than it solves.',
    ],
    neutral: [
      'Interesting approach. Will be watching how this develops.',
      'Curious to see the long-term impact of this change.',
      'Hope they considered all the side effects.',
    ],
  },
  housing: {
    positive: [
      'More housing is exactly what we need!',
      'This will help with affordability. Great move!',
      'Finally addressing the housing crisis. About time!',
    ],
    negative: [
      'This is going to destroy the character of our neighborhood.',
      'Too many units, not enough infrastructure.',
      'Gentrification at its finest. Disappointing.',
    ],
    neutral: [
      'Need to see more details before forming an opinion.',
      'Housing is complex. Hope they got this right.',
      'Mixed feelings about this one.',
    ],
  },
  population: {
    positive: [
      'Growth is good for the city!',
      'More people means more opportunities.',
      'Excited to see our community grow.',
    ],
    negative: [
      'Too many people moving in. Infrastructure can\'t handle it.',
      'This is going to change everything. Not sure if that\'s good.',
      'Population growth without planning is dangerous.',
    ],
    neutral: [
      'Population changes are inevitable. Hope it\'s managed well.',
      'Interesting demographic shift happening.',
      'Time will tell if this is sustainable.',
    ],
  },
  economic: {
    positive: [
      'Economic growth benefits everyone!',
      'This is exactly what our area needed.',
      'Great to see investment in our community.',
    ],
    negative: [
      'Who benefits from this? Not the average person.',
      'Economic growth for whom? The rich get richer.',
      'This will drive up costs for everyone else.',
    ],
    neutral: [
      'Economic impacts are complex. Need more data.',
      'Hope the benefits are distributed fairly.',
      'Interesting economic development strategy.',
    ],
  },
  environmental: {
    positive: [
      'Finally prioritizing the environment!',
      'This is a step in the right direction.',
      'Love seeing green initiatives in our city.',
    ],
    negative: [
      'Not enough. We need more aggressive action.',
      'This is greenwashing. Real change needed.',
      'Too little too late.',
    ],
    neutral: [
      'Environmental issues are complex. Every bit helps.',
      'Hope this has meaningful impact.',
      'Good start, but more work needed.',
    ],
  },
}

function generateComments(eventType: EventNotification['type'], positivity: number): Comment[] {
  const templates = commentTemplates[eventType]
  const commentCount = Math.floor(Math.random() * 3) + 3

  const comments: Comment[] = []
  const usedUsers = new Set<number>()

  for (let i = 0; i < commentCount; i++) {
    let userIndex
    do {
      userIndex = Math.floor(Math.random() * fakeUsers.length)
    } while (usedUsers.has(userIndex) && usedUsers.size < fakeUsers.length)
    usedUsers.add(userIndex)

    const user = fakeUsers[userIndex]
    const sentiment = positivity < -0.3
      ? (Math.random() > 0.3 ? 'negative' : 'neutral')
      : positivity > 0.3
        ? (Math.random() > 0.3 ? 'positive' : 'neutral')
        : (Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral')

    const templatePool = templates[sentiment as keyof typeof templates]
    const commentText = templatePool[Math.floor(Math.random() * templatePool.length)]

    comments.push({
      id: `comment-${Date.now()}-${i}`,
      userName: user.name,
      userInitials: user.initials,
      comment: commentText,
      timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    })
  }

  return comments.sort((a, b) => a.timestamp - b.timestamp)
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
      }
    })
    .filter((props): props is NeighborhoodProperties => props !== null)
}

export async function* simulatePolicy(
  prompt: string,
  cityMetrics: CityMetrics,
  selectedZones: string[],
  neighborhoodsData: GeoJSON.FeatureCollection
): AsyncGenerator<SimulationChunk> {
  const neighborhoodProperties = buildNeighborhoodProperties(selectedZones, neighborhoodsData)

  const zonesToSend = selectedZones.length === 0
    ? neighborhoodProperties.map((props) => props.name)
    : selectedZones

  const payload = {
    prompt,
    cityMetrics: {
      population: cityMetrics.population,
      averageIncome: cityMetrics.averageIncome,
      unemploymentRate: cityMetrics.unemploymentRate,
      housingAffordabilityIndex: cityMetrics.housingAffordabilityIndex,
      trafficCongestionIndex: cityMetrics.trafficCongestionIndex,
      airQualityIndex: cityMetrics.airQualityIndex,
      livabilityIndex: cityMetrics.livabilityIndex,
    },
    selectedZones: zonesToSend,
    neighborhoodProperties,
  }

  console.log('Sending request to backend:', BACKEND_URL)
  console.log('Request payload:', payload)

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
              const comments = generateComments(chunk.data.type, chunk.data.positivity)
              yield {
                type: 'event',
                data: {
                  ...chunk.data,
                  comments,
                },
              }
            } else {
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

