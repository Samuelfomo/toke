import type {
  AttendanceDataQualityLevel,
  AttendanceIssue,
  AttendanceOverview,
  AttendanceStatus,
} from '../../types/attendance-statistics.types.js';
import { buildAttendanceDataQualityPresentation } from '../../utils/attendance-data-quality.js';
import { buildPrimaryAttendanceKpis } from '../../utils/attendance-kpis.js';
import { sortAttendanceIssues } from '../../utils/attendance-issues.js';
import {
  ATTENDANCE_ISSUE_PRESENTATION,
  ATTENDANCE_STATUS_PRESENTATION,
} from '../../utils/attendance-status.js';
import { ATTENDANCE_PDF_PAGINATION_TARGETS } from '../config/attendance-pdf-layout.js';

export interface AttendancePdfExecutiveKpi {
  id: 'attendance_rate' | 'punctuality_rate' | 'absences' | 'late_days' | 'issues';
  label: string;
  value: string;
  explanation: string;
  accent: 'accent' | 'success' | 'danger' | 'warning';
}

export interface AttendancePdfExecutiveQuality {
  level: AttendanceDataQualityLevel;
  label: string;
  message: string;
  signals: Array<{ label: string; value: number }>;
}

export interface AttendancePdfExecutiveStatusRow {
  status: AttendanceStatus;
  label: string;
  count: number;
  group: 'eligible' | 'excluded';
}

export interface AttendancePdfExecutiveAttentionItem {
  issue: AttendanceIssue;
  label: string;
  count: number;
  employeesConcerned: number;
}

export interface AttendancePdfExecutiveSummaryModel {
  title: string;
  scopeLine: string;
  isSingleDay: boolean;
  statusPanelTitle: string;
  eligibleGroupLabel: string;
  excludedGroupLabel: string;
  attentionEmptyLabel: string;
  quality: AttendancePdfExecutiveQuality;
  kpis: AttendancePdfExecutiveKpi[];
  statusRows: AttendancePdfExecutiveStatusRow[];
  attentionItems: AttendancePdfExecutiveAttentionItem[];
  hiddenAttentionTypeCount: number;
}

function plural(value: number, singular: string, pluralValue: string = `${singular}s`): string {
  return value === 1 ? singular : pluralValue;
}

function buildKpis(overview: AttendanceOverview): AttendancePdfExecutiveKpi[] {
  return buildPrimaryAttendanceKpis(overview).map((card) => {
    switch (card.id) {
      case 'attendance_rate':
        return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'accent' };
      case 'punctuality_rate':
        return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'success' };
      case 'absences':
        return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'danger' };
      case 'late_days':
        return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'warning' };
      case 'issues':
        return { id: card.id, label: card.label, value: card.value, explanation: card.helper, accent: 'warning' };
      case 'net_duration':
        throw new Error('La durée nette ne fait pas partie des KPI décisionnels de la synthèse PDF.');
    }
  });
}

function buildStatusRows(overview: AttendanceOverview): AttendancePdfExecutiveStatusRow[] {
  const statuses = (Object.keys(ATTENDANCE_STATUS_PRESENTATION) as AttendanceStatus[]).sort(
    (left, right) =>
      ATTENDANCE_STATUS_PRESENTATION[left].order - ATTENDANCE_STATUS_PRESENTATION[right].order,
  );

  const allDays = overview.employees.flatMap((employee) => employee.days);

  // Fallback de compatibilité si un snapshot ancien ne transporte pas le détail journalier.
  if (allDays.length === 0) {
    return statuses.map((status) => ({
      status,
      label: ATTENDANCE_STATUS_PRESENTATION[status].label,
      count: overview.summary.statusTotals[status],
      group: ATTENDANCE_STATUS_PRESENTATION[status].rateCategory,
    }));
  }

  const rows: AttendancePdfExecutiveStatusRow[] = [];
  statuses.forEach((status) => {
    const eligibleCount = allDays.filter((day) => day.status === status && day.rateEligible).length;
    const excludedCount = allDays.filter((day) => day.status === status && !day.rateEligible).length;

    if (eligibleCount > 0) {
      rows.push({
        status,
        label: ATTENDANCE_STATUS_PRESENTATION[status].label,
        count: eligibleCount,
        group: 'eligible',
      });
    }
    if (excludedCount > 0) {
      rows.push({
        status,
        label: ATTENDANCE_STATUS_PRESENTATION[status].label,
        count: excludedCount,
        group: 'excluded',
      });
    }
  });
  return rows;
}

export function buildAttendancePdfExecutiveSummaryModel(
  overview: AttendanceOverview,
): AttendancePdfExecutiveSummaryModel {
  const isSingleDay = overview.period.dayCount === 1;
  const qualityPresentation = buildAttendanceDataQualityPresentation(overview.dataQuality);
  const nonZeroQualitySignals = qualityPresentation.metrics
    .filter((metric) => metric.value > 0)
    .map((metric) => ({ label: metric.label, value: metric.value }));

  const sortedIssues = sortAttendanceIssues(overview.issues);
  const attentionItems = sortedIssues
    .slice(0, ATTENDANCE_PDF_PAGINATION_TARGETS.executiveAttentionItemsMax)
    .map((summary) => ({
      issue: summary.issue,
      label: ATTENDANCE_ISSUE_PRESENTATION[summary.issue].label,
      count: summary.count,
      employeesConcerned: summary.employeesConcerned,
    }));

  return {
    title: 'Synthèse décisionnelle',
    scopeLine: isSingleDay
      ? `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · situation du jour`
      : `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · ${overview.period.dayCount} ${plural(overview.period.dayCount, 'jour', 'jours')} analysé${overview.period.dayCount === 1 ? '' : 's'}`,
    isSingleDay,
    statusPanelTitle: isSingleDay ? 'Répartition des situations du jour' : 'Répartition des journées de travail',
    eligibleGroupLabel: isSingleDay
      ? 'Situations finalisées · prises en compte'
      : 'Journées finalisées · prises en compte',
    excludedGroupLabel: isSingleDay
      ? 'Situations hors calcul ou encore en cours'
      : 'Journées hors calcul ou non encore finalisées',
    attentionEmptyLabel: isSingleDay
      ? 'Aucun élément à examiner aujourd’hui.'
      : 'Aucun élément à examiner sur la période.',
    quality: {
      level: qualityPresentation.level,
      label:
        qualityPresentation.level === 'reliable'
          ? 'Qualité des données : fiable'
          : qualityPresentation.level === 'warning'
            ? 'Qualité des données : à surveiller'
            : 'Qualité des données : non fiable',
      message: qualityPresentation.message,
      signals: nonZeroQualitySignals,
    },
    kpis: buildKpis(overview),
    statusRows: buildStatusRows(overview),
    attentionItems,
    hiddenAttentionTypeCount: Math.max(0, sortedIssues.length - attentionItems.length),
  };
}
