<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import type {
  AttendanceDashboardAction,
  AttendancePrimaryKpiId,
} from '../utils/attendance-dashboard-actions.js';
import { getAttendanceKpiPrimaryAction } from '../utils/attendance-dashboard-actions.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  overview: AttendanceOverview;
  kpiId: AttendancePrimaryKpiId | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  action: [action: AttendanceDashboardAction];
  close: [];
}>();
const panelRef = ref<HTMLElement | null>(null);

watch(
  () => props.kpiId,
  async (id) => {
    if (!id) return;
    await nextTick();
    panelRef.value?.focus({ preventScroll: true });
  },
);

const action = computed(() => {
  if (!props.kpiId) return null;
  if ((props.kpiId === 'attendance_rate' || props.kpiId === 'absences') && props.overview.summary.statusTotals.ABSENT === 0) return null;
  if ((props.kpiId === 'punctuality_rate' || props.kpiId === 'late_days') && props.overview.summary.statusTotals.LATE === 0) return null;
  if (props.kpiId === 'issues' && props.overview.summary.issueCount === 0) return null;
  return getAttendanceKpiPrimaryAction(props.kpiId);
});
const employeesWithAbsence = computed(() => props.overview.employees.filter((employee) => employee.statusTotals.ABSENT > 0).length);
const employeesWithLate = computed(() => props.overview.employees.filter((employee) => employee.statusTotals.LATE > 0).length);

const title = computed(() => {
  switch (props.kpiId) {
    case 'attendance_rate': return 'Pourquoi ce taux de présence ?';
    case 'punctuality_rate': return 'Pourquoi ce taux de ponctualité ?';
    case 'absences': return 'D’où viennent ces absences ?';
    case 'late_days': return 'D’où viennent ces retards ?';
    case 'issues': return 'Que faut-il examiner ?';
    default: return '';
  }
});
</script>

<template>
  <section
    v-if="kpiId"
    ref="panelRef"
    tabindex="-1"
    class="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-6"
    aria-live="polite"
    aria-labelledby="attendance-kpi-drilldown-title"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Explication du signal</p>
        <h3 id="attendance-kpi-drilldown-title" class="mt-1 text-lg font-bold text-slate-950">{{ title }}</h3>
      </div>
      <button type="button" class="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="emit('close')">Fermer</button>
    </div>

    <div v-if="kpiId === 'attendance_rate'" class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Taux API</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ formatPercentage(overview.summary.rates.attendanceRate) }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Journées suivies</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ overview.summary.rates.attendedWorkingDays }}</p><p class="mt-1 text-xs text-slate-500">sur {{ overview.summary.rates.employeeWorkingDaysExpected }} attendues</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">À l’heure</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ overview.summary.statusTotals.PRESENT }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Absences finalisées</p><p class="mt-1 text-2xl font-bold text-rose-700">{{ overview.summary.statusTotals.ABSENT }}</p></div>
      <p class="sm:col-span-2 lg:col-span-4 text-sm leading-6 text-slate-700">Le taux affiché reste celui calculé par l’API. Ce panneau expose simplement ses composantes déjà retournées afin d’expliquer le résultat sans le recalculer dans Vue.</p>
    </div>

    <div v-else-if="kpiId === 'punctuality_rate'" class="mt-5 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Ponctualité API</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ formatPercentage(overview.summary.rates.punctualityRate) }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">À l’heure</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ overview.summary.rates.onTimeWorkingDays }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Retards</p><p class="mt-1 text-2xl font-bold text-amber-700">{{ overview.summary.rates.lateWorkingDays }}</p><p class="mt-1 text-xs text-slate-500">{{ employeesWithLate }} employé{{ employeesWithLate > 1 ? 's' : '' }} concerné{{ employeesWithLate > 1 ? 's' : '' }}</p></div>
    </div>

    <div v-else-if="kpiId === 'absences'" class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Journées ABSENT</p><p class="mt-1 text-3xl font-bold text-rose-700">{{ overview.summary.statusTotals.ABSENT }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Employés concernés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ employeesWithAbsence }}</p><p class="mt-1 text-xs text-slate-500">PENDING, REST_DAY et UNDETERMINED ne sont pas inclus.</p></div>
    </div>

    <div v-else-if="kpiId === 'late_days'" class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Journées LATE</p><p class="mt-1 text-3xl font-bold text-amber-700">{{ overview.summary.statusTotals.LATE }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Employés concernés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ employeesWithLate }}</p><p class="mt-1 text-xs text-slate-500">Un retard reste une présence dans le taux de présence.</p></div>
    </div>

    <div v-else class="mt-5 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Occurrences API</p><p class="mt-1 text-3xl font-bold text-orange-700">{{ overview.summary.issueCount }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Types d’anomalies</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.issues.length }}</p></div>
      <div class="rounded-xl bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Employés concernés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.employees.filter((employee) => employee.issueCount > 0).length }}</p></div>
    </div>

    <div v-if="action" class="mt-5 flex flex-wrap items-center gap-3 border-t border-indigo-200 pt-4">
      <button type="button" class="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" @click="emit('action', action)">{{ action.label }} →</button>
      <p class="text-xs text-slate-600">L’action conserve le même jeu de données déjà chargé ; aucun second appel API n’est nécessaire.</p>
    </div>
  </section>
</template>
