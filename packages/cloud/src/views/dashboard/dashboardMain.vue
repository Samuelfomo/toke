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
import { onMounted, ref } from 'vue';
import Header from '../components/header.vue'
import DashboardHero from './dashboardHero.vue'
import EmployeeStatusList from '../dashboard/employeeStatusList.vue'
import dashboardCss from "../../assets/css/toke-dMain-04.css?url"
import HeadBuilder from '../../utils/HeadBuilder';

// Données réactives pour le header
const currentUser = ref({
  name: 'Danielle',
  company: 'IMEDIATIS'
})

// ✅ SOLUTION 1 : Charger les CSS manuellement
onMounted(() => {
  HeadBuilder.apply({
    title: 'Vérification OTP - Toké',
    css: [dashboardCss], // Charger les deux fichiers CSS
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })
})

const notificationCount = ref(2)
</script>

<style>
/* Vos styles existants restent ici */
</style>