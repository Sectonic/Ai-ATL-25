import { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { useNeighborhoods } from '../../services/geojsonApi'
import { Users, Home, DollarSign, Car, Leaf, Scale, Star } from 'lucide-react'
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

function aggregateNeighborhoodData(
  selectedZones: string[],
  zoneData: Record<string, any>,
  neighborhoodsData: GeoJSON.FeatureCollection | undefined
): AggregatedData | null {
  if (!neighborhoodsData) return null

  const zonesToAggregate = selectedZones.length === 0
    ? neighborhoodsData.features.map(f => f.properties?.name).filter(Boolean) as string[]
    : selectedZones

  if (zonesToAggregate.length === 0) return null

  const selectedZoneData = zonesToAggregate
    .map(name => {
      const zone = zoneData[name]
      if (!zone || !zone.properties) return null
      return zone.properties
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
    sum + (z.commute?.car_dependence || 0), 0) / selectedZoneData.length
  const avgDensityIndex = selectedZoneData.reduce((sum, z) => 
    sum + (z.derived?.density_index || 0), 0) / selectedZoneData.length
  
  const trafficCongestion = Math.min(100, avgCarDependence + (avgDensityIndex * 100))
  const environmentalScore = Math.max(0, 100 - trafficCongestion)

  const raceDistribution = {
    white: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.white || 0) * (z.population_total || 0)), 0) / totalPopulation,
    black: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.black || 0) * (z.population_total || 0)), 0) / totalPopulation,
    asian: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.asian || 0) * (z.population_total || 0)), 0) / totalPopulation,
    mixed: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.mixed || 0) * (z.population_total || 0)), 0) / totalPopulation,
    hispanic: selectedZoneData.reduce((sum, z) => sum + ((z.race_distribution?.hispanic || 0) * (z.population_total || 0)), 0) / totalPopulation,
  }

  const educationDistribution = {
    high_school_or_less: selectedZoneData.reduce((sum, z) => sum + (z.education_distribution?.high_school_or_less || 0), 0) / selectedZoneData.length,
    some_college: selectedZoneData.reduce((sum, z) => sum + (z.education_distribution?.some_college || 0), 0) / selectedZoneData.length,
    bachelors: selectedZoneData.reduce((sum, z) => sum + (z.education_distribution?.bachelors || 0), 0) / selectedZoneData.length,
    graduate: selectedZoneData.reduce((sum, z) => sum + (z.education_distribution?.graduate || 0), 0) / selectedZoneData.length,
  }

  const avgDiversityIndex = selectedZoneData.reduce((sum, z) => sum + (z.diversity_index || 0), 0) / selectedZoneData.length
  const avgHigherEdPercent = selectedZoneData.reduce((sum, z) => sum + (z.derived?.higher_ed_percent || 0), 0) / selectedZoneData.length
  
  const weightedHomeValue = selectedZoneData.reduce((sum, z) => 
    sum + ((z.median_home_value || 0) * (z.households || 0)), 0)
  const avgHomeValue = totalHouseholds > 0 ? weightedHomeValue / totalHouseholds : 0

  const avgCommuteMinutes = selectedZoneData.reduce((sum, z) => 
    sum + (z.commute?.avg_minutes || 0), 0) / selectedZoneData.length
  
  const avgVacancyRate = selectedZoneData.reduce((sum, z) => sum + (z.vacancy_rate || 0), 0) / selectedZoneData.length
  const avgOwnerOccupancy = selectedZoneData.reduce((sum, z) => sum + (z.owner_occupancy || 0), 0) / selectedZoneData.length

  const avgLivabilityScore = selectedZoneData.reduce((sum, z) => sum + (z.livability_index || 0), 0) / selectedZoneData.length;

  return {
    population: totalPopulation,
    medianIncome: avgIncome,
    housingAffordability: Math.round(avgAffordability * 10),
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
      transit_usage: selectedZoneData.reduce((sum, z) => sum + (z.commute?.transit_usage || 0), 0) / selectedZoneData.length,
    },
    vacancyRate: avgVacancyRate,
    ownerOccupancy: avgOwnerOccupancy,
    densityIndex: avgDensityIndex,
    selectedNames: zonesToAggregate,
  }
}

export function DataPanel() {
  const { selectedZones, zoneData } = useSimulationStore()
  const { data: neighborhoodsData } = useNeighborhoods()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showGradient, setShowGradient] = useState(false)

  const aggregated = useMemo(() => 
    aggregateNeighborhoodData(selectedZones, zoneData, neighborhoodsData),
    [selectedZones, zoneData, neighborhoodsData]
  )

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

  const educationLabels = ['High School', 'Some College', "Bachelor's", 'Graduate']
  const educationData = [
    aggregated.educationDistribution.high_school_or_less,
    aggregated.educationDistribution.some_college,
    aggregated.educationDistribution.bachelors,
    aggregated.educationDistribution.graduate,
  ]
  const educationColors = ['#525252', '#737373', '#a3a3a3', '#d4d4d4']

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
    Math.min(100, (aggregated.medianIncome / 200000) * 100),
    aggregated.higherEdPercent,
    aggregated.diversityIndex * 100,
    aggregated.densityIndex * 100,
    aggregated.affordabilityIndex * 10,
  ]

  return (
    <div className="fixed right-3 top-[60px] bottom-0 w-1/5 z-10 pointer-events-none">
      <div className="relative h-full pointer-events-auto">
        <div ref={containerRef} className="h-full overflow-y-auto pr-2 scrollbar-hide">
          <div className="space-y-2 py-1">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-1 mb-2 pointer-events-auto"
            >
              {selectedZones.length === 0 ? (
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
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
                </div>

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
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
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
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-white/70">
                  Diversity: {aggregated.diversityIndex.toFixed(2)}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
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
                />
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-white/70">
                  Higher Ed: {Math.round(aggregated.higherEdPercent)}%
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
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
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                    <Home className="w-3 h-3" />
                    Home Value
                  </div>
                  <div className="text-sm font-semibold text-white">
                    ${Math.round(aggregated.medianHomeValue / 1000)}k
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 col-span-2">
                  <div className="flex items-center gap-1 text-[10px] text-white/50 mb-0.5">
                    <Scale className="w-3 h-3" />
                    Affordability Ratio
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {aggregated.affordabilityIndex.toFixed(2)}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
            >
              <h3 className="text-xs font-medium text-white/60 mb-2">
                Commute ({Math.round(aggregated.commute.avg_minutes)} min avg)
              </h3>
              <div className="h-24">
                <SegmentedBar segments={commuteSegments} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
            >
              <h3 className="text-xs font-medium text-white/60 mb-2">
                Housing Stability
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-white/50 mb-1">
                    Vacancy
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
                  <div className="text-[10px] text-white/50 mb-1">
                    Owner Occ.
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

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
            >
              <h3 className="text-xs font-medium text-white/60 mb-2">
                Urban Profile
              </h3>
              <div className="h-48">
                <RadarChart
                  labels={['Income', 'Education', 'Diversity', 'Density', 'Affordability']}
                  data={radarData}
                  fillColor="rgba(163, 163, 163, 0.2)"
                  borderColor="rgba(163, 163, 163, 0.8)"
                />
              </div>
            </motion.div>
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
