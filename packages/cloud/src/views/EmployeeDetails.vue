<template>
  <div class="employee-details-container">
    <!-- Header avec bouton retour -->
    <div class="details-header">
      <a href="/dashboard" @click.prevent="goBack" class="back-arrow-link">
        <IconArrowLeft />
      </a>
      <h1 class="page-title">Détails de l'employé</h1>
    </div>

    <!-- Carte principale -->
    <div class="employee-profile-card">
      <!-- Section Avatar et infos principales -->
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-large">{{ employee.initials }}</div>
          <div :class="['status-indicator-large', 'indicator-' + employee.status]"></div>
        </div>
        <div class="profile-main-info">
          <h2 class="employee-name-large">{{ employee.name }}</h2>
          <div class="employee-status-large">
            <svg v-if="employee.status === 'present'" class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <svg v-else-if="employee.status === 'absent'" class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <svg v-else-if="employee.status === 'late'" class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="status-text-large">{{ employee.statusText }}</span>
          </div>
        </div>
      </div>

      <!-- Informations détaillées -->
      <div class="details-sections">
        <!-- Informations personnelles -->
        <div class="info-section">
          <h3 class="section-title">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            Informations personnelles
          </h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Matricule</label>
              <span>{{ employee.matricule || 'EMP' + employee.id.toString().padStart(4, '0') }}</span>
            </div>
            <div class="info-item">
              <label>Email</label>
              <span>{{ employee.email || employee.name.toLowerCase().replace(' ', '.') + '@company.com' }}</span>
            </div>
            <div class="info-item">
              <label>Téléphone</label>
              <span>{{ employee.phone || '+237 6XX XXX XXX' }}</span>
            </div>
            <div class="info-item">
              <label>Département</label>
              <span>{{ employee.department || 'Non spécifié' }}</span>
            </div>
          </div>
        </div>

        <!-- Informations de poste -->
        <div class="info-section">
          <h3 class="section-title">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            Poste et affectation
          </h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Poste</label>
              <span>{{ employee.position || 'Employé' }}</span>
            </div>
            <div class="info-item">
              <label>Manager</label>
              <span>{{ employee.manager || 'Non assigné' }}</span>
            </div>
            <div class="info-item">
              <label>Date d'embauche</label>
              <span>{{ employee.hireDate || '01/01/2023' }}</span>
            </div>
            <div class="info-item">
              <label>Lieu de travail</label>
              <span>{{ employee.location || 'Bureau principal' }}</span>
            </div>
          </div>
        </div>

        <!-- Présence aujourd'hui -->
        <div class="info-section">
          <h3 class="section-title">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Présence aujourd'hui
          </h3>
          <div class="attendance-info">
            <div class="info-item">
              <label>Heure d'arrivée</label>
              <span>{{ employee.time || 'Non enregistrée' }}</span>
            </div>
            <div class="info-item">
              <label>Heure de départ</label>
              <span>{{ employee.departureTime || 'En cours' }}</span>
            </div>
            <div class="info-item" v-if="employee.status === 'late'">
              <label>Retard</label>
              <span class="text-warning">{{ employee.lateTime || '15 minutes' }}</span>
            </div>
            <div class="info-item" v-if="employee.status === 'absent'">
              <label>Type d'absence</label>
              <span>{{ employee.absenceType || 'Non justifiée' }}</span>
            </div>
          </div>
        </div>

        <!-- Statistiques mensuelles -->
        <div class="info-section">
          <h3 class="section-title">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Statistiques du mois
          </h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ employee.monthlyStats?.present || 18 }}</div>
              <div class="stat-label">Jours présents</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ employee.monthlyStats?.late || 2 }}</div>
              <div class="stat-label">Retards</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ employee.monthlyStats?.absent || 1 }}</div>
              <div class="stat-label">Absences</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ employee.monthlyStats?.punctualityRate || 85 }}%</div>
              <div class="stat-label">Ponctualité</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="details-actions">
        <button v-if="employee.status === 'late' && !employee.isValidated" class="action-btn action-primary">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Justifier</span>
        </button>

        <button @click="openMemoChat" class="action-btn action-primary">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <span>Memo</span>
        </button>
        <button class="action-btn action-primary">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Valider</span>
        </button>
        <button class="action-btn action-warning">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span>Avertir</span>
        </button>

        <button class="action-btn action-info">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Voir l'historique</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeadBuilder from '@/utils/HeadBuilder'
import detailsCss from "../assets/css/toke-employeeD-09.css?url"
import { IconArrowLeft } from '@tabler/icons-vue';

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
  isJustified?: boolean
  isValidated?: boolean
  // Informations complémentaires
  matricule?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  manager?: string
  hireDate?: string
  departureTime?: string
  lateTime?: string
  absenceType?: string
  monthlyStats?: {
    present: number
    late: number
    absent: number
    punctualityRate: number
  }
}

const route = useRoute()
const router = useRouter()

// Récupération des données depuis les paramètres de route ou props
const employee = ref<Employee>({
  id: Number(route.params.employeeId),
  name: route.query.employeeName as string || 'Employé inconnu',
  initials: route.query.employeeInitials as string || 'EI',
  status: route.query.employeeStatus as any || 'info',
  statusText: route.query.employeeStatusText as string || 'Statut inconnu',
  location: route.query.employeeLocation as string || '',
  // Données simulées - à remplacer par un appel API
  matricule: 'EMP' + Number(route.params.employeeId).toString().padStart(4, '0'),
  email: (route.query.employeeName as string || 'employe').toLowerCase().replace(' ', '.') + '@company.com',
  phone: '+237 6XX XXX XXX',
  department: 'Ressources Humaines',
  position: 'Employé',
  manager: 'Danielle',
  hireDate: '15/03/2022',
  time: route.query.employeeTime as string || '08:30',
  departureTime: 'En cours',
  monthlyStats: {
    present: 18,
    late: 2,
    absent: 1,
    punctualityRate: 85
  }
})
// Navigation vers la page memo
const openMemoChat = () => {
  router.push({
    name: 'memoList',
    // params: { employeeId: props.employee.id },
    // query: {
    //   employeeName: props.employee.name,
    //   employeeInitials: props.employee.initials,
    //   employeeStatus: props.employee.status,
    //   employeeStatusText: props.employee.statusText,
    //   employeeLocation: props.employee.location || ''
    // }
  })
}
const goBack = () => {
  router.go(-1)
}

onMounted(() => {
  HeadBuilder.apply({
    title: `Détails - ${employee.value.name} - Toké`,
    css: [detailsCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>