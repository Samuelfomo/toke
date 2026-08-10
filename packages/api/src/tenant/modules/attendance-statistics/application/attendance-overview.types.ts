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
  issueCount: number;
}

export interface AttendanceEmployeeDayOverview {
  date: BusinessDate;
  status: AttendanceStatus;
  rateEligible: boolean;
  delayMinutes: number | null;
  firstClockIn: string | null;
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
