<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceDailyOverview } from '../types/attendance-statistics.types.js';
import { ATTENDANCE_STATUS_PRESENTATION } from '../utils/attendance-status.js';
import { formatBusinessDate } from '../utils/business-date.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  day: AttendanceDailyOverview | null;
}

const props = defineProps<Props>();
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
</script>

<template>
  <aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="attendance-day-detail-title">
    <template v-if="day">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Détail sélectionné</p>
      <h2 id="attendance-day-detail-title" class="mt-2 text-lg font-bold text-slate-950">
        {{ formatBusinessDate(day.date, 'fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}
      </h2>
      <p class="mt-1 text-sm text-slate-500">Équipe analysée : {{ day.teamSize }} employé{{ day.teamSize === 1 ? '' : 's' }}</p>

      <dl class="mt-5 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-indigo-50 p-3">
          <dt class="text-xs font-semibold text-indigo-700">Taux de présence</dt>
          <dd class="mt-1 text-xl font-bold text-indigo-950">{{ formatPercentage(day.rates.attendanceRate) }}</dd>
        </div>
        <div class="rounded-xl bg-sky-50 p-3">
          <dt class="text-xs font-semibold text-sky-700">Ponctualité</dt>
          <dd class="mt-1 text-xl font-bold text-sky-950">{{ formatPercentage(day.rates.punctualityRate) }}</dd>
        </div>
        <div class="rounded-xl bg-slate-50 p-3">
          <dt class="text-xs font-semibold text-slate-600">Journées attendues</dt>
          <dd class="mt-1 text-xl font-bold text-slate-950">{{ day.rates.employeeWorkingDaysExpected }}</dd>
        </div>
        <div class="rounded-xl bg-orange-50 p-3">
          <dt class="text-xs font-semibold text-orange-700">Éléments à examiner</dt>
          <dd class="mt-1 text-xl font-bold text-orange-950">{{ day.issueCount }}</dd>
        </div>
      </dl>

      <div class="mt-6">
        <h3 class="text-sm font-bold text-slate-900">Répartition du jour</h3>
        <ul class="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 px-3">
          <li v-for="row in statusRows" :key="row.status" class="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span class="text-slate-600">{{ row.presentation.label }}</span>
            <span class="font-bold tabular-nums text-slate-950">{{ row.count }}</span>
          </li>
        </ul>
      </div>

      <p class="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
        {{ day.rates.attendedWorkingDays }} journée{{ day.rates.attendedWorkingDays === 1 ? '' : 's' }} suivie{{ day.rates.attendedWorkingDays === 1 ? '' : 's' }} sur
        {{ day.rates.employeeWorkingDaysExpected }} attendue{{ day.rates.employeeWorkingDaysExpected === 1 ? '' : 's' }}.
      </p>
    </template>

    <div v-else class="flex min-h-64 items-center justify-center text-center text-sm text-slate-500">
      Sélectionnez une date pour afficher son détail.
    </div>
  </aside>
</template>
