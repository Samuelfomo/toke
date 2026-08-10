<script setup lang="ts">
import type { AttendanceIssueListFilters } from '../utils/attendance-issues.js';

interface Props {
  filters: AttendanceIssueListFilters;
  resultCount: number;
  totalCount: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:filters': [filters: AttendanceIssueListFilters];
  reset: [];
}>();

function updateQuery(query: string): void {
  emit('update:filters', { ...props.filters, query });
}

function updateFamily(family: AttendanceIssueListFilters['family']): void {
  emit('update:filters', { ...props.filters, family });
}
</script>

<template>
  <div class="mt-5 flex flex-col gap-3 border-y border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
      <label class="block">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Rechercher</span>
        <input
          :value="filters.query"
          type="search"
          placeholder="Employé, date, GUID ou anomalie"
          class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-indigo-500 transition focus:ring-2"
          @input="updateQuery(($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="block">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Famille</span>
        <select
          :value="filters.family"
          class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-indigo-500 transition focus:ring-2"
          @change="updateFamily(($event.target as HTMLSelectElement).value as AttendanceIssueListFilters['family'])"
        >
          <option value="all">Toutes les familles</option>
          <option value="planning">Planning</option>
          <option value="session">Sessions</option>
          <option value="duration">Durées</option>
        </select>
      </label>
    </div>

    <div class="flex items-center justify-between gap-3 lg:justify-end">
      <p class="text-sm text-slate-500">
        <strong class="text-slate-800">{{ resultCount }}</strong> sur {{ totalCount }} type{{ totalCount > 1 ? 's' : '' }}
      </p>
      <button
        type="button"
        class="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        @click="emit('reset')"
      >
        Réinitialiser
      </button>
    </div>
  </div>
</template>
