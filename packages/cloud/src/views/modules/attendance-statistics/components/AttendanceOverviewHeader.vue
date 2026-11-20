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
  canExport?: boolean;
  qualityPanelOpen?: boolean;
  qualityAlertActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Statistiques de présence',
  managerName: '',
  quality: null,
  filtersOpen: false,
  canExport: false,
  qualityPanelOpen: false,
  qualityAlertActive: false,
});

const qualityPresentation = computed(() =>
  props.quality ? buildAttendanceDataQualityPresentation(props.quality) : null,
);

const attentionMetricCount = computed(() =>
  qualityPresentation.value?.metrics.filter((metric) => metric.value > 0).length ?? 0,
);

const qualityStatusLabel = computed(() => {
  const level = qualityPresentation.value?.level;
  if (level === 'unreliable') return 'Données non fiables';
  if (level === 'warning') return 'Données à surveiller';
  return 'Données fiables';
});

const qualityButtonAriaLabel = computed(() => {
  const count = attentionMetricCount.value;
  const signalLabel = count > 1 ? `${count} catégories de signaux détectées` : count === 1 ? '1 catégorie de signal détectée' : 'aucun signal chiffré';
  return `${qualityStatusLabel.value}, ${signalLabel}. ${props.qualityPanelOpen ? 'Masquer' : 'Afficher'} le détail de la qualité des données.`;
});

defineEmits<{ refresh: []; toggleFilters: []; toggleQuality: []; export: [] }>();
</script>

<template>
  <header class="shadow-md rounded-md border border-slate-200 bg-white p-5 sm:p-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Pilotage d'équipe</p>
        <h1 class="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{{ title }}</h1>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-600">
          <span v-if="managerName" class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />{{ managerName }}</span>
          <span class="font-bold text-[#004aad]">{{ periodLabel }}</span>
          <span v-if="overview" class="font-medium text-slate-800">{{ overview.scope.teamSize }} collaborateur{{ overview.scope.teamSize > 1 ? 's' : '' }}</span>
          <span v-if="overview" class="text-slate-500">{{ overview.scope.siteGuid ? 'Site filtré' : 'Tous les sites' }}</span>

          <template v-if="qualityPresentation">
            <span
              v-if="qualityPresentation.level === 'reliable'"
              class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              Données fiables
            </span>

            <button
              v-else
              type="button"
              class="group relative inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              :class="{
                'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100 focus-visible:ring-amber-500': qualityPresentation.level === 'warning',
                'border-rose-300 bg-rose-50 text-rose-900 hover:border-rose-400 hover:bg-rose-100 focus-visible:ring-rose-500': qualityPresentation.level === 'unreliable',
                'shadow-md': qualityPanelOpen,
              }"
              aria-controls="attendance-data-quality-panel"
              :aria-expanded="qualityPanelOpen"
              :aria-label="qualityButtonAriaLabel"
              @click="$emit('toggleQuality')"
            >
              <span class="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span
                  v-if="qualityAlertActive && !qualityPanelOpen"
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40 motion-reduce:hidden"
                />
                <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
              </span>

              <span>{{ qualityStatusLabel }}</span>

              <span
                v-if="attentionMetricCount > 0"
                class="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-extrabold shadow-sm"
                :title="`${attentionMetricCount} catégorie${attentionMetricCount > 1 ? 's' : ''} de données à examiner`"
              >
                {{ attentionMetricCount }}
              </span>

              <svg
                class="h-3.5 w-3.5 transition-transform duration-200"
                :class="{ 'rotate-180': qualityPanelOpen }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          </template>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canExport"
          @click="$emit('export')"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/></svg>
          Exporter
        </button>

        <button
          type="button"
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
