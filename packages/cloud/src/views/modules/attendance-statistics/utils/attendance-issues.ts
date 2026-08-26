import type {
  AttendanceIssue,
  AttendanceIssueOccurrence,
  AttendanceIssueSummary,
} from '../types/attendance-statistics.types.js';
import { ATTENDANCE_ISSUE_PRESENTATION } from './attendance-status.js';

export const ATTENDANCE_ISSUE_FAMILY_FILTERS = [
  'all',
  'planning',
  'session',
  'duration',
] as const;

export type AttendanceIssueFamilyFilter =
  (typeof ATTENDANCE_ISSUE_FAMILY_FILTERS)[number];

export interface AttendanceIssueListFilters {
  query: string;
  family: AttendanceIssueFamilyFilter;
}

export interface AttendanceIssueTarget {
  employeeGuid: string;
  employeeName: string;
  date: string;
  issue: AttendanceIssue;
  status: AttendanceIssueOccurrence['status'];
}

export interface AttendanceIssueDashboardSummary {
  issueTypeCount: number;
  occurrenceCount: number;
  employeesConcerned: number;
  visibleOccurrenceCount: number;
}

export interface AttendanceIssueListModel {
  rows: AttendanceIssueSummary[];
  summary: AttendanceIssueDashboardSummary;
  totalIssueTypeCount: number;
  filteredIssueTypeCount: number;
}

const OPERATIONAL_DISPLAY_ORDER: Record<AttendanceIssue, number> = {
  MISSING_SCHEDULE: 1,
  INVALID_SCHEDULE: 2,
  OPEN_SESSION: 3,
  INCOMPLETE_SESSION: 4,
  MISSING_DURATION: 5,
  PRESENCE_WITHOUT_SCHEDULE: 6,
  PRESENCE_ON_REST_DAY: 7,
};

export const DEFAULT_ATTENDANCE_ISSUE_FILTERS: AttendanceIssueListFilters = {
  query: '',
  family: 'all',
};

/**
 * Normalisation exclusivement destinée à la recherche locale dans les libellés,
 * noms, GUID et dates. Elle ne modifie aucune donnée métier.
 */
export function normalizeAttendanceIssueSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim();
}

export function filterAttendanceIssues(
  issues: readonly AttendanceIssueSummary[],
  filters: AttendanceIssueListFilters,
): AttendanceIssueSummary[] {
  const query = normalizeAttendanceIssueSearch(filters.query);

  return issues.filter((summary) => {
    const presentation = ATTENDANCE_ISSUE_PRESENTATION[summary.issue];
    if (filters.family !== 'all' && presentation.family !== filters.family) return false;
    if (!query) return true;

    const occurrenceText = summary.occurrences
      .map((occurrence) =>
        [occurrence.employeeName, occurrence.employeeGuid, occurrence.date, occurrence.status].join(
          ' ',
        ),
      )
      .join(' ');

    const searchable = normalizeAttendanceIssueSearch(
      [summary.issue, presentation.label, presentation.actionLabel, occurrenceText].join(' '),
    );

    return searchable.includes(query);
  });
}

/**
 * Ordre d'affichage opérationnel, pas niveau de gravité métier.
 * À ordre égal, le nombre d'occurrences retourné par l'API départage les cartes.
 */
export function sortAttendanceIssues(
  issues: readonly AttendanceIssueSummary[],
): AttendanceIssueSummary[] {
  return [...issues].sort((left, right) => {
    const orderDiff =
      OPERATIONAL_DISPLAY_ORDER[left.issue] - OPERATIONAL_DISPLAY_ORDER[right.issue];
    if (orderDiff !== 0) return orderDiff;
    if (left.count !== right.count) return right.count - left.count;
    return left.issue.localeCompare(right.issue, 'fr');
  });
}

export function summarizeAttendanceIssues(
  issues: readonly AttendanceIssueSummary[],
): AttendanceIssueDashboardSummary {
  const employeeGuids = new Set<string>();
  let occurrenceCount = 0;
  let visibleOccurrenceCount = 0;

  for (const summary of issues) {
    occurrenceCount += summary.count;
    visibleOccurrenceCount += summary.occurrences.length;
    for (const occurrence of summary.occurrences) employeeGuids.add(occurrence.employeeGuid);
  }

  return {
    issueTypeCount: issues.length,
    occurrenceCount,
    employeesConcerned: employeeGuids.size,
    visibleOccurrenceCount,
  };
}

export function buildAttendanceIssueListModel(input: {
  issues: readonly AttendanceIssueSummary[];
  filters: AttendanceIssueListFilters;
}): AttendanceIssueListModel {
  const rows = sortAttendanceIssues(filterAttendanceIssues(input.issues, input.filters));
  return {
    rows,
    summary: summarizeAttendanceIssues(rows),
    totalIssueTypeCount: input.issues.length,
    filteredIssueTypeCount: rows.length,
  };
}

export function toAttendanceIssueTarget(
  issue: AttendanceIssue,
  occurrence: AttendanceIssueOccurrence,
): AttendanceIssueTarget {
  return {
    employeeGuid: occurrence.employeeGuid,
    employeeName: occurrence.employeeName,
    date: occurrence.date,
    issue,
    status: occurrence.status,
  };
}

export function getHiddenAttendanceOccurrenceCount(summary: AttendanceIssueSummary): number {
  return Math.max(0, summary.count - summary.occurrences.length);
}
