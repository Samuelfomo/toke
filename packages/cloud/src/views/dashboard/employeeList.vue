<template>
  <div class="bg-white border border-slate-200 shadow-sm overflow-hidden">

    <!-- ── Header ── -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h4 class="text-sm font-bold text-slate-800 flex items-center gap-2">
        Équipe
        <span class="bg-slate-100 text-slate-500 text-xs font-semibold px-2 py-0.5 rounded-full">
          {{ employees.length }}
        </span>
      </h4>

      <!-- Lien vers vue complète -->
      <button
          class="flex items-center gap-1 text-xs font-semibold text-blue-600
               hover:text-blue-800 transition-colors"
          @click="$emit('view-all')"
      >
        Voir toute l'équipe
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             class="w-3.5 h-3.5">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>

    <!-- ── Table ── -->
    <div class="overflow-x-auto">
      <table class="w-full text-xs">

        <!-- En-têtes -->
        <thead>
        <tr class="bg-slate-50 border-b border-slate-100">
          <th class="text-left px-4 py-3 text-slate-500 font-semibold w-52">Employé</th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">Statut moyen</th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">
            <span class="hidden sm:inline">Jours planifiés</span>
            <span class="sm:hidden">Plan.</span>
          </th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">
            <span class="hidden sm:inline">À l'heure</span>
            <span class="sm:hidden">Prés.</span>
          </th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">Retards</th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">Absences</th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">Anomalies</th>
          <th class="text-center px-3 py-3 text-slate-500 font-semibold">
            <span class="hidden sm:inline">Heures travaillées</span>
            <span class="sm:hidden">Heures</span>
          </th>
          <th class="px-3 py-3"></th>
        </tr>
        </thead>

        <!-- Lignes -->
        <tbody class="divide-y divide-slate-50">
        <tr
            v-for="emp in sortedEmployees"
            :key="emp.guid"
            class="hover:bg-slate-50 cursor-pointer transition-colors group"
            @click="$emit('employee-click', emp)"
        >
          <!-- Employé (avatar + nom + poste) -->
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="relative shrink-0">
                <div
                    class="w-8 h-8 rounded-full flex items-center justify-center
                           text-xs font-bold border-2 border-white shadow-sm"
                    :class="avatarColorClass(emp.status)"
                >
                  <img
                      v-if="emp.avatar"
                      :src="emp.avatar"
                      :alt="emp.name"
                      class="w-full h-full rounded-full object-cover"
                  />
                  <span v-else>{{ emp.initials }}</span>
                </div>
                <!-- Point de statut -->
                <span
                    class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                           border-2 border-white"
                    :class="statusDotClass(emp.status)"
                ></span>
              </div>
              <div class="flex flex-col min-w-0">
                  <span class="font-semibold text-slate-800 truncate leading-tight">
                    {{ emp.name }}
                  </span>
                <span class="text-slate-400 truncate leading-tight">{{ emp.job_title }}</span>
              </div>
            </div>
          </td>

          <!-- Statut moyen -->
          <td class="px-3 py-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <span class="w-2 h-2 rounded-full shrink-0" :class="statusDotClass(emp.status)"></span>
              <span class="font-medium" :class="statusTextClass(emp.status)">
                  {{ emp.statusText }}
                </span>
            </div>
          </td>

          <!-- Jours planifiés -->
          <td class="px-3 py-3 text-center">
              <span class="font-semibold text-slate-700">
                {{ emp.period_stats?.work_days_expected ?? 0 }}
              </span>
          </td>

          <!-- Présences -->
          <td class="px-3 py-3 text-center">
              <span class="font-semibold text-emerald-600">
                {{ emp.period_stats?.present_days ?? 0 }}
              </span>
          </td>

          <!-- Retards -->
          <td class="px-3 py-3 text-center">
              <span
                  class="font-semibold"
                  :class="(emp.period_stats?.late_days ?? 0) > 0
                  ? 'text-amber-600'
                  : 'text-slate-300'"
              >
                {{ emp.period_stats?.late_days ?? 0 }}
              </span>
          </td>

          <!-- Absences -->
          <td class="px-3 py-3 text-center">
              <span
                  class="font-semibold"
                  :class="(emp.period_stats?.absent_days ?? 0) > 0
                  ? 'text-red-600'
                  : 'text-slate-300'"
              >
                {{ emp.period_stats?.absent_days ?? 0 }}
              </span>
          </td>

          <!-- Anomalies -->
          <td class="px-3 py-3 text-center">
              <span
                  class="font-semibold"
                  :class="(emp.period_stats?.anomaly_off_days ?? 0) > 0
                  ? 'text-orange-500'
                  : 'text-slate-300'"
              >
                {{ emp.period_stats?.anomaly_off_days ?? 0 }}
              </span>
          </td>

          <!-- Heures travaillées -->
          <td class="px-3 py-3 text-center">
              <span class="font-semibold text-slate-700">
                {{ formatHours(emp.period_stats?.total_work_hours ?? 0) }}
              </span>
          </td>

          <!-- Actions (mémo + menu) -->
          <td class="px-3 py-3">
            <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100
                          transition-opacity">
              <!-- Bouton mémo (absents uniquement) -->
              <button
                  v-if="emp.status === 'absent'"
                  class="flex items-center gap-1 text-xs font-semibold text-slate-500
                         bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                  @click.stop="$emit('memo-click', emp)"
                  title="Créer un mémo"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     class="w-3.5 h-3.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="9" y1="9" x2="15" y2="9"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                </svg>
                Mémo
              </button>

              <!-- Menu contextuel (3 points) -->
              <button
                  class="w-7 h-7 flex items-center justify-center text-slate-400
                         hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  @click.stop="$emit('action-click', emp)"
                  title="Actions"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                  <circle cx="12" cy="5" r="1.5"/>
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Empty state ── -->
    <div v-if="employees.length === 0"
         class="flex flex-col items-center justify-center py-12 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
           class="w-10 h-10 mb-3 text-slate-200">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
      </svg>
      <p class="text-sm font-medium">Aucun employé trouvé</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed }  from 'vue'
import { useRouter } from 'vue-router'
import type { TransformedEmployee } from '@/utils/interfaces/stat.interface'

interface Props {
  employees: TransformedEmployee[]
}

const props = defineProps<Props>()
const emit  = defineEmits<{
  'employee-click': [employee: TransformedEmployee]
  'memo-click'    : [employee: TransformedEmployee]
  'action-click'  : [employee: TransformedEmployee]
  'view-all'      : []
}>()

const router = useRouter()

// ── Tri : absents en premier (plus critique), puis retards, puis présents, puis OFF ──
const STATUS_PRIORITY: Record<string, number> = {
  absent          : 0,
  anomaly_off_day : 1,
  late            : 2,
  active          : 3,
  present         : 3,
  'on-pause'      : 4,
  'off-day'       : 5,
}

const sortedEmployees = computed(() =>
    [...props.employees].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 9
      const pb = STATUS_PRIORITY[b.status] ?? 9
      if (pa !== pb) return pa - pb
      return a.name.localeCompare(b.name, 'fr')
    })
)

// ── Formatage heures : "32h 15m" ──────────────────────────────────────────────
const formatHours = (total: number) => {
  const h = Math.floor(total)
  const m = Math.round((total - h) * 60)
  if (h === 0 && m === 0) return '0h 00m'
  if (m === 0) return `${h}h 00m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// ── Classes dynamiques ────────────────────────────────────────────────────────
const statusDotClass = (status: string) => ({
  'bg-emerald-500' : status === 'present' || status === 'active',
  'bg-amber-500'   : status === 'late',
  'bg-red-500'     : status === 'absent',
  'bg-orange-500'  : status === 'anomaly_off_day',
  'bg-blue-400'    : status === 'on-pause',
  'bg-slate-300'   : status === 'off-day',
})

const statusTextClass = (status: string) => ({
  'text-emerald-600' : status === 'present' || status === 'active',
  'text-amber-600'   : status === 'late',
  'text-red-600'     : status === 'absent',
  'text-orange-600'  : status === 'anomaly_off_day',
  'text-blue-500'    : status === 'on-pause',
  'text-slate-400'   : status === 'off-day',
})

const avatarColorClass = (status: string) => ({
  'bg-emerald-100 text-emerald-700' : status === 'present' || status === 'active',
  'bg-amber-100 text-amber-700'     : status === 'late',
  'bg-red-100 text-red-700'         : status === 'absent',
  'bg-orange-100 text-orange-700'   : status === 'anomaly_off_day',
  'bg-blue-100 text-blue-600'       : status === 'on-pause',
  'bg-slate-100 text-slate-500'     : status === 'off-day',
})
</script>