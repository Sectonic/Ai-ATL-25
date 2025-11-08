import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface RadarChartProps {
  labels: string[]
  data: number[]
  fillColor?: string
  borderColor?: string
  title?: string
}

export function RadarChart({ 
  labels, 
  data, 
  fillColor = 'rgba(96, 165, 250, 0.2)',
  borderColor = 'rgba(96, 165, 250, 0.8)',
  title 
}: RadarChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        label: title || 'Profile',
        data,
        backgroundColor: fillColor,
        borderColor: borderColor,
        borderWidth: 2,
        pointBackgroundColor: borderColor,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: borderColor,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          display: false,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
            family: "'Space Grotesk', sans-serif",
          },
          padding: 2,
          callback: (label: string, index: number) => {
            const value = Math.round(data[index])
            return `${label} (${value}%)`
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Radar data={chartData} options={options} />
    </div>
  )
}

