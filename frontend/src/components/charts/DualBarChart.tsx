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

interface DualBarChartProps {
  label1: string
  value1: number
  label2: string
  value2: number
  ratio?: number
  color1?: string
  color2?: string
}

export function DualBarChart({
  label1,
  value1,
  label2,
  value2,
  ratio,
  color1 = 'rgba(96, 165, 250, 0.8)',
  color2 = 'rgba(251, 191, 36, 0.8)',
}: DualBarChartProps) {
  const maxValue = Math.max(value1, value2) * 1.1

  const chartData = {
    labels: [label1, label2],
    datasets: [
      {
        label: label1,
        data: [value1, 0],
        backgroundColor: color1,
        borderColor: color1,
        borderWidth: 0,
      },
      {
        label: label2,
        data: [0, value2],
        backgroundColor: color2,
        borderColor: color2,
        borderWidth: 0,
      },
    ],
  }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: false,
        max: maxValue,
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
      },
    },
    categoryPercentage: 0.9,
    barPercentage: 0.95,
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
          generateLabels: (chart: any) => {
            return chart.data.datasets.map((dataset: any, i: number) => {
              const value = i === 0 ? value1 : value2
              return {
                text: `${dataset.label} ($${Math.round(value / 1000)}k)`,
                fillStyle: dataset.backgroundColor,
                fontColor: '#ffffff',
                hidden: false,
                index: i,
              }
            })
          },
        },
      },
      tooltip: {
        enabled: false,
      },
    },
  }

  return (
    <div className="h-full w-full relative">
      <Bar data={chartData} options={options} />
      {ratio !== undefined && (
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 transform -translate-y-1/2 pointer-events-none">
          <div 
            className="h-full bg-white/40"
            style={{ width: `${Math.min(100, (ratio / Math.max(value1, value2)) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

