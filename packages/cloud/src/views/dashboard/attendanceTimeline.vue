<template>
  <div class="bg-white border border-slate-200 shadow-sm overflow-hidden">

    <!-- ── Header ── -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h4 class="text-sm font-bold text-slate-800">Timeline des arrivées</h4>
      <button
          class="flex items-center gap-1 text-xs font-semibold text-blue-600
               hover:text-blue-800 transition-colors"
          @click="$emit('view-all')"
      >
        Voir la timeline complète
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             class="w-3.5 h-3.5">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>

    <!-- ── Empty state ── -->
    <div
        v-if="groupedEntries.length === 0"
        class="flex flex-col items-center justify-center py-12 text-slate-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
           class="w-10 h-10 mb-3 text-slate-200">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <p class="text-sm font-medium">Aucune arrivée enregistrée</p>
    </div>

    <!-- ── Groupes par date ── -->
    <div v-else class="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
      <div v-for="group in groupedEntries" :key="group.date">

        <!-- Label de date -->
        <div class="px-5 py-2 bg-slate-50 sticky top-0 z-10">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
            {{ formatGroupDate(group.date) }}
          </span>
        </div>

        <!-- Entrées du groupe -->
        <div class="divide-y divide-slate-50">
          <div
              v-for="entry in group.entries"
              :key="entry.employeeGuid + group.date"
              class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50
                   cursor-pointer transition-colors"
              @click="$emit('employee-click', entry.employee)"
          >
            <!-- Indicateur de statut (ligne verticale + point) -->
            <div class="flex flex-col items-center gap-0.5 shrink-0">
              <span
                  class="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  :class="entryDotClass(entry.status)"
              ></span>
            </div>

            <!-- Heure d'arrivée -->
            <span class="text-xs font-bold text-slate-700 w-10 shrink-0 text-right">
              {{ entry.clockIn ?? '—' }}
            </span>

            <!-- Nom + infos -->
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-semibold text-slate-800 truncate leading-tight">
                {{ entry.name }}
              </span>
              <span
                  v-if="entry.delayMinutes && entry.delayMinutes > 0"
                  class="text-xs text-amber-600 leading-tight"
              >
                +{{ entry.delayMinutes }} min
              </span>
              <span v-else-if="entry.status === 'anomaly_off_day'" class="text-xs text-orange-500 leading-tight">
                Jour OFF
              </span>
            </div>

            <!-- Badge statut -->
            <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                :class="entryBadgeClass(entry.status)"
            >
              {{ entryBadgeLabel(entry.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TransformedEmployee } from '@/utils/interfaces/stat.interface'

interface Props {
  employees: TransformedEmployee[]
  /** Nombre de jours à afficher dans la timeline (défaut : 7) */
  daysBack?: number
}

const props = defineProps<Props>()
const emit  = defineEmits<{
  'employee-click': [employee: TransformedEmployee]
  'view-all'      : []
}>()

// ── Types internes ────────────────────────────────────────────────────────────
interface TimelineEntry {
  employeeGuid  : string
  name          : string
  clockIn       : string | null
  status        : string
  delayMinutes  : number | null
  employee      : TransformedEmployee
}

interface TimelineGroup {
  date    : string   // "YYYY-MM-DD"
  entries : TimelineEntry[]
}

// ── Construction de la timeline ───────────────────────────────────────────────
const groupedEntries = computed<TimelineGroup[]>(() => {
  const daysBack = props.daysBack ?? 7
  const today    = new Date()

  // Fenêtre : les N derniers jours calendaires
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  // Map date → entries
  const map = new Map<string, TimelineEntry[]>()

  for (const emp of props.employees) {
    for (const detail of emp.daily_details ?? []) {
      if (detail.date < cutoffStr) continue
      // On inclut les pointés ET les anomalies off-day
      if (!detail.clock_in_time && detail.status !== 'anomaly_off_day') continue

      if (!map.has(detail.date)) map.set(detail.date, [])

      map.get(detail.date)!.push({
        employeeGuid : emp.guid,
        name         : emp.name,
        clockIn      : detail.clock_in_time
            ? detail.clock_in_time.slice(0, 5)
            : null,
        status       : detail.status,
        delayMinutes : detail.delay_minutes ?? null,
        employee     : emp,
      })
    }
  }

  // Trier les dates décroissantes (plus récent en premier)
  const sortedDates = [...map.keys()].sort((a, b) => b.localeCompare(a))

  return sortedDates.map(date => {
    const entries = map.get(date)!
    // Pour chaque date : trier par heure d'arrivée croissante
    entries.sort((a, b) => {
      if (!a.clockIn && !b.clockIn) return 0
      if (!a.clockIn) return 1
      if (!b.clockIn) return -1
      return a.clockIn.localeCompare(b.clockIn)
    })
    return { date, entries }
  })
})

// ── Formatage ─────────────────────────────────────────────────────────────────
const formatGroupDate = (iso: string) => {
  const d    = new Date(iso + 'T12:00:00')
  const today = new Date().toISOString().split('T')[0]
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (iso === today) return 'Aujourd\'hui'
  if (iso === yest)  return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()
}

// ── Classes dynamiques ────────────────────────────────────────────────────────
const entryDotClass = (status: string) => ({
  'bg-emerald-500' : status === 'present',
  'bg-amber-500'   : status === 'late',
  'bg-red-500'     : status === 'absent',
  'bg-orange-500'  : status === 'anomaly_off_day',
  'bg-blue-400'    : status === 'on-pause' || status === 'active',
  'bg-slate-300'   : status === 'off-day',
})

const entryBadgeClass = (status: string) => ({
  'bg-emerald-100 text-emerald-700' : status === 'present',
  'bg-amber-100 text-amber-700'     : status === 'late',
  'bg-red-100 text-red-700'         : status === 'absent',
  'bg-orange-100 text-orange-700'   : status === 'anomaly_off_day',
  'bg-blue-100 text-blue-600'       : status === 'on-pause' || status === 'active',
  'bg-slate-100 text-slate-500'     : status === 'off-day',
})

const entryBadgeLabel = (status: string): string => {
  const labels: Record<string, string> = {
    present         : 'Présent',
    late            : 'En retard',
    absent          : 'Absent',
    anomaly_off_day : 'Anomalie',
    'on-pause'      : 'En pause',
    active          : 'Actif',
    'off-day'       : 'Jour OFF',
  }
  return labels[status] ?? status
}
</script>