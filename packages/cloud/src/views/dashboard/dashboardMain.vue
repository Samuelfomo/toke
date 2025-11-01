<template>
  <div class="dashboard-container">
    <Header
      :user-name="currentUser.name"
      :company-name="currentUser.company"
      :notification-count="notificationCount"
    />

    <main class="dashboard-content">
      <div class="content-container">
        <DashboardHero :loading="loading" />

        <EmployeeStatusList :loading="loading" />
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

// 1. Déclarer l'état de chargement
const loading = ref(true)

// Données réactives pour le header
const currentUser = ref({
  name: 'Danielle',
  company: 'IMEDIATIS'
})

// 2. Gérer le chargement asynchrone
onMounted(async () => {
  HeadBuilder.apply({
    title: 'Dashboard - Toké',
    css: [dashboardCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  })

  // *** Logique de Lazy Loading Asynchrone ***
  // Simulez le chargement des données initiales du tableau de bord
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Une fois les données clés chargées (ou l'attente terminée), affichez le contenu réel
  loading.value = false;
})

const notificationCount = ref(2)
</script>