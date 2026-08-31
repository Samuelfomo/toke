import type {
  AttendanceOverview,
  AttendanceStatisticsFilters,
  BusinessDate,
} from './attendance-statistics.types.js';

export const ATTENDANCE_PERIOD_PRESETS = [
  'today',
  'current_week',
  'current_month',
  'previous_month',
  'custom',
] as const;

export type AttendancePeriodPreset = (typeof ATTENDANCE_PERIOD_PRESETS)[number];

export interface AttendanceSiteOption {
  guid: string;
  name: string;
  active?: boolean;
}

export interface AttendanceFiltersSubmission {
  filters: AttendanceStatisticsFilters;
  preset: AttendancePeriodPreset;
}

export interface AttendancePeriodRange {
  startDate: BusinessDate;
  endDate: BusinessDate;
}

export type AttendanceOverviewPageState = 'idle' | 'loading' | 'error' | 'empty' | 'ready';

export interface AttendanceOverviewPageSnapshot {
  state: AttendanceOverviewPageState;
  overview: AttendanceOverview | null;
  filters: AttendanceStatisticsFilters;
  activePreset: AttendancePeriodPreset;
}

export const ATTENDANCE_EMPLOYEE_SORT_KEYS = [
  'employee_name',
  'expected_days',
  'attendance_rate',
  'punctuality_rate',
  'late_days',
  'absence_days',
  'issue_count',
  'net_minutes',
] as const;

export type AttendanceEmployeeSortKey = (typeof ATTENDANCE_EMPLOYEE_SORT_KEYS)[number];
export type AttendanceSortDirection = 'asc' | 'desc';
export type AttendanceEmployeeStatusFilter = 'ALL' | import('./attendance-statistics.types.js').AttendanceStatus;
export type AttendanceEmployeeIssueFilter = 'all' | 'with_issues' | 'without_issues';
export type AttendanceEmployeeRateEligibilityFilter = 'all' | 'eligible' | 'not_eligible';

export interface AttendanceEmployeeListFilters {
  query: string;
  status: AttendanceEmployeeStatusFilter;
  issues: AttendanceEmployeeIssueFilter;
  /** Filtre exact sur day.rateEligible. */
  rateEligibility: AttendanceEmployeeRateEligibilityFilter;
  /** Date métier ciblée par un drill-down du graphique. null = filtre sur toute la période. */
  date: BusinessDate | null;
}

export interface AttendanceEmployeeSort {
  key: AttendanceEmployeeSortKey;
  direction: AttendanceSortDirection;
}

export interface AttendanceEmployeePagination {
  page: number;
  pageSize: number;
}

export type {
  AttendanceIssueFamilyFilter,
  AttendanceIssueListFilters,
  AttendanceIssueTarget,
} from '../utils/attendance-issues.js';
