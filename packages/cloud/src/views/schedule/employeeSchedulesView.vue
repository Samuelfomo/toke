<template>
  <div class="employee-schedule-page">
    <!-- Header avec informations employé -->
    <div class="page-header">
      <button @click="goBack" class="back-btn">
        <span class="icon">←</span>
        <span>Retour</span>
      </button>

      <div v-if="employeeInfo" class="employee-header">
        <div class="employee-avatar">
          <img
              v-if="employeeInfo.avatar_url"
              :src="employeeInfo.avatar_url"
              alt="Avatar"
          />
          <div v-else class="avatar-placeholder">
            {{ getInitials(employeeInfo) }}
          </div>
        </div>

        <div class="employee-info">
          <h1>{{ employeeInfo.first_name }} {{ employeeInfo.last_name }}</h1>
          <p class="job-info">
            {{ employeeInfo.job_title }} • {{ employeeInfo.department }}
          </p>
          <p class="employee-code">Matricule: {{ employeeInfo.employee_code }}</p>
        </div>
      </div>

      <!-- Skeleton header si employeeInfo pas encore chargé mais loading en cours -->
      <div v-else-if="loading" class="employee-header skeleton-header">
        <div class="avatar-placeholder skeleton-box"></div>
        <div class="skeleton-info">
          <div class="skeleton-line skeleton-name"></div>
          <div class="skeleton-line skeleton-sub"></div>
        </div>
      </div>
    </div>

    <!-- Loading global -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des emplois du temps...</p>
    </div>

    <!-- Erreur globale -->
    <div v-else-if="error.global" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error.global }}</p>
      <button @click="loadEmployeeSchedules" class="retry-btn">Réessayer</button>
    </div>

    <!-- Contenu principal -->
    <div v-else class="page-content">

      <!-- Alertes d'erreurs partielles (schedules ou rotations ont échoué, mais pas les deux) -->
      <div v-if="error.schedules" class="partial-error-banner">
        ⚠️ Impossible de charger les emplois du temps fixes. <button @click="reloadSchedules">Réessayer</button>
      </div>
      <div v-if="error.rotations" class="partial-error-banner">
        ⚠️ Impossible de charger les rotations. <button @click="reloadRotations">Réessayer</button>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <button
            :class="['tab-btn', { active: activeTab === 'schedules' }]"
            @click="activeTab = 'schedules'"
        >
          <span class="tab-icon">📅</span>
          <span>Emplois du temps fixes</span>
          <span v-if="scheduleAssignments.length > 0" class="tab-badge">
            {{ scheduleAssignments.length }}
          </span>
        </button>

        <button
            :class="['tab-btn', { active: activeTab === 'rotations' }]"
            @click="activeTab = 'rotations'"
        >
          <span class="tab-icon">🔄</span>
          <span>Rotations</span>
          <span v-if="rotationAssignments.length > 0" class="tab-badge">
            {{ rotationAssignments.length }}
          </span>
        </button>
      </div>

      <!-- Emplois du temps fixes -->
      <div v-show="activeTab === 'schedules'" class="schedules-section">
        <div v-if="scheduleAssignments.length === 0" class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>Aucun emploi du temps fixe</h3>
          <p>Cet employé n'a pas d'emploi du temps fixe assigné</p>
        </div>

        <div v-else class="assignments-grid">
          <div
              v-for="assignment in sortedScheduleAssignments"
              :key="assignment.guid"
              class="assignment-card"
              :class="{ active: isAssignmentActive(assignment) }"
          >
            <div class="card-header">
              <div class="assignment-status">
                <span
                    class="status-badge"
                    :class="getAssignmentStatusClass(assignment)"
                >
                  {{ getAssignmentStatus(assignment) }}
                </span>
              </div>
              <div class="assignment-actions">
                <button
                    @click="viewScheduleDetails(assignment)"
                    class="action-btn view"
                    title="Voir les détails"
                >
                  👁️
                </button>
              </div>
            </div>

            <div class="card-body">
              <div class="template-info">
                <h3 class="template-name">
                  {{ assignment.session_template.name }}
                </h3>
                <p class="template-description">Emploi du temps fixe</p>
              </div>

              <div class="date-range">
                <div class="date-item">
                  <span class="date-label">Début:</span>
                  <span class="date-value">{{ formatDate(assignment.start_date) }}</span>
                </div>
                <div class="date-item">
                  <span class="date-label">Fin:</span>
                  <span class="date-value">{{ formatDate(assignment.end_date) }}</span>
                </div>
                <div class="date-item duration">
                  <span class="date-label">Durée:</span>
                  <span class="date-value">{{ calculateDuration(assignment.start_date, assignment.end_date) }}</span>
                </div>
              </div>

              <div v-if="assignment.reason" class="assignment-reason">
                <span class="reason-label">Raison:</span>
                <p class="reason-text">{{ assignment.reason }}</p>
              </div>

              <div class="assignment-meta">
                <div class="meta-item">
                  <span class="meta-label">Créé par:</span>
                  <span class="meta-value">
                    {{ assignment.created_by.first_name }} {{ assignment.created_by.last_name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rotations -->
      <div v-show="activeTab === 'rotations'" class="rotations-section">
        <div v-if="rotationAssignments.length === 0" class="empty-state">
          <div class="empty-icon">🔄</div>
          <h3>Aucune rotation</h3>
          <p>Cet employé n'est pas assigné à une rotation</p>
        </div>

        <div v-else class="assignments-grid">
          <div
              v-for="assignment in rotationAssignments"
              :key="assignment.guid"
              class="assignment-card rotation"
          >
            <div class="card-header">
              <div class="assignment-status">
                <span class="status-badge status-active">Active</span>
              </div>
              <div class="assignment-actions">
                <button
                    @click="viewRotationDetails(assignment)"
                    class="action-btn view"
                    title="Voir les détails"
                >
                  👁️
                </button>
              </div>
            </div>

            <div class="card-body">
              <div class="template-info">
                <h3 class="template-name">
                  {{ assignment.rotation_group.name }}
                </h3>
                <p class="template-description">Rotation cyclique</p>
              </div>

              <div class="rotation-info">
                <div class="info-item">
                  <span class="info-label">Cycle:</span>
                  <span class="info-value">
                    {{ assignment.rotation_group.cycle_length }}
                    {{ assignment.rotation_group.cycle_unit === 'day' ? 'jour(s)' : 'semaine(s)' }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Décalage:</span>
                  <span class="info-value">Jour {{ assignment.offset + 1 }} du cycle</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date de début:</span>
                  <span class="info-value">{{ formatDate(assignment.rotation_group.start_date) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Assigné le:</span>
                  <span class="info-value">{{ formatDate(assignment.assigned_at) }}</span>
                </div>
              </div>

              <div class="rotation-templates">
                <div class="templates-header">
                  <span class="templates-label">Templates du cycle:</span>
                  <span class="templates-count">
                    {{ assignment.rotation_group.cycle_templates.length }} template(s)
                  </span>
                </div>
                <div class="templates-list">
                  <div
                      v-for="(template, index) in assignment.rotation_group.cycle_templates"
                      :key="template.guid"
                      class="template-chip"
                  >
                    <span class="chip-number">J{{ index + 1 }}</span>
                    <span class="chip-name">{{ template.name }}</span>
                  </div>
                </div>
              </div>

              <div class="assignment-meta">
                <div class="meta-item">
                  <span class="meta-label">Assigné par:</span>
                  <span class="meta-value">
                    {{ assignment.assigned_by.first_name }} {{ assignment.assigned_by.last_name }}
                  </span>
                </div>
              </div>
            </div>
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
import ScheduleAssignmentService, {
  type ScheduleAssignment,
} from '@/service/scheduleAssignmentService';
import RotationAssignmentService, {
  type RotationAssignment,
} from '@/service/rotationAssignmentService';


/* =======================
   Types
======================= */

interface Employee {
  guid: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  employee_code: string;
  avatar_url?: string;
}

interface ErrorState {
  global: string;
  schedules: string;
  rotations: string;
}

/* =======================
   Setup
======================= */

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// L'identifiant de l'employé vient de l'URL (ex: /employees/:id/schedules)
const employeeGuid = route.params.id as string;

/* =======================
   État réactif
======================= */

const loading = ref(true);
const error = ref<ErrorState>({ global: '', schedules: '', rotations: '' });
const activeTab = ref<'schedules' | 'rotations'>('schedules');
const scheduleAssignments = ref<ScheduleAssignment[]>([]);
const rotationAssignments = ref<RotationAssignment[]>([]);
const employeeInfo = ref<Employee | null>(null);

/* =======================
   Computed
======================= */

const sortedScheduleAssignments = computed(() =>
    [...scheduleAssignments.value].sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    )
);

/* =======================
   Chargement des données
======================= */

/**
 * Charge en parallèle : le profil employé, ses emplois du temps fixes, et ses rotations.
 * Chaque source est indépendante : un échec partiel n'empêche pas l'affichage des autres.
 */
const loadEmployeeSchedules = async () => {
  loading.value = true;
  error.value = { global: '', schedules: '', rotations: '' };

  try {
    // Chargement en parallèle des schedules et rotations
    const [scheduleResult, rotationResult] = await Promise.allSettled([
      ScheduleAssignmentService.getUserAssignments(employeeGuid),
      RotationAssignmentService.getUserAssignments(employeeGuid),
    ]);

    // Emplois du temps fixes
    if (scheduleResult.status === 'fulfilled' && scheduleResult.value?.success) {
      scheduleAssignments.value = scheduleResult.value.data ?? [];
    } else {
      error.value.schedules = 'Impossible de charger les emplois du temps fixes.';
    }

    // Rotations
    if (rotationResult.status === 'fulfilled' && rotationResult.value?.success) {
      rotationAssignments.value = rotationResult.value.data ?? [];
    } else {
      error.value.rotations = 'Impossible de charger les rotations.';
    }

    // Extraction du profil employé depuis les données reçues
    // Priorité : schedules → rotations
    if (scheduleAssignments.value.length > 0 && scheduleAssignments.value[0].user) {
      employeeInfo.value = scheduleAssignments.value[0].user as Employee;
    } else if (rotationAssignments.value.length > 0 && rotationAssignments.value[0].user) {
      employeeInfo.value = rotationAssignments.value[0].user as Employee;
    }

    // Si aucune assignation ne contient le profil, c'est une erreur bloquante
    if (!employeeInfo.value) {
      error.value.global = "Aucune donnée trouvée pour cet employé.";
    }

  } catch (err: any) {
    console.error('Erreur inattendue lors du chargement:', err);
    error.value.global = err.message || 'Une erreur inattendue est survenue.';
  } finally {
    loading.value = false;
  }
};

/** Recharge uniquement les emplois du temps fixes (après une erreur partielle) */
const reloadSchedules = async () => {
  error.value.schedules = '';
  try {
    const response = await ScheduleAssignmentService.getUserAssignments(employeeGuid);
    if (response?.success) {
      scheduleAssignments.value = response.data ?? [];
    } else {
      error.value.schedules = 'Impossible de charger les emplois du temps fixes.';
    }
  } catch {
    error.value.schedules = 'Erreur lors du rechargement.';
  }
};

/** Recharge uniquement les rotations (après une erreur partielle) */
const reloadRotations = async () => {
  error.value.rotations = '';
  try {
    const response = await RotationAssignmentService.getUserAssignments(employeeGuid);
    if (response?.success) {
      rotationAssignments.value = response.data ?? [];
    } else {
      error.value.rotations = 'Impossible de charger les rotations.';
    }
  } catch {
    error.value.rotations = 'Erreur lors du rechargement.';
  }
};

/* =======================
   Helpers — statuts
======================= */

const isAssignmentActive = (assignment: ScheduleAssignment): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(assignment.start_date);
  const endDate = new Date(assignment.end_date);
  return assignment.active && today >= startDate && today <= endDate;
};

const getAssignmentStatus = (assignment: ScheduleAssignment): string => {
  if (!assignment.active) return 'Inactif';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(assignment.start_date);
  const endDate = new Date(assignment.end_date);
  if (today < startDate) return 'À venir';
  if (today > endDate) return 'Terminé';
  return 'Actif';
};

const getAssignmentStatusClass = (assignment: ScheduleAssignment): string => {
  const statusMap: Record<string, string> = {
    'Actif': 'status-active',
    'À venir': 'status-upcoming',
    'Terminé': 'status-ended',
    'Inactif': 'status-inactive',
  };
  return statusMap[getAssignmentStatus(assignment)] ?? '';
};

/* =======================
   Helpers — formatage
======================= */

const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

const calculateDuration = (startDate: string, endDate: string): string => {
  const diffDays = Math.ceil(
      Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  if (diffDays < 7) return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) { const w = Math.floor(diffDays / 7); return `${w} semaine${w > 1 ? 's' : ''}`; }
  if (diffDays < 365) { const m = Math.floor(diffDays / 30); return `${m} mois`; }
  const y = Math.floor(diffDays / 365);
  return `${y} an${y > 1 ? 's' : ''}`;
};

const getInitials = (user: Employee): string => {
  const first = user.first_name?.charAt(0) ?? '';
  const last = user.last_name?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
};

/* =======================
   Helpers — navigation
======================= */

const viewScheduleDetails = (assignment: ScheduleAssignment) => {
  // Adapter selon ta configuration de routes
  // router.push({ name: 'scheduleDetails', params: { id: assignment.guid } });
  console.log('Voir détails emploi du temps:', assignment);
};

const viewRotationDetails = (assignment: RotationAssignment) => {
  // router.push({ name: 'rotationDetails', params: { id: assignment.guid } });
  console.log('Voir détails rotation:', assignment);
};

const goBack = () => router.back();

/* =======================
   Lifecycle
======================= */

onMounted(() => {
  if (userStore.checkSession()) {
    loadEmployeeSchedules();
  } else {
    error.value.global = 'Session expirée. Veuillez vous reconnecter.';
    loading.value = false;
  }
});
</script>

<style scoped>
.employee-schedule-page {
  min-height: 100vh;
  background: #f7fafc;
  padding: 20px;
}

/* ========================
   Header
======================== */
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

.employee-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.employee-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: white;
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

/* ========================
   Skeleton loader (header)
======================== */
.skeleton-header {
  align-items: center;
}

.skeleton-box {
  background: linear-gradient(90deg, #e2e8f0 25%, #edf2f7 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e2e8f0 25%, #edf2f7 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-name {
  width: 220px;
  height: 22px;
}

.skeleton-sub {
  width: 150px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ========================
   États globaux
======================== */
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
  to { transform: rotate(360deg); }
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
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #5a67d8;
}

/* ========================
   Bannières d'erreur partielle
======================== */
.partial-error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  color: #c53030;
  font-size: 14px;
  margin-bottom: 16px;
}

.partial-error-banner button {
  background: none;
  border: 1px solid #c53030;
  border-radius: 6px;
  color: #c53030;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.partial-error-banner button:hover {
  background: #c53030;
  color: white;
}

/* ========================
   Tabs
======================== */
.tabs-container {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.tab-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
}

/* ========================
   Empty state
======================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #718096;
}

/* ========================
   Grille de cards
======================== */
.assignments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.assignment-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid #e2e8f0;
  transition: all 0.2s;
}

.assignment-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.assignment-card.active {
  border-color: #48bb78;
  background: linear-gradient(135deg, #ffffff 0%, #f0fff4 100%);
}

.assignment-card.rotation {
  border-color: #4299e1;
}

/* ========================
   Card header
======================== */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active   { background: #c6f6d5; color: #22543d; }
.status-upcoming { background: #bee3f8; color: #2c5282; }
.status-ended    { background: #e2e8f0; color: #4a5568; }
.status-inactive { background: #fed7d7; color: #742a2a; }

.assignment-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

/* ========================
   Card body
======================== */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-name {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.template-description {
  margin: 0;
  font-size: 13px;
  color: #718096;
}

.date-range {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
}

.date-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.date-item.duration {
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}

.date-label, .info-label { color: #718096; font-weight: 500; }
.date-value, .info-value { color: #1a202c; font-weight: 600; }

.assignment-reason {
  padding: 12px;
  background: #fffaf0;
  border-left: 3px solid #ed8936;
  border-radius: 4px;
}

.reason-label {
  font-size: 12px;
  font-weight: 600;
  color: #7c2d12;
  text-transform: uppercase;
}

.reason-text {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #744210;
}

.assignment-meta {
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.meta-label { color: #718096; }
.meta-value { color: #4a5568; font-weight: 500; }

/* ========================
   Rotation spécifique
======================== */
.rotation-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #ebf8ff;
  border-radius: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label { color: #2c5282; }

.rotation-templates {
  padding: 12px;
  background: #f7fafc;
  border-radius: 8px;
}

.templates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.templates-label {
  font-size: 13px;
  font-weight: 600;
  color: #4a5568;
}

.templates-count {
  font-size: 12px;
  color: #718096;
}

.templates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 12px;
}

.chip-number {
  font-weight: 700;
  color: #4299e1;
}

.chip-name { color: #4a5568; }

/* ========================
   Responsive
======================== */
@media (max-width: 768px) {
  .assignments-grid {
    grid-template-columns: 1fr;
  }

  .tabs-container {
    flex-direction: column;
  }

  .employee-info h1 {
    font-size: 20px;
  }
}
</style>