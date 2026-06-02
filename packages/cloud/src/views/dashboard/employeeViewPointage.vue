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
            {{ selectedEmployee ? 'Historique des pointages' : 'Détail pointage' }}
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            <template v-if="selectedEmployee">
              {{ selectedEmployee.name }} · {{ formatPeriod() }}
            </template>
            <template v-else>
              Sélectionnez un employé pour consulter ses entrées/sorties
            </template>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Indicateur auto-refresh pausé -->
        <span v-if="refreshPaused" class="text-xs text-amber-500 font-medium flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          Pause
        </span>
        <div v-else class="text-xs text-slate-400">
          ⏱ Mis à jour il y a {{ lastUpdateMinutes }} min
        </div>

        <!-- Toggle auto-refresh -->
        <button
            v-if="selectedEmployee"
            @click="toggleRefreshPause"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
            :title="refreshPaused ? 'Reprendre le rafraîchissement' : 'Mettre en pause'"
        >
          <svg v-if="refreshPaused" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>

        <!-- Refresh manuel -->
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
    <div v-else-if="loading && employeeEntries.length === 0" class="flex items-center justify-center py-16">
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

    <template v-else-if="employeeEntries.length > 0">

      <!-- ================= KPI SUMMARY ================= -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
        <div class="bg-white px-4 py-3 flex flex-col gap-0.5">
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Jours présents</span>
          <span class="text-xl font-bold text-slate-800">{{ stats.presentDays }}</span>
        </div>
        <div class="bg-white px-4 py-3 flex flex-col gap-0.5">
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Retards</span>
          <span class="text-xl font-bold" :class="stats.lateDays > 0 ? 'text-amber-600' : 'text-slate-800'">
            {{ stats.lateDays }}
          </span>
        </div>
        <div class="bg-white px-4 py-3 flex flex-col gap-0.5">
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Heures totales</span>
          <span class="text-xl font-bold text-slate-800">{{ stats.totalHours }}</span>
        </div>
        <div class="bg-white px-4 py-3 flex flex-col gap-0.5">
          <span class="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Anomalies</span>
          <span class="text-xl font-bold" :class="stats.anomalies > 0 ? 'text-red-500' : 'text-slate-800'">
            {{ stats.anomalies }}
          </span>
        </div>
      </div>

      <!-- ================= FILTRES ================= -->
      <div class="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">

        <!-- Filtre période -->
        <div class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          <button
              v-for="p in periodOptions"
              :key="p.value"
              @click="activePeriod = p.value as any"
              class="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
              :class="activePeriod === p.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'"
          >
            {{ p.label }}
          </button>
        </div>

        <!-- Filtre type de pointage -->
        <select
            v-model="activeTypeFilter"
            class="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les types</option>
          <option value="clock_in">Arrivées</option>
          <option value="clock_out">Départs</option>
          <option value="pause_start">Débuts de pause</option>
          <option value="pause_end">Fins de pause</option>
          <option value="external_mission">Missions externes</option>
        </select>

        <!-- Recherche par date -->
        <input
            v-model="searchDate"
            type="date"
            class="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Aller à une date précise"
        />

        <!-- Reset filtres -->
        <button
            v-if="hasActiveFilters"
            @click="resetFilters"
            class="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Effacer filtres
        </button>

        <!-- Nombre par page -->
        <select
            v-model="pageSize"
            class="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="n in PAGE_SIZE_OPTIONS" :key="n" :value="n">{{ n }} / page</option>
        </select>

        <span class="ml-auto text-xs text-slate-400">
          {{ filteredAndSortedDates.length }} jour(s) · {{ filteredEntries.length }} pointage(s)
        </span>
      </div>

      <!-- ================= POINTAGES TIMELINE ================= -->
      <div class="divide-y divide-slate-100">

        <!-- Aucun résultat après filtre -->
        <div v-if="filteredAndSortedDates.length === 0" class="flex flex-col items-center justify-center py-12 px-4">
          <p class="text-sm font-semibold text-slate-600 mb-1">Aucun résultat</p>
          <p class="text-xs text-slate-400">Modifiez les filtres pour voir d'autres entrées.</p>
        </div>

        <!-- Jours visibles (pagination) -->
        <div
            v-for="date in visibleDates"
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
                <p class="text-xs text-slate-500">{{ filteredGroupedByDay[date].length }} pointage(s)</p>
              </div>
            </div>

            <!-- Résumé + anomalies du jour -->
            <div class="flex items-center gap-2">
              <!-- Badges anomalies -->
              <span
                  v-for="anomaly in getDayAnomalies(date)"
                  :key="anomaly"
                  class="px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase bg-red-50 text-red-600 border border-red-100"
              >
                {{ anomaly }}
              </span>
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
            <div class="absolute left-[0.9375rem] top-2 bottom-2 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200"></div>

            <div
                v-for="entry in filteredGroupedByDay[date]"
                :key="entry.guid"
                class="relative"
            >
              <div
                  class="absolute -left-[1.875rem] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  :class="getEntryDotClass(entry.pointage_type)"
              ></div>

              <div
                  class="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200"
                  :class="getEntryBorderClass(entry.pointage_type)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        :class="getEntryIconBgClass(entry.pointage_type)"
                    >
                      <span class="text-base">{{ getEntryIcon(entry.pointage_type) }}</span>
                    </div>

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

                  <!-- Action mémo -->
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

        <!-- ================= PAGINATION - Charger plus ================= -->
        <div
            v-if="visibleDates.length < filteredAndSortedDates.length"
            class="flex flex-col items-center py-6 gap-2"
        >
          <p class="text-xs text-slate-400">
            {{ visibleDates.length }} / {{ filteredAndSortedDates.length }} jours affichés
          </p>
          <button
              @click="loadMoreDays"
              class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
<!--            Charger {{ Math.min(PAGE_SIZE, filteredAndSortedDates.length - visibleDates.length) }} jours de plus-->
            Charger {{ Math.min(pageSize, filteredAndSortedDates.length - visibleDates.length) }} jours de plus
          </button>
        </div>

      </div>
    </template>

    <!-- ================= EMPTY STATE - NO ENTRIES ================= -->
    <div v-else-if="selectedEmployee && !loading" class="flex flex-col items-center justify-center py-16 px-4">
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
import { formatTime } from '@/utils/interfaces/employeeAttendances'

const userStore = useUserStore()
const router = useRouter()

interface Props {
  selectedEmployee?: TransformedEmployee | null
}

const props = defineProps<Props>()
const emit = defineEmits(['employee-click', 'close'])

// ================== PAGINATION ==================
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const pageSize    = ref(10)
const currentPage = ref(1)

const loadMoreDays = () => {
  currentPage.value++
}

const visibleCount = computed(() => currentPage.value * pageSize.value)

// ================== FILTRES ==================
const periodOptions = [
  { label: 'Jour',    value: 'day'    },
  { label: 'Semaine', value: 'week'   },
  { label: 'Mois',    value: 'month'  },
  { label: 'Tout',    value: 'all'    },
]
const activePeriod     = ref<'day' | 'week' | 'month' | 'all'>('all')
const activeTypeFilter = ref('')
const searchDate       = ref('')

const hasActiveFilters = computed(() =>
    activePeriod.value !== 'all' || activeTypeFilter.value !== '' || searchDate.value !== ''
)

const resetFilters = () => {
  activePeriod.value     = 'all'
  activeTypeFilter.value = ''
  searchDate.value       = ''
  // visibleCount.value     = PAGE_SIZE
  currentPage.value = 1
}

// ================== AUTO-REFRESH ==================
const refreshPaused     = ref(false)
let refreshInterval: number | null = null
let updateInterval:  number | null = null

// Vrai timestamp de la dernière réponse API
const lastUpdateAt      = ref<Date | null>(null)
const lastUpdateMinutes = ref(0)

const toggleRefreshPause = () => {
  refreshPaused.value = !refreshPaused.value
}

const startAutoRefresh = () => {
  refreshInterval = window.setInterval(() => {
    // Ne rafraîchit pas si : pause manuelle, onglet caché, pas d'employé sélectionné
    if (refreshPaused.value) return
    if (document.visibilityState === 'hidden') return
    if (!props.selectedEmployee) return
    loadEmployeeEntries()
  }, 30_000)

  updateInterval = window.setInterval(() => {
    if (lastUpdateAt.value) {
      lastUpdateMinutes.value = Math.floor(
          (Date.now() - lastUpdateAt.value.getTime()) / 60_000
      )
    }
  }, 60_000)
}

const stopAutoRefresh = () => {
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null }
  if (updateInterval)  { clearInterval(updateInterval);  updateInterval  = null }
}

// ================== REACTIVES ==================
const employeeEntries = ref<PointageEntry[]>([])
const loading         = ref(false)
const error           = ref<string | null>(null)

// ================== COMPUTEDS ==================
const currentUserGuid = computed(() => userStore.user?.guid || '')

/** Toutes les entrées filtrées par période + type + date recherchée */
const filteredEntries = computed(() => {
  let entries = [...employeeEntries.value]

  // Filtre période
  if (activePeriod.value !== 'all') {
    const now   = new Date()
    let cutoff: Date
    if (activePeriod.value === 'day') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (activePeriod.value === 'week') {
      cutoff = new Date(now)
      cutoff.setDate(now.getDate() - 7)
    } else {
      cutoff = new Date(now)
      cutoff.setMonth(now.getMonth() - 1)
    }
    entries = entries.filter(e => new Date(e.clocked_at) >= cutoff)
  }

  // Filtre type
  if (activeTypeFilter.value) {
    entries = entries.filter(e => e.pointage_type === activeTypeFilter.value)
  }

  // Filtre date précise
  if (searchDate.value) {
    entries = entries.filter(e => e.clocked_at.startsWith(searchDate.value))
  }

  return entries
})

/** Groupement filtré par date, trié chronologiquement au sein du jour */
const filteredGroupedByDay = computed(() => {
  const groups: Record<string, PointageEntry[]> = {}
  for (const entry of filteredEntries.value) {
    const date = entry.clocked_at.split('T')[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(entry)
  }
  // Trier chaque groupe par heure
  for (const date of Object.keys(groups)) {
    groups[date].sort(
        (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
    )
  }
  return groups
})

/** Dates triées décroissantes (plus récent en premier) — ordre garanti */
const filteredAndSortedDates = computed(() =>
    Object.keys(filteredGroupedByDay.value).sort((a, b) => b.localeCompare(a))
)

/** Dates visibles selon la pagination */
const visibleDates = computed(() =>
    filteredAndSortedDates.value.slice(0, visibleCount.value)
)

// ================== KPI STATS ==================
const stats = computed(() => {
  const dates = Object.keys(filteredGroupedByDay.value)
  let presentDays = 0
  let lateDays    = 0
  let anomalies   = 0
  let totalMs     = 0

  for (const date of dates) {
    const dayEntries = filteredGroupedByDay.value[date]
    const hasIn      = dayEntries.some(e => e.pointage_type === 'clock_in')
    if (!hasIn) continue

    presentDays++

    // Calcul heures : somme des segments (chaque in → out, pauses déduites)
    const ms = calcDayWorkMs(date)
    totalMs += ms

    // Retard : 1er clock_in > 09:00 (à adapter à votre règle métier)
    const firstIn = dayEntries.find(e => e.pointage_type === 'clock_in')
    if (firstIn) {
      const h = new Date(firstIn.clocked_at).getHours()
      const m = new Date(firstIn.clocked_at).getMinutes()
      if (h > 9 || (h === 9 && m > 0)) lateDays++
    }

    // Anomalies détectées
    anomalies += getDayAnomalies(date).length
  }

  const totalH = Math.floor(totalMs / 3_600_000)
  const totalM = Math.round((totalMs % 3_600_000) / 60_000)

  return {
    presentDays,
    lateDays,
    totalHours: totalH > 0 ? `${totalH}h${totalM > 0 ? totalM : ''}` : '—',
    anomalies,
  }
})

// ================== DATA LOADING ==================
const loadEmployeeEntries = async () => {
  if (!props.selectedEmployee) { employeeEntries.value = []; return }

  try {
    loading.value = true
    error.value   = null

    const response = await EntriesService.listEntries(currentUserGuid.value)
    // const response = await EntriesService.listEntries(currentUserGuid.value)

    if (!response?.success) throw new Error('API returned unsuccessful response')

    const apiResponse = response as PeriodAttendanceResponse
    const allEntries  = apiResponse.data.data.entries || []

    employeeEntries.value = allEntries.filter(
        entry => entry.user?.guid === props.selectedEmployee?.guid
    )

    // Stocker le vrai timestamp de mise à jour
    lastUpdateAt.value      = new Date()
    lastUpdateMinutes.value = 0

    // Réinitialiser pagination à chaque rechargement
    currentPage.value = 1

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors du chargement des pointages'
    console.error('Failed to load employee entries:', err)
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  await loadEmployeeEntries()
}

// ================== WATCH ==================
watch(() => props.selectedEmployee, async (newEmployee) => {
  if (newEmployee) {
    resetFilters()
    await loadEmployeeEntries()
  } else {
    employeeEntries.value = []
  }
}, { immediate: true })

// Réinitialiser la pagination quand les filtres changent
watch([activePeriod, activeTypeFilter, searchDate, pageSize], () => {
  currentPage.value = 1
})

// ================== FORMATTING HELPERS ==================
const formatPeriod = () => {
  const dates = filteredAndSortedDates.value
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

  if (dates.length === 0) {
    return new Date().toLocaleDateString('fr-FR', { ...options, year: 'numeric' })
  }

  const start = new Date(dates[dates.length - 1] + 'T12:00:00')
  const end   = new Date(dates[0]                + 'T12:00:00')

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })
  }

  return `${start.toLocaleDateString('fr-FR', options)} – ${end.toLocaleDateString('fr-FR', { ...options, year: 'numeric' })}`
}

const formatDayNumber = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').getDate().toString().padStart(2, '0')

const formatMonth = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'short' })

const formatDayName = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })

// ================== DAY HELPERS ==================
const getDayStatus = (dateStr: string) => {
  const entries   = filteredGroupedByDay.value[dateStr] || []
  const hasIn     = entries.some(e => e.pointage_type === 'clock_in')
  const hasOut    = entries.some(e => e.pointage_type === 'clock_out')
  if (!hasIn)  return 'Absent'
  if (hasOut)  return 'Terminé'
  return 'En cours'
}

const getDayStatusClass = (dateStr: string) => {
  const s = getDayStatus(dateStr)
  return {
    'bg-red-50 text-red-700 border border-red-200'         : s === 'Absent',
    'bg-emerald-50 text-emerald-700 border border-emerald-200' : s === 'Terminé',
    'bg-blue-50 text-blue-700 border border-blue-200'      : s === 'En cours',
  }
}

/**
 * Calcul précis des heures travaillées : somme (clock_out - clock_in) - pauses
 */
const calcDayWorkMs = (dateStr: string): number => {
  const entries = filteredGroupedByDay.value[dateStr] || []

  const ins      = entries.filter(e => e.pointage_type === 'clock_in')
      .map(e => new Date(e.clocked_at).getTime()).sort()
  const outs     = entries.filter(e => e.pointage_type === 'clock_out')
      .map(e => new Date(e.clocked_at).getTime()).sort()
  const pauseStarts = entries.filter(e => e.pointage_type === 'pause_start')
      .map(e => new Date(e.clocked_at).getTime()).sort()
  const pauseEnds   = entries.filter(e => e.pointage_type === 'pause_end')
      .map(e => new Date(e.clocked_at).getTime()).sort()

  if (ins.length === 0 || outs.length === 0) return 0

  const start = ins[0]
  const end   = outs[outs.length - 1]
  if (end <= start) return 0

  let gross = end - start

  // Déduire les pauses appairées
  const pairs = Math.min(pauseStarts.length, pauseEnds.length)
  for (let i = 0; i < pairs; i++) {
    const pauseDur = pauseEnds[i] - pauseStarts[i]
    if (pauseDur > 0) gross -= pauseDur
  }

  return Math.max(0, gross)
}

const getDayWorkHours = (dateStr: string): string | null => {
  const ms = calcDayWorkMs(dateStr)
  if (ms === 0) return null
  const h = Math.floor(ms / 3_600_000)
  const m = Math.round((ms % 3_600_000) / 60_000)
  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}

/** Détecte les anomalies métier visuelles d'un jour */
const getDayAnomalies = (dateStr: string): string[] => {
  const entries = filteredGroupedByDay.value[dateStr] || []
  const anomalies: string[] = []

  const clockIns  = entries.filter(e => e.pointage_type === 'clock_in')
  const clockOuts = entries.filter(e => e.pointage_type === 'clock_out')

  if (clockIns.length > 1)  anomalies.push('Double arrivée')
  if (clockOuts.length > 1) anomalies.push('Double départ')
  if (clockIns.length > 0 && clockOuts.length === 0) anomalies.push('Sortie manquante')
  if (clockIns.length === 0 && clockOuts.length > 0) anomalies.push('Entrée manquante')

  // Sortie avant entrée
  if (clockIns.length > 0 && clockOuts.length > 0) {
    const firstIn  = new Date(clockIns[0].clocked_at).getTime()
    const firstOut = new Date(clockOuts[0].clocked_at).getTime()
    if (firstOut < firstIn) anomalies.push('Sortie < Entrée')
  }

  // Pauses incohérentes
  const pauseStarts = entries.filter(e => e.pointage_type === 'pause_start').length
  const pauseEnds   = entries.filter(e => e.pointage_type === 'pause_end').length
  if (pauseStarts !== pauseEnds) anomalies.push('Pause incomplète')

  return anomalies
}

// ================== ENTRY HELPERS ==================
const getEntryIcon = (type: string) => ({
  clock_in: '🚪', clock_out: '🏁', pause_start: '☕',
  pause_end: '▶️', external_mission: '🚗',
}[type] ?? '❔')

const getEntryLabel = (type: string) => ({
  clock_in: 'Arrivée', clock_out: 'Départ', pause_start: 'Début de pause',
  pause_end: 'Fin de pause', external_mission: 'Mission externe',
}[type] ?? type)

const getEntryDotClass = (type: string) => ({
  clock_in: 'bg-emerald-500', clock_out: 'bg-slate-500', pause_start: 'bg-amber-500',
  pause_end: 'bg-blue-500', external_mission: 'bg-purple-500',
}[type] ?? 'bg-slate-300')

const getEntryBorderClass = (type: string) => ({
  clock_in: 'border-l-4 border-l-emerald-500', clock_out: 'border-l-4 border-l-slate-500',
  pause_start: 'border-l-4 border-l-amber-500', pause_end: 'border-l-4 border-l-blue-500',
  external_mission: 'border-l-4 border-l-purple-500',
}[type] ?? 'border-l-4 border-l-slate-300')

const getEntryIconBgClass = (type: string) => ({
  clock_in: 'bg-emerald-100', clock_out: 'bg-slate-100', pause_start: 'bg-amber-100',
  pause_end: 'bg-blue-100', external_mission: 'bg-purple-100',
}[type] ?? 'bg-slate-100')

const getStatusBadgeClass = (status: string) => ({
  accepted: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
}[status] ?? 'bg-slate-100 text-slate-700')

const getMemoStatusClass = (status: string) => ({
  pending: 'bg-amber-100 text-amber-700', submitted: 'bg-blue-100 text-blue-700',
  validated: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
}[status] ?? 'bg-slate-100 text-slate-700')

// ================== MEMO ==================
// const openMemoForEntry = (entry: PointageEntry) => {
//   router.push({
//     path: '/memoNew',
//     query: {
//       employeeGuid: entry.user?.guid,
//       employeeName: `${entry.user?.first_name} ${entry.user?.last_name}`,
//       entryGuid: entry.guid,
//       date: entry.clocked_at.split('T')[0],
//     },
//   })
// }

const openMemoForEntry = (entry: PointageEntry) => {
  router.push({
    name: 'memoList',
    query: {
      action: 'create',
      employeeGuid: entry.user?.guid,
      employeeName: `${entry.user?.first_name} ${entry.user?.last_name}`,
      entryGuid: entry.guid,
      date: entry.clocked_at.split('T')[0],
    }
  })
}

// ================== LIFECYCLE ==================
onMounted(() => {
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
</style>