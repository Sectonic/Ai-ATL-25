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
}

export function DoughnutChart({ title, labels, data, backgroundColor }: DoughnutChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: backgroundColor || [
          '#3b82f6',
          '#22d3ee',
          '#a855f7',
          '#f59e0b',
          '#ef4444',
        ],
        borderColor: '#1e293b',
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 10,
          },
          padding: 10,
        },
      },
      title: {
        display: true,
        text: title,
        color: '#f1f5f9',
        font: {
          size: 14,
          weight: 'normal' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#475569',
        borderWidth: 1,
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

