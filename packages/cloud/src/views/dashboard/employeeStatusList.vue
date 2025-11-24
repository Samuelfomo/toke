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
      <!-- Section Problèmes -->
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
            :key="employee.id"
            :employee="employee"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Absents -->
      <div v-if="activeTab === 'absent' && absentEmployees.length > 0">
        <div class="section-title section-problems">
          <span>Employés absents ({{ absentEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in absentEmployees"
            :key="employee.id"
            :employee="employee"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Retards -->
      <div v-if="activeTab === 'late' && lateEmployees.length > 0">
        <div class="section-title section-problems">
          <span>Employés en retard ({{ lateEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in lateEmployees"
            :key="employee.id"
            :employee="employee"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Informations -->
      <div v-if="(activeTab === 'all' || activeTab === 'info') && infoEmployees.length > 0">
        <div class="section-title section-info">
          <span>Informations ({{ infoEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in infoEmployees"
            :key="employee.id"
            :employee="employee"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Présents -->
      <div v-if="(activeTab === 'all' || activeTab === 'present') && presentEmployees.length > 0">
        <div class="section-title section-present">
          <span>Employés présents ({{ presentEmployees.length }})</span>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="employees-grid">
          <EmployeeCard
            v-for="employee in presentEmployees"
            :key="employee.id"
            :employee="employee"
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Message si aucun employé -->
      <div v-if="employees.length === 0" class="no-employees">
        <p>Aucun employé trouvé</p>
      </div>
    </div>
  </section>

  <div v-if="isModalOpen && selectedEmployee" class="modal-overlay" @click.self="closeModal">
    <AssiduteDuJour
      :employee="selectedEmployee"
      @close="closeModal"
      class="quick-detail-modal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AssiduteDuJour from '../AssiduteDuJour.vue'
import EmployeeCard from './employeeCard.vue'
import "../../assets/css/tokt-employeeS-05.css"
import { useEmployeeStore } from '../../composables/useEmployeeStore'

interface EmployeeDisplay {
  id: number
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info'
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

const employeeStore = useEmployeeStore()
const activeTab = ref<string>('problems')
const isModalOpen = ref<boolean>(false)
const selectedEmployee = ref<EmployeeDisplay | null>(null)

// Transformer les employés du store en format d'affichage
const employees = computed<EmployeeDisplay[]>(() => {
  const today = new Date()

  const allEmployees = employeeStore.employees.value

  console.log('Computing employees from store, count:', allEmployees?.length)

  if (!allEmployees || !Array.isArray(allEmployees)) {
    console.error('❌ Employees is not an array')
    return []
  }

  return allEmployees.map(emp => {
    const dailyStatus = employeeStore.getEmployeeDailyStatus(emp.id, today)
    const todayRecord = employeeStore.attendanceHistory.value.find(
      r => r.employeeId === emp.id && r.date === today.toISOString().split('T')[0]
    )

    console.log(`Employee ${emp.name} (${emp.id}): status=${dailyStatus.status}, record=`, todayRecord)

    // Déterminer la priorité
    let priority: 'high' | 'medium' | 'low' = 'low'
    if (dailyStatus.status === 'absent' && !todayRecord?.isJustified) {
      priority = 'high'
    } else if (dailyStatus.status === 'late' && (todayRecord?.lateMinutes || 0) > 60) {
      priority = 'high'
    } else if (dailyStatus.status === 'late') {
      priority = 'medium'
    }

    // Calculer la durée de retard
    let lateDuration = ''
    if (todayRecord?.lateMinutes) {
      const hours = Math.floor(todayRecord.lateMinutes / 60)
      const minutes = todayRecord.lateMinutes % 60
      if (hours > 0) {
        lateDuration = `${hours}h${minutes > 0 ? minutes : ''}`
      } else {
        lateDuration = `${minutes} min`
      }
    }

    return {
      id: emp.id,
      name: emp.name,
      initials: emp.initials,
      status: dailyStatus.status,
      statusText: dailyStatus.statusText,
      location: employeeStore.getSiteName(emp.siteId),
      time: todayRecord?.arrivalTime,
      avatar: emp.avatar,
      priority,
      isJustified: todayRecord?.isJustified,
      isValidated: dailyStatus.status === 'present' || dailyStatus.status === 'info',
      checkInTime: todayRecord?.arrivalTime,
      lateDuration,
      absenceReason: todayRecord?.reason || (dailyStatus.status === 'absent' ? 'Non contacté' : undefined),
      motif: todayRecord?.reason
    }
  })
})

const tabs = computed(() => [
  {
    key: 'all',
    label: 'Tous',
    icon: 'icon-users',
    count: employees.value.length
  },
  {
    key: 'problems',
    label: 'Problèmes',
    icon: 'icon-alert',
    count: problemEmployees.value.length
  },
  {
    key: 'present',
    label: 'Présents',
    icon: 'icon-check',
    count: presentEmployees.value.length
  },
  {
    key: 'absent',
    label: 'Absents',
    icon: 'icon-x',
    count: absentEmployees.value.length
  },
  {
    key: 'late',
    label: 'Retards',
    icon: 'icon-clock',
    count: lateEmployees.value.length
  }
])

const showEmployeeDetails = (employeeData: EmployeeDisplay) => {
  console.log('Showing details for employee:', employeeData.name, employeeData.id)
  selectedEmployee.value = employeeData
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedEmployee.value = null
}

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

const problemEmployees = computed(() => {
  const problems = employees.value.filter(emp => emp.status === 'absent' || emp.status === 'late')
  console.log('Problem employees:', problems.length)
  return problems
})

const infoEmployees = computed(() => {
  const info = employees.value.filter(emp => emp.status === 'info')
  console.log('Info employees:', info.length)
  return info
})

const presentEmployees = computed(() => {
  const present = employees.value.filter(emp => emp.status === 'present')
  console.log('Present employees:', present.length)
  return present
})

const absentEmployees = computed(() => {
  const absent = employees.value.filter(emp => emp.status === 'absent')
  console.log('Absent employees:', absent.length)
  return absent
})

const lateEmployees = computed(() => {
  const late = employees.value.filter(emp => emp.status === 'late')
  console.log('Late employees:', late.length)
  return late
})

onMounted(() => {
  console.log('EmployeeStatusList mounted, initializing store...')
  // Initialiser le store au chargement du composant
  employeeStore.initialize()
  console.log('Store initialized, employees count:', employeeStore.employees.value.length)
})
</script>

<style scoped>
.no-employees {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.125rem;
}
</style>