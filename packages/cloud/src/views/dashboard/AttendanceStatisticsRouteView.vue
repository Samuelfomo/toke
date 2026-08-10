<script setup lang="ts">
import { computed } from 'vue';
import AttendanceStatisticsOverview from '@/views/modules/attendance-statistics/views/AttendanceStatisticsOverview.vue';
import { AttendanceStatisticsService } from '@/views/modules/attendance-statistics/services/attendance-statistics.service';
import apiClient from '@/tools/Fetch.Client';
import { useUserStore } from '@/stores/userStore';
import SiteService from '@/service/SiteService';

const userStore = useUserStore();

const attendanceService = new AttendanceStatisticsService(apiClient);

const managerGuid = computed(() => userStore.user?.guid ?? '');
const managerName = computed(() => userStore.fullName ?? '');

// ⚠️ temporaire : date client, à remplacer par une date métier serveur si possible
const businessToday = computed(() => new Date().toISOString().slice(0, 10));

// top-level await : le composant devient async, vérifie que la route l'importe
// dynamiquement (component: () => import('@/views/AttendanceStatisticsRouteView.vue'))
const siteOptions = await SiteService.listSites().then(res => res.data);

</script>

<template>
  <AttendanceStatisticsOverview
      :service="attendanceService"
      :manager-guid="managerGuid"
      :manager-name="managerName"
      :business-today="businessToday"
      :site-options="siteOptions.sites.items"
  />
</template>