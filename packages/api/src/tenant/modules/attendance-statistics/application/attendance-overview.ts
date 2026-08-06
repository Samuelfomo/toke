import type { AttendanceDay, AttendanceIssue } from '../domain/attendance-day.types.js';
import type {
  AttendanceStatisticsOverview,
  AttendanceUnavailabilityReason,
  BuildAttendanceOverviewInput,
  DataQualityReason,
  DataQualityStatus,
  DurationCoverageStatus,
  OverviewAttendanceStatus,
} from './attendance-overview.types.js';

const BUSINESS_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export class AttendanceOverviewInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceOverviewInvariantError';
  }
}

/**
 * Agrège une collection déjà normalisée de `AttendanceDay`.
 *
 * Cette fonction ne lit ni la base de données ni les sessions brutes et ne
 * résout aucun planning. Elle ne fait aucune conversion de date ou de fuseau.
 */
export function buildAttendanceOverview(
  input: BuildAttendanceOverviewInput,
): AttendanceStatisticsOverview {
  validateInput(input);
  validateDays(input.days, input.period.startDate, input.period.endDate);

  const employeesEvaluated = new Set<number>();
  const employeesWithActivity = new Set<number>();

  let expectedEmployeeWorkingDays = 0;
  let presentEmployeeDays = 0;
  let lateEmployeeDays = 0;
  let absentEmployeeDays = 0;
  let totalDelayMinutes = 0;

  let employeeDaysWithActivity = 0;
  let totalSessions = 0;
  let openSessions = 0;
  let incompleteSessions = 0;

  let resolvedScheduleDays = 0;
  let unresolvedScheduleDays = 0;
  let missingScheduleDays = 0;
  let invalidScheduleDays = 0;
  let historicalScheduleUnavailableDays = 0;
  let ambiguousScheduleDays = 0;

  let presenceOnRestDayDays = 0;
  let presenceWithoutScheduleDays = 0;

  let completeDurationDays = 0;
  let knownGrossMinutes = 0;
  let knownPauseMinutes = 0;
  let knownNetMinutes = 0;

  for (const day of input.days) {
    employeesEvaluated.add(day.employeeId);

    if (day.schedule.state === 'UNRESOLVED') {
      unresolvedScheduleDays += 1;
      if (day.schedule.issue === 'MISSING_SCHEDULE') missingScheduleDays += 1;
      if (day.schedule.issue === 'INVALID_SCHEDULE') invalidScheduleDays += 1;
      if (day.schedule.issue === 'HISTORICAL_SCHEDULE_UNAVAILABLE') {
        historicalScheduleUnavailableDays += 1;
      }
      if (day.schedule.issue === 'AMBIGUOUS_SCHEDULE') ambiguousScheduleDays += 1;
    } else {
      resolvedScheduleDays += 1;
    }

    if (day.result.rateEligible) {
      expectedEmployeeWorkingDays += 1;

      if (day.result.status === 'PRESENT') presentEmployeeDays += 1;
      if (day.result.status === 'LATE') {
        lateEmployeeDays += 1;
        totalDelayMinutes += requiredDelay(day);
      }
      if (day.result.status === 'ABSENT') absentEmployeeDays += 1;
    }

    if (day.activity.hasActivity) {
      employeesWithActivity.add(day.employeeId);
      employeeDaysWithActivity += 1;
      totalSessions += day.activity.sessionCount;
      openSessions += day.activity.openSessionCount;
      incompleteSessions += day.activity.incompleteSessionCount;

      if (hasCompleteDuration(day)) {
        completeDurationDays += 1;
        knownGrossMinutes += day.activity.grossMinutes;
        knownPauseMinutes += day.activity.pauseMinutes;
        knownNetMinutes += day.activity.netMinutes;
      }
    }

    if (day.issues.includes('PRESENCE_ON_REST_DAY')) {
      presenceOnRestDayDays += 1;
    }
    if (day.issues.includes('PRESENCE_WITHOUT_SCHEDULE')) {
      presenceWithoutScheduleDays += 1;
    }
  }

  assertAttendanceIdentity(
    expectedEmployeeWorkingDays,
    presentEmployeeDays,
    lateEmployeeDays,
    absentEmployeeDays,
  );

  const attendedEmployeeDays = presentEmployeeDays + lateEmployeeDays;
  const incompleteDurationDays = employeeDaysWithActivity - completeDurationDays;

  const attendanceStatus = resolveAttendanceStatus(
    input.days.length,
    expectedEmployeeWorkingDays,
    unresolvedScheduleDays,
  );
  const unavailabilityReason = resolveUnavailabilityReason(
    input.days.length,
    expectedEmployeeWorkingDays,
    resolvedScheduleDays,
  );
  const durationStatus = resolveDurationStatus(
    employeeDaysWithActivity,
    completeDurationDays,
  );
  const qualityReasons = collectQualityReasons(input.days);
  const dataQualityStatus = resolveDataQualityStatus(
    input.days.length,
    resolvedScheduleDays,
    qualityReasons,
  );

  return {
    period: {
      start_date: input.period.startDate,
      end_date: input.period.endDate,
      generated_at: input.generatedAt,
      business_timezone: input.businessTimezone,
    },
    scope: {
      manager_guid: input.managerGuid,
      employees_evaluated: employeesEvaluated.size,
      employee_days_evaluated: input.days.length,
    },
    attendance: {
      status: attendanceStatus,
      unavailability_reason: unavailabilityReason,
      employee_working_days_expected: expectedEmployeeWorkingDays,
      present_employee_days: presentEmployeeDays,
      late_employee_days: lateEmployeeDays,
      absent_employee_days: absentEmployeeDays,
      attendance_rate: percentage(attendedEmployeeDays, expectedEmployeeWorkingDays),
      absence_rate: percentage(absentEmployeeDays, expectedEmployeeWorkingDays),
      punctuality_rate: percentage(presentEmployeeDays, attendedEmployeeDays),
      total_delay_minutes: totalDelayMinutes,
      average_delay_minutes:
        lateEmployeeDays === 0 ? null : round(totalDelayMinutes / lateEmployeeDays, 2),
    },
    recorded_activity: {
      employees_with_activity: employeesWithActivity.size,
      employee_days_with_activity: employeeDaysWithActivity,
      sessions: {
        total: totalSessions,
        open: openSessions,
        incomplete: incompleteSessions,
      },
      durations: {
        known_gross_minutes: durationValue(
          employeeDaysWithActivity,
          completeDurationDays,
          knownGrossMinutes,
        ),
        known_pause_minutes: durationValue(
          employeeDaysWithActivity,
          completeDurationDays,
          knownPauseMinutes,
        ),
        known_net_minutes: durationValue(
          employeeDaysWithActivity,
          completeDurationDays,
          knownNetMinutes,
        ),
      },
    },
    signals: {
      presence_on_rest_day_employee_days: presenceOnRestDayDays,
      presence_without_schedule_employee_days: presenceWithoutScheduleDays,
    },
    data_quality: {
      status: dataQualityStatus,
      reasons: qualityReasons,
      schedule: {
        resolved_employee_days: resolvedScheduleDays,
        unresolved_employee_days: unresolvedScheduleDays,
        missing_schedule_employee_days: missingScheduleDays,
        invalid_schedule_employee_days: invalidScheduleDays,
        historical_schedule_unavailable_employee_days:
          historicalScheduleUnavailableDays,
        ambiguous_schedule_employee_days: ambiguousScheduleDays,
        coverage_rate: percentage(resolvedScheduleDays, input.days.length),
      },
      duration: {
        status: durationStatus,
        employee_days_with_activity: employeeDaysWithActivity,
        complete_employee_days: completeDurationDays,
        incomplete_employee_days: incompleteDurationDays,
        coverage_rate: percentage(completeDurationDays, employeeDaysWithActivity),
      },
    },
  };
}

function validateInput(input: BuildAttendanceOverviewInput): void {
  if (!isBusinessDate(input.period.startDate) || !isBusinessDate(input.period.endDate)) {
    throw new AttendanceOverviewInvariantError(
      'La période doit utiliser le format métier YYYY-MM-DD',
    );
  }

  if (input.period.startDate > input.period.endDate) {
    throw new AttendanceOverviewInvariantError('startDate doit précéder ou égaler endDate');
  }

  if (input.managerGuid.trim().length === 0) {
    throw new AttendanceOverviewInvariantError('managerGuid est obligatoire');
  }

  if (input.generatedAt.trim().length === 0) {
    throw new AttendanceOverviewInvariantError('generatedAt est obligatoire');
  }

  if (input.businessTimezone.trim().length === 0) {
    throw new AttendanceOverviewInvariantError('businessTimezone est obligatoire');
  }
}

function validateDays(
  days: readonly AttendanceDay[],
  startDate: string,
  endDate: string,
): void {
  const keys = new Set<string>();

  for (const day of days) {
    if (day.date < startDate || day.date > endDate) {
      throw new AttendanceOverviewInvariantError(
        `La journée ${day.employeeId} × ${day.date} est hors période`,
      );
    }

    const key = `${day.employeeId}:${day.date}`;
    if (keys.has(key)) {
      throw new AttendanceOverviewInvariantError(
        `Journée employé dupliquée : ${day.employeeId} × ${day.date}`,
      );
    }
    keys.add(key);

    if (
      day.result.rateEligible &&
      day.result.status !== 'PRESENT' &&
      day.result.status !== 'LATE' &&
      day.result.status !== 'ABSENT'
    ) {
      throw new AttendanceOverviewInvariantError(
        `Le statut ${day.result.status} ne peut pas entrer dans les taux`,
      );
    }

    if (day.result.status === 'LATE' && day.result.rateEligible) {
      requiredDelay(day);
    }
  }
}

function requiredDelay(day: AttendanceDay): number {
  const delay = day.result.delayMinutes;
  if (delay === null || !Number.isFinite(delay) || delay < 0) {
    throw new AttendanceOverviewInvariantError(
      `Un jour LATE doit posséder un delayMinutes valide : ${day.employeeId} × ${day.date}`,
    );
  }
  return delay;
}

function hasCompleteDuration(
  day: AttendanceDay,
): day is AttendanceDay & {
  activity: AttendanceDay['activity'] & {
    grossMinutes: number;
    pauseMinutes: number;
    netMinutes: number;
  };
} {
  return (
    day.activity.hasActivity &&
    day.activity.openSessionCount === 0 &&
    day.activity.incompleteSessionCount === 0 &&
    day.activity.grossMinutes !== null &&
    day.activity.pauseMinutes !== null &&
    day.activity.netMinutes !== null
  );
}

function collectQualityReasons(days: readonly AttendanceDay[]): DataQualityReason[] {
  if (days.length === 0) return ['NO_EMPLOYEE_DAY'];

  const issueOrder: readonly DataQualityReason[] = [
    'MISSING_SCHEDULE',
    'INVALID_SCHEDULE',
    'HISTORICAL_SCHEDULE_UNAVAILABLE',
    'AMBIGUOUS_SCHEDULE',
    'OPEN_SESSION',
    'INCOMPLETE_SESSION',
    'MISSING_DURATION',
  ];

  return issueOrder.filter((issue) => days.some((day) => hasIssue(day.issues, issue)));
}

function hasIssue(issues: readonly AttendanceIssue[], issue: DataQualityReason): boolean {
  if (issue === 'NO_EMPLOYEE_DAY') return false;
  return issues.includes(issue);
}

function resolveAttendanceStatus(
  totalDays: number,
  expectedDays: number,
  unresolvedDays: number,
): OverviewAttendanceStatus {
  if (totalDays === 0 || expectedDays === 0) return 'NOT_COMPUTABLE';
  return unresolvedDays > 0 ? 'PARTIAL' : 'COMPUTABLE';
}

function resolveUnavailabilityReason(
  totalDays: number,
  expectedDays: number,
  resolvedScheduleDays: number,
): AttendanceUnavailabilityReason | null {
  if (expectedDays > 0) return null;
  if (totalDays === 0) return 'NO_EMPLOYEE_DAY';
  if (resolvedScheduleDays === 0) return 'INSUFFICIENT_SCHEDULE_DATA';
  return 'NO_FINALIZED_EXPECTED_WORK_DAY';
}

function resolveDurationStatus(
  activityDays: number,
  completeDays: number,
): DurationCoverageStatus {
  if (activityDays === 0) return 'NOT_APPLICABLE';
  if (completeDays === 0) return 'UNAVAILABLE';
  if (completeDays === activityDays) return 'COMPLETE';
  return 'PARTIAL';
}

function resolveDataQualityStatus(
  totalDays: number,
  resolvedScheduleDays: number,
  reasons: readonly DataQualityReason[],
): DataQualityStatus {
  if (totalDays === 0 || resolvedScheduleDays === 0) return 'INSUFFICIENT';
  return reasons.length === 0 ? 'RELIABLE' : 'PARTIAL';
}

function assertAttendanceIdentity(
  expectedDays: number,
  presentDays: number,
  lateDays: number,
  absentDays: number,
): void {
  if (expectedDays !== presentDays + lateDays + absentDays) {
    throw new AttendanceOverviewInvariantError(
      'Invariant violé : expected = present + late + absent',
    );
  }
}

function durationValue(
  activityDays: number,
  completeDays: number,
  knownMinutes: number,
): number | null {
  if (activityDays === 0) return 0;
  return completeDays === 0 ? null : knownMinutes;
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return round((numerator / denominator) * 100, 2);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function isBusinessDate(value: string): boolean {
  return BUSINESS_DATE_PATTERN.test(value);
}
