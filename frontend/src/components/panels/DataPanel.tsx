import { Fragment, useMemo, useRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore, type NeighborhoodProperties } from '../../stores/simulationStore'
import { useNeighborhoods } from '../../services/geojsonApi'
import { Users, Home, DollarSign, Car, Leaf, Scale, Star, ArrowUp, ArrowDown } from 'lucide-react'
import { DoughnutChart } from '../charts/DoughnutChart'
import { RadarChart } from '../charts/RadarChart'
import { SegmentedBar } from '../charts/SegmentedBar'

interface AggregatedData {
  population: number
  medianIncome: number
  housingAffordability: number
  environmentalScore: number
  livabilityScore: number
  trafficCongestion: number
  raceDistribution: {
    white: number
    black: number
    asian: number
    mixed: number
    hispanic: number
  }
  educationDistribution: {
    high_school_or_less: number
    some_college: number
    bachelors: number
    graduate: number
  }
  diversityIndex: number
  higherEdPercent: number
  medianHomeValue: number
  affordabilityIndex: number
  commute: {
    avg_minutes: number
    car_dependence: number
    transit_usage: number
  }
  vacancyRate: number
  ownerOccupancy: number
  densityIndex: number
  selectedNames: string[]
}

interface AggregatedDeltas {
  population?: number
  medianIncome?: number
  housingAffordability?: number
  environmentalScore?: number
  livabilityScore?: number
  trafficCongestion?: number
  raceDistribution?: {
    white: number
    black: number
    asian: number
    mixed: number
    hispanic: number
  }
  educationDistribution?: {
    high_school_or_less: number
    some_college: number
    bachelors: number
    graduate: number
  }
  diversityIndex?: number
  higherEdPercent?: number
  medianHomeValue?: number
  affordabilityIndex?: number
  commute?: {
    avg_minutes: number
    car_dependence: number
    transit_usage: number
  }
  vacancyRate?: number
  ownerOccupancy?: number
  densityIndex?: number
}

interface PanelSection {
  id: string
  order: number
  score: number
  node: ReactNode
}

const raceKeys = ['white', 'black', 'asian', 'mixed', 'hispanic'] as const
const educationKeys = ['high_school_or_less', 'some_college', 'bachelors', 'graduate'] as const

type RaceKey = typeof raceKeys[number]
type EducationKey = typeof educationKeys[number]

const toNumber = (value: number | null | undefined) => {
  if (typeof value !== 'number') return 0
  if (!Number.isFinite(value)) return 0
  return value
}

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampPercent = (value: number) => clampValue(value, 0, 100)
const clampRatio = (value: number) => clampValue(value, 0, 1)
const safeDivide = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator)

function normalizePercentages<K extends readonly string[]>(
  source: Partial<Record<K[number], number>> | undefined,
  keys: K
): Record<K[number], number> {
  const normalized = {} as Record<K[number], number>
  const typedKeys = keys as ReadonlyArray<K[number]>
  let total = 0

  typedKeys.forEach((key) => {
    const typedKey = key as K[number]
    const value = clampPercent(toNumber(source?.[typedKey]))
    normalized[typedKey] = value
    total += value
  })

  if (total === 0) {
    typedKeys.forEach((key) => {
      const typedKey = key as K[number]
      normalized[typedKey] = 0
    })
    return normalized
  }

  typedKeys.forEach((key) => {
    const typedKey = key as K[number]
    normalized[typedKey] = normalized[typedKey] / total
  })

  return normalized
}

function aggregateNeighborhoodData(
  selectedZones: string[],
  neighborhoodData: Record<string, NeighborhoodProperties>,
  neighborhoodsData: GeoJSON.FeatureCollection | undefined
): AggregatedData | null {
  if (!neighborhoodsData) return null

  const featureLookup = new Map<string, NeighborhoodProperties>()
  neighborhoodsData.features.forEach((feature) => {
    const name = feature.properties?.name
    if (name && feature.properties) {
      featureLookup.set(name, feature.properties as NeighborhoodProperties)
    }
  })

  const availableNames = featureLookup.size > 0
    ? Array.from(featureLookup.keys())
    : Object.keys(neighborhoodData)

  const requestedZones = selectedZones.length === 0 ? availableNames : selectedZones
  const uniqueZones = Array.from(new Set(requestedZones.filter((name): name is string => Boolean(name))))

  const selectedZoneData = uniqueZones
    .map((name) => neighborhoodData[name] ?? featureLookup.get(name) ?? null)
    .filter((zone): zone is NeighborhoodProperties => Boolean(zone))

  if (selectedZoneData.length === 0) return null

  const zoneEntries = selectedZoneData.map((zone) => ({
    zone,
    population: Math.max(0, toNumber(zone.population_total)),
    households: Math.max(0, toNumber(zone.households)),
    race: normalizePercentages(zone.race_distribution, raceKeys),
    education: normalizePercentages(zone.education_distribution, educationKeys),
  }))

  const totalPopulation = zoneEntries.reduce((sum, entry) => sum + entry.population, 0)
  const totalHouseholds = zoneEntries.reduce((sum, entry) => sum + entry.households, 0)

  const average = (selector: (entry: typeof zoneEntries[number]) => number) => {
    if (zoneEntries.length === 0) return 0
    return safeDivide(zoneEntries.reduce((sum, entry) => sum + selector(entry), 0), zoneEntries.length)
  }

  const weightedByPopulation = (selector: (entry: typeof zoneEntries[number]) => number) => {
    if (totalPopulation === 0) {
      return average(selector)
    }
    return safeDivide(zoneEntries.reduce((sum, entry) => sum + selector(entry) * entry.population, 0), totalPopulation)
  }

  const weightedByHouseholds = (selector: (entry: typeof zoneEntries[number]) => number) => {
    if (totalHouseholds === 0) {
      return average(selector)
    }
    return safeDivide(zoneEntries.reduce((sum, entry) => sum + selector(entry) * entry.households, 0), totalHouseholds)
  }

  const population = totalPopulation
  const medianIncome = weightedByHouseholds((entry) => toNumber(entry.zone.median_income))
  const medianHomeValue = weightedByHouseholds((entry) => toNumber(entry.zone.median_home_value))
  const avgAffordability = average((entry) => toNumber(entry.zone.affordability_index))
  const avgCarDependence = clampPercent(weightedByPopulation((entry) => clampPercent(toNumber(entry.zone.commute?.car_dependence))))
  const avgTransitUsage = clampPercent(weightedByPopulation((entry) => clampPercent(toNumber(entry.zone.commute?.transit_usage))))
  const densityIndex = clampRatio(weightedByPopulation((entry) => clampRatio(toNumber(entry.zone.derived?.density_index))))
  const trafficCongestion = clampPercent(avgCarDependence + densityIndex * 100)
  const environmentalScore = clampPercent(100 - trafficCongestion)

  const raceDistribution: Record<RaceKey, number> = {
    white: weightedByPopulation((entry) => entry.race.white),
    black: weightedByPopulation((entry) => entry.race.black),
    asian: weightedByPopulation((entry) => entry.race.asian),
    mixed: weightedByPopulation((entry) => entry.race.mixed),
    hispanic: weightedByPopulation((entry) => entry.race.hispanic),
  }

  const educationDistribution: Record<EducationKey, number> = {
    high_school_or_less: weightedByPopulation((entry) => entry.education.high_school_or_less) * 100,
    some_college: weightedByPopulation((entry) => entry.education.some_college) * 100,
    bachelors: weightedByPopulation((entry) => entry.education.bachelors) * 100,
    graduate: weightedByPopulation((entry) => entry.education.graduate) * 100,
  }

  const diversityIndex = clampRatio(weightedByPopulation((entry) => clampRatio(toNumber(entry.zone.diversity_index))))
  const higherEdPercent = clampPercent(weightedByPopulation((entry) => clampPercent(toNumber(entry.zone.derived?.higher_ed_percent))))
  const avgCommuteMinutes = Math.max(0, weightedByPopulation((entry) => Math.max(0, toNumber(entry.zone.commute?.avg_minutes))))
  const vacancyRate = clampPercent(average((entry) => clampPercent(toNumber(entry.zone.vacancy_rate))))
  const ownerOccupancy = clampPercent(average((entry) => clampPercent(toNumber(entry.zone.owner_occupancy))))
  const avgLivabilityScore = clampPercent(weightedByPopulation((entry) => clampPercent(toNumber(entry.zone.livability_index))))
  const affordabilityScore = clampPercent(100 - Math.max(0, avgAffordability) * 10)

  const selectedNames = Array.from(
    new Set(
      zoneEntries
        .map((entry) => entry.zone.name)
        .filter((name): name is string => Boolean(name))
    )
  )
  const resolvedNames = selectedNames.length > 0 ? selectedNames : uniqueZones

  return {
    population,
    medianIncome,
    housingAffordability: Math.round(affordabilityScore),
    environmentalScore: Math.round(environmentalScore),
    livabilityScore: Math.round(avgLivabilityScore),
    trafficCongestion: Math.round(trafficCongestion),
    raceDistribution,
    educationDistribution,
    diversityIndex,
    higherEdPercent,
    medianHomeValue,
    affordabilityIndex: avgAffordability,
    commute: {
      avg_minutes: avgCommuteMinutes,
      car_dependence: avgCarDependence,
      transit_usage: avgTransitUsage,
    },
    vacancyRate,
    ownerOccupancy,
    densityIndex,
    selectedNames: resolvedNames,
  }
}

function calculateAggregatedDeltas(
  selectedZones: string[],
  originalData: Record<string, NeighborhoodProperties>,
  simulatedData: Record<string, NeighborhoodProperties>,
  neighborhoodsData: GeoJSON.FeatureCollection | undefined
): AggregatedDeltas | null {
  if (!neighborhoodsData) return null

  const zonesToAggregate = selectedZones.length === 0
    ? neighborhoodsData.features.map(f => f.properties?.name).filter(Boolean) as string[]
    : selectedZones

  if (zonesToAggregate.length === 0) return null

  const originalAggregated = aggregateNeighborhoodData(selectedZones, originalData, neighborhoodsData)
  const simulatedAggregated = aggregateNeighborhoodData(selectedZones, simulatedData, neighborhoodsData)

  if (!originalAggregated || !simulatedAggregated) return null

  const result: AggregatedDeltas = {}

  if (Math.abs(simulatedAggregated.population - originalAggregated.population) >= EPSILON) {
    result.population = simulatedAggregated.population - originalAggregated.population
  }
  if (Math.abs(simulatedAggregated.medianIncome - originalAggregated.medianIncome) >= EPSILON) {
    result.medianIncome = simulatedAggregated.medianIncome - originalAggregated.medianIncome
  }
  if (Math.abs(simulatedAggregated.housingAffordability - originalAggregated.housingAffordability) >= EPSILON) {
    result.housingAffordability = simulatedAggregated.housingAffordability - originalAggregated.housingAffordability
  }
  if (Math.abs(simulatedAggregated.environmentalScore - originalAggregated.environmentalScore) >= EPSILON) {
    result.environmentalScore = simulatedAggregated.environmentalScore - originalAggregated.environmentalScore
  }
  if (Math.abs(simulatedAggregated.livabilityScore - originalAggregated.livabilityScore) >= EPSILON) {
    result.livabilityScore = simulatedAggregated.livabilityScore - originalAggregated.livabilityScore
  }
  if (Math.abs(simulatedAggregated.trafficCongestion - originalAggregated.trafficCongestion) >= EPSILON) {
    result.trafficCongestion = simulatedAggregated.trafficCongestion - originalAggregated.trafficCongestion
  }
  if (Math.abs(simulatedAggregated.diversityIndex - originalAggregated.diversityIndex) >= EPSILON) {
    result.diversityIndex = simulatedAggregated.diversityIndex - originalAggregated.diversityIndex
  }
  if (Math.abs(simulatedAggregated.higherEdPercent - originalAggregated.higherEdPercent) >= EPSILON) {
    result.higherEdPercent = simulatedAggregated.higherEdPercent - originalAggregated.higherEdPercent
  }
  if (Math.abs(simulatedAggregated.medianHomeValue - originalAggregated.medianHomeValue) >= EPSILON) {
    result.medianHomeValue = simulatedAggregated.medianHomeValue - originalAggregated.medianHomeValue
  }
  if (Math.abs(simulatedAggregated.affordabilityIndex - originalAggregated.affordabilityIndex) >= EPSILON) {
    result.affordabilityIndex = simulatedAggregated.affordabilityIndex - originalAggregated.affordabilityIndex
  }
  if (Math.abs(simulatedAggregated.vacancyRate - originalAggregated.vacancyRate) >= EPSILON) {
    result.vacancyRate = simulatedAggregated.vacancyRate - originalAggregated.vacancyRate
  }
  if (Math.abs(simulatedAggregated.ownerOccupancy - originalAggregated.ownerOccupancy) >= EPSILON) {
    result.ownerOccupancy = simulatedAggregated.ownerOccupancy - originalAggregated.ownerOccupancy
  }
  if (Math.abs(simulatedAggregated.densityIndex - originalAggregated.densityIndex) >= EPSILON) {
    result.densityIndex = simulatedAggregated.densityIndex - originalAggregated.densityIndex
  }

  const raceChanged =
    Math.abs(simulatedAggregated.raceDistribution.white - originalAggregated.raceDistribution.white) >= EPSILON ||
    Math.abs(simulatedAggregated.raceDistribution.black - originalAggregated.raceDistribution.black) >= EPSILON ||
    Math.abs(simulatedAggregated.raceDistribution.asian - originalAggregated.raceDistribution.asian) >= EPSILON ||
    Math.abs(simulatedAggregated.raceDistribution.mixed - originalAggregated.raceDistribution.mixed) >= EPSILON ||
    Math.abs(simulatedAggregated.raceDistribution.hispanic - originalAggregated.raceDistribution.hispanic) >= EPSILON

  if (raceChanged) {
    result.raceDistribution = {
      white: simulatedAggregated.raceDistribution.white - originalAggregated.raceDistribution.white,
      black: simulatedAggregated.raceDistribution.black - originalAggregated.raceDistribution.black,
      asian: simulatedAggregated.raceDistribution.asian - originalAggregated.raceDistribution.asian,
      mixed: simulatedAggregated.raceDistribution.mixed - originalAggregated.raceDistribution.mixed,
      hispanic: simulatedAggregated.raceDistribution.hispanic - originalAggregated.raceDistribution.hispanic,
    }
  }

  const eduChanged =
    Math.abs(simulatedAggregated.educationDistribution.high_school_or_less - originalAggregated.educationDistribution.high_school_or_less) >= EPSILON ||
    Math.abs(simulatedAggregated.educationDistribution.some_college - originalAggregated.educationDistribution.some_college) >= EPSILON ||
    Math.abs(simulatedAggregated.educationDistribution.bachelors - originalAggregated.educationDistribution.bachelors) >= EPSILON ||
    Math.abs(simulatedAggregated.educationDistribution.graduate - originalAggregated.educationDistribution.graduate) >= EPSILON

  if (eduChanged) {
    result.educationDistribution = {
      high_school_or_less: simulatedAggregated.educationDistribution.high_school_or_less - originalAggregated.educationDistribution.high_school_or_less,
      some_college: simulatedAggregated.educationDistribution.some_college - originalAggregated.educationDistribution.some_college,
      bachelors: simulatedAggregated.educationDistribution.bachelors - originalAggregated.educationDistribution.bachelors,
      graduate: simulatedAggregated.educationDistribution.graduate - originalAggregated.educationDistribution.graduate,
    }
  }

  const commuteChanged =
    Math.abs(simulatedAggregated.commute.avg_minutes - originalAggregated.commute.avg_minutes) >= EPSILON ||
    Math.abs(simulatedAggregated.commute.car_dependence - originalAggregated.commute.car_dependence) >= EPSILON ||
    Math.abs(simulatedAggregated.commute.transit_usage - originalAggregated.commute.transit_usage) >= EPSILON

  if (commuteChanged) {
    result.commute = {
      avg_minutes: simulatedAggregated.commute.avg_minutes - originalAggregated.commute.avg_minutes,
      car_dependence: simulatedAggregated.commute.car_dependence - originalAggregated.commute.car_dependence,
      transit_usage: simulatedAggregated.commute.transit_usage - originalAggregated.commute.transit_usage,
    }
  }

  return result
}

const EPSILON = 0.005
const DISPLAY_EPSILON = 0.05

function formatDelta(value: number | undefined, positiveIsGood: boolean = true): { display: string; isPositive: boolean; color: string } | null {
  if (value === undefined) return null
  if (Math.abs(value) < DISPLAY_EPSILON) return null
  const rounded = Number(value.toFixed(1))
  if (Math.abs(rounded) < DISPLAY_EPSILON) return null
  const isPositive = rounded > 0
  const isGood = positiveIsGood ? isPositive : !isPositive
  return {
    display: `${isPositive ? '+' : ''}${rounded.toFixed(1)}`,
    isPositive,
    color: isGood ? 'text-green-400' : 'text-red-400',
  }
}

const hasMeaningfulDelta = (value?: number) => value !== undefined && Math.abs(value) >= DISPLAY_EPSILON
const countDeltaChanges = (values: Array<number | undefined>): number => {
  return values.reduce((total: number, value) => total + (hasMeaningfulDelta(value) ? 1 : 0), 0)
}


export function DataPanel() {
  const {
    selectedZones,
    simulationStatus,
    originalNeighborhoodData,
    simulatedNeighborhoodData,
    selectedEventId,
    eventNotifications,
  } = useSimulationStore()
  const { data: neighborhoodsData } = useNeighborhoods()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showGradient, setShowGradient] = useState(false)

  const selectedEvent = selectedEventId
    ? eventNotifications.find(e => e.id === selectedEventId)
    : null

  const effectiveZones = selectedEvent ? [selectedEvent.zoneName] : selectedZones

  const hasSimulatedResults = simulationStatus === 'complete' && Object.keys(simulatedNeighborhoodData).length > 0
  const activeNeighborhoodData = hasSimulatedResults ? simulatedNeighborhoodData : originalNeighborhoodData

  const aggregated = useMemo(() => {
    return aggregateNeighborhoodData(effectiveZones, activeNeighborhoodData, neighborhoodsData)
  }, [effectiveZones, activeNeighborhoodData, neighborhoodsData, hasSimulatedResults])

  const aggregatedDeltas = useMemo(() => {
    if (!hasSimulatedResults || !neighborhoodsData) return null
    return calculateAggregatedDeltas(effectiveZones, originalNeighborhoodData, simulatedNeighborhoodData, neighborhoodsData)
  }, [hasSimulatedResults, neighborhoodsData, originalNeighborhoodData, effectiveZones, simulatedNeighborhoodData])

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = containerRef.current
        const hasOverflow = scrollHeight > clientHeight
        const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10
        setShowGradient(hasOverflow && !isScrolledToBottom)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', checkOverflow)
      const observer = new MutationObserver(checkOverflow)
      observer.observe(container, { childList: true, subtree: true })

      return () => {
        window.removeEventListener('resize', checkOverflow)
        container.removeEventListener('scroll', checkOverflow)
        observer.disconnect()
      }
    }

    return () => {
      window.removeEventListener('resize', checkOverflow)
    }
  }, [aggregated])

  if (!aggregated) return null

  const raceLabels = ['White', 'Black', 'Asian', 'Mixed', 'Hispanic']
  const raceData = [
    aggregated.raceDistribution.white,
    aggregated.raceDistribution.black,
    aggregated.raceDistribution.asian,
    aggregated.raceDistribution.mixed,
    aggregated.raceDistribution.hispanic,
  ]
  const raceColors = ['#737373', '#525252', '#a3a3a3', '#d4d4d4', '#e5e5e5']
  const raceDeltas = aggregatedDeltas?.raceDistribution
    ? [
        aggregatedDeltas.raceDistribution.white * 100,
        aggregatedDeltas.raceDistribution.black * 100,
        aggregatedDeltas.raceDistribution.asian * 100,
        aggregatedDeltas.raceDistribution.mixed * 100,
        aggregatedDeltas.raceDistribution.hispanic * 100,
      ]
    : undefined

  const educationLabels = ['High School', 'Some College', "Bachelor's", 'Graduate']
  const educationData = [
    aggregated.educationDistribution.high_school_or_less,
    aggregated.educationDistribution.some_college,
    aggregated.educationDistribution.bachelors,
    aggregated.educationDistribution.graduate,
  ]
  
  const educationColors = ['#525252', '#737373', '#a3a3a3', '#d4d4d4']
  const educationDeltas = aggregatedDeltas?.educationDistribution
    ? [
        aggregatedDeltas.educationDistribution.high_school_or_less,
        aggregatedDeltas.educationDistribution.some_college,
        aggregatedDeltas.educationDistribution.bachelors,
        aggregatedDeltas.educationDistribution.graduate,
      ]
    : undefined

  const rawCarShare = clampPercent(aggregated.commute.car_dependence)
  const rawTransitShare = clampPercent(aggregated.commute.transit_usage)
  const combinedPrimary = rawCarShare + rawTransitShare
  const commuteScale = combinedPrimary > 100 ? 100 / combinedPrimary : 1
  const carShare = rawCarShare * commuteScale
  const transitShare = rawTransitShare * commuteScale
  const otherShare = Math.max(0, 100 - carShare - transitShare)

  const commuteSegments = [
    { value: carShare, color: '#737373', label: 'Car' },
    { value: transitShare, color: '#a3a3a3', label: 'Transit' },
    { value: otherShare, color: '#d4d4d4', label: 'Other' },
  ]

  const radarData = [
    Math.round(aggregated.higherEdPercent),
    Math.round(aggregated.diversityIndex * 100),
    Math.round(Math.min(100, Math.max(0, 100 - (aggregated.affordabilityIndex * 10)))),
    Math.round(aggregated.densityIndex * 100),
    Math.round(Math.min(100, (aggregated.medianIncome / 200000) * 100)),
  ]

  const overviewDeltaValues = {
    population: aggregatedDeltas?.population !== undefined ? aggregatedDeltas.population / 1000 : undefined,
    income: aggregatedDeltas?.medianIncome !== undefined ? aggregatedDeltas.medianIncome / 1000 : undefined,
    affordability: aggregatedDeltas?.housingAffordability,
    environment: aggregatedDeltas?.environmentalScore,
    livability: aggregatedDeltas?.livabilityScore,
    traffic: aggregatedDeltas?.trafficCongestion,
  }

  const educationDeltaSingleValue = aggregatedDeltas?.higherEdPercent
  const diversityDeltaValue = aggregatedDeltas?.diversityIndex
  const homeValueDeltaValue = aggregatedDeltas?.medianHomeValue !== undefined ? aggregatedDeltas.medianHomeValue / 1000 : undefined
  const affordabilityIndexDeltaValue = aggregatedDeltas?.affordabilityIndex
  const commuteDeltaValue = aggregatedDeltas?.commute?.avg_minutes
  const vacancyDeltaValue = aggregatedDeltas?.vacancyRate
  const ownerOccupancyDeltaValue = aggregatedDeltas?.ownerOccupancy
  const profileDeltaValues = [
    aggregatedDeltas?.higherEdPercent,
    aggregatedDeltas?.diversityIndex,
    aggregatedDeltas?.affordabilityIndex,
    aggregatedDeltas?.densityIndex,
    aggregatedDeltas?.medianIncome !== undefined ? aggregatedDeltas.medianIncome / 1000 : undefined,
  ]

  const populationDelta = formatDelta(overviewDeltaValues.population, true)
  const medianIncomeDelta = formatDelta(overviewDeltaValues.income, true)
  const housingAffordabilityDelta = formatDelta(overviewDeltaValues.affordability, true)
  const environmentalDelta = formatDelta(overviewDeltaValues.environment, true)
  const livabilityDelta = formatDelta(overviewDeltaValues.livability, true)
  const trafficDelta = formatDelta(overviewDeltaValues.traffic, false)
  const higherEdDelta = formatDelta(educationDeltaSingleValue, true)
  const diversityDelta = formatDelta(diversityDeltaValue, true)
  const medianHomeValueDelta = formatDelta(homeValueDeltaValue, false)
  const affordabilityIndexDelta = formatDelta(affordabilityIndexDeltaValue, true)
  const commuteAvgDelta = formatDelta(commuteDeltaValue, false)
  const vacancyDelta = formatDelta(vacancyDeltaValue, false)
  const ownerOccupancyDelta = formatDelta(ownerOccupancyDeltaValue, true)

  const overviewScore = countDeltaChanges(Object.values(overviewDeltaValues))
  const demographicsScore = countDeltaChanges([...(raceDeltas ?? []), diversityDeltaValue])
  const educationScore = countDeltaChanges([...(educationDeltas ?? []), educationDeltaSingleValue])
  const costOfLivingScore = countDeltaChanges([overviewDeltaValues.income, homeValueDeltaValue, affordabilityIndexDeltaValue])
  const commuteScore = countDeltaChanges([commuteDeltaValue])
  const housingScore = countDeltaChanges([vacancyDeltaValue, ownerOccupancyDeltaValue])
  const profileScore = countDeltaChanges(profileDeltaValues)

  const overviewSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2">
        Overview
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Users className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50">
              Population
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {(aggregated.population / 1000).toFixed(1)}k
          </div>
          {populationDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${populationDelta.color}`}>
              {populationDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {populationDelta.display}
            </div>
          )}
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50">
              Avg Income
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            ${Math.round(aggregated.medianIncome / 1000)}k
          </div>
          {medianIncomeDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${medianIncomeDelta.color}`}>
              {medianIncomeDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              ${medianIncomeDelta.display}k
            </div>
          )}
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Home className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50">
              Affordability
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {aggregated.housingAffordability}/100
          </div>
          {housingAffordabilityDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${housingAffordabilityDelta.color}`}>
              {housingAffordabilityDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {housingAffordabilityDelta.display}
            </div>
          )}
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Leaf className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50">
              Environment
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {aggregated.environmentalScore}/100
          </div>
          {environmentalDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${environmentalDelta.color}`}>
              {environmentalDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {environmentalDelta.display}
            </div>
          )}
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Star className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50">
              Livability
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {aggregated.livabilityScore}/100
          </div>
          {livabilityDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${livabilityDelta.color}`}>
              {livabilityDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {livabilityDelta.display}
            </div>
          )}
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Car className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50">
              Traffic
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aggregated.trafficCongestion}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-neutral-400"
            />
          </div>
          <div className="text-[10px] text-white/50">
            {aggregated.trafficCongestion}%
          </div>
          {trafficDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${trafficDelta.color}`}>
              {trafficDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {trafficDelta.display}%
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  const demographicsSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2">
        Demographics
      </h3>
      <div className="h-40 mb-1">
        <DoughnutChart
          title=""
          labels={raceLabels}
          data={raceData}
          backgroundColor={raceColors}
          deltas={raceDeltas}
        />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-white/70 flex items-center justify-center gap-1">
          Diversity: {aggregated.diversityIndex.toFixed(2)}
          {diversityDelta && (
            <span className={`text-[10px] flex items-center gap-0.5 ${diversityDelta.color}`}>
              {diversityDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {diversityDelta.display}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )

  const educationSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2">
        Education
      </h3>
      <div className="h-40 mb-1">
        <DoughnutChart
          title=""
          labels={educationLabels}
          data={educationData}
          backgroundColor={educationColors}
          deltas={educationDeltas}
        />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-white/70 flex items-center justify-center gap-1">
          Higher Ed: {Math.round(aggregated.higherEdPercent)}%
          {higherEdDelta && (
            <span className={`text-[10px] flex items-center gap-0.5 ${higherEdDelta.color}`}>
              {higherEdDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {higherEdDelta.display}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )

  const costOfLivingSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2">
        Cost of Living
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
            <DollarSign className="w-3 h-3" />
            Median Income
          </div>
          <div className="text-sm font-semibold text-white">
            ${Math.round(aggregated.medianIncome / 1000)}k
          </div>
          {medianIncomeDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${medianIncomeDelta.color}`}>
              {medianIncomeDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              ${medianIncomeDelta.display}k
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
            <Home className="w-3 h-3" />
            Home Value
          </div>
          <div className="text-sm font-semibold text-white">
            ${Math.round(aggregated.medianHomeValue / 1000)}k
          </div>
          {medianHomeValueDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${medianHomeValueDelta.color}`}>
              {medianHomeValueDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              ${medianHomeValueDelta.display}k
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white/5 col-span-2">
          <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
            <Scale className="w-3 h-3" />
            Affordability Ratio
          </div>
          <div className="text-sm font-semibold text-white">
            {aggregated.affordabilityIndex.toFixed(2)}
          </div>
          {affordabilityIndexDelta && (
            <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${affordabilityIndexDelta.color}`}>
              {affordabilityIndexDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {affordabilityIndexDelta.display}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  const commuteSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2 flex items-center gap-1">
        Commute ({Math.round(aggregated.commute.avg_minutes)} min avg)
        {commuteAvgDelta && (
          <span className={`text-[10px] flex items-center gap-0.5 ${commuteAvgDelta.color}`}>
            {commuteAvgDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
            {commuteAvgDelta.display} min
          </span>
        )}
      </h3>
      <div className="h-24">
        <SegmentedBar segments={commuteSegments} />
      </div>
    </motion.div>
  )

  const housingSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2">
        Housing Stability
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-white/50 mb-1 flex items-center gap-1">
            Vacancy
            {vacancyDelta && (
              <span className={`text-[10px] flex items-center gap-0.5 ${vacancyDelta.color}`}>
                {vacancyDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {vacancyDelta.display}%
              </span>
            )}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aggregated.vacancyRate}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-neutral-500"
            />
          </div>
          <div className="text-xs font-medium text-white">
            {aggregated.vacancyRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/50 mb-1 flex items-center gap-1">
            Owner Occ.
            {ownerOccupancyDelta && (
              <span className={`text-[10px] flex items-center gap-0.5 ${ownerOccupancyDelta.color}`}>
                {ownerOccupancyDelta.isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {ownerOccupancyDelta.display}%
              </span>
            )}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aggregated.ownerOccupancy}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-neutral-300"
            />
          </div>
          <div className="text-xs font-medium text-white">
            {aggregated.ownerOccupancy.toFixed(1)}%
          </div>
        </div>
      </div>
    </motion.div>
  )

  const profileSection = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
      className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto mb-2"
    >
      <h3 className="text-xs font-medium text-white/60 mb-2">
        Urban Profile
      </h3>
      <div className="h-48">
        <RadarChart
          labels={['Education', 'Diversity', 'Affordability', 'Density', 'Income']}
          data={radarData}
          fillColor="rgba(163, 163, 163, 0.2)"
          borderColor="rgba(163, 163, 163, 0.8)"
        />
      </div>
    </motion.div>
  )

  const sections: PanelSection[] = [
    { id: 'overview', order: 0, score: overviewScore, node: overviewSection },
    { id: 'demographics', order: 1, score: demographicsScore, node: demographicsSection },
    { id: 'education', order: 2, score: educationScore, node: educationSection },
    { id: 'cost', order: 3, score: costOfLivingScore, node: costOfLivingSection },
    { id: 'commute', order: 4, score: commuteScore, node: commuteSection },
    { id: 'housing', order: 5, score: housingScore, node: housingSection },
    { id: 'profile', order: 6, score: profileScore, node: profileSection },
  ]

  const orderedSections = [...sections].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.order - b.order
  })

  return (
    <div className="fixed right-3 top-[60px] bottom-0 w-1/5 z-10 pointer-events-none">
      <div className="relative h-full pointer-events-auto">
        <div ref={containerRef} className="h-full overflow-y-auto pr-2 scrollbar-hide">
          <div className="py-1">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-1 mb-2 pointer-events-auto"
            >
              {selectedEvent ? (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white/70 leading-relaxed">
                    {selectedEvent.zoneName}
                  </h2>
                </div>
              ) : selectedZones.length === 0 ? (
                <h2 className="text-lg font-semibold text-white/70 leading-relaxed">
                  ALL ZONES
                </h2>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white/70 leading-relaxed">
                    {selectedZones.length} {selectedZones.length === 1 ? 'ZONE' : 'ZONES'} SELECTED
                  </h2>
                </div>
              )}
            </motion.div>

            {orderedSections.map((section) => (
              <Fragment key={section.id}>{section.node}</Fragment>
            ))}
          </div>
        </div>
        <AnimatePresence>
          {showGradient && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to top, rgba(2, 2, 2, 0.95) 0%, rgba(2, 2, 2, 0.7) 20%, rgba(2, 2, 2, 0.4) 40%, rgba(2, 2, 2, 0.1) 70%, transparent 100%)'
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
