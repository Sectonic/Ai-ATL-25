import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface BarChartProps {
  title: string
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
  }[]
}

export function BarChart({ title, labels, datasets }: BarChartProps) {
  const data = {
    labels,
    datasets: datasets.map(dataset => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || '#3b82f6',
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: {
            size: 11,
          },
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
    scales: {
      x: {
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Bar data={data} options={options} />
    </div>
  )
}

