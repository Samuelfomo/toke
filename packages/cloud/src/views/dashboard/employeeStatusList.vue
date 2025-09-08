<template>
  <section class="employee-status-list">
    <div class="status-filters">
      <a
        v-for="tab in tabs"
        :key="tab.key"
        :href="'#'"
        :class="['filter-btn', { active: activeTab === tab.key }]"
        @click.prevent="setActiveTab(tab.key)"
      >
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>{{ tab.label }}</span>
        <span class="filter-count">{{ tab.count }}</span>
      </a>
    </div>

    <div class="employee-list">
      <div v-if="activeTab === 'problems'" class="section-title section-problems">
        <span>Problèmes à traiter ({{ problemEmployees.length }})</span>
        <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <div v-if="activeTab === 'info'" class="section-title section-info">
        <span>Informations ({{ infoEmployees.length }})</span>
        <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <div v-if="activeTab === 'present'" class="section-title section-present">
        <span>Employés présents ({{ presentEmployees.length }})</span>
        <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <div class="employees-grid">
        <EmployeeCard
          v-for="employee in filteredEmployees"
          :key="employee.id"
          :employee="employee"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import EmployeeCard from './employeeCard.vue'
import "../../assets/css/tokt-employeeS-05.css";

interface Employee {
  id: number
  name: string
  initials: string
  status: 'absent' | 'late' | 'present' | 'info'
  statusText: string
  location?: string
  time?: string
  avatar?: string
  priority?: 'high' | 'medium' | 'low'
}

const activeTab = ref<string>('problems')

const employees = ref<Employee[]>([
  {
    id: 1,
    name: 'Jean Djoko',
    initials: 'JD',
    status: 'absent',
    statusText: 'Absent',
    priority: 'high'
  },
  {
    id: 2,
    name: 'Marie Kengne',
    initials: 'MK',
    status: 'late',
    statusText: 'En retard arrivé à 09:45',
    location: 'Chantier Bonabéri'
  },
  {
    id: 3,
    name: 'Alain Ngomo',
    initials: 'AN',
    status: 'late',
    statusText: 'En retard arrivé à 08:35',
    location: 'Bureau central'
  },
  {
    id: 4,
    name: 'Sophie Raoul',
    initials: 'SR',
    status: 'info',
    statusText: 'En congé',
    location: 'Congé parental - retour le 15 octobre'
  },
  {
    id: 5,
    name: 'Alex Tchioffo',
    initials: 'AT',
    status: 'info',
    statusText: 'Formation',
    location: 'Formation sécurité - CCIMA'
  }
])

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

const problemEmployees = computed(() =>
  employees.value.filter(emp => emp.status === 'absent' || emp.status === 'late')
)

const infoEmployees = computed(() =>
  employees.value.filter(emp => emp.status === 'info')
)

const presentEmployees = computed(() =>
  employees.value.filter(emp => emp.status === 'present')
)

const absentEmployees = computed(() =>
  employees.value.filter(emp => emp.status === 'absent')
)

const lateEmployees = computed(() =>
  employees.value.filter(emp => emp.status === 'late')
)

const filteredEmployees = computed(() => {
  switch (activeTab.value) {
    case 'problems':
      return problemEmployees.value
    case 'info':
      return infoEmployees.value
    case 'present':
      return presentEmployees.value
    case 'absent':
      return absentEmployees.value
    case 'late':
      return lateEmployees.value
    default:
      return employees.value
  }
})

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}
</script>

<style>

</style>