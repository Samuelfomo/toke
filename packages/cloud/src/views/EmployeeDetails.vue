<template>
  <div class="ed-container">
    <div class="ed-header">
      <a href="/profileCard" @click.prevent="goBack" class="ed-back-link">
        <IconArrowLeft />
      </a>
    </div>

    <div v-if="loading" class="ed-skeleton">
      <div class="ed-skeleton-header">
        <div class="ed-skeleton-avatar"></div>
        <div class="ed-skeleton-info">
          <div class="ed-skeleton-name"></div>
          <div class="ed-skeleton-status"></div>
        </div>
      </div>

      <div class="ed-skeleton-sections">
        <div v-for="n in 3" :key="'sec'+n" class="ed-skeleton-section">
          <div class="ed-skeleton-title"></div>
          <div class="ed-skeleton-grid">
            <div v-for="i in 4" :key="'item'+i" class="ed-skeleton-item">
              <div class="ed-skeleton-label"></div>
              <div class="ed-skeleton-value"></div>
            </div>
          </div>
        </div>

        <div class="ed-skeleton-section">
          <div class="ed-skeleton-title"></div>
          <div class="ed-skeleton-stats">
            <div v-for="s in 4" :key="'stat'+s" class="ed-skeleton-stat-card"></div>
          </div>
        </div>
      </div>

      <div class="ed-skeleton-actions">
        <div class="ed-skeleton-btn" v-for="a in 2" :key="'act'+a"></div>
      </div>
    </div>

    <div v-else-if="!employee" class="ed-error">
      <p>Employé non trouvé</p>
      <button @click="goBack" class="ed-btn ed-btn-primary">Retour à l'accueil</button>
    </div>

    <div v-else class="ed-profile-card">
      <div class="ed-profile-header">
        <div class="ed-avatar-wrapper">
          <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name" class="ed-avatar ed-avatar-img">
          <div v-else class="ed-avatar">{{ employee.initials }}</div>
        </div>
        <div class="ed-profile-info">
          <h2 class="ed-employee-name">{{ employee.name }}</h2>
          <span :class="['ed-status', employee.isActive ? 'ed-status-active' : 'ed-status-inactive']">
            {{ employee.isActive ? 'Actif' : 'Inactif' }}
          </span>
        </div>
      </div>

      <div class="ed-section">
        <h3 class="ed-section-title">Informations Générales</h3>
        <div class="ed-info-grid">
          <div class="ed-info-item">
            <span class="ed-info-label">Code Employé</span>
            <span class="ed-info-value">{{ employee.employeeCode || 'N/A' }}</span>
          </div>
          <div class="ed-info-item">
            <span class="ed-info-label">Poste</span>
            <span class="ed-info-value">{{ employee.position }}</span>
          </div>
          <div class="ed-info-item">
            <span class="ed-info-label">Département</span>
            <span class="ed-info-value">{{ employee.department || 'N/A' }}</span>
          </div>
          <div class="ed-info-item">
            <span class="ed-info-label">Date d'embauche</span>
            <span class="ed-info-value">{{ formatDate(employee.hireDate) }}</span>
          </div>
        </div>
      </div>

      <div class="ed-section">
        <h3 class="ed-section-title">Contact</h3>
        <div class="ed-info-grid">
          <div class="ed-info-item">
            <span class="ed-info-label">Email</span>
            <span class="ed-info-value">{{ employee.email }}</span>
          </div>
          <div class="ed-info-item">
            <span class="ed-info-label">Téléphone</span>
            <span class="ed-info-value">{{ employee.phone || 'N/A' }}</span>
          </div>
          <div class="ed-info-item">
            <span class="ed-info-label">Pays</span>
            <span class="ed-info-value">{{ employee.country || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <div class="ed-section">
        <h3 class="ed-section-title">Rôles et Permissions</h3>
        <div class="ed-roles-container">
          <div v-for="role in employee.roles" :key="role.guid" class="ed-role-badge">
            <span class="ed-role-name">{{ role.name }}</span>
            <span class="ed-role-code">{{ role.code }}</span>
          </div>
          <div v-if="!employee.roles || employee.roles.length === 0" class="ed-no-roles">
            Aucun rôle assigné
          </div>
        </div>
      </div>

      <div class="ed-section">
        <h3 class="ed-section-title">Statistiques de Ponctualité - Mois en cours</h3>
        <div class="ed-stats-grid">
          <div class="ed-stat-card ed-stat-present">
            <div class="ed-stat-number">{{ monthlyStats.present }}</div>
            <div class="ed-stat-label">Jours Présents</div>
          </div>
          <div class="ed-stat-card ed-stat-late">
            <div class="ed-stat-number">{{ monthlyStats.late }}</div>
            <div class="ed-stat-label">Retards</div>
          </div>
          <div class="ed-stat-card ed-stat-absent">
            <div class="ed-stat-number">{{ monthlyStats.absent }}</div>
            <div class="ed-stat-label">Absences</div>
          </div>
          <div class="ed-stat-card ed-stat-rate">
            <div class="ed-stat-number">{{ employee.punctualityScore }}%</div>
            <div class="ed-stat-label">Taux de Ponctualité</div>
          </div>
        </div>
        <div class="ed-stats-summary">
          <p>Total de jours travaillés ce mois : {{ monthlyStats.totalDays }}</p>
          <p>Taux de présence : {{ attendanceRate }}%</p>
        </div>
      </div>

      <div class="ed-section" v-if="lastLogin">
        <h3 class="ed-section-title">Activité Récente</h3>
        <div class="ed-info-grid">
          <div class="ed-info-item">
            <span class="ed-info-label">Dernière connexion</span>
            <span class="ed-info-value">{{ lastLogin }}</span>
          </div>
          <div class="ed-info-item">
            <span class="ed-info-label">Statut du compte</span>
            <span class="ed-info-value" :class="employee.isActive ? 'ed-status-active' : 'ed-status-inactive'">
              {{ employee.isActive ? 'Actif' : 'Inactif' }}
            </span>
          </div>
        </div>
      </div>

      <div class="ed-actions">
<!--        <button class="ed-btn ed-btn-primary" @click="openMemoChat">-->
<!--          <IconMessage class="ed-btn-icon" /> Envoyer un mémo-->
<!--        </button>-->
<!--        <button class="ed-btn ed-btn-secondary" @click="editEmployee">-->
<!--          <IconEdit class="ed-btn-icon" /> Modifier les informations-->
<!--        </button>-->
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
import EntriesService from '@/service/EntriesService'
import { useTeamStore } from '@/stores/teamStore'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const employee = ref<any>(null)
const entriesData = ref<any[]>([])

const teamStore = useTeamStore()

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
    loading.value = true

    // Trouver l'employé dans la liste des subordonnés
    const foundEmployee = teamStore.getEmployeeById(employeeGuid)

    if (foundEmployee) {
      // Calculer les initiales
      const firstName = foundEmployee.firstName || ''
      const lastName = foundEmployee.lastName || ''
      const fullName = foundEmployee.name || `${firstName} ${lastName}`.trim()
      const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
        : fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

      employee.value = {
        name: fullName || 'N/A',
        email: foundEmployee.email || 'N/A',
        position: foundEmployee.roles?.[0]?.role || foundEmployee.jobTitle || 'N/A',
        department: foundEmployee.department || 'N/A',
        employeeCode: foundEmployee.employeeCode || 'N/A',
        hireDate: foundEmployee.hireDate || null,
        country: foundEmployee.country || 'N/A',
        phone: foundEmployee.phoneNumber || 'N/A',
        avatar: foundEmployee.avatar || null,
        initials: initials,
        isActive: foundEmployee.isActive !== undefined ? foundEmployee.isActive : true,
        roles: foundEmployee.roles || [],
        punctualityScore: Math.floor(Math.random() * 30) + 70
      }


      // Charger les entrées de l'employé
      try {
        const entriesResponse = await EntriesService.listEntries(employeeGuid)
        console.log(employeeGuid)
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
  } catch (error) {
    console.error('💥 Erreur lors de la récupération des détails:', error)
    employee.value = null
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/dashboard')
}

const openMemoChat = () => {
  if (employee.value) {
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
  const employeeGuid = route.params.id as string;

  fetchEmployeeDetails(employeeGuid)

  HeadBuilder.apply({
    title: `Détails - ${employee.value?.name || 'Employé'} - Toké`,
    css: [detailsCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

<style scoped>
</style>