import type { EventNotification, ZoneData, CityMetrics, Comment } from '../stores/simulationStore'

export type SimulationChunk = 
  | { type: 'event'; data: EventNotification }
  | { type: 'zoneUpdate'; data: ZoneData }
  | { type: 'metricsUpdate'; data: Partial<CityMetrics> }
  | { type: 'complete'; data: { summary: string } }

const atlantaNeighborhoods = [
  { id: 'midtown', name: 'Midtown', coords: [33.7838, -84.3830] as [number, number] },
  { id: 'buckhead', name: 'Buckhead', coords: [33.8482, -84.3691] as [number, number] },
  { id: 'downtown', name: 'Downtown', coords: [33.7570, -84.3900] as [number, number] },
  { id: 'west-end', name: 'West End', coords: [33.7356, -84.4143] as [number, number] },
  { id: 'virginia-highland', name: 'Virginia Highland', coords: [33.7853, -84.3505] as [number, number] },
  { id: 'old-fourth-ward', name: 'Old Fourth Ward', coords: [33.7632, -84.3692] as [number, number] },
  { id: 'grant-park', name: 'Grant Park', coords: [33.7394, -84.3705] as [number, number] },
  { id: 'candler-park', name: 'Candler Park', coords: [33.7650, -84.3400] as [number, number] },
  { id: 'inman-park', name: 'Inman Park', coords: [33.7575, -84.3520] as [number, number] },
  { id: 'east-atlanta', name: 'East Atlanta', coords: [33.7400, -84.3480] as [number, number] },
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

function generateComments(eventType: EventNotification['type'], severity: EventNotification['severity']): Comment[] {
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
    const sentiment = severity === 'high' 
      ? (Math.random() > 0.3 ? 'negative' : 'neutral')
      : severity === 'low'
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
    
    const comments = generateComments(template.type, template.severity)
    
    events.push({
      id: `event-${Date.now()}-${i}`,
      zoneId: neighborhood.id,
      zoneName: neighborhood.name,
      type: template.type,
      description: template.description,
      severity: template.severity,
      timestamp: Date.now() + i * 500,
      coordinates: neighborhood.coords,
      comments,
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

