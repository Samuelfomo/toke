import type {
  AttendanceEmployeeOverview,
  AttendanceStatus,
} from '../../types/attendance-statistics.types.js';
import { formatDurationMinutes } from '../../utils/duration.js';
import { formatPercentage } from '../../utils/percentage.js';
import { ATTENDANCE_STATUS_PRESENTATION } from '../../utils/attendance-status.js';
import {
  ATTENDANCE_PDF_SIMPLIFIED_PAYROLL_TEAM_COLUMNS,
  ATTENDANCE_PDF_TEAM_COLUMNS_BY_PRESENTATION,
  type AttendancePdfTeamColumnKey,
} from '../config/attendance-pdf-team-columns.js';
import type { AttendancePdfReportContract } from '../types/attendance-pdf.types.js';

export interface AttendancePdfTeamRow {
  employeeGuid: string;
  employeeName: string;
  expected: number;
  attended: number;
  attendanceRate: string;
  punctualityRate: string;
  late: number;
  absent: number;
  pending: number;
  undetermined: number;
  restDay: number;
  netDuration: string;
  issues: number;
}

export interface AttendancePdfTeamModel {
  title: string;
  description: string;
  presentationLabel: string;
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
    attendanceRate: formatPercentage(employee.rates.attendanceRate),
    punctualityRate: formatPercentage(employee.rates.punctualityRate),
    late: employee.statusTotals.LATE,
    absent: employee.statusTotals.ABSENT,
    pending: employee.statusTotals.PENDING,
    undetermined: employee.statusTotals.UNDETERMINED,
    restDay: employee.statusTotals.REST_DAY,
    netDuration:
      employee.durations.daysWithKnownNetDuration > 0
        ? formatDurationMinutes(employee.durations.netMinutes, { emptyLabel: 'Non disponible' })
        : 'Non disponible',
    issues: employee.issueCount,
  };
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

  return {
    title: filteredByAnalysis ? 'Collaborateurs concernés' : "Vue d'ensemble de l'équipe",
    description: filteredByAnalysis
      ? `Cette vue contient uniquement les collaborateurs correspondant au contexte d’analyse courant.`
      : isSingleDay
        ? `Lecture synthétique de la situation du jour.`
        : contract.request.mode === 'full_report' && contract.presentationProfile.level === 'simplified'
          ? `Comparaison descriptive de l'équipe sur la période. La durée nette enregistrée aide au contrôle de paie mais ne constitue pas encore une durée payable.`
          : `Comparaison descriptive de l'équipe sur la période. L'ordre alphabétique évite de présenter les taux ou éléments à examiner comme un classement de performance.`,
    presentationLabel: contract.presentationProfile.label,
    columns:
      contract.request.mode === 'full_report' && contract.presentationProfile.level === 'simplified'
        ? ATTENDANCE_PDF_SIMPLIFIED_PAYROLL_TEAM_COLUMNS
        : ATTENDANCE_PDF_TEAM_COLUMNS_BY_PRESENTATION[contract.presentationProfile.level],
    rows: employees.map(toRow),
    totalTeamSize: allEmployees.length,
    displayedEmployeeCount: employees.length,
    filteredByAnalysis,
    analysisLabel,
    empty: employees.length === 0,
    isSingleDay,
  };
}
