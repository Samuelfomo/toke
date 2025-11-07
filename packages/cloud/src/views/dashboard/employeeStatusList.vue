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
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Absents -->
      <div v-if="activeTab === 'absent'">
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
      <div v-if="activeTab === 'late'">
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
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>

      <!-- Section Présents -->
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
            @click="showEmployeeDetails(employee)"
          />
        </div>
      </div>
    </div>
  </section>

  <div v-if="isModalOpen && selectedEmployee" class="modal-overlay" @click.self="closeModal">
    <EmployeeDetails
      :employee="selectedEmployee"
      @close="closeModal"
      class="quick-detail-modal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import EmployeeDetails from '../EmployeeDetails.vue'
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
  checkInTime?: string;
  lateDuration?: string;
  absenceReason?: string;
  motif?: string; // Motif du retard
}

const activeTab = ref<string>('problems')
const isModalOpen = ref<boolean>(false)
const selectedEmployee = ref<Employee | null>(null)

// Données des employés avec tous les détails nécessaires
const employees = ref<Employee[]>([
  {
    id: 1,
    name: 'Samuel Femo',
    initials: 'SF',
    status: 'absent',
    statusText: 'Absent',
    priority: 'high',
    absenceReason: 'Maladie',
    isJustified: true // Absence justifiée - ne doit pas afficher "non justifiée"
  },
  {
    id: 2,
    name: 'Manfred Moukate',
    initials: 'MM',
    status: 'late',
    statusText: 'En retard',
    location: 'Chantier Bonabéri',
    isJustified: false,
    priority: 'high',
    checkInTime: '09:45',
    lateDuration: '1h45',
    motif: 'Embouteillage sur la route' // Motif du retard
  },
  {
    id: 3,
    name: 'Jordan',
    initials: 'J',
    status: 'late',
    statusText: 'En retard',
    location: 'Bureau central',
    isValidated: false,
    priority: 'high',
    checkInTime: '08:35',
    lateDuration: '35 min',
    motif: 'Problème de transport' // Motif du retard
  },
  {
    id: 4,
    name: 'Jean Djoko',
    initials: 'JD',
    status: 'absent',
    statusText: 'Absent',
    priority: 'high',
    isJustified: false,
    absenceReason: 'Non contacté' // Celui-ci affichera "non justifiée"
  },
  {
    id: 5,
    name: 'Marie Kengne',
    initials: 'MK',
    status: 'late',
    statusText: 'En retard',
    location: 'Chantier Bonabéri',
    isValidated: false,
    priority: 'high',
    checkInTime: '09:45',
    lateDuration: '1h45',
    motif: 'Panne de véhicule'
  },
  {
    id: 6,
    name: 'Sophie Raoul',
    initials: 'SR',
    status: 'info',
    statusText: 'En congé',
    location: 'Congé parental - retour le 15 octobre',
  },
  {
    id: 7,
    name: 'Alex Tchioffo',
    initials: 'AT',
    status: 'info',
    statusText: 'Formation',
    location: 'Formation sécurité - CCIMA'
  },
  {
    id: 8,
    name: 'Tchioffo',
    initials: 'T',
    status: 'present',
    statusText: 'Présent',
    checkInTime: '07:58',
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

const showEmployeeDetails = (employeeData: Employee) => {
  const fullEmployeeData = employees.value.find(emp => emp.id === employeeData.id)
  if (fullEmployeeData) {
    selectedEmployee.value = fullEmployeeData
    isModalOpen.value = true
  }
}

const closeModal = () => {
  isModalOpen.value = false
  selectedEmployee.value = null
}

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

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
</script>

<style scoped>
</style>