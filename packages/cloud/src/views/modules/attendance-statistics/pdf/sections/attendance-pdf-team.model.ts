import type {
  AttendanceEmployeeOverview,
  AttendanceStatus,
} from '../../types/attendance-statistics.types.js';
import { formatDurationMinutes } from '../../utils/duration.js';
import { formatPercentage } from '../../utils/percentage.js';
import { ATTENDANCE_STATUS_PRESENTATION } from '../../utils/attendance-status.js';
import {
  ATTENDANCE_PDF_DIRECTION_TEAM_COLUMNS,
  ATTENDANCE_PDF_HR_TEAM_COLUMNS,
  ATTENDANCE_PDF_PILOTAGE_TEAM_COLUMNS,
  ATTENDANCE_PDF_TEAM_COLUMNS_BY_PRESENTATION,
  type AttendancePdfTeamColumnKey,
} from '../config/attendance-pdf-team-columns.js';
import type { AttendancePdfReportContract } from '../types/attendance-pdf.types.js';

export interface AttendancePdfTeamRow {
  employeeGuid: string;
  employeeName: string;
  expected: number;
  attended: number;
  attendedVsExpected: string;
  attendanceRate: string;
  punctualityRate: string;
  absenceRate: string;
  lateRate: string;
  late: number;
  absent: number;
  pending: number;
  undetermined: number;
  restDay: number;
  netDuration: string;
  expectedDuration: string;
  netVsExpected: string;
  issueRate: string;
  issues: number;
  durationDelta: string;
  alerts: string;
}

export interface AttendancePdfTeamModel {
  title: string;
  description: string;
  presentationLabel: string;
  showPresentationLabel: boolean;
  columns: readonly AttendancePdfTeamColumnKey[];
  rows: AttendancePdfTeamRow[];
  totalTeamSize: number;
  displayedEmployeeCount: number;
  filteredByAnalysis: boolean;
  analysisLabel: string | null;
  empty: boolean;
  isSingleDay: boolean;
}

function matchesCurrentAnalysis(
  employee: AttendanceEmployeeOverview,
  contract: AttendancePdfReportContract,
): boolean {
  if (contract.request.mode !== 'current_analysis') return true;
  const context = contract.request.analysisContext;

  if (context.employeeGuid && employee.employeeGuid !== context.employeeGuid) return false;

  if (context.date || context.status || context.rateEligible !== null) {
    const candidateDays = context.date
      ? employee.days.filter((item) => item.date === context.date)
      : employee.days;
    const matchesDay = candidateDays.some((day) => {
      if (context.status && day.status !== context.status) return false;
      if (context.rateEligible !== null && day.rateEligible !== context.rateEligible) return false;
      return true;
    });
    if (!matchesDay) return false;
  }

  if (context.issue && !employee.days.some((day) => day.issues.includes(context.issue!))) {
    return false;
  }

  return true;
}

function toRow(employee: AttendanceEmployeeOverview): AttendancePdfTeamRow {
  return {
    employeeGuid: employee.employeeGuid,
    employeeName: employee.employeeName,
    expected: employee.rates.employeeWorkingDaysExpected,
    attended: employee.rates.attendedWorkingDays,
    attendedVsExpected: `${employee.rates.attendedWorkingDays} / ${employee.rates.employeeWorkingDaysExpected}`,
    attendanceRate: formatPercentage(employee.rates.attendanceRate),
    punctualityRate: formatPercentage(employee.rates.punctualityRate),
    absenceRate: formatPercentage(employee.rates.absenceRate),
    lateRate: formatPercentage(employee.rates.lateRate),
    late: employee.statusTotals.LATE,
    absent: employee.statusTotals.ABSENT,
    pending: employee.statusTotals.PENDING,
    undetermined: employee.statusTotals.UNDETERMINED,
    restDay: employee.statusTotals.REST_DAY,
    netDuration:
      employee.durations.daysWithKnownNetDuration > 0
        ? formatDurationMinutes(employee.durations.netMinutes, { emptyLabel: '—' })
        : '—',
    expectedDuration:
      employee.durations.daysWithKnownExpectedWorkDuration > 0
        ? formatDurationMinutes(employee.durations.expectedWorkMinutes, { emptyLabel: '—' })
        : '—',
    netVsExpected:
      employee.durations.daysWithKnownNetDuration > 0 && employee.durations.daysWithKnownExpectedWorkDuration > 0
        ? `${formatDurationMinutes(employee.durations.netMinutes, { emptyLabel: '—' })} / ${formatDurationMinutes(employee.durations.expectedWorkMinutes, { emptyLabel: '—' })}`
        : employee.durations.daysWithKnownNetDuration > 0
          ? `${formatDurationMinutes(employee.durations.netMinutes, { emptyLabel: '—' })} / —`
          : '—',
    issueRate: formatPercentage(employee.rates.issueRate),
    issues: employee.issueCount,
    durationDelta:
      employee.durations.daysWithKnownNetDuration > 0 &&
      employee.durations.daysWithKnownExpectedWorkDuration > 0 &&
      employee.durations.daysWithMissingDuration === 0
        ? formatDurationDelta(employee.durations.netMinutes - employee.durations.expectedWorkMinutes)
        : 'Non calculable',
    alerts: formatPercentage(employee.rates.issueRate),
  };
}

function formatDurationDelta(minutes: number): string {
  if (minutes === 0) return '0 min';
  const sign = minutes > 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remaining = absolute % 60;
  const duration = hours > 0
    ? `${hours} h${remaining > 0 ? ` ${String(remaining).padStart(2, '0')} min` : ''}`
    : `${remaining} min`;
  return `${sign}${duration}`;
}

function describeSelection(contract: AttendancePdfReportContract): string | null {
  if (contract.request.mode !== 'current_analysis') return null;
  const context = contract.request.analysisContext;
  const parts: string[] = [];
  if (context.date) parts.push(context.date);
  if (context.status) parts.push(ATTENDANCE_STATUS_PRESENTATION[context.status as AttendanceStatus].label);
  if (context.issue) parts.push('élément à examiner ciblé');
  if (context.employeeName) parts.push(context.employeeName);
  return parts.length > 0 ? parts.join(' · ') : context.label;
}

function resolveColumns(contract: AttendancePdfReportContract): readonly AttendancePdfTeamColumnKey[] {
  switch (contract.request.mode) {
    case 'period_summary':
      return ATTENDANCE_PDF_DIRECTION_TEAM_COLUMNS;
    case 'full_report':
      return ATTENDANCE_PDF_PILOTAGE_TEAM_COLUMNS;
    case 'hr_complete':
      return ATTENDANCE_PDF_HR_TEAM_COLUMNS;
    default:
      return ATTENDANCE_PDF_TEAM_COLUMNS_BY_PRESENTATION[contract.presentationProfile.level];
  }
}

function resolveDescription(contract: AttendancePdfReportContract, filteredByAnalysis: boolean, isSingleDay: boolean): string {
  if (filteredByAnalysis) {
    return `Cette vue contient uniquement les collaborateurs correspondant au contexte d’analyse courant.`;
  }
  if (isSingleDay) return `Lecture synthétique de la situation du jour.`;

  switch (contract.request.mode) {
    case 'period_summary':
      return `Lecture décisionnelle de l'équipe : présence, retard, écart d'heures enregistré et alertes nécessitant un suivi par les équipes concernées.`;
    case 'full_report':
      return `Vue de pilotage de l'équipe. Les pourcentages permettent d'identifier les écarts avant d'analyser leur évolution dans la période.`;
    case 'hr_complete':
      return `Vue RH enrichie de l'équipe. Les taux et volumes restent descriptifs et ne constituent pas un classement de performance.`;
    default:
      return `Comparaison descriptive de l'équipe sur la période. L'ordre alphabétique évite de présenter les taux ou éléments à examiner comme un classement de performance.`;
  }
}

/**
 * Prépare la vue équipe à partir du snapshot API.
 * - aucun recalcul de statut/taux ;
 * - aucun score de performance ;
 * - ordre alphabétique stable ;
 * - en mode current_analysis, restriction au contexte déjà validé par le contrat.
 */
export function buildAttendancePdfTeamModel(
  contract: AttendancePdfReportContract,
): AttendancePdfTeamModel {
  const allEmployees = contract.request.overview.employees;
  const employees = allEmployees
    .filter((employee) => matchesCurrentAnalysis(employee, contract))
    .slice()
    .sort((left, right) =>
      left.employeeName.localeCompare(right.employeeName, 'fr-FR', {
        sensitivity: 'base',
        numeric: true,
      }),
    );

  const filteredByAnalysis = contract.request.mode === 'current_analysis';
  const analysisLabel = describeSelection(contract);
  const isSingleDay = contract.request.overview.period.dayCount === 1;
  const primaryReport = ['period_summary', 'full_report', 'hr_complete'].includes(contract.request.mode);

  return {
    title: filteredByAnalysis ? 'Collaborateurs concernés' : "Vue d'ensemble de l'équipe",
    description: resolveDescription(contract, filteredByAnalysis, isSingleDay),
    presentationLabel: contract.presentationProfile.label,
    showPresentationLabel: !primaryReport,
    columns: resolveColumns(contract),
    rows: employees.map(toRow),
    totalTeamSize: allEmployees.length,
    displayedEmployeeCount: employees.length,
    filteredByAnalysis,
    analysisLabel,
    empty: employees.length === 0,
    isSingleDay,
  };
}
