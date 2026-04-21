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
              <span v-else class="initial">{{ employee.initials }}</span>
              <span :class="['status-dot', getEffectiveStatus(employee) === 'late' ? 'dot-orange' : getStatusDotClass(employee.statusColor)]" />
            </div>

            <div class="employee-info">
              <strong class="name">{{ employee.name }}</strong>
              <span class="department">{{ employee.department }}</span>
            </div>
          </div>

          <div class="employee-right">
            <span class="status-badge" :class="`badge-${getEffectiveStatus(employee)}`">
              {{ getEffectiveStatusText(employee) }}
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
            <div v-if="getDelayText(employee)" class="delay-info">
              ⚠ Retard de {{ getDelayText(employee) }}
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
import "../../assets/css/toke-EViewPointage-28.css"
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
 * Vérifie si l'employé a une anomalie de type "late_arrival" signalée par l'API.
 * Source de vérité principale : le champ `today.has_late_arrival` issu de la
 * transformation de l'API (memo_content contenant "late_arrival").
 */
const hasLateArrivalAnomaly = (employee: TransformedEmployee): boolean => {
  return employee.today?.is_late === true  // ✅ ce champ existe déjà
}
/**
 * Calcule le retard en minutes entre l'heure réelle et l'heure prévue.
 * Utilisé comme fallback si les données API d'anomalie ne sont pas disponibles.
 * Retourne 0 si pas de retard ou données manquantes.
 */
const computeDelayMinutes = (employee: TransformedEmployee): number => {
  const clockIn = employee.today?.clock_in_time
  const expected = employee.today?.expected_time
  if (!clockIn || !expected) return 0

  const toMinutes = (timeStr: string): number => {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr)
      return d.getHours() * 60 + d.getMinutes()
    }
    const parts = timeStr.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }

  const diff = toMinutes(clockIn) - toMinutes(expected)
  return diff > 0 ? diff : 0
}

/**
 * Retourne le texte du retard formaté, ou null si pas de retard.
 * Priorité 1 : delay_text déjà calculé dans la transformation API
 * Priorité 2 : delay_minutes issu des memos API
 * Priorité 3 : calcul local (fallback)
 */
const getDelayText = (employee: TransformedEmployee): string | null => {
  // Priorité 1 : texte déjà formaté par la transformation
  if (employee.today?.delay_text) return employee.today.delay_text

  // Priorité 2 : minutes de retard extraites des memos de l'API
  const apiDelayMinutes = employee.today?.delay_minutes
  if (apiDelayMinutes && apiDelayMinutes > 0) {
    const h = Math.floor(apiDelayMinutes / 60)
    const m = apiDelayMinutes % 60
    return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}`.trim() : `${m} min`
  }

  // Priorité 3 : calcul local via comparaison d'heures (fallback)
  const minutes = computeDelayMinutes(employee)
  if (minutes <= 0) return null

  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}`.trim() : `${m} min`
}

/**
 * Retourne le statut effectif de l'employé.
 *
 * Règle de priorité (du plus fiable au moins fiable) :
 *  1. Anomalie "late_arrival" confirmée par l'API → "late"
 *  2. Calcul local positif (fallback si anomalie API non mappée) → "late"
 *  3. Statut original de l'employé
 *
 * Cette approche évite qu'un employé en retard soit affiché "Présent"
 * lorsque expected_time est null ou mal mappé.
 */
const getEffectiveStatus = (employee: TransformedEmployee): string => {
  const isPresent = employee.status === 'active' || employee.status === 'present'

  if (isPresent) {
    // Source 1 : anomalie confirmée par l'API (la plus fiable)
    if (hasLateArrivalAnomaly(employee)) return 'late'

    // Source 2 : calcul local de fallback
    if (computeDelayMinutes(employee) > 0) return 'late'
  }

  return employee.status
}

/**
 * Retourne le texte du badge selon le statut effectif.
 */
const getEffectiveStatusText = (employee: TransformedEmployee): string => {
  const status = getEffectiveStatus(employee)
  const texts: Record<string, string> = {
    present: 'Présent',
    active: 'Actif',
    late: 'En retard',
    'on-pause': 'En pause',
    'external-mission': 'Mission',
    absent: 'Absent',
    'off-day': 'Repos',
  }
  return texts[status] || employee.statusText
}

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
    const isLate = computeDelayMinutes(employee) > 0
    timeline.push({
      type: isLate ? 'arrivee_tardive' : 'arrivee',
      label: isLate ? 'Arrivée (en retard)' : 'Arrivée',
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
    arrivee_tardive: '⚠️',
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
    arrivee_tardive: 'warning',
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

</style>