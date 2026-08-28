<script setup lang="ts">
import {computed} from 'vue';

import type {AttendanceOverview} from '../types/attendance-statistics.types.js';
import {buildAttendanceDurationInsight} from '../utils/attendance-kpis.js';

interface Props {
  overview: AttendanceOverview
}

const props = defineProps<Props>();
const duration = computed(() => buildAttendanceDurationInsight(props.overview));
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-md sm:p-5"
           aria-labelledby="attendance-secondary-insights-title">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Information descriptive</p>
        <h2 id="attendance-secondary-insights-title" class="mt-1 text-base font-bold text-slate-950">Durée nette
          enregistrée</h2>
        <p class="mt-1 text-sm text-slate-500">Cette durée décrit l’activité enregistrée ; elle n’est pas présentée
          comme un indicateur de performance.</p>
      </div>
      <div class="sm:text-right">
        <p class="text-2xl font-bold text-slate-950">{{ duration.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ duration.helper }}</p>
      </div>
    </div>
  </section>
</template>
