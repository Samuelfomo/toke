<template>
  <div class="min-h-screen bg-gradient-to-br from-[#9cbdf6] via-[#f5f9ff] to-[#dbcdef]">
<!--  <div class="min-h-screen bg-gradient-to-br from-[#9cbdf6] via-[#e0daf6] to-[#dbcdef]">-->
    <Header />

    <main class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">

      <!-- ══════════════════ LOADING ══════════════════ -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-32 gap-4">
        <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600
                    rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 font-medium">Chargement des données...</p>
      </div>

      <!-- ══════════════════ ERREUR ══════════════════ -->
      <div
          v-else-if="error"
          class="flex flex-col items-center justify-center py-32 gap-4"
      >
        <div class="w-14 h-14 bg-red-100 text-red-500 rounded-2xl
                    flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-7 h-7">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                     1.732-3L13.732 4c-.77-1-1.732-1-2.464 0L4.34
                     16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-base font-bold text-slate-800">Erreur de chargement</h3>
        <p class="text-sm text-slate-500">{{ error }}</p>
        <button
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm
                 font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            @click="loadDashboardData()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0
                     0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Réessayer
        </button>
      </div>

      <!-- ══════════════════ CONTENU PRINCIPAL ══════════════════ -->
      <template v-else-if="dashboardData">

        <!-- 1. Hero : titre + filtre période + 6 KPI cards + bannière anomalie -->
        <DashboardHero
            :summary="dashboardData.summary"
            :date="dashboardData.date"
            :employees="employeesForFilter"
            :active-start-date="activeFilters.startDate"
            :active-end-date="activeFilters.endDate"
            :active-view-mode="activeFilters.viewMode"
            @filter-change="handleFilterChange"
        />

        <!-- 2. Stats : doughnut répartition + line chart évolution + absents + anomalies -->
        <DashboardStats
            :summary="dashboardData.summary"
            :employees="dashboardData.employees"
            :daily-breakdown="dashboardData.daily_breakdown"
            @employee-click="handleEmployeeClick"
        />

        <!-- 3. Grille principale : Équipe (tableau) à gauche + Timeline à droite -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

          <!-- Tableau équipe : 2/3 de la largeur -->
          <div class="xl:col-span-2">
            <EmployeeList
                :employees="displayedEmployees"
                @employee-click="handleEmployeeClick"
                @memo-click="handleMemoClick"
                @action-click="handleEmployeeClick"
                @view-all="handleViewAllEmployees"
            />
          </div>

          <!-- Timeline des arrivées : 1/3 de la largeur -->
          <div class="xl:col-span-1">
            <AttendanceTimeline
                :employees="dashboardData.employees"
                :days-back="isAnalyticsMode ? periodDays : 7"
                @employee-click="handleEmployeeClick"
                @view-all="handleViewAllEmployees"
            />
          </div>
        </div>

        <!-- 4. Insights rapides (Insights panel) -->
        <div class="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
          <h4 class="text-sm font-bold text-slate-800 mb-4">Insights rapides</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            <!-- Insight 1 : Anomalies -->
            <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                   :class="(dashboardData.summary.total_anomaly_off_days ?? 0) > 0
                     ? 'bg-orange-100 text-orange-600'
                     : 'bg-slate-100 text-slate-400'"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     class="w-4 h-4">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p class="text-xs text-slate-700 leading-snug">
                <template v-if="(dashboardData.summary.total_anomaly_off_days ?? 0) > 0">
                  <strong>{{ dashboardData.summary.total_anomaly_off_days }}</strong>
                  présence(s) hors planning détectées
                </template>
                <template v-else>
                  <span class="text-slate-400">Aucune anomalie détectée</span>
                </template>
              </p>
            </div>

            <!-- Insight 2 : Retards -->
            <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <div class="w-7 h-7 rounded-lg bg-amber-100 text-amber-600
                          flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     class="w-4 h-4">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p class="text-xs text-slate-700 leading-snug">
                <strong>{{ dashboardData.summary.total_late_arrivals }}</strong>
                employé(s) en retard
                <template v-if="dashboardData.summary.average_delay_minutes > 0">
                  (moy. <strong>{{ Math.round(dashboardData.summary.average_delay_minutes) }} min</strong>)
                </template>
              </p>
            </div>

            <!-- Insight 3 : Couverture -->
            <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600
                          flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     class="w-4 h-4">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p class="text-xs text-slate-700 leading-snug">
                Couverture moyenne de l'équipe :
                <strong>{{ dashboardData.summary.team_coverage?.coverage_rate ?? 0 }}%</strong>
              </p>
            </div>

            <!-- Insight 4 : Absences critiques -->
            <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                   :class="dashboardData.summary.total_absences > 0
                     ? 'bg-red-100 text-red-600'
                     : 'bg-emerald-100 text-emerald-600'"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     class="w-4 h-4">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-xs text-slate-700 leading-snug">
                <template v-if="dashboardData.summary.total_absences > 0">
                  <strong>{{ dashboardData.summary.total_absences }}</strong>
                  absence(s) —
                  <strong class="text-red-600">
                    {{ dashboardData.summary.justification_status?.without_memo ?? 0 }}
                  </strong>
                  non justifiées
                </template>
                <template v-else>
                  <span class="text-emerald-700">Aucune absence critique sur la période</span>
                </template>
              </p>
            </div>

          </div>
        </div>

        <!-- 5. Détail pointage employé sélectionné (panel latéral conditionnel) -->
        <transition name="slide-up">
          <div
              v-if="selectedEmployee"
              class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200
                   shadow-2xl rounded-t-2xl max-h-[70vh] overflow-y-auto
                   xl:static xl:rounded-2xl xl:shadow-sm xl:border xl:max-h-none xl:overflow-visible"
          >
            <EmployeeViewPointage
                :employees="displayedEmployees"
                :selected-employee="selectedEmployee as any"
                @employee-click="handleEmployeeClick"
                @close="closeEmployeePanel"
            />
          </div>
        </transition>

      </template>
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import UserService from '../../service/UserService'
import DashboardHero       from '../dashboard/dashboardHero.vue'
import DashboardStats      from '../dashboard/dashboardStats.vue'
import EmployeeList        from '../dashboard/employeeList.vue'
import AttendanceTimeline  from '../dashboard/attendanceTimeline.vue'
import EmployeeViewPointage from '../dashboard/employeeViewPointage.vue'
import Header from '../components/header.vue'
import Footer from '../components/footer.vue'
import type {
  DashboardData,
  TransformedEmployee,
} from '@/utils/interfaces/stat.interface'
import HeadBuilder from '@/utils/HeadBuilder'
import statsCss    from '../../assets/css/toke-dMain-04.css?url'

// ── Interface locale filtre ───────────────────────────────────────────────────
interface EmployeeForFilter {
  id  : string | number
  name: string
}

// ── State ─────────────────────────────────────────────────────────────────────
const userStore      = useUserStore()
const loading        = ref<boolean>(true)
const error          = ref<string | null>(null)
const dashboardData  = ref<DashboardData | null>(null)
const selectedEmployee = ref<TransformedEmployee | null>(null)

const activeFilters = ref({
  startDate : '',
  endDate   : '',
  employeeId: '',
  period    : 'day',
  viewMode  : 'normal' as 'normal' | 'analytics',
})

// ── Computeds ─────────────────────────────────────────────────────────────────
const isAnalyticsMode = computed(() => activeFilters.value.viewMode === 'analytics')

/** Nombre de jours dans la période sélectionnée (pour la timeline) */
const periodDays = computed(() => {
  if (!activeFilters.value.startDate || !activeFilters.value.endDate) return 7
  const diff =
      (new Date(activeFilters.value.endDate).getTime() -
          new Date(activeFilters.value.startDate).getTime()) /
      86400000
  return Math.max(1, Math.ceil(diff) + 1)
})

const employeesForFilter = computed<EmployeeForFilter[]>(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.employees.map(emp => ({ id: emp.guid, name: emp.name }))
})

const displayedEmployees = computed(() => {
  if (!dashboardData.value) return []
  if (activeFilters.value.employeeId) {
    return dashboardData.value.employees.filter(
        emp => String(emp.guid) === String(activeFilters.value.employeeId)
    )
  }
  return dashboardData.value.employees
})

// ── Chargement des données ────────────────────────────────────────────────────
const loadDashboardData = async (startDate?: string, endDate?: string) => {
  try {
    loading.value = true
    error.value   = null

    if (!userStore.user?.guid) throw new Error('Utilisateur non connecté')

    const data = await UserService.getDashboardData(
        userStore.user.guid,
        startDate,
        endDate
    )
    dashboardData.value = data

    console.info('✅ Dashboard chargé', {
      total  : data.employees.length,
      present: data.presentEmployees?.length,
      absent : data.absentEmployees?.length,
      late   : data.lateEmployees?.length,
      period : `${data.period.start} → ${data.period.end}`,
    })
  } catch (err: any) {
    console.error('❌ Erreur dashboard:', err)
    error.value = err.message ?? 'Impossible de charger les données du dashboard'
  } finally {
    loading.value = false
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────
const handleFilterChange = async (filters: {
  startDate : string
  endDate   : string
  employeeId: string | number | ''
  period    : string
  viewMode  : 'normal' | 'analytics'
}) => {
  activeFilters.value = {
    startDate : filters.startDate,
    endDate   : filters.endDate,
    employeeId: String(filters.employeeId),
    period    : filters.period,
    viewMode  : filters.viewMode,
  }
  await loadDashboardData(filters.startDate, filters.endDate)
}

const handleEmployeeClick = (employee: TransformedEmployee) => {
  // Toggle : re-cliquer ferme le panel
  selectedEmployee.value =
      selectedEmployee.value?.guid === employee.guid ? null : employee
}

const handleMemoClick = (employee: TransformedEmployee) => {
  console.info('📝 Mémo pour :', employee.name)
}

const handleViewAllEmployees = () => {
  console.info('👥 Voir toute l\'équipe')
  // Navigation vers la vue équipe complète si elle existe
  // router.push('/team')
}

const closeEmployeePanel = () => {
  selectedEmployee.value = null
}

const refreshDashboard = () => {
  loadDashboardData(
      activeFilters.value.startDate || undefined,
      activeFilters.value.endDate   || undefined
  )
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let refreshInterval: number | ReturnType<typeof window.setInterval> | undefined

onMounted(() => {
  loadDashboardData()

  // Auto-refresh toutes les 5 minutes
  refreshInterval = window.setInterval(refreshDashboard, 5 * 60 * 1000)

  HeadBuilder.apply({
    title: 'Dashboard – Toké',
    css  : [statsCss],
    meta : { viewport: 'width=device-width, initial-scale=1.0' },
  })
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

defineExpose({ refreshDashboard })
</script>

<style scoped>
/* Transition pour le panel pointage (mobile : slide-up depuis le bas) */
.slide-up-enter-active { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease; }
.slide-up-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-up-enter-from   { transform: translateY(100%); opacity: 0; }
.slide-up-leave-to     { transform: translateY(100%); opacity: 0; }
</style>