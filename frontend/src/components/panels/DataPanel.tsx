import { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore, type NeighborhoodProperties, type NeighborhoodMetrics } from '../../stores/simulationStore'
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

function aggregateNeighborhoodData(
  selectedZones: string[],
  neighborhoodData: Record<string, NeighborhoodProperties>,
  neighborhoodsData: GeoJSON.FeatureCollection | undefined
): AggregatedData | null {
  if (!neighborhoodsData) return null

  const zonesToAggregate = selectedZones.length === 0
    ? neighborhoodsData.features.map(f => f.properties?.name).filter(Boolean) as string[]
    : selectedZones

  if (zonesToAggregate.length === 0) return null

  const selectedZoneData = zonesToAggregate
    .map(name => {
      const simulatedData = neighborhoodData[name]
      if (simulatedData) {
        return simulatedData
      }
      const feature = neighborhoodsData.features.find(f => f.properties?.name === name)
      if (!feature || !feature.properties) return null
      return feature.properties as any
    })
    .filter(Boolean)

  if (selectedZoneData.length === 0) return null

  const totalPopulation = selectedZoneData.reduce((sum, z) => sum + (z.population_total || 0), 0)
  const totalHouseholds = selectedZoneData.reduce((sum, z) => sum + (z.households || 0), 0)

  const weightedIncome = selectedZoneData.reduce((sum, z) =>
    sum + ((z.median_income || 0) * (z.households || 0)), 0)
  const avgIncome = totalHouseholds > 0 ? weightedIncome / totalHouseholds : 0

  const avgAffordability = selectedZoneData.reduce((sum, z) =>
    sum + (z.affordability_index || 0), 0) / selectedZoneData.length

  const avgCarDependence = selectedZoneData.reduce((sum, z) =>
    sum + ((z.commute?.car_dependence || 0) * (z.population_total || 0)), 0) / totalPopulation
  const avgDensityIndex = selectedZoneData.reduce((sum, z) =>
    sum + ((z.derived?.density_index || 0) * (z.population_total || 0)), 0) / totalPopulation

  const trafficCongestion = Math.min(100, avgCarDependence + (avgDensityIndex * 100))
  const environmentalScore = Math.max(0, 100 - trafficCongestion)

  const raceDistribution = {
    white: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.white || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation,
    black: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.black || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation,
    asian: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.asian || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation,
    mixed: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.mixed || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation,
    hispanic: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.hispanic || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation,
  }

  const educationDistribution = {
    high_school_or_less: selectedZoneData.reduce((sum, z) => 
      sum + ((z.education_distribution?.high_school_or_less || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation * 100,
    some_college: selectedZoneData.reduce((sum, z) => 
      sum + ((z.education_distribution?.some_college || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation * 100,
    bachelors: selectedZoneData.reduce((sum, z) => 
      sum + ((z.education_distribution?.bachelors || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation * 100,
    graduate: selectedZoneData.reduce((sum, z) => 
      sum + ((z.education_distribution?.graduate || 0) / 100 * (z.population_total || 0)), 0) / totalPopulation * 100,
  }

  const avgDiversityIndex = selectedZoneData.reduce((sum, z) => 
    sum + ((z.diversity_index || 0) * (z.population_total || 0)), 0) / totalPopulation
  const avgHigherEdPercent = selectedZoneData.reduce((sum, z) => 
    sum + ((z.derived?.higher_ed_percent || 0) * (z.population_total || 0)), 0) / totalPopulation

  const weightedHomeValue = selectedZoneData.reduce((sum, z) =>
    sum + ((z.median_home_value || 0) * (z.households || 0)), 0)
  const avgHomeValue = totalHouseholds > 0 ? weightedHomeValue / totalHouseholds : 0

  const avgCommuteMinutes = selectedZoneData.reduce((sum, z) =>
    sum + ((z.commute?.avg_minutes || 0) * (z.population_total || 0)), 0) / totalPopulation

  const avgVacancyRate = selectedZoneData.reduce((sum, z) => sum + (z.vacancy_rate || 0), 0) / selectedZoneData.length
  const avgOwnerOccupancy = selectedZoneData.reduce((sum, z) => sum + (z.owner_occupancy || 0), 0) / selectedZoneData.length

  const avgLivabilityScore = selectedZoneData.reduce((sum, z) => 
    sum + ((z.livability_index || 0) * (z.population_total || 0)), 0) / totalPopulation

  const affordabilityScore = Math.min(100, Math.max(0, 100 - (avgAffordability * 10)))

  return {
    population: totalPopulation,
    medianIncome: avgIncome,
    housingAffordability: Math.round(affordabilityScore),
    environmentalScore: Math.round(environmentalScore),
    livabilityScore: Math.round(avgLivabilityScore),
    trafficCongestion: Math.round(trafficCongestion),
    raceDistribution,
    educationDistribution,
    diversityIndex: avgDiversityIndex,
    higherEdPercent: avgHigherEdPercent,
    medianHomeValue: avgHomeValue,
    affordabilityIndex: avgAffordability,
    commute: {
      avg_minutes: avgCommuteMinutes,
      car_dependence: avgCarDependence,
      transit_usage: selectedZoneData.reduce((sum, z) => 
        sum + ((z.commute?.transit_usage || 0) * (z.population_total || 0)), 0) / totalPopulation,
    },
    vacancyRate: avgVacancyRate,
    ownerOccupancy: avgOwnerOccupancy,
    densityIndex: avgDensityIndex,
    selectedNames: zonesToAggregate,
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

function formatDelta(value: number | undefined, positiveIsGood: boolean = true): { display: string; isPositive: boolean; color: string } | null {
  if (value === undefined || Math.abs(value) < EPSILON) return null
  const isPositive = value > 0
  const isGood = positiveIsGood ? isPositive : !isPositive
  return {
    display: `${isPositive ? '+' : ''}${value.toFixed(1)}`,
    isPositive,
    color: isGood ? 'text-green-400' : 'text-red-400',
  }
}

function getAffectedMetrics(eventMetrics?: NeighborhoodMetrics): Set<string> {
  if (!eventMetrics) return new Set()
  
  const affected = new Set<string>()
  
  if (eventMetrics.population_total !== undefined) affected.add('population')
  if (eventMetrics.median_income !== undefined) affected.add('income')
  if (eventMetrics.median_home_value !== undefined) affected.add('homeValue')
  if (eventMetrics.affordability_index !== undefined) affected.add('affordability')
  if (eventMetrics.vacancy_rate !== undefined) affected.add('vacancy')
  if (eventMetrics.owner_occupancy !== undefined) affected.add('ownerOccupancy')
  if (eventMetrics.derived?.density_index !== undefined || eventMetrics.commute !== undefined) affected.add('environmental')
  if (eventMetrics.livability_index !== undefined) affected.add('livability')
  if (eventMetrics.commute !== undefined) affected.add('traffic')
  if (eventMetrics.race_distribution !== undefined || eventMetrics.diversity_index !== undefined) affected.add('demographics')
  if (eventMetrics.education_distribution !== undefined || eventMetrics.derived?.higher_ed_percent !== undefined) affected.add('education')
  if (eventMetrics.commute !== undefined) affected.add('commute')
  
  return affected
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

  const affectedMetrics = useMemo(() => {
    return selectedEvent ? getAffectedMetrics(selectedEvent.metrics) : new Set<string>()
  }, [selectedEvent])

  const hasSimulation = Object.keys(simulatedNeighborhoodData).length > 0
  const dataToUse = hasSimulation ? simulatedNeighborhoodData : originalNeighborhoodData

  const aggregated = useMemo(() => {
    if (selectedEvent && selectedEvent.metrics) {
      const eventZone = selectedEvent.zoneName
      const eventData: Record<string, NeighborhoodProperties> = {}
      
      if (neighborhoodsData) {
        const feature = neighborhoodsData.features.find(f => f.properties?.name === eventZone)
        if (feature?.properties) {
          const original = feature.properties as any
          const updated = {
            ...original,
            ...(selectedEvent.metrics.population_total !== undefined && { population_total: selectedEvent.metrics.population_total }),
            ...(selectedEvent.metrics.median_income !== undefined && { median_income: selectedEvent.metrics.median_income }),
            ...(selectedEvent.metrics.median_home_value !== undefined && { median_home_value: selectedEvent.metrics.median_home_value }),
            ...(selectedEvent.metrics.affordability_index !== undefined && { affordability_index: selectedEvent.metrics.affordability_index }),
            ...(selectedEvent.metrics.vacancy_rate !== undefined && { vacancy_rate: selectedEvent.metrics.vacancy_rate }),
            ...(selectedEvent.metrics.owner_occupancy !== undefined && { owner_occupancy: selectedEvent.metrics.owner_occupancy }),
            ...(selectedEvent.metrics.livability_index !== undefined && { livability_index: selectedEvent.metrics.livability_index }),
            ...(selectedEvent.metrics.diversity_index !== undefined && { diversity_index: selectedEvent.metrics.diversity_index }),
            ...(selectedEvent.metrics.education_distribution !== undefined && { education_distribution: selectedEvent.metrics.education_distribution }),
            ...(selectedEvent.metrics.race_distribution !== undefined && { race_distribution: selectedEvent.metrics.race_distribution }),
            ...(selectedEvent.metrics.commute !== undefined && { commute: selectedEvent.metrics.commute }),
            ...(selectedEvent.metrics.derived !== undefined && { derived: selectedEvent.metrics.derived }),
          }
          eventData[eventZone] = updated
        }
      }
      
      return aggregateNeighborhoodData([eventZone], eventData, neighborhoodsData)
    }

    if (Object.keys(dataToUse).length === 0 && neighborhoodsData) {
      const fallbackData: Record<string, NeighborhoodProperties> = {}
      neighborhoodsData.features.forEach((feature) => {
        if (feature.properties?.name) {
          fallbackData[feature.properties.name] = feature.properties as any
        }
      })
      return aggregateNeighborhoodData(selectedZones, fallbackData, neighborhoodsData)
    }
    return aggregateNeighborhoodData(selectedZones, dataToUse, neighborhoodsData)
  }, [selectedZones, dataToUse, neighborhoodsData, selectedEvent])

  const aggregatedDeltas = useMemo(() => {
    if (selectedEvent && selectedEvent.metrics && neighborhoodsData) {
      const eventZone = selectedEvent.zoneName
      const originalData: Record<string, NeighborhoodProperties> = {}
      const simulatedData: Record<string, NeighborhoodProperties> = {}
      
      const feature = neighborhoodsData.features.find(f => f.properties?.name === eventZone)
      if (feature?.properties) {
        const original = feature.properties as any
        originalData[eventZone] = original
        
        const updated = {
          ...original,
          ...(selectedEvent.metrics.population_total !== undefined && { population_total: selectedEvent.metrics.population_total }),
          ...(selectedEvent.metrics.median_income !== undefined && { median_income: selectedEvent.metrics.median_income }),
          ...(selectedEvent.metrics.median_home_value !== undefined && { median_home_value: selectedEvent.metrics.median_home_value }),
          ...(selectedEvent.metrics.affordability_index !== undefined && { affordability_index: selectedEvent.metrics.affordability_index }),
          ...(selectedEvent.metrics.vacancy_rate !== undefined && { vacancy_rate: selectedEvent.metrics.vacancy_rate }),
          ...(selectedEvent.metrics.owner_occupancy !== undefined && { owner_occupancy: selectedEvent.metrics.owner_occupancy }),
          ...(selectedEvent.metrics.livability_index !== undefined && { livability_index: selectedEvent.metrics.livability_index }),
          ...(selectedEvent.metrics.diversity_index !== undefined && { diversity_index: selectedEvent.metrics.diversity_index }),
          ...(selectedEvent.metrics.education_distribution !== undefined && { education_distribution: selectedEvent.metrics.education_distribution }),
          ...(selectedEvent.metrics.race_distribution !== undefined && { race_distribution: selectedEvent.metrics.race_distribution }),
          ...(selectedEvent.metrics.commute !== undefined && { commute: selectedEvent.metrics.commute }),
          ...(selectedEvent.metrics.derived !== undefined && { derived: selectedEvent.metrics.derived }),
        }
        simulatedData[eventZone] = updated
      }
      
      return calculateAggregatedDeltas([eventZone], originalData, simulatedData, neighborhoodsData)
    }

    if (simulationStatus !== 'complete' || !hasSimulation) return null
    return calculateAggregatedDeltas(selectedZones, originalNeighborhoodData, simulatedNeighborhoodData, neighborhoodsData)
  }, [selectedZones, simulationStatus, hasSimulation, originalNeighborhoodData, simulatedNeighborhoodData, neighborhoodsData, selectedEvent])

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
  const raceDeltas = aggregatedDeltas?.raceDistribution ? [
    aggregatedDeltas.raceDistribution.white,
    aggregatedDeltas.raceDistribution.black,
    aggregatedDeltas.raceDistribution.asian,
    aggregatedDeltas.raceDistribution.mixed,
    aggregatedDeltas.raceDistribution.hispanic,
  ] : undefined

  const educationLabels = ['High School', 'Some College', "Bachelor's", 'Graduate']
  const educationData = [
    aggregated.educationDistribution.high_school_or_less,
    aggregated.educationDistribution.some_college,
    aggregated.educationDistribution.bachelors,
    aggregated.educationDistribution.graduate,
  ]
  
  const educationColors = ['#525252', '#737373', '#a3a3a3', '#d4d4d4']
  const educationDeltas = aggregatedDeltas?.educationDistribution ? [
    aggregatedDeltas.educationDistribution.high_school_or_less,
    aggregatedDeltas.educationDistribution.some_college,
    aggregatedDeltas.educationDistribution.bachelors,
    aggregatedDeltas.educationDistribution.graduate,
  ] : undefined

  const commuteSegments = [
    { value: aggregated.commute.car_dependence, color: '#737373', label: 'Car' },
    { value: aggregated.commute.transit_usage, color: '#a3a3a3', label: 'Transit' },
    {
      value: Math.max(0, 100 - aggregated.commute.car_dependence - aggregated.commute.transit_usage),
      color: '#d4d4d4',
      label: 'Other'
    },
  ]

  const radarData = [
    Math.round(aggregated.higherEdPercent),
    Math.round(aggregated.diversityIndex * 100),
    Math.round(Math.min(100, Math.max(0, 100 - (aggregated.affordabilityIndex * 10)))),
    Math.round(aggregated.densityIndex * 100),
    Math.round(Math.min(100, (aggregated.medianIncome / 200000) * 100)),
  ]

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
                {(!selectedEvent || affectedMetrics.has('population')) && (
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
                    {aggregatedDeltas?.population !== undefined && Math.abs(aggregatedDeltas.population) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.population / 1000, true)?.color || ''}`}>
                        {aggregatedDeltas.population > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.population / 1000, true)?.display}
                      </div>
                    )}
                  </div>
                )}

                {(!selectedEvent || affectedMetrics.has('income')) && (
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
                    {aggregatedDeltas?.medianIncome !== undefined && Math.abs(aggregatedDeltas.medianIncome) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.medianIncome / 1000, true)?.color || ''}`}>
                        {aggregatedDeltas.medianIncome > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        ${formatDelta(aggregatedDeltas.medianIncome / 1000, true)?.display}k
                      </div>
                    )}
                  </div>
                )}

                {(!selectedEvent || affectedMetrics.has('affordability')) && (
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
                    {aggregatedDeltas?.housingAffordability !== undefined && Math.abs(aggregatedDeltas.housingAffordability) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.housingAffordability, true)?.color || ''}`}>
                        {aggregatedDeltas.housingAffordability > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.housingAffordability, true)?.display}
                      </div>
                    )}
                  </div>
                )}

                {(!selectedEvent || affectedMetrics.has('environmental')) && (
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Leaf className="w-3 h-3 text-white/60" />
                      <span className="text-[10px] text-white/50">
                        Environmental
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {aggregated.environmentalScore}/100
                    </div>
                    {aggregatedDeltas?.environmentalScore !== undefined && Math.abs(aggregatedDeltas.environmentalScore) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.environmentalScore, true)?.color || ''}`}>
                        {aggregatedDeltas.environmentalScore > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.environmentalScore, true)?.display}
                      </div>
                    )}
                  </div>
                )}

                {(!selectedEvent || affectedMetrics.has('livability')) && (
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
                    {aggregatedDeltas?.livabilityScore !== undefined && Math.abs(aggregatedDeltas.livabilityScore) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.livabilityScore, true)?.color || ''}`}>
                        {aggregatedDeltas.livabilityScore > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.livabilityScore, true)?.display}
                      </div>
                    )}
                  </div>
                )}

                {(!selectedEvent || affectedMetrics.has('traffic')) && (
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
                    {aggregatedDeltas?.trafficCongestion !== undefined && Math.abs(aggregatedDeltas.trafficCongestion) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.trafficCongestion, false)?.color || ''}`}>
                        {aggregatedDeltas.trafficCongestion > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.trafficCongestion, false)?.display}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            <AnimatePresence mode="popLayout">
              {(!selectedEvent || affectedMetrics.has('demographics')) && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto overflow-hidden"
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
                  {aggregatedDeltas?.diversityIndex !== undefined && Math.abs(aggregatedDeltas.diversityIndex) >= EPSILON && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${formatDelta(aggregatedDeltas.diversityIndex, true)?.color || ''}`}>
                      {aggregatedDeltas.diversityIndex > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                      {formatDelta(aggregatedDeltas.diversityIndex, true)?.display}
                    </span>
                  )}
                </div>
              </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {(!selectedEvent || affectedMetrics.has('education')) && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto overflow-hidden"
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
                  {aggregatedDeltas?.higherEdPercent !== undefined && Math.abs(aggregatedDeltas.higherEdPercent) >= EPSILON && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${formatDelta(aggregatedDeltas.higherEdPercent, true)?.color || ''}`}>
                      {aggregatedDeltas.higherEdPercent > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                      {formatDelta(aggregatedDeltas.higherEdPercent, true)?.display}%
                    </span>
                  )}
                </div>
              </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {(!selectedEvent || affectedMetrics.has('income') || affectedMetrics.has('homeValue') || affectedMetrics.has('affordability')) && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto overflow-hidden"
                >
                <h3 className="text-xs font-medium text-white/60 mb-2">
                  Cost of Living
                </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {(!selectedEvent || affectedMetrics.has('income')) && (
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                      <DollarSign className="w-3 h-3" />
                      Median Income
                    </div>
                    <div className="text-sm font-semibold text-white">
                      ${Math.round(aggregated.medianIncome / 1000)}k
                    </div>
                    {aggregatedDeltas?.medianIncome !== undefined && Math.abs(aggregatedDeltas.medianIncome) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.medianIncome / 1000, true)?.color || ''}`}>
                        {aggregatedDeltas.medianIncome > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        ${formatDelta(aggregatedDeltas.medianIncome / 1000, true)?.display}k
                      </div>
                    )}
                  </div>
                )}
                {(!selectedEvent || affectedMetrics.has('homeValue')) && (
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                      <Home className="w-3 h-3" />
                      Home Value
                    </div>
                    <div className="text-sm font-semibold text-white">
                      ${Math.round(aggregated.medianHomeValue / 1000)}k
                    </div>
                    {aggregatedDeltas?.medianHomeValue !== undefined && Math.abs(aggregatedDeltas.medianHomeValue) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.medianHomeValue / 1000, false)?.color || ''}`}>
                        {aggregatedDeltas.medianHomeValue > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        ${formatDelta(aggregatedDeltas.medianHomeValue / 1000, false)?.display}k
                      </div>
                    )}
                  </div>
                )}
                {(!selectedEvent || affectedMetrics.has('affordability')) && (
                  <div className={`p-2 rounded-lg bg-white/5 ${(!selectedEvent || affectedMetrics.has('income') || affectedMetrics.has('homeValue')) ? 'col-span-2' : ''}`}>
                    <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                      <Scale className="w-3 h-3" />
                      Affordability Ratio
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {aggregated.affordabilityIndex.toFixed(2)}
                    </div>
                    {aggregatedDeltas?.affordabilityIndex !== undefined && Math.abs(aggregatedDeltas.affordabilityIndex) >= EPSILON && (
                      <div className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${formatDelta(aggregatedDeltas.affordabilityIndex, true)?.color || ''}`}>
                        {aggregatedDeltas.affordabilityIndex > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.affordabilityIndex, true)?.display}
                      </div>
                    )}
                  </div>
                )}
              </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {(!selectedEvent || affectedMetrics.has('commute')) && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto overflow-hidden"
                >
                <h3 className="text-xs font-medium text-white/60 mb-2 flex items-center gap-1">
                  Commute ({Math.round(aggregated.commute.avg_minutes)} min avg)
                {aggregatedDeltas?.commute?.avg_minutes !== undefined && Math.abs(aggregatedDeltas.commute.avg_minutes) >= EPSILON && (
                  <span className={`text-[10px] flex items-center gap-0.5 ${formatDelta(aggregatedDeltas.commute.avg_minutes, false)?.color || ''}`}>
                    {aggregatedDeltas.commute.avg_minutes > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                    {formatDelta(aggregatedDeltas.commute.avg_minutes, false)?.display} min
                  </span>
                )}
              </h3>
              <div className="h-24">
                <SegmentedBar segments={commuteSegments} />
              </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {(!selectedEvent || affectedMetrics.has('vacancy') || affectedMetrics.has('ownerOccupancy')) && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto overflow-hidden"
                >
                <h3 className="text-xs font-medium text-white/60 mb-2">
                  Housing Stability
                </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-white/50 mb-1 flex items-center gap-1">
                    Vacancy
                    {aggregatedDeltas?.vacancyRate !== undefined && Math.abs(aggregatedDeltas.vacancyRate) >= EPSILON && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${formatDelta(aggregatedDeltas.vacancyRate, false)?.color || ''}`}>
                        {aggregatedDeltas.vacancyRate > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.vacancyRate, false)?.display}%
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
                    {aggregatedDeltas?.ownerOccupancy !== undefined && Math.abs(aggregatedDeltas.ownerOccupancy) >= EPSILON && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${formatDelta(aggregatedDeltas.ownerOccupancy, true)?.color || ''}`}>
                        {aggregatedDeltas.ownerOccupancy > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {formatDelta(aggregatedDeltas.ownerOccupancy, true)?.display}%
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
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {(!selectedEvent || affectedMetrics.size > 3) && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto overflow-hidden"
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
              )}
            </AnimatePresence>
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
