import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { Users, TrendingUp, Home, DollarSign, Shield, Building2, Car, Leaf } from 'lucide-react'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: number
  unit?: string
  index?: number
  inverted?: boolean
}

interface CardData {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: number
  unit?: string
  inverted?: boolean
}

function MetricCard({ icon, label, value, change, unit = '', index = 0, inverted = false }: MetricCardProps) {
  const hasChange = change !== undefined && change !== 0
  const isPositive = change && change > 0
  const shouldBeGreen = inverted ? !isPositive : isPositive
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/70 mb-0.5 leading-tight">{label}</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${value}${unit}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-semibold text-white leading-tight"
            >
            {typeof value === 'number' ? value.toLocaleString() : value}{unit}
            </motion.div>
          </AnimatePresence>
          <AnimatePresence mode="wait">
          {hasChange && (
              <motion.div
                key={`change-${change}${unit}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={`text-xs mt-0.5 leading-tight ${shouldBeGreen ? 'text-green-400' : 'text-red-400'}`}
              >
              {isPositive ? '+' : ''}{change.toLocaleString()}{unit}
              </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export function DataPanel() {
  const { selectedZones, zoneData, cityMetrics } = useSimulationStore()

  const zoneMetrics = useMemo(() => {
    if (selectedZones.length === 0) return null
    
    const selectedZoneData = selectedZones.map(id => zoneData[id]).filter(Boolean)
    if (selectedZoneData.length === 0) return null

    const totalPop = selectedZoneData.reduce((sum, z) => sum + (z.population || 0), 0)
    const totalPopChange = selectedZoneData.reduce((sum, z) => sum + (z.populationChange || 0), 0)
    
    const totalHousing = selectedZoneData.reduce((sum, z) => sum + (z.housingUnits || 0), 0)
    const totalHousingChange = selectedZoneData.reduce((sum, z) => sum + (z.housingUnitsChange || 0), 0)
    
    const avgTraffic = selectedZoneData.reduce((sum, z) => sum + (z.trafficFlow || 0), 0) / selectedZoneData.length
    const avgTrafficChange = selectedZoneData.reduce((sum, z) => sum + (z.trafficFlowChange || 0), 0) / selectedZoneData.length
    
    const avgEconomic = selectedZoneData.reduce((sum, z) => sum + (z.economicIndex || 0), 0) / selectedZoneData.length
    const avgEconomicChange = selectedZoneData.reduce((sum, z) => sum + (z.economicIndexChange || 0), 0) / selectedZoneData.length

    const avgIncome = avgEconomic * 1000
    const avgIncomeChange = avgEconomicChange * 1000

    const housingDensity = totalPop > 0 ? Math.round((totalHousing / totalPop) * 100) : 0
    const newTotalPop = totalPop + totalPopChange
    const newTotalHousing = totalHousing + totalHousingChange
    const newHousingDensity = newTotalPop > 0 ? Math.round((newTotalHousing / newTotalPop) * 100) : 0
    const housingDensityChange = newHousingDensity - housingDensity

    const trafficCongestion = Math.round(avgTraffic)
    const trafficCongestionChange = Math.round(avgTrafficChange)

    const environmentalScore = Math.round(100 - trafficCongestion)
    const environmentalScoreChange = -trafficCongestionChange

    return {
      totalPopulation: totalPop,
      totalPopulationChange: totalPopChange,
      totalHousing: totalHousing,
      totalHousingChange: totalHousingChange,
      avgTraffic: Math.round(avgTraffic),
      avgTrafficChange: Math.round(avgTrafficChange),
      avgEconomic: Math.round(avgEconomic),
      avgEconomicChange: Math.round(avgEconomicChange),
      avgIncome,
      avgIncomeChange,
      housingDensity,
      housingDensityChange,
      trafficCongestion,
      trafficCongestionChange,
      environmentalScore,
      environmentalScoreChange,
      zoneCount: selectedZones.length,
    }
  }, [selectedZones, zoneData])

  const metrics = zoneMetrics || cityMetrics

  if (!cityMetrics || !metrics) {
    return null
  }

  const cards: CardData[] = zoneMetrics ? [
    { icon: <Users className="w-3.5 h-3.5 text-white/90" />, label: "Population", value: zoneMetrics.totalPopulation, change: zoneMetrics.totalPopulationChange !== 0 ? zoneMetrics.totalPopulationChange : undefined },
    { icon: <DollarSign className="w-3.5 h-3.5 text-white/90" />, label: "Avg Income", value: `$${(zoneMetrics.avgIncome / 1000).toFixed(0)}k`, change: zoneMetrics.avgIncomeChange !== 0 ? Math.round(zoneMetrics.avgIncomeChange / 1000) : undefined },
    { icon: <Home className="w-3.5 h-3.5 text-white/90" />, label: "Housing Units", value: zoneMetrics.totalHousing, change: zoneMetrics.totalHousingChange !== 0 ? zoneMetrics.totalHousingChange : undefined },
    { icon: <Building2 className="w-3.5 h-3.5 text-white/90" />, label: "Housing Density", value: zoneMetrics.housingDensity, unit: "%", change: zoneMetrics.housingDensityChange !== 0 ? zoneMetrics.housingDensityChange : undefined, inverted: true },
    { icon: <Car className="w-3.5 h-3.5 text-white/90" />, label: "Traffic Congestion", value: zoneMetrics.trafficCongestion, change: zoneMetrics.trafficCongestionChange !== 0 ? zoneMetrics.trafficCongestionChange : undefined, inverted: true },
    { icon: <Leaf className="w-3.5 h-3.5 text-white/90" />, label: "Environmental Score", value: zoneMetrics.environmentalScore, change: zoneMetrics.environmentalScoreChange !== 0 ? zoneMetrics.environmentalScoreChange : undefined },
  ] : [
    { icon: <Users className="w-3.5 h-3.5 text-white/90" />, label: "Population", value: cityMetrics.population, change: cityMetrics.populationChange },
    { icon: <DollarSign className="w-3.5 h-3.5 text-white/90" />, label: "Avg Income", value: `$${(cityMetrics.averageIncome / 1000).toFixed(0)}k`, change: cityMetrics.averageIncomeChange ? Math.round(cityMetrics.averageIncomeChange / 1000) : undefined },
    { icon: <TrendingUp className="w-3.5 h-3.5 text-white/90" />, label: "Unemployment", value: cityMetrics.unemploymentRate, unit: "%", change: cityMetrics.unemploymentRateChange, inverted: true },
    { icon: <Home className="w-3.5 h-3.5 text-white/90" />, label: "Housing Affordability", value: cityMetrics.housingAffordabilityIndex, change: cityMetrics.housingAffordabilityIndexChange },
    { icon: <Car className="w-3.5 h-3.5 text-white/90" />, label: "Traffic Congestion", value: cityMetrics.trafficCongestionIndex, change: cityMetrics.trafficCongestionIndexChange, inverted: true },
    { icon: <Shield className="w-3.5 h-3.5 text-white/90" />, label: "Crime Rate", value: cityMetrics.crimeRate, unit: "/1000", change: cityMetrics.crimeRateChange, inverted: true },
    { icon: <Building2 className="w-3.5 h-3.5 text-white/90" />, label: "Housing Density", value: Math.round((cityMetrics.population / 500000) * 100), unit: "%", change: cityMetrics.populationChange ? Math.round((cityMetrics.populationChange / 500000) * 100) : undefined, inverted: true },
    { icon: <Leaf className="w-3.5 h-3.5 text-white/90" />, label: "Environmental Score", value: Math.round(100 - cityMetrics.trafficCongestionIndex), change: cityMetrics.trafficCongestionIndexChange ? Math.round(-cityMetrics.trafficCongestionIndexChange) : undefined },
  ]

  return (
    <div className="fixed right-3 top-[60px] w-1/4 z-10 pointer-events-none overflow-visible">
      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => (
            <MetricCard
              key={`${zoneMetrics ? 'zone' : 'city'}-${index}-${card.label}`}
              icon={card.icon}
              label={card.label}
              value={card.value}
              change={card.change}
              unit={card.unit}
              index={index}
              inverted={card.inverted}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
