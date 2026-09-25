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
  if (props.kpiId === 'attendance_rate' && props.overview.summary.rates.absentWorkingDays === 0) return null;
  if (props.kpiId === 'punctuality_rate' && props.overview.summary.rates.lateWorkingDays === 0) return null;
  return getAttendanceKpiPrimaryAction(props.kpiId);
});

const title = computed(() => {
  switch (props.kpiId) {
    case 'attendance_rate': return 'Comprendre la présence et l’absence';
    case 'punctuality_rate': return 'Comprendre la ponctualité et le retard';
    case 'adoption_rate': return 'Adoption du pointage : règle à finaliser';
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
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Explication métier</p>
        <h3 id="attendance-kpi-drilldown-title" class="mt-1 text-lg font-bold text-slate-950">{{ title }}</h3>
      </div>
      <button type="button" class="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="emit('close')">
        Fermer
      </button>
    </div>

    <div v-if="kpiId === 'attendance_rate'" class="mt-5">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-white p-4">
          <p class="text-xs font-bold uppercase text-slate-500">Présence</p>
          <p class="mt-1 text-3xl font-bold text-indigo-700">{{ formatPercentage(overview.summary.rates.attendanceRate) }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ overview.summary.rates.attendedWorkingDays }} rotation{{ overview.summary.rates.attendedWorkingDays === 1 ? '' : 's' }} couverte{{ overview.summary.rates.attendedWorkingDays === 1 ? '' : 's' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4">
          <p class="text-xs font-bold uppercase text-slate-500">Absence</p>
          <p class="mt-1 text-3xl font-bold text-rose-700">{{ formatPercentage(overview.summary.rates.absenceRate) }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ overview.summary.rates.absentWorkingDays }} rotation{{ overview.summary.rates.absentWorkingDays === 1 ? '' : 's' }} non couverte{{ overview.summary.rates.absentWorkingDays === 1 ? '' : 's' }}</p>
        </div>
        <div class="rounded-xl bg-white p-4">
          <p class="text-xs font-bold uppercase text-slate-500">Base de calcul</p>
          <p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.summary.rates.employeeWorkingDaysExpected }}</p>
          <p class="mt-1 text-xs text-slate-500">rotations finalisées et éligibles</p>
        </div>
      </div>
      <p class="mt-4 text-sm leading-6 text-slate-700">
        Sur {{ overview.summary.rates.employeeWorkingDaysExpected }} rotation{{ overview.summary.rates.employeeWorkingDaysExpected === 1 ? '' : 's' }} attendue{{ overview.summary.rates.employeeWorkingDaysExpected === 1 ? '' : 's' }},
        {{ overview.summary.rates.attendedWorkingDays }} {{ overview.summary.rates.attendedWorkingDays === 1 ? 'a été couverte' : 'ont été couvertes' }} par une présence constatée et
        {{ overview.summary.rates.absentWorkingDays }} {{ overview.summary.rates.absentWorkingDays === 1 ? 'n’a pas été couverte' : 'n’ont pas été couvertes' }}.
      </p>
    </div>

    <div v-else-if="kpiId === 'punctuality_rate'" class="mt-5">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-white p-4">
          <p class="text-xs font-bold uppercase text-slate-500">Ponctualité</p>
          <p class="mt-1 text-3xl font-bold text-sky-700">{{ formatPercentage(overview.summary.rates.punctualityRate) }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ overview.summary.rates.onTimeWorkingDays }} arrivée{{ overview.summary.rates.onTimeWorkingDays === 1 ? '' : 's' }} à l’heure</p>
        </div>
        <div class="rounded-xl bg-white p-4">
          <p class="text-xs font-bold uppercase text-slate-500">Retard</p>
          <p class="mt-1 text-3xl font-bold text-amber-700">{{ formatPercentage(overview.summary.rates.lateRate) }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ overview.summary.rates.lateWorkingDays }} rotation{{ overview.summary.rates.lateWorkingDays === 1 ? '' : 's' }} commencée{{ overview.summary.rates.lateWorkingDays === 1 ? '' : 's' }} en retard</p>
        </div>
        <div class="rounded-xl bg-white p-4">
          <p class="text-xs font-bold uppercase text-slate-500">Base de calcul</p>
          <p class="mt-1 text-3xl font-bold text-slate-950">{{ overview.summary.rates.attendedWorkingDays }}</p>
          <p class="mt-1 text-xs text-slate-500">rotations couvertes</p>
        </div>
      </div>
      <p class="mt-4 text-sm leading-6 text-slate-700">
        Parmi les {{ overview.summary.rates.attendedWorkingDays }} rotation{{ overview.summary.rates.attendedWorkingDays === 1 ? '' : 's' }} couverte{{ overview.summary.rates.attendedWorkingDays === 1 ? '' : 's' }},
        {{ overview.summary.rates.onTimeWorkingDays }} {{ overview.summary.rates.onTimeWorkingDays === 1 ? 'a commencé' : 'ont commencé' }} à l’heure, tolérance comprise, et
        {{ overview.summary.rates.lateWorkingDays }} en retard.
      </p>
    </div>

    <div v-else class="mt-5 rounded-xl border border-slate-200 bg-white p-5">
      <p class="text-sm font-bold text-slate-900">Indicateur volontairement non chiffré</p>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        La formule d’adoption n’est pas encore validée. Il reste à définir les événements obligatoires de pointage, le rôle des pauses et le traitement d’une rotation avec entrée enregistrée mais sortie manquante.
      </p>
      <p class="mt-3 text-sm font-semibold text-slate-700">Aucun pourcentage ne doit être inventé avant cette décision métier.</p>
    </div>

    <div v-if="action" class="mt-5 border-t border-indigo-200 pt-4">
      <button type="button" class="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" @click="emit('action', action)">
        {{ action.label }}
      </button>
    </div>
  </section>
</template>
