import type { EventNotification, ZoneData, CityMetrics, Comment } from '../stores/simulationStore'

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

interface NeighborhoodProperties {
  OBJECTID_1: number
  OBJECTID?: number
  LOCALID: string
  NAME: string
  GEOTYPE: string
  FULLFIPS: string
  LEGALAREA: number
  EFFECTDATE?: string
  ENDDATE?: string
  SRCREF: string
  ACRES: number
  SQMILES: number
  OLDNAME: string
  NPU: string
  CREATED_US: string
  CREATED_DA?: string
  LAST_EDITE: string
  LAST_EDI_1: string
  GLOBALID: string
  Shape_Leng: number
  aggregatio: string
  HasData: number
  ORIGINAL_O: number
  sourceCoun: string
  apportionm: number
  population: number
  populati_1: number
  gender_MED: number
  gender_MAL: number
  gender_M_1: number
  gender_M_2: number
  gender_M_3: number
  gender_M_4: number
  gender_M_5: number
  gender_M_6: number
  gender_M_7: number
  gender_M_8: number
  gender_M_9: number
  gender__10: number
  gender__11: number
  gender__12: number
  gender__13: number
  gender__14: number
  gender__15: number
  gender__16: number
  gender__17: number
  gender__18: number
  gender__19: number
  gender__20: number
  gender__21: number
  gender__22: number
  gender__23: number
  gender__24: number
  gender__25: number
  gender__26: number
  gender__27: number
  gender_FEM: number
  gender_F_1: number
  gender_F_2: number
  gender_F_3: number
  gender_F_4: number
  gender_F_5: number
  gender_F_6: number
  gender_F_7: number
  gender_F_8: number
  gender_F_9: number
  gender__28: number
  gender__29: number
  gender__30: number
  gender__31: number
  gender__32: number
  gender__33: number
  gender__34: number
  gender__35: number
  gender__36: number
  gender__37: number
  gender__38: number
  gender__39: number
  gender__40: number
  gender__41: number
  gender__42: number
  gender__43: number
  gender__44: number
  gender__45: number
  householdt: number
  OwnerRente: number
  OwnerRen_1: number
  OwnerRen_2: number
  OwnerRen_3: number
  housinguni: number
  vacant_VAC: number
  vacant_V_1: number
  raceandhis: number
  raceandh_1: number
  raceandh_2: number
  raceandh_3: number
  raceandh_4: number
  raceandh_5: number
  raceandh_6: number
  raceandh_7: number
  raceandh_8: number
  raceandh_9: number
  raceand_10: number
  raceand_11: number
  hispanicor: number
  hispanic_1: number
  educationa: number
  educatio_1: number
  educatio_2: number
  educatio_3: number
  educatio_4: number
  educatio_5: number
  educatio_6: number
  househol_1: number
  households: number
  householdi: number
  homevalue_: number
  F5yearincre: number
  unitsinstr: number
  unitsins_1: number
  unitsins_2: number
  unitsins_3: number
  unitsins_4: number
  unitsins_5: number
  unitsins_6: number
  unitsins_7: number
  unitsins_8: number
  unitsins_9: number
  unitsin_10: number
  unitsin_11: number
  unitsin_12: number
  unitsin_13: number
  unitsin_14: number
  unitsin_15: number
  commute_AC: number
  commute__1: number
  commute__2: number
  commute__3: number
  commute__4: number
  commute__5: number
  commute__6: number
  Shape__Area: number
  Shape__Length: number
}

export function buildNeighborhoodProperties(
  selectedZones: string[],
  neighborhoodsData: GeoJSON.FeatureCollection
): NeighborhoodProperties[] {
  if (selectedZones.length === 0) {
    return []
  }
  
  return selectedZones
    .map((zoneId) => {
      const feature = neighborhoodsData.features.find(
        (f) => f.properties?.OBJECTID_1?.toString() === zoneId
      )
      
      if (!feature || !feature.properties) return null
      
      const props = feature.properties
      
      return {
        OBJECTID_1: props.OBJECTID_1 || 0,
        OBJECTID: props.OBJECTID,
        LOCALID: props.LOCALID || '',
        NAME: props.NAME || '',
        GEOTYPE: props.GEOTYPE || '',
        FULLFIPS: props.FULLFIPS || '',
        LEGALAREA: props.LEGALAREA || 0,
        EFFECTDATE: props.EFFECTDATE,
        ENDDATE: props.ENDDATE,
        SRCREF: props.SRCREF || '',
        ACRES: props.ACRES || 0,
        SQMILES: props.SQMILES || 0,
        OLDNAME: props.OLDNAME || '',
        NPU: props.NPU || '',
        CREATED_US: props.CREATED_US || '',
        CREATED_DA: props.CREATED_DA,
        LAST_EDITE: props.LAST_EDITE || '',
        LAST_EDI_1: props.LAST_EDI_1 || '',
        GLOBALID: props.GLOBALID || '',
        Shape_Leng: props.Shape_Leng || 0,
        aggregatio: props.aggregatio || '',
        HasData: props.HasData || 0,
        ORIGINAL_O: props.ORIGINAL_O || 0,
        sourceCoun: props.sourceCoun || '',
        apportionm: props.apportionm || 0,
        population: props.population || 0,
        populati_1: props.populati_1 || 0,
        gender_MED: props.gender_MED || 0,
        gender_MAL: props.gender_MAL || 0,
        gender_M_1: props.gender_M_1 || 0,
        gender_M_2: props.gender_M_2 || 0,
        gender_M_3: props.gender_M_3 || 0,
        gender_M_4: props.gender_M_4 || 0,
        gender_M_5: props.gender_M_5 || 0,
        gender_M_6: props.gender_M_6 || 0,
        gender_M_7: props.gender_M_7 || 0,
        gender_M_8: props.gender_M_8 || 0,
        gender_M_9: props.gender_M_9 || 0,
        gender__10: props.gender__10 || 0,
        gender__11: props.gender__11 || 0,
        gender__12: props.gender__12 || 0,
        gender__13: props.gender__13 || 0,
        gender__14: props.gender__14 || 0,
        gender__15: props.gender__15 || 0,
        gender__16: props.gender__16 || 0,
        gender__17: props.gender__17 || 0,
        gender__18: props.gender__18 || 0,
        gender__19: props.gender__19 || 0,
        gender__20: props.gender__20 || 0,
        gender__21: props.gender__21 || 0,
        gender__22: props.gender__22 || 0,
        gender__23: props.gender__23 || 0,
        gender__24: props.gender__24 || 0,
        gender__25: props.gender__25 || 0,
        gender__26: props.gender__26 || 0,
        gender__27: props.gender__27 || 0,
        gender_FEM: props.gender_FEM || 0,
        gender_F_1: props.gender_F_1 || 0,
        gender_F_2: props.gender_F_2 || 0,
        gender_F_3: props.gender_F_3 || 0,
        gender_F_4: props.gender_F_4 || 0,
        gender_F_5: props.gender_F_5 || 0,
        gender_F_6: props.gender_F_6 || 0,
        gender_F_7: props.gender_F_7 || 0,
        gender_F_8: props.gender_F_8 || 0,
        gender_F_9: props.gender_F_9 || 0,
        gender__28: props.gender__28 || 0,
        gender__29: props.gender__29 || 0,
        gender__30: props.gender__30 || 0,
        gender__31: props.gender__31 || 0,
        gender__32: props.gender__32 || 0,
        gender__33: props.gender__33 || 0,
        gender__34: props.gender__34 || 0,
        gender__35: props.gender__35 || 0,
        gender__36: props.gender__36 || 0,
        gender__37: props.gender__37 || 0,
        gender__38: props.gender__38 || 0,
        gender__39: props.gender__39 || 0,
        gender__40: props.gender__40 || 0,
        gender__41: props.gender__41 || 0,
        gender__42: props.gender__42 || 0,
        gender__43: props.gender__43 || 0,
        gender__44: props.gender__44 || 0,
        gender__45: props.gender__45 || 0,
        householdt: props.householdt || 0,
        OwnerRente: props.OwnerRente || 0,
        OwnerRen_1: props.OwnerRen_1 || 0,
        OwnerRen_2: props.OwnerRen_2 || 0,
        OwnerRen_3: props.OwnerRen_3 || 0,
        housinguni: props.housinguni || 0,
        vacant_VAC: props.vacant_VAC || 0,
        vacant_V_1: props.vacant_V_1 || 0,
        raceandhis: props.raceandhis || 0,
        raceandh_1: props.raceandh_1 || 0,
        raceandh_2: props.raceandh_2 || 0,
        raceandh_3: props.raceandh_3 || 0,
        raceandh_4: props.raceandh_4 || 0,
        raceandh_5: props.raceandh_5 || 0,
        raceandh_6: props.raceandh_6 || 0,
        raceandh_7: props.raceandh_7 || 0,
        raceandh_8: props.raceandh_8 || 0,
        raceandh_9: props.raceandh_9 || 0,
        raceand_10: props.raceand_10 || 0,
        raceand_11: props.raceand_11 || 0,
        hispanicor: props.hispanicor || 0,
        hispanic_1: props.hispanic_1 || 0,
        educationa: props.educationa || 0,
        educatio_1: props.educatio_1 || 0,
        educatio_2: props.educatio_2 || 0,
        educatio_3: props.educatio_3 || 0,
        educatio_4: props.educatio_4 || 0,
        educatio_5: props.educatio_5 || 0,
        educatio_6: props.educatio_6 || 0,
        househol_1: props.househol_1 || 0,
        households: props.households || 0,
        householdi: props.householdi || 0,
        homevalue_: props.homevalue_ || 0,
        F5yearincre: props.F5yearincre || 0,
        unitsinstr: props.unitsinstr || 0,
        unitsins_1: props.unitsins_1 || 0,
        unitsins_2: props.unitsins_2 || 0,
        unitsins_3: props.unitsins_3 || 0,
        unitsins_4: props.unitsins_4 || 0,
        unitsins_5: props.unitsins_5 || 0,
        unitsins_6: props.unitsins_6 || 0,
        unitsins_7: props.unitsins_7 || 0,
        unitsins_8: props.unitsins_8 || 0,
        unitsins_9: props.unitsins_9 || 0,
        unitsin_10: props.unitsin_10 || 0,
        unitsin_11: props.unitsin_11 || 0,
        unitsin_12: props.unitsin_12 || 0,
        unitsin_13: props.unitsin_13 || 0,
        unitsin_14: props.unitsin_14 || 0,
        unitsin_15: props.unitsin_15 || 0,
        commute_AC: props.commute_AC || 0,
        commute__1: props.commute__1 || 0,
        commute__2: props.commute__2 || 0,
        commute__3: props.commute__3 || 0,
        commute__4: props.commute__4 || 0,
        commute__5: props.commute__5 || 0,
        commute__6: props.commute__6 || 0,
        Shape__Area: props.Shape__Area || 0,
        Shape__Length: props.Shape__Length || 0,
      }
    })
    .filter((props) => props !== null) as NeighborhoodProperties[]
}

export async function* simulatePolicy(
  prompt: string,
  cityMetrics: CityMetrics,
  selectedZones: string[],
  neighborhoodsData: GeoJSON.FeatureCollection
): AsyncGenerator<SimulationChunk> {

  const neighborhoodProperties = buildNeighborhoodProperties(selectedZones, neighborhoodsData)
  
  const payload = {
    prompt,
    cityMetrics: {
      population: cityMetrics.population,
      averageIncome: cityMetrics.averageIncome,
      unemploymentRate: cityMetrics.unemploymentRate,
      housingAffordabilityIndex: cityMetrics.housingAffordabilityIndex,
      trafficCongestionIndex: cityMetrics.trafficCongestionIndex,
      airQualityIndex: cityMetrics.airQualityIndex,
      crimeRate: cityMetrics.crimeRate,
    },
    selectedZones,
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
    const errorText = await response.text()
    console.error('Backend error response:', errorText)
    throw new Error(`Backend error: ${response.status} ${response.statusText}`)
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

