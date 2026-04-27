<template>
  <div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

    <!-- ================= HEADER ================= -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
      <div class="flex items-center gap-3">
        <button
            v-if="selectedEmployee"
            @click="emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        <div>
          <h3 class="text-lg font-semibold text-slate-800">
            {{ selectedEmployee ? 'Historique des pointages' : 'Sélectionnez un employé' }}
          </h3>
          <p v-if="selectedEmployee" class="text-sm text-slate-500">
            {{ selectedEmployee.name }} · {{ formatPeriod() }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-xs text-slate-500">
          ⏱ Mis à jour il y a {{ lastUpdateMinutes }} min
        </div>
        <button
            @click="refresh"
            :disabled="loading"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-4 h-4" :class="{ 'animate-spin': loading }">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ================= EMPTY STATE - NO EMPLOYEE SELECTED ================= -->
    <div v-if="!selectedEmployee" class="flex flex-col items-center justify-center py-16 px-4">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-slate-400">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-slate-800 mb-1">Sélectionnez un employé</p>
      <p class="text-sm text-slate-500">Cliquez sur un employé pour voir son historique de pointages</p>
    </div>

    <!-- ================= LOADING STATE ================= -->
    <div v-else-if="loading" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500">Chargement des pointages...</p>
      </div>
    </div>

    <!-- ================= ERROR STATE ================= -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 px-4">
      <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-8 h-8 text-red-500">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-slate-800 mb-1">Erreur de chargement</p>
      <p class="text-sm text-slate-500 mb-4">{{ error }}</p>
      <button
          @click="refresh"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Réessayer
      </button>
    </div>

    <!-- ================= POINTAGES TIMELINE ================= -->
    <div v-else-if="employeeEntries.length > 0" class="divide-y divide-slate-100">

      <!-- Par jour -->
      <div
          v-for="(dayGroup, date) in groupedByDay"
          :key="date"
          class="px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <!-- En-tête du jour -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center text-white shadow-sm">
              <span class="text-xs font-bold leading-none">{{ formatDayNumber(date) }}</span>
              <span class="text-[0.6rem] uppercase leading-none opacity-90">{{ formatMonth(date) }}</span>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-800">{{ formatDayName(date) }}</h4>
              <p class="text-xs text-slate-500">{{ dayGroup.length }} pointage(s)</p>
            </div>
          </div>

          <!-- Résumé du jour -->
          <div class="flex items-center gap-2">
            <span
                v-if="getDayStatus(date)"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold"
                :class="getDayStatusClass(date)"
            >
              {{ getDayStatus(date) }}
            </span>
            <span v-if="getDayWorkHours(date)" class="text-xs font-semibold text-slate-600">
              {{ getDayWorkHours(date) }}
            </span>
          </div>
        </div>

        <!-- Timeline des événements -->
        <div class="relative pl-8 space-y-3">
          <!-- Ligne verticale -->
          <div class="absolute left-[0.9375rem] top-2 bottom-2 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200"></div>

          <div
              v-for="(entry, index) in dayGroup"
              :key="entry.guid"
              class="relative"
          >
            <!-- Point sur la timeline -->
            <div
                class="absolute -left-[1.875rem] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                :class="getEntryDotClass(entry.pointage_type)"
            ></div>

            <!-- Carte d'événement -->
            <div
                class="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200"
                :class="getEntryBorderClass(entry.pointage_type)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <!-- Icône -->
                  <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      :class="getEntryIconBgClass(entry.pointage_type)"
                  >
                    <span class="text-base">{{ getEntryIcon(entry.pointage_type) }}</span>
                  </div>

                  <!-- Détails -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-semibold text-slate-800">
                        {{ getEntryLabel(entry.pointage_type) }}
                      </span>
                      <span
                          v-if="entry.pointage_status !== 'accepted'"
                          class="px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase"
                          :class="getStatusBadgeClass(entry.pointage_status)"
                      >
                        {{ entry.pointage_status }}
                      </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span class="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {{ formatTime(entry.clocked_at) }}
                      </span>

                      <span v-if="entry.site" class="flex items-center gap-1 truncate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span class="truncate">{{ entry.site.name }}</span>
                      </span>

                      <span v-if="entry.device" class="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5 text-blue-600">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                          <line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                        {{ entry.device.name }}
                      </span>

                      <span
                          v-if="!entry.within_geofence"
                          class="flex items-center gap-1 text-orange-600 font-semibold"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Hors zone
                      </span>
                    </div>

                    <!-- Mémo associé -->
                    <div v-if="entry.memo" class="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                      <div class="flex items-start gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="9" y1="9" x2="15" y2="9"/>
                          <line x1="9" y1="13" x2="15" y2="13"/>
                        </svg>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-semibold text-amber-900">{{ entry.memo.title }}</p>
<!--                          <p class="text-xs text-amber-700 mt-0.5">{{ entry.memo?.guid }}</p>-->
                          <span
                              class="inline-block mt-1 px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase"
                              :class="getMemoStatusClass(entry.memo.memo_status)"
                          >
                            {{ entry.memo.memo_status }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <button
                    @click="openMemoForEntry(entry)"
                    class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 shrink-0"
                    title="Créer/Voir mémo"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="9" x2="15" y2="9"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= EMPTY STATE - NO ENTRIES ================= -->
    <div v-else class="flex flex-col items-center justify-center py-16 px-4">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8 text-slate-400">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="9" y1="9" x2="15" y2="9"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-slate-800 mb-1">Aucun pointage trouvé</p>
      <p class="text-sm text-slate-500 text-center">
        {{ selectedEmployee?.name }} n'a enregistré aucun pointage sur cette période
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from "@/stores/userStore"
import EntriesService from "@/service/EntriesService"
import type {
  PeriodAttendanceResponse,
  TransformedEmployee,
  PointageEntry,
} from '@/utils/interfaces/employeeAttendances'
import {
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
const employeeEntries = ref<PointageEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const lastUpdateMinutes = ref(0)
let updateInterval: number | null = null
let refreshInterval: number | null = null

// ================== COMPUTEDS ==================
const currentUserGuid = computed(() => userStore.user?.guid || '')

/**
 * Grouper les pointages par date
 */
const groupedByDay = computed(() => {
  const groups: Record<string, PointageEntry[]> = {}

  employeeEntries.value.forEach(entry => {
    const date = entry.clocked_at.split('T')[0] // YYYY-MM-DD
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
  })

  // Trier les entrées de chaque jour par heure
  Object.keys(groups).forEach(date => {
    groups[date].sort((a, b) =>
        new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
    )
  })

  return groups
})

// ================== DATA LOADING ==================

/**
 * Charge les pointages de l'employé sélectionné pour la période
 */
const loadEmployeeEntries = async () => {
  if (!props.selectedEmployee) {
    employeeEntries.value = []
    return
  }

  try {
    loading.value = true
    error.value = null

    // Récupérer tous les pointages de la période
    const response = await EntriesService.listEntries(
        currentUserGuid.value
    )

    // Vérifier la structure de la réponse
    if (!response?.success) {
      throw new Error('API returned unsuccessful response')
    }

    const apiResponse = response as PeriodAttendanceResponse

    // Filtrer uniquement les entrées de l'employé sélectionné
    const allEntries = apiResponse.data.data.entries || []
    employeeEntries.value = allEntries.filter(
        entry => entry.user?.guid === props.selectedEmployee?.guid
    )

    console.log(`Loaded ${employeeEntries.value.length} entries for ${props.selectedEmployee.name}`)

    // Réinitialiser le compteur de mise à jour
    lastUpdateMinutes.value = 0

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des pointages'
    console.error('Failed to load employee entries:', err)
  } finally {
    loading.value = false
  }
}

/**
 * Rafraîchit les données
 */
const refresh = async () => {
  await loadEmployeeEntries()
}

// ================== WATCH ==================

/**
 * Recharger les données quand l'employé sélectionné change
 */
watch(() => props.selectedEmployee, async (newEmployee) => {
  if (newEmployee) {
    await loadEmployeeEntries()
  } else {
    employeeEntries.value = []
  }
}, { immediate: true })

// ================== FORMATTING HELPERS ==================

/**
 * Formater la période affichée
 */
// const formatPeriod = () => {
//   const dates = Object.keys(groupedByDay.value).sort()
//   if (dates.length === 0) return 'Aucune période'
//
//   const start = new Date(dates[0] + 'T12:00:00')
//   const end = new Date(dates[dates.length - 1] + 'T12:00:00')
//
//   const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
//
//   if (start.getFullYear() === end.getFullYear() &&
//       start.getMonth() === end.getMonth() &&
//       start.getDate() === end.getDate()) {
//     return start.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })
//   }
//
//   return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })}`
// }

const formatPeriod = () => {
  const dates = Object.keys(groupedByDay.value).sort()

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

  if (dates.length === 0) {
    const today = new Date()
    return today.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })
  }

  const start = new Date(dates[0] + 'T12:00:00')
  const end = new Date(dates[dates.length - 1] + 'T12:00:00')

  if (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
  ) {
    return start.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })
  }

  return `${start.toLocaleDateString('fr-FR', options)} - ${end.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })}`
}

/**
 * Formater le numéro du jour
 */
const formatDayNumber = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.getDate().toString().padStart(2, '0')
}

/**
 * Formater le mois abrégé
 */
const formatMonth = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('fr-FR', { month: 'short' })
}

/**
 * Formater le nom du jour
 */
const formatDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Obtenir le statut du jour (présent, retard, absent, etc.)
 */
const getDayStatus = (dateStr: string) => {
  const entries = groupedByDay.value[dateStr] || []

  const hasClockIn = entries.some(e => e.pointage_type === 'clock_in')
  const hasClockOut = entries.some(e => e.pointage_type === 'clock_out')

  if (!hasClockIn) return 'Absent'
  if (hasClockOut) return 'Terminé'
  return 'En cours'
}

/**
 * Obtenir les classes CSS pour le statut du jour
 */
const getDayStatusClass = (dateStr: string) => {
  const status = getDayStatus(dateStr)

  return {
    'bg-red-50 text-red-700 border border-red-200': status === 'Absent',
    'bg-emerald-50 text-emerald-700 border border-emerald-200': status === 'Terminé',
    'bg-blue-50 text-blue-700 border border-blue-200': status === 'En cours',
  }
}

/**
 * Calculer les heures de travail du jour
 */
const getDayWorkHours = (dateStr: string) => {
  const entries = groupedByDay.value[dateStr] || []

  const clockIn = entries.find(e => e.pointage_type === 'clock_in')
  const clockOut = entries.find(e => e.pointage_type === 'clock_out')

  if (!clockIn || !clockOut) return null

  const start = new Date(clockIn.clocked_at)
  const end = new Date(clockOut.clocked_at)
  const diffMs = end.getTime() - start.getTime()
  const hours = diffMs / (1000 * 60 * 60)

  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)

  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}

// ================== ENTRY HELPERS ==================

/**
 * Obtenir l'icône pour un type de pointage
 */
const getEntryIcon = (type: string) => {
  const icons: Record<string, string> = {
    clock_in: '🚪',
    clock_out: '🏁',
    pause_start: '☕',
    pause_end: '▶️',
    external_mission: '🚗',
  }
  return icons[type] || '❔'
}

/**
 * Obtenir le label pour un type de pointage
 */
const getEntryLabel = (type: string) => {
  const labels: Record<string, string> = {
    clock_in: 'Arrivée',
    clock_out: 'Départ',
    pause_start: 'Début de pause',
    pause_end: 'Fin de pause',
    external_mission: 'Mission externe',
  }
  return labels[type] || type
}

/**
 * Classe CSS pour le point de la timeline
 */
const getEntryDotClass = (type: string) => {
  const classes: Record<string, string> = {
    clock_in: 'bg-emerald-500',
    clock_out: 'bg-slate-500',
    pause_start: 'bg-amber-500',
    pause_end: 'bg-blue-500',
    external_mission: 'bg-purple-500',
  }
  return classes[type] || 'bg-slate-300'
}

/**
 * Classe CSS pour la bordure de la carte
 */
const getEntryBorderClass = (type: string) => {
  const classes: Record<string, string> = {
    clock_in: 'border-l-4 border-l-emerald-500',
    clock_out: 'border-l-4 border-l-slate-500',
    pause_start: 'border-l-4 border-l-amber-500',
    pause_end: 'border-l-4 border-l-blue-500',
    external_mission: 'border-l-4 border-l-purple-500',
  }
  return classes[type] || 'border-l-4 border-l-slate-300'
}

/**
 * Classe CSS pour le fond de l'icône
 */
const getEntryIconBgClass = (type: string) => {
  const classes: Record<string, string> = {
    clock_in: 'bg-emerald-100',
    clock_out: 'bg-slate-100',
    pause_start: 'bg-amber-100',
    pause_end: 'bg-blue-100',
    external_mission: 'bg-purple-100',
  }
  return classes[type] || 'bg-slate-100'
}

/**
 * Classe CSS pour le badge de statut
 */
const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    accepted: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return classes[status] || 'bg-slate-100 text-slate-700'
}

/**
 * Classe CSS pour le statut du mémo
 */
const getMemoStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    submitted: 'bg-blue-100 text-blue-700',
    validated: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return classes[status] || 'bg-slate-100 text-slate-700'
}

// ================== MEMO ==================

/**
 * Ouvrir la page de création/consultation de mémo pour une entrée
 */
const openMemoForEntry = (entry: PointageEntry) => {
  router.push({
    path: '/memoNew',
    query: {
      employeeGuid: entry.user?.guid,
      employeeName: `${entry.user?.first_name} ${entry.user?.last_name}`,
      entryGuid: entry.guid,
      date: entry.clocked_at.split('T')[0],
    }
  })
}

// ================== AUTO-REFRESH ==================

const startAutoRefresh = () => {
  // Rafraîchir les données toutes les 30 secondes
  refreshInterval = window.setInterval(() => {
    if (props.selectedEmployee) {
      refresh()
    }
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

onMounted(() => {
  console.log("Mounting employeeViewPointage component...")
  startAutoRefresh()
})

onUnmounted(() => {
  console.log("Unmounting employeeViewPointage component...")
  stopAutoRefresh()
})
</script>

<style scoped>

</style>