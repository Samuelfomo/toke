import type {
  AttendanceIssue,
  AttendanceOverview,
} from '../../types/attendance-statistics.types.js';
import type { AttendanceAnalysisContext } from '../../utils/attendance-analysis-context.js';
import type {
  AttendancePdfEmployeeDetailMode,
  AttendancePdfExportChoice,
  AttendancePdfExportMode,
  AttendancePdfExportRequest,
  AttendancePdfPresentationContext,
  AttendancePdfPresentationLevel,
} from '../types/attendance-pdf.types.js';
import { getAttendancePdfExportChoices } from '../report/attendance-pdf-report-plan.js';

export interface AttendancePdfExportDraft {
  mode: AttendancePdfExportMode;
  presentationLevel: AttendancePdfPresentationLevel;
  employeeDetails: AttendancePdfEmployeeDetailMode;
  employeeGuid: string | null;
  issue: AttendanceIssue | null;
}

export interface AttendancePdfExportModeAvailability {
  choice: AttendancePdfExportChoice;
  disabled: boolean;
  disabledReason: string | null;
}

export function buildAttendancePdfPresentationContext(input: {
  base?: AttendancePdfPresentationContext;
  managerName?: string;
  siteName?: string | null;
}): AttendancePdfPresentationContext {
  const output: AttendancePdfPresentationContext = {};
  const base = input.base;

  if (base?.tenantName?.trim()) output.tenantName = base.tenantName.trim();
  if (base?.generatedByName?.trim()) output.generatedByName = base.generatedByName.trim();
  if (base?.generatedAtLabel?.trim()) output.generatedAtLabel = base.generatedAtLabel.trim();

  const managerName = base?.managerName?.trim() || input.managerName?.trim();
  if (managerName) output.managerName = managerName;

  const siteName = base?.siteName?.trim() || input.siteName?.trim();
  if (siteName) output.siteName = siteName;

  return output;
}

export function getAttendancePdfExportModeAvailability(input: {
  overview: AttendanceOverview;
  analysisContext: AttendanceAnalysisContext | null;
}): AttendancePdfExportModeAvailability[] {
  return getAttendancePdfExportChoices().map((choice) => {
    if (choice.mode === 'current_analysis' && !input.analysisContext) {
      return {
        choice,
        disabled: true,
        disabledReason: "Sélectionnez d'abord un contexte dans le dashboard (KPI, graphique, statut ou élément à examiner).",
      };
    }
    if (choice.mode === 'employee_sheet' && input.overview.employees.length === 0) {
      return {
        choice,
        disabled: true,
        disabledReason: "Aucun collaborateur n'est disponible dans le périmètre chargé.",
      };
    }
    return { choice, disabled: false, disabledReason: null };
  });
}

export function createAttendancePdfExportDraft(input: {
  mode: AttendancePdfExportMode;
  presentationLevel?: AttendancePdfPresentationLevel;
  employeeGuid?: string | null;
  issue?: AttendanceIssue | null;
}): AttendancePdfExportDraft {
  const choice = getAttendancePdfExportChoices().find((item) => item.mode === input.mode);
  if (!choice) throw new Error(`Mode d'export PDF inconnu : ${input.mode}`);

  const presentationLevel = input.presentationLevel ?? choice.defaultPresentationLevel;
  const employeeDetails: AttendancePdfEmployeeDetailMode = input.mode === 'full_report'
    ? presentationLevel === 'simplified'
      ? 'none'
      : presentationLevel === 'optimized'
        ? 'attention_only'
        : 'all'
    : 'none';

  return {
    mode: input.mode,
    presentationLevel,
    employeeDetails,
    employeeGuid: input.employeeGuid ?? null,
    issue: input.issue ?? null,
  };
}

export function buildAttendancePdfExportRequestFromDraft(input: {
  draft: AttendancePdfExportDraft;
  overview: AttendanceOverview;
  analysisContext: AttendanceAnalysisContext | null;
  presentationContext?: AttendancePdfPresentationContext;
}): AttendancePdfExportRequest {
  const base = {
    overview: input.overview,
    presentationLevel: input.draft.presentationLevel,
    ...(input.presentationContext ? { presentationContext: input.presentationContext } : {}),
  };

  switch (input.draft.mode) {
    case 'period_summary':
      return { mode: 'period_summary', ...base };
    case 'full_report':
      return {
        mode: 'full_report',
        ...base,
        employeeDetails: input.draft.employeeDetails,
      };
    case 'current_analysis':
      if (!input.analysisContext) {
        throw new Error("Aucun contexte d'analyse actif à exporter.");
      }
      return { mode: 'current_analysis', ...base, analysisContext: input.analysisContext };
    case 'issues_only':
      return {
        mode: 'issues_only',
        ...base,
        ...(input.draft.issue ? { issue: input.draft.issue } : {}),
      };
    case 'employee_sheet':
      if (!input.draft.employeeGuid) {
        throw new Error("Sélectionnez un collaborateur avant d'exporter sa fiche.");
      }
      return { mode: 'employee_sheet', ...base, employeeGuid: input.draft.employeeGuid };
  }
}
