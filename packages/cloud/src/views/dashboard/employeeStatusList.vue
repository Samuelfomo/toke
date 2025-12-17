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
          <span>Problèmes à traiter ({{ problemEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in problemEmployees"
            :key="employee.employee.guid"
            :employee="transformEmployee(employee)"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Absents uniquement -->
      <div v-if="activeTab === 'absent' && filteredAbsentEmployees.length > 0">
        <div class="section-title section-problems">
          <span>Employés absents ({{ filteredAbsentEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in filteredAbsentEmployees"
            :key="employee.employee.guid"
            :employee="transformEmployee(employee)"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Retards uniquement -->
      <div v-if="activeTab === 'late' && filteredLateEmployees.length > 0">
        <div class="section-title section-problems">
          <span>Employés en retard ({{ filteredLateEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in filteredLateEmployees"
            :key="employee.employee.guid"
            :employee="transformEmployee(employee)"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Présents -->
      <div v-if="(activeTab === 'all' || activeTab === 'present') && filteredPresentEmployees.length > 0">
        <div class="section-title section-present">
          <span>Employés présents ({{ filteredPresentEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in filteredPresentEmployees"
            :key="employee.employee.guid"
            :employee="transformEmployee(employee)"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Jours de repos -->
      <div v-if="(activeTab === 'all' || activeTab === 'off-day') && filteredOffDayEmployees.length > 0">
        <div class="section-title section-info">
          <span>Jours de repos ({{ filteredOffDayEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in filteredOffDayEmployees"
            :key="employee.employee.guid"
            :employee="transformEmployee(employee)"
            @click="showEmployeeDetails(employee)"
          />
        </div>
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
    <AssiduteDuJour
      :employee="transformEmployee(selectedEmployee)"
      @close="closeModal"
      @action-completed="handleActionCompleted"
      class="quick-detail-modal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AssiduteDuJour from '../AssiduteDuJour.vue'
import EmployeeCard from './employeeCard.vue'
import type { Status, Statistics } from '@/utils/interfaces/team.interface'
import "../../assets/css/tokt-employeeS-05.css"

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
  isJustified?: boolean
  isValidated?: boolean
  checkInTime?: string
  lateDuration?: string
  absenceReason?: string
  motif?: string
}

interface Props {
  employees: Status[]
  statistics: Statistics
  presentEmployees?: any[]
  lateEmployees?: any[]
  absentEmployees?: any[]
  offDayEmployees?: any[]
}

const emit = defineEmits<{
  refreshData: []
}>()

const props = defineProps<Props>()

const activeTab = ref<string>('all')
const isModalOpen = ref<boolean>(false)
const selectedEmployee = ref<Status | null>(null)

// Calculer les problèmes (absents + retards)
const problemsCount = computed(() =>
  props.statistics.absences + props.statistics.late_arrivals
)

// Tabs avec les bons compteurs
const tabs = computed(() => [
  {
    key: 'all',
    label: 'Tous',
    icon: 'icon-users',
    count: props.statistics.total_team_members
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
    count: props.statistics.present_to_days || 0
  },
  {
    key: 'absent',
    label: 'Absents',
    icon: 'icon-x',
    count: props.statistics.absences
  },
  {
    key: 'late',
    label: 'Retards',
    icon: 'icon-clock',
    count: props.statistics.late_arrivals
  },
  {
    key: 'off-day',
    label: 'Repos',
    icon: 'icon-calendar',
    count: props.statistics.off_day
  }
])

// Filtrer les employés par statut
const filteredPresentEmployees = computed(() =>
  props.employees.filter(emp => emp.status === 'present' || emp.status === 'present-on-time')
)

const filteredLateEmployees = computed(() =>
  props.employees.filter(emp => emp.status === 'late')
)

const filteredAbsentEmployees = computed(() =>
  props.employees.filter(emp => emp.status === 'absent')
)

const filteredOffDayEmployees = computed(() =>
  props.employees.filter(emp => emp.status === 'off-day')
)

const problemEmployees = computed(() => [
  ...filteredAbsentEmployees.value,
  ...filteredLateEmployees.value
])

// Compter les employés affichés
const displayedEmployeesCount = computed(() => {
  switch (activeTab.value) {
    case 'all':
      return props.employees.length
    case 'problems':
      return problemEmployees.value.length
    case 'present':
      return filteredPresentEmployees.value.length
    case 'absent':
      return filteredAbsentEmployees.value.length
    case 'late':
      return filteredLateEmployees.value.length
    case 'off-day':
      return filteredOffDayEmployees.value.length
    default:
      return 0
  }
})

// Transformer les données de l'API en format d'affichage
const transformEmployee = (employee: Status): EmployeeDisplay => {
  const firstName = employee.employee.first_name || ''
  const lastName = employee.employee.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim()

  // Générer les initiales
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  // Déterminer le texte de statut
  let statusText = ''
  let status: EmployeeDisplay['status'] = 'info'

  switch (employee.status) {
    case 'present':
    case 'present-on-time':
      statusText = 'Présent'
      status = 'present'
      break
    case 'late':
      statusText = `En retard${employee.delay_minutes ? ` (${employee.delay_minutes} min)` : ''}`
      status = 'late'
      break
    case 'absent':
      statusText = 'Absent'
      status = 'absent'
      break
    case 'off-day':
      statusText = 'Jour de repos'
      status = 'off-day'
      break
    default:
      statusText = employee.status
  }

  // Déterminer la priorité
  let priority: 'high' | 'medium' | 'low' = 'low'
  if (employee.status === 'absent' && employee.memos.count === 0) {
    priority = 'high'
  } else if (employee.status === 'late' && (employee.delay_minutes || 0) > 60) {
    priority = 'high'
  } else if (employee.status === 'late') {
    priority = 'medium'
  }

  // Vérifier si justifié
  const isJustified = employee.memos.count > 0 &&
    employee.memos.items.some(m => m.memo_status === 'approved')

  return {
    id: employee.employee.guid,
    name: fullName,
    initials: initials,
    status: status,
    statusText: statusText,
    location: employee.employee.department,
    time: employee.clock_in_time || undefined,
    avatar: employee.employee.avatar_url || undefined,
    priority: priority,
    isJustified: isJustified,
    isValidated: employee.status === 'present' || employee.status === 'present-on-time',
    checkInTime: employee.clock_in_time || undefined,
    lateDuration: employee.delay_minutes ? `${employee.delay_minutes} min` : undefined,
    absenceReason: employee.memos.count > 0 ?
      employee.memos.items[0].title :
      (employee.status === 'absent' ? 'Non contacté' : undefined)
  }
}

const showEmployeeDetails = (employee: Status) => {
  selectedEmployee.value = employee
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedEmployee.value = null
}

const handleActionCompleted = async (action: string, employeeId: string) => {
  console.log(`Action ${action} complétée pour l'employé ${employeeId}`)
  // Émettre un événement au parent pour rafraîchir les données
  emit('refreshData')
}

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}
</script>

<style scoped>
.no-employees {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  gap: 1rem;
}

.no-employees .icon-lg {
  width: 64px;
  height: 64px;
  color: #9ca3af;
}

.no-employees p {
  font-size: 1.125rem;
  margin: 0;
}

.icon-calendar::before {
  content: '📅';
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
<!--      &lt;!&ndash; Section Problèmes &ndash;&gt;-->
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
<!--            :key="employee.id"-->
<!--            :employee="employee"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Absents &ndash;&gt;-->
<!--      <div v-if="activeTab === 'absent' && absentEmployees.length > 0">-->
<!--        <div class="section-title section-problems">-->
<!--          <span>Employés absents ({{ absentEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in absentEmployees"-->
<!--            :key="employee.id"-->
<!--            :employee="employee"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Retards &ndash;&gt;-->
<!--      <div v-if="activeTab === 'late' && lateEmployees.length > 0">-->
<!--        <div class="section-title section-problems">-->
<!--          <span>Employés en retard ({{ lateEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in lateEmployees"-->
<!--            :key="employee.id"-->
<!--            :employee="employee"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Informations &ndash;&gt;-->
<!--      <div v-if="(activeTab === 'all' || activeTab === 'info') && infoEmployees.length > 0">-->
<!--        <div class="section-title section-info">-->
<!--          <span>Informations ({{ infoEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in infoEmployees"-->
<!--            :key="employee.id"-->
<!--            :employee="employee"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Section Présents &ndash;&gt;-->
<!--      <div v-if="(activeTab === 'all' || activeTab === 'present') && presentEmployees.length > 0">-->
<!--        <div class="section-title section-present">-->
<!--          <span>Employés présents ({{ presentEmployees.length }})</span>-->
<!--          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>-->
<!--          </svg>-->
<!--        </div>-->
<!--        <div class="employees-grid">-->
<!--          <EmployeeCard-->
<!--            v-for="employee in presentEmployees"-->
<!--            :key="employee.id"-->
<!--            :employee="employee"-->
<!--            @click="showEmployeeDetails(employee)"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->

<!--      &lt;!&ndash; Message si aucun employé &ndash;&gt;-->
<!--      <div v-if="employees.length === 0" class="no-employees">-->
<!--        <p>Aucun employé trouvé</p>-->
<!--      </div>-->
<!--    </div>-->
<!--  </section>-->

<!--  <div v-if="isModalOpen && selectedEmployee" class="modal-overlay" @click.self="closeModal">-->
<!--    <AssiduteDuJour-->
<!--      :employee="selectedEmployee"-->
<!--      @close="closeModal"-->
<!--      class="quick-detail-modal"-->
<!--    />-->
<!--  </div>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, computed, onMounted } from 'vue'-->
<!--import AssiduteDuJour from '../AssiduteDuJour.vue'-->
<!--import EmployeeCard from './employeeCard.vue'-->
<!--import "../../assets/css/tokt-employeeS-05.css"-->
<!--import { useEmployee } from '@/utils/useEmployee'-->
<!--import UserService from '@/service/UserService';-->
<!--import { Data } from '@/utils/interfaces/team.interface';-->
<!--import EntriesService from '@/service/EntriesService';-->
<!--import { useUserStore } from '@/composables/userStore';-->

<!--interface EmployeeDisplay {-->
<!--  id: number-->
<!--  name: string-->
<!--  initials: string-->
<!--  status: 'absent' | 'late' | 'present' | 'info'-->
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

<!--const employeeStore = useEmployee()-->
<!--const activeTab = ref<string>('problems')-->
<!--const isModalOpen = ref<boolean>(false)-->
<!--const selectedEmployee = ref<EmployeeDisplay | null>(null)-->
<!--const subordinates = ref<Data>();-->
<!--const userStore = useUserStore()-->
<!--// Transformer les employés du store en format d'affichage-->
<!--const employees = computed<EmployeeDisplay[]>(() => {-->
<!--  const today = new Date()-->

<!--  const allEmployees = employeeStore.employees.value-->

<!--  console.log('Computing employees from store, count:', allEmployees?.length)-->

<!--  if (!allEmployees || !Array.isArray(allEmployees)) {-->
<!--    console.error('❌ Employees is not an array')-->
<!--    return []-->
<!--  }-->

<!--  return allEmployees.map(emp => {-->
<!--    const dailyStatus = employeeStore.getEmployeeDailyStatus(emp.id, today)-->
<!--    const todayRecord = employeeStore.attendanceHistory.value.find(-->
<!--      r => r.employeeId === emp.id && r.date === today.toISOString().split('T')[0]-->
<!--    )-->

<!--    console.log(`Employee ${emp.name} (${emp.id}): status=${dailyStatus.status}, record=`, todayRecord)-->

<!--    // Déterminer la priorité-->
<!--    let priority: 'high' | 'medium' | 'low' = 'low'-->
<!--    if (dailyStatus.status === 'absent' && !todayRecord?.isJustified) {-->
<!--      priority = 'high'-->
<!--    } else if (dailyStatus.status === 'late' && (todayRecord?.lateMinutes || 0) > 60) {-->
<!--      priority = 'high'-->
<!--    } else if (dailyStatus.status === 'late') {-->
<!--      priority = 'medium'-->
<!--    }-->

<!--    // Calculer la durée de retard-->
<!--    let lateDuration = ''-->
<!--    if (todayRecord?.lateMinutes) {-->
<!--      const hours = Math.floor(todayRecord.lateMinutes / 60)-->
<!--      const minutes = todayRecord.lateMinutes % 60-->
<!--      if (hours > 0) {-->
<!--        lateDuration = `${hours}h${minutes > 0 ? minutes : ''}`-->
<!--      } else {-->
<!--        lateDuration = `${minutes} min`-->
<!--      }-->
<!--    }-->

<!--    return {-->
<!--      id: emp.id,-->
<!--      name: emp.name,-->
<!--      initials: emp.initials,-->
<!--      status: dailyStatus.status,-->
<!--      statusText: dailyStatus.statusText,-->
<!--      location: employeeStore.getSiteName(emp.siteId),-->
<!--      time: todayRecord?.arrivalTime,-->
<!--      avatar: emp.avatar,-->
<!--      priority,-->
<!--      isJustified: todayRecord?.isJustified,-->
<!--      isValidated: dailyStatus.status === 'present' || dailyStatus.status === 'info',-->
<!--      checkInTime: todayRecord?.arrivalTime,-->
<!--      lateDuration,-->
<!--      absenceReason: todayRecord?.reason || (dailyStatus.status === 'absent' ? 'Non contacté' : undefined),-->
<!--      motif: todayRecord?.reason-->
<!--    }-->
<!--  })-->
<!--})-->

<!--const problems = ref<number>(0)-->
<!--const tabs = computed(() => [-->
<!--  {-->
<!--    key: 'all',-->
<!--    label: 'Tous',-->
<!--    icon: 'icon-users',-->
<!--    count: subordinates.value?.data.statistics.total_team_members-->
<!--  },-->
<!--  {-->
<!--    key: 'problems',-->
<!--    label: 'Problèmes',-->
<!--    icon: 'icon-alert',-->
<!--    count: problems-->
<!--  },-->
<!--  {-->
<!--    key: 'present',-->
<!--    label: 'Présents',-->
<!--    icon: 'icon-check',-->
<!--    count: subordinates.value?.data.statistics.present_to_days-->
<!--  },-->
<!--  {-->
<!--    key: 'absent',-->
<!--    label: 'Absents',-->
<!--    icon: 'icon-x',-->
<!--    count: subordinates.value?.data.statistics.absences-->
<!--  },-->
<!--  {-->
<!--    key: 'late',-->
<!--    label: 'Retards',-->
<!--    icon: 'icon-clock',-->
<!--    count: subordinates.value?.data.statistics.late_arrivals-->
<!--  }-->
<!--])-->

<!--const showEmployeeDetails = (employeeData: EmployeeDisplay) => {-->
<!--  console.log('Showing details for employee:', employeeData.name, employeeData.id)-->
<!--  selectedEmployee.value = employeeData-->
<!--  isModalOpen.value = true-->
<!--}-->

<!--const closeModal = () => {-->
<!--  isModalOpen.value = false-->
<!--  selectedEmployee.value = null-->
<!--}-->

<!--const setActiveTab = (tab: string) => {-->
<!--  activeTab.value = tab-->
<!--}-->

<!--const problemEmployees = computed(() => {-->
<!--  const problems = employees.value.filter(emp => emp.status === 'absent' || emp.status === 'late')-->
<!--  console.log('Problem employees:', problems.length)-->
<!--  return problems-->
<!--})-->

<!--const infoEmployees = computed(() => {-->
<!--  const info = employees.value.filter(emp => emp.status === 'info')-->
<!--  console.log('Info employees:', info.length)-->
<!--  return info-->
<!--})-->

<!--const presentEmployees = computed(() => {-->
<!--  const present = employees.value.filter(emp => emp.status === 'present')-->
<!--  console.log('Present employees:', present.length)-->
<!--  return present-->
<!--})-->

<!--const absentEmployees = computed(() => {-->
<!--  const absent = employees.value.filter(emp => emp.status === 'absent')-->
<!--  console.log('Absent employees:', absent.length)-->
<!--  return absent-->

<!--  // return subordinates.value?.data.absent_employees-->
<!--})-->

<!--const lateEmployees = computed(() => {-->
<!--  const late = employees.value.filter(emp => emp.status === 'late')-->
<!--  console.log('Late employees:', late.length)-->
<!--  return late-->
<!--})-->

<!--onMounted(async () => {-->
<!--  // console.log('EmployeeStatusList mounted, initializing store...')-->
<!--  // // Initialiser le store au chargement du composant-->
<!--  // employeeStore.initialize()-->
<!--  // console.log('Store initialized, employees count:', employeeStore.employees.value.length)-->
<!--  const subordinatesData = await UserService.listAttendance(userStore.user?.guid!);-->
<!--  subordinates.value = subordinatesData.data as Data-->
<!--  problems.value = subordinates.value?.data.statistics.absences + subordinates.value?.data.statistics.late_arrivals-->
<!--})-->

<!--</script>-->

<!--<style scoped>-->
<!--.no-employees {-->
<!--  text-align: center;-->
<!--  padding: 3rem;-->
<!--  color: #6b7280;-->
<!--  font-size: 1.125rem;-->
<!--}-->
<!--</style>-->