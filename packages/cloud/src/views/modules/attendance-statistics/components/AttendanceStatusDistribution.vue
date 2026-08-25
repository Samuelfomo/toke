<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceOverview, AttendanceStatus } from '../types/attendance-statistics.types.js';
import { buildAttendanceStatusDistribution } from '../utils/attendance-visualizations.js';

interface Props {
  overview: AttendanceOverview;
  activeStatus?: AttendanceStatus | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  exploreStatus: [status: AttendanceStatus];
}>();
const groups = computed(() => buildAttendanceStatusDistribution(props.overview));

function exploreStatus(status: AttendanceStatus, count: number): void {
  if (count <= 0) return;
  emit('exploreStatus', status);
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="attendance-status-title">
    <div class="max-w-3xl">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Lecture des statuts</p>
      <h2 id="attendance-status-title" class="mt-2 text-lg font-bold text-slate-950 sm:text-xl">
        Répartition des journées-employés
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Les journées qui participent au taux sont séparées des journées exclues du calcul. Sélectionnez un statut pour voir immédiatement les collaborateurs concernés.
      </p>
    </div>

    <div class="mt-6 grid gap-5 xl:grid-cols-2">
      <article
        v-for="group in groups"
        :key="group.id"
        class="rounded-2xl border p-4 sm:p-5"
        :class="group.id === 'rate_eligible' ? 'border-indigo-100 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/70'"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900">{{ group.label }}</h3>
            <p class="mt-1 text-xs leading-5 text-slate-600">{{ group.description }}</p>
          </div>
          <span class="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-800 shadow-sm">
            {{ group.total }}
          </span>
        </div>

        <div class="mt-5 space-y-3">
          <button
            v-for="item in group.items"
            :key="item.status"
            type="button"
            class="group/status block w-full rounded-xl border border-transparent p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            :class="[
              item.count > 0 ? 'cursor-pointer hover:border-slate-200 hover:bg-white hover:shadow-sm' : 'cursor-default opacity-60',
              activeStatus === item.status ? 'border-indigo-300 bg-white shadow-sm ring-2 ring-indigo-100' : '',
            ]"
            :disabled="item.count <= 0"
            :aria-pressed="activeStatus === item.status"
            :aria-label="`${item.label} : ${item.count} journée${item.count > 1 ? 's' : ''}, ${item.employeesConcerned} employé${item.employeesConcerned > 1 ? 's' : ''} concerné${item.employeesConcerned > 1 ? 's' : ''}. ${item.count > 0 ? item.actionLabel : 'Aucune occurrence.'}`"
            @click="exploreStatus(item.status, item.count)"
          >
            <div class="flex items-center justify-between gap-3 text-sm">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :class="{
                    'bg-emerald-500': item.tone === 'positive',
                    'bg-amber-500': item.tone === 'warning',
                    'bg-rose-500': item.tone === 'danger',
                    'bg-slate-400': item.tone === 'neutral',
                    'bg-sky-500': item.tone === 'info',
                  }"
                  aria-hidden="true"
                />
                <span class="truncate font-semibold text-slate-800">{{ item.label }}</span>
              </div>
              <span class="font-bold tabular-nums text-slate-950">{{ item.count }}</span>
            </div>

            <div class="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200/70">
              <div
                class="h-full rounded-full transition-[width] duration-300"
                :class="{
                  'bg-emerald-500': item.tone === 'positive',
                  'bg-amber-500': item.tone === 'warning',
                  'bg-rose-500': item.tone === 'danger',
                  'bg-slate-400': item.tone === 'neutral',
                  'bg-sky-500': item.tone === 'info',
                }"
                :style="{ width: `${item.visualSharePercent}%` }"
                aria-hidden="true"
              />
            </div>

            <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p class="text-xs leading-5 text-slate-500">{{ item.description }}</p>
              <span v-if="item.count > 0" class="inline-flex items-center gap-1 text-xs font-bold text-indigo-700">
                {{ item.employeesConcerned }} employé{{ item.employeesConcerned > 1 ? 's' : '' }} · {{ item.actionLabel }}
                <svg class="h-3.5 w-3.5 transition-transform group-hover/status:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
              <span v-else class="text-xs font-medium text-slate-400">Aucune occurrence</span>
            </div>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
