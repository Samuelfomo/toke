<template>
  <div class="page-layout">
    <Header />
    <main class="page-main">
      <!-- Loading State -->
      <div v-if="isLoadingEmployees" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Chargement de votre équipe...</p>
      </div>

      <!-- Main Content -->
      <template v-else>
        <div class="employees-table-section">
          <h2 class="section-title">Membres ({{ totalSubordinates }})</h2>
          <div class="flex justify-between items-start">
            <div class="search-bar-wrapper w-full">
              <div class="search-container">
                <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                    type="text"
                    v-model="searchTerm"
                    placeholder="Rechercher un employé..."
                    class="search-input"
                >
              </div>
            </div>

            <button @click="navigateToEmployeeForm" class="btn-add-employee max-w-xs">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z">
                </path>
              </svg>
              Ajouter un employé
            </button>
          </div>

          <!-- Empty State - Aucun employé -->
          <div v-if="teamEmployees.length === 0" class="table-empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
              </path>
            </svg>
            <h3>Aucun employé trouvé</h3>
            <p>Commencez par ajouter des membres à votre équipe</p>
            <button @click="navigateToEmployeeForm" class="btn-primary">
              Ajouter un employé
            </button>
          </div>

          <!-- Empty State après recherche -->
          <div v-else-if="filteredEmployees.length === 0" class="table-empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <h3>Aucun résultat trouvé</h3>
            <p>Aucun employé ne correspond à votre recherche "{{ searchTerm }}"</p>
            <button @click="searchTerm = ''" class="btn-secondary">
              Effacer la recherche
            </button>
          </div>

          <!-- Tableau des Membres -->
          <template v-else>
            <div class="table-wrapper">
              <table class="employees-table">
                <tbody>
                <tr
                    v-for="employee in paginatedEmployees"
                    :key="employee.id"
                    @click="viewEmployeeDetail(employee.id)"
                    class="employee-row"
                >
                  <td class="avatar-cell">
                    <div class="employee-avatar">
                      <span class="avatar-initials">{{ employee.initials }}</span>
                    </div>
                  </td>
                  <td class="info-cell">
                    <div class="employee-info">
                      <div class="employee-name-row">
                        <span class="employee-name">{{ employee.name }}</span>
                        <span v-if="isManager(employee)" class="manager-badge">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                            <path d="M12 2L9.19 8.63L2 9.24L7 13.47L5.82 20.16L12 16.56L18.18 20.16L17 13.47L22 9.24L14.81 8.63L12 2Z"/>
                          </svg>
                          Manager
                        </span>
                      </div>
                      <span class="employee-position">{{ employee.position }}</span>
                    </div>
                  </td>

                  <!-- ✅ Cellule Actions — plus de position relative, le dropdown via Teleport -->
                  <td class="actions-cell" @click.stop>
                    <div class="employee-menu">
                      <button
                          @click.stop="toggleEmployeeMenu(employee.id, $event)"
                          class="menu-trigger"
                          :class="{ 'active': activeEmployeeMenu === employee.id }">
                        <svg viewBox="0 0 24 24" fill="currentColor" class="menu-dots" width="20" height="20">
                          <circle cx="12" cy="5" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
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
          </template>
        </div>
      </template>
    </main>

    <!-- Footer -->
    <Footer />
  </div>

  <!-- ✅ DROPDOWN TELEPORTÉ dans le <body> — échappe à tous les overflow/z-index parents -->
  <Teleport to="body">
    <div
        v-if="activeEmployeeMenu !== null"
        :style="menuPosition"
        class="employee-dropdown-teleport"
    >
      <button @click="sendMemo(activeEmployeeForMenu)" class="dropdown-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="item-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z">
          </path>
        </svg>
        Mémo
      </button>
      <button @click="editEmployee(activeEmployeeForMenu)" class="dropdown-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="item-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
          </path>
        </svg>
        Modifier
      </button>
    </div>
  </Teleport>

  <EmployeeForm
      v-if="showAddEmployee"
      :supervisor-guid="userStore.user?.guid!"
      :employee="selectedEmployee"
      @close="closeEmployeeForm"
      @created="handleEmployeeAdded"
      @updated="handleEmployeeUpdated"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import equipeCss from "../assets/css/toke-equipe-09.css?url"
import dashboardCss from "../assets/css/toke-dMain-04.css?url"
import footerCss from "../assets/css/toke-footer-24.css?url"
import Header from '../views/components/header.vue'
import Footer from '../views/components/footer.vue'
import HeadBuilder from '@/utils/HeadBuilder';
import { useUserStore } from '@/stores/userStore';
import { useEmployee } from '@/utils/useEmployee';
import EmployeeForm from '@/views/employeeForm.vue';
import { TeamEmployee, useTeamStore } from '@/stores/teamStore';
import { useMemoStore } from '@/stores/memoStore';

// Stores
const userStore = useUserStore()
const employeeStore = useEmployee()
const router = useRouter()
const teamStore = useTeamStore()
const memoStore = useMemoStore()

// ==========================================
// 🎯 DONNÉES LOCALES DE LA VUE
// ==========================================

const teamEmployees = computed(() => teamStore.employees)
const isLoadingEmployees = computed(() => teamStore.isLoading)
const totalSubordinates = computed(() => teamStore.totalEmployees)

const getMemoCount = (employeeId: string): number => {
  return memoStore.getMemosByEmployee(employeeId).length
}

const isManager = (employee: TeamEmployee): boolean => {
  const position = (employee.position || '').toLowerCase()
  const managerKeywords = ['manager', 'responsable', 'directeur', 'chef', 'superviseur', 'lead', 'head']
  return managerKeywords.some(kw => position.includes(kw))
}

// UI State
const searchTerm = ref<string>('')
const sortBy = ref<string>('name')
const currentPage = ref<number>(1)
const itemsPerPage = 8
const showAddEmployee = ref<boolean>(false)
const selectedEmployee = ref<TeamEmployee | null>(null)

// ==========================================
// ✅ GESTION DU MENU CONTEXTUEL (Teleport)
// ==========================================

// Guid de l'employé dont le menu est ouvert (null = fermé)
const activeEmployeeMenu = ref<string | null>(null)

// Référence vers l'objet employé actif (pour les actions du dropdown)
const activeEmployeeForMenu = ref<TeamEmployee | null>(null)

// Position calculée dynamiquement depuis getBoundingClientRect
const menuPosition = ref<Record<string, string>>({})

/**
 * Ouvre/ferme le menu contextuel en calculant sa position absolue
 * depuis le bouton cliqué — indépendant de tout overflow/z-index parent.
 */
const toggleEmployeeMenu = (employeeId: string, event: MouseEvent) => {
  if (activeEmployeeMenu.value === employeeId) {
    activeEmployeeMenu.value = null
    activeEmployeeForMenu.value = null
    return
  }

  const btn = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()

  // Positionner le dropdown sous le bouton, aligné à droite
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  }

  activeEmployeeMenu.value = employeeId
  activeEmployeeForMenu.value = teamEmployees.value.find(e => e.id === employeeId) ?? null
}

// ==========================================
// 🔄 CHARGEMENT
// ==========================================

const loadTeamEmployees = async () => {
  try {
    await teamStore.loadTeam(userStore.user?.guid!)
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// ==========================================
// 🎯 FILTRAGE ET TRI
// ==========================================

const filteredEmployees = computed(() => {
  let filtered = teamEmployees.value.filter(employee => {
    return (
        employee.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  })

  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':       return a.name.localeCompare(b.name)
      case 'position':   return a.position.localeCompare(b.position)
      case 'punctualityScore': return b.punctualityScore - a.punctualityScore
      default:           return 0
    }
  })

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / itemsPerPage))

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredEmployees.value.slice(start, start + itemsPerPage)
})

// ==========================================
// 📌 ACTIONS
// ==========================================

const navigateToEmployeeForm = () => {
  showAddEmployee.value = true
}

const viewEmployeeDetail = (employeeId: string) => {
  router.push({ name: 'profileCard', params: { id: employeeId } })
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const editEmployee = (employee: TeamEmployee | null) => {
  if (!employee) return
  selectedEmployee.value = employee
  showAddEmployee.value = true
  activeEmployeeMenu.value = null
  activeEmployeeForMenu.value = null
}

const sendMemo = (employee: TeamEmployee | null) => {
  if (!employee) return
  router.push({
    path: '/memoNew',
    query: {
      employeeGuid: employee.id,
      employeeName: employee.name,
    }
  })
  activeEmployeeMenu.value = null
  activeEmployeeForMenu.value = null
}

const deleteEmployee = (employee: TeamEmployee) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer ${employee.name} de l'équipe ?`)) {
    // teamStore.removeEmployee(employee.id)
  }
  activeEmployeeMenu.value = null
  activeEmployeeForMenu.value = null
}

const handleEmployeeAdded = (newEmployee: any) => {
  teamStore.addEmployee(newEmployee)
  closeEmployeeForm()
}

const handleEmployeeUpdated = (updatedEmployee: any) => {
  teamStore.updateEmployee(updatedEmployee)
  closeEmployeeForm()
}

const closeEmployeeForm = () => {
  showAddEmployee.value = false
  selectedEmployee.value = null
}

// ==========================================
// 🖱️ FERMETURE AU CLIC EXTÉRIEUR
// ==========================================

const handleOutsideClick = (event: MouseEvent) => {
  if (!activeEmployeeMenu.value) return
  const target = event.target as HTMLElement
  // Ferme si le clic n'est pas sur un bouton trigger ni dans le dropdown téléporté
  if (
      !target.closest('.menu-trigger') &&
      !target.closest('.employee-dropdown-teleport')
  ) {
    activeEmployeeMenu.value = null
    activeEmployeeForMenu.value = null
  }
}

// ==========================================
// ⌚ WATCHERS & LIFECYCLE
// ==========================================

watch(filteredEmployees, () => {
  currentPage.value = 1
})

onMounted(async () => {
  document.addEventListener('click', handleOutsideClick)

  HeadBuilder.apply({
    title: 'Equipe - Toké',
    css: [dashboardCss, equipeCss, footerCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  employeeStore.initialize()
  await loadTeamEmployees()
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.employee-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.manager-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 0.3px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(217, 119, 6, 0.35);
}

/* ✅ Dropdown téléporté — position fixed gérée via le style inline dynamique */
.employee-dropdown-teleport {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: #ffffff;
  border: 1px solid var(--border-light, #e5e7eb);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  padding: 6px 0;
}
</style>