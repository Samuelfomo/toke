import type {
  AttendanceEmployeeDayOverview,
  AttendanceEmployeeOverview,
  AttendanceIssue,
} from '../../types/attendance-statistics.types.js';
import { ATTENDANCE_ISSUE_PRESENTATION, ATTENDANCE_STATUS_PRESENTATION } from '../../utils/attendance-status.js';
import { formatBusinessDate } from '../../utils/business-date.js';
import { formatBusinessTime } from '../../utils/business-time.js';
import { formatDelayMinutes, formatDurationMinutes } from '../../utils/duration.js';
import { formatPercentage } from '../../utils/percentage.js';
import {
  ATTENDANCE_PDF_EMPLOYEE_DAY_COLUMNS_BY_PRESENTATION,
  type AttendancePdfEmployeeDayColumnKey,
} from '../config/attendance-pdf-employee-day-columns.js';
import type {
  AttendancePdfReportContract,
  AttendancePdfSourceTarget,
} from '../types/attendance-pdf.types.js';

export interface AttendancePdfEmployeeDayRow {
  date: string;
  businessDate: string;
  status: string;
  clockIn: string;
  clockOut: string;
  delay: string;
  grossDuration: string;
  pauseDuration: string;
  netDuration: string;
  issues: string;
  sourceTargets: AttendancePdfSourceTarget[];
}

export interface AttendancePdfEmployeeDetailModel {
  employeeGuid: string;
  employeeName: string;
  title: string;
  presentationLabel: string;
  attendanceRate: string;
  punctualityRate: string;
  expectedDays: number;
  attendedDays: number;
  lateDays: number;
  absentDays: number;
  pendingDays: number;
  restDays: number;
  undeterminedDays: number;
  netDuration: string;
  issueCount: number;
  issueTypeCount: number;
  issueLabels: string[];
  columns: readonly AttendancePdfEmployeeDayColumnKey[];
  days: AttendancePdfEmployeeDayRow[];
  showDailyTable: boolean;
}

export interface AttendancePdfEmployeeDetailsModel {
  title: string;
  description: string;
  employees: AttendancePdfEmployeeDetailModel[];
  emptyReason: string | null;
}

function issueLabelsForEmployee(
  employee: AttendanceEmployeeOverview,
  contract: AttendancePdfReportContract,
): string[] {
  return contract.request.overview.issues
    .filter((summary) => summary.occurrences.some((item) => item.employeeGuid === employee.employeeGuid))
    .map((summary) => ATTENDANCE_ISSUE_PRESENTATION[summary.issue].label)
    .sort((left, right) => left.localeCompare(right, 'fr-FR'));
}

function sourceTargetsForDay(
  employee: AttendanceEmployeeOverview,
  day: AttendanceEmployeeDayOverview,
): AttendancePdfSourceTarget[] {
  return day.issues.map((issue: AttendanceIssue) => ({
    kind: 'attendance_day',
    employeeGuid: employee.employeeGuid,
    date: day.date,
    status: day.status,
    issue,
  }));
}

function toDayRow(
  employee: AttendanceEmployeeOverview,
  day: AttendanceEmployeeDayOverview,
): AttendancePdfEmployeeDayRow {
  return {
    date: formatBusinessDate(day.date, 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    businessDate: day.date,
    status: ATTENDANCE_STATUS_PRESENTATION[day.status].label,
    clockIn: formatBusinessTime(day.firstClockIn, '—'),
    clockOut: formatBusinessTime(day.lastClockOut, '—'),
    delay: formatDelayMinutes(day.delayMinutes),
    grossDuration: formatDurationMinutes(day.grossMinutes, { emptyLabel: 'Non disponible' }),
    pauseDuration: formatDurationMinutes(day.pauseMinutes, { emptyLabel: 'Non disponible' }),
    netDuration: formatDurationMinutes(day.netMinutes, { emptyLabel: 'Non disponible' }),
    issues: day.issues.length > 0
      ? day.issues.map((issue) => ATTENDANCE_ISSUE_PRESENTATION[issue].label).join(', ')
      : 'Aucun',
    sourceTargets: sourceTargetsForDay(employee, day),
  };
}

function toEmployeeModel(
  employee: AttendanceEmployeeOverview,
  contract: AttendancePdfReportContract,
): AttendancePdfEmployeeDetailModel {
  const level = contract.presentationProfile.level;
  const issueLabels = issueLabelsForEmployee(employee, contract);
  return {
    employeeGuid: employee.employeeGuid,
    employeeName: employee.employeeName,
    title: employee.employeeName,
    presentationLabel: contract.presentationProfile.label,
    attendanceRate: formatPercentage(employee.rates.attendanceRate),
    punctualityRate: formatPercentage(employee.rates.punctualityRate),
    expectedDays: employee.rates.employeeWorkingDaysExpected,
    attendedDays: employee.rates.attendedWorkingDays,
    lateDays: employee.statusTotals.LATE,
    absentDays: employee.statusTotals.ABSENT,
    pendingDays: employee.statusTotals.PENDING,
    restDays: employee.statusTotals.REST_DAY,
    undeterminedDays: employee.statusTotals.UNDETERMINED,
    netDuration: employee.durations.daysWithKnownNetDuration > 0
      ? formatDurationMinutes(employee.durations.netMinutes, { emptyLabel: 'Non disponible' })
      : 'Non disponible',
    issueCount: employee.issueCount,
    issueTypeCount: issueLabels.length,
    issueLabels,
    columns: ATTENDANCE_PDF_EMPLOYEE_DAY_COLUMNS_BY_PRESENTATION[level],
    days: employee.days.slice().sort((left, right) => left.date.localeCompare(right.date)).map((day) => toDayRow(employee, day)),
    showDailyTable: level !== 'simplified',
  };
}

function selectEmployees(contract: AttendancePdfReportContract): AttendanceEmployeeOverview[] {
  const all = contract.request.overview.employees;
  if (contract.request.mode === 'employee_sheet') {
    const employeeGuid = contract.request.employeeGuid;
    return all.filter((employee) => employee.employeeGuid === employeeGuid);
  }
  if (contract.request.mode === 'full_report') {
    const mode = contract.request.employeeDetails ?? (
      contract.presentationProfile.level === 'simplified'
        ? 'none'
        : contract.presentationProfile.level === 'optimized'
          ? 'attention_only'
          : 'all'
    );
    if (mode === 'all') return all;
    if (mode === 'attention_only') return all.filter((employee) => employee.issueCount > 0);
  }
  return [];
}

/**
 * Prépare les fiches individuelles à partir du snapshot API uniquement.
 * Les heures sont des chaînes métier déjà préparées par le serveur.
 * Aucun horaire théorique de planning n'est inventé si le contrat ne le fournit pas.
 */
export function buildAttendancePdfEmployeeDetailsModel(
  contract: AttendancePdfReportContract,
): AttendancePdfEmployeeDetailsModel {
  const selected = selectEmployees(contract).slice().sort((left, right) =>
    left.employeeName.localeCompare(right.employeeName, 'fr-FR', { sensitivity: 'base', numeric: true }),
  );

  let emptyReason: string | null = null;
  if (selected.length === 0) {
    const fullReportDetailMode = contract.request.mode === 'full_report'
      ? contract.request.employeeDetails ?? (
          contract.presentationProfile.level === 'simplified'
            ? 'none'
            : contract.presentationProfile.level === 'optimized'
              ? 'attention_only'
              : 'all'
        )
      : null;
    if (contract.request.mode === 'full_report' && fullReportDetailMode === 'none') {
      emptyReason = "Les détails individuels ne sont pas demandés pour ce rapport complet.";
    } else if (contract.request.mode === 'full_report' && fullReportDetailMode === 'attention_only') {
      emptyReason = "Aucun collaborateur avec élément à examiner n'est présent dans le snapshot.";
    } else {
      emptyReason = "Aucun collaborateur ne correspond au périmètre de la fiche.";
    }
  }

  return {
    title: selected.length === 1 ? 'Fiche individuelle' : 'Détails des collaborateurs',
    description: "Les valeurs ci-dessous décrivent les données de présence connues de Toké sur la période. Elles ne constituent pas une évaluation de performance et ne remplacent pas la vérification d'un élément signalé.",
    employees: selected.map((employee) => toEmployeeModel(employee, contract)),
    emptyReason,
  };
}
