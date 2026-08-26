import type {
  AttendanceIssue,
  AttendanceIssueOccurrence,
  AttendanceIssueSummary,
} from '../../types/attendance-statistics.types.js';
import { sortAttendanceIssues } from '../../utils/attendance-issues.js';
import {
  ATTENDANCE_ISSUE_PRESENTATION,
  ATTENDANCE_STATUS_PRESENTATION,
} from '../../utils/attendance-status.js';
import { formatBusinessDate } from '../../utils/business-date.js';
import type {
  AttendancePdfPresentationProfile,
  AttendancePdfReportContract,
  AttendancePdfSourceTarget,
} from '../types/attendance-pdf.types.js';

export type AttendancePdfIssueFamily = 'planning' | 'session' | 'duration';

export interface AttendancePdfIssueOccurrenceRow {
  employeeGuid: string;
  employeeName: string;
  date: string;
  dateLabel: string;
  status: AttendanceIssueOccurrence['status'];
  statusLabel: string;
  issue: AttendanceIssue;
  issueLabel: string;
  sourceLabel: string;
  sourceTarget: AttendancePdfSourceTarget;
}

export interface AttendancePdfIssueTypeModel {
  issue: AttendanceIssue;
  label: string;
  family: AttendancePdfIssueFamily;
  actionLabel: string;
  count: number;
  employeesConcerned: number;
  detailedOccurrenceCount: number;
  hiddenApiOccurrenceCount: number;
  omittedByPresentationCount: number;
  rows: AttendancePdfIssueOccurrenceRow[];
}

export interface AttendancePdfIssueFamilyModel {
  family: AttendancePdfIssueFamily;
  label: string;
  issueTypes: AttendancePdfIssueTypeModel[];
  occurrenceCount: number;
  issueTypeCount: number;
}

export interface AttendancePdfIssuesModel {
  title: string;
  description: string;
  presentationLevel: AttendancePdfPresentationProfile['level'];
  presentationLabel: string;
  families: AttendancePdfIssueFamilyModel[];
  totalIssueTypeCount: number;
  totalOccurrenceCount: number;
  totalDetailedOccurrenceCount: number;
  totalHiddenApiOccurrenceCount: number;
  totalOmittedByPresentationCount: number;
  selectedIssue: AttendanceIssue | null;
  empty: boolean;
}

const FAMILY_LABELS: Record<AttendancePdfIssueFamily, string> = {
  planning: 'Planning',
  session: 'Sessions',
  duration: 'Durées',
};

const FAMILY_ORDER: AttendancePdfIssueFamily[] = ['planning', 'session', 'duration'];

function toOccurrenceRow(
  issue: AttendanceIssue,
  occurrence: AttendanceIssueOccurrence,
): AttendancePdfIssueOccurrenceRow {
  const dateLabel = formatBusinessDate(occurrence.date, 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    employeeGuid: occurrence.employeeGuid,
    employeeName: occurrence.employeeName,
    date: occurrence.date,
    dateLabel,
    status: occurrence.status,
    statusLabel: ATTENDANCE_STATUS_PRESENTATION[occurrence.status].label,
    issue,
    issueLabel: ATTENDANCE_ISSUE_PRESENTATION[issue].label,
    sourceLabel: `Pointage du ${dateLabel}`,
    sourceTarget: {
      kind: 'attendance_day',
      employeeGuid: occurrence.employeeGuid,
      date: occurrence.date,
      status: occurrence.status,
      issue,
    },
  };
}

function resolveRows(
  summary: AttendanceIssueSummary,
  presentation: AttendancePdfPresentationProfile,
): AttendancePdfIssueOccurrenceRow[] {
  if (presentation.issueDetails === 'none') return [];
  const occurrences =
    presentation.issueDetails === 'all'
      ? summary.occurrences
      : summary.occurrences.slice(0, presentation.issueOccurrenceLimitPerType ?? 0);

  return occurrences.map((occurrence) => toOccurrenceRow(summary.issue, occurrence));
}

function toIssueType(
  summary: AttendanceIssueSummary,
  presentation: AttendancePdfPresentationProfile,
): AttendancePdfIssueTypeModel {
  const issuePresentation = ATTENDANCE_ISSUE_PRESENTATION[summary.issue];
  const rows = resolveRows(summary, presentation);
  const hiddenApiOccurrenceCount = Math.max(0, summary.count - summary.occurrences.length);
  const omittedByPresentationCount = Math.max(0, summary.occurrences.length - rows.length);

  return {
    issue: summary.issue,
    label: issuePresentation.label,
    family: issuePresentation.family,
    actionLabel: issuePresentation.actionLabel,
    count: summary.count,
    employeesConcerned: summary.employeesConcerned,
    detailedOccurrenceCount: summary.occurrences.length,
    hiddenApiOccurrenceCount,
    omittedByPresentationCount,
    rows,
  };
}

/**
 * Prépare uniquement la présentation des éléments déjà détectés par le backend.
 * Les compteurs `count` et `employeesConcerned` restent ceux de l'API.
 * Le nombre de lignes visibles est un choix de présentation du PDF, jamais un recalcul métier.
 */
export function buildAttendancePdfIssuesModel(
  contract: AttendancePdfReportContract,
): AttendancePdfIssuesModel {
  const selectedIssue = contract.selection.issue;
  const source = selectedIssue
    ? contract.request.overview.issues.filter((summary) => summary.issue === selectedIssue)
    : contract.request.overview.issues;

  const issueTypes = sortAttendanceIssues(source).map((summary) =>
    toIssueType(summary, contract.presentationProfile),
  );

  const families = FAMILY_ORDER.map((family) => {
    const familyTypes = issueTypes.filter((issueType) => issueType.family === family);
    return {
      family,
      label: FAMILY_LABELS[family],
      issueTypes: familyTypes,
      occurrenceCount: familyTypes.reduce((sum, issueType) => sum + issueType.count, 0),
      issueTypeCount: familyTypes.length,
    } satisfies AttendancePdfIssueFamilyModel;
  }).filter((family) => family.issueTypeCount > 0);

  return {
    title: 'Éléments à examiner',
    description:
      "Ces éléments sont des signaux détectés par Toké à partir des données disponibles. Ils doivent être examinés avant de conclure à une erreur terrain. La correction future devra se faire sur la donnée source autorisée, puis les statistiques seront recalculées.",
    presentationLevel: contract.presentationProfile.level,
    presentationLabel: contract.presentationProfile.label,
    families,
    totalIssueTypeCount: issueTypes.length,
    totalOccurrenceCount: issueTypes.reduce((sum, issueType) => sum + issueType.count, 0),
    totalDetailedOccurrenceCount: issueTypes.reduce(
      (sum, issueType) => sum + issueType.detailedOccurrenceCount,
      0,
    ),
    totalHiddenApiOccurrenceCount: issueTypes.reduce(
      (sum, issueType) => sum + issueType.hiddenApiOccurrenceCount,
      0,
    ),
    totalOmittedByPresentationCount: issueTypes.reduce(
      (sum, issueType) => sum + issueType.omittedByPresentationCount,
      0,
    ),
    selectedIssue,
    empty: issueTypes.length === 0,
  };
}
