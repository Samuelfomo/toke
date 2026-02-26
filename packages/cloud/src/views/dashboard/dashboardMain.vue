<template xmlns="http://www.w3.org/1999/html">
  <div class="dashboard-container">
    <Header />

    <main class="dashboard-main">
      <!-- État de chargement -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des données...</p>
      </div>

      <!-- État d'erreur -->
      <div v-else-if="error" class="error-state">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1-1.732-1-2.464 0L4.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3>Erreur de chargement</h3>
        <p>{{ error }}</p>
        <button @click="handleRetryClick" class="retry-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Réessayer</span>
        </button>
      </div>

      <!-- Contenu du dashboard -->
      <div v-else-if="dashboardData" class="dashboard-content">
        <!-- Section Hero avec les cartes principales et filtres -->
        <DashboardHero
            :summary="dashboardData.summary"
            :date="dashboardData.date"
            :employees="employeesForFilter"
            :all-employees="dashboardData.employees"
            :active-start-date="activeFilters.startDate"
            :active-end-date="activeFilters.endDate"
            :active-view-mode="activeFilters.viewMode"
            @filter-change="handleFilterChange"
        />

        <!-- Section Statistiques : mode normal uniquement (vue jour) -->
        <div v-if="!shouldShowAnalytics" class="stats-section">
          <DashboardStats
              :summary="dashboardData.summary"
              :employees="dashboardData.employees"
          />
        </div>

        <!-- Évolution et Insights (affichée automatiquement quand une période est sélectionnée) -->
        <AttendanceEvolution
            v-if="shouldShowAnalytics && filteredEmployees.length > 0"
            :employees="filteredEmployees"
            :period-label="periodLabel"
            :start-date="activeFilters.startDate"
            :end-date="activeFilters.endDate"
            @employee-click="handleEmployeeClick"
            @day-click="handleDayClick"
        />

        <!-- Grid 2 colonnes pour liste employés + pointages (affichée uniquement en mode normal) -->
        <div v-if="!shouldShowAnalytics" class="bottom-grid">
          <!-- Colonne gauche : Liste des employés -->
          <div class="employee-list-section">
            <EmployeeList
                :employees="displayedEmployees"
                @employee-click="handleEmployeeClick"
                @memo-click="handleMemoClick"
            />
          </div>

          <!-- Colonne droite : Pointages -->
          <div class="pointage-section">
            <EmployeeViewPointage
                :employees="displayedEmployees"
                :selectedEmployee="selectedEmployee as any"
                @employee-click="handleEmployeeClick"
                @close="closeEmployeePanel"
            />
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, onUnmounted} from 'vue';
import { useUserStore } from '@/stores/userStore';
import UserService from '../../service/UserService';
import DashboardHero from '../dashboard/dashboardHero.vue';
import DashboardStats from '../dashboard/dashboardStats.vue';
import EmployeeList from '../dashboard/employeeList.vue';
import EmployeeViewPointage from '../dashboard/employeeViewPointage.vue';
import Header from '../components/header.vue';
import Footer from '../components/footer.vue';
import AttendanceEvolution from '../dashboard/attendanceEvolution.vue';
import type {
  DashboardData,
  TransformedEmployee,
} from '@/service/UserService';
import HeadBuilder from "@/utils/HeadBuilder";
import statsCss from "../../assets/css/toke-dMain-04.css?url"

// Interface pour les employés dans le filtre (DashboardHero)
interface EmployeeForFilter {
  id: string | number;
  name: string;
}

// Store et états
const userStore = useUserStore();
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const dashboardData = ref<DashboardData | null>(null);

// ✅ FIX: Typer correctement selectedEmployee
const selectedEmployee = ref<TransformedEmployee | null>(null);

// Filtres actifs
const activeFilters = ref({
  startDate: '',
  endDate: '',
  employeeId: '',
  period: 'day',
  viewMode: 'normal' as 'normal' | 'analytics'
});

// Flag pour savoir si on a appliqué des filtres
const hasAppliedFilters = ref(false);

// Transformer les employés pour le filtre avec la propriété 'id'
const employeesForFilter = computed<EmployeeForFilter[]>(() => {
  if (!dashboardData.value) return [];

  return dashboardData.value.employees.map(emp => ({
    id: emp.guid,
    name: emp.name
  }));
});

// Tous les employés (pour les filtres)
const allEmployees = computed(() => {
  return dashboardData.value?.employees || [];
});

// Employés filtrés selon le filtre d'employé sélectionné
const displayedEmployees = computed(() => {
  if (!dashboardData.value) return [];

  if (activeFilters.value.employeeId) {
    return dashboardData.value.employees.filter(
        emp => String(emp.guid) === String(activeFilters.value.employeeId)
    );
  }

  return dashboardData.value.employees;
});

// Employés pour l'évolution (peut être différent si on veut tout afficher)
const filteredEmployees = computed(() => {
  return displayedEmployees.value;
});

// Vérifier si on doit afficher l'évolution et les insights
const shouldShowAnalytics = computed(() => {
  return activeFilters.value.viewMode === 'analytics'
});

// Label de la période pour l'évolution
const periodLabel = computed(() => {
  const period = activeFilters.value.period;

  if (period === 'custom') {
    const start = new Date(activeFilters.value.startDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
    const end = new Date(activeFilters.value.endDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
    return `du ${start} au ${end}`;
  }

  const labels: Record<string, string> = {
    day: 'du jour',
    week: 'de la semaine',
    month: 'du mois'
  };

  return labels[period] || 'de la période sélectionnée';
});

/**
 * Gère le changement de filtres depuis le Hero
 */
const handleFilterChange = async (filters: {
  startDate: string;
  endDate: string;
  employeeId: string | number | '';
  period: string;
  viewMode: 'normal' | 'analytics';
}) => {
  console.log('🔄 Filtres appliqués:', filters);
  console.log('📊 Mode vue:', filters.viewMode === 'analytics' ? 'Évolution (période)' : 'Normal (jour)');

  activeFilters.value = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    employeeId: String(filters.employeeId),
    period: filters.period,
    viewMode: filters.viewMode
  };

  hasAppliedFilters.value = true;

  // Recharger dans tous les cas : analytics (période custom) ou normal (retour au jour)
  if (filters.viewMode === 'analytics') {
    console.log('🔄 Rechargement des données pour la période...');
    await loadDashboardData(filters.startDate, filters.endDate);
  } else {
    console.log('📅 Retour mode jour - rechargement avec la date du jour');
    await loadDashboardData(filters.startDate, filters.endDate);
  }
};

/**
 * Charge toutes les données du dashboard
 */
const loadDashboardData = async (startDate?: string, endDate?: string) => {
  try {
    loading.value = true;
    error.value = null;

    if (!userStore.user?.guid) {
      throw new Error('Utilisateur non connecté');
    }

    console.log('🔄 Chargement des données du dashboard pour:', userStore.user.guid);

    const data = await UserService.getDashboardData(
        userStore.user.guid,
        startDate,
        endDate
    );

    dashboardData.value = data;

    console.log('✅ Dashboard chargé avec succès:', {
      totalEmployees: data.employees.length,
      present: data.presentEmployees.length,
      absent: data.absentEmployees.length,
      late: data.lateEmployees.length,
      period: `${data.period.start} - ${data.period.end}`
    });
  } catch (err: any) {
    console.error('❌ Erreur lors du chargement du dashboard:', err);
    error.value = err.message || 'Impossible de charger les données du dashboard';
  } finally {
    loading.value = false;
  }
};

const handleRetryClick = () => {
  loadDashboardData();
};

/**
 * ✅ FIX: S'assurer que l'employé sélectionné a le bon type
 */
const handleEmployeeClick = (employee: TransformedEmployee) => {
  console.log('👤 Employé sélectionné:', employee.name);
  // Vérifier que l'employé a toutes les propriétés requises
  selectedEmployee.value = employee;
};

/**
 * Gère le clic sur un jour critique
 */
const handleDayClick = (date: string) => {
  console.log('📅 Jour critique cliqué:', date);
};

/**
 * Gère le clic sur le bouton mémo
 */
const handleMemoClick = (employee: TransformedEmployee) => {
  console.log('📝 Mémo pour:', employee.name);
};

/**
 * Ferme le panel de détails d'employé
 */
const closeEmployeePanel = () => {
  selectedEmployee.value = null;
};

/**
 * Rafraîchit les données du dashboard
 */
const refreshDashboard = () => {
  loadDashboardData(
      activeFilters.value.startDate || undefined,
      activeFilters.value.endDate || undefined
  );
};

let refreshInterval: number | undefined;

onMounted(() => {
  loadDashboardData();

  refreshInterval = window.setInterval(() => {
    refreshDashboard();
  }, 5 * 60 * 1000);
  HeadBuilder.apply({
    title: 'Analystics - Toké',
    css: [statsCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

defineExpose({
  refreshDashboard,
});
</script>

<style scoped>

</style>