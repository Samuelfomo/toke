import type {
  AttendanceIssue,
  AttendanceOverview,
  AttendanceStatus,
  BusinessDate,
} from '../../types/attendance-statistics.types.js';
import type { AttendanceAnalysisContext } from '../../utils/attendance-analysis-context.js';

/**
 * Les cinq périmètres d'export officiels du module de statistiques.
 * Ils décrivent CE QUE l'on exporte, pas le niveau de détail visuel.
 */
export const ATTENDANCE_PDF_EXPORT_MODES = [
  'period_summary',
  'full_report',
  'current_analysis',
  'issues_only',
  'employee_sheet',
] as const;

export type AttendancePdfExportMode = (typeof ATTENDANCE_PDF_EXPORT_MODES)[number];

/**
 * Niveau de présentation indépendant du périmètre d'export.
 * Un même périmètre peut donc être rendu en version simplifiée, optimisée ou détaillée.
 */
export const ATTENDANCE_PDF_PRESENTATION_LEVELS = [
  'simplified',
  'optimized',
  'detailed',
] as const;

export type AttendancePdfPresentationLevel =
  (typeof ATTENDANCE_PDF_PRESENTATION_LEVELS)[number];

export const ATTENDANCE_PDF_SECTION_IDS = [
  'table_of_contents',
  'analysis_context',
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
  /**
   * Axe de présentation. S'il est absent, un niveau par défaut est résolu selon le périmètre.
   * Il ne modifie jamais les valeurs métier du snapshot.
   */
  presentationLevel?: AttendancePdfPresentationLevel;
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

export type AttendancePdfIssueDetailsMode = 'none' | 'limited' | 'all';

export interface AttendancePdfPresentationProfile {
  level: AttendancePdfPresentationLevel;
  label: string;
  description: string;
  issueDetails: AttendancePdfIssueDetailsMode;
  /** Limite de présentation par type d'élément, jamais une limite de pagination. */
  issueOccurrenceLimitPerType: number | null;
}

export interface AttendancePdfLayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Référence stable vers la donnée source à examiner.
 * Le Lot 6 ne connaît volontairement pas la route Vue réelle.
 * Une future couche d'intégration pourra transformer cette référence en navigation
 * vers la page de pointages, puis vers les actions de correction autorisées.
 */
export interface AttendancePdfSourceTarget {
  kind: 'attendance_day';
  employeeGuid: string;
  date: BusinessDate;
  status: AttendanceStatus;
  issue: AttendanceIssue;
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
  presentationProfile: AttendancePdfPresentationProfile;
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


export interface AttendancePdfReportPlanSection {
  section: AttendancePdfSectionId;
  reason: string;
}

/**
 * Plan d'assemblage résolu à partir du périmètre + niveau de présentation.
 * Ce plan ne modifie aucune donnée métier : il décide uniquement quelles sections
 * déjà disponibles doivent être rendues et dans quel ordre.
 */
export interface AttendancePdfReportPlan {
  mode: AttendancePdfExportMode;
  modeLabel: string;
  presentationLevel: AttendancePdfPresentationLevel;
  presentationLabel: string;
  sections: AttendancePdfReportPlanSection[];
  effectiveEmployeeDetails: AttendancePdfEmployeeDetailMode;
  notes: string[];
}

export interface AttendancePdfRenderedSection {
  section: AttendancePdfSectionId;
  startPage: number;
  endPage: number;
}

export interface AttendancePdfReportRenderResult {
  plan: AttendancePdfReportPlan;
  renderedSections: AttendancePdfRenderedSection[];
  pageCountBeforeFinalize: number;
}

export interface AttendancePdfExportChoice {
  mode: AttendancePdfExportMode;
  label: string;
  description: string;
  defaultPresentationLevel: AttendancePdfPresentationLevel;
  availablePresentationLevels: readonly AttendancePdfPresentationLevel[];
  requiresAnalysisContext: boolean;
  requiresEmployeeGuid: boolean;
  supportsEmployeeDetailSelection: boolean;
}

export type AttendancePdfPreflightNoticeCode =
  | 'multi_segment_trend'
  | 'issue_detail_limited'
  | 'api_issue_detail_incomplete'
  | 'employee_details_included'
  | 'all_employee_details_included'
  | 'empty_team_selection';

export interface AttendancePdfPreflightNotice {
  code: AttendancePdfPreflightNoticeCode;
  level: 'info' | 'warning';
  message: string;
}

/**
 * Volume exact de contenu que l'assembleur prévoit de rendre à partir du snapshot.
 * Il ne s'agit pas d'une estimation statistique et aucune valeur métier n'est recalculée.
 */
export interface AttendancePdfExportVolume {
  periodDays: number;
  dailyRows: number;
  trendSegmentCount: number;
  teamRows: number;
  issueTypeCount: number;
  issueOccurrenceRowsAvailable: number;
  issueOccurrenceRowsRendered: number;
  employeeDetailCount: number;
  employeeDayRows: number;
}

/**
 * Pré-contrôle destiné à l'interface d'export.
 * Il permet d'annoncer au manager la profondeur réelle du document avant génération,
 * notamment lorsqu'un rapport détaillé contient de nombreuses fiches individuelles.
 * Aucun seuil arbitraire ne bloque l'export : le manager conserve le choix du format.
 */
export interface AttendancePdfExportPreflight {
  request: AttendancePdfExportRequest;
  contract: AttendancePdfReportContract;
  plan: AttendancePdfReportPlan;
  volume: AttendancePdfExportVolume;
  notices: AttendancePdfPreflightNotice[];
}
