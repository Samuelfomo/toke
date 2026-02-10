<template>
  <section class="alerts-insights-section">
    <!-- ================= CARDS MÉTRIQUES RAPIDES AMÉLIORÉES ================= -->
    <div class="metrics-cards">
      <!-- Présents -->
      <div class="metric-card present">
        <div class="metric-circle">
          <div class="circle-content">

            <span class="metric-value">{{ presentRate }}%</span>

          </div>
          <svg class="circle-svg" viewBox="0 0 120 120">
            <circle
              class="circle-bg"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#d1fae5"
              stroke-width="8"
            />
            <circle
              class="circle-progress"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#22c55e"
              stroke-width="8"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="presentOffset"
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
        <div class="metric-info">
          <span class="metric-label">Présents</span>
          <span class="metric-percentage success">{{ totalPresent }}/{{ totalExpected }} à l'heure</span>
<!--          <span class="metric-total">/ {{ totalExpected }}</span>-->
        </div>
      </div>

      <!-- Retards -->
      <div class="metric-card late">
        <div class="metric-circle">
          <div class="circle-content">
            <span class="metric-value">{{ lateRate }}%</span>
<!--            <span class="metric-total">/ {{ totalExpected }}</span>-->
          </div>
          <svg class="circle-svg" viewBox="0 0 120 120">
            <circle
              class="circle-bg"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#fef3c7"
              stroke-width="8"
            />
            <circle
              class="circle-progress"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#f59e0b"
              stroke-width="8"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="lateOffset"
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
        <div class="metric-info">
          <span class="metric-label">En retard</span>
          <span class="metric-percentage warning"> {{ totalLate }}/{{ totalExpected }} de retards</span>
        </div>
      </div>

      <!-- Absences -->
      <div class="metric-card absent">
        <div class="metric-circle">
          <div class="circle-content">
            {{ absenceRate }}%
            <span class="metric-value"></span>
<!--            <span class="metric-total">/ {{ totalExpected }}</span>-->
          </div>
          <svg class="circle-svg" viewBox="0 0 120 120">
            <circle
              class="circle-bg"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#fee2e2"
              stroke-width="8"
            />
            <circle
              class="circle-progress"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#ef4444"
              stroke-width="8"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="absenceOffset"
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
        <div class="metric-info">
          <span class="metric-label">Absents</span>
          <span class="metric-percentage danger">{{ totalAbsences }}/{{ totalExpected }} d'absence</span>
        </div>
      </div>

      <!-- Repos -->
      <div class="metric-card rest">
        <div class="metric-circle">
          <div class="circle-content">
            <span class="metric-value">{{ totalRest }}</span>
            <span class="metric-total">/ {{ totalEmployees }}</span>
          </div>
          <svg class="circle-svg" viewBox="0 0 120 120">
            <circle
              class="circle-bg"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e0e7ff"
              stroke-width="8"
            />
            <circle
              class="circle-progress"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#6366f1"
              stroke-width="8"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="restOffset"
              transform="rotate(-90 60 60)"
            />
          </svg>
        </div>
        <div class="metric-info">
          <span class="metric-label">Au repos</span>
          <span class="metric-percentage info">{{ restRate }}% en repos</span>
        </div>
      </div>

      <!-- Retard Max -->
      <div class="metric-card delay-max">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <div class="metric-info">
          <span class="metric-label">Retard max</span>
          <span class="metric-value-text success" v-if="maxDelay === 0">Aucun</span>
          <span class="metric-value-text warning" v-else>{{ formatDelay(maxDelay) }}</span>
        </div>
      </div>
    </div>

    <!-- ================= ÉVOLUTION SUR LA PÉRIODE ================= -->
    <div class="evolution-card">
      <h3 class="evolution-title">
        📊 Évolution sur la période
        <span class="evolution-subtitle">Cliquez sur un jour pour voir le détail</span>
      </h3>

      <div class="evolution-chart-container">
        <Line v-if="evolutionChartData" :data="evolutionChartData" :options="evolutionChartOptions" />
      </div>

      <!-- Légende interactive -->
      <div class="chart-legend">
        <div class="legend-item" @click="toggleDataset('present')">
          <div class="legend-dot success" :class="{ disabled: !datasetsVisibility.present }"></div>
          <span :class="{ disabled: !datasetsVisibility.present }">Présents</span>
        </div>
        <div class="legend-item" @click="toggleDataset('late')">
          <div class="legend-dot warning" :class="{ disabled: !datasetsVisibility.late }"></div>
          <span :class="{ disabled: !datasetsVisibility.late }">Retards</span>
        </div>
        <div class="legend-item" @click="toggleDataset('absent')">
          <div class="legend-dot danger" :class="{ disabled: !datasetsVisibility.absent }"></div>
          <span :class="{ disabled: !datasetsVisibility.absent }">Absents</span>
        </div>
        <div class="legend-item" @click="toggleDataset('rest')">
          <div class="legend-dot info" :class="{ disabled: !datasetsVisibility.rest }"></div>
          <span :class="{ disabled: !datasetsVisibility.rest }">Repos</span>
        </div>
      </div>
    </div>

    <!-- ================= MODAL DÉTAILS DU JOUR ================= -->
    <transition name="modal-fade">
      <div v-if="showDayDetailsModal" class="modal-overlay" @click="closeDayDetails">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <div>
              <h3 class="modal-title">📅 Détails du {{ formatDate(selectedDay?.date || '') }}</h3>
              <p class="modal-subtitle">{{ selectedDay?.expected }} employés attendus</p>
            </div>
            <button class="modal-close" @click="closeDayDetails">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Statistiques du jour -->
            <div class="day-summary">
              <div class="summary-card present-card">
                <div class="summary-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="summary-info">
                  <span class="summary-value">{{ selectedDayEmployees.present.length }}</span>
                  <span class="summary-label">Présents à l'heure</span>
                </div>
              </div>

              <div class="summary-card late-card">
                <div class="summary-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
                  </svg>
                </div>
                <div class="summary-info">
                  <span class="summary-value">{{ selectedDayEmployees.late.length }}</span>
                  <span class="summary-label">En retard</span>
                </div>
              </div>

              <div class="summary-card absent-card">
                <div class="summary-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="summary-info">
                  <span class="summary-value">{{ selectedDayEmployees.absent.length }}</span>
                  <span class="summary-label">Absents</span>
                </div>
              </div>

              <div class="summary-card rest-card">
                <div class="summary-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                </div>
                <div class="summary-info">
                  <span class="summary-value">{{ selectedDayEmployees.rest.length }}</span>
                  <span class="summary-label">Au repos</span>
                </div>
              </div>
            </div>

            <!-- Listes des employés par statut -->
            <div class="employees-tabs">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="tab-button"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                <span class="tab-badge" :class="tab.badgeClass">
                  {{ selectedDayEmployees[tab.key].length }}
                </span>
                {{ tab.label }}
              </button>
            </div>

            <div class="employees-list">
              <transition name="fade" mode="out-in">
                <div :key="activeTab" class="employee-group">
                  <div
                    v-for="emp in selectedDayEmployees[activeTab]"
                    :key="emp.guid"
                    class="employee-card"
                    @click="$emit('employee-click', emp)"
                  >
                    <div class="employee-avatar" :style="{ backgroundImage: emp.avatar ? `url(${emp.avatar})` : 'none' }">
                      {{ !emp.avatar ? emp.initials : '' }}
                    </div>
                    <div class="employee-details">
                      <span class="employee-name">{{ emp.name }}</span>
                      <span class="employee-position">{{ emp.job_title }}</span>
                    </div>
                    <div v-if="activeTab === 'late' && emp.dayDetail?.delay_minutes" class="delay-badge">
                      {{ formatDelay(emp.dayDetail.delay_minutes) }}
                    </div>
                    <div v-if="activeTab === 'present' && emp.dayDetail?.check_in_time" class="time-badge">
                      {{ emp.dayDetail.check_in_time }}
                    </div>
                  </div>

                  <div v-if="selectedDayEmployees[activeTab].length === 0" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                    </svg>
                    <p>Aucun employé {{ tabs.find(t => t.key === activeTab)?.emptyLabel }}</p>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ================= EMPLOYÉS À RISQUE ================= -->
    <div v-if="atRiskEmployees.length > 0" class="alert-card risk-employees">
      <div class="alert-header">
        <div class="alert-icon-wrapper danger">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            <circle cx="18" cy="6" r="4" fill="#ef4444"/>
          </svg>
        </div>
        <div>
          <h3 class="alert-title">Employés à risque</h3>
          <p class="alert-subtitle">{{ atRiskEmployees.length }} employés avec taux < 60%</p>
        </div>
        <button class="close-btn" @click="hideRiskEmployees = !hideRiskEmployees">
          <svg v-if="!hideRiskEmployees" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </div>

      <transition name="slide-fade">
        <div v-show="!hideRiskEmployees" class="alert-content">
          <div
            v-for="emp in atRiskEmployees"
            :key="emp.guid"
            class="risk-employee-item"
            @click="$emit('employee-click', emp)"
          >
            <div class="employee-avatar" :style="{ backgroundImage: emp.avatar ? `url(${emp.avatar})` : 'none' }">
              {{ !emp.avatar ? emp.initials : '' }}
            </div>
            <div class="employee-details">
              <span class="employee-name">{{ emp.name }}</span>
              <span class="employee-position">{{ emp.job_title }}</span>
            </div>
            <div class="employee-stats">
              <div class="stat-item">
                <span class="stat-label">Absences</span>
                <span class="stat-value danger">{{ emp.period_stats.absent_days }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Retards</span>
                <span class="stat-value warning">{{ emp.period_stats.late_days }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Présences</span>
                <span class="stat-value success">{{ emp.period_stats.present_days }}</span>
              </div>
            </div>
            <div class="attendance-badge danger">
              {{ Math.round(emp.period_stats.attendance_rate) }}%
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ================= JOURS CRITIQUES ================= -->
    <div v-if="criticalDays.length > 0" class="alert-card critical-days">
      <div class="alert-header">
        <div class="alert-icon-wrapper danger">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
            <circle cx="18" cy="6" r="4" fill="#ef4444"/>
          </svg>
        </div>
        <div>
          <h3 class="alert-title">Jours critiques</h3>
          <p class="alert-subtitle">{{ criticalDays.length }} jours avec absences > 30%</p>
        </div>
        <button class="close-btn" @click="hideCriticalDays = !hideCriticalDays">
          <svg v-if="!hideCriticalDays" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </div>

      <transition name="slide-fade">
        <div v-show="!hideCriticalDays" class="alert-content">
          <div
            v-for="day in criticalDays"
            :key="day.date"
            class="critical-day-item"
            @click="handleDayClick(day)"
          >
            <div class="day-date">
              <span class="date-text">{{ formatDate(day.date) }}</span>
              <div class="absence-badge critical">{{ Math.round((day.absent / day.expected) * 100) }}% absents</div>
            </div>
            <div class="day-stats">
              <div class="stat-group">
                <span class="stat-label">Attendus</span>
                <span class="stat-value">{{ day.expected }}</span>
              </div>
              <div class="stat-group">
                <span class="stat-label">Présents</span>
                <span class="stat-value success">{{ day.present }}</span>
              </div>
              <div class="stat-group">
                <span class="stat-label">Absents</span>
                <span class="stat-value danger">{{ day.absent }}</span>
              </div>
              <div class="stat-group">
                <span class="stat-label">Repos</span>
                <span class="stat-value info">{{ day.rest }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TransformedEmployee } from '@/service/UserService'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  employees: TransformedEmployee[]
  periodLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  periodLabel: 'Période sélectionnée'
})

const emit = defineEmits<{
  (e: 'employee-click', employee: TransformedEmployee): void
  (e: 'day-click', date: string): void
}>()

// États
const hideRiskEmployees = ref(false)
const hideCriticalDays = ref(false)
const showDayDetailsModal = ref(false)
const selectedDay = ref<any>(null)
const activeTab = ref<'present' | 'late' | 'absent' | 'rest'>('present')

const datasetsVisibility = ref({
  present: true,
  late: true,
  absent: true,
  rest: true
})

// Tabs configuration
const tabs = [
  { key: 'present' as const, label: 'Présents à l\'heure', badgeClass: 'success', emptyLabel: 'présent à l\'heure' },
  { key: 'late' as const, label: 'En retard', badgeClass: 'warning', emptyLabel: 'en retard' },
  { key: 'absent' as const, label: 'Absents', badgeClass: 'danger', emptyLabel: 'absent' },
  { key: 'rest' as const, label: 'Au repos', badgeClass: 'info', emptyLabel: 'au repos' }
]

// Métriques globales
const totalEmployees = computed(() => props.employees.length)

const totalExpected = computed(() => {
  return props.employees.reduce((sum, emp) => sum + emp.period_stats.work_days_expected, 0)
})

const totalPresent = computed(() => {
  return props.employees.reduce((sum, emp) => sum + emp.period_stats.present_days, 0)
})

const totalLate = computed(() => {
  return props.employees.reduce((sum, emp) => sum + emp.period_stats.late_days, 0)
})

const totalAbsences = computed(() => {
  return props.employees.reduce((sum, emp) => sum + emp.period_stats.absent_days, 0)
})

const totalRest = computed(() => {
  return props.employees.reduce((sum, emp) => sum + emp.period_stats.off_days, 0)
})

// Pourcentages
const presentRate = computed(() => {
  if (totalExpected.value === 0) return 0
  return Math.round((totalPresent.value / totalExpected.value) * 100)
})

const lateRate = computed(() => {
  if (totalExpected.value === 0) return 0
  return Math.round((totalLate.value / totalExpected.value) * 100)
})

const absenceRate = computed(() => {
  if (totalExpected.value === 0) return 0
  return Math.round((totalAbsences.value / totalExpected.value) * 100)
})

const restRate = computed(() => {
  const totalDays = totalExpected.value + totalRest.value
  if (totalDays === 0) return 0
  return Math.round((totalRest.value / totalDays) * 100)
})

const maxDelay = computed(() => {
  return Math.max(...props.employees.map(emp => emp.period_stats.max_delay_minutes || 0))
})

// Cercle de progression
const circumference = 2 * Math.PI * 54
const presentOffset = computed(() => circumference * (1 - presentRate.value / 100))
const lateOffset = computed(() => circumference * (1 - lateRate.value / 100))
const absenceOffset = computed(() => circumference * (1 - absenceRate.value / 100))
const restOffset = computed(() => circumference * (1 - restRate.value / 100))

// Employés à risque (taux < 60%)
const atRiskEmployees = computed(() => {
  return props.employees
    .filter(emp => emp.period_stats.attendance_rate < 60 && emp.period_stats.work_days_expected > 0)
    .sort((a, b) => a.period_stats.attendance_rate - b.period_stats.attendance_rate)
})

// Agrégation quotidienne
const dailyData = computed(() => {
  const dateMap = new Map<string, {
    date: string
    expected: number
    present: number
    late: number
    absent: number
    rest: number
  }>()

  props.employees.forEach(emp => {
    emp.daily_details.forEach(day => {
      if (!dateMap.has(day.date)) {
        dateMap.set(day.date, {
          date: day.date,
          expected: 0,
          present: 0,
          late: 0,
          absent: 0,
          rest: 0
        })
      }

      const data = dateMap.get(day.date)!

      if (day.status !== 'off-day') {
        data.expected++
      }

      if (day.status === 'present') data.present++
      else if (day.status === 'late') data.late++
      else if (day.status === 'absent') data.absent++
      else if (day.status === 'off-day') data.rest++
    })
  })

  return Array.from(dateMap.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
})

// Jours critiques (absences > 30%)
const criticalDays = computed(() => {
  return dailyData.value.filter(day => {
    if (day.expected === 0) return false
    const absenceRate = (day.absent / day.expected) * 100
    return absenceRate > 30
  })
})

// Employés pour le jour sélectionné
const selectedDayEmployees = computed(() => {
  if (!selectedDay.value) {
    return { present: [], late: [], absent: [], rest: [] }
  }

  const date = selectedDay.value.date
  const result: {
    present: (TransformedEmployee & { dayDetail?: any })[]
    late: (TransformedEmployee & { dayDetail?: any })[]
    absent: (TransformedEmployee & { dayDetail?: any })[]
    rest: (TransformedEmployee & { dayDetail?: any })[]
  } = {
    present: [],
    late: [],
    absent: [],
    rest: []
  }

  props.employees.forEach(emp => {
    const dayDetail = emp.daily_details.find(d => d.date === date)
    if (dayDetail) {
      const empWithDetail = { ...emp, dayDetail }

      if (dayDetail.status === 'present') {
        result.present.push(empWithDetail)
      } else if (dayDetail.status === 'late') {
        result.late.push(empWithDetail)
      } else if (dayDetail.status === 'absent') {
        result.absent.push(empWithDetail)
      } else if (dayDetail.status === 'off-day') {
        result.rest.push(empWithDetail)
      }
    }
  })

  return result
})

// Données du graphique d'évolution
const evolutionChartData = computed(() => {
  const dates = dailyData.value.map(d =>
    new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  )

  const datasets = []

  if (datasetsVisibility.value.present) {
    datasets.push({
      label: 'Présents',
      data: dailyData.value.map(d => d.present),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: '#22c55e',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    })
  }

  if (datasetsVisibility.value.late) {
    datasets.push({
      label: 'En retard',
      data: dailyData.value.map(d => d.late),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    })
  }

  if (datasetsVisibility.value.absent) {
    datasets.push({
      label: 'Absents',
      data: dailyData.value.map(d => d.absent),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: '#ef4444',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    })
  }

  if (datasetsVisibility.value.rest) {
    datasets.push({
      label: 'Repos',
      data: dailyData.value.map(d => d.rest),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    })
  }

  return {
    labels: dates,
    datasets
  }
})

const evolutionChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  onClick: (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index
      const day = dailyData.value[index]
      handleDayClick(day)
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 16,
      titleFont: {
        size: 14,
        weight: 'bold' as const
      },
      bodyFont: {
        size: 13
      },
      callbacks: {
        title: function(context: any) {
          const index = context[0].dataIndex
          const day = dailyData.value[index]
          return formatDate(day.date)
        },
        afterTitle: function(context: any) {
          const index = context[0].dataIndex
          const day = dailyData.value[index]
          return `${day.expected} employés attendus`
        },
        label: function(context: any) {
          return `${context.dataset.label}: ${context.parsed.y} employé${context.parsed.y > 1 ? 's' : ''}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        font: {
          size: 11
        }
      },
      grid: {
        color: '#f1f5f9'
      }
    }
  }
}

// Méthodes
const formatDelay = (minutes: number): string => {
  if (!minutes || minutes === 0) return '0 min'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}`
  }
  return `${mins} min`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const handleDayClick = (day: any) => {
  console.log('📅 Jour cliqué:', day)
  selectedDay.value = day
  showDayDetailsModal.value = true
  activeTab.value = 'present'
}

const closeDayDetails = () => {
  showDayDetailsModal.value = false
  selectedDay.value = null
}

const toggleDataset = (type: 'present' | 'late' | 'absent' | 'rest') => {
  datasetsVisibility.value[type] = !datasetsVisibility.value[type]
}
</script>

<style scoped>
.alerts-insights-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ================= METRICS CARDS ================= */
.metrics-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

.metric-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Cercle de progression */
.metric-circle {
  position: relative;
  width: 80px;
  height: 80px;
  min-width: 80px;
}

.circle-svg {
  width: 100%;
  height: 100%;
}

.circle-progress {
  transition: stroke-dashoffset 1s ease;
}

.circle-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.circle-content .metric-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.circle-content .metric-total {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 600;
}

/* Icônes métriques */
.metric-icon {
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.metric-card.delay-max .metric-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.metric-icon svg {
  width: 28px;
  height: 28px;
}

/* Info métriques */
.metric-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.metric-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.metric-value-text {
  font-size: 1.75rem;
  font-weight: 700;
}

.metric-value-text.success {
  color: #22c55e;
}

.metric-value-text.warning {
  color: #f59e0b;
}

.metric-percentage {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.metric-percentage.success {
  background: #d1fae5;
  color: #059669;
}

.metric-percentage.warning {
  background: #fef3c7;
  color: #d97706;
}

.metric-percentage.danger {
  background: #fee2e2;
  color: #dc2626;
}

.metric-percentage.info {
  background: #e0e7ff;
  color: #4f46e5;
}

/* ================= MODAL ================= */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-container {
  background: white;
  border-radius: 20px;
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 2rem;
  border-bottom: 2px solid #f1f5f9;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.5rem 0 0;
}

.modal-close {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.modal-close:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.modal-close svg {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* Summary Cards */
.day-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-card.present-card {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.summary-card.late-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.summary-card.absent-card {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.summary-card.rest-card {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.present-card .summary-icon {
  background: #22c55e;
  color: white;
}

.late-card .summary-icon {
  background: #f59e0b;
  color: white;
}

.absent-card .summary-icon {
  background: #ef4444;
  color: white;
}

.rest-card .summary-icon {
  background: #6366f1;
  color: white;
}

.summary-icon svg {
  width: 24px;
  height: 24px;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-value {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.summary-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
}

/* Tabs */
.employees-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 0.5rem;
}

.tab-button {
  padding: 0.75rem 1.25rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-button:hover {
  background: #f8fafc;
  color: #0f172a;
}

.tab-button.active {
  background: #f1f5f9;
  color: #0f172a;
}

.tab-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.tab-badge.success {
  background: #22c55e;
  color: white;
}

.tab-badge.warning {
  background: #f59e0b;
  color: white;
}

.tab-badge.danger {
  background: #ef4444;
  color: white;
}

.tab-badge.info {
  background: #6366f1;
  color: white;
}

/* Employees List */
.employees-list {
  min-height: 300px;
}

.employee-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.employee-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.employee-card:hover {
  background: white;
  border-color: #cbd5e1;
  transform: translateX(4px);
}

.employee-avatar {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  background-size: cover;
  background-position: center;
}

.employee-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.employee-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #0f172a;
}

.employee-position {
  font-size: 0.8rem;
  color: #64748b;
}

.delay-badge,
.time-badge {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.875rem;
  background: #fef3c7;
  color: #d97706;
}

.time-badge {
  background: #d1fae5;
  color: #059669;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #94a3b8;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1rem;
  font-weight: 500;
}

/* ================= ALERT CARDS ================= */
.alert-card {
  background: white;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 2px solid #f1f5f9;
}

.alert-icon-wrapper {
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.alert-icon-wrapper.danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.alert-icon-wrapper svg {
  width: 28px;
  height: 28px;
}

.alert-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.alert-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0;
}

.close-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.alert-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ================= RISK EMPLOYEES ================= */
.risk-employee-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.risk-employee-item:hover {
  background: #fee2e2;
  transform: translateX(4px);
}

.risk-employee-item .employee-avatar {
  width: 56px;
  height: 56px;
  min-width: 56px;
}

.employee-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-value.success {
  color: #22c55e;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.danger {
  color: #ef4444;
}

.attendance-badge {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
}

.attendance-badge.danger {
  background: #dc2626;
  color: white;
}

/* ================= CRITICAL DAYS ================= */
.critical-day-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.critical-day-item:hover {
  background: #fee2e2;
  transform: translateX(4px);
}

.day-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-text {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: capitalize;
}

.absence-badge {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.875rem;
}

.absence-badge.critical {
  background: #dc2626;
  color: white;
}

.day-stats {
  display: flex;
  gap: 2rem;
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* ================= EVOLUTION CARD ================= */
.evolution-card {
  background: white;
  border-radius: 18px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.evolution-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.evolution-subtitle {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
}

.evolution-chart-container {
  height: 320px;
  margin-bottom: 1rem;
}

/* Légende interactive */
.chart-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.legend-item:hover {
  background: #f8fafc;
}

.legend-item.disabled {
  opacity: 0.4;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.success {
  background: #22c55e;
}

.legend-dot.warning {
  background: #f59e0b;
}

.legend-dot.danger {
  background: #ef4444;
}

.legend-dot.info {
  background: #6366f1;
}

.legend-item span {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
  transition: opacity 0.2s ease;
}

.legend-item span.disabled {
  opacity: 0.4;
}

/* ================= ANIMATIONS ================= */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.9);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ================= RESPONSIVE ================= */
@media (max-width: 1400px) {
  .metrics-cards {
    grid-template-columns: repeat(3, 1fr);
  }

  .day-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .metrics-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .employee-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (max-width: 768px) {
  .metrics-cards {
    grid-template-columns: 1fr;
  }

  .day-summary {
    grid-template-columns: 1fr;
  }

  .risk-employee-item,
  .critical-day-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .day-stats {
    width: 100%;
    justify-content: space-between;
  }

  .employees-tabs {
    flex-wrap: wrap;
  }

  .modal-overlay {
    padding: 1rem;
  }

  .modal-header,
  .modal-body {
    padding: 1.5rem;
  }
}
</style>