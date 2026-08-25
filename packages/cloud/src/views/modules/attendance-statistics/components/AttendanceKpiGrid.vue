<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import type { AttendancePrimaryKpiId } from '../utils/attendance-dashboard-actions.js';
import { isPrimaryAttendanceKpiId } from '../utils/attendance-dashboard-actions.js';
import type { AttendanceKpiId } from '../utils/attendance-kpis.js';
import { buildPrimaryAttendanceKpis } from '../utils/attendance-kpis.js';
import AttendanceKpiCard from './AttendanceKpiCard.vue';

interface Props {
  overview: AttendanceOverview;
  selectedKpiId?: AttendancePrimaryKpiId | null;
}

const props = withDefaults(defineProps<Props>(), { selectedKpiId: null });
const emit = defineEmits<{ select: [id: AttendancePrimaryKpiId] }>();
const cards = computed(() => buildPrimaryAttendanceKpis(props.overview));

function onActivate(id: AttendanceKpiId): void {
  if (isPrimaryAttendanceKpiId(id)) emit('select', id);
}
</script>

<template>
  <section id="attendance-kpis" aria-labelledby="attendance-kpis-title">
    <div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vue décisionnelle</p>
        <h2 id="attendance-kpis-title" class="mt-1 text-lg font-bold text-slate-950">Ce qu’il faut comprendre maintenant</h2>
      </div>
      <p class="max-w-xl text-sm text-slate-500">Cliquez sur une carte pour comprendre la valeur puis accéder aux personnes ou anomalies concernées.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AttendanceKpiCard
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :selected="selectedKpiId === card.id"
        @activate="onActivate"
      />
    </div>
  </section>
</template>
