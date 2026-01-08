<template>
  <div class="employee-details-container">
    <div class="details-header">
      <a href="/equipe" @click.prevent="goBack" class="back-arrow-link">
        <IconArrowLeft />
      </a>
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
          <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name" class="avatar-large-img">
          <div v-else class="avatar-large">{{ employee.initials }}</div>
        </div>
        <div class="main-info">
          <h2 class="employee-name-large">{{ employee.name }}</h2>
          <span :class="['status-badge', employee.isActive ? 'status-present' : 'status-absent']">
            {{ employee.isActive ? 'Actif' : 'Inactif' }}
          </span>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Informations Générales</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Code Employé</span>
            <span class="info-value">{{ employee.employeeCode || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Poste</span>
            <span class="info-value">{{ employee.position }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Département</span>
            <span class="info-value">{{ employee.department || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date d'embauche</span>
            <span class="info-value">{{ formatDate(employee.hireDate) }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Contact</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">{{ employee.email }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Téléphone</span>
            <span class="info-value">{{ employee.phone || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Pays</span>
            <span class="info-value">{{ employee.country || 'N/A' }}</span>
          </div>
<!--          <div class="info-item">-->
<!--            <span class="info-label">GUID</span>-->
<!--            <span class="info-value" style="font-size: 0.75rem;">{{ employee.id }}</span>-->
<!--          </div>-->
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Rôles et Permissions</h3>
        <div class="roles-container">
          <div v-for="role in employee.roles" :key="role.guid" class="role-badge">
            <span class="role-name">{{ role.name }}</span>
            <span class="role-code">{{ role.code }}</span>
          </div>
          <div v-if="!employee.roles || employee.roles.length === 0" class="no-roles">
            Aucun rôle assigné
          </div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Statistiques de Ponctualité - Mois en cours</h3>
        <div class="stats-grid">
          <div class="stat-card stat-present">
            <div class="stat-number">{{ monthlyStats.present }}</div>
            <div class="stat-label">Jours Présents</div>
          </div>
          <div class="stat-card stat-late">
            <div class="stat-number">{{ monthlyStats.late }}</div>
            <div class="stat-label">Retards</div>
          </div>
          <div class="stat-card stat-absent">
            <div class="stat-number">{{ monthlyStats.absent }}</div>
            <div class="stat-label">Absences</div>
          </div>
          <div class="stat-card stat-rate">
            <div class="stat-number">{{ employee.punctualityScore }}%</div>
            <div class="stat-label">Taux de Ponctualité</div>
          </div>
        </div>
        <div class="stats-summary">
          <p>Total de jours travaillés ce mois : {{ monthlyStats.totalDays }}</p>
          <p>Taux de présence : {{ attendanceRate }}%</p>
        </div>
      </div>

      <div class="details-section" v-if="lastLogin">
        <h3 class="section-title">Activité Récente</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Dernière connexion</span>
            <span class="info-value">{{ lastLogin }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Statut du compte</span>
            <span class="info-value" :class="employee.isActive ? 'status-present' : 'status-absent'">
              {{ employee.isActive ? 'Actif' : 'Inactif' }}
            </span>
          </div>
        </div>
      </div>

      <div class="details-actions">
        <button class="action-btn action-memo" @click="openMemoChat">
          <IconMessage class="modal-btn-icon" /> Envoyer un mémo
        </button>
        <button class="action-btn action-edit" @click="editEmployee">
          <IconEdit class="modal-btn-icon" /> Modifier les informations
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
import { IconArrowLeft, IconMessage, IconEdit } from '@tabler/icons-vue'
import UserService from '@/service/UserService'
import EntriesService from '@/service/EntriesService'
import { useUserStore } from '@/composables/userStore'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const employee = ref<any>(null)
const entriesData = ref<any[]>([])

// Calculer les statistiques mensuelles à partir des entrées
const monthlyStats = computed(() => {
  if (!entriesData.value || entriesData.value.length === 0) {
    return {
      present: 0,
      late: 0,
      absent: 0,
      totalDays: 0
    }
  }

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthEntries = entriesData.value.filter(entry => {
    const entryDate = new Date(entry.check_in_time || entry.created_at)
    return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
  })

  let present = 0
  let late = 0
  let absent = 0

  monthEntries.forEach(entry => {
    if (entry.status === 'present' || entry.status === 'on_time') {
      present++
    } else if (entry.status === 'late') {
      late++
    } else if (entry.status === 'absent') {
      absent++
    }
  })

  return {
    present,
    late,
    absent,
    totalDays: monthEntries.length
  }
})

// Calculer le taux de présence
const attendanceRate = computed(() => {
  const total = monthlyStats.value.totalDays
  if (total === 0) return 0
  const presentAndLate = monthlyStats.value.present + monthlyStats.value.late
  return Math.round((presentAndLate / total) * 100)
})

// Formater la dernière connexion
const lastLogin = computed(() => {
  if (!employee.value?.lastLoginAt) return null
  const date = new Date(employee.value.lastLoginAt)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const fetchEmployeeDetails = async (employeeGuid: string) => {
  try {
    console.log('🔍 Fetching employee with GUID:', employeeGuid)
    loading.value = true

    // Récupérer le manager connecté depuis le userStore
    const userStore = useUserStore()
    const managerGuid = userStore.user?.guid

    if (!managerGuid) {
      console.error('❌ Manager GUID non disponible')
      employee.value = null
      loading.value = false
      return
    }

    // Récupérer tous les subordonnés
    const response = await UserService.listSubordinates(managerGuid)

    if (response.success && response.data?.hierarchy) {
      // Trouver l'employé dans la liste des subordonnés
      const foundEmployee = response.data.hierarchy.find((emp: any) => emp.user.guid === employeeGuid)

      if (foundEmployee) {
        const userData = foundEmployee.user

        // Calculer les initiales
        const firstName = userData.first_name || ''
        const lastName = userData.last_name || ''
        const fullName = foundEmployee.full_name || `${firstName} ${lastName}`.trim()
        const initials = firstName && lastName
          ? `${firstName[0]}${lastName[0]}`.toUpperCase()
          : fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

        employee.value = {
          // id: userData.guid,
          name: fullName || 'N/A',
          email: userData.email || 'N/A',
          position: foundEmployee.roles?.[0]?.role || userData.job_title || 'N/A',
          department: userData.department || 'N/A',
          employeeCode: userData.employee_code || 'N/A',
          hireDate: userData.hire_date || null,
          country: userData.country || 'N/A',
          phone: userData.phone_number || 'N/A',
          avatar: userData.avatar_url || null,
          initials: initials,
          isActive: userData.active !== undefined ? userData.active : true,
          lastLoginAt: userData.last_login_at || null,
          roles: foundEmployee.roles || [],
          punctualityScore: Math.floor(Math.random() * 30) + 70 // Mock - sera calculé avec les vraies entrées
        }

        console.log('✅ Employee loaded:', employee.value)

        // Charger les entrées de l'employé
        try {
          const entriesResponse = await EntriesService.listEntries(employeeGuid)
          if (entriesResponse.success && entriesResponse.data) {
            entriesData.value = Array.isArray(entriesResponse.data)
              ? entriesResponse.data
              : []
            console.log('✅ Entries loaded:', entriesData.value.length)

            // Recalculer le score de ponctualité basé sur les vraies données
            if (monthlyStats.value.totalDays > 0) {
              employee.value.punctualityScore = attendanceRate.value
            }
          }
        } catch (entriesError) {
          console.warn('⚠️ Could not load entries:', entriesError)
          entriesData.value = []
        }

      } else {
        console.error('❌ Employé non trouvé dans la liste des subordonnés')
        employee.value = null
      }
    } else {
      console.error('❌ Erreur dans la réponse API')
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
    // Utiliser le GUID de l'employé (pas l'ID local)
    const employeeGuid = route.params.employeeId as string;
    console.log('📨 Envoi mémo pour:', employeeGuid);

    router.push({
      name: 'memoNew',
      params: { employeeId: employeeGuid }
    });

    console.log('📨 Navigation vers création de mémo pour:', employee.value.name);
  }
};

const editEmployee = () => {
  if (employee.value) {
    router.push({ name: 'employeeEdit', params: { employeeId: employee.value.id } })
  }
}

onMounted(() => {
  const employeeIdParam = route.params.employeeId
  console.log('🚀 EmployeeDetails mounted')
  console.log('📝 Route params:', route.params)
  console.log('📝 employeeId param:', employeeIdParam)

  let employeeGuid: string

  if (Array.isArray(employeeIdParam)) {
    employeeGuid = employeeIdParam[0]
  } else {
    employeeGuid = employeeIdParam as string
  }

  console.log('🔢 Employee GUID:', employeeGuid)

  fetchEmployeeDetails(employeeGuid)

  HeadBuilder.apply({
    title: `Détails - ${employee.value?.name || 'Employé'} - Toké`,
    css: [detailsCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

<style scoped>
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

.stats-summary p {
  margin: 0.25rem 0;
}

.avatar-large-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.roles-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.role-badge {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1rem;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.5rem;
}

.role-name {
  font-weight: 600;
  color: #1e40af;
  font-size: 0.875rem;
}

.role-code {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.no-roles {
  color: #9ca3af;
  font-style: italic;
  padding: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.action-memo {
  background-color: #3b82f6;
  color: white;
}

.action-memo:hover {
  background-color: #2563eb;
}

.action-edit {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-edit:hover {
  background-color: #e5e7eb;
}

.modal-btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style>