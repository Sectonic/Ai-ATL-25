import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { Users, TrendingUp, Home, Wind, DollarSign, Shield, Building2, Car, Leaf } from 'lucide-react'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: number
  unit?: string
}

function MetricCard({ icon, label, value, change, unit = '' }: MetricCardProps) {
  const hasChange = change !== undefined && change !== 0
  const isPositive = change && change > 0
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/70 mb-0.5 leading-tight">{label}</div>
          <div className="text-lg font-semibold text-white leading-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}{unit}
          </div>
          {hasChange && (
            <div className={`text-xs mt-0.5 leading-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{change.toLocaleString()}{unit}
            </div>
          )}
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

    const totalPop = selectedZoneData.reduce((sum, z) => sum + z.population, 0)
    const totalHousing = selectedZoneData.reduce((sum, z) => sum + z.housingUnits, 0)
    const avgTraffic = selectedZoneData.reduce((sum, z) => sum + z.trafficFlow, 0) / selectedZoneData.length
    const avgEconomic = selectedZoneData.reduce((sum, z) => sum + z.economicIndex, 0) / selectedZoneData.length

    return {
      totalPopulation: totalPop,
      totalHousing: totalHousing,
      avgTraffic: Math.round(avgTraffic),
      avgEconomic: Math.round(avgEconomic),
      zoneCount: selectedZones.length,
    }
  }, [selectedZones, zoneData])

  const metrics = zoneMetrics || cityMetrics

  if (!metrics) {
    return null
  }

  return (
    <div className="fixed right-3 top-3 w-1/4 z-10 pointer-events-none overflow-visible">
      <div className="space-y-2">
        {zoneMetrics ? (
          <>
            <MetricCard
              icon={<Users className="w-3.5 h-3.5 text-white/90" />}
              label="Population"
              value={zoneMetrics.totalPopulation}
            />
            <MetricCard
              icon={<Home className="w-3.5 h-3.5 text-white/90" />}
              label="Housing Units"
              value={zoneMetrics.totalHousing}
            />
            <MetricCard
              icon={<Car className="w-3.5 h-3.5 text-white/90" />}
              label="Traffic Flow"
              value={zoneMetrics.avgTraffic}
            />
            <MetricCard
              icon={<DollarSign className="w-3.5 h-3.5 text-white/90" />}
              label="Economic Index"
              value={zoneMetrics.avgEconomic}
            />
          </>
        ) : (
          <>
            <MetricCard
              icon={<Users className="w-3.5 h-3.5 text-white/90" />}
              label="Population"
              value={cityMetrics.population}
              change={cityMetrics.populationChange}
            />
            <MetricCard
              icon={<DollarSign className="w-3.5 h-3.5 text-white/90" />}
              label="Avg Income"
              value={`$${(cityMetrics.averageIncome / 1000).toFixed(0)}k`}
              change={cityMetrics.averageIncomeChange ? Math.round(cityMetrics.averageIncomeChange / 1000) : undefined}
            />
            <MetricCard
              icon={<TrendingUp className="w-3.5 h-3.5 text-white/90" />}
              label="Unemployment"
              value={cityMetrics.unemploymentRate}
              unit="%"
              change={cityMetrics.unemploymentRateChange}
            />
            <MetricCard
              icon={<Home className="w-3.5 h-3.5 text-white/90" />}
              label="Housing Affordability"
              value={cityMetrics.housingAffordabilityIndex}
              change={cityMetrics.housingAffordabilityIndexChange}
            />
            <MetricCard
              icon={<Car className="w-3.5 h-3.5 text-white/90" />}
              label="Traffic Congestion"
              value={cityMetrics.trafficCongestionIndex}
              change={cityMetrics.trafficCongestionIndexChange}
            />
            <MetricCard
              icon={<Wind className="w-3.5 h-3.5 text-white/90" />}
              label="Air Quality"
              value={cityMetrics.airQualityIndex}
              change={cityMetrics.airQualityIndexChange}
            />
            <MetricCard
              icon={<Shield className="w-3.5 h-3.5 text-white/90" />}
              label="Crime Rate"
              value={cityMetrics.crimeRate}
              unit="/1000"
              change={cityMetrics.crimeRateChange}
            />
            <MetricCard
              icon={<Building2 className="w-3.5 h-3.5 text-white/90" />}
              label="Housing Density"
              value={Math.round((cityMetrics.population / 500000) * 100)}
              unit="%"
            />
            <MetricCard
              icon={<Leaf className="w-3.5 h-3.5 text-white/90" />}
              label="Environmental Score"
              value={Math.round((cityMetrics.airQualityIndex * 0.7 + (100 - cityMetrics.trafficCongestionIndex) * 0.3))}
            />
          </>
        )}
      </div>
    </div>
  )
}

