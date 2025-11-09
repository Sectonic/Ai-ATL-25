import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface DoughnutChartProps {
  title: string
  labels: string[]
  data: number[]
  backgroundColor?: string[]
  deltas?: number[]
}

const DELTA_DISPLAY_EPSILON = 0.05

const formatDelta = (delta: number | undefined): { display: string; color: string; isPositive: boolean } | null => {
  if (delta === undefined) return null
  if (Math.abs(delta) < DELTA_DISPLAY_EPSILON) return null
  const rounded = Number(delta.toFixed(1))
  if (Math.abs(rounded) < DELTA_DISPLAY_EPSILON) return null
  const isPositive = rounded >= 0
  const sign = isPositive ? '+' : ''
  return {
    display: `${sign}${Math.abs(rounded).toFixed(1)}%`,
    color: isPositive ? 'text-green-400' : 'text-red-400',
    isPositive,
  }
}

export function DoughnutChart({ title, labels, data, backgroundColor, deltas }: DoughnutChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: backgroundColor || [
          '#64748b',
          '#475569',
          '#94a3b8',
          '#334155',
          '#1e293b',
        ],
        borderWidth: 0,
      },
    ],
  }

  const total = data.reduce((sum, value) => sum + value, 0)

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#ffffff',
          font: {
            size: 9,
            family: "'Space Grotesk', sans-serif",
          },
          padding: 8,
          boxWidth: 8,
          boxHeight: 8,
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets
            return chart.data.labels.map((label: string, i: number) => {
              const value = datasets[0].data[i]
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
              
              let labelText = `${label} (${percentage}%)`
              
              if (deltas && deltas[i] !== undefined) {
                const formatted = formatDelta(deltas[i])
                if (formatted) {
                  const arrow = formatted.isPositive ? '↑' : '↓'
                  labelText = `${label} (${percentage}%) ${arrow} ${formatted.display}`
                }
              }
              
              return {
                text: labelText,
                fillStyle: datasets[0].backgroundColor[i],
                fontColor: '#ffffff',
                hidden: false,
                index: i,
              }
            })
          },
        },
      },
      title: {
        display: title ? true : false,
        text: title,
        color: '#f1f5f9',
        font: {
          size: 14,
          weight: 'normal' as const,
          family: "'Space Grotesk', sans-serif",
        },
      },
      tooltip: {
        enabled: false,
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}
