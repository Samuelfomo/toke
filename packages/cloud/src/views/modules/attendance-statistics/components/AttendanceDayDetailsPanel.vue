<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceDailyOverview, AttendanceStatus, BusinessDate } from '../types/attendance-statistics.types.js';
import { ATTENDANCE_STATUS_PRESENTATION } from '../utils/attendance-status.js';
import { formatBusinessDate } from '../utils/business-date.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  day: AttendanceDailyOverview | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  exploreStatus: [payload: { date: BusinessDate; status: Extract<AttendanceStatus, 'ABSENT' | 'LATE'> }];
}>();

const statusRows = computed(() => {
  if (!props.day) return [];
  return Object.entries(props.day.statusTotals)
    .map(([status, count]) => ({
      status: status as keyof typeof ATTENDANCE_STATUS_PRESENTATION,
      count,
      presentation: ATTENDANCE_STATUS_PRESENTATION[status as keyof typeof ATTENDANCE_STATUS_PRESENTATION],
    }))
    .sort((left, right) => left.presentation.order - right.presentation.order);
});

const operationalWorkingDays = computed(() => {
  if (!props.day) return 0;
  return (
    props.day.statusTotals.PRESENT +
    props.day.statusTotals.LATE +
    props.day.statusTotals.ABSENT +
    props.day.statusTotals.PENDING
  );
});

const observedPresence = computed(() => {
  if (!props.day) return 0;
  return props.day.statusTotals.PRESENT + props.day.statusTotals.LATE;
});

const isWaitingForConsolidation = computed(() => {
  if (!props.day) return false;
  return (
    props.day.rates.employeeWorkingDaysExpected === 0 &&
    props.day.rates.attendanceRate === null &&
    operationalWorkingDays.value > 0
  );
});

const consolidationMessage = computed(() => {
  if (!props.day) return '';

  if (props.day.rates.employeeWorkingDaysExpected > 0) {
    return `${props.day.rates.attendedWorkingDays} collaborateur${props.day.rates.attendedWorkingDays === 1 ? '' : 's'} avec présence parmi ${props.day.rates.employeeWorkingDaysExpected} collaborateur${props.day.rates.employeeWorkingDaysExpected === 1 ? '' : 's'} dont la situation du jour est déjà finalisée.`;
  }

  if (operationalWorkingDays.value > 0) {
    const pending = props.day.statusTotals.PENDING;
    return `${observedPresence.value} présence${observedPresence.value === 1 ? '' : 's'} déjà observée${observedPresence.value === 1 ? '' : 's'} parmi ${operationalWorkingDays.value} collaborateur${operationalWorkingDays.value === 1 ? '' : 's'} en situation de travail${pending > 0 ? ` ; ${pending} situation${pending === 1 ? '' : 's'} reste${pending === 1 ? '' : 'nt'} en attente` : ''}. Les taux ne sont pas encore consolidés.`;
  }

  return 'Aucune situation du jour finalisée n’entre encore dans le calcul des taux pour cette date.';
});
</script>

<template>
  <aside
    class="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    aria-labelledby="attendance-day-detail-title"
  >
    <template v-if="day">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Détail sélectionné</p>
          <h2 id="attendance-day-detail-title" class="mt-1 break-words text-lg font-bold text-slate-950">
            {{ formatBusinessDate(day.date, 'fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}
          </h2>
        </div>
        <span
          v-if="isWaitingForConsolidation"
          class="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700"
        >
          Journée en cours
        </span>
      </div>

      <p class="mt-1 break-words text-sm text-slate-500">Équipe analysée : {{ day.teamSize }} employé{{ day.teamSize === 1 ? '' : 's' }}</p>

      <dl class="mt-5 grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <div class="min-w-0 rounded-xl bg-indigo-50 p-3">
          <dt class="text-xs font-semibold text-indigo-700">Taux de présence</dt>
          <dd class="mt-1 text-xl font-bold text-indigo-950">{{ formatPercentage(day.rates.attendanceRate) }}</dd>
          <p v-if="day.rates.attendanceRate === null" class="mt-1 text-[11px] leading-4 text-indigo-700/80">En attente de consolidation</p>
        </div>
        <div class="min-w-0 rounded-xl bg-sky-50 p-3">
          <dt class="text-xs font-semibold text-sky-700">Ponctualité</dt>
          <dd class="mt-1 text-xl font-bold text-sky-950">{{ formatPercentage(day.rates.punctualityRate) }}</dd>
          <p v-if="day.rates.punctualityRate === null" class="mt-1 text-[11px] leading-4 text-sky-700/80">En attente de consolidation</p>
        </div>
        <div class="min-w-0 rounded-xl bg-slate-50 p-3">
          <dt class="text-xs font-semibold text-slate-600">Collaborateurs en journée de travail</dt>
          <dd class="mt-1 text-xl font-bold text-slate-950">{{ operationalWorkingDays }}</dd>
          <p class="mt-1 text-[11px] leading-4 text-slate-500">Présent, en retard, absent confirmé ou en attente</p>
        </div>
        <div class="min-w-0 rounded-xl bg-orange-50 p-3">
          <dt class="text-xs font-semibold text-orange-700">Éléments à examiner</dt>
          <dd class="mt-1 text-xl font-bold text-orange-950">{{ day.issueCount }}</dd>
        </div>
      </dl>

      <div class="mt-6">
        <h3 class="text-sm font-bold text-slate-900">Répartition du jour</h3>
        <ul class="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 px-3">
          <li v-for="row in statusRows" :key="row.status" class="flex min-w-0 items-center justify-between gap-3 py-2.5 text-sm">
            <span class="min-w-0 break-words text-slate-600">{{ row.presentation.label }}</span>
            <span class="font-bold tabular-nums text-slate-950">{{ row.count }}</span>
          </li>
        </ul>
      </div>

      <div v-if="day.statusTotals.ABSENT > 0 || day.statusTotals.LATE > 0" class="mt-5 flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap">
        <button
          v-if="day.statusTotals.ABSENT > 0"
          type="button"
          class="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 min-[420px]:w-auto"
          @click="emit('exploreStatus', { date: day.date, status: 'ABSENT' })"
        >
          Voir {{ day.statusTotals.ABSENT }} absence{{ day.statusTotals.ABSENT > 1 ? 's' : '' }} confirmée{{ day.statusTotals.ABSENT > 1 ? 's' : '' }} →
        </button>
        <button
          v-if="day.statusTotals.LATE > 0"
          type="button"
          class="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-[420px]:w-auto"
          @click="emit('exploreStatus', { date: day.date, status: 'LATE' })"
        >
          Voir {{ day.statusTotals.LATE }} retard{{ day.statusTotals.LATE > 1 ? 's' : '' }} observé{{ day.statusTotals.LATE > 1 ? 's' : '' }} →
        </button>
      </div>

      <p class="mt-5 break-words rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
        {{ consolidationMessage }}
      </p>
    </template>

    <div v-else class="flex min-h-64 items-center justify-center text-center text-sm text-slate-500">
      Sélectionnez une date pour afficher son détail.
    </div>
  </aside>
</template>
