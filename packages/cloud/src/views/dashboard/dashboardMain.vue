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
        <button @click="loadDashboardData" class="retry-btn">
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
            :employees="allEmployees"
            :all-employees="dashboardData.employees"
            @filter-change="handleFilterChange"
        />

        <!-- Section Statistiques (affichée uniquement en mode normal - jour unique) -->
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
                :selectedEmployee="selectedEmployee"
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
import { ref, computed } from 'vue';
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

// Store et états
const userStore = useUserStore();
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const dashboardData = ref<DashboardData | null>(null);
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
// Affiche automatiquement quand viewMode === 'analytics' (période sélectionnée)
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
 * L'affichage de l'évolution se fait automatiquement selon viewMode
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

  // Marquer que des filtres ont été appliqués
  hasAppliedFilters.value = true;

  // Recharger les données uniquement si en mode analytique (période)
  if (filters.viewMode === 'analytics') {
    console.log('🔄 Rechargement des données pour la période...');
    await loadDashboardData(filters.startDate, filters.endDate);
  } else {
    console.log('📅 Mode jour - pas de rechargement nécessaire');
  }
};

/**
 * Charge toutes les données du dashboard
 */
const loadDashboardData = async (startDate?: string, endDate?: string) => {
  try {
    loading.value = true;
    error.value = null;

    // Vérifier que l'utilisateur est connecté
    if (!userStore.user?.guid) {
      throw new Error('Utilisateur non connecté');
    }

    console.log('🔄 Chargement des données du dashboard pour:', userStore.user.guid);

    // Récupérer les données via le service
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

/**
 * Gère le clic sur un employé
 */
const handleEmployeeClick = (employee: TransformedEmployee) => {
  console.log('👤 Employé sélectionné:', employee.name);
  selectedEmployee.value = employee;
};

/**
 * Gère le clic sur un jour critique
 */
const handleDayClick = (date: string) => {
  console.log('📅 Jour critique cliqué:', date);
  // Vous pouvez ajouter une logique pour filtrer par ce jour spécifique
  // ou afficher un modal avec plus de détails
};

/**
 * Gère le clic sur le bouton mémo
 */
const handleMemoClick = (employee: TransformedEmployee) => {
  console.log('📝 Mémo pour:', employee.name);
  // Implémenter la logique pour ouvrir un mémo
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

// Chargement initial
import { onMounted, onUnmounted } from 'vue';

let refreshInterval: number | undefined;

onMounted(() => {
  loadDashboardData();

  // Optionnel: rafraîchir automatiquement toutes les 5 minutes
  refreshInterval = window.setInterval(() => {
    refreshDashboard();
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Exposer les méthodes pour usage externe si nécessaire
defineExpose({
  refreshDashboard,
});
</script>

<style scoped>
/* =========================
   Layout global
========================= */

.dashboard-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: radial-gradient(circle,rgba(255, 222, 89, 1) 0%, rgba(6, 78, 171, 1) 90%);
}

/* Zone centrale */
.dashboard-main {
  flex: 1;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
}

/* =========================
   Contenu principal
========================= */

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeUp 0.4s ease-out;
}

/* Section statistiques - pleine largeur */
.stats-section {
  width: 100%;
}

/* ⬇️ Grid 2 colonnes en bas */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2 colonnes égales */
  gap: 1.5rem;
  width: 100%;
}

.employee-list-section {
  width: 100%;
}

.pointage-section {
  width: 100%;
}

/* =========================
   États Loading / Error
========================= */

.loading-state,
.error-state {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
  min-height: 420px;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-state p {
  margin-top: 1.2rem;
  font-size: 1rem;
  font-weight: 500;
  color: #64748b;
}

/* Spinner */
.spinner {
  width: 56px;
  height: 56px;
  border: 4px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

/* =========================
   Erreur
========================= */

.error-icon {
  width: 72px;
  height: 72px;
  color: #ef4444;
  margin-bottom: 1.2rem;
}

.error-state h3 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #0f172a;
}

.error-state p {
  font-size: 1rem;
  color: #64748b;
  max-width: 420px;
  text-align: center;
  margin-top: 0.5rem;
}

/* Bouton retry */
.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.6rem;
  background: #004AAD;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 1.5rem;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.35);
}

.retry-btn svg {
  width: 20px;
  height: 20px;
}

/* =========================
   Animations
========================= */

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================
   Responsive
========================= */

@media (max-width: 1200px) {
  .bottom-grid {
    grid-template-columns: 1fr; /* 1 colonne sur tablette */
  }
}

@media (max-width: 1024px) {
  .dashboard-main {
    padding: 2rem 1.5rem 3rem;
  }

  .dashboard-content {
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .dashboard-main {
    padding: 1.5rem 1rem 2.5rem;
  }

  .dashboard-content {
    gap: 1.25rem;
  }
}

@media (max-width: 480px) {
  .dashboard-main {
    padding: 1rem 0.75rem 2rem;
  }
}
</style>