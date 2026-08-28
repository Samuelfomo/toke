<script setup lang="ts">
import { computed } from 'vue';

import type { AttendanceEmployeeOverview } from '../types/attendance-statistics.types.js';

interface Props { employees: readonly AttendanceEmployeeOverview[] }
const props = defineProps<Props>();
const emit = defineEmits<{
  viewEmployee: [employeeGuid: string];
  viewAll: [];
}>();

const rows = computed(() =>
  props.employees
    .filter((employee) => employee.issueCount > 0)
    .slice()
    .sort((a, b) => b.issueCount - a.issueCount || a.employeeName.localeCompare(b.employeeName, 'fr-FR'))
    .slice(0, 5),
);
</script>

<template>
  <section v-if="rows.length > 0" class="rounded-lg border border-orange-200 bg-orange-50/40 p-5 shadow-sm" aria-labelledby="attendance-attention-employees-title">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Priorité de lecture</p>
        <h2 id="attendance-attention-employees-title" class="mt-1 text-lg font-bold text-slate-950">Employés avec éléments à examiner</h2>
        <p class="mt-1 text-sm text-slate-600">Cette liste regroupe les employés pour lesquels des éléments nécessitent une vérification.</p>
      </div>
      <button
          type="button"
          class="group inline-flex self-start items-center gap-2 rounded-lg border border-orange-200/70 hover:bg-orange-50/20 px-3 py-2 text-sm font-bold text-orange-800 shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          @click="emit('viewAll')"
      >
        Voir tous les employés concernés
        <svg
            class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
    <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <button v-for="employee in rows" :key="employee.employeeGuid" type="button" class="rounded-xl border border-orange-100 bg-white p-3 text-left hover:border-orange-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600" @click="emit('viewEmployee', employee.employeeGuid)">
        <p class="truncate text-sm font-bold text-slate-950">{{ employee.employeeName }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ employee.issueCount }} élément{{ employee.issueCount > 1 ? 's' : '' }} à examiner</p>
      </button>
    </div>
  </section>
</template>
