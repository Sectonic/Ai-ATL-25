import type { EventNotification, ZoneData, CityMetrics } from '../stores/simulationStore'

export type SimulationChunk = 
  | { type: 'event'; data: EventNotification }
  | { type: 'zoneUpdate'; data: ZoneData }
  | { type: 'metricsUpdate'; data: Partial<CityMetrics> }
  | { type: 'complete'; data: { summary: string } }

const atlantaNeighborhoods = [
  { id: 'midtown', name: 'Midtown', coords: [33.7838, -84.3830] as [number, number] },
  { id: 'buckhead', name: 'Buckhead', coords: [33.8482, -84.3691] as [number, number] },
  { id: 'downtown', name: 'Downtown', coords: [33.7570, -84.3900] as [number, number] },
  { id: 'decatur', name: 'Decatur', coords: [33.7748, -84.2963] as [number, number] },
  { id: 'west-end', name: 'West End', coords: [33.7356, -84.4143] as [number, number] },
  { id: 'virginia-highland', name: 'Virginia Highland', coords: [33.7853, -84.3505] as [number, number] },
  { id: 'old-fourth-ward', name: 'Old Fourth Ward', coords: [33.7632, -84.3692] as [number, number] },
  { id: 'grant-park', name: 'Grant Park', coords: [33.7394, -84.3705] as [number, number] },
]

const eventTemplates = {
  highway: [
    {
      type: 'traffic' as const,
      description: 'Highway expansion increases traffic flow by 25%',
      severity: 'low' as const,
    },
    {
      type: 'housing' as const,
      description: '47 residential units displaced for highway construction',
      severity: 'high' as const,
    },
    {
      type: 'environmental' as const,
      description: 'Air quality index decreased by 8 points due to increased emissions',
      severity: 'medium' as const,
    },
    {
      type: 'economic' as const,
      description: 'Property values decreased by 12% near highway expansion',
      severity: 'medium' as const,
    },
  ],
  transit: [
    {
      type: 'traffic' as const,
      description: 'New transit line reduces car traffic by 18%',
      severity: 'low' as const,
    },
    {
      type: 'economic' as const,
      description: 'Property values increased by 15% near new transit stations',
      severity: 'low' as const,
    },
    {
      type: 'population' as const,
      description: '2,400 new residents moved to transit-accessible areas',
      severity: 'low' as const,
    },
  ],
  zoning: [
    {
      type: 'housing' as const,
      description: 'Upzoning allows 1,200 new housing units',
      severity: 'low' as const,
    },
    {
      type: 'population' as const,
      description: 'Population density increased by 22%',
      severity: 'medium' as const,
    },
    {
      type: 'economic' as const,
      description: 'Local businesses report 30% revenue increase',
      severity: 'low' as const,
    },
  ],
  default: [
    {
      type: 'economic' as const,
      description: 'Policy implementation creates 340 new jobs',
      severity: 'low' as const,
    },
    {
      type: 'population' as const,
      description: 'Demographic shifts detected in affected zones',
      severity: 'medium' as const,
    },
    {
      type: 'traffic' as const,
      description: 'Traffic patterns shifting in response to policy',
      severity: 'low' as const,
    },
  ],
}

function detectPolicyType(prompt: string): keyof typeof eventTemplates {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('highway') || lowerPrompt.includes('road') || lowerPrompt.includes('lane')) {
    return 'highway'
  }
  if (lowerPrompt.includes('transit') || lowerPrompt.includes('subway') || lowerPrompt.includes('train')) {
    return 'transit'
  }
  if (lowerPrompt.includes('zoning') || lowerPrompt.includes('zone') || lowerPrompt.includes('housing')) {
    return 'zoning'
  }
  return 'default'
}

function generateRandomEvents(policyType: keyof typeof eventTemplates, count: number): EventNotification[] {
  const templates = eventTemplates[policyType]
  const events: EventNotification[] = []
  
  for (let i = 0; i < count; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)]
    const neighborhood = atlantaNeighborhoods[Math.floor(Math.random() * atlantaNeighborhoods.length)]
    
    events.push({
      id: `event-${Date.now()}-${i}`,
      zoneId: neighborhood.id,
      zoneName: neighborhood.name,
      type: template.type,
      description: template.description,
      severity: template.severity,
      timestamp: Date.now() + i * 500,
      coordinates: neighborhood.coords,
    })
  }
  
  return events
}

function generateZoneUpdates(policyType: keyof typeof eventTemplates): ZoneData[] {
  const updates: ZoneData[] = []
  const affectedNeighborhoods = atlantaNeighborhoods.slice(0, Math.floor(Math.random() * 3) + 3)
  
  affectedNeighborhoods.forEach((neighborhood) => {
    const basePopulation = Math.floor(Math.random() * 20000) + 10000
    const popChange = policyType === 'highway' ? -Math.floor(Math.random() * 500) : Math.floor(Math.random() * 800)
    
    updates.push({
      zoneId: neighborhood.id,
      zoneName: neighborhood.name,
      population: basePopulation,
      populationChange: popChange,
      housingUnits: Math.floor(basePopulation / 2.3),
      housingUnitsChange: policyType === 'highway' ? -Math.floor(Math.random() * 50) : Math.floor(Math.random() * 120),
      trafficFlow: Math.floor(Math.random() * 100),
      trafficFlowChange: policyType === 'highway' ? Math.floor(Math.random() * 25) : -Math.floor(Math.random() * 15),
      economicIndex: Math.floor(Math.random() * 40) + 60,
      economicIndexChange: Math.floor(Math.random() * 20) - 10,
    })
  })
  
  return updates
}

function generateMetricsUpdate(policyType: keyof typeof eventTemplates): Partial<CityMetrics> {
  if (policyType === 'highway') {
    return {
      populationChange: -340,
      averageIncomeChange: 1200,
      trafficCongestionIndexChange: -15,
      airQualityIndexChange: -8,
      housingAffordabilityIndexChange: -3,
    }
  }
  
  if (policyType === 'transit') {
    return {
      populationChange: 2400,
      averageIncomeChange: -500,
      trafficCongestionIndexChange: -18,
      airQualityIndexChange: 5,
      housingAffordabilityIndexChange: 8,
    }
  }
  
  if (policyType === 'zoning') {
    return {
      populationChange: 1800,
      unemploymentRateChange: -0.3,
      housingAffordabilityIndexChange: 12,
      averageIncomeChange: -800,
    }
  }
  
  return {
    populationChange: Math.floor(Math.random() * 1000) - 500,
    unemploymentRateChange: (Math.random() * 0.6) - 0.3,
    trafficCongestionIndexChange: Math.floor(Math.random() * 10) - 5,
  }
}

export async function* simulatePolicy(prompt: string): AsyncGenerator<SimulationChunk> {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const policyType = detectPolicyType(prompt)
  const events = generateRandomEvents(policyType, 5)
  const zoneUpdates = generateZoneUpdates(policyType)
  const metricsUpdate = generateMetricsUpdate(policyType)
  
  for (let i = 0; i < events.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 400))
    yield { type: 'event', data: events[i] }
  }
  
  await new Promise(resolve => setTimeout(resolve, 300))
  
  for (const update of zoneUpdates) {
    await new Promise(resolve => setTimeout(resolve, 200))
    yield { type: 'zoneUpdate', data: update }
  }
  
  await new Promise(resolve => setTimeout(resolve, 300))
  yield { type: 'metricsUpdate', data: metricsUpdate }
  
  await new Promise(resolve => setTimeout(resolve, 200))
  yield {
    type: 'complete',
    data: {
      summary: `Simulation complete for policy: "${prompt}". Analyzed ${events.length} events across ${zoneUpdates.length} zones.`,
    },
  }
}

