<template>
  <section class="manager-team">
    <Header
      :user-name="currentUser.name"
      :company-name="currentUser.company"
      :notification-count="notificationCount"
    />
<!--    <div class="manager-header">-->
<!--      <div class="manager-profile">-->
<!--        <div class="manager-avatar">-->
<!--          <img v-if="currentManager.avatar" :src="currentManager.avatar" :alt="currentManager.name">-->
<!--          <div v-else class="avatar-placeholder">-->
<!--            {{ getInitials(currentManager.name) }}-->
<!--          </div>-->
<!--        </div>-->
<!--        <div class="manager-info">-->
<!--          <h1 class="manager-name">{{ currentManager.name }}</h1>-->
<!--          <p class="manager-title">{{ currentManager.title }}</p>-->
<!--          <p class="manager-department">-->
<!--            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">-->
<!--              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>-->
<!--            </svg>-->
<!--            {{ currentManager.department }}-->
<!--          </p>-->
<!--        </div>-->
<!--      </div>-->
<!--      <div class="team-overview-stats">-->
<!--        <div class="overview-card total">-->
<!--          <div class="stat-icon">-->
<!--            <svg fill="currentColor" viewBox="0 0 20 20">-->
<!--              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>-->
<!--            </svg>-->
<!--          </div>-->
<!--          <div class="stat-content">-->
<!--            <span class="stat-number">{{ totalEmployees }}</span>-->
<!--            <span class="stat-label">Total équipe</span>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

    <div class="presence-analytics">
      <div class="analytics-header">
        <h2 class="section-title">Analyse des présences - {{ currentDate }}</h2>
        <div class="date-selector">
          <button @click="changeDate(-1)" class="date-btn">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <span class="current-date">{{ formatDate(selectedDate) }}</span>
          <button @click="changeDate(1)" class="date-btn" :disabled="isToday">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="charts-container">
        <div class="main-chart">
          <div class="chart-with-axes">
            <h3 class="chart-title">Répartition des Présences/Absences</h3>
            <div class="chart-wrapper">
              <div class="y-axis">
                <div class="y-axis-label">Nombre d'employés</div>
                <div class="y-axis-ticks">
                  <div v-for="tick in yAxisTicks" :key="tick" class="y-tick">
                    <span class="tick-label">{{ tick }}</span>
                    <div class="tick-line"></div>
                  </div>
                </div>
              </div>

              <div class="chart-area">
                <div class="chart-grid">
                  <div v-for="tick in yAxisTicks" :key="tick" class="grid-line"
                       :style="{ bottom: `${(tick / maxEmployeeCount) * 100}%` }"></div>
                </div>

                <div class="bar-chart-new">
                  <div class="bar-item-new">
                    <div class="bar-new present"
                         :style="{ height: `${(presentCount / maxEmployeeCount) * 100}%` }">
                      <span class="bar-value-new">{{ presentCount }}</span>
                    </div>
                  </div>
                  <div class="bar-item-new">
                    <div class="bar-new absent"
                         :style="{ height: `${((lateCount + absentCount) / maxEmployeeCount) * 100}%` }">
                      <span class="bar-value-new">{{ lateCount + absentCount }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="x-axis">
              <div class="x-axis-ticks">
                <div class="x-tick">
                  <span class="tick-label-x">Présents</span>
                </div>
                <div class="x-tick">
                  <span class="tick-label-x">Absents</span>
                </div>
              </div>
            </div>

            <div class="attendance-rate">
              <span class="rate-value">{{ attendanceRate }}%</span>
              <span class="rate-label">Taux de présence</span>
            </div>
          </div>
        </div>

        <div class="timeline-chart">
          <h3 class="chart-subtitle">Arrivées par tranche horaire</h3>
          <div class="timeline-bars">
            <div v-for="interval in arrivalIntervals" :key="interval.range" class="time-interval">
              <div class="interval-bar">
                <div
                  class="bar-fill"
                  :style="{ height: `${(interval.count / maxIntervalCount) * 100}%` }"
                ></div>
              </div>
              <span class="interval-label">{{ interval.range }}</span>
              <span class="count-label">{{ interval.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="manager-actions">
      <h2 class="section-title">Actions rapides</h2>
      <div class="actions-grid">
        <button @click="showAddEmployee = true" class="action-card primary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Ajouter Employé</h3>
            <p class="action-description">Recruter un nouveau membre dans votre équipe</p>
          </div>
        </button>

        <button @click="showAddSite = true" class="action-card secondary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Nouveau Site</h3>
            <p class="action-description">Créer un nouveau site de travail</p>
          </div>
        </button>

        <button @click="generateReport" class="action-card tertiary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Rapport d'équipe</h3>
            <p class="action-description">Générer le rapport mensuel</p>
          </div>
        </button>

        <button @click="manageSchedules" class="action-card quaternary">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div class="action-content">
            <h3 class="action-title">Planning</h3>
            <p class="action-description">Gérer les horaires de travail</p>
          </div>
        </button>
      </div>
    </div>

    <div class="employees-table-section">
      <div class="table-header">
        <h2 class="section-title">Mon équipe ({{ filteredEmployees.length }})</h2>
        <div class="table-controls">
          <div class="search-container">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              v-model="searchTerm"
              placeholder="Rechercher par nom, poste, site..."
              class="search-input"
            >
          </div>
          <select v-model="statusFilter" class="filter-select">
            <option value="">Tous les statuts</option>
            <option value="present">Présents</option>
            <option value="late">En retard</option>
            <option value="absent">Absents</option>
          </select>
          <select v-model="siteFilter" class="filter-select">
            <option value="">Tous les sites</option>
            <option v-for="site in managerSites" :key="site.id" :value="site.id">
              {{ site.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="employees-table">
          <thead>
          <tr>
            <th class="sortable" @click="setSortBy('name')">
              Employé
              <svg v-if="sortBy === 'name'" class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
              </svg>
            </th>
            <th class="sortable" @click="setSortBy('position')">
              Poste
              <svg v-if="sortBy === 'position'" class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
              </svg>
            </th>
            <th class="sortable" @click="setSortBy('site')">
              Site
              <svg v-if="sortBy === 'site'" class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
              </svg>
            </th>
            <th class="sortable" @click="setSortBy('punctualityScore')">
              Ponctualité ce mois
              <svg v-if="sortBy === 'punctualityScore'" class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
              </svg>
            </th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="employee in paginatedEmployees"
              :key="employee.id"
              class="employee-row"
              @mouseenter="hoveredEmployee = employee.id"
              @mouseleave="hoveredEmployee = null">
            <td class="employee-cell">
              <div class="employee-info">
                <div class="employee-avatar-table">
                  <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name">
                  <div v-else class="avatar-placeholder">
                    {{ getInitials(employee.name) }}
                  </div>
                </div>
                <div class="employee-details">
                  <span class="employee-name">{{ employee.name }}</span>
                  <span class="employee-email">{{ employee.email }}</span>
                </div>
              </div>
            </td>
            <td>{{ employee.position }}</td>
            <td>
              <div class="site-info">
                <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                </svg>
                {{ employee.siteName }}
              </div>
            </td>
            <td>
              <div class="punctuality-cell">
                <div class="punctuality-bar">
                  <div
                    class="punctuality-fill"
                    :style="{ width: `${employee.punctualityScore}%` }"
                    :class="{
                        'excellent': employee.punctualityScore >= 95,
                        'good': employee.punctualityScore >= 85 && employee.punctualityScore < 95,
                        'average': employee.punctualityScore >= 70 && employee.punctualityScore < 85,
                        'poor': employee.punctualityScore < 70
                      }"
                  ></div>
                </div>
                <span class="punctuality-score">{{ employee.punctualityScore }}%</span>
              </div>
            </td>
            <td class="actions-cell">
              <div class="employee-menu" :class="{ 'visible': hoveredEmployee === employee.id }">
                <button
                  @click="toggleEmployeeMenu(employee.id)"
                  class="menu-trigger"
                  :class="{ 'active': activeEmployeeMenu === employee.id }">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="menu-dots">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>

                <div v-if="activeEmployeeMenu === employee.id" class="employee-dropdown">
                  <button @click="editEmployee(employee)" class="dropdown-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="item-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Modifier
                  </button>
                  <button @click="sendMemo(employee)" class="dropdown-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="item-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                    mémo
                  </button>
                  <button @click="deleteEmployee(employee)" class="dropdown-item delete">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="item-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          Précédent
        </button>
        <span class="pagination-info">
          Page {{ currentPage }} sur {{ totalPages }}
        </span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Suivant
        </button>
      </div>
    </div>

    <EmployeeModal
      v-if="showAddEmployee"
      @close="showAddEmployee = false"
      @employee-added="handleEmployeeAdded"
      :manager-id="currentManager.id"
      :available-sites="managerSites"
    />

    <SiteModal
      v-if="showAddSite"
      @close="showAddSite = false"
      @site-added="handleSiteAdded"
      :manager-id="currentManager.id"
    />
  </section>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import equipeCss from "../assets/css/toke-equipe-09.css?url"
import dashboardCss from "../assets/css/toke-dMain-04.css?url"
import Header from '../views/components/header.vue'
import HeadBuilder from '@/utils/HeadBuilder';

// Interface definitions
interface Manager {
  id: number
  name: string
  title: string
  department: string
  avatar?: string
  email: string
}

interface Employee {
  id: number
  name: string
  position: string
  email: string
  siteId: number
  siteName: string
  managerId: number
  punctualityScore: number
  hireDate: string
}

interface Site {
  id: number
  name: string
  address: string
  managerId: number
  description: string
}

interface ArrivalInterval {
  range: string
  count: number
}

const currentUser = ref({
  name: 'Danielle',
  company: 'IMEDIATIS'
})
const notificationCount = ref(2)

// État réactif
const currentManager = ref<Manager>({
  id: 1,
  name: 'Danielle',
  title: 'Manager IT',
  department: 'Département Informatique',
  email: 'danielle@company.com'
})

const employees = ref<Employee[]>([
  {
    id: 1,
    name: 'Jean-Paul Kamdem',
    position: 'Développeur Senior',
    email: 'jp.kamdem@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    punctualityScore: 95,
    hireDate: '2023-01-15'
  },
  {
    id: 2,
    name: 'Sarah Mbarga',
    position: 'Analyste Système',
    email: 'sarah.mbarga@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    punctualityScore: 78,
    hireDate: '2023-03-10'
  },
  {
    id: 3,
    name: 'Michel Fosso',
    position: 'Chef de Projet',
    email: 'michel.fosso@company.com',
    siteId: 2,
    siteName: 'Yaoundé Tech',
    managerId: 1,
    punctualityScore: 85,
    hireDate: '2022-11-20'
  },
  {
    id: 4,
    name: 'Christophe Nana',
    position: 'Ingénieur DevOps',
    email: 'c.nana@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    punctualityScore: 99,
    hireDate: '2023-05-01'
  },
  {
    id: 5,
    name: 'Linda Ngono',
    position: 'UX/UI Designer',
    email: 'linda.ngono@company.com',
    siteId: 3,
    siteName: 'Bafoussam Innovation Hub',
    managerId: 1,
    punctualityScore: 92,
    hireDate: '2024-02-28'
  },
  {
    id: 6,
    name: 'Paul Talla',
    position: 'Data Scientist',
    email: 'p.talla@company.com',
    siteId: 2,
    siteName: 'Yaoundé Tech',
    managerId: 1,
    punctualityScore: 65,
    hireDate: '2023-09-01'
  },
  {
    id: 7,
    name: 'Sophie Nde',
    position: 'Spécialiste Cybersécurité',
    email: 's.nde@company.com',
    siteId: 1,
    siteName: 'Douala Centre',
    managerId: 1,
    punctualityScore: 98,
    hireDate: '2023-06-05'
  },
])

const sites = ref<Site[]>([
  { id: 1, name: 'Douala Centre', address: '123 Avenue de l\'Indépendance, Douala', managerId: 1, description: 'Siège social' },
  { id: 2, name: 'Yaoundé Tech', address: '456 Boulevard de l\'Innovation, Yaoundé', managerId: 1, description: 'Centre de R&D' },
  { id: 3, name: 'Bafoussam Innovation Hub', address: '789 Rue de la Créativité, Bafoussam', managerId: 1, description: 'Incubateur de startups' }
])

// Données fictives pour les calculs des stats et des graphiques
const dailyAttendance = ref([
  { employeeId: 1, status: 'present', arrivalTime: '08:00' },
  { employeeId: 2, status: 'late', arrivalTime: '08:45', lateMinutes: 15 },
  { employeeId: 3, status: 'absent' },
  { employeeId: 4, status: 'present', arrivalTime: '07:55' },
  { employeeId: 5, status: 'present', arrivalTime: '08:10' },
  { employeeId: 6, status: 'late', arrivalTime: '09:10', lateMinutes: 40 },
  { employeeId: 7, status: 'present', arrivalTime: '08:05' },
])

const selectedDate = ref<Date>(new Date())
const searchTerm = ref<string>('')
const statusFilter = ref<'present' | 'absent' | 'late' | ''>('')
const siteFilter = ref<number | ''>('')
const sortBy = ref<string>('name')
const currentPage = ref<number>(1)
const itemsPerPage = 8
const showAddEmployee = ref<boolean>(false)
const showAddSite = ref<boolean>(false)
const activeEmployeeMenu = ref<number | null>(null)
const hoveredEmployee = ref<number | null>(null)

// Computed properties
const managerEmployees = computed(() => employees.value.filter(emp => emp.managerId === currentManager.value.id))
const managerSites = computed(() => sites.value.filter(site => site.managerId === currentManager.value.id))

// Mises à jour des counts pour les statistiques
const presentCount = computed(() => dailyAttendance.value.filter(e => e.status === 'present').length)
const lateCount = computed(() => dailyAttendance.value.filter(e => e.status === 'late').length)
const absentCount = computed(() => dailyAttendance.value.filter(e => e.status === 'absent').length)
const totalEmployees = computed(() => employees.value.length)
const attendanceRate = computed(() => {
  if (totalEmployees.value === 0) return 0
  const presentAndLate = presentCount.value + lateCount.value
  return Math.round((presentAndLate / totalEmployees.value) * 100)
})

// Nouveaux computed pour le diagramme avec axes
const maxEmployeeCount = computed(() => Math.max(totalEmployees.value, 10))
const yAxisTicks = computed(() => {
  const max = maxEmployeeCount.value
  const step = Math.ceil(max / 5)
  const ticks = []
  for (let i = 0; i <= max; i += step) {
    ticks.push(i)
  }
  return ticks
})

const isToday = computed(() => {
  const today = new Date()
  return selectedDate.value.toDateString() === today.toDateString()
})

const currentDate = computed(() => formatDate(selectedDate.value))

// Nouveaux computed pour les intervalles d'arrivée
const arrivalIntervals = computed<ArrivalInterval[]>(() => {
  const intervals = [
    { range: '7h45-8h15', count: 0 },
    { range: '8h15-8h30', count: 0 },
    { range: '8h30-9h00', count: 0 },
    { range: '9h00-9h30', count: 0 },
    { range: '> 9h30', count: 0 }
  ]

  const presentEmployees = dailyAttendance.value.filter(e => e.status !== 'absent' && e.arrivalTime)

  presentEmployees.forEach(emp => {
    const [hour, minute] = emp.arrivalTime!.split(':').map(Number)
    const totalMinutes = hour * 60 + minute

    if (totalMinutes >= 7 * 60 + 45 && totalMinutes <= 8 * 60 + 15) {
      intervals[0].count++
    } else if (totalMinutes > 8 * 60 + 15 && totalMinutes <= 8 * 60 + 30) {
      intervals[1].count++
    } else if (totalMinutes > 8 * 60 + 30 && totalMinutes <= 9 * 60) {
      intervals[2].count++
    } else if (totalMinutes > 9 * 60 && totalMinutes <= 9 * 60 + 30) {
      intervals[3].count++
    } else if (totalMinutes > 9 * 60 + 30) {
      intervals[4].count++
    }
  })

  return intervals
})

const maxIntervalCount = computed(() => Math.max(...arrivalIntervals.value.map(interval => interval.count), 1))

const filteredEmployees = computed(() => {
  let filtered = managerEmployees.value.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      employee.siteName.toLowerCase().includes(searchTerm.value.toLowerCase())

    const dailyStatus = dailyAttendance.value.find(att => att.employeeId === employee.id)?.status || 'absent'
    const matchesStatus = statusFilter.value ? dailyStatus === statusFilter.value : true
    const matchesSite = siteFilter.value ? employee.siteId === siteFilter.value : true

    return matchesSearch && matchesStatus && matchesSite
  })

  // Sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'position':
        return a.position.localeCompare(b.position)
      case 'site':
        return a.siteName.localeCompare(b.siteName)
      case 'punctualityScore':
        return b.punctualityScore - a.punctualityScore
      default:
        return 0
    }
  })

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / itemsPerPage))

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredEmployees.value.slice(start, end)
})

// Fonctions
const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const changeDate = (days: number) => {
  const newDate = new Date(selectedDate.value)
  newDate.setDate(newDate.getDate() + days)
  selectedDate.value = newDate
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const setSortBy = (field: string) => {
  sortBy.value = field
}

const toggleEmployeeMenu = (employeeId: number) => {
  if (activeEmployeeMenu.value === employeeId) {
    activeEmployeeMenu.value = null
  } else {
    activeEmployeeMenu.value = employeeId
  }
}

const editEmployee = (employee: Employee) => {
  alert(`Modifier les informations de ${employee.name}`)
  activeEmployeeMenu.value = null
}

const sendMemo = (employee: Employee) => {
  const memo = prompt(`Saisir le mémo à envoyer à ${employee.name}:`)
  if (memo) {
    alert(`Mémo envoyé à ${employee.name}: "${memo}"`)
  }
  activeEmployeeMenu.value = null
}

const deleteEmployee = (employee: Employee) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer ${employee.name} de l'équipe ?`)) {
    const index = employees.value.findIndex(emp => emp.id === employee.id)
    if (index !== -1) {
      employees.value.splice(index, 1)
      alert(`${employee.name} a été supprimé de l'équipe.`)
    }
  }
  activeEmployeeMenu.value = null
}

const generateReport = () => {
  alert('Génération du rapport mensuel...')
}

const manageSchedules = () => {
  alert('Accéder à la gestion des plannings...')
}

const handleEmployeeAdded = (newEmployee: Employee) => {
  employees.value.push(newEmployee)
}

const handleSiteAdded = (newSite: Site) => {
  sites.value.push(newSite)
}

// Fermer le menu au clic à l'extérieur
const closeMenuOnClickOutside = (event: MouseEvent) => {
  if (activeEmployeeMenu.value !== null) {
    const target = event.target as HTMLElement
    if (!target.closest('.employee-menu')) {
      activeEmployeeMenu.value = null
    }
  }
}

// Watchers
watch(filteredEmployees, () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  document.addEventListener('click', closeMenuOnClickOutside)
  HeadBuilder.apply({
    title: 'Equipe - Toké',
    css: [dashboardCss, equipeCss], // Charger les deux fichiers CSS
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})

</script>