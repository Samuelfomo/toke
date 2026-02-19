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
          <input v-model="customStartDate" type="date" class="date-input" @change="onCustomDateChange" />
          <span>à</span>
          <input v-model="customEndDate" type="date" class="date-input" @change="onCustomDateChange" />
        </div>

        <div class="view-toggle">
          <button :class="['toggle-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
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
          <div class="stat-card stat-present">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ attendanceHistory.globalStats.present_days }}</div>
              <div class="stat-label">Jours présents</div>
            </div>
          </div>

          <div class="stat-card stat-late">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-value">{{ attendanceHistory.globalStats.late_days }}</div>
              <div class="stat-label">Retards</div>
            </div>
          </div>

          <div class="stat-card stat-absent">
            <div class="stat-icon">❌</div>
            <div class="stat-content">
              <div class="stat-value">{{ attendanceHistory.globalStats.absent_days }}</div>
              <div class="stat-label">Absences</div>
            </div>
          </div>

          <div class="stat-card stat-rate highlight">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ calculateAttendanceRate() }}%</div>
              <div class="stat-label">Taux de présence global</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Légende statuts -->
      <div class="legend-bar">
        <span class="legend-title">Légende :</span>
        <span class="status-badge badge-present">Présent</span>
        <span class="status-badge badge-late">Retard</span>
        <span class="status-badge badge-absent">Absent</span>
        <!--        <span class="status-badge badge-off-day">Repos</span>-->
        <span class="status-badge badge-on-pause">En pause</span>
        <span class="status-badge badge-mission">Mission</span>
        <span class="status-badge badge-active">Actif</span>
      </div>

      <!-- Vue par mois -->
      <div v-if="viewMode === 'monthly'" class="monthly-view">
        <div v-for="(month, monthKey) in sortedMonths" :key="monthKey" class="month-section">
          <div class="month-header">
            <h3>{{ formatMonthLabel(month) }}</h3>
            <span class="month-count">{{ attendanceHistory.attendanceByMonth[month].length }} jours</span>
          </div>

          <div v-if="attendanceHistory.monthlyStats[monthKey]" class="month-stats">
            <div class="month-stat">
              <span class="stat-label">Présence:</span>
              <span class="stat-value success">{{ attendanceHistory.monthlyStats[monthKey].present_days }} jours</span>
            </div>
            <div class="month-stat">
              <span class="stat-label">Retards:</span>
              <span class="stat-value warning">{{ attendanceHistory.monthlyStats[monthKey].late_days }} jours</span>
            </div>
            <div class="month-stat">
              <span class="stat-label">Absences:</span>
              <span class="stat-value danger">{{ attendanceHistory.monthlyStats[monthKey].absent_days }} jours</span>
            </div>
            <div class="month-stat">
              <span class="stat-label">Taux de présence:</span>
              <span class="stat-value">{{ Math.round(attendanceHistory.monthlyStats[monthKey].attendance_rate) }}%</span>
            </div>
          </div>

          <div class="attendance-list">
            <div
                v-for="detail in attendanceHistory.attendanceByMonth[month]"
                :key="detail.date"
                class="attendance-card"
                :class="[`status-${detail.status}`, { 'row-focused': detail.date === focusDate }]"
                :data-date="detail.date"
            >
              <div class="card-header" @click="toggleRow(detail.date)">
                <div class="date-info">
                  <span class="day-name">{{ formatDayOfWeek(detail.date) }}</span>
                  <span class="date-label">{{ formatShortDate(detail.date) }}</span>
                </div>
                <div class="card-header-right">
                  <span class="status-badge" :class="`badge-${detail.status}`">
                    {{ getStatusText(detail.status) }}
                  </span>
                  <span class="expand-chevron" :class="{ rotated: expandedRows.has(detail.date) }">▾</span>
                </div>
              </div>

              <Transition name="expand">
                <div v-if="expandedRows.has(detail.date)" class="card-body">
                  <div class="time-info">
                    <div class="time-row">
                      <span class="time-label">⏰ Heure prévue</span>
                      <span class="time-value">{{ detail.expected_time || '—' }}</span>
                    </div>
                    <div v-if="detail.clock_in_time" class="time-row">
                      <span class="time-label">🟢 Arrivée</span>
                      <span class="time-value arrival">{{ detail.clock_in_time }}</span>
                    </div>
                    <div v-if="detail.pause_start_time" class="time-row">
                      <span class="time-label">🔵 Début pause</span>
                      <span class="time-value pause">{{ detail.pause_start_time }}</span>
                    </div>
                    <div v-if="detail.pause_end_time" class="time-row">
                      <span class="time-label">🔵 Fin pause</span>
                      <span class="time-value pause">{{ detail.pause_end_time }}</span>
                    </div>
                    <div v-if="detail.mission_start_time" class="time-row">
                      <span class="time-label">🟣 Début mission</span>
                      <span class="time-value mission">{{ detail.mission_start_time }}</span>
                    </div>
                    <div v-if="detail.mission_end_time" class="time-row">
                      <span class="time-label">🟣 Fin mission</span>
                      <span class="time-value mission">{{ detail.mission_end_time }}</span>
                    </div>
                    <div v-if="detail.clock_out_time" class="time-row">
                      <span class="time-label">🔴 Départ</span>
                      <span class="time-value departure">{{ detail.clock_out_time }}</span>
                    </div>
                    <div v-if="detail.delay_minutes && detail.delay_minutes > 0" class="time-row delay">
                      <span class="time-label">⚠️ Retard</span>
                      <span class="time-value">{{ formatMinutes(detail.delay_minutes) }}</span>
                    </div>
                    <div v-if="detail.work_hours" class="time-row">
                      <span class="time-label">⏳ Heures travaillées</span>
                      <span class="time-value">{{ detail.work_hours }}h</span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <!-- Vue liste complète -->
      <div v-else class="list-view">
        <div class="attendance-table">
          <div class="table-header">
            <div class="col-date">Date</div>
            <div class="col-status">Statut</div>
            <div class="col-time">Heure prévue</div>
            <div class="col-time">Arrivée</div>
            <div class="col-time">Départ</div>
            <div class="col-delay">Retard</div>
            <div class="col-hours">Heures</div>
            <div class="col-expand"></div>
          </div>

          <template v-for="detail in attendanceHistory.allDailyDetails" :key="detail.date">
            <div
                class="table-row"
                :class="[`status-${detail.status}`, { 'row-expanded': expandedRows.has(detail.date) }, { 'row-focused': detail.date === focusDate }]"
                :data-date="detail.date"
                @click="toggleRow(detail.date)"
            >
              <div class="col-date">
                <span class="day-name-small">{{ formatDayOfWeek(detail.date) }}</span>
                <span class="date-full">{{ formatShortDate(detail.date) }}</span>
              </div>
              <div class="col-status">
                <span class="status-badge" :class="`badge-${detail.status}`">
                  {{ getStatusText(detail.status) }}
                </span>
              </div>
              <div class="col-time">{{ detail.expected_time || '—' }}</div>
              <div class="col-time clock-in">{{ detail.clock_in_time || '—' }}</div>
              <div class="col-time clock-out">{{ detail.clock_out_time || '—' }}</div>
              <div class="col-delay">
                <span v-if="detail.delay_minutes" class="delay-value">
                  {{ formatMinutes(detail.delay_minutes) }}
                </span>
                <span v-else>—</span>
              </div>
              <div class="col-hours">{{ detail.work_hours ? detail.work_hours + 'h' : '—' }}</div>
              <div class="col-expand">
                <span class="expand-chevron" :class="{ rotated: expandedRows.has(detail.date) }">▾</span>
              </div>
            </div>

            <!-- Panneau déroulant des pointages détaillés -->
            <Transition name="expand">
              <div v-if="expandedRows.has(detail.date)" class="detail-panel" :class="`panel-${detail.status}`">
                <div class="detail-panel-title">
                  📍 Détail des pointages — {{ formatFullDate(detail.date) }}
                </div>
                <div class="detail-items">
                  <div class="detail-item" v-if="detail.clock_in_time">
                    <span class="detail-dot dot-arrive"></span>
                    <span class="detail-label">Arrivée</span>
                    <span class="detail-value">{{ detail.clock_in_time }}</span>
                  </div>
                  <div class="detail-item" v-if="detail.pause_start_time">
                    <span class="detail-dot dot-pause"></span>
                    <span class="detail-label">Début pause</span>
                    <span class="detail-value">{{ detail.pause_start_time }}</span>
                  </div>
                  <div class="detail-item" v-if="detail.pause_end_time">
                    <span class="detail-dot dot-pause"></span>
                    <span class="detail-label">Fin pause</span>
                    <span class="detail-value">{{ detail.pause_end_time }}</span>
                  </div>
                  <div class="detail-item" v-if="detail.mission_start_time">
                    <span class="detail-dot dot-mission"></span>
                    <span class="detail-label">Début mission</span>
                    <span class="detail-value">{{ detail.mission_start_time }}</span>
                  </div>
                  <div class="detail-item" v-if="detail.mission_end_time">
                    <span class="detail-dot dot-mission"></span>
                    <span class="detail-label">Fin mission</span>
                    <span class="detail-value">{{ detail.mission_end_time }}</span>
                  </div>
                  <div class="detail-item" v-if="detail.clock_out_time">
                    <span class="detail-dot dot-depart"></span>
                    <span class="detail-label">Départ</span>
                    <span class="detail-value">{{ detail.clock_out_time }}</span>
                  </div>
                  <div
                      v-if="!detail.clock_in_time && !detail.pause_start_time && !detail.mission_start_time && !detail.clock_out_time"
                      class="detail-empty"
                  >
                    Aucun pointage enregistré pour cette journée.
                  </div>
                </div>
                <div class="detail-summary" v-if="detail.work_hours || (detail.delay_minutes && detail.delay_minutes > 0)">
                  <span v-if="detail.work_hours">⏳ <strong>{{ detail.work_hours }}h</strong> travaillées</span>
                  <span v-if="detail.delay_minutes && detail.delay_minutes > 0" class="summary-delay">
                    ⚠️ Retard : <strong>{{ formatMinutes(detail.delay_minutes) }}</strong>
                  </span>
                </div>
              </div>
            </Transition>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import EntriesService from '@/service/EntriesService';
import type { PointageEntry, User } from '@/utils/interfaces/employeeAttendances';

// ─── Types locaux ──────────────────────────────────────────────────────────
interface DayDetail {
  date: string;
  status: string;
  expected_time: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  pause_start_time: string | null;
  pause_end_time: string | null;
  mission_start_time: string | null;
  mission_end_time: string | null;
  delay_minutes: number | null;
  work_hours: number | null;
}

interface MonthlyStats {
  present_days: number;
  late_days: number;
  absent_days: number;
  attendance_rate: number;
}

interface AttendanceData {
  employee: User;
  period: { start: string; end: string; total_days: number };
  globalStats: { present_days: number; late_days: number; absent_days: number; off_days: number; total_days: number };
  allDailyDetails: DayDetail[];
  attendanceByMonth: Record<string, DayDetail[]>;
  monthlyStats: Record<string, MonthlyStats>;
}

// ─── Setup ─────────────────────────────────────────────────────────────────
const route     = useRoute();
const router    = useRouter();
const userStore = useUserStore();

const employeeGuid = route.params.id as string;
const focusDate    = (route.query.date as string) || null;

// ─── State ─────────────────────────────────────────────────────────────────
const attendanceHistory = ref<AttendanceData | null>(null);
const loading = ref(true);
const error   = ref('');
const selectedPeriod  = ref(focusDate ? 'custom' : '6');
const customStartDate = ref(focusDate || '');
const customEndDate   = ref(focusDate || '');
const viewMode = ref<'monthly' | 'list'>(focusDate ? 'list' : 'monthly');

const expandedRows = ref<Set<string>>(new Set());
const toggleRow = (date: string) => {
  const s = new Set(expandedRows.value);
  s.has(date) ? s.delete(date) : s.add(date);
  expandedRows.value = s;
};

// ─── Computed ──────────────────────────────────────────────────────────────
const managerGuid = computed(() => userStore.user?.guid || '');

const sortedMonths = computed(() => {
  if (!attendanceHistory.value) return [];
  return Object.keys(attendanceHistory.value.attendanceByMonth)
      .sort((a, b) => b.localeCompare(a));
});

// ─── Helpers de formatage ──────────────────────────────────────────────────

/** ISO string → "HH:mm" (UTC). Retourne null si absent. */
const isoToHHMM = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  if (iso.includes('T') || iso.includes('Z')) {
    const d = new Date(iso);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
  }
  return iso.slice(0, 5);
};

const formatTime = (iso: string | null | undefined): string => isoToHHMM(iso) ?? '—';

const formatDate = (dateString: string): string =>
    new Date(dateString + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const formatFullDate = (dateString: string): string =>
    new Date(dateString + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const formatShortDate = (dateString: string): string =>
    new Date(dateString + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const formatDayOfWeek = (dateString: string): string =>
    new Date(dateString + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' });

const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return new Date(+year, +month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

const formatMinutes = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
};

const getStatusText = (status: string): string => {
  const labels: Record<string, string> = {
    present: 'Présent', late: 'En retard', absent: 'Absent',
    'off-day': 'Repos', 'on-pause': 'En pause',
    active: 'Actif', mission: 'Mission', external_mission: 'Mission',
  };
  return labels[status] ?? status;
};

const getInitials = (): string => {
  if (!attendanceHistory.value) return '';
  const { first_name, last_name } = attendanceHistory.value.employee;
  return (first_name.charAt(0) + last_name.charAt(0)).toUpperCase();
};

const calculateAttendanceRate = (): number => {
  if (!attendanceHistory.value) return 0;
  const { present_days, late_days, off_days, total_days } = attendanceHistory.value.globalStats;
  const workDays = total_days - off_days;
  return workDays === 0 ? 0 : Math.round(((present_days + late_days) / workDays) * 100);
};

// ─── Construction des données à partir des entries brutes ──────────────────

/**
 * Transforme les PointageEntry d'un même jour en un DayDetail complet.
 * Les entries sont déjà triées chronologiquement.
 * Logique de statut :
 *   - Aucune entry clock_in → absent
 *   - clock_in présent + delay > 0 → late
 *   - clock_in présent → present
 */
const buildDayDetail = (date: string, entries: PointageEntry[]): DayDetail => {
  const get = (type: string) => entries.find(e => e.pointage_type === type)?.clocked_at ?? null;
  // Pour external_mission on prend la première (start) et la dernière (end)
  const missionEntries = entries.filter(e => e.pointage_type === 'external_mission');

  const clockIn  = get('clock_in');
  const clockOut = get('clock_out');
  const pauseStart = get('pause_start');
  const pauseEnd   = get('pause_end');
  const missionStart = missionEntries[0]?.clocked_at ?? null;
  const missionEnd   = missionEntries.length > 1 ? missionEntries[missionEntries.length - 1].clocked_at : null;

  // Calcul du retard si on a un clock_in et une expected_time
  // L'expected_time vient du premier entry (session.session_start_at ou expected_time non dispo ici)
  // On calcule depuis les minutes UTC
  let delayMinutes: number | null = null;
  let status = 'absent';

  if (clockIn) {
    status = 'present';
    // On ne peut pas calculer le retard sans l'heure prévue — on laisse null
    // (l'API /attendance/stat fournit ces valeurs ; ici on affiche uniquement les timestamps)
  }

  // Calcul approximatif des heures travaillées (clock_out - clock_in - pauses)
  let workHours: number | null = null;
  if (clockIn && clockOut) {
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    workHours = Math.round((diffMs / 3600000) * 10) / 10;
  }

  return {
    date,
    status,
    expected_time: null, // non disponible via EntriesService
    clock_in_time:       isoToHHMM(clockIn),
    clock_out_time:      isoToHHMM(clockOut),
    pause_start_time:    isoToHHMM(pauseStart),
    pause_end_time:      isoToHHMM(pauseEnd),
    mission_start_time:  isoToHHMM(missionStart),
    mission_end_time:    isoToHHMM(missionEnd),
    delay_minutes:       delayMinutes,
    work_hours:          workHours,
  };
};

/** Groupe un tableau de DayDetail par mois ("YYYY-MM") */
const groupByMonth = (details: DayDetail[]): Record<string, DayDetail[]> => {
  const map: Record<string, DayDetail[]> = {};
  details.forEach(d => {
    const key = d.date.slice(0, 7);
    if (!map[key]) map[key] = [];
    map[key].push(d);
  });
  return map;
};

/** Calcule les stats globales depuis les DayDetails */
const calcGlobalStats = (details: DayDetail[]) => {
  const present_days = details.filter(d => d.status === 'present').length;
  const late_days    = details.filter(d => d.status === 'late').length;
  const absent_days  = details.filter(d => d.status === 'absent').length;
  const off_days     = details.filter(d => d.status === 'off-day').length;
  return { present_days, late_days, absent_days, off_days, total_days: details.length };
};

/** Calcule les stats par mois */
const calcMonthlyStats = (byMonth: Record<string, DayDetail[]>): Record<string, MonthlyStats> => {
  const result: Record<string, MonthlyStats> = {};
  Object.entries(byMonth).forEach(([key, details]) => {
    const present = details.filter(d => d.status === 'present' || d.status === 'late').length;
    const workDays = details.filter(d => d.status !== 'off-day').length;
    result[key] = {
      present_days: details.filter(d => d.status === 'present').length,
      late_days:    details.filter(d => d.status === 'late').length,
      absent_days:  details.filter(d => d.status === 'absent').length,
      attendance_rate: workDays === 0 ? 0 : Math.round((present / workDays) * 100),
    };
  });
  return result;
};

// ─── Calcul de la plage de dates selon la période choisie ─────────────────
const getPeriodDates = (): { start: string; end: string } => {
  const today = new Date();
  const end   = today.toISOString().split('T')[0];

  if (selectedPeriod.value === 'custom') {
    return { start: customStartDate.value, end: customEndDate.value };
  }

  const months = parseInt(selectedPeriod.value);
  const start  = new Date(today);
  start.setMonth(start.getMonth() - months);
  return { start: start.toISOString().split('T')[0], end };
};

// ─── Chargement principal via EntriesService ───────────────────────────────
const loadData = async () => {
  if (!managerGuid.value) {
    error.value  = 'Vous devez être connecté pour voir cette page';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value   = '';

  try {
    const response = await EntriesService.listEntries(managerGuid.value);

    if (!response?.success) throw new Error('Réponse API invalide');

    const allEntries: PointageEntry[] = response.data?.data?.entries ?? [];

    // 1. Filtrer les entries de cet employé
    const empEntries = allEntries.filter(e => e.user?.guid === employeeGuid);

    if (empEntries.length === 0) {
      // Aucune entry — on affiche quand même la page avec des stats vides
      // en récupérant l'info employé si possible
      error.value = 'Aucun pointage trouvé pour cet employé sur cette période.';
      loading.value = false;
      return;
    }

    // 2. Récupérer les infos de l'employé
    const employee = empEntries[0].user;

    // 3. Appliquer le filtre de période
    const { start, end } = getPeriodDates();
    const filtered = empEntries.filter(e => {
      const d = e.clocked_at.slice(0, 10);
      return d >= start && d <= end;
    });

    // 4. Grouper par jour et construire les DayDetails
    const dayMap = new Map<string, PointageEntry[]>();
    filtered.forEach(e => {
      const date = e.clocked_at.slice(0, 10);
      if (!dayMap.has(date)) dayMap.set(date, []);
      dayMap.get(date)!.push(e);
    });

    // Trier les entries de chaque jour chronologiquement
    const allDailyDetails: DayDetail[] = [...dayMap.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, entries]) => {
          const sorted = entries.sort(
              (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
          );
          return buildDayDetail(date, sorted);
        });

    const attendanceByMonth = groupByMonth(allDailyDetails);
    const globalStats       = calcGlobalStats(allDailyDetails);
    const monthlyStats      = calcMonthlyStats(attendanceByMonth);

    const totalDays = Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    attendanceHistory.value = {
      employee,
      period: { start, end, total_days: totalDays },
      globalStats,
      allDailyDetails,
      attendanceByMonth,
      monthlyStats,
    };

    // Si focus date, auto-ouvrir et scroller
    if (focusDate) {
      expandedRows.value = new Set([focusDate]);
      setTimeout(() => {
        document.querySelector(`[data-date="${focusDate}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }

  } catch (err: any) {
    error.value = err.message || 'Erreur lors du chargement des données';
  } finally {
    loading.value = false;
  }
};

const onPeriodChange = () => {
  if (selectedPeriod.value !== 'custom') loadData();
};

const onCustomDateChange = () => {
  if (customStartDate.value && customEndDate.value) loadData();
};

const goBack = () => router.back();

// ─── Init ──────────────────────────────────────────────────────────────────
onMounted(() => {
  if (userStore.checkSession()) loadData();
  else { error.value = 'Session expirée. Veuillez vous reconnecter.'; loading.value = false; }
});
</script>

<style scoped>
/* ===== Base ===== */
.employee-attendance-history-page {
  min-height: 100vh;
  background: #f0f4f8;
  padding: 20px;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* ===== Header ===== */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
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
  transition: all 0.15s;
}
.back-btn:hover { background: #edf2f7; border-color: #cbd5e0; }

.employee-header {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-start;
}

.employee-avatar {
  flex-shrink: 0;
}

.employee-avatar .avatar,
.employee-avatar .avatar-placeholder {
  width: 64px; height: 64px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; color: white;
  overflow: hidden;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-placeholder { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }

.employee-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.employee-info h1 { margin: 0; font-size: 22px; font-weight: 700; color: #1a202c; }
.job-info { margin: 0; font-size: 14px; color: #4a5568; }
.employee-code { margin: 0; font-size: 12px; color: #718096; }

/* ===== Loading / Error ===== */
.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; background: white; border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07); gap: 12px;
}
.spinner {
  width: 38px; height: 38px;
  border: 4px solid #e2e8f0; border-top-color: #4f46e5;
  border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-icon { font-size: 44px; }
.error-state p { color: #e53e3e; margin-bottom: 4px; }
.retry-btn {
  margin-top: 8px; padding: 10px 20px;
  background: #4f46e5; color: white; border: none;
  border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
}

/* ===== Content layout ===== */
.page-content { display: flex; flex-direction: column; gap: 18px; }

/* ===== Controls ===== */
.controls-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  background: white; padding: 16px 20px; border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.period-selector { display: flex; align-items: center; gap: 8px; }
.period-selector label { font-size: 13px; font-weight: 600; color: #4a5568; }
.period-selector select, .date-input {
  padding: 7px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; color: #1a202c; background: #f7fafc; cursor: pointer;
}
.custom-dates { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #a0aec0; }
.view-toggle { margin-left: auto; }
.toggle-btn {
  padding: 8px 16px; border: 1px solid #e2e8f0; background: white;
  border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
  color: #4a5568; transition: all 0.15s;
}
.toggle-btn:hover { background: #f7fafc; }
.toggle-btn.active { background: #4f46e5; color: white; border-color: #4f46e5; }

/* ===== Statistiques ===== */
.global-stats-section {
  background: white; border-radius: 12px; padding: 22px 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.global-stats-section h2 { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1a202c; }
.period-info { margin: 0 0 18px; font-size: 13px; color: #a0aec0; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.stat-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 10px; border: 1px solid #e2e8f0;
  background: #f7fafc;
}
.stat-card.stat-present { background: #f0fff4; border-color: #9ae6b4; }
.stat-card.stat-late    { background: #fffaf0; border-color: #fbd38d; }
.stat-card.stat-absent  { background: #fff5f5; border-color: #feb2b2; }
.stat-card.stat-rate.highlight { background: linear-gradient(135deg, #ebf4ff, #e9d8fd); border-color: #7c3aed; }

.stat-icon { font-size: 28px; }
.stat-content .stat-value { display: block; font-size: 26px; font-weight: 800; color: #1a202c; margin-bottom: 2px; }
.stat-content .stat-label { display: block; font-size: 12px; color: #718096; }

/* ===== Légende ===== */
.legend-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  background: white; padding: 12px 20px; border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.legend-title { font-size: 12px; font-weight: 600; color: #a0aec0; margin-right: 6px; }

/* ===== Status badges ===== */
.status-badge {
  display: inline-block; padding: 4px 11px; border-radius: 100px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
  white-space: nowrap;
}
.badge-present  { background: #c6f6d5; color: #276749; }
.badge-late     { background: #feebc8; color: #923b00; }
.badge-absent   { background: #fed7d7; color: #9b2c2c; }
.badge-off-day  { background: #e2e8f0; color: #4a5568; }
.badge-on-pause { background: #bee3f8; color: #2c5282; }
.badge-mission  { background: #e9d8fd; color: #553c9a; }
.badge-active   { background: #b2f5ea; color: #234e52; }

/* ===== Chevron ===== */
.expand-chevron {
  font-size: 16px; color: #a0aec0;
  transition: transform 0.25s ease; display: inline-block;
}
.expand-chevron.rotated { transform: rotate(180deg); }

/* ===== Monthly view ===== */
.monthly-view { display: flex; flex-direction: column; gap: 22px; }

.month-section {
  background: white; border-radius: 12px; padding: 22px 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.month-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0;
}
.month-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #1a202c; text-transform: capitalize; }
.month-count { font-size: 13px; color: #718096; }

.month-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px; padding: 14px; background: #f7fafc; border-radius: 8px; margin-bottom: 16px;
}
.month-stat { display: flex; flex-direction: column; gap: 2px; }
.month-stat .stat-label { font-size: 12px; color: #718096; font-weight: 500; }
.month-stat .stat-value { font-size: 15px; font-weight: 700; color: #1a202c; }
.stat-value.success { color: #276749; }
.stat-value.warning { color: #923b00; }
.stat-value.danger  { color: #9b2c2c; }

/* Attendance cards (monthly) */
.attendance-list { display: flex; flex-direction: column; gap: 10px; }

.attendance-card {
  border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
  border-left: 4px solid #cbd5e0; transition: box-shadow 0.15s;
}
.attendance-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.09); }

.attendance-card.status-present  { border-left-color: #48bb78; }
.attendance-card.status-late     { border-left-color: #ed8936; }
.attendance-card.status-absent   { border-left-color: #fc8181; }
.attendance-card.status-off-day  { border-left-color: #cbd5e0; }
.attendance-card.status-on-pause { border-left-color: #63b3ed; }
.attendance-card.status-mission  { border-left-color: #9f7aea; }
.attendance-card.status-active   { border-left-color: #38b2ac; }

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; cursor: pointer; user-select: none;
}
.card-header-right { display: flex; align-items: center; gap: 10px; }
.date-info { display: flex; flex-direction: column; gap: 1px; align-items: flex-start; text-align: left; }
.day-name { font-size: 10px; color: #a0aec0; text-transform: uppercase; font-weight: 700; }
.date-label { font-size: 14px; color: #1a202c; font-weight: 600; text-transform: capitalize; }

.card-body {
  border-top: 1px solid #e2e8f0;
  padding: 16px;
}
.time-info {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
}
.time-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 16px;
  min-width: 110px;
  text-align: center;
}
.time-row.delay {
  background: #fffaf0;
  border-color: #fbd38d;
}
.time-label {
  font-size: 10px;
  font-weight: 700;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
  white-space: nowrap;
}
.time-value {
  font-size: 15px;
  font-weight: 800;
  color: #1a202c;
  font-variant-numeric: tabular-nums;
}
.time-value.arrival   { color: #276749; }
.time-value.departure { color: #9b2c2c; }
.time-value.pause     { color: #2c5282; }
.time-value.mission   { color: #553c9a; }
.time-row.delay .time-value { color: #923b00; }

/* ===== List view ===== */
.list-view {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.attendance-table { overflow-x: auto; }

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 180px 130px 110px 100px 100px 100px 80px 40px;
  gap: 8px;
  padding: 11px 18px;
  align-items: center;
}

/* Le panneau déroulant doit être en dehors de la grille, pleine largeur */
.detail-panel {
  display: block;
  width: 100%;
  box-sizing: border-box;
}
.table-header {
  background: #f7fafc; font-size: 11px; font-weight: 700;
  color: #a0aec0; text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0; position: sticky; top: 0;
}
.table-row {
  border-bottom: 1px solid #edf2f7; font-size: 13px;
  cursor: pointer; transition: background 0.12s;
  border-left: 4px solid transparent;
}
.table-row:hover { background: #f7fafc; }
.table-row.row-expanded { background: #f7fafc; }

.table-row.status-present  { border-left-color: #48bb78; }
.table-row.status-late     { border-left-color: #ed8936; }
.table-row.status-absent   { border-left-color: #fc8181; }
.table-row.status-off-day  { border-left-color: #cbd5e0; }
.table-row.status-on-pause { border-left-color: #63b3ed; }
.table-row.status-mission  { border-left-color: #9f7aea; }
.table-row.status-active   { border-left-color: #38b2ac; }

.col-date { display: flex; flex-direction: column; gap: 1px; align-items: flex-start; text-align: left; }
.day-name-small { font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; }
.date-full { font-size: 13px; font-weight: 600; color: #2d3748; text-transform: capitalize; }

.clock-in  { color: #276749; font-weight: 600; }
.clock-out { color: #9b2c2c; font-weight: 600; }
.delay-value { color: #923b00; font-weight: 700; }
.col-expand { display: flex; align-items: center; justify-content: center; }

/* ===== Detail panel ===== */
.detail-panel {
  padding: 14px 22px 18px 22px;
  border-bottom: 1px solid #e2e8f0;
  background: #f7fafc;
  border-left: 4px solid #e2e8f0;
}
.panel-present  { border-left-color: #48bb78; background: #f0fff4; }
.panel-late     { border-left-color: #ed8936; background: #fffaf0; }
.panel-absent   { border-left-color: #fc8181; background: #fff5f5; }
.panel-off-day  { border-left-color: #cbd5e0; background: #f7fafc; }
.panel-on-pause { border-left-color: #63b3ed; background: #ebf8ff; }
.panel-mission  { border-left-color: #9f7aea; background: #faf5ff; }
.panel-active   { border-left-color: #38b2ac; background: #e6fffa; }

.detail-panel-title {
  font-size: 11px; font-weight: 700; color: #718096;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;
}
.detail-items { display: flex; flex-wrap: wrap; gap: 10px; }
.detail-item {
  display: flex; align-items: center; gap: 8px;
  background: white; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 8px 14px; min-width: 140px;
}
.detail-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.dot-arrive  { background: #48bb78; }
.dot-pause   { background: #63b3ed; }
.dot-mission { background: #9f7aea; }
.dot-depart  { background: #fc8181; }

.detail-label { font-size: 11px; color: #a0aec0; font-weight: 600; text-transform: uppercase; margin-right: 4px; }
.detail-value { font-size: 14px; font-weight: 700; color: #1a202c; font-variant-numeric: tabular-nums; }
.detail-empty { font-size: 13px; color: #a0aec0; font-style: italic; padding: 4px 0; }

.detail-summary {
  display: flex; gap: 18px; margin-top: 12px;
  font-size: 13px; color: #4a5568;
}
.detail-summary strong { font-weight: 800; color: #1a202c; }
.summary-delay strong { color: #e53e3e; }

.row-focused {
  background: #eff6ff !important;
  border-left-color: #6366f1 !important;
}

/* ===== Expand animation ===== */
.expand-enter-active, .expand-leave-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  max-height: 500px; overflow: hidden;
}
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .table-header, .table-row {
    grid-template-columns: 140px 110px 90px 90px 90px 85px 65px 34px;
  }
}
@media (max-width: 700px) {
  .employee-attendance-history-page { padding: 12px; }
  .table-header { display: none; }
  .table-row {
    grid-template-columns: 1fr 1fr auto;
    grid-template-rows: auto auto;
    gap: 6px; padding: 12px 14px;
  }
  .detail-items { flex-direction: column; }
}
</style>