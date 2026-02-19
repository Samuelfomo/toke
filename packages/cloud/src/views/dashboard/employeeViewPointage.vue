<template>
  <div class="pointage-panel">

    <!-- ================= HEADER ================= -->
    <div class="panel-header">
      <h3>
        Pointages du jour
        <span class="count">({{ presentEmployees.length }}/{{ totalEmployees }})</span>
      </h3>
    </div>

    <!-- ================= LAST UPDATE ================= -->
    <div class="last-update">
      ⏱ Mis à jour il y a {{ lastUpdateMinutes }} min
    </div>

    <!-- ================= EMPTY STATE ================= -->
    <div v-if="presentEmployees.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-title">Aucun employé présent</p>
      <p class="empty-text">{{ loading ? 'Chargement...' : 'Aucun pointage enregistré aujourd\'hui' }}</p>
    </div>

    <!-- ================= LIST ================= -->
    <div v-else class="employee-list">

      <div
          v-for="employee in sortedPresentEmployees"
          :key="employee.guid"
          class="employee-item"
          :class="{ expanded: selectedEmployee?.guid === employee.guid }"
      >
        <!-- ========== COMPACT ROW ========== -->
        <div class="employee-compact" @click="toggleEmployee(employee)">
          <div class="employee-left">
            <div class="avatar">
              <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name" />
              <span v-else class="initials">{{ employee.initials }}</span>
              <span :class="['status-dot', getStatusDotClass(employee.statusColor)]" />
            </div>

            <div class="employee-info">
              <strong class="name">{{ employee.name }}</strong>
              <span class="department">{{ employee.department }}</span>
            </div>
          </div>

          <div class="employee-right">
            <span class="status-badge" :class="`badge-${employee.status}`">
              {{ employee.statusText }}
            </span>

            <button class="expand-btn" :class="{ rotated: selectedEmployee?.guid === employee.guid }">
              ▼
            </button>
          </div>
        </div>

        <!-- ========== DETAILS TIMELINE ========== -->
        <transition name="expand">
          <div v-if="selectedEmployee?.guid === employee.guid" class="employee-details">

            <!-- Timeline seulement si l'employé a des événements -->
            <div v-if="getEmployeeTimeline(employee).length > 0" class="schedule-timeline">
              <div
                  v-for="event in getEmployeeTimeline(employee)"
                  :key="event.type + event.time"
                  class="timeline-item"
                  :class="getStatusClass(event.type)"
              >
                <div class="timeline-icon">{{ getStatusIcon(event.type) }}</div>
                <div class="timeline-content">
                  <span class="label">{{ event.label }}</span>
                  <span class="time-badge">{{ event.time || '—' }}</span>
                  <button class="memo-icon" @click.stop="openMemo(employee, event)">📝</button>
                </div>
              </div>
            </div>

            <!-- Message si aucun pointage -->
            <div v-else class="no-timeline-info">
              ℹ️ Aucun pointage enregistré pour aujourd'hui
            </div>

            <!-- Info retard si présent -->
            <div v-if="employee.today?.delay_text" class="delay-info">
              ⚠ Retard de {{ employee.today.delay_text }}
            </div>

            <!-- Durée de travail si disponible -->
            <div v-if="employee.today?.work_hours" class="work-hours-info">
              ⏰ Temps de travail: {{ formatWorkHours(employee.today.work_hours) }}
            </div>

          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from "@/stores/userStore"
import EntriesService from "@/service/EntriesService"
import type {
  PeriodAttendanceResponse,
  TransformedEmployee,
} from '@/utils/interfaces/employeeAttendances'
import {
  transformApiResponse,
  getPresentEmployees,
  formatTime,
} from '@/utils/interfaces/employeeAttendances'

const userStore = useUserStore()
const router = useRouter()

interface Props {
  selectedEmployee?: TransformedEmployee | null
}

const props = defineProps<Props>()
const emit = defineEmits(['employee-click', 'close'])

// ================== REACTIVES ==================
const employees = ref<TransformedEmployee[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const lastUpdateMinutes = ref(0)
let updateInterval: number | null = null
let refreshInterval: number | null = null

// ================== COMPUTEDS ==================
const currentUserGuid = computed(() => userStore.user?.guid || '')

/**
 * Total des employés (tous statuts confondus)
 */
const totalEmployees = computed(() => employees.value.length)

/**
 * Filtre pour ne garder QUE les employés présents
 * (present, active, late, on-pause, external-mission)
 */
const presentEmployees = computed(() => getPresentEmployees(employees.value))

/**
 * Liste triée alphabétiquement des employés présents
 */
const sortedPresentEmployees = computed(() =>
    [...presentEmployees.value].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
)

console.log('Employés présents:', sortedPresentEmployees.value)

// ================== DATA LOADING ==================

/**
 * Charge les données de présence depuis la nouvelle API
 */
const loadEmployeeData = async () => {
  try {
    loading.value = true
    error.value = null

    // Récupérer les données de présence depuis l'API
    const response = await EntriesService.listEntries(
        currentUserGuid.value
    )

    console.log("Raw API Response:", response)

    // Vérifier la structure de la réponse
    if (!response?.success) {
      throw new Error('API returned unsuccessful response')
    }

    const apiResponse = response as PeriodAttendanceResponse

    // Transformer les données de l'API
    const transformedEmployees = transformApiResponse(apiResponse)

    employees.value = transformedEmployees
    console.log(`Successfully loaded ${transformedEmployees.length} employees`)
    console.log(`Present employees: ${presentEmployees.value.length}`)

    // Réinitialiser le compteur de mise à jour
    lastUpdateMinutes.value = 0

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des données'
    console.error('Failed to load employee data:', err)
  } finally {
    loading.value = false
  }
}

/**
 * Rafraîchit les données
 */
const refresh = async () => {
  await loadEmployeeData()
}

// ================== HELPERS ==================
const toggleEmployee = (employee: TransformedEmployee) =>
    props.selectedEmployee?.guid === employee.guid
        ? emit('close')
        : emit('employee-click', employee)

/**
 * Convertit la couleur hexadécimale en classe CSS
 */
const getStatusDotClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    '#10b981': 'dot-green',   // present
    '#3b82f6': 'dot-blue',    // active
    '#f59e0b': 'dot-orange',  // late
    '#ef4444': 'dot-red',     // absent
    '#6b7280': 'dot-gray',    // off-day
    '#8b5cf6': 'dot-purple',  // on-pause
    '#06b6d4': 'dot-cyan',    // external-mission
  }
  return colorMap[color] || 'dot-gray'
}

/**
 * Formate les heures de travail (nombre décimal vers texte)
 */
const formatWorkHours = (hours: number): string => {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}min`
}

/**
 * Construit la timeline des événements pour un employé
 */
const getEmployeeTimeline = (employee: TransformedEmployee) => {
  const timeline: Array<{ type: string; label: string; time: string | null }> = []

  // Si pas de données today, retourner tableau vide
  if (!employee.today) return timeline

  // Arrivée
  if (employee.today.clock_in_time) {
    timeline.push({
      type: 'arrivee',
      label: 'Arrivée',
      time: formatTime(employee.today.clock_in_time)
    })
  } else if (employee.today.expected_time) {
    timeline.push({
      type: 'arrivee_prevue',
      label: 'Arrivée prévue',
      time: employee.today.expected_time
    })
  }

  // Pause début
  if (employee.today.pause_start_time) {
    timeline.push({
      type: 'pause_start',
      label: 'Début pause',
      time: formatTime(employee.today.pause_start_time)
    })
  }

  // Pause fin
  if (employee.today.pause_end_time) {
    timeline.push({
      type: 'pause_end',
      label: 'Fin pause',
      time: formatTime(employee.today.pause_end_time)
    })
  }

  // Mission début
  if (employee.today.mission_start_time) {
    timeline.push({
      type: 'mission_start',
      label: 'Début mission',
      time: formatTime(employee.today.mission_start_time)
    })
  }

  // Mission fin
  if (employee.today.mission_end_time && employee.today.mission_start_time) {
    timeline.push({
      type: 'mission_end',
      label: 'Fin mission',
      time: formatTime(employee.today.mission_end_time)
    })
  }

  // Départ
  if (employee.today.clock_out_time) {
    timeline.push({
      type: 'depart',
      label: 'Départ',
      time: formatTime(employee.today.clock_out_time)
    })
  }

  return timeline
}

// ================== TIMELINE HELPERS ==================
const getStatusIcon = (type: string) => {
  return {
    arrivee: '✅',
    arrivee_prevue: '🕐',
    depart: '⏹',
    mission_start: '🚀',
    mission_end: '🏁',
    pause_start: '☕',
    pause_end: '▶️'
  }[type] || '❔'
}

const getStatusClass = (type: string) => {
  return {
    arrivee: 'success',
    arrivee_prevue: 'info light',
    depart: 'neutral',
    mission_start: 'info',
    mission_end: 'info light',
    pause_start: 'warning',
    pause_end: 'warning light'
  }[type] || ''
}

// ================== MEMO ==================
const openMemo = (employee: TransformedEmployee, event: any) => {
  router.push({
    path: '/memoNew',
    query: {
      employeeGuid: employee.guid,
      employeeName: employee.name,
    }
  })
}

// ================== AUTO-REFRESH ==================
const startAutoRefresh = () => {
  // Rafraîchir les données toutes les 30 secondes
  refreshInterval = window.setInterval(() => {
    refresh()
  }, 30000)

  // Mettre à jour le compteur "dernière mise à jour" toutes les minutes
  updateInterval = window.setInterval(() => {
    lastUpdateMinutes.value++
  }, 60000)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

// ================== LIFECYCLE ==================
onMounted(async () => {
  console.log("Mounting employeeViewPointage component...")
  await loadEmployeeData()
  startAutoRefresh()
})

onUnmounted(() => {
  console.log("Unmounting employeeViewPointage component...")
  stopAutoRefresh()
})
</script>

<style scoped>
.pointage-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: none;
  min-height: 420px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.panel-header h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
}

.count {
  font-size: 12px;
  color: #94a3b8;
}

.last-update {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 12px;
}

/* ================= EMPTY STATE ================= */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.empty-text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* ================= NO TIMELINE INFO ================= */
.no-timeline-info {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: #475569;
  text-align: center;
}

/* ================= EMPLOYEE LIST ================= */
.employee-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.employee-list::-webkit-scrollbar {
  width: 6px;
}
.employee-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
}

.employee-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  transition: all .25s ease;
}

.employee-item:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.employee-compact {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
}

.employee-left {
  display: flex;
  gap: 10px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.employee-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.initials {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.dot-green { background: #22c55e; }
.dot-orange { background: #f59e0b; }
.dot-red { background: #b91c1c; }
.dot-blue { background: #3b82f6; }
.dot-gray { background: #64748b; }
.dot-purple { background: #8b5cf6; }
.dot-cyan { background: #06b6d4; }

.employee-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.employee-info .name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-info .department {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.badge-present { background: #dcfce7; color: #166534; }
.badge-late { background: #fef2f2; color: #b91c1c; }
.badge-absent { background: #f1f5f9; color: #64748b; }
.badge-on-pause { background: #fef3c7; color: #92400e; }
.badge-active { background: #dbeafe; color: #1e40af; }
.badge-off-day { background: #f1f5f9; color: #475569; }
.badge-external-mission { background: #cffafe; color: #0e7490; }

.time {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.memo-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.memo-icon:hover {
  opacity: 1;
}

.expand-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.3s;
  color: #64748b;
}

.expand-btn.rotated {
  transform: rotate(180deg);
}

.employee-details {
  padding: 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.schedule-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 18px;
  margin-bottom: 10px;
}

.schedule-timeline::before {
  content: "";
  position: absolute;
  left: 9px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}

.timeline-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.timeline-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.success .timeline-icon { background: #22c55e; }
.neutral .timeline-icon { background: #94a3b8; }
.warning .timeline-icon { background: #f59e0b; }
.warning.light .timeline-icon { background: #fbbf24; }
.info .timeline-icon { background: #3b82f6; }
.info.light .timeline-icon { background: #60a5fa; }

.timeline-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 12px;
  gap: 8px;
}

.timeline-content .label {
  color: #0f172a;
  font-weight: 500;
}

.time-badge {
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: #475569;
}

.delay-info {
  margin-top: 10px;
  font-size: 12px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 8px 10px;
  border-radius: 8px;
  font-weight: 500;
}

.work-hours-info {
  margin-top: 10px;
  font-size: 12px;
  background: #eff6ff;
  color: #1e40af;
  padding: 8px 10px;
  border-radius: 8px;
  font-weight: 500;
}

.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* ================= RESPONSIVE ================= */
@media (max-width: 768px) {
  .pointage-panel {
    padding: 1.25rem;
  }

  .panel-header h3 {
    font-size: 1.1rem;
  }

  .employee-compact {
    padding: 0.875rem;
  }

  .employee-info .name {
    font-size: 13px;
  }

  .employee-info .department {
    font-size: 11px;
  }
}
</style>