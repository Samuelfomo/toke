<script setup lang="ts">
import type { AttendanceEmployeeOverview } from '@/views/modules/attendance-statistics';
import type { AttendanceEmployeeSort, AttendanceEmployeeSortKey } from '@/views/modules/attendance-statistics';
import { formatDurationMinutes } from '../utils/duration.js';
import { formatPercentage } from '../utils/percentage.js';

interface Props {
  employees: readonly AttendanceEmployeeOverview[];
  sort: AttendanceEmployeeSort;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  sort: [key: AttendanceEmployeeSortKey];
  view: [employee: AttendanceEmployeeOverview];
}>();

const columns: Array<{ key: AttendanceEmployeeSortKey; label: string; align?: 'left' | 'right' }> = [
  { key: 'employee_name', label: 'Employé', align: 'left' },
  { key: 'expected_days', label: 'Attendus' },
  { key: 'attendance_rate', label: 'Présence' },
  { key: 'punctuality_rate', label: 'Ponctualité' },
  { key: 'late_days', label: 'Retards' },
  { key: 'absence_days', label: 'Absences' },
  { key: 'issue_count', label: 'À examiner' },
  { key: 'net_minutes', label: 'Durée nette' },
];

function netDuration(employee: AttendanceEmployeeOverview): string {
  return employee.durations.daysWithKnownNetDuration > 0
    ? formatDurationMinutes(employee.durations.netMinutes)
    : 'Non disponible';
}

function sortIndicator(key: AttendanceEmployeeSortKey): string {
  if (props.sort.key !== key) return '';
  return props.sort.direction === 'asc' ? '↑' : '↓';
}

function sortAria(key: AttendanceEmployeeSortKey): 'ascending' | 'descending' | 'none' {
  if (props.sort.key !== key) return 'none';
  return props.sort.direction === 'asc' ? 'ascending' : 'descending';
}
</script>

<template>
  <div v-if="employees.length === 0" class="px-5 py-12 text-center">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
    <p class="mt-3 font-semibold text-slate-800">Aucun employé ne correspond aux filtres</p>
    <p class="mt-1 text-sm text-slate-500">Modifiez la recherche ou réinitialisez les filtres.</p>
  </div>

  <template v-else>
    <div class="hidden overflow-x-auto lg:block">
      <table class="min-w-full border-separate border-spacing-0 text-sm">
        <caption class="sr-only">Tableau des statistiques individuelles des employés</caption>
        <thead>
          <tr class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="border-b border-slate-200 px-4 py-3 font-bold"
              :class="column.align === 'left' ? 'text-left' : 'text-right'"
              :aria-sort="sortAria(column.key)"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                :class="column.align === 'left' ? '' : 'justify-end'"
                @click="emit('sort', column.key)"
              >
                {{ column.label }}
                <span class="min-w-3 text-indigo-600" aria-hidden="true">{{ sortIndicator(column.key) }}</span>
              </button>
            </th>
            <th scope="col" class="border-b border-slate-200 px-4 py-3 text-right font-bold">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="employee in employees" :key="employee.employeeGuid" class="group hover:bg-indigo-50/40">
            <td class="border-b border-slate-100 px-4 py-4">
              <button type="button" class="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="emit('view', employee)">
                <span class="block font-bold text-slate-900 group-hover:text-indigo-700">{{ employee.employeeName }}</span>
                <span class="mt-0.5 block max-w-[190px] truncate text-xs text-slate-500">{{ employee.employeeGuid }}</span>
              </button>
            </td>
            <td class="border-b border-slate-100 px-4 py-4 text-right font-medium text-slate-700">{{ employee.rates.employeeWorkingDaysExpected }}</td>
            <td class="border-b border-slate-100 px-4 py-4 text-right font-bold text-slate-900">{{ formatPercentage(employee.rates.attendanceRate) }}</td>
            <td class="border-b border-slate-100 px-4 py-4 text-right text-slate-700">{{ formatPercentage(employee.rates.punctualityRate) }}</td>
            <td class="border-b border-slate-100 px-4 py-4 text-right text-amber-700">{{ employee.statusTotals.LATE }}</td>
            <td class="border-b border-slate-100 px-4 py-4 text-right text-rose-700">{{ employee.statusTotals.ABSENT }}</td>
            <td class="border-b border-slate-100 px-4 py-4 text-right">
              <span
                class="inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-xs font-bold"
                :class="employee.issueCount > 0 ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'"
              >
                {{ employee.issueCount }}
              </span>
            </td>
            <td class="border-b border-slate-100 px-4 py-4 text-right text-slate-700">{{ netDuration(employee) }}</td>
            <td class="border-b border-slate-100 px-4 py-4 text-right">
              <button
                type="button"
                class="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                @click="emit('view', employee)"
              >
                Voir le détail
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
      <article v-for="employee in employees" :key="employee.employeeGuid" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="truncate font-bold text-slate-900">{{ employee.employeeName }}</h3>
            <p class="mt-0.5 truncate text-xs text-slate-500">{{ employee.employeeGuid }}</p>
          </div>
          <span
            class="rounded-full px-2 py-1 text-xs font-bold"
            :class="employee.issueCount > 0 ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'"
          >
            {{ employee.issueCount }} anomalie{{ employee.issueCount > 1 ? 's' : '' }}
          </span>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div><dt class="text-xs text-slate-500">Présence</dt><dd class="font-bold text-slate-900">{{ formatPercentage(employee.rates.attendanceRate) }}</dd></div>
          <div><dt class="text-xs text-slate-500">Ponctualité</dt><dd class="font-semibold text-slate-800">{{ formatPercentage(employee.rates.punctualityRate) }}</dd></div>
          <div><dt class="text-xs text-slate-500">Retards</dt><dd class="font-semibold text-amber-700">{{ employee.statusTotals.LATE }}</dd></div>
          <div><dt class="text-xs text-slate-500">Absences</dt><dd class="font-semibold text-rose-700">{{ employee.statusTotals.ABSENT }}</dd></div>
          <div class="col-span-2"><dt class="text-xs text-slate-500">Durée nette</dt><dd class="font-semibold text-slate-800">{{ netDuration(employee) }}</dd></div>
        </dl>

        <button type="button" class="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" @click="emit('view', employee)">
          Consulter le détail
        </button>
      </article>
    </div>
  </template>
</template>
