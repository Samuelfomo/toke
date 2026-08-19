<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import { buildAttendanceKpis } from '../utils/attendance-kpis.js';
import AttendanceKpiCard from './AttendanceKpiCard.vue';

interface Props {
  overview: AttendanceOverview;
}

const props = defineProps<Props>();
const cards = computed(() => buildAttendanceKpis(props.overview));
</script>

<template>
  <section id="attendance-kpis" aria-labelledby="attendance-kpis-title">
    <div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Synthèse de la période
        </p>
        <h2 id="attendance-kpis-title" class="mt-1 text-lg font-bold text-slate-950">
          Indicateurs principaux
        </h2>
      </div>
      <p class="max-w-xl text-sm text-slate-500">
        Les valeurs sont affichées telles que calculées par l’API tenant.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <AttendanceKpiCard v-for="card in cards" :key="card.id" :card="card" />
    </div>
  </section>
</template>
