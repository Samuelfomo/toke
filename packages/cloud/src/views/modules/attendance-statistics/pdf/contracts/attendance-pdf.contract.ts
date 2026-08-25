import { isAttendanceAnalysisContextValid } from '../../utils/attendance-analysis-context.js';
import { getAttendancePdfExportProfile } from '../config/attendance-pdf-profiles.js';
import type {
  AttendancePdfContractError,
  AttendancePdfContractWarning,
  AttendancePdfExportRequest,
  AttendancePdfReportContract,
  AttendancePdfValidationResult,
} from '../types/attendance-pdf.types.js';

function collectWarnings(request: AttendancePdfExportRequest): AttendancePdfContractWarning[] {
  const warnings: AttendancePdfContractWarning[] = [];
  const presentation = request.presentationContext;

  if (!presentation?.tenantName?.trim()) {
    warnings.push({
      code: 'tenant_display_name_missing',
      message: "Le nom d'affichage du tenant n'est pas fourni. Le renderer ne doit pas l'inventer.",
    });
  }
  if (!presentation?.managerName?.trim()) {
    warnings.push({
      code: 'manager_display_name_missing',
      message: "Le nom d'affichage du manager n'est pas fourni. Le renderer ne doit pas afficher un GUID comme nom.",
    });
  }
  if (request.overview.scope.siteGuid && !presentation?.siteName?.trim()) {
    warnings.push({
      code: 'site_display_name_missing',
      message: "Un site est filtré mais son nom d'affichage n'est pas fourni.",
    });
  }
  if (request.mode === 'issues_only' && request.overview.summary.issueCount === 0) {
    warnings.push({
      code: 'no_issues_in_scope',
      message: "Le périmètre ne contient aucun élément à examiner ; le rapport devra l'indiquer explicitement.",
    });
  }
  if (
    request.mode === 'full_report' &&
    request.employeeDetails === 'attention_only' &&
    !request.overview.employees.some((employee) => employee.issueCount > 0)
  ) {
    warnings.push({
      code: 'employee_details_empty',
      message: "Aucun employé avec anomalie : la section de détails ciblés pourra être omise.",
    });
  }

  return warnings;
}

export function validateAttendancePdfExportRequest(
  request: AttendancePdfExportRequest,
): AttendancePdfValidationResult {
  const errors: AttendancePdfContractError[] = [];

  if (request.mode === 'current_analysis') {
    if (!isAttendanceAnalysisContextValid(request.overview, request.analysisContext)) {
      errors.push({
        code: 'invalid_analysis_context',
        field: 'analysisContext',
        message: "Le contexte d'analyse n'appartient plus au snapshot de statistiques fourni.",
      });
    }
  }

  if (request.mode === 'employee_sheet') {
    if (!request.employeeGuid.trim()) {
      errors.push({
        code: 'employee_guid_required',
        field: 'employeeGuid',
        message: "L'identifiant de l'employé est obligatoire pour une fiche individuelle.",
      });
    } else if (
      !request.overview.employees.some((employee) => employee.employeeGuid === request.employeeGuid)
    ) {
      errors.push({
        code: 'employee_not_found',
        field: 'employeeGuid',
        message: "L'employé demandé n'appartient pas au snapshot de statistiques fourni.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: collectWarnings(request),
  };
}

export function buildAttendancePdfReportContract(
  request: AttendancePdfExportRequest,
): AttendancePdfReportContract {
  const validation = validateAttendancePdfExportRequest(request);
  const presentation = request.presentationContext;

  let status = null;
  let date = null;
  let issue = null;
  let employeeGuid = null;

  if (request.mode === 'current_analysis') {
    status = request.analysisContext.status;
    date = request.analysisContext.date;
    issue = request.analysisContext.issue;
    employeeGuid = request.analysisContext.employeeGuid;
  } else if (request.mode === 'issues_only') {
    issue = request.issue ?? null;
  } else if (request.mode === 'employee_sheet') {
    employeeGuid = request.employeeGuid;
  }

  return {
    request,
    profile: getAttendancePdfExportProfile(request.mode),
    validation,
    reportContext: {
      startDate: request.overview.period.startDate,
      endDate: request.overview.period.endDate,
      dayCount: request.overview.period.dayCount,
      teamSize: request.overview.scope.teamSize,
      managerGuid: request.overview.scope.managerGuid,
      siteGuid: request.overview.scope.siteGuid,
      tenantName: presentation?.tenantName?.trim() || null,
      managerName: presentation?.managerName?.trim() || null,
      siteName: presentation?.siteName?.trim() || null,
    },
    selection: {
      status,
      date,
      issue,
      employeeGuid,
    },
  };
}
