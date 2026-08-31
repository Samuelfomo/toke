import type {
  AttendanceIssue,
  AttendanceOverview,
  AttendanceStatus,
  BusinessDate,
} from '../types/attendance-statistics.types.js';
import { ATTENDANCE_ISSUE_PRESENTATION, ATTENDANCE_STATUS_PRESENTATION } from './attendance-status.js';
import { formatBusinessDate } from './business-date.js';

export type AttendanceAnalysisSource =
  | 'kpi'
  | 'trend'
  | 'status_distribution'
  | 'issues'
  | 'attention'
  | 'quality'
  | 'today';

export interface AttendanceAnalysisContext {
  source: AttendanceAnalysisSource;
  label: string;
  status: AttendanceStatus | null;
  date: BusinessDate | null;
  /** null = toute journée, true = finalisée/prise en compte, false = non encore prise en compte. */
  rateEligible: boolean | null;
  employeeGuid: string | null;
  employeeName: string | null;
  issue: AttendanceIssue | null;
}

export const EMPTY_ATTENDANCE_ANALYSIS_CONTEXT: AttendanceAnalysisContext | null = null;

export function createAttendanceAnalysisContext(input: {
  source: AttendanceAnalysisSource;
  label?: string;
  status?: AttendanceStatus | null;
  date?: BusinessDate | null;
  rateEligible?: boolean | null;
  employeeGuid?: string | null;
  employeeName?: string | null;
  issue?: AttendanceIssue | null;
}): AttendanceAnalysisContext {
  const status = input.status ?? null;
  const date = input.date ?? null;
  const rateEligible = input.rateEligible ?? null;
  const issue = input.issue ?? null;
  const employeeName = input.employeeName ?? null;

  return {
    source: input.source,
    label:
      input.label ??
      buildAttendanceAnalysisContextLabel({ status, date, rateEligible, issue, employeeName }),
    status,
    date,
    rateEligible,
    employeeGuid: input.employeeGuid ?? null,
    employeeName,
    issue,
  };
}

export function getAttendanceRateEligibilityLabel(rateEligible: boolean): string {
  return rateEligible
    ? 'Journées finalisées prises en compte'
    : 'Journées non encore prises en compte';
}

export function buildAttendanceAnalysisContextLabel(input: {
  status: AttendanceStatus | null;
  date: BusinessDate | null;
  rateEligible: boolean | null;
  issue: AttendanceIssue | null;
  employeeName: string | null;
}): string {
  const parts: string[] = [];
  if (input.status) parts.push(ATTENDANCE_STATUS_PRESENTATION[input.status].label);
  if (input.rateEligible !== null) parts.push(getAttendanceRateEligibilityLabel(input.rateEligible));
  if (input.issue) parts.push(ATTENDANCE_ISSUE_PRESENTATION[input.issue].label);
  if (input.date) parts.push(formatBusinessDate(input.date));
  if (input.employeeName) parts.push(input.employeeName);
  return parts.length > 0 ? parts.join(' · ') : 'Exploration du dashboard';
}

export function clearAttendanceAnalysisDate(
  context: AttendanceAnalysisContext,
): AttendanceAnalysisContext {
  return createAttendanceAnalysisContext({
    source: context.source,
    status: context.status,
    date: null,
    rateEligible: context.rateEligible,
    employeeGuid: context.employeeGuid,
    employeeName: context.employeeName,
    issue: context.issue,
  });
}

export function clearAttendanceAnalysisStatus(
  context: AttendanceAnalysisContext,
): AttendanceAnalysisContext {
  return createAttendanceAnalysisContext({
    source: context.source,
    status: null,
    date: context.date,
    rateEligible: context.rateEligible,
    employeeGuid: context.employeeGuid,
    employeeName: context.employeeName,
    issue: context.issue,
  });
}

export function clearAttendanceAnalysisRateEligibility(
  context: AttendanceAnalysisContext,
): AttendanceAnalysisContext {
  return createAttendanceAnalysisContext({
    source: context.source,
    status: context.status,
    date: context.date,
    rateEligible: null,
    employeeGuid: context.employeeGuid,
    employeeName: context.employeeName,
    issue: context.issue,
  });
}

export function getAttendanceAnalysisEmployeeCount(
  overview: AttendanceOverview,
  context: AttendanceAnalysisContext | null,
): number {
  if (!context) return overview.employees.length;

  return overview.employees.filter((employee) => {
    if (context.employeeGuid && employee.employeeGuid !== context.employeeGuid) return false;

    if (context.date || context.status || context.rateEligible !== null) {
      const matchingDays = context.date
        ? employee.days.filter((day) => day.date === context.date)
        : employee.days;

      const hasMatchingDay = matchingDays.some((day) => {
        if (context.status && day.status !== context.status) return false;
        if (context.rateEligible !== null && day.rateEligible !== context.rateEligible) return false;
        return true;
      });

      if (!hasMatchingDay) return false;
    }

    if (context.issue && !employee.days.some((day) => day.issues.includes(context.issue!))) return false;
    return true;
  }).length;
}

export function isAttendanceAnalysisContextValid(
  overview: AttendanceOverview,
  context: AttendanceAnalysisContext | null,
): boolean {
  if (!context) return true;
  if (context.date && !overview.daily.some((day) => day.date === context.date)) return false;
  if (context.employeeGuid && !overview.employees.some((employee) => employee.employeeGuid === context.employeeGuid)) return false;
  if (context.issue && !overview.issues.some((issue) => issue.issue === context.issue)) return false;
  if ((context.status || context.rateEligible !== null) && getAttendanceAnalysisEmployeeCount(overview, context) === 0) return false;
  return true;
}

export function getAttendanceAnalysisSourceLabel(source: AttendanceAnalysisSource): string {
  return {
    kpi: 'KPI',
    trend: 'Graphique',
    status_distribution: 'Répartition',
    issues: 'Anomalie',
    attention: 'À examiner',
    quality: 'Qualité',
    today: 'Aujourd’hui',
  }[source];
}
