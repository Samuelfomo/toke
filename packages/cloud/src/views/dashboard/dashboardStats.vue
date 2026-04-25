<template>
  <section class="flex flex-col gap-4 py-5">

    <!-- ═══════════════════ ROW 1 : Doughnut + Line chart ═══════════════════ -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">

      <!-- ── Répartition des statuts (doughnut unique) ── -->
      <div class="bg-white border border-slate-200 rounded-md p-5 shadow-sm
                  hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">

        <h4 class="text-sm font-bold text-slate-800 mb-4">Répartition des statuts</h4>

        <div class="flex items-center gap-5">
          <!-- Doughnut -->
          <div class="relative w-[160px] h-[160px] shrink-0">
            <Doughnut :data="statusDistributionData" :options="doughnutOptions" />
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-2xl font-extrabold text-slate-900">{{ totalMembers }}</span>
              <span class="text-xs text-slate-400 font-medium">Employés</span>
            </div>
          </div>

          <!-- Légende -->
          <div class="flex flex-col gap-2 flex-1 min-w-0">

            <!-- À l'heure -->
            <div class="flex items-center justify-between gap-2 bg-emerald-50 rounded-xl px-3 py-2">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span class="text-xs font-medium text-slate-600">À l'heure</span>
              </div>
              <span class="text-xs font-bold text-slate-800">
                {{ summary.total_present_on_time }}
                <span class="text-slate-400 font-normal">({{ percent(summary.total_present_on_time) }}%)</span>
              </span>
            </div>

            <!-- En retard -->
            <div class="flex items-center justify-between gap-2 bg-amber-50 rounded-xl px-3 py-2">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span class="text-xs font-medium text-slate-600">En retard</span>
              </div>
              <span class="text-xs font-bold text-slate-800">
                {{ summary.total_late_arrivals }}
                <span class="text-slate-400 font-normal">({{ percent(summary.total_late_arrivals) }}%)</span>
              </span>
            </div>

            <!-- Absents -->
            <div class="flex items-center justify-between gap-2 bg-red-50 rounded-xl px-3 py-2">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                <span class="text-xs font-medium text-slate-600">Absents</span>
              </div>
              <span class="text-xs font-bold text-slate-800">
                {{ summary.total_absences }}
                <span class="text-slate-400 font-normal">({{ percent(summary.total_absences) }}%)</span>
              </span>
            </div>

            <!-- Jour OFF -->
            <div class="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
                <span class="text-xs font-medium text-slate-600">Jour OFF</span>
              </div>
              <span class="text-xs font-bold text-slate-800">
                {{ summary.total_off_days }}
                <span class="text-slate-400 font-normal">({{ percent(summary.total_off_days) }}%)</span>
              </span>
            </div>

            <!-- Anomalies (si présent) -->
            <div
                v-if="(summary.total_anomaly_off_days ?? 0) > 0"
                class="flex items-center justify-between gap-2 bg-orange-50 rounded-xl px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
                <span class="text-xs font-medium text-slate-600">Hors planning</span>
              </div>
              <span class="text-xs font-bold text-orange-700">
                {{ summary.total_anomaly_off_days }}
              </span>
            </div>

          </div>
        </div>

        <!-- Insight actionable ponctualité -->
        <div
            v-if="summary.average_delay_minutes > 0"
            class="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100
                 rounded-xl px-3 py-2.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-4 h-4 text-amber-600 shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="text-xs text-amber-800">
            Retard moyen :
            <strong>{{ Math.round(summary.average_delay_minutes) }} min</strong>
            — Envisager un rappel matinal
          </span>
        </div>
      </div>

      <!-- ── Évolution quotidienne (line chart) ── -->
      <div class="xl:col-span-2 bg-white border border-slate-200 rounded-md p-5 shadow-sm
                  hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">

        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <h4 class="text-sm font-bold text-slate-800">Évolution quotidienne de la présence</h4>

          <!-- Mini-résumé en ligne -->
          <div class="flex flex-wrap gap-3">
            <div class="flex flex-col items-end">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Présence</span>
              <strong class="text-sm font-extrabold text-emerald-600">{{ attendanceRate }}%</strong>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Ponctualité</span>
              <strong class="text-sm font-extrabold text-blue-600">{{ punctualityRate }}%</strong>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Absences</span>
              <strong class="text-sm font-extrabold text-red-500">{{ summary.total_absences }}</strong>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Anomalies</span>
              <strong
                  class="text-sm font-extrabold"
                  :class="(summary.total_anomaly_off_days ?? 0) > 0 ? 'text-orange-500' : 'text-slate-300'"
              >
                {{ summary.total_anomaly_off_days ?? 0 }}
              </strong>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Jours ouvrés</span>
              <strong class="text-sm font-extrabold text-slate-700">{{ workdayCount }}</strong>
            </div>
          </div>
        </div>

        <!-- Line chart -->
        <div class="h-[200px]">
          <Line v-if="lineChartData" :data="lineChartData" :options="lineChartOptions as any" />
        </div>

        <!-- Insight absences actionable -->
        <div
            v-if="(summary.justification_status?.without_memo ?? 0) > 0"
            class="mt-3 flex items-start gap-2 bg-red-50 border border-red-100
                 rounded-xl px-3 py-2.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-4 h-4 text-red-600 shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span class="text-xs text-red-800">
            <strong>{{ summary.justification_status.without_memo }}</strong>
            absence(s) sans mémo sur
            <strong>{{ summary.total_absences }}</strong> au total —
            <strong>{{ summary.justification_status.pending_validation }}</strong> en attente de validation.
          </span>
        </div>
      </div>
    </div>

    <!-- ═══════════════════ ROW 2 : Absents + Anomalies (conditionnels) ═══════════════════ -->
    <div
        v-if="absentEmployees.length > 0 || (summary.total_anomaly_off_days ?? 0) > 0"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >

      <!-- ── Absents du jour ── -->
      <div
          v-if="absentEmployees.length > 0"
          class="bg-white border border-red-50 rounded-md p-5 shadow-sm"
      >
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            Absents
            <span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {{ absentEmployees.length }}
            </span>
          </h4>
          <!-- Alerte 50%+ -->
          <span
              v-if="absentEmployees.length >= Math.ceil(summary.total_team_members / 2)"
              class="text-xs font-bold text-red-600 bg-red-50 border border-red-200
                   px-2 py-1 rounded-lg"
          >
            ⚠ +50% absents
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <div
              v-for="emp in absentEmployees"
              :key="emp.guid"
              class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50
                   hover:bg-red-50 cursor-pointer transition-colors"
              @click="$emit('employee-click', emp)"
          >
            <!-- Avatar -->
            <div class="w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-bold
                        flex items-center justify-center shrink-0">
              {{ emp.initials }}
            </div>
            <!-- Info -->
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-semibold text-slate-800 truncate">{{ emp.name }}</span>
              <span class="text-xs text-slate-400 truncate">{{ emp.job_title }}</span>
            </div>
            <!-- Badge -->
            <span class="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
              Absent
            </span>
          </div>
        </div>

        <!-- Insight critique -->
        <div
            v-if="absentEmployees.length >= Math.ceil(summary.total_team_members / 2)"
            class="mt-3 flex items-start gap-2 bg-red-50 border border-red-100
                 rounded-xl px-3 py-2.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-4 h-4 text-red-600 shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          <span class="text-xs text-red-800 font-medium">
            Plus de 50% d'absents — vérifier les justificatifs
          </span>
        </div>
      </div>

      <!-- ── Présences hors planning ── -->
      <div
          v-if="(summary.total_anomaly_off_days ?? 0) > 0"
          class="bg-white border border-orange-50 rounded-md p-5 shadow-sm"
      >
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
            Présences hors planning
            <span class="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {{ summary.total_anomaly_off_days }}
            </span>
          </h4>
          <span
              v-if="summary.unexpected_presence?.status === 'critical'"
              class="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200
                   px-2 py-1 rounded-lg"
          >
            🔴 Critique
          </span>
          <span
              v-else-if="summary.unexpected_presence?.status === 'warning'"
              class="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200
                   px-2 py-1 rounded-lg"
          >
            🟡 Attention
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <div
              v-for="occ in (summary.unexpected_presence?.occurrences ?? []).slice(0, 5)"
              :key="occ.employee_guid + occ.date"
              class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50"
          >
            <!-- Avatar -->
            <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-bold
                        flex items-center justify-center shrink-0">
              {{ occ.employee_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}
            </div>
            <!-- Info -->
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-semibold text-slate-800 truncate">{{ occ.employee_name }}</span>
              <span class="text-xs text-slate-400">{{ formatDateShort(occ.date) }}</span>
            </div>
            <!-- Badge + heures -->
            <div class="flex flex-col items-end gap-0.5 shrink-0">
              <span class="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                OFF Day
              </span>
              <span class="text-[0.65rem] text-slate-400" v-if="occ.clock_in_time">
                {{ occ.clock_in_time?.slice(0, 5) }} →
                {{ occ.clock_out_time?.slice(0, 5) ?? '—' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Insight actionable -->
        <div
            v-if="summary.unexpected_presence?.status === 'critical'"
            class="mt-3 flex items-start gap-2 bg-orange-50 border border-orange-100
                 rounded-xl px-3 py-2.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="w-4 h-4 text-orange-600 shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span class="text-xs text-orange-800 font-medium">
            Statut <strong>critique</strong> —
            {{ summary.unexpected_presence?.action?.label }}
          </span>
        </div>
      </div>

    </div>

  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Summary, TransformedEmployee } from '@/utils/interfaces/stat.interface'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(
    Title, Tooltip, Legend,
    LineElement, PointElement,
    CategoryScale, LinearScale,
    ArcElement, Filler
)

interface DailyBreakdown {
  date: string
  day_of_week: string
  expected_count: number
  present: number
  late: number
  absent: number
  off_day: number
  anomaly_off_day: number
}

interface Props {
  summary: Summary
  employees: TransformedEmployee[]
  dailyBreakdown?: DailyBreakdown[]
}

const props = defineProps<Props>()
const emit  = defineEmits<{ 'employee-click': [employee: TransformedEmployee] }>()

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDateShort = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

// ── Calculs ───────────────────────────────────────────────────────────────────
const totalMembers = computed(() => props.summary.total_team_members)

const totalPresent = computed(() =>
    (props.summary.total_present_on_time ?? 0) + (props.summary.total_late_arrivals ?? 0)
)

const attendanceRate = computed(() => {
  const exp = props.summary.total_expected_workdays
  if (!exp) return 0
  return Math.round((totalPresent.value / exp) * 100)
})

const punctualityRate = computed(() => {
  if (!totalPresent.value) return 0
  return Math.round(((props.summary.total_present_on_time ?? 0) / totalPresent.value) * 100)
})

const workdayCount = computed(() =>
    (props.dailyBreakdown ?? []).filter(d => d.expected_count > 0).length
)

const absentEmployees = computed(() =>
    props.employees.filter(e => e.status === 'absent')
)

// Dénominateur : tous les statuts pour les pourcentages
const totalAll = computed(() =>
    (props.summary.total_present_on_time ?? 0) +
    (props.summary.total_late_arrivals   ?? 0) +
    (props.summary.total_absences        ?? 0) +
    (props.summary.total_off_days        ?? 0)
)
const percent = (value: number) => {
  if (!totalAll.value) return 0
  return Math.round((value / totalAll.value) * 100)
}

// ── Couleurs communes ──────────────────────────────────────────────────────────
const C = {
  present : '#22c55e',
  late    : '#f59e0b',
  absent  : '#ef4444',
  anomaly : '#f97316',
  rest    : '#cbd5e1',
}

// ── Doughnut : répartition complète (1 seul) ──────────────────────────────────
const statusDistributionData = computed(() => ({
  labels: ['À l\'heure', 'En retard', 'Absents', 'Jour OFF'],
  datasets: [{
    data: [
      props.summary.total_present_on_time,
      props.summary.total_late_arrivals,
      props.summary.total_absences,
      props.summary.total_off_days,
    ],
    backgroundColor: [C.present, C.late, C.absent, C.rest],
    borderWidth: 0,
    hoverOffset: 6,
  }],
}))

const doughnutOptions = {
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      callbacks: {
        label: (ctx: any) => {
          const val   = ctx.parsed
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const pct   = total > 0 ? Math.round((val / total) * 100) : 0
          return `${ctx.label}: ${val} (${pct}%)`
        },
      },
    },
  },
}

// ── Line chart : évolution quotidienne ───────────────────────────────────────
const lineChartData = computed(() => {
  // Jours ouvrables seulement, limité aux 20 derniers
  const workdays = (props.dailyBreakdown ?? [])
      .filter(d => d.expected_count > 0)
      .slice(-20)

  const labels = workdays.map(d =>
      new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  )

  return {
    labels,
    datasets: [
      {
        label: 'Présents',
        data: workdays.map(d => d.present + d.late), // présents à l'heure + retards
        borderColor   : C.present,
        backgroundColor: 'rgba(34,197,94,0.08)',
        fill          : true,
        tension       : 0.4,
        pointRadius   : 4,
        pointHoverRadius: 6,
        borderWidth   : 2,
      },
      {
        label: 'En retard',
        data: workdays.map(d => d.late),
        borderColor   : C.late,
        backgroundColor: 'transparent',
        fill          : false,
        tension       : 0.4,
        pointRadius   : 4,
        pointHoverRadius: 6,
        borderWidth   : 2,
        borderDash    : [4, 3],
      },
      {
        label: 'Anomalies',
        data: workdays.map(d => d.anomaly_off_day),
        borderColor   : C.anomaly,
        backgroundColor: 'transparent',
        fill          : false,
        tension       : 0.4,
        pointRadius   : 4,
        pointHoverRadius: 6,
        borderWidth   : 2,
        borderDash    : [2, 3],
      },
    ],
  }
})

const lineChartOptions = {
  responsive         : true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display : true,
      position: 'top' as const,
      labels  : { usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, boxWidth: 8 },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      padding        : 10,
      callbacks      : {
        label: (ctx: any) => `${ctx.dataset.label} : ${ctx.parsed.y}`,
      },
    },
  },
  scales: {
    x: {
      grid : { display: false },
      ticks: { font: { size: 11 }, color: '#94a3b8' },
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
      grid : { color: '#f1f5f9' },
    },
  },
}
</script>