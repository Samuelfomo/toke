import type {
  AttendanceDay,
  AttendanceIssue,
  AttendanceStatus,
  BusinessDate,
} from '../domain/attendance-day.types.js';

export interface AttendanceOverviewEmployeeIdentity {
  id: number;
  guid: string;
  name: string;
}

export interface AttendanceOverviewPeriod {
  startDate: BusinessDate;
  endDate: BusinessDate;
  dayCount: number;
}

export interface AttendanceOverviewScope {
  managerGuid: string;
  siteGuid: string | null;
  teamSize: number;
  employees: Array<{
    guid: string;
    name: string;
  }>;
}

export type AttendanceStatusTotals = Record<AttendanceStatus, number>;

export interface AttendanceRateMetrics {
  employeeWorkingDaysExpected: number;
  attendedWorkingDays: number;
  onTimeWorkingDays: number;
  lateWorkingDays: number;
  absentWorkingDays: number;
  attendanceRate: number | null;
  punctualityRate: number | null;
  absenceRate: number | null;
  lateRate: number | null;
  employeeDaysAnalyzed: number;
  employeeDaysWithIssues: number;
  issueRate: number | null;
}

export interface AttendanceDurationMetrics {
  expectedWorkMinutes: number;
  grossMinutes: number;
  pauseMinutes: number;
  netMinutes: number;
  daysWithKnownGrossDuration: number;
  daysWithKnownPauseDuration: number;
  daysWithKnownNetDuration: number;
  daysWithMissingDuration: number;
  daysWithKnownExpectedWorkDuration: number;
  attributedWorkMinutes: number;
  rawDeltaMinutes: number;
  creditedExtraMinutes: number;
  excessBeyondExtraMinutes: number;
  deficitMinutes: number;
  occurrencesWithKnownAttributedWorkDuration: number;
  occurrencesWithKnownDelta: number;
  occurrencesWithResolvedExtraPolicy: number;
}

export interface AttendanceSourceContext {
  sessionGuids: string[];
  clockInEntryGuids: string[];
}

export interface AttendanceIssueOccurrence {
  employeeGuid: string;
  employeeName: string;
  date: BusinessDate;
  status: AttendanceStatus;
  sourceContext: AttendanceSourceContext;
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
  /** Durées agrégées de la journée sur le périmètre courant. */
  durations: AttendanceDurationMetrics;
  issueCount: number;
}

export interface AttendanceEmployeeDayOverview {
  date: BusinessDate;
  status: AttendanceStatus;
  rateEligible: boolean;
  delayMinutes: number | null;
  arrivalDelayMinutes: number | null;
  toleranceMinutes: number | null;
  expectedWorkMinutes: number | null;
  attributedWorkMinutes: number | null;
  rawDeltaMinutes: number | null;
  deficitMinutes: number | null;
  creditedExtraMinutes: number | null;
  excessBeyondExtraMinutes: number | null;
  extraAllowed: boolean | null;
  extraMaxMinutes: number | null;
  firstClockIn: string | null;
  firstClockInDate: BusinessDate | null;
  lastClockOut: string | null;
  lastClockOutDate: BusinessDate | null;
  grossMinutes: number | null;
  pauseMinutes: number | null;
  netMinutes: number | null;
  issues: AttendanceIssue[];
  sourceContext: AttendanceSourceContext;
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
  correctedPresenceDays: number;
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

export interface BuildAttendanceOverviewInput {
  generatedAt: string;
  managerGuid: string;
  siteGuid: string | null;
  startDate: BusinessDate;
  endDate: BusinessDate;
  dates: readonly BusinessDate[];
  employees: readonly AttendanceOverviewEmployeeIdentity[];
  days: readonly AttendanceDay[];
}
