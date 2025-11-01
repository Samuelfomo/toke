<template>
  <div class="employee-details-container">
    <div class="details-header">
      <a href="/dashboard" @click.prevent="goBack" class="back-arrow-link">
        <IconArrowLeft />
      </a>
      <h1 class="page-title">Détails de l'employé</h1>
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

    <div v-else class="employee-profile-card">
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-large">{{ employee.initials }}</div>
          <div :class="['status-indicator-large', 'indicator-' + employee.status]"></div>
        </div>
        <div class="main-info">
          <h2 class="employee-name-large">{{ employee.name }}</h2>
          <div :class="['employee-status-large', 'status-' + employee.status]">
            {{ employee.statusText }}
          </div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Informations Générales</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Matricule</span>
            <span class="info-value">{{ employee.matricule }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Poste</span>
            <span class="info-value">{{ employee.position }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Département</span>
            <span class="info-value">{{ employee.department }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date d'embauche</span>
            <span class="info-value">{{ employee.hireDate }}</span>
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
            <span class="info-label">Téléphone</span>
            <span class="info-value">{{ employee.phone }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Superviseur</span>
            <span class="info-value">{{ employee.manager }}</span>
          </div>
        </div>
      </div>

      <div class="details-section">
        <h3 class="section-title">Statistiques du mois</h3>
        <div class="stats-grid">
          <div class="stat-card stat-present">
            <div class="stat-number">{{ employee.monthlyStats?.present }}</div>
            <div class="stat-label">Jours Présents</div>
          </div>
          <div class="stat-card stat-late">
            <div class="stat-number">{{ employee.monthlyStats?.late }}</div>
            <div class="stat-label">Retards</div>
          </div>
          <div class="stat-card stat-absent">
            <div class="stat-number">{{ employee.monthlyStats?.absent }}</div>
            <div class="stat-label">Absences</div>
          </div>
          <div class="stat-card stat-rate">
            <div class="stat-number">{{ employee.monthlyStats?.punctualityRate }}%</div>
            <div class="stat-label">Taux de Ponctualité</div>
          </div>
        </div>
      </div>

      <div class="details-actions">
        <button class="action-btn action-memo" @click="openMemoChat">
          Envoyer un mémo
        </button>
        <button class="action-btn action-validate">
          Valider le retard
        </button>
        <button class="action-btn action-justify">
          Justifier l'absence
        </button>
        <button class="action-btn action-warn">
          Avertir l'employé
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

interface MonthlyStats {
  present: number
  late: number
  absent: number
  punctualityRate: number
}

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
  monthlyStats?: MonthlyStats
}

const route = useRoute()
const router = useRouter()

const loading = ref(true);

const employee = ref<Employee>({
  id: Number(route.params.employeeId),
  name: route.query.employeeName as string || 'Employé en cours de chargement',
  initials: route.query.employeeInitials as string || '...',
  status: 'info',
  statusText: 'Chargement en cours',
});

const fetchEmployeeDetails = async (id: number) => {
  // Simulez un délai réseau (ajustez ce temps si nécessaire)
  await new Promise(resolve => setTimeout(resolve, 800));

  // Simuler la récupération des données complètes
  employee.value = {
    ...employee.value,
    matricule: 'EMP' + id.toString().padStart(4, '0'),
    email: (route.query.employeeName as string || 'employe').toLowerCase().replace(' ', '.') + '@company.com',
    phone: '+237 6XX XXX XXX',
    department: 'Ressources Humaines',
    position: 'Chef de Projet',
    manager: 'Danielle',
    hireDate: '15/03/2022',
    time: route.query.employeeTime as string || '08:30',
    departureTime: '17:00',
    status: route.query.employeeStatus as any || 'present',
    statusText: route.query.employeeStatusText as string || 'Présent',
    monthlyStats: {
      present: 18,
      late: 2,
      absent: 1,
      punctualityRate: 85
    }
  };

  loading.value = false;
};

const goBack = () => {
  router.back();
};

const openMemoChat = () => {
  router.push({ name: 'memo', params: { employeeId: employee.value.id } });
};

onMounted(() => {
  fetchEmployeeDetails(Number(route.params.employeeId));

  HeadBuilder.apply({
    title: `Détails - ${employee.value.name} - Toké`,
    css: [detailsCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})
</script>

