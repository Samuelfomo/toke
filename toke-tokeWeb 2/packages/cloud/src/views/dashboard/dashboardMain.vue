<template>
  <div class="dashboard-container">
    <Header />

    <main class="dashboard-content">
      <div class="content-container">
        <!-- Afficher le skeleton pendant le chargement -->
        <template v-if="loading">
          <div class="dashboard-skeleton">
            <div class="skeleton-hero">
              <div class="skeleton-header"></div>
              <div class="skeleton-stats-grid">
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
              </div>
            </div>
            <div class="skeleton-list">
              <div class="skeleton-filters"></div>
              <div class="skeleton-cards"></div>
            </div>
          </div>
        </template>

        <!-- Afficher le contenu une fois les données chargées -->
        <template v-else-if="attendanceData">
          <DashboardHero
            :summary="attendanceData.summary"
            :daily-breakdown="attendanceData.daily_breakdown"
            :period-start="periodStart"
            :period-end="periodEnd"
            :loading="false"
            @period-change="handlePeriodChange"
            @refresh="loadData"
            @export="exportData"
          />

          <EmployeeStatusList
            :employees="attendanceData.employees as any"
            :summary="attendanceData.summary"
            :daily-breakdown="attendanceData.daily_breakdown"
            @refresh-data="loadData"
          />
        </template>

        <!-- Message d'erreur si échec -->
        <template v-else-if="error">
          <div class="error-state">
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3>Erreur de chargement</h3>
            <p>{{ error }}</p>
            <button @click="loadData" class="retry-btn">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Réessayer
            </button>
          </div>
        </template>
      </div>
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import UserService from '@/service/UserService'
import Header from '../components/header.vue'
import DashboardHero from './dashboardHero.vue'
import EmployeeStatusList from '../dashboard/employeeStatusList.vue'
import Footer from '../components/footer.vue'
import dashboardCss from "../../assets/css/toke-dMain-04.css?url"
import footerCss from "../../assets/css/toke-footer-24.css?url"
import HeadBuilder from '../../utils/HeadBuilder'
import cardCss from "../../assets/css/tokt-employeeC-06.css?url"

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

interface Employee {
  employee: {
    guid: string
    email: string
    first_name: string
    last_name: string
    phone_number: string
    employee_code: string
    avatar_url: string | null
    department: string
    job_title: string
  }
  period_stats: any
  daily_details: any[]
}

interface AttendanceData {
  period: {
    start: string
    end: string
    total_days: number
  }
  summary: PeriodSummary
  daily_breakdown: DailyBreakdown[]
  employees: Employee[]
}

const userStore = useUserStore()
const loading = ref(true)
const error = ref<string | null>(null)
const attendanceData = ref<AttendanceData | null>(null)
const notificationCount = ref(2)

// Dates par défaut (aujourd'hui)
const periodStart = ref(new Date().toISOString().split('T')[0])
const periodEnd = ref(new Date().toISOString().split('T')[0])

const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    // Vérifier que l'utilisateur est connecté
    if (!userStore.user?.guid) {
      throw new Error('Utilisateur non connecté')
    }

    // Construire l'URL avec les paramètres de période
    const params = new URLSearchParams({
      supervisor: userStore.user.guid,
      start_date: periodStart.value,
      end_date: periodEnd.value
    })

    // Récupérer les données de l'API (adapter selon votre endpoint réel)
    const response = await UserService.listAttendance(userStore.user.guid, params.toString())

    if (response.success && response.data?.data) {
      // Adapter la structure de la réponse à notre format
      const apiData = response.data.data

      attendanceData.value = {
        period: apiData.period,
        summary: apiData.summary,
        daily_breakdown: apiData.daily_breakdown,
        employees: apiData.employees
      }
    } else {
      throw new Error('Format de réponse invalide')
    }
  } catch (err: any) {
    console.error('❌ Erreur lors du chargement:', err)
    error.value = err.message || 'Impossible de charger les données d\'assiduité'
  } finally {
    loading.value = false
  }
}

const handlePeriodChange = ({ start, end }: { start: string; end: string }) => {
  periodStart.value = start
  periodEnd.value = end
  loadData()
}

const exportData = async () => {
  if (!attendanceData.value) return

  try {
    // Créer un CSV avec les données
    const headers = [
      'Date',
      'Jour',
      'Attendus',
      'Présents',
      'Retards',
      'Absents',
      'Repos'
    ]

    const rows = attendanceData.value.daily_breakdown.map(day => [
      day.date,
      day.day_of_week,
      day.expected_count,
      day.present,
      day.late,
      day.absent,
      day.off_day
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Créer un blob et télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `attendance_${periodStart.value}_${periodEnd.value}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('✅ Export réussi')
  } catch (err) {
    console.error('❌ Erreur lors de l\'export:', err)
    error.value = 'Erreur lors de l\'export des données'
  }
}

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Dashboard - Toké',
    css: [dashboardCss, cardCss, footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  // Charger les données
  await loadData()
})
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
}

.dashboard-content {
  flex: 1;
  padding: 2rem;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* Skeleton States */
.dashboard-skeleton {
  animation: fadeIn 0.3s ease;
}

.skeleton-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.skeleton-header {
  height: 80px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  margin-bottom: 2rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.skeleton-stat {
  height: 120px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-list {
  background: white;
  border-radius: 16px;
  padding: 2rem;
}

.skeleton-filters {
  height: 50px;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.error-icon {
  width: 64px;
  height: 64px;
  color: #ef4444;
  margin-bottom: 1.5rem;
}

.error-state h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.error-state p {
  color: #6b7280;
  margin: 0 0 2rem 0;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.icon-sm {
  width: 18px;
  height: 18px;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-content {
    padding: 1rem;
  }

  .skeleton-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!--<template>-->
<!--  <div class="dashboard-container">-->
<!--    <Header :notification-count="notificationCount" />-->

<!--    <main class="dashboard-content">-->
<!--      <div class="content-container">-->
<!--        &lt;!&ndash; Afficher le skeleton pendant le chargement &ndash;&gt;-->
<!--        <template v-if="loading">-->
<!--          <div class="dashboard-skeleton">-->
<!--            <div class="skeleton-hero">-->
<!--              <div class="skeleton-header"></div>-->
<!--              <div class="skeleton-stats-grid">-->
<!--                <div class="skeleton-stat"></div>-->
<!--                <div class="skeleton-stat"></div>-->
<!--                <div class="skeleton-stat"></div>-->
<!--                <div class="skeleton-stat"></div>-->
<!--              </div>-->
<!--            </div>-->
<!--            <div class="skeleton-list">-->
<!--              <div class="skeleton-filters"></div>-->
<!--              <div class="skeleton-cards"></div>-->
<!--            </div>-->
<!--          </div>-->
<!--        </template>-->

<!--        &lt;!&ndash; Afficher le contenu une fois les données chargées &ndash;&gt;-->
<!--        <template v-else-if="attendanceData">-->
<!--          <DashboardHero-->
<!--            :statistics="attendanceData.data.statistics"-->
<!--            :date="attendanceData.data.date"-->
<!--            :loading="false"-->
<!--          />-->

<!--          <EmployeeStatusList-->
<!--            :employees="attendanceData.data.all_employees_status"-->
<!--            :statistics="attendanceData.data.statistics"-->
<!--            :present-employees="attendanceData.data.present_employees"-->
<!--            :late-employees="attendanceData.data.late_employees"-->
<!--            :absent-employees="attendanceData.data.absent_employees"-->
<!--            :off-day-employees="attendanceData.data.off_day_employees"-->
<!--            @refresh-data="loadData"-->
<!--          />-->
<!--        </template>-->

<!--        &lt;!&ndash; Message d'erreur si échec &ndash;&gt;-->
<!--        <template v-else-if="error">-->
<!--          <div class="error-state">-->
<!--            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>-->
<!--            </svg>-->
<!--            <h3>Erreur de chargement</h3>-->
<!--            <p>{{ error }}</p>-->
<!--            <button @click="loadData" class="retry-btn">-->
<!--              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>-->
<!--              </svg>-->
<!--              Réessayer-->
<!--            </button>-->
<!--          </div>-->
<!--        </template>-->
<!--      </div>-->
<!--    </main>-->

<!--    &lt;!&ndash; Footer &ndash;&gt;-->
<!--    <Footer />-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { onMounted, ref } from 'vue'-->
<!--import { useUserStore } from '@/stores/userStore'-->
<!--import UserService from '@/service/UserService'-->
<!--import Header from '../components/header.vue'-->
<!--import DashboardHero from './dashboardHero.vue'-->
<!--import EmployeeStatusList from '../dashboard/employeeStatusList.vue'-->
<!--import Footer from '../components/footer.vue'-->
<!--import dashboardCss from "../../assets/css/toke-dMain-04.css?url"-->
<!--import footerCss from "../../assets/css/toke-footer-24.css?url"-->
<!--import HeadBuilder from '../../utils/HeadBuilder'-->
<!--import type { Data } from '@/utils/interfaces/team.interface'-->
<!--import cardCss from "../../assets/css/tokt-employeeC-06.css?url"-->

<!--const userStore = useUserStore()-->
<!--const loading = ref(true)-->
<!--const error = ref<string | null>(null)-->
<!--const attendanceData = ref<Data | null>(null)-->
<!--const notificationCount = ref(2)-->

<!--const loadData = async () => {-->
<!--  try {-->
<!--    loading.value = true-->
<!--    error.value = null-->

<!--    // Vérifier que l'utilisateur est connecté-->
<!--    if (!userStore.user?.guid) {-->
<!--      throw new Error('Utilisateur non connecté')-->
<!--    }-->

<!--    // Récupérer les données de l'API-->
<!--    const response = await UserService.listAttendance(userStore.user.guid)-->

<!--    if (response.data && response.success) {-->
<!--      attendanceData.value = response.data as Data-->
<!--    } else {-->
<!--      throw new Error('Format de réponse invalide')-->
<!--    }-->
<!--  } catch (err: any) {-->
<!--    console.error('❌ Erreur lors du chargement:', err)-->
<!--    error.value = err.message || 'Impossible de charger les données d\'assiduité'-->
<!--  } finally {-->
<!--    loading.value = false-->
<!--  }-->
<!--}-->

<!--onMounted(async () => {-->
<!--  HeadBuilder.apply({-->
<!--    title: 'Dashboard - Toké',-->
<!--    css: [dashboardCss, cardCss, footerCss],-->
<!--    meta: { viewport: "width=device-width, initial-scale=1.0" }-->
<!--  })-->

<!--  // Charger les données-->
<!--  await loadData()-->
<!--})-->
<!--</script>-->

<!--<style scoped>-->

<!--</style>-->