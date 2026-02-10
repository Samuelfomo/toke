<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup>
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'

import { Bar } from 'vue-chartjs'

// enregistrer les modules nécessaires
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
)

const chartData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr'],
  datasets: [
    {
      label: 'Ventes',
      backgroundColor: '#42b883',
      data: [40, 20, 12, 39]
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
}
</script>

<style>
canvas {
  max-height: 400px;
}
</style>
