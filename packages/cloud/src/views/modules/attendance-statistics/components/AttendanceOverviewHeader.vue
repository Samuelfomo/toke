<script setup lang="ts">
import { computed } from 'vue';

import type {
  AttendanceDataQuality,
  AttendanceOverview,
} from '../types/attendance-statistics.types.js';
import { buildAttendanceDataQualityPresentation } from '../utils/attendance-data-quality.js';

interface Props {
  title?: string;
  managerName?: string;
  periodLabel: string;
  overview: AttendanceOverview | null;
  quality?: AttendanceDataQuality | null;
  isRefreshing: boolean;
  filtersOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Statistiques de présence',
  managerName: '',
  quality: null,
  filtersOpen: false,
});

const qualityPresentation = computed(() =>
  props.quality ? buildAttendanceDataQualityPresentation(props.quality) : null,
);

defineEmits<{ refresh: []; toggleFilters: [] }>();
</script>

<template>
  <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Pilotage d'équipe</p>
        <h1 class="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{{ title }}</h1>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
          <span v-if="managerName" class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />{{ managerName }}</span>
          <span>{{ periodLabel }}</span>
          <span v-if="overview" class="font-medium text-slate-800">{{ overview.scope.teamSize }} collaborateur{{ overview.scope.teamSize > 1 ? 's' : '' }}</span>
          <span v-if="overview" class="text-slate-500">{{ overview.scope.siteGuid ? 'Site filtré' : 'Tous les sites' }}</span>
          <span
            v-if="qualityPresentation"
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            :class="{
              'bg-emerald-100 text-emerald-800': qualityPresentation.level === 'reliable',
              'bg-amber-100 text-amber-800': qualityPresentation.level === 'warning',
              'bg-rose-100 text-rose-800': qualityPresentation.level === 'unreliable',
            }"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {{ qualityPresentation.level === 'reliable' ? 'Données fiables' : qualityPresentation.level === 'warning' ? 'Données à surveiller' : 'Données non fiables' }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          :class="filtersOpen ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50'"
          aria-controls="attendance-filters-panel"
          :aria-expanded="filtersOpen"
          @click="$emit('toggleFilters')"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          {{ filtersOpen ? 'Masquer les filtres' : 'Filtres' }}
        </button>

        <button
          type="button"
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isRefreshing"
          @click="$emit('refresh')"
        >
          <svg class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" /></svg>
          {{ isRefreshing ? 'Actualisation…' : 'Actualiser' }}
        </button>
      </div>
    </div>
  </header>
</template>
