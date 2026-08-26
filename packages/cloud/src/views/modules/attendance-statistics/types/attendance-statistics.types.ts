/**
 * Contrat frontend de GET /attendance/statistics/overview.
 *
 * IMPORTANT : ce fichier reflète le contrat backend des lots 1 à 4.
 * Il ne doit contenir aucun recalcul métier des statuts ou des taux.
 */

export type BusinessDate = string;

export const ATTENDANCE_STATUSES = [
  'PRESENT',
  'LATE',
  'ABSENT',
  'REST_DAY',
  'UNDETERMINED',
  'PENDING',
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_ISSUES = [
  'PRESENCE_ON_REST_DAY',
  'PRESENCE_WITHOUT_SCHEDULE',
  'MISSING_SCHEDULE',
  'INVALID_SCHEDULE',
  'OPEN_SESSION',
  'INCOMPLETE_SESSION',
  'MISSING_DURATION',
] as const;

export type AttendanceIssue = (typeof ATTENDANCE_ISSUES)[number];

export interface AttendanceOverviewPeriod {
  startDate: BusinessDate;
  endDate: BusinessDate;
  dayCount: number;
}

export interface AttendanceOverviewScopeEmployee {
  guid: string;
  name: string;
}

export interface AttendanceOverviewScope {
  managerGuid: string;
  siteGuid: string | null;
  teamSize: number;
  employees: AttendanceOverviewScopeEmployee[];
}

export type AttendanceStatusTotals = Record<AttendanceStatus, number>;

export interface AttendanceRateMetrics {
  employeeWorkingDaysExpected: number;
  attendedWorkingDays: number;
  onTimeWorkingDays: number;
  lateWorkingDays: number;
  attendanceRate: number | null;
  punctualityRate: number | null;
}

export interface AttendanceDurationMetrics {
  grossMinutes: number;
  pauseMinutes: number;
  netMinutes: number;
  daysWithKnownGrossDuration: number;
  daysWithKnownPauseDuration: number;
  daysWithKnownNetDuration: number;
  daysWithMissingDuration: number;
}

export interface AttendanceIssueOccurrence {
  employeeGuid: string;
  employeeName: string;
  date: BusinessDate;
  status: AttendanceStatus;
}

export interface AttendanceIssueSummary {
  issue: AttendanceIssue;
  count: number;
  employeesConcerned: number;
  occurrences: AttendanceIssueOccurrence[];
}

export interface AttendanceDailyOverview {
  date: BusinessDate;
  teamSize: number;
  statusTotals: AttendanceStatusTotals;
  rates: AttendanceRateMetrics;
  /**
   * Durées agrégées de la journée retournées par l'API.
   * Optionnel uniquement pour permettre un déploiement frontend avant le backend enrichi.
   */
  durations?: AttendanceDurationMetrics;
  issueCount: number;
}

export interface AttendanceEmployeeDayOverview {
  date: BusinessDate;
  status: AttendanceStatus;
  rateEligible: boolean;
  delayMinutes: number | null;
  /** Heure métier déjà préparée par le serveur : HH:mm ou HH:mm:ss. */
  firstClockIn: string | null;
  /** Heure métier déjà préparée par le serveur : HH:mm ou HH:mm:ss. */
  lastClockOut: string | null;
  grossMinutes: number | null;
  pauseMinutes: number | null;
  netMinutes: number | null;
  issues: AttendanceIssue[];
}

export interface AttendanceEmployeeOverview {
  employeeGuid: string;
  employeeName: string;
  statusTotals: AttendanceStatusTotals;
  rates: AttendanceRateMetrics;
  durations: AttendanceDurationMetrics;
  issueCount: number;
  days: AttendanceEmployeeDayOverview[];
}

export interface AttendanceDataQuality {
  unresolvedScheduleDays: number;
  presenceWithoutScheduleDays: number;
  openSessionDays: number;
  incompleteSessionDays: number;
  missingDurationDays: number;
  reliableForAttendanceRate: boolean;
  notes: string[];
}

export interface AttendanceOverview {
  generatedAt: string;
  period: AttendanceOverviewPeriod;
  scope: AttendanceOverviewScope;
  summary: {
    statusTotals: AttendanceStatusTotals;
    rates: AttendanceRateMetrics;
    durations: AttendanceDurationMetrics;
    issueCount: number;
  };
  daily: AttendanceDailyOverview[];
  employees: AttendanceEmployeeOverview[];
  issues: AttendanceIssueSummary[];
  dataQuality: AttendanceDataQuality;
}

export interface AttendanceStatisticsFilters {
  managerGuid: string;
  siteGuid: string | null;
  startDate: BusinessDate;
  endDate: BusinessDate;
}

export interface AttendanceStatisticsQueryParams {
  manager: string;
  start_date: BusinessDate;
  end_date: BusinessDate;
  site?: string;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  timestamp?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorPayload;
  timestamp?: string;
}

export type AttendanceDataQualityLevel = 'reliable' | 'warning' | 'unreliable';

export interface AttendanceStatisticsValidationError {
  code:
    | 'manager_required'
    | 'invalid_date_format'
    | 'invalid_date_value'
    | 'invalid_date_range'
    | 'future_date_not_allowed'
    | 'period_too_large';
  message: string;
  field?: 'managerGuid' | 'startDate' | 'endDate';
}
