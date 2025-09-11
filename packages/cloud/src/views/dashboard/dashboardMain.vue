<template>
  <div class="dashboard-container">
    <!-- Utilisation du composant header réutilisable -->
    <Header
      :user-name="currentUser.name"
      :company-name="currentUser.company"
      :notification-count="notificationCount"
    />

    <main class="dashboard-content">
      <div class="content-container">
        <DashboardHero />
        <EmployeeStatusList />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Header from '../components/header.vue'
import DashboardHero from './dashboardHero.vue'
import EmployeeStatusList from '../dashboard/employeeStatusList.vue'
import "../../assets/css/toke-dMain-04.css"

// Données réactives pour le header
const currentUser = ref({
  name: 'Danielle',
  company: 'IMEDIATIS'
})

const notificationCount = ref(2)
</script>

<style>
/* Vos styles existants restent ici */
</style>