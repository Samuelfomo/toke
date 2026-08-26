<script setup lang="ts">
import { computed, ref } from 'vue';

import type { AttendanceIssue, AttendanceIssueSummary } from '../types/attendance-statistics.types.js';
import type {
  AttendanceIssueFamilyFilter,
  AttendanceIssueListFilters,
  AttendanceIssueTarget,
} from '../utils/attendance-issues.js';
import {
  buildAttendanceIssueListModel,
  DEFAULT_ATTENDANCE_ISSUE_FILTERS,
} from '../utils/attendance-issues.js';
import AttendanceIssueCard from './AttendanceIssueCard.vue';
import AttendanceIssuesToolbar from './AttendanceIssuesToolbar.vue';

interface Props {
  issues: readonly AttendanceIssueSummary[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ viewEmployee: [target: AttendanceIssueTarget]; export: [] }>();

const filters = ref<AttendanceIssueListFilters>({ ...DEFAULT_ATTENDANCE_ISSUE_FILTERS });
const model = computed(() => buildAttendanceIssueListModel({ issues: props.issues, filters: filters.value }));

function reset(): void {
  filters.value = { ...DEFAULT_ATTENDANCE_ISSUE_FILTERS };
}

function scrollToSection(): void {
  document.getElementById('attendance-issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function focusSection(): void {
  reset();
  scrollToSection();
}

function focusIssue(issue: AttendanceIssue): void {
  filters.value = { query: issue, family: 'all' };
  scrollToSection();
}

function focusFamily(family: Exclude<AttendanceIssueFamilyFilter, 'all'>): void {
  filters.value = { query: '', family };
  scrollToSection();
}

defineExpose({ focusSection, focusIssue, focusFamily, reset });
</script>

<template>
  <section id="attendance-issues" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-issues-title">
    <div class="flex flex-col gap-3 px-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Actions manager</p>
        <h2 id="attendance-issues-title" class="mt-1 text-xl font-bold text-slate-950">Éléments à examiner</h2>
        <p class="mt-1 max-w-3xl text-sm text-slate-500">
          Les compteurs et occurrences viennent de l’API. L’ordre ci-dessous facilite le traitement opérationnel et ne constitue pas un niveau de gravité métier.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 self-start">
        <span class="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-800">
          {{ model.summary.occurrenceCount }} occurrence{{ model.summary.occurrenceCount > 1 ? 's' : '' }}
        </span>
        <button
          type="button"
          class="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          @click="emit('export')"
        >
          Exporter les éléments
        </button>
      </div>
    </div>

    <div v-if="issues.length === 0" class="px-5 py-10 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
      <h3 class="mt-3 font-bold text-slate-900">Aucun élément à examiner</h3>
      <p class="mt-1 text-sm text-slate-500">L’API n’a retourné aucune anomalie pour cette période et ce périmètre.</p>
    </div>

    <template v-else>
      <AttendanceIssuesToolbar
        :filters="filters"
        :result-count="model.filteredIssueTypeCount"
        :total-count="model.totalIssueTypeCount"
        @update:filters="filters = $event"
        @reset="reset"
      />

      <div class="grid gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-3 sm:px-5">
        <div class="rounded-xl bg-slate-50 px-4 py-3">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Types affichés</p>
          <p class="mt-1 text-2xl font-bold text-slate-950">{{ model.summary.issueTypeCount }}</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Occurrences API</p>
          <p class="mt-1 text-2xl font-bold text-slate-950">{{ model.summary.occurrenceCount }}</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Employés visibles</p>
          <p class="mt-1 text-2xl font-bold text-slate-950">{{ model.summary.employeesConcerned }}</p>
        </div>
      </div>

      <div v-if="model.rows.length === 0" class="px-5 py-10 text-center text-sm text-slate-500">
        Aucun élément ne correspond à la recherche ou à la famille sélectionnée.
      </div>

      <div v-else class="space-y-3 bg-slate-50/60 p-4 sm:p-5" aria-live="polite">
        <AttendanceIssueCard
          v-for="summary in model.rows"
          :key="summary.issue"
          :summary="summary"
          @view-employee="emit('viewEmployee', $event)"
        />
      </div>
    </template>
  </section>
</template>
