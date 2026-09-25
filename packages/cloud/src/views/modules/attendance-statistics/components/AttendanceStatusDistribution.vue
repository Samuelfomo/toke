<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview, AttendanceStatus } from '../types/attendance-statistics.types.js';
import { buildAttendanceStatusDistribution } from '../utils/attendance-visualizations.js';

interface Props {
  overview: AttendanceOverview;
  activeStatus?: AttendanceStatus | null;
  activeRateEligible?: boolean | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  exploreStatus: [payload: { status: AttendanceStatus; rateEligible: boolean }];
}>();

/*
 * Les statuts PRESENT/LATE/ABSENT sont déjà expliqués dans les KPI décisionnels
 * et dans leur drill-down. Ici on ne conserve que les situations exclues des taux,
 * afin d'éviter une répétition visuelle qui pourrait être interprétée comme un
 * troisième calcul de présence.
 */
const group = computed(() =>
  buildAttendanceStatusDistribution(props.overview).find((item) => item.id === 'rate_excluded') ?? null,
);
const isSingleDay = computed(() => props.overview.period.dayCount === 1);

function exploreStatus(status: AttendanceStatus, count: number): void {
  if (count <= 0) return;
  emit('exploreStatus', { status, rateEligible: false });
}
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    aria-labelledby="attendance-status-title"
  >
    <div class="max-w-3xl">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Hors calcul des taux</p>
      <h2 id="attendance-status-title" class="mt-1 text-lg font-bold text-slate-950 sm:text-xl">
        {{ isSingleDay ? 'Situations du jour non finalisées' : 'Situations non prises en compte dans les taux' }}
      </h2>
      <p class="mt-1 text-sm leading-6 text-slate-600">
        {{ isSingleDay
          ? 'Ces situations sont visibles pour le suivi opérationnel, mais ne sont pas encore utilisées dans les taux consolidés.'
          : 'Repos, journées en cours ou situations indéterminées restent visibles ici sans être mélangées aux rotations finalisées utilisées dans les taux.' }}
      </p>
    </div>

    <div v-if="!group || group.total === 0" class="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <p class="text-sm font-semibold text-slate-700">Aucune situation hors calcul des taux</p>
      <p class="mt-1 text-xs leading-5 text-slate-500">
        Toutes les situations du périmètre sont actuellement classées dans les catégories attendues pour cette lecture.
      </p>
    </div>

    <div v-else class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="item in group.items"
        :key="item.status"
        type="button"
        class="group/status rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        :class="[
          item.count > 0 ? 'cursor-pointer' : 'cursor-default opacity-60',
          item.tone === 'warning' ? 'border-amber-200 hover:border-amber-400 focus-visible:ring-amber-200' : '',
          item.tone === 'neutral' ? 'border-slate-200 hover:border-slate-400 focus-visible:ring-slate-200' : '',
          item.tone === 'info' ? 'border-sky-200 hover:border-sky-400 focus-visible:ring-sky-200' : '',
          item.tone === 'positive' ? 'border-emerald-200 hover:border-emerald-400 focus-visible:ring-emerald-200' : '',
          item.tone === 'danger' ? 'border-rose-200 hover:border-rose-400 focus-visible:ring-rose-200' : '',
          activeStatus === item.status && activeRateEligible === false
            ? 'ring-2 ring-slate-300'
            : '',
        ]"
        :disabled="item.count <= 0"
        :aria-pressed="activeStatus === item.status && activeRateEligible === false"
        :aria-label="`${item.label} : ${item.count} occurrence${item.count > 1 ? 's' : ''}, ${item.employeesConcerned} employé${item.employeesConcerned > 1 ? 's' : ''} concerné${item.employeesConcerned > 1 ? 's' : ''}.`"
        @click="exploreStatus(item.status, item.count)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              :class="{
                'bg-emerald-500': item.tone === 'positive',
                'bg-amber-500': item.tone === 'warning',
                'bg-rose-500': item.tone === 'danger',
                'bg-slate-400': item.tone === 'neutral',
                'bg-sky-500': item.tone === 'info',
              }"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="font-semibold text-slate-900">{{ item.label }}</p>
              <p class="mt-1 text-xs leading-5 text-slate-500">{{ item.description }}</p>
            </div>
          </div>
          <span class="shrink-0 text-xl font-bold tabular-nums text-slate-950">{{ item.count }}</span>
        </div>

        <div v-if="item.count > 0" class="mt-3 border-t border-slate-100 pt-3">
          <span class="text-xs font-semibold text-slate-600">
            {{ item.employeesConcerned }} employé{{ item.employeesConcerned > 1 ? 's' : '' }} concerné{{ item.employeesConcerned > 1 ? 's' : '' }}
          </span>
        </div>
      </button>
    </div>
  </section>
</template>
