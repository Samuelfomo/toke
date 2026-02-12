<template>
  <div class="employee-attendance-history-page">
    <!-- Header avec informations employé -->
    <div v-if="attendanceHistory" class="page-header">
      <button @click="goBack" class="back-btn">
        <span class="icon">←</span>
        <span>Retour</span>
      </button>

      <div class="employee-header">
        <div class="employee-avatar">
          <div v-if="attendanceHistory.employee.avatar_url" class="avatar">
            <img :src="attendanceHistory.employee.avatar_url" alt="Avatar" />
          </div>
          <div v-else class="avatar-placeholder">
            {{ getInitials() }}
          </div>
        </div>

        <div class="employee-info">
          <h1>
            {{ attendanceHistory.employee.first_name }}
            {{ attendanceHistory.employee.last_name }}
          </h1>
          <p class="job-info">
            {{ attendanceHistory.employee.job_title }} • {{ attendanceHistory.employee.department }}
          </p>
          <p class="employee-code">Matricule: {{ attendanceHistory.employee.employee_code }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement de l'historique des pointages...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="loadData" class="retry-btn">Réessayer</button>
    </div>

    <!-- Content -->
    <div v-if="attendanceHistory" class="page-content">
      <!-- Filtres et contrôles -->
      <div class="controls-bar">
        <div class="period-selector">
          <label>Période:</label>
          <select v-model="selectedPeriod" @change="onPeriodChange">
            <option value="1">Dernier mois</option>
            <option value="3">3 derniers mois</option>
            <option value="6">6 derniers mois</option>
            <option value="12">Dernière année</option>
            <option value="custom">Personnalisée</option>
          </select>
        </div>

        <div v-if="selectedPeriod === 'custom'" class="custom-dates">
          <input
              v-model="customStartDate"
              type="date"
              class="date-input"
              @change="onCustomDateChange"
          />
          <span>à</span>
          <input
              v-model="customEndDate"
              type="date"
              class="date-input"
              @change="onCustomDateChange"
          />
        </div>

        <div class="view-toggle">
          <button
              :class="['toggle-btn', { active: viewMode === 'list' }]"
              @click="viewMode = 'list'"
          >
            📋 Liste complète
          </button>
        </div>
      </div>

      <!-- Statistiques globales -->
      <div class="global-stats-section">
        <h2>Statistiques sur la période</h2>
        <p class="period-info">
          Du {{ formatDate(attendanceHistory.period.start) }} au
          {{ formatDate(attendanceHistory.period.end) }}
          ({{ attendanceHistory.period.total_days }} jours)
        </p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ attendanceHistory.globalStats.present_days }}</div>
              <div class="stat-label">Jours présents</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-value">{{ attendanceHistory.globalStats.late_days }}</div>
              <div class="stat-label">Retards</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">❌</div>
            <div class="stat-content">
              <div class="stat-value">{{ attendanceHistory.globalStats.absent_days }}</div>
              <div class="stat-label">Absences</div>
            </div>
          </div>

<!--          <div class="stat-card">-->
<!--            <div class="stat-icon">🏖️</div>-->
<!--            <div class="stat-content">-->
<!--              <div class="stat-value">{{ attendanceHistory.globalStats.off_days }}</div>-->
<!--              <div class="stat-label">Jours de repos</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="stat-card">-->
<!--            <div class="stat-icon">⏱️</div>-->
<!--            <div class="stat-content">-->
<!--              <div class="stat-value">-->
<!--                {{ formatMinutes(attendanceHistory.globalStats.total_delay_minutes) }}-->
<!--              </div>-->
<!--              <div class="stat-label">Retard total</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="stat-card">-->
<!--            <div class="stat-icon">🕐</div>-->
<!--            <div class="stat-content">-->
<!--              <div class="stat-value">-->
<!--                {{ Math.round(attendanceHistory.globalStats.total_work_hours) }}h-->
<!--              </div>-->
<!--              <div class="stat-label">Heures travaillées</div>-->
<!--            </div>-->
<!--          </div>-->

<!--          <div class="stat-card highlight">-->
<!--            <div class="stat-icon">🔥</div>-->
<!--            <div class="stat-content">-->
<!--              <div class="stat-value">-->
<!--                {{ attendanceHistory.globalStats.consecutive_present_days }}-->
<!--              </div>-->
<!--              <div class="stat-label">Meilleure série de présence</div>-->
<!--            </div>-->
<!--          </div>-->

          <div class="stat-card highlight">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ calculateAttendanceRate() }}%</div>
              <div class="stat-label">Taux de présence global</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vue par mois -->
      <div v-if="viewMode === 'monthly'" class="monthly-view">
        <div
            v-for="(month, monthKey) in sortedMonths"
            :key="monthKey"
            class="month-section"
        >
          <div class="month-header">
            <h3>{{ formatMonthLabel(month) }}</h3> <!-- Utilisez month, pas monthKey -->
            <span class="month-count">
      {{ attendanceHistory.attendanceByMonth[month].length }} jours <!-- Utilisez month -->
    </span>
          </div>

          <!-- Statistiques mensuelles -->
          <div v-if="attendanceHistory.monthlyStats[monthKey]" class="month-stats">
            <div class="month-stat">
              <span class="stat-label">Présence:</span>
              <span class="stat-value success">
                {{ attendanceHistory.monthlyStats[monthKey].present_days }} jours
              </span>
            </div>
            <div class="month-stat">
              <span class="stat-label">Retards:</span>
              <span class="stat-value warning">
                {{ attendanceHistory.monthlyStats[monthKey].late_days }} jours
              </span>
            </div>
            <div class="month-stat">
              <span class="stat-label">Absences:</span>
              <span class="stat-value danger">
                {{ attendanceHistory.monthlyStats[monthKey].absent_days }} jours
              </span>
            </div>
            <div class="month-stat">
              <span class="stat-label">Taux de présence:</span>
              <span class="stat-value">
                {{ Math.round(attendanceHistory.monthlyStats[monthKey].attendance_rate) }}%
              </span>
            </div>
          </div>

          <!-- Liste des pointages du mois -->
          <div class="attendance-list">
            <div
                v-for="detail in attendanceHistory.attendanceByMonth[month]"
                :key="detail.date"
                class="attendance-card"
                :class="`status-${detail.status}`"
            >
              <div class="card-header">
                <div class="date-info">
                  <span class="day-name">{{ formatDayOfWeek(detail.date) }}</span>
                  <span class="date-label">{{ formatShortDate(detail.date) }}</span>
                </div>
                <span class="status-badge" :class="`badge-${detail.status}`">
                  {{ getStatusText(detail.status) }}
                </span>
              </div>

              <div class="card-body">
                <div class="time-info">
                  <div class="time-row">
                    <span class="time-label">Heure prévue:</span>
                    <span class="time-value">{{ detail.expected_time || '—' }}</span>
                  </div>

                  <div v-if="detail.clock_in_time" class="time-row">
                    <span class="time-label">Arrivée:</span>
                    <span class="time-value">{{ detail.clock_in_time }}</span>
                  </div>

                  <div v-if="detail.clock_out_time" class="time-row">
                    <span class="time-label">Départ:</span>
                    <span class="time-value">{{ detail.clock_out_time }}</span>
                  </div>

                  <div v-if="detail.delay_minutes && detail.delay_minutes > 0" class="time-row delay">
                    <span class="time-label">Retard:</span>
                    <span class="time-value">{{ formatMinutes(detail.delay_minutes) }}</span>
                  </div>

                  <div v-if="detail.work_hours" class="time-row">
                    <span class="time-label">Heures travaillées:</span>
                    <span class="time-value">{{ detail.work_hours }}h</span>
                  </div>

                  <!-- Informations pause/mission -->
                  <div v-if="detail.pause_start_time" class="time-row info">
                    <span class="time-label">Pause:</span>
                    <span class="time-value">
                      {{ detail.pause_start_time }}
                      <template v-if="detail.pause_end_time">
                        - {{ detail.pause_end_time }}
                      </template>
                    </span>
                  </div>

                  <div v-if="detail.mission_start_time" class="time-row info">
                    <span class="time-label">Mission:</span>
                    <span class="time-value">
                      {{ detail.mission_start_time }}
                      <template v-if="detail.mission_end_time">
                        - {{ detail.mission_end_time }}
                      </template>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vue liste complète -->
      <div v-else class="list-view">
        <div class="list-header">
          <h2>Liste complète des pointages</h2>
          <button @click="exportToCSV" class="export-btn">
            📥 Exporter en CSV
          </button>
        </div>

        <div class="attendance-table">
          <div class="table-header">
            <div class="col-date">Date</div>
            <div class="col-status">Statut</div>
            <div class="col-time">Heure prévue</div>
            <div class="col-time">Arrivée</div>
            <div class="col-time">Départ</div>
            <div class="col-delay">Retard</div>
            <div class="col-hours">Heures</div>
          </div>

          <div
              v-for="detail in attendanceHistory.allDailyDetails"
              :key="detail.date"
              class="table-row"
              :class="`status-${detail.status}`"
          >
            <div class="col-date">
              <span class="date-full">{{ formatFullDate(detail.date) }}</span>
            </div>
            <div class="col-status">
              <span class="status-badge" :class="`badge-${detail.status}`">
                {{ getStatusText(detail.status) }}
              </span>
            </div>
            <div class="col-time">{{ detail.expected_time || '—' }}</div>
            <div class="col-time">{{ detail.clock_in_time || '—' }}</div>
            <div class="col-time">{{ detail.clock_out_time || '—' }}</div>
            <div class="col-delay">
              <span v-if="detail.delay_minutes" class="delay-value">
                {{ formatMinutes(detail.delay_minutes) }}
              </span>
              <span v-else>—</span>
            </div>
            <div class="col-hours">{{ detail.work_hours || '—' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import UserService from '@/service/UserService';
import type { EmployeeAttendanceHistory } from '@/utils/interfaces/attendance.interface';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// Props depuis la route
const employeeGuid = route.params.id as string;

// État
const attendanceHistory = ref<EmployeeAttendanceHistory | null>(null);
const loading = ref(true);
const error = ref('');
const selectedPeriod = ref('6'); // 6 mois par défaut
const customStartDate = ref('');
const customEndDate = ref('');
const viewMode = ref<'monthly' | 'list'>('monthly');

// Computed - Récupération du GUID du manager depuis le store
const managerGuid = computed(() => {
  return userStore.user?.guid || '';
});

// Vérifier si l'utilisateur est connecté
const isUserAuthenticated = computed(() => {
  return userStore.isAuthenticated && !!managerGuid.value;
});

const sortedMonths = computed(() => {
  if (!attendanceHistory.value) return [];

  return Object.keys(attendanceHistory.value.attendanceByMonth).sort((a, b) => {
    return b.localeCompare(a); // Ordre décroissant (plus récent en premier)
  });
});

// Méthodes
const loadData = async () => {
  // Vérifier l'authentification
  if (!isUserAuthenticated.value) {
    error.value = 'Vous devez être connecté pour voir cette page';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    if (selectedPeriod.value === 'custom' && customStartDate.value && customEndDate.value) {
      attendanceHistory.value = await UserService.getEmployeeAttendanceByDateRange(
          managerGuid.value,
          employeeGuid,
          customStartDate.value,
          customEndDate.value
      );
    } else {
      const months = parseInt(selectedPeriod.value);
      attendanceHistory.value = await UserService.getEmployeeAttendanceHistory(
          managerGuid.value,
          employeeGuid,
          months
      );
    }
  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement des données';
  } finally {
    loading.value = false;
  }
};

const onPeriodChange = () => {
  if (selectedPeriod.value !== 'custom') {
    loadData();
  }
};

const onCustomDateChange = () => {
  if (customStartDate.value && customEndDate.value) {
    loadData();
  }
};

const goBack = () => {
  router.back();
};

const getInitials = (): string => {
  if (!attendanceHistory.value) return '';
  const first = attendanceHistory.value.employee.first_name.charAt(0);
  const last = attendanceHistory.value.employee.last_name.charAt(0);
  return `${first}${last}`.toUpperCase();
};

const calculateAttendanceRate = (): number => {
  if (!attendanceHistory.value) return 0;
  const stats = attendanceHistory.value.globalStats;
  const workDays = stats.total_days - stats.off_days;
  if (workDays === 0) return 0;
  return Math.round(((stats.present_days + stats.late_days) / workDays) * 100);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatFullDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short'
  });
};

const formatDayOfWeek = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'short'
  });
};

const formatMonthLabel = (monthKey: string): string => {
  return UserService.formatMonthLabel(monthKey);
};

const formatMinutes = (minutes: number): string => {
  return UserService.formatMinutesToText(minutes);
};

const getStatusText = (status: string): string => {
  return UserService.getStatusLabel(status);
};

// const exportToCSV = () => {
//   if (!attendanceHistory.value) return;
//
//   // const csv = UserService.exportToCSV(attendanceHistory.value);
//   // const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//   // const url = URL.createObjectURL(blob);
//   const link = document.createElement('a');
//   link.href = url;
//   link.download = `pointages_${attendanceHistory.value.employee.employee_code}_${Date.now()}.csv`;
//   link.click();
//   URL.revokeObjectURL(url);
// };

// Lifecycle
onMounted(() => {
  // Vérifier la session avant de charger les données
  if (userStore.checkSession()) {
    loadData();
  } else {
    error.value = 'Session expirée. Veuillez vous reconnecter.';
    loading.value = false;
    // Optionnel: rediriger vers la page de connexion
    // router.push('/login');
  }
});
</script>

<style scoped>
/* Reprise du CSS existant - identique à la version précédente */
.employee-attendance-history-page {
  min-height: 100vh;
  background: #f7fafc;
  padding: 20px;
}

/* Header */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 20px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.employee-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.employee-avatar .avatar,
.employee-avatar .avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: white;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.employee-info h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #1a202c;
}

.job-info {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #4a5568;
}

.employee-code {
  margin: 0;
  font-size: 14px;
  color: #718096;
}

/* États */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state p {
  color: #e53e3e;
  margin-bottom: 8px;
}

.retry-btn {
  margin-top: 16px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

/* Contrôles */
.controls-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.period-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.period-selector label {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.period-selector select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1a202c;
  cursor: pointer;
}

.custom-dates {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.view-toggle {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #f7fafc;
}

.toggle-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* Statistiques globales */
.global-stats-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.global-stats-section h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.period-info {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #718096;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f7fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-card.highlight {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-color: #667eea;
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #718096;
}

/* Vue par mois */
.monthly-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.month-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.month-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  text-transform: capitalize;
}

.month-count {
  font-size: 14px;
  color: #718096;
}

.month-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  padding: 16px;
  background: #f7fafc;
  border-radius: 8px;
  margin-bottom: 16px;
}

.month-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.month-stat .stat-label {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
}

.month-stat .stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

.stat-value.success {
  color: #48bb78;
}

.stat-value.warning {
  color: #ed8936;
}

.stat-value.danger {
  color: #f56565;
}

/* Liste de pointages */
.attendance-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attendance-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.attendance-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-name {
  font-size: 12px;
  color: #718096;
  text-transform: uppercase;
  font-weight: 600;
}

.date-label {
  font-size: 16px;
  color: #1a202c;
  font-weight: 600;
  text-transform: capitalize;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-present {
  background: #c6f6d5;
  color: #22543d;
}

.badge-late {
  background: #fed7aa;
  color: #7c2d12;
}

.badge-absent {
  background: #fed7d7;
  color: #742a2a;
}

.badge-off-day {
  background: #e2e8f0;
  color: #2d3748;
}

.badge-on-pause {
  background: #bee3f8;
  color: #2c5282;
}

.badge-active {
  background: #c6f6d5;
  color: #22543d;
}

.card-body {
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.time-label {
  color: #718096;
  font-weight: 500;
}

.time-value {
  color: #1a202c;
  font-weight: 600;
}

.time-row.delay .time-value {
  color: #ed8936;
}

.time-row.info .time-value {
  color: #4299e1;
}

/* Vue liste complète */
.list-view {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.export-btn {
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #5568d3;
}

.attendance-table {
  overflow-x: auto;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 200px 120px 100px 100px 100px 100px 80px;
  gap: 12px;
  padding: 12px;
  align-items: center;
}

.table-header {
  background: #f7fafc;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 8px;
}

.table-row {
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
  transition: all 0.2s;
}

.table-row:hover {
  background: #f7fafc;
}

.date-full {
  text-transform: capitalize;
}

.delay-value {
  color: #ed8936;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .controls-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .view-toggle {
    margin-left: 0;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .table-header,
  .table-row {
    grid-template-columns: repeat(7, minmax(100px, 1fr));
    overflow-x: auto;
  }
}
</style>