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
  eyebrow?: string;
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectedKpiId: null,
  eyebrow: 'Vue décisionnelle',
  title: 'Ce qu’il faut comprendre maintenant',
  description: 'Cliquez sur une carte pour comprendre la valeur puis accéder aux personnes ou anomalies concernées.',
});
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
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{{ eyebrow }}</p>
        <h2 id="attendance-kpis-title" class="mt-1 text-lg font-bold text-slate-950">{{ title }}</h2>
      </div>
      <p class="max-w-2xl text-sm text-slate-500">{{ description }}</p>
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
