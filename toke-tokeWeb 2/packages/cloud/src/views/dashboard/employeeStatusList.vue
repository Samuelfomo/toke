<template>
  <section class="employee-status-list">
    <div class="status-filters">
      <a
        v-for="tab in tabs"
        :key="tab.key"
        :class="['filter-btn', { active: activeTab === tab.key }]"
        @click.prevent="setActiveTab(tab.key)"
      >
        <span :class="['icon', tab.icon]"></span>
        <span>{{ tab.label }}</span>
        <span class="filter-count">{{ tab.count }}</span>
      </a>
    </div>

    <div class="employee-list">
      <!-- Section Problèmes (Absents + Retards) -->
      <div v-if="(activeTab === 'all' || activeTab === 'problems') && problemEmployees.length > 0">
        <div class="section-title section-problems">
          <span>⚠️ Problèmes à traiter ({{ problemEmployees.length }})</span>
          <svg class="chevron-icon" :class="{ 'rotated': expandedSections.problems }"
               @click="toggleSection('problems')"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <transition name="fade">
          <div v-show="expandedSections.problems" class="employees-grid">
            <EmployeeCard
              v-for="employee in problemEmployees"
              :key="employee.employee.guid"
              :employee="transformEmployee(employee)"
              @click="showEmployeeDetails(employee)"
            />
          </div>
        </transition>
      </div>

      <!-- Section Absents uniquement -->
      <div v-if="activeTab === 'absent' && filteredAbsentEmployees.length > 0">
        <div class="section-title section-problems">
          <span>❌ Employés absents ({{ filteredAbsentEmployees.length }})</span>
          <svg class="chevron-icon" :class="{ 'rotated': expandedSections.absent }"
               @click="toggleSection('absent')"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <transition name="fade">
          <div v-show="expandedSections.absent" class="employees-grid">
            <EmployeeCard
              v-for="employee in filteredAbsentEmployees"
              :key="employee.employee.guid"
              :employee="transformEmployee(employee)"
              @click="showEmployeeDetails(employee)"
            />
          </div>
        </transition>
      </div>

      <!-- Section Retards uniquement -->
      <div v-if="activeTab === 'late' && filteredLateEmployees.length > 0">
        <div class="section-title section-warning">
          <span>⏰ Employés en retard ({{ filteredLateEmployees.length }})</span>
          <svg class="chevron-icon" :class="{ 'rotated': expandedSections.late }"
               @click="toggleSection('late')"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <transition name="fade">
          <div v-show="expandedSections.late" class="employees-grid">
            <EmployeeCard
              v-for="employee in filteredLateEmployees"
              :key="employee.employee.guid"
              :employee="transformEmployee(employee)"
              @click="showEmployeeDetails(employee)"
            />
          </div>
        </transition>
      </div>

      <!-- Section Présents -->
      <div v-if="(activeTab === 'all' || activeTab === 'present') && filteredPresentEmployees.length > 0">
        <div class="section-title section-present">
          <span>✅ Employés présents ({{ filteredPresentEmployees.length }})</span>
          <svg class="chevron-icon" :class="{ 'rotated': expandedSections.present }"
               @click="toggleSection('present')"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <transition name="fade">
          <div v-show="expandedSections.present" class="employees-grid">
            <EmployeeCard
              v-for="employee in filteredPresentEmployees"
              :key="employee.employee.guid"
              :employee="transformEmployee(employee)"
              @click="showEmployeeDetails(employee)"
            />
          </div>
        </transition>
      </div>

      <!-- Section Jours de repos -->
      <div v-if="(activeTab === 'all' || activeTab === 'off-day') && filteredOffDayEmployees.length > 0">
        <div class="section-title section-info">
          <span>🏖️ Jours de repos ({{ filteredOffDayEmployees.length }})</span>
          <svg class="chevron-icon" :class="{ 'rotated': expandedSections.offDay }"
               @click="toggleSection('offDay')"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <transition name="fade">
          <div v-show="expandedSections.offDay" class="employees-grid">
            <EmployeeCard
              v-for="employee in filteredOffDayEmployees"
              :key="employee.employee.guid"
              :employee="transformEmployee(employee)"
              @click="showEmployeeDetails(employee)"
            />
          </div>
        </transition>
      </div>

      <!-- Message si aucun employé -->
      <div v-if="displayedEmployeesCount === 0" class="no-employees">
        <svg class="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <p>Aucun employé trouvé pour cette catégorie</p>
      </div>
    </div>
  </section>

  <!-- Modal de détails -->
  <div v-if="isModalOpen && selectedEmployee" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Détails de l'employé</h2>
        <button @click="closeModal" class="close-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="employee-info">
          <div class="employee-avatar">
            <div class="avatar-circle">{{ selectedEmployeeData?.initials }}</div>
          </div>
          <div class="employee-details">
            <h3>{{ selectedEmployeeData?.name }}</h3>
            <p class="employee-role">{{ selectedEmployee.employee.job_title }}</p>
            <p class="employee-department">{{ selectedEmployee.employee.department }}</p>
          </div>
        </div>

        <div class="period-stats">
          <h4>Statistiques de la période</h4>
          <div class="stats-grid-modal">
            <div class="stat-item">
              <span class="stat-label">Jours de travail attendus</span>
              <span class="stat-value">{{ selectedEmployee.period_stats.work_days_expected }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Jours présents</span>
              <span class="stat-value success">{{ selectedEmployee.period_stats.present_days }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Jours en retard</span>
              <span class="stat-value warning">{{ selectedEmployee.period_stats.late_days }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Jours absents</span>
              <span class="stat-value error">{{ selectedEmployee.period_stats.absent_days }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Taux de présence</span>
              <span class="stat-value">{{ selectedEmployee.period_stats.attendance_rate }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Heures travaillées (moy)</span>
              <span class="stat-value">{{ selectedEmployee.period_stats.average_work_hours_per_day.toFixed(1) }}h</span>
            </div>
          </div>
        </div>

        <div class="daily-details">
          <h4>Détails quotidiens</h4>
          <div class="timeline">
            <div
              v-for="detail in selectedEmployee.daily_details"
              :key="detail.date"
              :class="['timeline-item', `status-${detail.status}`]"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">
                  {{ formatDate(detail.date) }}
                </div>
                <div class="timeline-status">
                  <span :class="`status-badge status-${detail.status}`">
                    {{ formatStatus(detail.status) }}
                  </span>
                </div>
                <div v-if="detail.clock_in_time" class="timeline-time">
                  Arrivée: {{ detail.clock_in_time }}
                  <span v-if="detail.delay_minutes" class="delay-info">
                    ({{ detail.delay_minutes }}min de retard)
                  </span>
                </div>
                <div v-if="detail.work_hours" class="timeline-hours">
                  {{ detail.work_hours }}h travaillées
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import EmployeeCard from './employeeCard.vue'
import "../../assets/css/tokt-employeeS-05.css"

interface DailyDetail {
  date: string
  status: string
  clock_in_time: string | null
  clock_out_time: string | null
  expected_time: string | null
  delay_minutes: number | null
  work_hours: number | null
}

interface PeriodStats {
  work_days_expected: number
  present_days: number
  late_days: number
  absent_days: number
  off_days: number
  total_delay_minutes: number
  average_delay_minutes: number
  max_delay_minutes: number
  total_work_hours: number
  average_work_hours_per_day: number
  attendance_rate: number
  punctuality_rate: number
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
    active: boolean
  }
  period_stats: PeriodStats
  daily_details: DailyDetail[]
}

interface PeriodSummary {
  total_team_members: number
  total_present_on_time: number
  total_late_arrivals: number
  total_absences: number
  total_off_days: number
  currently_active: number
}

interface EmployeeDisplay {
  id: string
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info' | 'off-day'
  statusText: string
  location?: string
  time?: string
  avatar?: string
  priority?: 'high' | 'medium' | 'low'
}

interface Props {
  employees: Employee[]
  summary: PeriodSummary
  dailyBreakdown: any[]
}

const emit = defineEmits<{
  refreshData: []
}>()

const props = defineProps<Props>()

const activeTab = ref<string>('all')
const isModalOpen = ref<boolean>(false)
const selectedEmployee = ref<Employee | null>(null)
const expandedSections = ref<any>({
  problems: true,
  present: true,
  absent: true,
  late: true,
  offDay: true
})

// Calculer les problèmes (absents + retards)
const problemsCount = computed(() =>
  props.summary.total_absences + props.summary.total_late_arrivals
)

// Tabs avec les bons compteurs
const tabs = computed(() => [
  {
    key: 'all',
    label: 'Tous',
    icon: 'icon-users',
    count: props.summary.total_team_members
  },
  {
    key: 'problems',
    label: 'Problèmes',
    icon: 'icon-alert',
    count: problemsCount.value
  },
  {
    key: 'present',
    label: 'Présents',
    icon: 'icon-check',
    count: props.summary.total_present_on_time
  },
  {
    key: 'absent',
    label: 'Absents',
    icon: 'icon-x',
    count: props.summary.total_absences
  },
  {
    key: 'late',
    label: 'Retards',
    icon: 'icon-clock',
    count: props.summary.total_late_arrivals
  },
  {
    key: 'off-day',
    label: 'Repos',
    icon: 'icon-calendar',
    count: props.summary.total_off_days
  }
])

// Obtenir le statut actuel de l'employé (basé sur le dernier jour)
const getCurrentStatus = (employee: Employee): string => {
  if (!employee.daily_details.length) return 'off-day'

  // Prendre le dernier jour de la période
  const lastDay = employee.daily_details[employee.daily_details.length - 1]
  return lastDay.status
}

// Filtrer les employés par statut
const filteredPresentEmployees = computed(() =>
  props.employees.filter(emp => {
    const status = getCurrentStatus(emp)
    return status === 'present' || status === 'present-on-time'
  })
)

const filteredLateEmployees = computed(() =>
  props.employees.filter(emp => getCurrentStatus(emp) === 'late')
)

const filteredAbsentEmployees = computed(() =>
  props.employees.filter(emp => getCurrentStatus(emp) === 'absent')
)

const filteredOffDayEmployees = computed(() =>
  props.employees.filter(emp => getCurrentStatus(emp) === 'off-day')
)

const problemEmployees = computed(() => {
  return [...filteredAbsentEmployees.value, ...filteredLateEmployees.value]
})

const displayedEmployeesCount = computed(() => {
  if (activeTab.value === 'all') return props.employees.length
  if (activeTab.value === 'problems') return problemEmployees.value.length
  if (activeTab.value === 'present') return filteredPresentEmployees.value.length
  if (activeTab.value === 'absent') return filteredAbsentEmployees.value.length
  if (activeTab.value === 'late') return filteredLateEmployees.value.length
  if (activeTab.value === 'off-day') return filteredOffDayEmployees.value.length
  return 0
})

const selectedEmployeeData = computed(() => {
  if (!selectedEmployee.value) return null
  return transformEmployee(selectedEmployee.value)
})

// Transformer un employé pour l'affichage
const transformEmployee = (employee: Employee): EmployeeDisplay => {
  const status = getCurrentStatus(employee)
  const lastDay = employee.daily_details[employee.daily_details.length - 1]

  const firstName = employee.employee.first_name
  const lastName = employee.employee.last_name
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`

  let statusText = ''
  let priority: 'high' | 'medium' | 'low' = 'low'

  switch (status) {
    case 'present':
    case 'present-on-time':
      statusText = 'Présent'
      break
    case 'late':
      statusText = `Retard de ${lastDay.delay_minutes}min`
      priority = lastDay.delay_minutes && lastDay.delay_minutes > 60 ? 'high' : 'medium'
      break
    case 'absent':
      statusText = 'Absent'
      priority = 'high'
      break
    case 'off-day':
      statusText = 'Jour de repos'
      break
  }

  return {
    id: employee.employee.guid,
    name: `${firstName} ${lastName}`,
    initials,
    status: status as any,
    statusText,
    location: employee.employee.department,
    time: lastDay?.clock_in_time || undefined,
    avatar: employee.employee.avatar_url || undefined,
    priority
  }
}

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

const toggleSection = (section: string) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

const showEmployeeDetails = (employee: Employee) => {
  selectedEmployee.value = employee
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedEmployee.value = null
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

const formatStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'present': 'Présent',
    'present-on-time': 'Présent à l\'heure',
    'late': 'En retard',
    'absent': 'Absent',
    'off-day': 'Repos'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.employee-status-list {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
}

.filter-btn:hover {
  background: #e5e7eb;
}

.filter-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.filter-count {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.filter-btn.active .filter-count {
  background: rgba(255, 255, 255, 0.2);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f9fafb;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.section-title:hover {
  background: #f3f4f6;
}

.section-problems {
  background: #fef2f2;
  color: #991b1b;
}

.section-warning {
  background: #fffbeb;
  color: #92400e;
}

.section-present {
  background: #f0fdf4;
  color: #166534;
}

.section-info {
  background: #eff6ff;
  color: #1e40af;
}

.chevron-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.employees-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.no-employees {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #9ca3af;
  text-align: center;
}

.icon-lg {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Modal */
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.close-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e5e7eb;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.modal-body {
  padding: 1.5rem;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.employee-avatar {
  flex-shrink: 0;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
}

.employee-details h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #1f2937;
}

.employee-role,
.employee-department {
  color: #6b7280;
  margin: 0.25rem 0;
}

.period-stats,
.daily-details {
  margin-bottom: 2rem;
}

.period-stats h4,
.daily-details h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #1f2937;
}

.stats-grid-modal {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-value.success {
  color: #10b981;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.error {
  color: #ef4444;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.timeline-item {
  position: relative;
  padding-bottom: 1.5rem;
}

.timeline-dot {
  position: absolute;
  left: -1.5rem;
  top: 0.25rem;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #9ca3af;
  border: 2px solid white;
}

.timeline-item.status-present .timeline-dot,
.timeline-item.status-present-on-time .timeline-dot {
  background: #10b981;
}

.timeline-item.status-late .timeline-dot {
  background: #f59e0b;
}

.timeline-item.status-absent .timeline-dot {
  background: #ef4444;
}

.timeline-item.status-off-day .timeline-dot {
  background: #6366f1;
}

.timeline-date {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.timeline-status {
  margin-bottom: 0.25rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.status-present,
.status-badge.status-present-on-time {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-late {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-absent {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-off-day {
  background: #e0e7ff;
  color: #3730a3;
}

.timeline-time,
.timeline-hours {
  font-size: 0.875rem;
  color: #6b7280;
}

.delay-info {
  color: #dc2626;
  font-weight: 500;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 768px) {
  .employee-status-list {
    padding: 1rem;
  }

  .employees-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid-modal {
    grid-template-columns: 1fr;
  }

  .modal-content {
    max-height: 95vh;
  }
}
</style>

<!--<template>-->
<!--  <section class="employee-status-list">-->
<!--    <div class="status-filters">-->
<!--      <a-->
<!--        v-for="tab in tabs"-->
<!--        :key="tab.key"-->
<!--        :class="['filter-btn', { active: activeTab === tab.key }]"-->
<!--        @click.prevent="setActiveTab(tab.key)"-->
<!--      >-->
<!--        <span :class="['icon', tab.icon]"></span>-->
<!--        <span>{{ tab.label }}</span>-->
<!--        <span class="filter-count">{{ tab.count }}</span>-->
<!--      </a>-->
<!--    </div>-->

<!--    <div class="employee-list">-->
<!--      &lt;!&ndash; Section Problèmes (Absents + Retards) &ndash;&gt;-->
<!--      <div v-if="(activeTab === 'all' || activeTab === 'problems') && problemEmployees.length > 0">-->
<!--        <div class="section-title section-problems">-->
<!--          <span>Problèmes à traiter ({{ problemEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in problemEmployees"-->
<!--            :key="employee.employee.guid"-->
<!--            :employee="transformEmployee(employee)"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Absents uniquement &ndash;&gt;-->
<!--      <div v-if="activeTab === 'absent' && filteredAbsentEmployees.length > 0">-->
<!--        <div class="section-title section-problems">-->
<!--          <span>Employés absents ({{ filteredAbsentEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in filteredAbsentEmployees"-->
<!--            :key="employee.employee.guid"-->
<!--            :employee="transformEmployee(employee)"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Retards uniquement &ndash;&gt;-->
<!--      <div v-if="activeTab === 'late' && filteredLateEmployees.length > 0">-->
<!--        <div class="section-title section-problems">-->
<!--          <span>Employés en retard ({{ filteredAbsentEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in filteredLateEmployees"-->
<!--            :key="employee.employee.guid"-->
<!--            :employee="transformEmployee(employee)"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Présents &ndash;&gt;-->
<!--      <div v-if="(activeTab === 'all' || activeTab === 'present') && filteredPresentEmployees.length > 0">-->
<!--        <div class="section-title section-present">-->
<!--          <span>Employés présents ({{ filteredPresentEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in filteredPresentEmployees"-->
<!--            :key="employee.employee.guid"-->
<!--            :employee="transformEmployee(employee)"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Jours de repos &ndash;&gt;-->
<!--      <div v-if="(activeTab === 'all' || activeTab === 'off-day') && filteredOffDayEmployees.length > 0">-->
<!--        <div class="section-title section-info">-->
<!--          <span>Jours de repos ({{ filteredOffDayEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in filteredOffDayEmployees"-->
<!--            :key="employee.employee.guid"-->
<!--            :employee="transformEmployee(employee)"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Message si aucun employé &ndash;&gt;-->
<!--      <div v-if="displayedEmployeesCount === 0" class="no-employees">-->
<!--        <svg class="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"-->
<!--                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>-->
<!--        </svg>-->
<!--        <p>Aucun employé trouvé pour cette catégorie</p>-->
<!--      </div>-->
<!--    </div>-->
<!--  </section>-->

<!--  &lt;!&ndash; Modal de détails &ndash;&gt;-->
<!--  <div v-if="isModalOpen && selectedEmployee" class="modal-overlay" @click.self="closeModal">-->
<!--    <AssiduteDuJour-->
<!--      :employee="transformEmployee(selectedEmployee)"-->
<!--      @close="closeModal"-->
<!--      @action-completed="handleActionCompleted"-->
<!--      class="quick-detail-modal"-->
<!--    />-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed } from 'vue'-->
<!--import AssiduteDuJour from '../AssiduteDuJour.vue'-->
<!--import EmployeeCard from './employeeCard.vue'-->
<!--import type { Status, Statistics } from '@/utils/interfaces/team.interface'-->
<!--import "../../assets/css/tokt-employeeS-05.css"-->

<!--interface EmployeeDisplay {-->
<!--  id: string-->
<!--  name: string-->
<!--  initials: string-->
<!--  status: 'absent' | 'late' | 'present' | 'info' | 'off-day'-->
<!--  statusText: string-->
<!--  location?: string-->
<!--  time?: string-->
<!--  avatar?: string-->
<!--  priority?: 'high' | 'medium' | 'low'-->
<!--  isJustified?: boolean-->
<!--  isValidated?: boolean-->
<!--  checkInTime?: string-->
<!--  lateDuration?: string-->
<!--  absenceReason?: string-->
<!--  motif?: string-->
<!--}-->

<!--interface Props {-->
<!--  employees: Status[]-->
<!--  statistics: Statistics-->
<!--  presentEmployees?: any[]-->
<!--  lateEmployees?: any[]-->
<!--  absentEmployees?: any[]-->
<!--  offDayEmployees?: any[]-->
<!--}-->

<!--const emit = defineEmits<{-->
<!--  refreshData: []-->
<!--}>()-->

<!--const props = defineProps<Props>()-->

<!--const activeTab = ref<string>('all')-->
<!--const isModalOpen = ref<boolean>(false)-->
<!--const selectedEmployee = ref<Status | null>(null)-->

<!--// Calculer les problèmes (absents + retards)-->
<!--const problemsCount = computed(() =>-->
<!--  props.statistics.absences + props.statistics.late_arrivals-->
<!--)-->

<!--// Tabs avec les bons compteurs-->
<!--const tabs = computed(() => [-->
<!--  {-->
<!--    key: 'all',-->
<!--    label: 'Tous',-->
<!--    icon: 'icon-users',-->
<!--    count: props.statistics.total_team_members-->
<!--  },-->
<!--  {-->
<!--    key: 'problems',-->
<!--    label: 'Problèmes',-->
<!--    icon: 'icon-alert',-->
<!--    count: problemsCount.value-->
<!--  },-->
<!--  {-->
<!--    key: 'present',-->
<!--    label: 'Présents',-->
<!--    icon: 'icon-check',-->
<!--    count: props.statistics.present_to_days || 0-->
<!--  },-->
<!--  {-->
<!--    key: 'absent',-->
<!--    label: 'Absents',-->
<!--    icon: 'icon-x',-->
<!--    count: props.statistics.absences-->
<!--  },-->
<!--  {-->
<!--    key: 'late',-->
<!--    label: 'Retards',-->
<!--    icon: 'icon-clock',-->
<!--    count: props.statistics.late_arrivals-->
<!--  },-->
<!--  {-->
<!--    key: 'off-day',-->
<!--    label: 'Repos',-->
<!--    icon: 'icon-calendar',-->
<!--    count: props.statistics.off_day-->
<!--  }-->
<!--])-->

<!--// Filtrer les employés par statut-->
<!--const filteredPresentEmployees = computed(() =>-->
<!--  props.employees.filter(emp => emp.status === 'present' || emp.status === 'present-on-time')-->
<!--)-->

<!--const filteredLateEmployees = computed(() =>-->
<!--  props.employees.filter(emp => emp.status === 'late')-->
<!--)-->

<!--const filteredAbsentEmployees = computed(() =>-->
<!--  props.employees.filter(emp => emp.status === 'absent')-->
<!--)-->

<!--const filteredOffDayEmployees = computed(() =>-->
<!--  props.employees.filter(emp => emp.status === 'off-day')-->
<!--)-->

<!--const problemEmployees = computed(() => [-->
<!--  ...filteredAbsentEmployees.value,-->
<!--  ...filteredLateEmployees.value-->
<!--])-->

<!--// Compter les employés affichés-->
<!--const displayedEmployeesCount = computed(() => {-->
<!--  switch (activeTab.value) {-->
<!--    case 'all':-->
<!--      return props.employees.length-->
<!--    case 'problems':-->
<!--      return problemEmployees.value.length-->
<!--    case 'present':-->
<!--      return filteredPresentEmployees.value.length-->
<!--    case 'absent':-->
<!--      return filteredAbsentEmployees.value.length-->
<!--    case 'late':-->
<!--      return filteredLateEmployees.value.length-->
<!--    case 'off-day':-->
<!--      return filteredOffDayEmployees.value.length-->
<!--    default:-->
<!--      return 0-->
<!--  }-->
<!--})-->

<!--// Transformer les données de l'API en format d'affichage-->
<!--const transformEmployee = (employee: Status): EmployeeDisplay => {-->
<!--  const firstName = employee.employee.first_name || ''-->
<!--  const lastName = employee.employee.last_name || ''-->
<!--  const fullName = `${firstName} ${lastName}`.trim()-->

<!--  // Générer les initiales-->
<!--  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()-->

<!--  // Déterminer le texte de statut-->
<!--  let statusText = ''-->
<!--  let status: EmployeeDisplay['status'] = 'info'-->

<!--  switch (employee.status) {-->
<!--    case 'present':-->
<!--    case 'present-on-time':-->
<!--      statusText = 'Présent'-->
<!--      status = 'present'-->
<!--      break-->
<!--    case 'late':-->
<!--      statusText = `En retard${employee.delay_minutes ? ` (${employee.delay_minutes} min)` : ''}`-->
<!--      status = 'late'-->
<!--      break-->
<!--    case 'absent':-->
<!--      statusText = 'Absent'-->
<!--      status = 'absent'-->
<!--      break-->
<!--    case 'off-day':-->
<!--      statusText = 'Jour de repos'-->
<!--      status = 'off-day'-->
<!--      break-->
<!--    default:-->
<!--      statusText = employee.status-->
<!--  }-->

<!--  // Déterminer la priorité-->
<!--  let priority: 'high' | 'medium' | 'low' = 'low'-->
<!--  if (employee.status === 'absent' && employee.memos.count === 0) {-->
<!--    priority = 'high'-->
<!--  } else if (employee.status === 'late' && (employee.delay_minutes || 0) > 60) {-->
<!--    priority = 'high'-->
<!--  } else if (employee.status === 'late') {-->
<!--    priority = 'medium'-->
<!--  }-->

<!--  // Vérifier si justifié-->
<!--  const isJustified = employee.memos.count > 0 &&-->
<!--    employee.memos.items.some(m => m.memo_status === 'approved')-->

<!--  return {-->
<!--    id: employee.employee.guid,-->
<!--    name: fullName,-->
<!--    initials: initials,-->
<!--    status: status,-->
<!--    statusText: statusText,-->
<!--    location: employee.employee.department,-->
<!--    time: employee.clock_in_time || undefined,-->
<!--    avatar: employee.employee.avatar_url || undefined,-->
<!--    priority: priority,-->
<!--    isJustified: isJustified,-->
<!--    isValidated: employee.status === 'present' || employee.status === 'present-on-time',-->
<!--    checkInTime: employee.clock_in_time || undefined,-->
<!--    lateDuration: employee.delay_minutes ? `${employee.delay_minutes} min` : undefined,-->
<!--    absenceReason: employee.memos.count > 0 ?-->
<!--      employee.memos.items[0].title :-->
<!--      (employee.status === 'absent' ? 'Non contacté' : undefined)-->
<!--  }-->
<!--}-->

<!--const showEmployeeDetails = (employee: Status) => {-->
<!--  selectedEmployee.value = employee-->
<!--  isModalOpen.value = true-->
<!--}-->

<!--const closeModal = () => {-->
<!--  isModalOpen.value = false-->
<!--  selectedEmployee.value = null-->
<!--}-->

<!--const handleActionCompleted = async (action: string, employeeId: string) => {-->
<!--  console.log(`Action ${action} complétée pour l'employé ${employeeId}`)-->
<!--  // Émettre un événement au parent pour rafraîchir les données-->
<!--  emit('refreshData')-->
<!--}-->

<!--const setActiveTab = (tab: string) => {-->
<!--  activeTab.value = tab-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.no-employees {-->
<!--  display: flex;-->
<!--  flex-direction: column;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  text-align: center;-->
<!--  padding: 3rem;-->
<!--  color: #6b7280;-->
<!--  gap: 1rem;-->
<!--}-->

<!--.no-employees .icon-lg {-->
<!--  width: 64px;-->
<!--  height: 64px;-->
<!--  color: #9ca3af;-->
<!--}-->

<!--.no-employees p {-->
<!--  font-size: 1.125rem;-->
<!--  margin: 0;-->
<!--}-->

<!--.icon-calendar::before {-->
<!--  content: '📅';-->
<!--}-->
<!--</style>-->