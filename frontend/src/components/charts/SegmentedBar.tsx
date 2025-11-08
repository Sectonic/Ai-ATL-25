import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

interface Segment {
  value: number
  color: string
  label: string
}

interface SegmentedBarProps {
  segments: Segment[]
  total?: number
}

export function SegmentedBar({ segments, total }: SegmentedBarProps) {
  const totalValue = total || segments.reduce((sum, s) => sum + s.value, 0)
  const normalizedSegments = segments.map(s => ({
    ...s,
    normalizedValue: totalValue > 0 ? (s.value / totalValue) * 100 : 0,
  }))

  const chartData = {
    labels: [''],
    datasets: normalizedSegments.map((segment) => ({
      label: segment.label,
      data: [segment.normalizedValue],
      backgroundColor: segment.color,
      borderColor: segment.color,
      borderWidth: 0,
      barThickness: 20,
    })),
  }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        display: false,
        max: 100,
      },
      y: {
        stacked: true,
        display: false,
      },
    },
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
          padding: 6,
          boxWidth: 8,
          boxHeight: 8,
          generateLabels: () => {
            return normalizedSegments.map((segment, i) => ({
              text: `${segment.label} (${segment.value.toFixed(1)}%)`,
              fillStyle: segment.color,
              fontColor: '#ffffff',
              hidden: false,
              index: i,
            }))
          },
        },
      },
      tooltip: {
        enabled: false,
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  )
}

