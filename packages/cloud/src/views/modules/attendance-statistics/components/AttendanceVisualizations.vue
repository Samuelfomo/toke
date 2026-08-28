<script setup lang="ts">
import {computed, ref, watch} from 'vue';

import type {AttendanceOverview, AttendanceStatus, BusinessDate} from '../types/attendance-statistics.types.js';
import {findAttendanceDailyOverview, type AttendanceDailyTrendInteraction} from '../utils/attendance-visualizations.js';
import AttendanceDailyTrend from './AttendanceDailyTrend.vue';
import AttendanceDayDetailsPanel from './AttendanceDayDetailsPanel.vue';

interface Props {
  overview: AttendanceOverview;
  activeDate?: BusinessDate | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  exploreDayStatus: [payload: { date: BusinessDate; status: Extract<AttendanceStatus, 'ABSENT' | 'LATE'> }];
}>();
const selectedDate = ref<string | null>(null);

watch(
    () => props.overview.daily,
    (daily) => {
      selectedDate.value = findAttendanceDailyOverview(daily, selectedDate.value)?.date ?? null;
    },
    {immediate: true},
);

watch(
    () => props.activeDate,
    (date) => {
      if (date && findAttendanceDailyOverview(props.overview.daily, date)) selectedDate.value = date;
    },
    {immediate: true},
);

const selectedDay = computed(() => findAttendanceDailyOverview(props.overview.daily, selectedDate.value));

function handleTrendExplore(interaction: AttendanceDailyTrendInteraction): void {
  selectedDate.value = interaction.date;
  if (interaction.mode === 'filter_day_status' && interaction.status) {
    emit('exploreDayStatus', {date: interaction.date, status: interaction.status});
  }
}

</script>

<template>
  <section id="attendance-visualizations" aria-labelledby="attendance-visualizations-title">
    <div class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Lecture temporelle</p>
        <h2 id="attendance-visualizations-title" class="mt-1 text-lg font-bold text-slate-950">
          Évolution de la période
        </h2>
      </div>
      <p class="max-w-2xl text-sm text-slate-500">
        Survolez les points pour comprendre la journée, puis cliquez sur une
        absence ou un retard pour atteindre directement les employés concernés.
      </p>
    </div>
    <div class="grid gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
      <AttendanceDailyTrend :daily="overview.daily" :selected-date="selectedDate"
                            @select="selectedDate = $event" @explore="handleTrendExplore"/>
      <AttendanceDayDetailsPanel :day="selectedDay" @explore-status="emit('exploreDayStatus', $event)"/>
    </div>
  </section>
</template>
