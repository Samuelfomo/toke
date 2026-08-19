<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { AttendanceIssueSummary } from '../types/attendance-statistics.types.js';
import type { AttendanceIssueTarget } from '../utils/attendance-issues.js';
import {
  getHiddenAttendanceOccurrenceCount,
  toAttendanceIssueTarget,
} from '../utils/attendance-issues.js';
import { getNextVisibleAttendanceOccurrenceCount } from '../utils/attendance-volume.js';
import { ATTENDANCE_ISSUE_PRESENTATION, ATTENDANCE_STATUS_PRESENTATION } from '../utils/attendance-status.js';
import { formatBusinessDate } from '../utils/business-date.js';

interface Props {
  summary: AttendanceIssueSummary;
}

const props = defineProps<Props>();
const emit = defineEmits<{ viewEmployee: [target: AttendanceIssueTarget] }>();
const visibleCount = ref(10);
const visibleOccurrences = computed(() => props.summary.occurrences.slice(0, visibleCount.value));
const remainingDetailedCount = computed(() =>
  Math.max(0, props.summary.occurrences.length - visibleOccurrences.value.length),
);
const titleId = computed(() => `attendance-issue-${props.summary.issue.toLowerCase()}`);

watch(
  () => props.summary.issue,
  () => { visibleCount.value = 10; },
);

function showMore(): void {
  visibleCount.value = getNextVisibleAttendanceOccurrenceCount({
    occurrences: props.summary.occurrences,
    currentVisibleCount: visibleCount.value,
    step: 10,
  });
}

function showLess(): void {
  visibleCount.value = 10;
}

function familyLabel(): string {
  const family = ATTENDANCE_ISSUE_PRESENTATION[props.summary.issue].family;
  if (family === 'planning') return 'Planning';
  if (family === 'session') return 'Session';
  return 'Durée';
}

function familyClasses(): string {
  const family = ATTENDANCE_ISSUE_PRESENTATION[props.summary.issue].family;
  if (family === 'planning') return 'bg-violet-100 text-violet-800';
  if (family === 'session') return 'bg-amber-100 text-amber-800';
  return 'bg-sky-100 text-sky-800';
}
</script>

<template>
  <article
    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    :aria-labelledby="titleId"
  >
    <div class="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="familyClasses()">{{ familyLabel() }}</span>
          <code class="break-all text-[11px] font-semibold text-slate-500">{{ summary.issue }}</code>
        </div>
        <h3 :id="titleId" class="mt-2 text-lg font-bold text-slate-950">
          {{ ATTENDANCE_ISSUE_PRESENTATION[summary.issue].label }}
        </h3>
        <p class="mt-1 text-sm text-slate-500">
          Action suggérée : <strong class="text-slate-700">{{ ATTENDANCE_ISSUE_PRESENTATION[summary.issue].actionLabel }}</strong>
        </p>
      </div>

      <dl class="grid shrink-0 grid-cols-2 gap-2 text-center">
        <div class="min-w-[92px] rounded-xl bg-orange-50 px-3 py-2">
          <dt class="text-[11px] font-bold uppercase tracking-wide text-orange-700">Occurrences</dt>
          <dd class="mt-1 text-xl font-bold text-orange-900">{{ summary.count }}</dd>
        </div>
        <div class="min-w-[92px] rounded-xl bg-slate-100 px-3 py-2">
          <dt class="text-[11px] font-bold uppercase tracking-wide text-slate-500">Employés</dt>
          <dd class="mt-1 text-xl font-bold text-slate-900">{{ summary.employeesConcerned }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="summary.occurrences.length === 0" class="px-5 py-7 text-center text-sm text-slate-500">
      Le compteur est disponible, mais aucune occurrence détaillée n’a été retournée par l’API.
    </div>

    <template v-else>
      <p class="sr-only" aria-live="polite">
        {{ visibleOccurrences.length }} occurrence{{ visibleOccurrences.length > 1 ? 's' : '' }} détaillée{{ visibleOccurrences.length > 1 ? 's' : '' }} affichée{{ visibleOccurrences.length > 1 ? 's' : '' }}.
      </p>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="occurrence in visibleOccurrences"
          :key="`${summary.issue}-${occurrence.employeeGuid}-${occurrence.date}`"
          class="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-900">{{ occurrence.employeeName }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{{ formatBusinessDate(occurrence.date) }}</span>
              <span>{{ ATTENDANCE_STATUS_PRESENTATION[occurrence.status].label }}</span>
              <span class="break-all font-mono">{{ occurrence.employeeGuid }}</span>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            @click="emit('viewEmployee', toAttendanceIssueTarget(summary.issue, occurrence))"
          >
            Ouvrir le détail
          </button>
        </li>
      </ul>

      <div
        v-if="remainingDetailedCount > 0 || visibleOccurrences.length > 10"
        class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5"
      >
        <p class="text-xs text-slate-500">
          {{ visibleOccurrences.length }} sur {{ summary.occurrences.length }} occurrence{{ summary.occurrences.length > 1 ? 's' : '' }} détaillée{{ summary.occurrences.length > 1 ? 's' : '' }}.
        </p>
        <div class="flex gap-2">
          <button
            v-if="visibleOccurrences.length > 10"
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="showLess"
          >
            Réduire
          </button>
          <button
            v-if="remainingDetailedCount > 0"
            type="button"
            class="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            :aria-expanded="visibleOccurrences.length === summary.occurrences.length"
            @click="showMore"
          >
            Afficher davantage
          </button>
        </div>
      </div>
    </template>

    <div
      v-if="getHiddenAttendanceOccurrenceCount(summary) > 0"
      class="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600"
    >
      {{ getHiddenAttendanceOccurrenceCount(summary) }} occurrence{{ getHiddenAttendanceOccurrenceCount(summary) > 1 ? 's' : '' }} supplémentaire{{ getHiddenAttendanceOccurrenceCount(summary) > 1 ? 's' : '' }} non incluse{{ getHiddenAttendanceOccurrenceCount(summary) > 1 ? 's' : '' }} dans le détail API.
    </div>
  </article>
</template>
