<template>
  <div class="profile-card-view">
    <div class="profile-container">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Chargement des informations...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3>Erreur de chargement</h3>
        <p>{{ error }}</p>
        <button @click="goBack" class="btn-back">
          Retour à l'équipe
        </button>
      </div>

      <!-- Employee Card -->
      <div v-else-if="employee" class="card-wrapper">
        <!-- Back Button -->
        <button @click="goBack" class="btn-back-arrow">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          <span>Retour</span>
        </button>

        <!-- Profile Header Card -->
        <div class="profile-header">
          <div class="profile-avatar">
            <div v-if="employee.avatar" class="avatar-image">
              <img :src="employee.avatar" :alt="employee.name" />
            </div>
            <div v-else class="avatar-placeholder">
              <span>{{ employee.initials }}</span>
            </div>
          </div>

          <div class="profile-info">
            <h1 class="profile-name">{{ employee.name }}</h1>
            <p class="profile-position">{{ employee.position || 'Employé' }}</p>
            <div class="profile-badges">
              <span class="badge" :class="{ 'badge-manager': employee.isManager }">
                <svg v-if="employee.isManager" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="badge-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                {{ employee.isManager ? 'Manager' : 'Employé' }}
              </span>
              <span v-if="employee.email" class="badge badge-email">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="badge-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                {{ employee.email }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions Grid -->
        <div class="actions-section">
          <h2 class="section-title">Actions disponibles</h2>

          <div class="actions-grid">
            <!-- Gérer son profil -->
            <button @click="manageProfile" class="action-card">
              <div class="action-icon-wrapper primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div class="action-content">
                <h3 class="action-title">Profil</h3>
                <p class="action-description">Gérer les informations personnelles</p>
              </div>
              <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <!-- Gérer ses horaires -->
            <button @click="manageSchedule" class="action-card">
              <div class="action-icon-wrapper secondary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="action-content">
                <h3 class="action-title">Horaires</h3>
                <p class="action-description">Planifier et consulter les horaires</p>
              </div>
              <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <!-- Générer code d'accès -->
            <button @click="generateAccessCode" class="action-card">
              <div class="action-icon-wrapper success">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <div class="action-content">
                <h3 class="action-title">Code d'accès</h3>
                <p class="action-description">Générer un nouveau code</p>
              </div>
              <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <!-- Gérer ses pointages -->
            <button @click="managePunches" class="action-card">
              <div class="action-icon-wrapper warning">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="action-content">
                <h3 class="action-title">Pointages</h3>
                <p class="action-description">Consulter l'historique des pointages</p>
              </div>
              <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <!-- Traiter ses mémos -->
            <button @click="manageMemos" class="action-card">
              <div class="action-icon-wrapper info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div class="action-content">
                <h3 class="action-title">Mémos</h3>
                <p class="action-description">Consulter et traiter les mémos</p>
              </div>
              <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <!-- Voir son équipe (Manager only) -->
            <button v-if="employee.isManager" @click="viewTeam" class="action-card manager-only">
              <div class="action-icon-wrapper manager">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="action-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <div class="action-content">
                <h3 class="action-title">Mon équipe</h3>
                <p class="action-description">Gérer les membres de l'équipe</p>
              </div>
              <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>

          <!-- Danger Zone -->
          <div class="danger-zone">
            <h3 class="danger-title">Zone dangereuse</h3>
            <button @click="suspendAccount" class="suspend-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="suspend-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
              </svg>
              <span>Suspendre ce compte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import "../assets/css/profileCard-toke-20.css"
import { useTeamStore } from '@/stores/teamStore';
import Footer from '@/views/components/footer.vue';

const route = useRoute()
const router = useRouter()

const teamStore = useTeamStore()

interface Employee {
  id: number
  guid: string
  name: string
  isManager: boolean
  position: string
  email: string
  avatar: string| null
  initials: string
}

const isLoading = ref(true)
const error = ref<string | null>(null)
const employee = ref<Employee | null>(null)

// Charger les données de l'employé comme dans EmployeeDetails
const loadEmployeeData = async () => {
  try {
    isLoading.value = true
    error.value = null

    const employeeId = route.params.id as string

    // 1️⃣ Vérifier le cache d'abord
    let foundEmployee = teamStore.getEmployeeById(employeeId)

    // 2️⃣ Si pas dans le cache, charger depuis l'API
    // if (!foundEmployee) {
    //   console.log('⚠️ Employé pas en cache, chargement API...')
    //   await teamStore.loadTeam(userStore.user?.guid!)
    //   foundEmployee = teamStore.getEmployeeById(employeeId)
    // }

    if (foundEmployee) {
      employee.value = {
        id: parseInt(foundEmployee.guid) || 0,
        guid: foundEmployee.guid,
        name: foundEmployee.name,
        email: foundEmployee.email,
        position: foundEmployee.position,
        avatar: foundEmployee.avatar? foundEmployee.avatar! : null,
        initials: foundEmployee.initials,
        isManager: foundEmployee.isManager
      }
    } else {
      throw new Error('Employé introuvable')
    }
  } catch (err: any) {
    console.error('❌ Erreur:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// Actions
const manageProfile = () => {
  console.log('🔍 Employee data:', employee.value)
  if (!employee.value) {
    alert('Erreur: Données employé manquantes')
    return
  }
  const employeeId = employee.value.guid
  // Naviguer vers EmployeeDetails en passant les données
  // router.push({
  //   name: 'employeeDetails',
  //   params: {
  //     employeeId: employeeId
  //   }})
  router.push({ name: `employeeDetails`, params: { id: employeeId } })
}

const manageSchedule = () => {
  if (!employee.value?.guid) return
  const employeeId = employee.value.guid
  router.push({ name: 'employeeSchedulesView', params: { id: employeeId } })
}

const generateAccessCode = () => {
  alert(`Code d'accès généré pour ${employee.value?.name}`)
}

const managePunches = () => {
  if (!employee.value?.guid) return
  const employeeId = employee.value.guid
  router.push({
    name: 'employeeAttendanceView',
    params: { id: employeeId }
  })
}

const manageMemos = () => {
  if (!employee.value?.guid) return
  const employeeId = employee.value.guid
  router.push({ name: `employeeMemosView`, params: { id: employeeId } })
}

const viewTeam = () => {
  router.push({ name: 'equipe' })
}

const suspendAccount = () => {
  if (confirm('Êtes-vous sûr de vouloir suspendre ce compte ?')) {
    alert(`Compte de ${employee.value?.name} suspendu`)
    goBack()
  }
}

const goBack = () => router.push('/equipe')

onMounted(() => {
  loadEmployeeData()
})
</script>

