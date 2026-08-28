import { buildAttendancePdfReportContract } from '../contracts/attendance-pdf.contract.js';
import { buildAttendancePdfEmployeeDetailsModel } from '../sections/attendance-pdf-employee-detail.model.js';
import { buildAttendancePdfIssuesModel } from '../sections/attendance-pdf-issues.model.js';
import { buildAttendancePdfTeamModel } from '../sections/attendance-pdf-team.model.js';
import { buildAttendancePdfTrendModel } from '../sections/attendance-pdf-trend.model.js';
import type {
  AttendancePdfExportPreflight,
  AttendancePdfExportRequest,
  AttendancePdfPreflightNotice,
} from '../types/attendance-pdf.types.js';
import { buildAttendancePdfReportPlan, normalizeAttendancePdfExportRequest } from './attendance-pdf-report-plan.js';

function hasSection(plan: AttendancePdfExportPreflight['plan'], section: AttendancePdfExportPreflight['plan']['sections'][number]['section']): boolean {
  return plan.sections.some((item) => item.section === section);
}

/**
 * Prépare un aperçu exact du volume de contenu avant de lancer jsPDF.
 * Cette étape ne dessine aucune page et ne recalcule aucune statistique métier.
 */
export function buildAttendancePdfExportPreflight(
  request: AttendancePdfExportRequest,
): AttendancePdfExportPreflight {
  const normalizedRequest = normalizeAttendancePdfExportRequest(request);
  const contract = buildAttendancePdfReportContract(normalizedRequest);
  if (!contract.validation.valid) {
    throw new Error(contract.validation.errors.map((error) => error.message).join(' | '));
  }

  const plan = buildAttendancePdfReportPlan(contract);
  const notices: AttendancePdfPreflightNotice[] = [];

  const trend = hasSection(plan, 'trend')
    ? buildAttendancePdfTrendModel(normalizedRequest.overview)
    : null;
  const issues = hasSection(plan, 'issues')
    ? buildAttendancePdfIssuesModel(contract)
    : null;
  const team = hasSection(plan, 'team')
    ? buildAttendancePdfTeamModel(contract)
    : null;
  const employeeDetails = hasSection(plan, 'employee_details')
    ? buildAttendancePdfEmployeeDetailsModel(contract)
    : null;

  const issueOccurrenceRowsAvailable = issues?.totalDetailedOccurrenceCount ?? 0;
  const issueOccurrenceRowsRendered = issues?.families.reduce(
    (familyTotal, family) =>
      familyTotal + family.issueTypes.reduce((typeTotal, issueType) => typeTotal + issueType.rows.length, 0),
    0,
  ) ?? 0;
  const employeeDetailCount = employeeDetails?.employees.length ?? 0;
  const employeeDayRows = employeeDetails?.employees.reduce(
    (total, employee) => total + (employee.showDailyTable ? employee.days.length : 0),
    0,
  ) ?? 0;

  if (trend && trend.segments.length > 1) {
    notices.push({
      code: 'multi_segment_trend',
      level: 'info',
      message: `La période contient ${trend.totalDays} journées et sera présentée en ${trend.segments.length} segments de tendance maximum de ${trend.maxDaysPerSegment} jours.`,
    });
  }

  if (issues && issues.totalOmittedByPresentationCount > 0) {
    notices.push({
      code: 'issue_detail_limited',
      level: 'info',
      message: `${issues.totalOmittedByPresentationCount} élément(s) ne seront pas affiché(s) en détail avec le niveau ${contract.presentationProfile.label.toLowerCase()}, mais resteront pris en compte dans les totaux.`,
    });
  }

  if (issues && issues.totalHiddenApiOccurrenceCount > 0) {
    notices.push({
      code: 'api_issue_detail_incomplete',
      level: 'warning',
      message: `${issues.totalHiddenApiOccurrenceCount} élément(s) sont comptabilisé(s) sans détail disponible. Le rapport affichera le total correspondant.`,
    });
  }

  if (employeeDetailCount > 0) {
    notices.push({
      code: plan.effectiveEmployeeDetails === 'all'
        ? 'all_employee_details_included'
        : 'employee_details_included',
      level: plan.effectiveEmployeeDetails === 'all' ? 'warning' : 'info',
      message: plan.effectiveEmployeeDetails === 'all'
        ? `Le rapport inclura les fiches de ${employeeDetailCount} collaborateur(s), soit ${employeeDayRows} ligne(s) journalière(s) détaillée(s) selon le niveau choisi.`
        : `Le rapport inclura ${employeeDetailCount} fiche(s) de collaborateur(s) ciblé(s), soit ${employeeDayRows} ligne(s) journalière(s).`,
    });
  }

  if (team && team.rows.length === 0) {
    notices.push({
      code: 'empty_team_selection',
      level: 'info',
      message: "Aucun collaborateur ne correspond au contexte d'analyse courant ; la vue équipe l'indiquera explicitement.",
    });
  }

  return {
    request: normalizedRequest,
    contract,
    plan,
    volume: {
      periodDays: normalizedRequest.overview.period.dayCount,
      dailyRows: trend?.totalDays ?? 0,
      trendSegmentCount: trend?.segments.length ?? 0,
      teamRows: team?.rows.length ?? 0,
      issueTypeCount: issues?.totalIssueTypeCount ?? 0,
      issueOccurrenceRowsAvailable,
      issueOccurrenceRowsRendered,
      employeeDetailCount,
      employeeDayRows,
    },
    notices,
  };
}
