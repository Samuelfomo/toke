``<template>
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
          <span class="metric-label">Présence(s)</span>
          <span class="metric-percentage success">sur {{ totalDaysInPeriod }} jours</span>
        </div>
      </div>

      <!-- Retards -->
      <div class="metric-card late">
        <div class="metric-circle">
          <div class="circle-content">
            <span class="metric-value">{{ lateRate }}%</span>
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
          <span class="metric-label">retard(s)</span>
          <span class="metric-percentage warning"> sur {{ totalDaysInPeriod }} jours</span>
        </div>
      </div>

      <!-- Absences -->
      <div class="metric-card absent">
        <div class="metric-circle">
          <div class="circle-content">
            <span class="metric-value">{{ absenceRate }}%</span>
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
          <span class="metric-label">Absence(s)</span>
          <span class="metric-percentage danger"> sur {{ totalDaysInPeriod }} jours</span>
        </div>
      </div>
    </div>

    <!-- ================= ÉVOLUTION SUR LA PÉRIODE ================= -->
    <div class="evolution-card">
      <h3 class="evolution-title">
        📊 {{ chartTitle }}
        <span class="evolution-subtitle">{{ chartSubtitle }}</span>
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
      </div>
    </div>

    <!-- ================= MODAL DÉTAILS DU JOUR ================= -->
    <transition name="modal-fade">
      <div v-if="showDayDetailsModal" class="modal-overlay" @click="closeDayDetails">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <div>
              <h3 class="modal-title">
                <span v-if="selectedTimeSlot">⏱ Pointages de {{ selectedTimeSlot }}</span>
                <span v-else>📅 Détails du {{ formatDate(selectedDay?.date || '') }}</span>
              </h3>
              <p class="modal-subtitle">
                <span v-if="selectedTimeSlot">
                  {{ selectedDayEmployees.present.length + selectedDayEmployees.late.length }}
                  employé{{ selectedDayEmployees.present.length + selectedDayEmployees.late.length > 1 ? 's' : '' }}
                  arrivé{{ selectedDayEmployees.present.length + selectedDayEmployees.late.length > 1 ? 's' : '' }}
                  à {{ selectedTimeSlot }}
                  — <button class="link-btn" @click="selectedTimeSlot = null">Voir tous</button>
                </span>
                <span v-else>{{ selectedDay?.expected }} employés attendus</span>
              </p>
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
                      class="employee-card employee-card--clickable"
                      @click="goToEmployeeDay(emp)"
                      :title="`Voir les pointages de ${emp.name} pour ce jour`"
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
                    <div v-if="activeTab === 'present' && emp.dayDetail?.clock_in_time" class="time-badge">
                      {{ formatTime(emp.dayDetail.clock_in_time) }}
                    </div>
                    <div class="nav-arrow">→</div>
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
<!--            <div class="attendance-badge danger">-->
<!--              {{ Math.round(emp.period_stats.attendance_rate) }}%-->
<!--            </div>-->
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
            </div>
          </div>
        </div>
      </transition>
    </div>

  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TransformedEmployee } from '@/service/UserService'
import "../../assets/css/toke-AttendanceEvolution-27.css"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
} from 'chart.js'
import { Line, Scatter } from 'vue-chartjs'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ScatterController,
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

const router = useRouter()

// Navigation vers la page de détail des pointages d'un employé pour un jour précis
const goToEmployeeDay = (emp: TransformedEmployee & { dayDetail?: any }) => {
  const date = selectedDay.value?.date || ''
  router.push({
    name: 'employeeAttendanceView',
    params: { id: emp.guid, query: date },
    query: { date }
  })
}

// États
const hideRiskEmployees = ref(false)
const hideCriticalDays = ref(false)
const showDayDetailsModal = ref(false)
const selectedDay = ref<any>(null)
const activeTab = ref<'present' | 'late' | 'absent'>('present')

const datasetsVisibility = ref({
  present: true,
  late: true,
  absent: true
})

// Tabs configuration
const tabs = [
  { key: 'present' as const, label: 'Présents à l\'heure', badgeClass: 'success', emptyLabel: 'présent à l\'heure' },
  { key: 'late' as const, label: 'En retard', badgeClass: 'warning', emptyLabel: 'en retard' },
  { key: 'absent' as const, label: 'Absents', badgeClass: 'danger', emptyLabel: 'absent' },
]

// Métriques globales
// On utilise dailyData (qui résout les statuts active/on-pause) comme source de vérité
// plutôt que period_stats qui peut ne pas inclure les employés avec session ouverte.
const totalEmployees = computed(() => props.employees.length)

const totalExpected = computed(() => {
  return dailyData.value.reduce((sum, d) => sum + d.expected, 0)
})

const totalPresent = computed(() => {
  return dailyData.value.reduce((sum, d) => sum + d.present, 0)
})

const totalLate = computed(() => {
  return dailyData.value.reduce((sum, d) => sum + d.late, 0)
})

const totalAbsences = computed(() => {
  return dailyData.value.reduce((sum, d) => sum + d.absent, 0)
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

// Calcule le taux de présence réel d'un employé à partir de ses daily_details,
// en résolvant correctement les statuts 'active' et 'on-pause' comme des présences/retards.
// Cela corrige l'attendance_rate de l'API qui traite ces statuts comme des absences.
const computeRealAttendanceRate = (emp: TransformedEmployee): number => {
  let workDaysExpected = 0
  let daysPresent = 0

  emp.daily_details.forEach(day => {
    const resolved = resolveStatus(day)
    if (resolved === 'off-day') return

    workDaysExpected++
    if (resolved === 'present' || resolved === 'late') {
      daysPresent++
    }
  })

  if (workDaysExpected === 0) return 0
  return (daysPresent / workDaysExpected) * 100
}

// Employés à risque (taux de présence réel < 60%)
const atRiskEmployees = computed(() => {
  return props.employees
      .filter(emp => {
        if (emp.period_stats.work_days_expected === 0) return false
        const realRate = computeRealAttendanceRate(emp)
        return realRate < 60
      })
      .map(emp => ({
        ...emp,
        period_stats: {
          ...emp.period_stats,
          attendance_rate: computeRealAttendanceRate(emp)
        }
      }))
      .sort((a, b) => a.period_stats.attendance_rate - b.period_stats.attendance_rate)
})

// Résolution du statut réel pour un daily_detail:
// 'active' et 'on-pause' indiquent que l'employé est présent (session ouverte).
// On les traduit en 'present' ou 'late' selon delay_minutes, exactement comme
// dans UserService.transformEmployee(), pour que les graphiques soient cohérents.
const resolveStatus = (day: { status: string; delay_minutes: number | null }): string => {
  if (day.status === 'active' || day.status === 'on-pause') {
    return (day.delay_minutes ?? 0) > 0 ? 'late' : 'present'
  }
  return day.status
}

// Agrégation quotidienne — utilise les statuts résolus
const dailyData = computed(() => {
  const dateMap = new Map<string, {
    date: string
    expected: number
    present: number
    late: number
    absent: number
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
        })
      }

      const data = dateMap.get(day.date)!
      const resolvedStatus = resolveStatus(day)

      if (resolvedStatus !== 'off-day') {
        data.expected++
      }

      if (resolvedStatus === 'present') data.present++
      else if (resolvedStatus === 'late') data.late++
      else if (resolvedStatus === 'absent') data.absent++
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

// Convertit un ISO string ou "HH:mm" en "HH:mm" UTC (réutilisé ici pour le filtre)
const toHHMM = (timeStr: string | null): string | null => {
  if (!timeStr) return null
  if (timeStr.includes('T') || timeStr.includes('Z')) {
    const d = new Date(timeStr)
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
  }
  return timeStr.length >= 5 ? timeStr.slice(0, 5) : null
}

// Employés du jour — filtrés par créneau horaire si selectedTimeSlot est défini
const selectedDayEmployees = computed(() => {
  if (!selectedDay.value) {
    return { present: [], late: [], absent: [] }
  }

  const date = selectedDay.value.date
  const timeFilter = selectedTimeSlot.value  // "HH:mm" ou null

  const result: {
    present: (TransformedEmployee & { dayDetail?: any })[]
    late: (TransformedEmployee & { dayDetail?: any })[]
    absent: (TransformedEmployee & { dayDetail?: any })[]
  } = { present: [], late: [], absent: [] }

  props.employees.forEach(emp => {
    const dayDetail = emp.daily_details.find(d => d.date === date)
    if (!dayDetail) return

    // Si filtre horaire actif, ne garder que les employés arrivés à ce créneau exact
    if (timeFilter !== null) {
      const clockInHHMM = toHHMM(dayDetail.clock_in_time)
      if (clockInHHMM !== timeFilter) return
    }

    const empWithDetail = { ...emp, dayDetail }
    const resolved = resolveStatus(dayDetail)

    if (resolved === 'present') result.present.push(empWithDetail)
    else if (resolved === 'late') result.late.push(empWithDetail)
    else if (resolved === 'absent' && !timeFilter) result.absent.push(empWithDetail)
  })

  return result
})

// Alias utilisé par handleTimeSlotClick avant que selectedDay soit défini
const selectedDayEmployeesByTime = selectedDayEmployees

// ============ DONNÉES RÉELLES DE POINTAGE — JOUR UNIQUE ============
// Construit les labels (vraies heures HH:mm) et pour chaque heure,
// le nombre d'employés arrivés à ce moment précis (présents ou en retard).
// Pas de cumul — chaque point = combien sont arrivés à cette heure exacte.
const buildRealClockInData = () => {
  const toHHMM = (timeStr: string | null): string | null => {
    if (!timeStr) return null
    if (timeStr.includes('T') || timeStr.includes('Z')) {
      const d = new Date(timeStr)
      return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
    }
    return timeStr.length >= 5 ? timeStr.slice(0, 5) : null
  }

  const todayStr = dailyData.value[0]?.date || ''

  // Compter combien d'employés sont arrivés à chaque heure exacte
  const presentByTime = new Map<string, number>()
  const lateByTime = new Map<string, number>()

  props.employees.forEach(emp => {
    const dayDetail = emp.daily_details.find(d => d.date === todayStr)
    if (!dayDetail) return

    const resolved = resolveStatus(dayDetail)
    if (resolved !== 'present' && resolved !== 'late') return

    const hhmm = toHHMM(dayDetail.clock_in_time)
    if (!hhmm) return

    if (resolved === 'present') {
      presentByTime.set(hhmm, (presentByTime.get(hhmm) || 0) + 1)
    } else {
      lateByTime.set(hhmm, (lateByTime.get(hhmm) || 0) + 1)
    }
  })

  // Tous les créneaux horaires distincts, triés
  const allTimes = [...new Set([...presentByTime.keys(), ...lateByTime.keys()])].sort()

  if (allTimes.length === 0) {
    return { labels: ['—'], presentData: [0], lateData: [0] }
  }

  const presentData = allTimes.map(t => presentByTime.get(t) || 0)
  const lateData = allTimes.map(t => lateByTime.get(t) || 0)

  return { labels: allTimes, presentData, lateData }
}

// Déterminer si on est sur un jour unique ou une période
const isSingleDay = computed(() => dailyData.value.length === 1)

const totalDaysInPeriod = computed(() => {
  // Obtenir toutes les dates uniques des daily_details
  const uniqueDates = new Set<string>()
  props.employees.forEach(emp => {
    emp.daily_details.forEach(day => {
      uniqueDates.add(day.date)
    })
  })
  const days = uniqueDates.size
  console.log('📅 totalDaysInPeriod:', days, 'dates:', Array.from(uniqueDates).sort())
  return days
})

// Titres et sous-titres adaptatifs
const chartTitle = computed(() => {
  return isSingleDay.value ? 'Évolution de la journée' : 'Évolution sur la période'
})

const chartSubtitle = computed(() => {
  return isSingleDay.value
      ? 'Heures de pointage — survoler un point pour voir qui est arrivé'
      : 'Cliquer sur un jour pour voir le détail'
})

// Données du graphique d'évolution - UNIFIÉ avec support jour unique
const evolutionChartData = computed(() => {
  let labels, presentValues, lateValues, absentValues

  if (isSingleDay.value && dailyData.value.length > 0) {
    // MODE JOUR UNIQUE : vraies heures de pointage cumulatives
    const realData = buildRealClockInData()
    labels = realData.labels
    presentValues = realData.presentData
    lateValues = realData.lateData
    // Les absents n'ont pas d'heure de pointage → dataset absent non tracé en mode jour unique
    absentValues = realData.labels.map(() => 0)
  } else {
    // MODE PÉRIODE : Données quotidiennes normales
    labels = dailyData.value.map(d =>
        new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    )
    presentValues = dailyData.value.map(d => d.present)
    lateValues = dailyData.value.map(d => d.late)
    absentValues = dailyData.value.map(d => d.absent)
  }

  const datasets = []

  if (datasetsVisibility.value.present) {
    datasets.push({
      label: 'Présents',
      data: presentValues,
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
      data: lateValues,
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
      data: absentValues,
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

  return {
    labels,
    datasets
  }
})

// Options du graphique - adaptées pour un ou plusieurs jours
const evolutionChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onClick: (event: any, elements: any[]) => {
    if (elements.length === 0) return

    if (isSingleDay.value) {
      // Mode jour unique : ouvrir le modal filtré par l'heure cliquée
      const timeLabel = evolutionChartData.value.labels[elements[0].index] as string
      handleTimeSlotClick(timeLabel)
    } else {
      // Mode période : ouvrir le modal du jour cliqué
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
          if (isSingleDay.value) {
            return `Pointages à ${context[0].label}`
          } else {
            const index = context[0].dataIndex
            const day = dailyData.value[index]
            return formatDate(day.date)
          }
        },
        afterTitle: function(context: any) {
          if (isSingleDay.value) {
            return `${dailyData.value[0].expected} employés attendus`
          } else {
            const index = context[0].dataIndex
            const day = dailyData.value[index]
            return `${day.expected} employés attendus`
          }
        },
        label: function(context: any) {
          const count = context.parsed.y
          if (count === 0) return ''
          return `${context.dataset.label}: ${count} employé${count > 1 ? 's' : ''}`
        },
        footer: function(context: any) {
          if (isSingleDay.value) {
            return 'Cliquez pour voir la liste'
          }
          return ''
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
        },
        maxRotation: isSingleDay.value ? 45 : 0,
        minRotation: isSingleDay.value ? 45 : 0,
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
}))

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

const formatTime = (time: string): string => {
  if (!time) return '—'
  // Gère les formats "HH:MM:SS", "HH:MM" ou ISO datetime
  const match = time.match(/(\d{2}):(\d{2})/)
  if (!match) return time
  return `${match[1]}h${match[2]}`
}

const handleDayClick = (day: any) => {
  console.log('📅 Jour cliqué:', day)
  selectedDay.value = day
  selectedTimeSlot.value = null   // pas de filtre horaire
  showDayDetailsModal.value = true
  activeTab.value = 'present'
}

// Créneau horaire sélectionné (mode jour unique — clic sur un point)
const selectedTimeSlot = ref<string | null>(null)

const handleTimeSlotClick = (time: string) => {
  const day = dailyData.value[0]
  if (!day) return
  selectedDay.value = day
  selectedTimeSlot.value = time
  showDayDetailsModal.value = true
  // Ouvrir l'onglet le plus pertinent : en retard si des retardataires, sinon présents
  const hasLate = selectedDayEmployeesByTime.value.late.length > 0
  activeTab.value = hasLate ? 'late' : 'present'
}

const closeDayDetails = () => {
  showDayDetailsModal.value = false
  selectedDay.value = null
  selectedTimeSlot.value = null
}

const toggleDataset = (type: 'present' | 'late' | 'absent') => {
  datasetsVisibility.value[type] = !datasetsVisibility.value[type]
}
</script>

<style scoped>

</style>