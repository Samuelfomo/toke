import type {
  AttendanceDay,
  AttendanceIssue,
  AttendanceStatus,
} from '../domain/attendance-day.types.js';
import type {
  AttendanceDataQuality,
  AttendanceDurationMetrics,
  AttendanceEmployeeOverview,
  AttendanceIssueOccurrence,
  AttendanceIssueSummary,
  AttendanceOverview,
  AttendanceOverviewEmployeeIdentity,
  AttendanceRateMetrics,
  AttendanceStatusTotals,
  BuildAttendanceOverviewInput,
} from './attendance-overview.types.js';

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'PRESENT',
  'LATE',
  'ABSENT',
  'REST_DAY',
  'UNDETERMINED',
  'PENDING',
];

const ATTENDANCE_ISSUES: readonly AttendanceIssue[] = [
  'PRESENCE_ON_REST_DAY',
  'PRESENCE_WITHOUT_SCHEDULE',
  'MISSING_SCHEDULE',
  'INVALID_SCHEDULE',
  'OPEN_SESSION',
  'INCOMPLETE_SESSION',
  'MISSING_DURATION',
];

export class AttendanceOverviewInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceOverviewInvariantError';
  }
}

/**
 * Agrège les AttendanceDay déjà classifiés. Aucun accès DB ni aucune résolution
 * de planning n'est autorisé ici.
 */
export function buildAttendanceOverview(
  input: BuildAttendanceOverviewInput,
): AttendanceOverview {
  validateInput(input);

  const employeeById = new Map<number, AttendanceOverviewEmployeeIdentity>(
    input.employees.map((employee) => [employee.id, employee]),
  );
  const daysByEmployee = groupDaysByEmployee(input.days, employeeById);

  const employees = input.employees.map((employee) =>
    buildEmployeeOverview(employee, daysByEmployee.get(employee.id) ?? []),
  );

  const statusTotals = countStatuses(input.days);
  const rates = calculateRates(input.days);
  const durations = calculateDurations(input.days);
  const issues = buildIssueSummaries(input.days, employeeById);

  const daily = input.dates.map((date) => {
    const dateDays = input.days.filter((day) => day.date === date);
    return {
      date,
      teamSize: input.employees.length,
      statusTotals: countStatuses(dateDays),
      rates: calculateRates(dateDays),
      issueCount: dateDays.reduce((total, day) => total + day.issues.length, 0),
    };
  });

  return {
    generatedAt: input.generatedAt,
    period: {
      startDate: input.startDate,
      endDate: input.endDate,
      dayCount: input.dates.length,
    },
    scope: {
      managerGuid: input.managerGuid,
      siteGuid: input.siteGuid,
      teamSize: input.employees.length,
      employees: input.employees.map((employee) => ({
        guid: employee.guid,
        name: employee.name,
      })),
    },
    summary: {
      statusTotals,
      rates,
      durations,
      issueCount: input.days.reduce((total, day) => total + day.issues.length, 0),
    },
    daily,
    employees,
    issues,
    dataQuality: buildDataQuality(input.days),
  };
}

function buildEmployeeOverview(
  employee: AttendanceOverviewEmployeeIdentity,
  days: readonly AttendanceDay[],
): AttendanceEmployeeOverview {
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));

  return {
    employeeGuid: employee.guid,
    employeeName: employee.name,
    statusTotals: countStatuses(sortedDays),
    rates: calculateRates(sortedDays),
    durations: calculateDurations(sortedDays),
    issueCount: sortedDays.reduce((total, day) => total + day.issues.length, 0),
    days: sortedDays.map((day) => ({
      date: day.date,
      status: day.result.status,
      rateEligible: day.result.rateEligible,
      delayMinutes: day.result.delayMinutes,
      firstClockIn: day.activity.firstClockIn,
      lastClockOut: day.activity.lastClockOut,
      grossMinutes: day.activity.grossMinutes,
      pauseMinutes: day.activity.pauseMinutes,
      netMinutes: day.activity.netMinutes,
      issues: [...day.issues],
    })),
  };
}

function calculateRates(days: readonly AttendanceDay[]): AttendanceRateMetrics {
  const eligibleDays = days.filter((day) => day.result.rateEligible);
  const presentDays = eligibleDays.filter((day) => day.result.status === 'PRESENT').length;
  const lateDays = eligibleDays.filter((day) => day.result.status === 'LATE').length;
  const absentDays = eligibleDays.filter((day) => day.result.status === 'ABSENT').length;
  const expected = presentDays + lateDays + absentDays;
  const attended = presentDays + lateDays;

  return {
    employeeWorkingDaysExpected: expected,
    attendedWorkingDays: attended,
    onTimeWorkingDays: presentDays,
    lateWorkingDays: lateDays,
    attendanceRate: expected > 0 ? roundOne((attended / expected) * 100) : null,
    punctualityRate: attended > 0 ? roundOne((presentDays / attended) * 100) : null,
  };
}

function calculateDurations(days: readonly AttendanceDay[]): AttendanceDurationMetrics {
  let grossMinutes = 0;
  let pauseMinutes = 0;
  let netMinutes = 0;
  let knownGross = 0;
  let knownPause = 0;
  let knownNet = 0;
  let missing = 0;

  for (const day of days) {
    if (!day.activity.hasActivity) continue;

    const hasCompleteDuration =
      day.activity.grossMinutes !== null &&
      day.activity.pauseMinutes !== null &&
      day.activity.netMinutes !== null;

    if (!hasCompleteDuration) missing++;

    if (day.activity.grossMinutes !== null) {
      grossMinutes += day.activity.grossMinutes;
      knownGross++;
    }

    if (day.activity.pauseMinutes !== null) {
      pauseMinutes += day.activity.pauseMinutes;
      knownPause++;
    }

    if (day.activity.netMinutes !== null) {
      netMinutes += day.activity.netMinutes;
      knownNet++;
    }
  }

  return {
    grossMinutes,
    pauseMinutes,
    netMinutes,
    daysWithKnownGrossDuration: knownGross,
    daysWithKnownPauseDuration: knownPause,
    daysWithKnownNetDuration: knownNet,
    daysWithMissingDuration: missing,
  };
}

function countStatuses(days: readonly AttendanceDay[]): AttendanceStatusTotals {
  const totals = createEmptyStatusTotals();
  for (const day of days) totals[day.result.status]++;
  return totals;
}

function createEmptyStatusTotals(): AttendanceStatusTotals {
  return {
    PRESENT: 0,
    LATE: 0,
    ABSENT: 0,
    REST_DAY: 0,
    UNDETERMINED: 0,
    PENDING: 0,
  };
}

function buildIssueSummaries(
  days: readonly AttendanceDay[],
  employeeById: ReadonlyMap<number, AttendanceOverviewEmployeeIdentity>,
): AttendanceIssueSummary[] {
  return ATTENDANCE_ISSUES.map((issue) => {
    const occurrences: AttendanceIssueOccurrence[] = [];
    const employees = new Set<string>();

    for (const day of days) {
      if (!day.issues.includes(issue)) continue;
      const employee = employeeById.get(day.employeeId);
      if (!employee) continue;

      employees.add(employee.guid);
      if (occurrences.length < 100) {
        occurrences.push({
          employeeGuid: employee.guid,
          employeeName: employee.name,
          date: day.date,
          status: day.result.status,
        });
      }
    }

    return {
      issue,
      count: days.reduce(
        (total, day) => total + (day.issues.includes(issue) ? 1 : 0),
        0,
      ),
      employeesConcerned: employees.size,
      occurrences,
    };
  }).filter((summary) => summary.count > 0);
}

function buildDataQuality(days: readonly AttendanceDay[]): AttendanceDataQuality {
  const countIssue = (issue: AttendanceIssue): number =>
    days.reduce((total, day) => total + (day.issues.includes(issue) ? 1 : 0), 0);

  const unresolvedScheduleDays =
    countIssue('MISSING_SCHEDULE') + countIssue('INVALID_SCHEDULE');
  const presenceWithoutScheduleDays = countIssue('PRESENCE_WITHOUT_SCHEDULE');
  const openSessionDays = countIssue('OPEN_SESSION');
  const incompleteSessionDays = countIssue('INCOMPLETE_SESSION');
  const missingDurationDays = countIssue('MISSING_DURATION');

  const notes: string[] = [];
  if (unresolvedScheduleDays > 0) {
    notes.push(
      `${unresolvedScheduleDays} journée(s) sans planning exploitable sont exclues du taux de présence.`,
    );
  }
  if (openSessionDays + incompleteSessionDays > 0) {
    notes.push(
      `${openSessionDays + incompleteSessionDays} journée(s) contiennent une session ouverte ou incomplète.`,
    );
  }
  if (missingDurationDays > 0) {
    notes.push(
      `${missingDurationDays} journée(s) avec présence n'ont pas de durée complète et ne doivent pas être interprétées comme 0 minute.`,
    );
  }

  return {
    unresolvedScheduleDays,
    presenceWithoutScheduleDays,
    openSessionDays,
    incompleteSessionDays,
    missingDurationDays,
    reliableForAttendanceRate: unresolvedScheduleDays === 0,
    notes,
  };
}

function groupDaysByEmployee(
  days: readonly AttendanceDay[],
  employeeById: ReadonlyMap<number, AttendanceOverviewEmployeeIdentity>,
): Map<number, AttendanceDay[]> {
  const result = new Map<number, AttendanceDay[]>();
  for (const day of days) {
    if (!employeeById.has(day.employeeId)) {
      throw new AttendanceOverviewInvariantError(
        `La journée ${day.employeeId}:${day.date} appartient à un employé hors périmètre`,
      );
    }
    const employeeDays = result.get(day.employeeId) ?? [];
    employeeDays.push(day);
    result.set(day.employeeId, employeeDays);
  }
  return result;
}

function validateInput(input: BuildAttendanceOverviewInput): void {
  const employeeIds = new Set<number>();
  const employeeGuids = new Set<string>();
  for (const employee of input.employees) {
    if (employeeIds.has(employee.id)) {
      throw new AttendanceOverviewInvariantError(`Employé dupliqué : id=${employee.id}`);
    }
    if (employeeGuids.has(employee.guid)) {
      throw new AttendanceOverviewInvariantError(`Employé dupliqué : guid=${employee.guid}`);
    }
    employeeIds.add(employee.id);
    employeeGuids.add(employee.guid);
  }

  const expectedDayCount = input.employees.length * input.dates.length;
  if (input.days.length !== expectedDayCount) {
    throw new AttendanceOverviewInvariantError(
      `Matrice incomplète : ${input.days.length} journée(s) reçue(s), ${expectedDayCount} attendue(s)`,
    );
  }

  const uniqueDayKeys = new Set<string>();
  for (const day of input.days) {
    const key = `${day.employeeId}:${day.date}`;
    if (uniqueDayKeys.has(key)) {
      throw new AttendanceOverviewInvariantError(`Journée dupliquée : ${key}`);
    }
    uniqueDayKeys.add(key);
  }

  for (const status of ATTENDANCE_STATUSES) {
    if (!status) throw new AttendanceOverviewInvariantError('Statut invalide');
  }
}

function roundOne(value: number): number {
  return Number(value.toFixed(1));
}
