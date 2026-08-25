import type {
  AttendanceEmployeeOverview,
  AttendanceStatus,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import type {
  AttendanceEmployeeIssueFilter,
  AttendanceEmployeeListFilters,
  AttendanceEmployeePagination,
  AttendanceEmployeeSort,
  AttendanceEmployeeSortKey,
  AttendanceEmployeeStatusFilter,
  AttendanceSortDirection,
} from '../types/attendance-statistics.ui.types.js';

export interface AttendanceEmployeeListModel {
  rows: AttendanceEmployeeOverview[];
  filteredCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  from: number;
  to: number;
}

export const DEFAULT_ATTENDANCE_EMPLOYEE_FILTERS: AttendanceEmployeeListFilters = {
  query: '',
  status: 'ALL',
  issues: 'all',
  date: null,
};

export const DEFAULT_ATTENDANCE_EMPLOYEE_SORT: AttendanceEmployeeSort = {
  key: 'employee_name',
  direction: 'asc',
};

export const DEFAULT_ATTENDANCE_EMPLOYEE_PAGINATION: AttendanceEmployeePagination = {
  page: 1,
  pageSize: 10,
};

/**
 * Recherche locale tolérante aux accents, à la casse et aux espaces multiples.
 */
export function normalizeAttendanceEmployeeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
    .replace(/\s+/g, ' ');
}

export function employeeHasStatus(
  employee: AttendanceEmployeeOverview,
  status: AttendanceEmployeeStatusFilter,
): boolean {
  if (status === 'ALL') return true;
  return employee.statusTotals[status] > 0;
}


export function employeeMatchesDateStatus(
  employee: AttendanceEmployeeOverview,
  date: BusinessDate | null,
  status: AttendanceEmployeeStatusFilter,
): boolean {
  if (!date) return employeeHasStatus(employee, status);

  const day = employee.days.find((item) => item.date === date);
  if (!day) return false;
  return status === 'ALL' || day.status === status;
}

export function employeeMatchesIssueFilter(
  employee: AttendanceEmployeeOverview,
  issueFilter: AttendanceEmployeeIssueFilter,
): boolean {
  if (issueFilter === 'all') return true;
  return issueFilter === 'with_issues' ? employee.issueCount > 0 : employee.issueCount === 0;
}

export function filterAttendanceEmployees(
  employees: readonly AttendanceEmployeeOverview[],
  filters: AttendanceEmployeeListFilters,
): AttendanceEmployeeOverview[] {
  const query = normalizeAttendanceEmployeeSearch(filters.query);

  return employees.filter((employee) => {
    if (query.length > 0) {
      const searchable = normalizeAttendanceEmployeeSearch(
        `${employee.employeeName} ${employee.employeeGuid}`,
      );
      if (!searchable.includes(query)) return false;
    }

    return (
      employeeMatchesDateStatus(employee, filters.date, filters.status) &&
      employeeMatchesIssueFilter(employee, filters.issues)
    );
  });
}

/**
 * Les valeurs nulles sont toujours placées après les valeurs calculables,
 * indépendamment du sens du tri. Cela évite de présenter « non calculable »
 * comme la meilleure ou la pire performance.
 */
export function sortAttendanceEmployees(
  employees: readonly AttendanceEmployeeOverview[],
  sort: AttendanceEmployeeSort,
): AttendanceEmployeeOverview[] {
  return employees
    .map((employee, originalIndex) => ({ employee, originalIndex }))
    .sort((left, right) => {
      const leftValue = getEmployeeSortValue(left.employee, sort.key);
      const rightValue = getEmployeeSortValue(right.employee, sort.key);

      const nullComparison = compareNullableValues(leftValue, rightValue);
      if (nullComparison !== null) return nullComparison;

      const comparison = compareDefinedValues(leftValue!, rightValue!);
      if (comparison !== 0) return sort.direction === 'asc' ? comparison : -comparison;

      const nameComparison = left.employee.employeeName.localeCompare(
        right.employee.employeeName,
        'fr-FR',
        { sensitivity: 'base' },
      );
      if (nameComparison !== 0) return nameComparison;
      return left.originalIndex - right.originalIndex;
    })
    .map(({ employee }) => employee);
}

export function buildAttendanceEmployeeListModel(input: {
  employees: readonly AttendanceEmployeeOverview[];
  filters: AttendanceEmployeeListFilters;
  sort: AttendanceEmployeeSort;
  pagination: AttendanceEmployeePagination;
}): AttendanceEmployeeListModel {
  const filtered = filterAttendanceEmployees(input.employees, input.filters);
  const sorted = sortAttendanceEmployees(filtered, input.sort);
  const pageSize = normalizePageSize(input.pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = clampInteger(input.pagination.page, 1, pageCount);
  const start = (page - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);

  return {
    rows,
    filteredCount: sorted.length,
    totalCount: input.employees.length,
    page,
    pageSize,
    pageCount,
    from: sorted.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, sorted.length),
  };
}

export function toggleAttendanceEmployeeSort(
  current: AttendanceEmployeeSort,
  key: AttendanceEmployeeSortKey,
): AttendanceEmployeeSort {
  if (current.key !== key) return { key, direction: defaultSortDirection(key) };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export function getEmployeeSortValue(
  employee: AttendanceEmployeeOverview,
  key: AttendanceEmployeeSortKey,
): string | number | null {
  switch (key) {
    case 'employee_name':
      return employee.employeeName;
    case 'expected_days':
      return employee.rates.employeeWorkingDaysExpected;
    case 'attendance_rate':
      return employee.rates.attendanceRate;
    case 'punctuality_rate':
      return employee.rates.punctualityRate;
    case 'late_days':
      return employee.statusTotals.LATE;
    case 'absence_days':
      return employee.statusTotals.ABSENT;
    case 'issue_count':
      return employee.issueCount;
    case 'net_minutes':
      return employee.durations.daysWithKnownNetDuration > 0
        ? employee.durations.netMinutes
        : null;
  }
}

export function employeeDayHasActionableIssue(
  issues: readonly string[],
): boolean {
  return issues.length > 0;
}

export function filterEmployeeDays(
  days: readonly AttendanceEmployeeOverview['days'][number][],
  status: 'ALL' | AttendanceStatus,
  issuesOnly: boolean,
): AttendanceEmployeeOverview['days'] {
  return days
    .filter((day) => status === 'ALL' || day.status === status)
    .filter((day) => !issuesOnly || employeeDayHasActionableIssue(day.issues))
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date));
}

function defaultSortDirection(key: AttendanceEmployeeSortKey): AttendanceSortDirection {
  return key === 'employee_name' ? 'asc' : 'desc';
}

function compareNullableValues(
  left: string | number | null,
  right: string | number | null,
): number | null {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return null;
}

function compareDefinedValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'fr-FR', {
    sensitivity: 'base',
    numeric: true,
  });
}

function normalizePageSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ATTENDANCE_EMPLOYEE_PAGINATION.pageSize;
  return clampInteger(Math.trunc(value), 1, 100);
}

function clampInteger(value: number, min: number, max: number): number {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.min(max, Math.max(min, normalized));
}
