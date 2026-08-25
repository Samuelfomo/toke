import type {
  AttendanceIssue,
  AttendanceOverview,
  AttendanceStatus,
  BusinessDate,
} from '../../types/attendance-statistics.types.js';
import type { AttendanceAnalysisContext } from '../../utils/attendance-analysis-context.js';

/**
 * Les cinq modes d'export officiels du module de statistiques.
 * Le PDF n'est jamais autorisé à recalculer les statistiques métier.
 */
export const ATTENDANCE_PDF_EXPORT_MODES = [
  'period_summary',
  'full_report',
  'current_analysis',
  'issues_only',
  'employee_sheet',
] as const;

export type AttendancePdfExportMode = (typeof ATTENDANCE_PDF_EXPORT_MODES)[number];

export const ATTENDANCE_PDF_SECTION_IDS = [
  'table_of_contents',
  'executive_summary',
  'data_quality',
  'trend',
  'issues',
  'team',
  'employee_details',
  'secondary_insights',
] as const;

export type AttendancePdfSectionId = (typeof ATTENDANCE_PDF_SECTION_IDS)[number];

/**
 * Métadonnées purement éditoriales fournies par l'intégration.
 * Elles ne modifient aucun calcul statistique.
 *
 * AttendanceOverview contient les GUID manager/site mais pas leurs noms.
 * Le renderer ne doit donc jamais inventer ces libellés.
 */
export interface AttendancePdfPresentationContext {
  tenantName?: string;
  managerName?: string;
  siteName?: string;
  generatedByName?: string;
  /** Libellé déjà préparé dans le fuseau métier attendu, ex. '25/08/2026 19:42'. */
  generatedAtLabel?: string;
}

export type AttendancePdfEmployeeDetailMode = 'none' | 'attention_only' | 'all';

export interface AttendancePdfBaseOptions {
  presentationContext?: AttendancePdfPresentationContext;
  locale?: 'fr-CM' | 'fr-FR';
}

export interface AttendancePdfPeriodSummaryRequest extends AttendancePdfBaseOptions {
  mode: 'period_summary';
  overview: AttendanceOverview;
}

export interface AttendancePdfFullReportRequest extends AttendancePdfBaseOptions {
  mode: 'full_report';
  overview: AttendanceOverview;
  employeeDetails?: AttendancePdfEmployeeDetailMode;
}

export interface AttendancePdfCurrentAnalysisRequest extends AttendancePdfBaseOptions {
  mode: 'current_analysis';
  overview: AttendanceOverview;
  analysisContext: AttendanceAnalysisContext;
}

export interface AttendancePdfIssuesOnlyRequest extends AttendancePdfBaseOptions {
  mode: 'issues_only';
  overview: AttendanceOverview;
  issue?: AttendanceIssue;
}

export interface AttendancePdfEmployeeSheetRequest extends AttendancePdfBaseOptions {
  mode: 'employee_sheet';
  overview: AttendanceOverview;
  employeeGuid: string;
}

export type AttendancePdfExportRequest =
  | AttendancePdfPeriodSummaryRequest
  | AttendancePdfFullReportRequest
  | AttendancePdfCurrentAnalysisRequest
  | AttendancePdfIssuesOnlyRequest
  | AttendancePdfEmployeeSheetRequest;

export interface AttendancePdfExportProfile {
  mode: AttendancePdfExportMode;
  label: string;
  description: string;
  sections: AttendancePdfSectionId[];
  /** Le sommaire est inséré uniquement après calcul réel du nombre de pages. */
  tocWhenPageCountAtLeast: number | null;
  /** Objectif UX, pas une limite dure de pagination. */
  targetPageRange: { min: number; max: number | null };
}

export interface AttendancePdfLayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttendancePdfContractWarning {
  code:
    | 'manager_display_name_missing'
    | 'site_display_name_missing'
    | 'tenant_display_name_missing'
    | 'no_issues_in_scope'
    | 'employee_details_empty';
  message: string;
}

export interface AttendancePdfContractError {
  code:
    | 'invalid_analysis_context'
    | 'employee_not_found'
    | 'employee_guid_required';
  message: string;
  field?: 'analysisContext' | 'employeeGuid';
}

export interface AttendancePdfValidationResult {
  valid: boolean;
  errors: AttendancePdfContractError[];
  warnings: AttendancePdfContractWarning[];
}

/**
 * Contrat résolu avant tout rendu jsPDF.
 * Il décrit ce qu'il faut imprimer, jamais comment recalculer les données.
 */
export interface AttendancePdfReportContract {
  request: AttendancePdfExportRequest;
  profile: AttendancePdfExportProfile;
  validation: AttendancePdfValidationResult;
  reportContext: {
    startDate: BusinessDate;
    endDate: BusinessDate;
    dayCount: number;
    teamSize: number;
    managerGuid: string;
    siteGuid: string | null;
    tenantName: string | null;
    managerName: string | null;
    siteName: string | null;
  };
  selection: {
    status: AttendanceStatus | null;
    date: BusinessDate | null;
    issue: AttendanceIssue | null;
    employeeGuid: string | null;
  };
}
