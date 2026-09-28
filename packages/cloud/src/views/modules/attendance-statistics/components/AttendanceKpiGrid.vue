<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import type { AttendanceDecisionKpiId, AttendanceDecisionKpiSegment } from '../utils/attendance-kpis.js';
import { buildPrimaryAttendanceKpis } from '../utils/attendance-kpis.js';
import AttendanceDecisionKpiCard from './AttendanceDecisionKpiCard.vue';

interface Props {
  overview: AttendanceOverview;
  eyebrow?: string;
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: 'Vue décisionnelle',
  title: 'Ce qu’il faut comprendre maintenant',
  description: 'Cliquez sur un graphique pour voir le détail et accéder aux personnes ou éléments concernés.',
});

const emit = defineEmits<{
  detail: [payload: { id: AttendanceDecisionKpiId; segment: AttendanceDecisionKpiSegment }];
}>();

// Les quatre cartes présentent des périmètres de mesure distincts fournis par l’API.
const cards = computed(() => buildPrimaryAttendanceKpis(props.overview));
</script>

<template>
  <section id="attendance-kpis" aria-labelledby="attendance-kpis-title">
    <div class="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="text-xs font-extrabold uppercase tracking-[0.17em] text-indigo-600">{{ eyebrow }}</p>
        <h2 id="attendance-kpis-title" class="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{{ title }}</h2>
      </div>
      <p class="max-w-xl text-sm leading-5 text-slate-500">{{ description }}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <AttendanceDecisionKpiCard
        v-for="card in cards"
        :key="card.id"
        :card="card"
        @detail="emit('detail', $event)"
      />
    </div>
  </section>
</template>
