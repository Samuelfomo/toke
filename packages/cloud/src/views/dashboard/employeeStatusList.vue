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
      <div v-if="activeTab === 'all' || activeTab === 'problems'">
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
          />
        </div>
      </div>

      <div v-if="activeTab === 'all' || activeTab === 'info'">
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
          />
        </div>
      </div>

      <div v-if="activeTab === 'all' || activeTab === 'present'">
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
          />
        </div>
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
  isJustified?: boolean;
  isValidated?: boolean;
}

const activeTab = ref<string>('problems')

const employees = ref<Employee[]>([
  {
    id: 1,
    name: 'Samuel Femo',
    initials: 'SF',
    status: 'absent',
    statusText: 'Absent',
    priority: 'high'
  },
  {
    id: 2,
    name: 'Manfred Moukate ',
    initials: 'MM',
    status: 'late',
    statusText: 'En retard arrivé à 09:45',
    location: 'Chantier Bonabéri',
    isJustified: false,
    priority: 'high'
  },
  {
    id: 3,
    name: 'Jordan',
    initials: 'J',
    status: 'late',
    statusText: 'En retard arrivé à 08:35',
    location: 'Bureau central',
    isValidated: false,
    priority: 'high'
  },
  {
    id: 3,
    name: 'Jean Djoko',
    initials: 'JD',
    status: 'absent',
    statusText: 'Absent',
    priority: 'high',
    isJustified: false // Ajout pour l'absence non justifiée
  },
  {
    id: 4,
    name: 'Marie Kengne',
    initials: 'MK',
    status: 'late',
    statusText: 'En retard arrivé à 09:45',
    location: 'Chantier Bonabéri',
    isValidated: false, // Ajout pour le retard
    priority: 'high'
  },
  {
    id: 5,
    name: 'Sophie Raoul',
    initials: 'SR',
    status: 'info',
    statusText: 'En congé',
    location: 'Congé parental - retour le 15 octobre',
  },
  {
    id: 6,
    name: 'Alex Tchioffo',
    initials: 'AT',
    status: 'info',
    statusText: 'Formation',
    location: 'Formation sécurité - CCIMA'
  },
  {
    id: 7,
    name: 'Tchioffo',
    initials: 'T',
    status: 'present',
    statusText: 'Formation',
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
      return problemEmployees.value;
    case 'present':
      return presentEmployees.value;
    case 'absent':
      return absentEmployees.value;
    case 'late':
      return lateEmployees.value;
    case 'info': // Vous avez un cas 'info' séparé, mais il ne semble pas être utilisé dans l'image
      return infoEmployees.value;
    case 'all': // C'est ici que vous devez afficher les sections groupées
    default:
      return employees.value; // L'image montre un regroupement spécifique, pas juste tous les employés
  }
});
// const statusIcon = computed(() => {
//   switch (props.employee.status) {
//     case 'absent':
//       return 'icon-x' // icône pour absent
//     case 'late':
//       return 'icon-clock' // icône pour en retard
//     case 'present':
//       return 'icon-check' // icône pour présent
//     case 'info':
//       return 'icon-info' // icône pour en congé/formation
//     default:
//       return 'icon-info' // icône par défaut
//   }
// })
const setActiveTab = (tab: string) => {
  activeTab.value = tab
}
</script>

<style>

</style>