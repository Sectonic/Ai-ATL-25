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
            size: 11,
            family: "'Space Grotesk', sans-serif",
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        font: {
          family: "'Space Grotesk', sans-serif",
        },
      },
    },
  }

  return (
    <div className="h-full w-full">
      <Radar data={chartData} options={options} />
    </div>
  )
}

