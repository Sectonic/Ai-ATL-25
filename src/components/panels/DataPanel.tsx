import { useMemo } from 'react'
import { useSimulationStore } from '../../stores/simulationStore'
import { Card } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { LineChart } from '../charts/LineChart'
import { BarChart } from '../charts/BarChart'
import { DoughnutChart } from '../charts/DoughnutChart'
import { Users, TrendingUp, Home, AlertTriangle, Wind, DollarSign } from 'lucide-react'

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
    <Card className="p-4 bg-slate-950 border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            {icon}
            <span>{label}</span>
          </div>
          <div className="text-2xl font-semibold text-slate-100">
            {typeof value === 'number' ? value.toLocaleString() : value}{unit}
          </div>
          {hasChange && (
            <div className={`text-xs mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{change.toLocaleString()}{unit}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function DataPanel() {
  const { selectedZones, zoneData, cityMetrics } = useSimulationStore()

  const displayData = useMemo(() => {
    if (selectedZones.length > 0) {
      const selectedZoneData = selectedZones.map(id => zoneData[id]).filter(Boolean)
      const totalPop = selectedZoneData.reduce((sum, z) => sum + z.population, 0)
      const totalHousing = selectedZoneData.reduce((sum, z) => sum + z.housingUnits, 0)
      const avgTraffic = selectedZoneData.length > 0 
        ? selectedZoneData.reduce((sum, z) => sum + z.trafficFlow, 0) / selectedZoneData.length 
        : 0

      return {
        isZoneSpecific: true,
        zones: selectedZoneData,
        totalPopulation: totalPop,
        totalHousing: totalHousing,
        avgTraffic: Math.round(avgTraffic),
      }
    }

    return {
      isZoneSpecific: false,
      cityMetrics,
    }
  }, [selectedZones, zoneData, cityMetrics])

  const populationTrendData = useMemo(() => {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Population',
          data: [495000, 496200, 497100, 497800, 498200, cityMetrics.population],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
    }
  }, [cityMetrics.population])

  const economicData = useMemo(() => {
    return {
      labels: ['Tech', 'Healthcare', 'Finance', 'Retail', 'Other'],
      data: [28, 22, 18, 15, 17],
    }
  }, [])

  const trafficData = useMemo(() => {
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      datasets: [
        {
          label: 'Traffic Index',
          data: [65, 68, 70, 68, cityMetrics.trafficCongestionIndex],
          backgroundColor: '#22d3ee',
        },
      ],
    }
  }, [cityMetrics.trafficCongestionIndex])

  return (
    <div className="fixed right-4 top-4 bottom-4 w-96 z-10">
      <Card className="h-full bg-slate-900/80 backdrop-blur-md border-slate-800 shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            {displayData.isZoneSpecific 
              ? `Zone Data (${selectedZones.length} selected)` 
              : 'City Overview'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {displayData.isZoneSpecific 
              ? 'Data for selected zones'
              : 'Atlanta metropolitan area'}
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {displayData.isZoneSpecific ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    icon={<Users className="w-4 h-4" />}
                    label="Population"
                    value={displayData.totalPopulation}
                  />
                  <MetricCard
                    icon={<Home className="w-4 h-4" />}
                    label="Housing Units"
                    value={displayData.totalHousing}
                  />
                </div>

                <div className="space-y-3">
                  {displayData.zones.map((zone) => (
                    <Card key={zone.zoneId} className="p-3 bg-slate-950 border-slate-800">
                      <div className="font-medium text-sm text-slate-100 mb-2">
                        {zone.zoneName}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-slate-400">Population</div>
                          <div className="text-slate-200">{zone.population.toLocaleString()}</div>
                          {zone.populationChange && (
                            <div className={zone.populationChange > 0 ? 'text-green-400' : 'text-red-400'}>
                              {zone.populationChange > 0 ? '+' : ''}{zone.populationChange}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-slate-400">Housing</div>
                          <div className="text-slate-200">{zone.housingUnits.toLocaleString()}</div>
                          {zone.housingUnitsChange && (
                            <div className={zone.housingUnitsChange > 0 ? 'text-green-400' : 'text-red-400'}>
                              {zone.housingUnitsChange > 0 ? '+' : ''}{zone.housingUnitsChange}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    icon={<Users className="w-4 h-4" />}
                    label="Population"
                    value={cityMetrics.population}
                    change={cityMetrics.populationChange}
                  />
                  <MetricCard
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Avg Income"
                    value={`$${(cityMetrics.averageIncome / 1000).toFixed(0)}k`}
                    change={cityMetrics.averageIncomeChange}
                  />
                  <MetricCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Unemployment"
                    value={cityMetrics.unemploymentRate}
                    unit="%"
                    change={cityMetrics.unemploymentRateChange}
                  />
                  <MetricCard
                    icon={<Home className="w-4 h-4" />}
                    label="Housing Index"
                    value={cityMetrics.housingAffordabilityIndex}
                    change={cityMetrics.housingAffordabilityIndexChange}
                  />
                  <MetricCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="Traffic Index"
                    value={cityMetrics.trafficCongestionIndex}
                    change={cityMetrics.trafficCongestionIndexChange}
                  />
                  <MetricCard
                    icon={<Wind className="w-4 h-4" />}
                    label="Air Quality"
                    value={cityMetrics.airQualityIndex}
                    change={cityMetrics.airQualityIndexChange}
                  />
                </div>

                <div className="space-y-4 mt-6">
                  <div className="h-48">
                    <LineChart
                      title="Population Trend"
                      labels={populationTrendData.labels}
                      datasets={populationTrendData.datasets}
                    />
                  </div>
                  
                  <div className="h-48">
                    <BarChart
                      title="Weekly Traffic Pattern"
                      labels={trafficData.labels}
                      datasets={trafficData.datasets}
                    />
                  </div>

                  <div className="h-56">
                    <DoughnutChart
                      title="Economic Sectors"
                      labels={economicData.labels}
                      data={economicData.data}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

