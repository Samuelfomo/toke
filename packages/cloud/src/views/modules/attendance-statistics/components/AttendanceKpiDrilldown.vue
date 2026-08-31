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
const isSingleDay = computed(() => props.overview.period.dayCount === 1);

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
  if (props.kpiId === 'punctuality_rate' && props.overview.summary.rates.lateWorkingDays === 0) return null;
  if (props.kpiId === 'late_days' && props.overview.summary.statusTotals.LATE === 0) return null;
  if (props.kpiId === 'issues' && props.overview.summary.issueCount === 0) return null;
  return getAttendanceKpiPrimaryAction(props.kpiId);
});
const employeesWithAbsence = computed(() =>
  props.overview.employees.filter((employee) =>
    employee.days.some((day) => day.status === 'ABSENT' && day.rateEligible),
  ).length,
);
const employeesWithObservedLate = computed(() =>
  props.overview.employees.filter((employee) => employee.days.some((day) => day.status === 'LATE')).length,
);
const employeesWithConsolidatedLate = computed(() =>
  props.overview.employees.filter((employee) =>
    employee.days.some((day) => day.status === 'LATE' && day.rateEligible),
  ).length,
);

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
    class="rounded-lg border border-indigo-200 bg-indigo-50/60 p-5 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-6"
    aria-live="polite"
    aria-labelledby="attendance-kpi-drilldown-title"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Explication du signal</p>
        <h3 id="attendance-kpi-drilldown-title" class="mt-0.5 text-lg font-bold text-slate-950">{{ title }}</h3>
      </div>
      <button type="button" class="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 bg-white/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="emit('close')">Fermer</button>
    </div>

    <div v-if="kpiId === 'attendance_rate'" class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Taux consolidé</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ formatPercentage(overview.summary.rates.attendanceRate) }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">{{ isSingleDay ? 'Collaborateurs avec présence' : 'Présences consolidées' }}</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ overview.summary.rates.attendedWorkingDays }}</p><p class="mt-1 text-xs text-slate-500">{{ isSingleDay ? `sur ${overview.summary.rates.employeeWorkingDaysExpected} situations du jour finalisées` : `sur ${overview.summary.rates.employeeWorkingDaysExpected} journées finalisées` }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">{{ isSingleDay ? 'Arrivées à l’heure' : 'À l’heure consolidées' }}</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ overview.summary.rates.onTimeWorkingDays }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Absences finalisées</p><p class="mt-1 text-2xl font-bold text-rose-700">{{ overview.summary.statusTotals.ABSENT }}</p></div>
      <p class="sm:col-span-2 lg:col-span-4 text-sm leading-6 text-slate-700">Ce détail vous aide à comprendre comment le résultat affiché est constitué.</p>
    </div>

    <div v-else-if="kpiId === 'punctuality_rate'" class="mt-5 grid gap-3 sm:grid-cols-3">
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Taux consolidé</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ formatPercentage(overview.summary.rates.punctualityRate) }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">{{ isSingleDay ? 'Arrivées à l’heure' : 'Journées à l’heure' }}</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ overview.summary.rates.onTimeWorkingDays }}</p><p v-if="isSingleDay" class="mt-1 text-xs text-slate-500">sur {{ overview.summary.rates.attendedWorkingDays }} présences finalisées</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">{{ isSingleDay ? 'Retards finalisés' : 'Retards consolidés' }}</p><p class="mt-1 text-2xl font-bold text-amber-700">{{ overview.summary.rates.lateWorkingDays }}</p><p class="mt-1 text-xs text-slate-500">{{ employeesWithConsolidatedLate }} employé{{ employeesWithConsolidatedLate > 1 ? 's' : '' }} concerné{{ employeesWithConsolidatedLate > 1 ? 's' : '' }}</p></div>
    </div>

    <div v-else-if="kpiId === 'absences'" class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Absences confirmées</p><p class="mt-1 text-3xl font-bold text-rose-700">{{ overview.summary.statusTotals.ABSENT }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Employés concernés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ employeesWithAbsence }}</p><p class="mt-1 text-xs text-slate-500">PENDING, REST_DAY et UNDETERMINED ne sont pas inclus.</p></div>
    </div>

    <div v-else-if="kpiId === 'late_days'" class="mt-5 grid gap-3 sm:grid-cols-3">
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Retards observés</p><p class="mt-1 text-3xl font-bold text-amber-700">{{ overview.summary.statusTotals.LATE }}</p><p class="mt-1 text-xs text-slate-500">{{ isSingleDay ? 'Inclut les situations du jour encore en cours.' : 'Inclut les journées encore en cours.' }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Retards consolidés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.summary.rates.lateWorkingDays }}</p><p class="mt-1 text-xs text-slate-500">Pris en compte dans les taux.</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Employés concernés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ employeesWithObservedLate }}</p><p class="mt-1 text-xs text-slate-500">Un retard observé reste une présence opérationnelle.</p></div>
    </div>

    <div v-else class="mt-5 grid gap-3 sm:grid-cols-3">
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Occurrences API</p><p class="mt-1 text-3xl font-bold text-orange-700">{{ overview.summary.issueCount }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Types d’anomalies</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.issues.length }}</p></div>
      <div class="rounded-md bg-white p-4"><p class="text-xs font-bold uppercase text-slate-500">Employés concernés</p><p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.employees.filter((employee) => employee.issueCount > 0).length }}</p></div>
    </div>

    <div v-if="action" class="mt-5 flex flex-wrap items-center gap-3 border-t border-indigo-200 pt-4">
      <button type="button"
              class="inline-flex min-h-11 items-center rounded-md bg-[#004aad] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#004aad]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              @click="emit('action', action)">
        {{ action.label }} →
      </button>
    </div>
  </section>
</template>
