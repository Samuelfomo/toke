<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import { findAttendanceDailyOverview } from '../utils/attendance-visualizations.js';
import AttendanceDailyTrend from './AttendanceDailyTrend.vue';
import AttendanceDayDetailsPanel from './AttendanceDayDetailsPanel.vue';
import AttendanceStatusDistribution from './AttendanceStatusDistribution.vue';

interface Props {
  overview: AttendanceOverview;
}

const props = defineProps<Props>();
const selectedDate = ref<string | null>(null);

watch(
  () => props.overview.daily,
  (daily) => {
    selectedDate.value = findAttendanceDailyOverview(daily, selectedDate.value)?.date ?? null;
  },
  { immediate: true },
);

const selectedDay = computed(() =>
  findAttendanceDailyOverview(props.overview.daily, selectedDate.value),
);
</script>

<template>
  <section id="attendance-visualizations" class="space-y-5" aria-label="Visualisations des statistiques de présence">
    <AttendanceStatusDistribution :overview="overview" />

    <div class="grid gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
      <AttendanceDailyTrend
        :daily="overview.daily"
        :selected-date="selectedDate"
        @select="selectedDate = $event"
      />
      <AttendanceDayDetailsPanel :day="selectedDay" />
    </div>
  </section>
</template>
