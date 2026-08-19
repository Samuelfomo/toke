<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview } from '../types/attendance-statistics.types.js';
import { buildAttendanceVolumeProfile } from '../utils/attendance-volume.js';

interface Props {
  overview: AttendanceOverview;
}

const props = defineProps<Props>();
const profile = computed(() => buildAttendanceVolumeProfile(props.overview));
</script>

<template>
  <aside
    v-if="profile.level !== 'standard'"
    class="rounded-2xl border px-4 py-4 shadow-sm sm:px-5"
    :class="profile.level === 'very_large'
      ? 'border-orange-300 bg-orange-50 text-orange-950'
      : 'border-sky-200 bg-sky-50 text-sky-950'"
    role="status"
    aria-labelledby="attendance-volume-title"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em]">Volume d’affichage</p>
        <h2 id="attendance-volume-title" class="mt-1 text-base font-bold">
          {{ profile.level === 'very_large' ? 'Périmètre très volumineux' : 'Périmètre volumineux' }}
        </h2>
        <p class="mt-1 max-w-4xl text-sm leading-6 opacity-90">
          L’interface active un rendu progressif : employés paginés, journées individuelles paginées,
          occurrences dépliées à la demande et graphique quotidien compact.
        </p>
      </div>
      <span class="self-start rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold shadow-sm">
        {{ profile.employeeDayRecordCount }} lignes journalières
      </span>
    </div>

    <ul v-if="profile.messages.length > 0" class="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 opacity-90">
      <li v-for="message in profile.messages" :key="message">{{ message }}</li>
    </ul>
  </aside>
</template>
