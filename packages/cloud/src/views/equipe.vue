<template>
  <Header
    :user-name="currentUser.name"
    :company-name="currentUser.company"
    :notification-count="notificationCount"
/>
  <section class="manager-team">
    <!-- Loading State -->
    <div v-if="isLoadingEmployees" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Chargement de votre équipe...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoadingEmployees && teamEmployees.length === 0" class="empty-state">
      <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
      </svg>
      <h3>Aucun employé dans votre équipe</h3>
      <p>Commencez par ajouter des membres à votre équipe</p>
      <button @click="showAddEmployee = true" class="btn-primary">
        Ajouter un employé
      </button>
    </div>

    <!-- Main Content -->
    <template v-else>
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
                           :style="{ height: `${(dailyStats.present / maxEmployeeCount) * 100}%` }">
                        <span class="bar-value-new">{{ dailyStats.present }}</span>
                      </div>
                    </div>
                    <div class="bar-item-new">
                      <div class="bar-new absent"
                           :style="{ height: `${((dailyStats.late + dailyStats.absent) / maxEmployeeCount) * 100}%` }">
                        <span class="bar-value-new">{{ dailyStats.late + dailyStats.absent }}</span>
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
                    <span class="tick-label-x">Absents/Retards</span>
                  </div>
                </div>
              </div>
              <div class="attendance-rate">
                <span class="rate-value">{{ dailyAttendanceRate }}%</span>
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
            <a href="/employeeForm" class="action-link">
              <div class="action-content">
                <h3 class="action-title">Ajouter Employé</h3>
                <p class="action-description">Recruter un nouveau membre dans votre équipe</p>
              </div>
            </a>
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

          <button class="action-card quaternary">
            <div class="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <a href="/planning" class="action-link">
              <div class="action-content">
                <h3 class="action-title">Planning</h3>
                <p class="action-description">Gérer les horaires de travail</p>
              </div>
            </a>
          </button>
          <button class="action-card quaternary">
            <div class="action-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <a href="/memoList" class="action-link">
              <div class="action-content">
                <h3 class="action-title">Memo</h3>
                <p class="action-description">Traiter vos memos</p>
              </div>
            </a>
          </button>
        </div>
      </div>

      <div class="employees-table-section">
        <div class="table-header">
          <h2 class="section-title">Mon équipe ({{ totalSubordinates }})</h2>
          <div class="table-controls">
            <div class="search-container">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input
                type="text"
                v-model="searchTerm"
                placeholder="Rechercher par nom, poste..."
                class="search-input"
              >
            </div>
            <button @click="refreshTeam" class="btn-refresh" title="Actualiser la liste">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
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
              <th>Email</th>
              <th class="sortable" @click="setSortBy('punctualityScore')">
                Ponctualité
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
                @click="viewEmployeeDetail(employee.id)"
                style="cursor: pointer;"
            >
              <td class="employee-cell">
                <div class="employee-info">
                  <div class="employee-avatar-table">
                    <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name">
                    <div v-else class="avatar-placeholder">
                      {{ employee.initials }}
                    </div>
                  </div>
                  <div class="employee-details">
                    <span class="employee-name">{{ employee.name }}</span>
                  </div>
                </div>
              </td>
              <td>{{ employee.position }}</td>
              <td>{{ employee.email }}</td>
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
              <td class="actions-cell" @click.stop>
                <div class="employee-menu">
                  <button
                    @click="toggleEmployeeMenu(employee.id)"
                    class="menu-trigger"
                    :class="{ 'active': activeEmployeeMenu === employee.id }">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="menu-dots" width="20" height="20">
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
                      Mémo
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
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import equipeCss from "../assets/css/toke-equipe-09.css?url"
import dashboardCss from "../assets/css/toke-dMain-04.css?url"
import Header from '../views/components/header.vue'
import HeadBuilder from '@/utils/HeadBuilder';
import { User, useUserStore } from '@/composables/userStore';
import { useEmployee } from '@/utils/useEmployee';
import router from '@/router';
import UserService from '@/service/UserService';
import EntriesService from '@/service/EntriesService';
import { useRoute } from 'vue-router';

// Stores (uniquement pour les infos utilisateur)
const userStore = useUserStore()
const employeeStore = useEmployee()
const route = useRoute()

// ==========================================
// 🎯 DONNÉES LOCALES DE LA VUE
// ==========================================
const teamEmployees = ref<any[]>([])
const isLoadingEmployees = ref(false)
const subordinatesData = ref<any>(null)
const totalSubordinates = ref(0)
const employee = ref<any>(null)

// User data
const currentUser = computed(() => ({
  name: userStore.fullName || 'Manager',
  company: userStore.tenantName || 'N/A'
}))

const currentManagerId = computed(() => userStore.user?.guid)
const notificationCount = ref(2)


// UI State
const selectedDate = ref<Date>(new Date())
const searchTerm = ref<string>('')
const sortBy = ref<string>('name')
const currentPage = ref<number>(1)
const itemsPerPage = 8
const showAddEmployee = ref<boolean>(false)
const showAddSite = ref<boolean>(false)
const activeEmployeeMenu = ref<string | null>(null)

// ==========================================
// 🔄 FONCTION DE CHARGEMENT DES EMPLOYÉS
// ==========================================
const loadTeamEmployees = async () => {
  try {
    isLoadingEmployees.value = true
    console.log('📋 Chargement de l\'équipe du manager...')

    // Récupérer les subordonnés
    const response = await UserService.listSubordinates(userStore.user?.guid!)

    if (response.success && response.data) {
      subordinatesData.value = response.data
      totalSubordinates.value = response.data.total_subordinates || 0

      // Extraire la liste des employés depuis hierarchy
      if (response.data.hierarchy && Array.isArray(response.data.hierarchy)) {
        teamEmployees.value = response.data.hierarchy.map((emp: any) => {

          console.log('entries data', response.data.hierarchy.map((emp: any) => emp))

          const data: User = emp.user;

          // Calculer les initiales
          const nameParts = data.first_name?.split(' ') || ['U']
          const initials = nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
            : nameParts[0][0].toUpperCase()

          return {
            id: data.guid,
            name: data.first_name || 'N/A',
            position: emp.roles?.[0]?.role || 'N/A',
            email: data.email || 'N/A',
            avatar: data.avatar_url || null,
            initials: initials,
            punctualityScore: Math.floor(Math.random() * 30) + 70, // Mock pour l'instant
            roles: emp.roles || [],
            isActive: data.active || false
          }
        })

        console.log('✅ Employés chargés:', teamEmployees.value.length)
      } else {
        console.warn('⚠️ Aucune hiérarchie trouvée dans la réponse')
        teamEmployees.value = []
      }
    } else {
      console.error('❌ Erreur dans la réponse:', response)
      teamEmployees.value = []
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des employés:', error)
    teamEmployees.value = []
  } finally {
    isLoadingEmployees.value = false
  }
}

// Stats (mock pour l'instant - à implémenter avec vraies données)
const dailyStats = computed(() => employeeStore.getDailyStats(selectedDate.value))

const dailyAttendanceRate = computed(() => {
  const total = teamEmployees.value.length
  if (total === 0) return 0
  const presentAndLate = dailyStats.value.present + dailyStats.value.late
  return Math.round((presentAndLate / total) * 100)
})

const maxEmployeeCount = computed(() => Math.max(teamEmployees.value.length, 10))

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
const arrivalIntervals = computed(() => employeeStore.getArrivalIntervals(selectedDate.value))
const maxIntervalCount = computed(() => Math.max(...arrivalIntervals.value.map(interval => interval.count), 1))

// 🎯 FILTRAGE ET TRI DES EMPLOYÉS
const filteredEmployees = computed(() => {
  let filtered = teamEmployees.value.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.value.toLowerCase())

    return matchesSearch
  })

  // Sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'position':
        return a.position.localeCompare(b.position)
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

// Functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const viewEmployeeDetail = (employeeId: string) => {
  console.log('🔗 Navigation vers détails employé:', employeeId)
  router.push({ path: `/equipe/${employeeId}` })
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

const toggleEmployeeMenu = (employeeId: string) => {
  console.log('menu clicked', employeeId)
  activeEmployeeMenu.value =
    activeEmployeeMenu.value === employeeId ? null : employeeId
}

// 🔄 ACTUALISER LA LISTE
const refreshTeam = async () => {
  console.log('🔄 Actualisation de l\'équipe...')
  await loadTeamEmployees()
}

const editEmployee = (employee: any) => {
  alert(`Modifier les informations de ${employee.name}`)
  activeEmployeeMenu.value = null
}

// Modifier la fonction sendMemo pour accepter l'employé en paramètre
const sendMemo = (employee: any) => {
  console.log('📨 Envoi mémo pour:', employee.name, employee.id);

  // Naviguer vers la page de création de mémo avec le GUID de l'employé
  router.push({
    name: 'memoNew',  // ou '/memo/new' selon votre configuration de routes
    params: {
      employeeId: employee.id  // Le GUID de l'employé
    },
    query: {
      employeeName: employee.name,  // Optionnel: passer le nom aussi
      employeeEmail: employee.email  // Optionnel: passer l'email aussi
    }
  });

  activeEmployeeMenu.value = null;
};

const deleteEmployee = (employee: any) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer ${employee.name} de l'équipe ?`)) {
    teamEmployees.value = teamEmployees.value.filter(emp => emp.id !== employee.id)
    totalSubordinates.value = teamEmployees.value.length
  }
  activeEmployeeMenu.value = null
}

const handleEmployeeAdded = (newEmployee: any) => {
  teamEmployees.value.push(newEmployee)
  totalSubordinates.value = teamEmployees.value.length
  showAddEmployee.value = false
}

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
onMounted(async () => {
  document.addEventListener('click', closeMenuOnClickOutside)
  HeadBuilder.apply({
    title: 'Equipe - Toké',
    css: [dashboardCss, equipeCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  employeeStore.initialize()

  // 🎯 CHARGER LES EMPLOYÉS AU MONTAGE
  await loadTeamEmployees()

  // Charger les entrées (si nécessaire)
  try {
    const entriesData = await EntriesService.listEntries(userStore.user?.guid!)
    console.log('📊 Entrées chargées:', entriesData)
  } catch (error) {
    console.error('❌ Erreur lors du chargement des entrées:', error)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})
</script>

<style scoped>

</style>