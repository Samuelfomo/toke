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
  quality: AttendancePdfExecutiveQuality;
  kpis: AttendancePdfExecutiveKpi[];
  statusRows: AttendancePdfExecutiveStatusRow[];
  attentionItems: AttendancePdfExecutiveAttentionItem[];
  hiddenAttentionTypeCount: number;
}

function plural(value: number, singular: string, pluralValue: string = `${singular}s`): string {
  return value === 1 ? singular : pluralValue;
}

function countEmployeesWithStatus(overview: AttendanceOverview, status: AttendanceStatus): number {
  // Agrégat de présentation uniquement : on compte les employés dont le backend
  // a déjà retourné un total > 0 pour le statut. Ce nombre n'entre dans aucune
  // formule de présence/ponctualité et ne remplace aucun KPI backend.
  return overview.employees.filter((employee) => employee.statusTotals[status] > 0).length;
}

function buildKpis(overview: AttendanceOverview): AttendancePdfExecutiveKpi[] {
  const cards = buildPrimaryAttendanceKpis(overview);
  return cards.map((card) => {
    switch (card.id) {
      case 'attendance_rate':
        return {
          id: card.id,
          label: card.label,
          value: card.value,
          explanation:
            overview.summary.rates.attendanceRate === null
              ? 'Aucune journée éligible au taux sur la période.'
              : `${overview.summary.rates.attendedWorkingDays} journée${overview.summary.rates.attendedWorkingDays === 1 ? '' : 's'} suivie${overview.summary.rates.attendedWorkingDays === 1 ? '' : 's'} / ${overview.summary.rates.employeeWorkingDaysExpected} attendue${overview.summary.rates.employeeWorkingDaysExpected === 1 ? '' : 's'}`,
          accent: 'accent',
        };
      case 'punctuality_rate':
        return {
          id: card.id,
          label: card.label,
          value: card.value,
          explanation:
            overview.summary.rates.punctualityRate === null
              ? 'Aucune présence éligible à la ponctualité.'
              : `${overview.summary.rates.onTimeWorkingDays} à l'heure / ${overview.summary.rates.attendedWorkingDays} présence${overview.summary.rates.attendedWorkingDays === 1 ? '' : 's'}`,
          accent: 'success',
        };
      case 'absences': {
        const employees = countEmployeesWithStatus(overview, 'ABSENT');
        return {
          id: card.id,
          label: card.label,
          value: card.value,
          explanation: `${employees} ${plural(employees, 'collaborateur', 'collaborateurs')} concerné${employees === 1 ? '' : 's'}`,
          accent: 'danger',
        };
      }
      case 'late_days': {
        const employees = countEmployeesWithStatus(overview, 'LATE');
        return {
          id: card.id,
          label: card.label,
          value: card.value,
          explanation: `${employees} ${plural(employees, 'collaborateur', 'collaborateurs')} concerné${employees === 1 ? '' : 's'}`,
          accent: 'warning',
        };
      }
      case 'issues':
        return {
          id: card.id,
          label: card.label,
          value: card.value,
          explanation:
            overview.summary.issueCount === 0
              ? 'Aucun élément signalé par l’API.'
              : `${overview.issues.length} ${plural(overview.issues.length, 'type', 'types')} d'anomalie`,
          accent: 'warning',
        };
      case 'net_duration':
        throw new Error('La durée nette ne fait pas partie des 5 KPI décisionnels de la synthèse.');
    }
  });
}

export function buildAttendancePdfExecutiveSummaryModel(
  overview: AttendanceOverview,
): AttendancePdfExecutiveSummaryModel {
  const qualityPresentation = buildAttendanceDataQualityPresentation(overview.dataQuality);
  const nonZeroQualitySignals = qualityPresentation.metrics
    .filter((metric) => metric.value > 0)
    .map((metric) => ({ label: metric.label, value: metric.value }));

  const orderedStatuses = (Object.keys(ATTENDANCE_STATUS_PRESENTATION) as AttendanceStatus[])
    .sort(
      (left, right) =>
        ATTENDANCE_STATUS_PRESENTATION[left].order - ATTENDANCE_STATUS_PRESENTATION[right].order,
    )
    .map((status) => ({
      status,
      label: ATTENDANCE_STATUS_PRESENTATION[status].label,
      count: overview.summary.statusTotals[status],
      group: ATTENDANCE_STATUS_PRESENTATION[status].rateCategory,
    }));

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
    scopeLine: `${overview.scope.teamSize} ${plural(overview.scope.teamSize, 'collaborateur', 'collaborateurs')} · ${overview.period.dayCount} ${plural(overview.period.dayCount, 'jour', 'jours')} analysé${overview.period.dayCount === 1 ? '' : 's'}`,
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
    statusRows: orderedStatuses,
    attentionItems,
    hiddenAttentionTypeCount: Math.max(0, sortedIssues.length - attentionItems.length),
  };
}
