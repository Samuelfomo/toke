<template>
  <div class="employee-details-container">
    <div class="details-header">
      <a href="/equipe" @click.prevent="goBack" class="back-arrow-link">
        <IconArrowLeft />
      </a>
<!--      <h1 class="page-title">Détails de l'employé</h1>-->
    </div>

    <div v-if="loading" class="employee-profile-skeleton">
      <div class="skeleton-profile-header">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-main-info">
          <div class="skeleton-name-large"></div>
          <div class="skeleton-status-large"></div>
        </div>
      </div>

      <div class="skeleton-details-sections">
        <div v-for="n in 3" :key="'sec'+n" class="skeleton-info-section">
          <div class="skeleton-section-title"></div>
          <div class="skeleton-info-grid">
            <div v-for="i in 4" :key="'item'+i" class="skeleton-info-item">
              <div class="skeleton-label"></div>
              <div class="skeleton-value"></div>
            </div>
          </div>
        </div>

        <div class="skeleton-info-section">
          <div class="skeleton-section-title"></div>
          <div class="stats-grid-skeleton">
            <div v-for="s in 4" :key="'stat'+s" class="skeleton-stat-card"></div>
          </div>
        </div>
      </div>

      <div class="skeleton-details-actions">
        <div class="skeleton-action-btn" v-for="a in 4" :key="'act'+a"></div>
      </div>
    </div>

    <div v-else-if="!employee" class="error-message">
      <p>Employé non trouvé</p>
      <button @click="goBack" class="action-btn">Retour à l'équipe</button>
    </div>

    <div v-else class="employee-profile-card">
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-large">{{ employee.initials }}</div>
        </div>
        <div class="main-info">
          <h2 class="employee-name-large">{{ employee.name }}</h2>
          <span :class="['status-badge', 'status-' + todayStatus.status]">
            {{ todayStatus.statusText }}
          </span>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Informations Générales</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Matricule</span>
            <span class="info-value">EMP{{ employee.id.toString().padStart(4, '0') }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Poste</span>
            <span class="info-value">{{ employee.position }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Site</span>
            <span class="info-value">{{ siteName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date d'embauche</span>
            <span class="info-value">{{ formatDate(employee.hireDate) }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Contact et Supervision</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">{{ employee.email }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Manager</span>
            <span class="info-value">{{ getManagerName(employee.managerId) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">ID Manager</span>
            <span class="info-value">MGR{{ employee.managerId.toString().padStart(3, '0') }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Statistiques du mois</h3>
        <div class="stats-grid">
          <div class="stat-card stat-present">
            <div class="stat-number">{{ employee.punctualityDetails.onTime }}</div>
            <div class="stat-label">Jours Présents</div>
          </div>
          <div class="stat-card stat-late">
            <div class="stat-number">{{ employee.punctualityDetails.late }}</div>
            <div class="stat-label">Retards</div>
          </div>
          <div class="stat-card stat-absent">
            <div class="stat-number">{{ employee.punctualityDetails.absent }}</div>
            <div class="stat-label">Absences</div>
          </div>
          <div class="stat-card stat-rate">
            <div class="stat-number">{{ employee.punctualityScore }}%</div>
            <div class="stat-label">Taux de Ponctualité</div>
          </div>
        </div>
        <div class="stats-summary">
          <p>Total de jours travaillés ce mois : {{ employee.punctualityDetails.totalDays }}</p>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Statut aujourd'hui</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Statut</span>
            <span class="info-value" :class="'status-' + todayStatus.status">
              {{ todayStatus.statusText }}
            </span>
          </div>
          <div class="info-item" v-if="todayRecord?.arrivalTime">
            <span class="info-label">Heure d'arrivée</span>
            <span class="info-value">{{ todayRecord.arrivalTime }}</span>
          </div>
          <div class="info-item" v-if="todayRecord?.lateMinutes">
            <span class="info-label">Retard</span>
            <span class="info-value">{{ todayRecord.lateMinutes }} minutes</span>
          </div>
          <div class="info-item" v-if="todayRecord?.reason">
            <span class="info-label">Motif</span>
            <span class="info-value">{{ todayRecord.reason }}</span>
          </div>
        </div>
      </div>

      <div class="details-actions">
        <button class="action-btn action-memo" @click="openMemoChat">
          <IconMessage class="modal-btn-icon" /> Envoyer un mémo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeadBuilder from '@/utils/HeadBuilder'
import detailsCss from "../assets/css/toke-employee-detail13.css?url"
import { IconArrowLeft, IconMessage } from '@tabler/icons-vue'
import { useEmployeeStore } from '../composables/useEmployeeStore'

const route = useRoute()
const router = useRouter()
const employeeStore = useEmployeeStore()

const loading = ref(true)
const employee = ref<any>(null)

// Calculer le statut du jour
const todayStatus = computed(() => {
  if (!employee.value) return { status: 'absent', statusText: 'Non disponible' }
  return employeeStore.getEmployeeDailyStatus(employee.value.id, new Date())
})

// Récupérer l'enregistrement du jour
const todayRecord = computed(() => {
  if (!employee.value) return null
  const today = new Date().toISOString().split('T')[0]
  const allRecords = employeeStore.attendanceHistory.value
  if (!allRecords || !Array.isArray(allRecords)) return null
  return allRecords.find(
    r => r.employeeId === employee.value.id && r.date === today
  )
})

// Récupérer le nom du site
const siteName = computed(() => {
  if (!employee.value) return 'N/A'
  return employeeStore.getSiteName(employee.value.siteId)
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getManagerName = (managerId: number) => {
  const allEmployees = employeeStore.employees.value
  if (!allEmployees || !Array.isArray(allEmployees)) return 'Danielle'
  const manager = allEmployees.find(emp => emp.id === managerId)
  return manager ? manager.name : 'Danielle'
}

const fetchEmployeeDetails = async (id: number) => {
  try {
    console.log('🔍 Fetching employee with ID:', id, 'Type:', typeof id)

    // Vérifier que l'ID est valide
    if (isNaN(id) || id <= 0) {
      console.error('❌ ID invalide:', id)
      employee.value = null
      loading.value = false
      return
    }

    // Initialiser le store si ce n'est pas déjà fait
    employeeStore.initialize()

    // Attendre un peu pour s'assurer que le store est prêt
    await new Promise(resolve => setTimeout(resolve, 100))

    // FIX: Accéder à .value du ComputedRef
    const allEmployees = employeeStore.employees.value
    console.log('📊 Type of employees:', typeof allEmployees)
    console.log('📊 Is array:', Array.isArray(allEmployees))
    console.log('📊 Employees:', allEmployees)

    if (!allEmployees || !Array.isArray(allEmployees)) {
      console.error('❌ Employees is not an array:', allEmployees)
      employee.value = null
      loading.value = false
      return
    }

    console.log('📊 Total employees in store:', allEmployees.length)
    console.log('👥 Employees:', allEmployees.map(e => ({ id: e.id, name: e.name })))

    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 400))

    const foundEmployee = allEmployees.find(emp => emp.id === id)

    console.log('✅ Found employee:', foundEmployee)

    if (foundEmployee) {
      employee.value = foundEmployee
      console.log('✨ Employee loaded:', employee.value.name)
    } else {
      console.error(`❌ Employé avec l'ID ${id} non trouvé`)
      console.log('🔢 Available IDs:', allEmployees.map(e => e.id))
      employee.value = null
    }
  } catch (error) {
    console.error('💥 Erreur lors de la récupération des détails:', error)
    employee.value = null
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/equipe')
}

const openMemoChat = () => {
  if (employee.value) {
    router.push({ name: 'memo', params: { employeeId: employee.value.id } })
  }
}

onMounted(() => {
  // FIX: Convertir correctement le paramètre en nombre
  const employeeIdParam = route.params.employeeId
  console.log('🚀 EmployeeDetails mounted')
  console.log('📝 Route params:', route.params)
  console.log('📝 employeeId param:', employeeIdParam, 'Type:', typeof employeeIdParam)

  let employeeId: number

  if (Array.isArray(employeeIdParam)) {
    employeeId = parseInt(employeeIdParam[0], 10)
  } else if (typeof employeeIdParam === 'string') {
    employeeId = parseInt(employeeIdParam, 10)
  } else {
    employeeId = Number(employeeIdParam)
  }

  console.log('🔢 Converted ID:', employeeId, 'Type:', typeof employeeId, 'IsNaN:', isNaN(employeeId))

  fetchEmployeeDetails(employeeId)

  HeadBuilder.apply({
    title: `Détails - ${employee.value?.name || 'Employé'} - Toké`,
    css: [detailsCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

<style scoped>
.status-present {
  color: #10b981;
  font-weight: 600;
}

.status-late {
  color: #f59e0b;
  font-weight: 600;
}

.status-absent {
  color: #ef4444;
  font-weight: 600;
}

.status-info {
  color: #3b82f6;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

.status-badge.status-present {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.status-late {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge.status-absent {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge.status-info {
  background-color: #dbeafe;
  color: #1e40af;
}

.error-message {
  text-align: center;
  padding: 2rem;
}

.error-message p {
  font-size: 1.25rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.stats-summary {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  text-align: center;
  color: #6b7280;
}
</style>