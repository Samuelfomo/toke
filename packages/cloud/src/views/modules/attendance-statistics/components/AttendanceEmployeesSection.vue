<script setup lang="ts">
import { computed, ref } from 'vue';

import type { AttendanceEmployeeOverview, BusinessDate } from '../types/attendance-statistics.types.js';
import type {
  AttendanceEmployeeListFilters,
  AttendanceEmployeeSort,
  AttendanceEmployeeSortKey,
} from '../types/attendance-statistics.ui.types.js';
import {
  buildAttendanceEmployeeListModel,
  DEFAULT_ATTENDANCE_EMPLOYEE_FILTERS,
  DEFAULT_ATTENDANCE_EMPLOYEE_SORT,
  toggleAttendanceEmployeeSort,
} from '../utils/attendance-employees.js';
import AttendanceEmployeeDrawer from './AttendanceEmployeeDrawer.vue';
import AttendanceEmployeesPagination from './AttendanceEmployeesPagination.vue';
import AttendanceEmployeesTable from './AttendanceEmployeesTable.vue';
import AttendanceEmployeesToolbar from './AttendanceEmployeesToolbar.vue';

interface Props {
  employees: readonly AttendanceEmployeeOverview[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ manualFilterChange: [] }>();

const filters = ref<AttendanceEmployeeListFilters>({ ...DEFAULT_ATTENDANCE_EMPLOYEE_FILTERS });
const sort = ref<AttendanceEmployeeSort>({ ...DEFAULT_ATTENDANCE_EMPLOYEE_SORT });
const page = ref(1);
const pageSize = ref(10);
const selectedEmployee = ref<AttendanceEmployeeOverview | null>(null);
const selectedFocusDate = ref<BusinessDate | null>(null);

const list = computed(() =>
  buildAttendanceEmployeeListModel({
    employees: props.employees,
    filters: filters.value,
    sort: sort.value,
    pagination: { page: page.value, pageSize: pageSize.value },
  }),
);

function updateFilters(next: AttendanceEmployeeListFilters): void {
  filters.value = next;
  page.value = 1;
  emit('manualFilterChange');
}

function updateSort(next: AttendanceEmployeeSort): void {
  sort.value = next;
  page.value = 1;
}

function sortByColumn(key: AttendanceEmployeeSortKey): void {
  sort.value = toggleAttendanceEmployeeSort(sort.value, key);
  page.value = 1;
}

function reset(): void {
  filters.value = { ...DEFAULT_ATTENDANCE_EMPLOYEE_FILTERS };
  sort.value = { ...DEFAULT_ATTENDANCE_EMPLOYEE_SORT };
  page.value = 1;
  emit('manualFilterChange');
}

function updatePageSize(value: number): void {
  pageSize.value = value;
  page.value = 1;
}

function openEmployee(employeeGuid: string, focusDate: BusinessDate | null = null): boolean {
  const employee = props.employees.find((item) => item.employeeGuid === employeeGuid) ?? null;
  if (!employee) return false;
  selectedEmployee.value = employee;
  selectedFocusDate.value = focusDate;
  return true;
}

function openEmployeeFromTable(employee: AttendanceEmployeeOverview): void {
  selectedEmployee.value = employee;
  selectedFocusDate.value = null;
}

function closeEmployee(): void {
  selectedEmployee.value = null;
  selectedFocusDate.value = null;
}

function applyStatusFilter(status: AttendanceEmployeeListFilters['status']): void {
  filters.value = { ...filters.value, status, date: null };
  page.value = 1;
  document.getElementById('attendance-employees')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function applyDayStatusFilter(
  date: BusinessDate,
  status: Extract<AttendanceEmployeeListFilters['status'], 'ABSENT' | 'LATE'>,
): void {
  filters.value = { query: '', status, issues: 'all', date };
  page.value = 1;
  document.getElementById('attendance-employees')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyIssuesFilter(issues: AttendanceEmployeeListFilters['issues']): void {
  filters.value = { ...filters.value, issues };
  page.value = 1;
  document.getElementById('attendance-employees')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function focusSection(): void {
  document.getElementById('attendance-employees')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function clearDateFilter(): void {
  filters.value = { ...filters.value, date: null };
  page.value = 1;
}

function clearStatusFilter(): void {
  filters.value = { ...filters.value, status: 'ALL' };
  page.value = 1;
}

function resetAnalysisFilters(): void {
  filters.value = {
    ...filters.value,
    status: 'ALL',
    issues: 'all',
    date: null,
  };
  page.value = 1;
}

defineExpose({
  openEmployee,
  applyStatusFilter,
  applyDayStatusFilter,
  applyIssuesFilter,
  focusSection,
  clearDateFilter,
  clearStatusFilter,
  resetAnalysisFilters,
});
</script>

<template>
  <section id="attendance-employees" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="attendance-employees-title">
    <div class="flex flex-col gap-2 px-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Analyse individuelle</p>
        <h2 id="attendance-employees-title" class="mt-1 text-xl font-bold text-slate-950">Employés de l’équipe</h2>
        <p class="mt-1 text-sm text-slate-500">Recherchez un collaborateur et ouvrez son détail journalier sans quitter la vue d’ensemble.</p>
      </div>
      <span class="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{{ employees.length }} employé{{ employees.length > 1 ? 's' : '' }}</span>
    </div>

    <AttendanceEmployeesToolbar
      :filters="filters"
      :sort="sort"
      :result-count="list.filteredCount"
      :total-count="list.totalCount"
      @update:filters="updateFilters"
      @update:sort="updateSort"
      @reset="reset"
    />

    <AttendanceEmployeesTable
      :employees="list.rows"
      :sort="sort"
      @sort="sortByColumn"
      @view="openEmployeeFromTable"
    />

    <AttendanceEmployeesPagination
      :page="list.page"
      :page-count="list.pageCount"
      :page-size="list.pageSize"
      :from="list.from"
      :to="list.to"
      :total="list.filteredCount"
      @update:page="page = $event"
      @update:page-size="updatePageSize"
    />

    <AttendanceEmployeeDrawer
      :open="selectedEmployee !== null"
      :employee="selectedEmployee"
      :focus-date="selectedFocusDate"
      @close="closeEmployee"
    />
  </section>
</template>
