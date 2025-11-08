import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  Tooltip
)

interface GaugeChartProps {
  value: number
  max?: number
  color?: string
  backgroundColor?: string
  size?: number
}

export function GaugeChart({
  value,
  max = 100,
  color = '#60A5FA',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  size = 120,
}: GaugeChartProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const remaining = 100 - percentage

  const chartData = {
    datasets: [
      {
        data: [percentage, remaining],
        backgroundColor: [color, backgroundColor],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      tooltip: {
        enabled: false,
      },
    },
  }

  return (
    <div className="relative" style={{ width: size, height: size / 2 }}>
      <Doughnut data={chartData} options={options} />
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-2xl font-semibold text-white">
          {Math.round(value)}
        </div>
        <div className="text-xs text-white/60">
          /{max}
        </div>
      </div>
    </div>
  )
}

