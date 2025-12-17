<template>
  <div class="dashboard-container">
    <Header :notification-count="notificationCount" />

    <main class="dashboard-content">
      <div class="content-container">
        <!-- Afficher le skeleton pendant le chargement -->
        <template v-if="loading">
          <div class="dashboard-skeleton">
            <div class="skeleton-hero">
              <div class="skeleton-header"></div>
              <div class="skeleton-stats-grid">
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
              </div>
            </div>
            <div class="skeleton-list">
              <div class="skeleton-filters"></div>
              <div class="skeleton-cards"></div>
            </div>
          </div>
        </template>

        <!-- Afficher le contenu une fois les données chargées -->
        <template v-else-if="attendanceData">
          <DashboardHero
            :statistics="attendanceData.data.statistics"
            :date="attendanceData.data.date"
            :loading="false"
          />

          <EmployeeStatusList
            :employees="attendanceData.data.all_employees_status"
            :statistics="attendanceData.data.statistics"
            :present-employees="attendanceData.data.present_employees"
            :late-employees="attendanceData.data.late_employees"
            :absent-employees="attendanceData.data.absent_employees"
            :off-day-employees="attendanceData.data.off_day_employees"
            @refresh-data="loadData"
          />
        </template>

        <!-- Message d'erreur si échec -->
        <template v-else-if="error">
          <div class="error-state">
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3>Erreur de chargement</h3>
            <p>{{ error }}</p>
            <button @click="loadData" class="retry-btn">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Réessayer
            </button>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/composables/userStore'
import UserService from '@/service/UserService'
import Header from '../components/header.vue'
import DashboardHero from './dashboardHero.vue'
import EmployeeStatusList from '../dashboard/employeeStatusList.vue'
import dashboardCss from "../../assets/css/toke-dMain-04.css?url"
import HeadBuilder from '../../utils/HeadBuilder'
import type { Data } from '@/utils/interfaces/team.interface'
import cardCss from "../../assets/css/tokt-employeeC-06.css?url"

const userStore = useUserStore()
const loading = ref(true)
const error = ref<string | null>(null)
const attendanceData = ref<Data | null>(null)
const notificationCount = ref(2)

const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    // Vérifier que l'utilisateur est connecté
    if (!userStore.user?.guid) {
      throw new Error('Utilisateur non connecté')
    }

    // Récupérer les données de l'API
    const response = await UserService.listAttendance(userStore.user.guid)

    if (response.data && response.success) {
      attendanceData.value = response.data as Data
    } else {
      throw new Error('Format de réponse invalide')
    }
  } catch (err: any) {
    console.error('❌ Erreur lors du chargement:', err)
    error.value = err.message || 'Impossible de charger les données d\'assiduité'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  HeadBuilder.apply({
    title: 'Dashboard - Toké',
    css: [dashboardCss, cardCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  // Charger les données
  await loadData()
})
</script>

<style scoped>

</style>

