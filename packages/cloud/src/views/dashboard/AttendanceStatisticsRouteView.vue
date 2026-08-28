<template>
  <div
    class="flex min-h-screen flex-col bg-gradient-to-r from-[#d0e8f7] via-[#f0e4f5] to-[#d0e8f7] text-slate-900"
  >
    <!-- Le chrome de l'application est toujours monté, indépendamment des appels réseau. -->
    <Header />

    <main class="min-w-0 flex-1">
      <AttendanceStatisticsOverview
        :service="attendanceService"
        :manager-guid="managerGuid"
        :manager-name="managerName"
        :business-today="businessToday"
        :site-options="siteOptions"
      />
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import Header from '@/views/components/header.vue';
import Footer from '@/views/components/footer.vue';
import AttendanceStatisticsOverview from '@/views/modules/attendance-statistics/views/AttendanceStatisticsOverview.vue';
import { AttendanceStatisticsService } from '@/views/modules/attendance-statistics/services/attendance-statistics.service';
import type { AttendanceSiteOption } from '@/views/modules/attendance-statistics/types/attendance-statistics.ui.types';
import apiClient from '@/tools/Fetch.Client';
import { useUserStore } from '@/stores/userStore';
import SiteService from '@/service/SiteService';

const userStore = useUserStore();
const attendanceService = new AttendanceStatisticsService(apiClient);

const managerGuid = computed(() => userStore.user?.guid ?? '');
const managerName = computed(() => userStore.fullName ?? '');

// Temporaire : date client, à remplacer par une date métier serveur si possible.
const businessToday = computed(() => new Date().toISOString().slice(0, 10));

// Important : ne pas utiliser de top-level await ici.
// Le Header et le Footer doivent être rendus immédiatement, même si le chargement des sites est lent.
const siteOptions = ref<AttendanceSiteOption[]>([]);

async function loadSiteOptions(): Promise<void> {
  try {
    const response = await SiteService.listSites();
    siteOptions.value = response.data?.sites?.items ?? [];
  } catch (error) {
    // Les statistiques restent utilisables sans la liste des sites.
    // Le filtre de site sera simplement vide si cet appel échoue.
    console.error('Impossible de charger la liste des sites :', error);
    siteOptions.value = [];
  }
}

onMounted(() => {
  void loadSiteOptions();
});
</script>
