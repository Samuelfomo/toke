<template>
  <section v-if="loading" class="dashboard-hero-skeleton">
    <div class="skeleton-header"></div>
    <div class="stats-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  </section>

  <section v-else class="dashboard-hero">
    <!-- En-tête avec sélecteur de période -->
    <div class="hero-header">
      <div class="header-left">
        <h1 class="hero-title">Tableau de bord - {{ summary.total_team_members }} employés</h1>
        <div class="period-info">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span>{{ formattedPeriod }}</span>
        </div>
      </div>

      <div class="period-selector">
        <div class="date-range-picker">
          <label for="startDate">Du</label>
          <input
            type="date"
            id="startDate"
            v-model="localStartDate"
            :max="localEndDate"
            @change="handlePeriodChange"
          />

          <label for="endDate">Au</label>
          <input
            type="date"
            id="endDate"
            v-model="localEndDate"
            :min="localStartDate"
            :max="today"
            @change="handlePeriodChange"
          />
        </div>

        <div class="quick-periods">
          <button
            v-for="preset in periodPresets"
            :key="preset.key"
            @click="applyPreset(preset.key)"
            :class="['preset-btn', { active: activePreset === preset.key }]"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cartes de statistiques -->
    <div class="stats-grid">
      <!-- Présents à l'heure -->
      <div class="stat-card stat-present">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ summary.total_present_on_time }}</div>
          <div class="stat-label">Présents à l'heure</div>
          <div class="stat-percentage">{{ attendanceRate }}%</div>
        </div>
      </div>

      <!-- Retards -->
      <div class="stat-card stat-warning" :class="{ 'has-issues': summary.total_late_arrivals > 0 }">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ summary.total_late_arrivals }}</div>
          <div class="stat-label">Retards</div>
          <div class="stat-detail" v-if="summary.average_delay_minutes > 0">
            Moy: {{ formatMinutes(summary.average_delay_minutes) }}
          </div>
        </div>
      </div>

      <!-- Absents -->
      <div class="stat-card stat-error" :class="{ 'has-issues': summary.total_absences > 0 }">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ summary.total_absences }}</div>
          <div class="stat-label">Absences</div>
          <div class="stat-detail">
            Sur {{ summary.total_expected_workdays }} jours attendus
          </div>
        </div>
      </div>

      <!-- Jours de repos -->
      <div class="stat-card stat-info">
        <div class="stat-icon">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ summary.total_off_days }}</div>
          <div class="stat-label">Jours de repos</div>
          <div class="stat-detail">
            Actifs: {{ summary.currently_active }}
          </div>
        </div>
      </div>
    </div>

    <!-- Graphiques -->
    <div class="charts-section">
      <div class="chart-container">
        <h3 class="chart-title">Évolution quotidienne</h3>
        <canvas ref="dailyChart"></canvas>
      </div>

      <div class="chart-container">
        <h3 class="chart-title">Répartition des statuts</h3>
        <canvas ref="statusChart"></canvas>
      </div>
    </div>

    <!-- Indicateurs de performance -->
    <div class="performance-indicators">
      <div class="indicator">
        <div class="indicator-header">
          <span class="indicator-label">Taux de présence</span>
          <span class="indicator-value">{{ attendanceRate }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: attendanceRate + '%' }"></div>
        </div>
        <div class="indicator-benchmark">Objectif: 95%</div>
      </div>

      <div class="indicator">
        <div class="indicator-header">
          <span class="indicator-label">Taux de ponctualité</span>
          <span class="indicator-value">{{ punctualityRate }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill progress-punctuality" :style="{ width: punctualityRate + '%' }"></div>
        </div>
        <div class="indicator-benchmark">Objectif: 90%</div>
      </div>

      <div class="indicator">
        <div class="indicator-header">
          <span class="indicator-label">Heures travaillées moyennes/jour</span>
          <span class="indicator-value">{{ averageWorkHours }}h</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill progress-hours" :style="{ width: (Number(averageWorkHours) / 8 * 100) + '%' }"></div>
        </div>
        <div class="indicator-benchmark">Objectif: 8h</div>
      </div>
    </div>

    <!-- Actions rapides -->
    <div class="quick-actions">
      <button @click="exportData" class="action-btn">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span>Exporter la période</span>
      </button>

      <button @click="$emit('refresh')" class="action-btn action-btn-secondary">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Actualiser</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import type { ChartConfiguration } from 'chart.js'

interface DailyBreakdown {
  date: string
  day_of_week: string
  expected_count: number
  present: number
  late: number
  absent: number
  off_day: number
}

interface PeriodSummary {
  total_team_members: number
  total_present_on_time: number
  total_late_arrivals: number
  total_absences: number
  total_off_days: number
  total_expected_workdays: number
  attendance_rate: number
  punctuality_rate: number
  average_delay_minutes: number
  total_work_hours: number
  average_work_hours_per_day: number
  currently_active: number
  currently_on_pause: number
}

interface Props {
  summary: PeriodSummary
  dailyBreakdown: DailyBreakdown[]
  periodStart: string
  periodEnd: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  periodChange: [{ start: string; end: string }]
  refresh: []
  export: []
}>()

// État local
const localStartDate = ref(props.periodStart)
const localEndDate = ref(props.periodEnd)
const activePreset = ref<string | null>(null)
const dailyChartInstance = ref<Chart | null>(null)
const statusChartInstance = ref<Chart | null>(null)
const dailyChart = ref<HTMLCanvasElement | null>(null)
const statusChart = ref<HTMLCanvasElement | null>(null)

const today = new Date().toISOString().split('T')[0]

const periodPresets = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: '7 derniers jours' },
  { key: 'month', label: '30 derniers jours' },
  { key: 'custom', label: 'Personnalisé' }
]

// Computed
const formattedPeriod = computed(() => {
  const start = new Date(localStartDate.value)
  const end = new Date(localEndDate.value)

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

  if (localStartDate.value === localEndDate.value) {
    return start.toLocaleDateString('fr-FR', { ...options, weekday: 'long' })
  }

  return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', options)}`
})

const attendanceRate = computed(() => {
  return Math.round(props.summary.attendance_rate)
})

const punctualityRate = computed(() => {
  return Math.round(props.summary.punctuality_rate)
})

const averageWorkHours = computed(() => {
  return props.summary.average_work_hours_per_day.toFixed(1)
})

// Méthodes
const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours > 0) {
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`
  }
  return `${mins}min`
}

const applyPreset = (preset: string) => {
  activePreset.value = preset
  const end = new Date()
  let start = new Date()

  switch (preset) {
    case 'today':
      start = new Date()
      break
    case 'week':
      start.setDate(end.getDate() - 6)
      break
    case 'month':
      start.setDate(end.getDate() - 29)
      break
    case 'custom':
      return
  }

  localStartDate.value = start.toISOString().split('T')[0]
  localEndDate.value = end.toISOString().split('T')[0]
  handlePeriodChange()
}

const handlePeriodChange = () => {
  activePreset.value = 'custom'
  emit('periodChange', {
    start: localStartDate.value,
    end: localEndDate.value
  })
}

const exportData = () => {
  emit('export')
}

// Créer les graphiques
const createDailyChart = () => {
  if (!dailyChart.value || !props.dailyBreakdown.length) return

  // Détruire l'ancien graphique s'il existe
  if (dailyChartInstance.value) {
    dailyChartInstance.value.destroy()
  }

  const labels = props.dailyBreakdown.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  })

  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Présents',
          data: props.dailyBreakdown.map(d => d.present),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Retards',
          data: props.dailyBreakdown.map(d => d.late),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Absents',
          data: props.dailyBreakdown.map(d => d.absent),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 12, family: "'Inter', sans-serif" }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          displayColors: true,
          callbacks: {
            title: (items: any) => {
              const index = items[0].dataIndex
              const breakdown = props.dailyBreakdown[index]
              return `${breakdown.day_of_week} ${items[0].label}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  }

  dailyChartInstance.value = new Chart(dailyChart.value, config)
}

const createStatusChart = () => {
  if (!statusChart.value) return

  // Détruire l'ancien graphique s'il existe
  if (statusChartInstance.value) {
    statusChartInstance.value.destroy()
  }

  const config: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels: ['Présents à l\'heure', 'Retards', 'Absences', 'Jours de repos'],
      datasets: [{
        data: [
          props.summary.total_present_on_time,
          props.summary.total_late_arrivals,
          props.summary.total_absences,
          props.summary.total_off_days
        ],
        backgroundColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#6366f1'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 12, family: "'Inter', sans-serif" }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (context : any) => {
              const label = context.label || ''
              const value = context.parsed
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  }

  statusChartInstance.value = new Chart(statusChart.value, config)
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    createDailyChart()
    createStatusChart()
  })
})

// Watchers
watch(() => props.dailyBreakdown, () => {
  nextTick(() => {
    createDailyChart()
    createStatusChart()
  })
}, { deep: true })

watch([() => props.periodStart, () => props.periodEnd], () => {
  localStartDate.value = props.periodStart
  localEndDate.value = props.periodEnd
})
</script>

<style scoped>
.dashboard-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  color: white;
  margin-bottom: 2rem;
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.header-left {
  flex: 1;
}

.hero-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.period-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.9;
  font-size: 0.95rem;
}

.icon-sm {
  width: 18px;
  height: 18px;
}

/* Sélecteur de période */
.period-selector {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.date-range-picker {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.date-range-picker label {
  font-size: 0.875rem;
  font-weight: 500;
}

.date-range-picker input[type="date"] {
  padding: 0.5rem 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  color: #1f2937;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.date-range-picker input[type="date"]:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: white;
}

.date-range-picker input[type="date"]:focus {
  outline: none;
  border-color: white;
  background: white;
}

.quick-periods {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 0.5rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: transparent;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.preset-btn.active {
  background: rgba(255, 255, 255, 0.25);
  border-color: white;
}

/* Grille de statistiques */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  transition: all 0.3s;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.stat-card.has-issues {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
}

.stat-icon {
  flex-shrink: 0;
}

.stat-icon .icon {
  width: 48px;
  height: 48px;
  opacity: 0.9;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.25rem;
}

.stat-percentage,
.stat-detail {
  font-size: 0.8rem;
  opacity: 0.8;
  font-weight: 500;
}

/* Section graphiques */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  height: 350px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  opacity: 0.95;
}

canvas {
  max-height: 280px !important;
}

/* Indicateurs de performance */
.performance-indicators {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.indicator {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.indicator-label {
  font-size: 0.875rem;
  opacity: 0.9;
  font-weight: 500;
}

.indicator-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.progress-punctuality {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.progress-hours {
  background: linear-gradient(90deg, #6366f1, #818cf8);
}

.indicator-benchmark {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Actions rapides */
.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.action-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: white;
}

/* Skeleton */
.dashboard-hero-skeleton {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.skeleton-header {
  height: 60px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  margin-bottom: 2rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-card {
  height: 120px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-hero {
    padding: 1.5rem;
  }

  .hero-header {
    flex-direction: column;
    gap: 1.5rem;
  }

  .hero-title {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 300px;
  }

  .performance-indicators {
    grid-template-columns: 1fr;
  }
}
</style>


<!--<template>-->
<!--  <section v-if="loading" class="dashboard-hero-skeleton">-->
<!--    <div class="skeleton-header"></div>-->
<!--    <div class="stats-grid">-->
<!--      <div class="skeleton-card"></div>-->
<!--      <div class="skeleton-card"></div>-->
<!--      <div class="skeleton-card"></div>-->
<!--      <div class="skeleton-card"></div>-->
<!--    </div>-->
<!--  </section>-->

<!--  <section v-else class="dashboard-hero">-->
<!--    <div class="hero-header">-->
<!--      <h1 class="hero-title">Tableau de bord - {{ statistics.total_team_members }}</h1>-->
<!--      <div class="date-info">-->
<!--        <div class="current-date">{{ formattedDate }}</div>-->
<!--        <div class="last-update">Dernière mise à jour: {{ lastUpdate }}</div>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="stats-grid">-->
<!--      &lt;!&ndash; Employés présents &ndash;&gt;-->
<!--      <div class="stat-card stat-present">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">-->
<!--            {{ statistics.present_to_days }}-->
<!--          </div>-->
<!--          <div class="stat-label">Employés présents</div>-->
<!--          <div class="stat-percentage">{{ presencePercentage }}%</div>-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Retards &ndash;&gt;-->
<!--      <div class="stat-card stat-warning" :class="{ 'has-issues': statistics.late_arrivals > 0 }">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ statistics.late_arrivals }}</div>-->
<!--          <div class="stat-label">Retards</div>-->
<!--          <div class="stat-detail" v-if="statistics.average_work_hours">-->
<!--            Moyenne: {{ statistics.average_work_hours }}-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Absents &ndash;&gt;-->
<!--      <div class="stat-card stat-error" :class="{ 'has-issues': statistics.absences > 0 }">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ statistics.absences }}</div>-->
<!--          <div class="stat-label">Absents</div>-->
<!--          <div class="stat-detail">-->
<!--            Taux de présence: {{ statistics.attendance_rate }}-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Jour de repos &ndash;&gt;-->
<!--      <div class="stat-card stat-info">-->
<!--        <div class="stat-icon">-->
<!--          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="stat-content">-->
<!--          <div class="stat-number">{{ statistics.off_day }}</div>-->
<!--          <div class="stat-label">Jours de repos</div>-->
<!--          <div class="stat-detail">-->
<!--            Actifs: {{ statistics.currently_active }}-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="quick-actions">-->
<!--      <h3 class="actions-title">Actions rapides</h3>-->
<!--      <div class="actions-grid">-->
<!--        <a href="#" class="action-btn action-btn-compact">-->
<!--          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>-->
<!--          </svg>-->
<!--          <span>Exporter le jour</span>-->
<!--        </a>-->
<!--      </div>-->
<!--    </div>-->

<!--    <div class="presence-progress">-->
<!--      <div class="progress-header">-->
<!--        <span class="progress-label">Taux de présence du jour</span>-->
<!--        <span class="progress-value">{{ statistics.attendance_rate }}</span>-->
<!--      </div>-->
<!--      <div class="progress-bar">-->
<!--        <div class="progress-fill" :style="{ width: progressWidth }"></div>-->
<!--      </div>-->
<!--      <div class="progress-benchmark">-->
<!--        <span class="benchmark-text">Objectif: 95% | Ponctualité: {{ statistics.punctuality_rate }}</span>-->
<!--      </div>-->
<!--    </div>-->
<!--  </section>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { computed } from 'vue'-->
<!--import type { Statistics } from '@/utils/interfaces/team.interface'-->
<!--import "../../assets/css/toke-dHero-03.css"-->

<!--interface Props {-->
<!--  statistics: Statistics-->
<!--  date: string-->
<!--  loading?: boolean-->
<!--}-->

<!--const props = withDefaults(defineProps<Props>(), {-->
<!--  loading: false-->
<!--})-->

<!--const lastUpdate = computed(() => {-->
<!--  const now = new Date()-->
<!--  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })-->
<!--})-->

<!--const formattedDate = computed(() => {-->
<!--  const dateObj = new Date(props.date)-->
<!--  return dateObj.toLocaleDateString('fr-FR', {-->
<!--    weekday: 'long',-->
<!--    year: 'numeric',-->
<!--    month: 'long',-->
<!--    day: 'numeric'-->
<!--  })-->
<!--})-->

<!--const presencePercentage = computed(() => {-->
<!--  if (props.statistics.total_team_members === 0) return 0-->
<!--  return Math.round((props.statistics.present_to_days / props.statistics.total_team_members) * 100)-->
<!--})-->

<!--const progressWidth = computed(() => {-->
<!--  const rate = props.statistics.attendance_rate-->
<!--  if (rate === 'N/A') return '0%'-->
<!--  return rate-->
<!--})-->
<!--</script>-->

<!--<style scoped>-->
<!--/* Centrer la date et l'heure à droite */-->
<!--.date-info {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  align-items: flex-end;-->
<!--  text-align: right;-->
<!--  margin-right: 0;-->
<!--}-->

<!--/* Réduire la largeur du bouton Exporter */-->
<!--.action-btn-compact {-->
<!--  width: auto;-->
<!--  max-width: 200px;-->
<!--}-->
<!--</style>-->