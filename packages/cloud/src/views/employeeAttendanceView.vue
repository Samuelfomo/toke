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

<!--        <div class="view-toggle">-->
<!--          <button :class="['toggle-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">-->
<!--            📋 Liste complète-->
<!--          </button>-->
<!--        </div>-->
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
              <div class="stat-label">Jours présents a l'heure</div>
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
                  <AttendanceDayTimeline :detail="detail" />
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
            <div class="col-hours">Heures travailles</div>
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
<!--              <div class="col-time clock-in">{{ detail.clock_in_time || '—' }}</div>-->
<!--              <div class="col-time clock-out">{{ detail.clock_out_time || '—' }}</div>-->
<!--              <div class="col-delay">-->
<!--                <span v-if="detail.delay_minutes" class="delay-value">-->
<!--                  {{ formatMinutes(detail.delay_minutes) }}-->
<!--                </span>-->
<!--                <span v-else>—</span>-->
<!--              </div>-->
              <div class="col-hours">{{ detail.work_hours ? detail.work_hours + 'h' : '—' }}</div>
              <div class="col-expand">
                <span class="expand-chevron" :class="{ rotated: expandedRows.has(detail.date) }">▾</span>
              </div>
            </div>

            <!-- Timeline serpentine au clic -->
            <Transition name="expand">
              <div v-if="expandedRows.has(detail.date)" class="detail-panel" :class="`panel-${detail.status}`">
                <AttendanceDayTimeline :detail="detail" />
              </div>
            </Transition>
          </template>
        </div>
      </div>

    </div>
  </div>
  <Footer />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import EntriesService from '@/service/EntriesService';
import type { PointageEntry, User } from '@/utils/interfaces/employeeAttendances';
import AttendanceDayTimeline from './Attendancedaytimeline.vue';
import Footer from "../views/components/footer.vue";
import HeadBuilder from "@/utils/HeadBuilder";
import AttendanceCss from "../assets/css/toke-AttendanceDetails-26.css?url"

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
const employee = ref<any>(null)

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
 * Correspondance JS getDay() → clé de la définition du planning.
 * 0 = Dimanche, 1 = Lundi … 6 = Samedi
 */
const JS_DAY_TO_SCHEDULE_KEY: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

/**
 * Extrait depuis l'entry clock_in :
 *   - l'heure prévue d'arrivée  (ex. "16:30")
 *   - la tolérance en minutes   (ex. 15)
 * en lisant user.assignment_info.active_schedule_assignment.session_template.definition
 *
 * Retourne null si l'employé n'a pas de planning affecté pour ce jour.
 */
const getScheduleForEntry = (
    entry: PointageEntry,
    date: string,
): { expectedTime: string; toleranceMin: number } | null => {
  const asgn = entry.user?.assignment_info?.active_schedule_assignment as any;
  if (!asgn || typeof asgn === 'string') return null;

  const definition = asgn.session_template?.definition;
  if (!definition) return null;

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const key       = JS_DAY_TO_SCHEDULE_KEY[dayOfWeek];
  const slots     = definition[key];

  if (!slots || slots.length === 0) return null;

  const slot = slots[0];
  const expectedTime  = slot.work?.[0] ?? null;
  const toleranceMin  = slot.tolerance ?? 0;

  if (!expectedTime) return null;
  return { expectedTime, toleranceMin };
};
/**
 * Convertit "HH:mm" en minutes depuis minuit.
 */
const hhmmToMins = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Transforme les PointageEntry d'un même jour en un DayDetail complet.
 * Les entries sont déjà triées chronologiquement.
 * L'heure prévue et la tolérance viennent de :
 *   user.assignment_info.active_schedule_assignment.session_template.definition
 */
const buildDayDetail = (date: string, entries: PointageEntry[]): DayDetail => {
  const get = (type: string) => entries.find(e => e.pointage_type === type)?.clocked_at ?? null;
  const missionEntries = entries.filter(e => e.pointage_type === 'external_mission');

  const clockIn      = get('clock_in');
  const clockOut     = get('clock_out');
  const pauseStart   = get('pause_start');
  const pauseEnd     = get('pause_end');
  const missionStart = missionEntries[0]?.clocked_at ?? null;
  const missionEnd   = missionEntries.length > 1
      ? missionEntries[missionEntries.length - 1].clocked_at
      : null;

  // ── Calcul du retard ──────────────────────────────────────────────────────
  let expectedTime:  string | null = null;
  let delayMinutes:  number | null = null;
  let status = 'absent';

  if (clockIn) {
    // 1. Récupérer le planning du jour depuis la première entry clock_in
    const clockInEntry   = entries.find(e => e.pointage_type === 'clock_in');
    const schedule       = clockInEntry ? getScheduleForEntry(clockInEntry, date) : null;

    // 2. Heure réelle d'arrivée en UTC → minutes depuis minuit
    const clockInDate    = new Date(clockIn);
    const clockInMins    = clockInDate.getUTCHours() * 60 + clockInDate.getUTCMinutes();

    if (schedule) {
      expectedTime         = schedule.expectedTime;
      const expectedMins   = hhmmToMins(schedule.expectedTime);
      const toleranceMins  = schedule.toleranceMin;
      const limitMins      = expectedMins + toleranceMins; // seuil au-delà duquel c'est un retard

      const rawDelay       = clockInMins - expectedMins;   // peut être négatif (arrivée en avance)

      if (rawDelay > toleranceMins) {
        // Retard réel = dépassement au-delà de la tolérance
        delayMinutes = rawDelay;   // on garde le retard total (par rapport à l'heure prévue)
        status       = 'late';
      } else {
        delayMinutes = 0;
        status       = 'present';
      }
    } else {
      // Pas de planning trouvé : on marque présent sans délai calculable
      status       = 'present';
      delayMinutes = null;
    }
  }

  // ── Heures travaillées ────────────────────────────────────────────────────
  let workHours: number | null = null;
  if (clockIn && clockOut) {
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    workHours    = Math.round((diffMs / 3600000) * 10) / 10;
  }

  return {
    date,
    status,
    expected_time:      expectedTime,
    clock_in_time:      isoToHHMM(clockIn),
    clock_out_time:     isoToHHMM(clockOut),
    pause_start_time:   isoToHHMM(pauseStart),
    pause_end_time:     isoToHHMM(pauseEnd),
    mission_start_time: isoToHHMM(missionStart),
    mission_end_time:   isoToHHMM(missionEnd),
    delay_minutes:      delayMinutes,
    work_hours:         workHours,
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
  // present_days = arrivés à l'heure (status 'present' strict)
  // late_days    = arrivés mais en retard (status 'late')
  // Les deux comptent comme "présent" pour le taux de présence
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
  HeadBuilder.apply({
    title: `Attendance- ${employee.value?.name || 'Employé'} - Toké`,
    css: [AttendanceCss],
    meta: { viewport: "width=device-width, initial-scale=1.0" }
  });
});
</script>

<style scoped>

</style>