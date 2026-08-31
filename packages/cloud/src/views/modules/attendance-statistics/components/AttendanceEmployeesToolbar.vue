<script setup lang="ts">
import type {
  AttendanceEmployeeListFilters,
  AttendanceEmployeeSort,
  AttendanceEmployeeSortKey,
  AttendanceEmployeeStatusFilter,
  AttendanceEmployeeIssueFilter,
  AttendanceEmployeeRateEligibilityFilter,
} from '../types/attendance-statistics.ui.types.js';
import { ATTENDANCE_STATUS_PRESENTATION } from '../utils/attendance-status.js';
import { ATTENDANCE_STATUSES } from '../types/attendance-statistics.types.js';
import { formatBusinessDate } from '../utils/business-date.js';

interface Props {
  filters: AttendanceEmployeeListFilters;
  sort: AttendanceEmployeeSort;
  resultCount: number;
  totalCount: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:filters': [filters: AttendanceEmployeeListFilters];
  'update:sort': [sort: AttendanceEmployeeSort];
  reset: [];
}>();

const sortOptions: Array<{ value: AttendanceEmployeeSortKey; label: string }> = [
  { value: 'employee_name', label: 'Nom' },
  { value: 'expected_days', label: 'Jours attendus' },
  { value: 'attendance_rate', label: 'Taux de présence' },
  { value: 'punctuality_rate', label: 'Ponctualité' },
  { value: 'absence_days', label: 'Absences' },
  { value: 'late_days', label: 'Retards' },
  { value: 'issue_count', label: 'Éléments à examiner' },
  { value: 'net_minutes', label: 'Durée nette' },
];

function updateQuery(event: Event): void {
  const query = (event.target as HTMLInputElement).value;
  emit('update:filters', { ...props.filters, query });
}

function updateStatus(event: Event): void {
  const status = (event.target as HTMLSelectElement).value as AttendanceEmployeeStatusFilter;
  emit('update:filters', { ...props.filters, status });
}

function updateIssueFilter(event: Event): void {
  const issues = (event.target as HTMLSelectElement).value as AttendanceEmployeeIssueFilter;
  emit('update:filters', { ...props.filters, issues });
}



function updateRateEligibility(event: Event): void {
  const rateEligibility = (event.target as HTMLSelectElement).value as AttendanceEmployeeRateEligibilityFilter;
  emit('update:filters', { ...props.filters, rateEligibility });
}

function clearContextDate(): void {
  emit('update:filters', { ...props.filters, date: null });
}


function clearContextRateEligibility(): void {
  emit('update:filters', { ...props.filters, rateEligibility: 'all' });
}

function updateSortKey(event: Event): void {
  const key = (event.target as HTMLSelectElement).value as AttendanceEmployeeSortKey;
  emit('update:sort', {
    key,
    direction: key === 'employee_name' ? 'asc' : 'desc',
  });
}

function toggleDirection(): void {
  emit('update:sort', {
    ...props.sort,
    direction: props.sort.direction === 'asc' ? 'desc' : 'asc',
  });
}
</script>

<template>
  <div class="border-b border-slate-200 px-4 py-4 sm:px-5">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_minmax(160px,0.9fr)_minmax(180px,1fr)_minmax(190px,1fr)]">
        <label class="block">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Rechercher</span>
          <div class="relative">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              :value="filters.query"
              placeholder="Nom ou GUID employé"
              class="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              @input="updateQuery"
            />
          </div>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Statut observé</span>
          <select
            :value="filters.status"
            class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            @change="updateStatus"
          >
            <option value="ALL">Tous les statuts</option>
            <option v-for="status in ATTENDANCE_STATUSES" :key="status" :value="status">
              {{ ATTENDANCE_STATUS_PRESENTATION[status].label }}
            </option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Prise en compte</span>
          <select
            :value="filters.rateEligibility"
            class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            @change="updateRateEligibility"
          >
            <option value="all">Toutes les journées</option>
            <option value="eligible">Finalisées · dans les taux</option>
            <option value="not_eligible">Non encore finalisées</option>
          </select>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Anomalies</span>
          <select
            :value="filters.issues"
            class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            @change="updateIssueFilter"
          >
            <option value="all">Tous les employés</option>
            <option value="with_issues">Avec éléments à examiner</option>
            <option value="without_issues">Sans élément à examiner</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <label class="block min-w-[190px]">
          <span class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Trier par</span>
          <select
            :value="sort.key"
            class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            @change="updateSortKey"
          >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          :aria-label="sort.direction === 'asc' ? 'Tri croissant' : 'Tri décroissant'"
          @click="toggleDirection"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path v-if="sort.direction === 'asc'" d="m7 17 5-5 5 5M12 12V3" />
            <path v-else d="m7 7 5 5 5-5M12 12v9" />
          </svg>
          {{ sort.direction === 'asc' ? 'Croissant' : 'Décroissant' }}
        </button>

        <button
          type="button"
          class="h-11 rounded-xl px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          @click="emit('reset')"
        >
          Réinitialiser
        </button>
      </div>
    </div>

    <div v-if="filters.date || filters.rateEligibility !== 'all'" class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
      <span class="font-bold">Contexte du graphique :</span>
      <span v-if="filters.date">{{ formatBusinessDate(filters.date, 'fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) }}</span>
      <span v-if="filters.status !== 'ALL'" class="rounded-full bg-white px-2 py-0.5 font-bold">{{ ATTENDANCE_STATUS_PRESENTATION[filters.status].label }}</span>
      <button
        v-if="filters.rateEligibility !== 'all'"
        type="button"
        class="rounded-full bg-white px-2 py-0.5 font-bold ring-1 ring-indigo-100 hover:ring-indigo-300"
        @click="clearContextRateEligibility"
      >
        {{ filters.rateEligibility === 'eligible' ? 'Finalisées · dans les taux' : 'Non encore finalisées' }} ×
      </button>
      <button v-if="filters.date" type="button" class="ml-auto font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="clearContextDate">Retirer la date</button>
    </div>

    <p class="mt-3 text-xs text-slate-500">
      {{ resultCount }} employé{{ resultCount > 1 ? 's' : '' }} affichable{{ resultCount > 1 ? 's' : '' }} sur {{ totalCount }}.
      Les taux servent à explorer les données de présence, pas à établir un classement global de performance.
    </p>
  </div>
</template>
