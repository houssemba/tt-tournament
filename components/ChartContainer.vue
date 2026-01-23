<script setup lang="ts">
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Pie, Bar, Line } from 'vue-chartjs'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  type: 'pie' | 'bar' | 'line'
  data: {
    labels: string[]
    datasets: Array<{
      label?: string
      data: number[]
      backgroundColor?: string | string[]
      borderColor?: string | string[]
      borderWidth?: number
      fill?: boolean
      tension?: number
    }>
  }
  title?: string
  aspectRatio?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  aspectRatio: 2,
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: props.aspectRatio,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    title: props.title
      ? {
          display: true,
          text: props.title,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          padding: {
            bottom: 20,
          },
        }
      : { display: false },
  },
}))

const chartComponent = computed(() => {
  switch (props.type) {
    case 'pie':
      return Pie
    case 'bar':
      return Bar
    case 'line':
      return Line
    default:
      return Bar
  }
})
</script>

<template>
  <div class="card p-6">
    <component
      :is="chartComponent"
      :data="data"
      :options="chartOptions"
      :aria-label="title || 'Graphique'"
      role="img"
    />
  </div>
</template>
