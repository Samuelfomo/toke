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
  <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="attendance-status-title">
    <div class="max-w-3xl">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Lecture journalière</p>
      <h2 id="attendance-status-title" class="mt-1 text-lg font-bold text-slate-950 sm:text-xl">
        Répartition des journées de travail
      </h2>
      <p class="mt-1 text-sm leading-6 text-slate-600">
        Visualisez la répartition des journées selon leur situation. Sélectionnez un statut pour voir immédiatement les collaborateurs concernés.
      </p>
    </div>

    <div class="mt-6 grid gap-5 xl:grid-cols-2">
      <article
          v-for="group in groups"
          :key="group.id"
          class="rounded-md border bg-white p-4 sm:p-5"
          :class=" group.id === 'rate_eligible'  ? 'border-indigo-200' : 'border-slate-200' "
      >
        <div class="flex flex-col">
          <div class="flex items-start justify-between gap-4">
            <h3 class="font-bold text-slate-900">{{ group.label }}</h3>
            <span class="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-800 shadow-sm">
            {{ group.total }}
          </span>
          </div>
          <p class="text-[11px] leading-4 text-slate-600 ">{{ group.description }}</p>
        </div>


        <div class="mt-5 space-y-3">
          <button
              v-for="item in group.items"
              :key="item.status"
              type="button"
              class="group/status block w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              :class="[
                item.count > 0
                  ? 'cursor-pointer'
                  : 'cursor-default opacity-60',
                item.tone === 'positive'
                  ? 'border-emerald-200 hover:border-emerald-400 focus-visible:ring-emerald-200'
                  : '',
                item.tone === 'warning'
                  ? 'border-amber-200 hover:border-amber-400 focus-visible:ring-amber-200'
                  : '',
                item.tone === 'danger'
                  ? 'border-rose-200 hover:border-rose-400 focus-visible:ring-rose-200'
                  : '',
                item.tone === 'neutral'
                  ? 'border-slate-200 hover:border-slate-400 focus-visible:ring-slate-200'
                  : '',
                item.tone === 'info'
                  ? 'border-sky-200 hover:border-sky-400 focus-visible:ring-sky-200'
                  : '',
                activeStatus === item.status
                  ? {
                      'border-emerald-500 ring-2 ring-emerald-300':
                        item.tone === 'positive',

                      'border-amber-500 ring-2 ring-amber-300':
                        item.tone === 'warning',

                      'border-rose-500 ring-2 ring-rose-300':
                        item.tone === 'danger',

                      'border-slate-500 ring-2 ring-slate-300':
                        item.tone === 'neutral',

                      'border-sky-500 ring-2 ring-sky-300':
                        item.tone === 'info',
                    }
                  : '',
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


            <div class="mt-3 space-y-2">
              <p class="text-xs leading-5 text-slate-500">{{ item.description }}</p>
              <div v-if="item.count > 0" class="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-2.5">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  <svg class="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {{ item.employeesConcerned }}employé{{ item.employeesConcerned > 1 ? 's' : '' }}concerné{{ item.employeesConcerned > 1 ? 's' : '' }}
                </span>
<!--                <span class="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 transition-colors group-hover/status:text-indigo-800">-->
<!--                  {{ item.actionLabel }}-->
<!--                  <svg-->
<!--                      class="h-3.5 w-3.5 transition-transform duration-200 group-hover/status:translate-x-1"-->
<!--                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"-->
<!--                  >-->
<!--                    <path d="m9 18 6-6-6-6" />-->
<!--                  </svg>-->
<!--                </span>-->
              </div>
              <div v-else class="border-t border-slate-100 pt-2.5">
                <span class="text-xs font-medium text-slate-400">
                  Aucune occurrence
                </span>
              </div>
            </div>
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
