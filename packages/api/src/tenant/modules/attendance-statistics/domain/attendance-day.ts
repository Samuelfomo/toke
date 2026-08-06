import type {
  AttendanceDay,
  AttendanceDayActivity,
  AttendanceDayActivityInput,
  AttendanceDayResult,
  AttendanceIssue,
  BusinessTime,
  CreateAttendanceDayInput,
  AttendanceDaySchedule,
} from './attendance-day.types.js';

const BUSINESS_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const BUSINESS_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export class AttendanceDayInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceDayInvariantError';
  }
}

/**
 * Construit la vérité métier d'un seul couple employé × journée.
 * Cette fonction est pure : pas de base de données, pas de fuseau, pas de Date.
 */
export function createAttendanceDay(input: CreateAttendanceDayInput): AttendanceDay {
  validateIdentity(input);

  const schedule = normalizeSchedule(input.schedule);
  const activity = normalizeActivity(input.activity);
  const activityIssues = detectActivityIssues(activity);
  const classification = classifyAttendanceDay(
    schedule,
    activity,
    input.hasExpectedWorkDayEnded,
  );

  return {
    employeeId: input.employeeId,
    employeeGuid: input.employeeGuid,
    date: input.date,
    schedule,
    activity,
    result: classification.result,
    issues: uniqueIssues([...classification.issues, ...activityIssues]),
  };
}

function classifyAttendanceDay(
  schedule: AttendanceDaySchedule,
  activity: AttendanceDayActivity,
  hasExpectedWorkDayEnded: boolean,
): { result: AttendanceDayResult; issues: AttendanceIssue[] } {
  if (schedule.state === 'UNRESOLVED') {
    return {
      result: {
        status: 'UNDETERMINED',
        delayMinutes: null,
        rateEligible: false,
      },
      issues: activity.hasActivity
        ? [schedule.issue, 'PRESENCE_WITHOUT_SCHEDULE']
        : [schedule.issue],
    };
  }

  if (schedule.state === 'REST_DAY') {
    return {
      result: {
        status: 'REST_DAY',
        delayMinutes: null,
        rateEligible: false,
      },
      issues: activity.hasActivity ? ['PRESENCE_ON_REST_DAY'] : [],
    };
  }

  const firstExpectedBlock = schedule.expectedBlocks[0];
  if (!firstExpectedBlock) {
    throw new AttendanceDayInvariantError(
      'Invariant interne violé : un WORK_DAY normalisé doit contenir un bloc',
    );
  }

  if (!activity.hasActivity) {
    return {
      result: {
        status: hasExpectedWorkDayEnded ? 'ABSENT' : 'PENDING',
        delayMinutes: null,
        rateEligible: hasExpectedWorkDayEnded,
      },
      issues: [],
    };
  }

  const expectedStartMinutes = parseBusinessTime(firstExpectedBlock.startTime);
  const clockInMinutes = parseRequiredClockIn(activity.firstClockIn);
  const delayMinutes = Math.max(0, clockInMinutes - expectedStartMinutes);
  const toleranceMinutes = firstExpectedBlock.toleranceMinutes;

  return {
    result: {
      status: delayMinutes > toleranceMinutes ? 'LATE' : 'PRESENT',
      delayMinutes,
      // Une présence en cours de journée est visible, mais n'entre pas encore
      // dans un taux fondé uniquement sur les journées finalisées.
      rateEligible: hasExpectedWorkDayEnded,
    },
    issues: [],
  };
}

function normalizeActivity(input: AttendanceDayActivityInput): AttendanceDayActivity {
  validateCount('sessionCount', input.sessionCount);
  validateCount('openSessionCount', input.openSessionCount);
  validateCount('incompleteSessionCount', input.incompleteSessionCount);

  if (input.openSessionCount + input.incompleteSessionCount > input.sessionCount) {
    throw new AttendanceDayInvariantError(
      'openSessionCount + incompleteSessionCount ne peut pas dépasser sessionCount',
    );
  }

  const hasActivity = input.sessionCount > 0;

  if (!hasActivity) {
    if (input.openSessionCount !== 0 || input.incompleteSessionCount !== 0) {
      throw new AttendanceDayInvariantError(
        'Une journée sans session ne peut contenir de session ouverte ou incomplète',
      );
    }
    if (input.firstClockIn !== null || input.lastClockOut !== null) {
      throw new AttendanceDayInvariantError(
        'Une journée sans session ne peut contenir une heure d’entrée ou de sortie',
      );
    }
  } else {
    parseRequiredClockIn(input.firstClockIn);
  }

  validateNullableMinutes('grossMinutes', input.grossMinutes);
  validateNullableMinutes('pauseMinutes', input.pauseMinutes);

  if (
    input.grossMinutes !== null &&
    input.pauseMinutes !== null &&
    input.pauseMinutes > input.grossMinutes
  ) {
    throw new AttendanceDayInvariantError(
      'pauseMinutes ne peut pas dépasser grossMinutes',
    );
  }

  if (input.lastClockOut !== null) {
    parseBusinessTime(input.lastClockOut);
  }

  return {
    ...input,
    hasActivity,
    netMinutes:
      input.grossMinutes !== null && input.pauseMinutes !== null
        ? input.grossMinutes - input.pauseMinutes
        : null,
  };
}

function detectActivityIssues(activity: AttendanceDayActivity): AttendanceIssue[] {
  if (!activity.hasActivity) return [];

  const issues: AttendanceIssue[] = [];

  if (activity.openSessionCount > 0) {
    issues.push('OPEN_SESSION');
  }

  if (activity.incompleteSessionCount > 0) {
    issues.push('INCOMPLETE_SESSION');
  }

  const hasOnlyFinalizedActivity =
    activity.openSessionCount === 0 && activity.incompleteSessionCount === 0;

  if (
    hasOnlyFinalizedActivity &&
    (activity.grossMinutes === null || activity.pauseMinutes === null)
  ) {
    issues.push('MISSING_DURATION');
  }

  return issues;
}

function validateIdentity(input: CreateAttendanceDayInput): void {
  if (!Number.isInteger(input.employeeId) || input.employeeId <= 0) {
    throw new AttendanceDayInvariantError('employeeId doit être un entier positif');
  }

  if (input.employeeGuid.trim().length === 0) {
    throw new AttendanceDayInvariantError('employeeGuid est obligatoire');
  }

  if (!BUSINESS_DATE_PATTERN.test(input.date)) {
    throw new AttendanceDayInvariantError('date doit respecter le format YYYY-MM-DD');
  }
}

function normalizeSchedule(schedule: AttendanceDaySchedule): AttendanceDaySchedule {
  if (schedule.state !== 'WORK_DAY') return schedule;

  const isValid =
    schedule.expectedBlocks.length > 0 &&
    schedule.expectedBlocks.every(
      (block) =>
        isBusinessTime(block.startTime) &&
        isBusinessTime(block.endTime) &&
        Number.isInteger(block.toleranceMinutes) &&
        block.toleranceMinutes >= 0,
    );

  if (isValid) return schedule;

  return {
    state: 'UNRESOLVED',
    source: schedule.source,
    expectedBlocks: [],
    issue: 'INVALID_SCHEDULE',
  };
}

function parseRequiredClockIn(value: BusinessTime | null): number {
  if (value === null) {
    throw new AttendanceDayInvariantError(
      'firstClockIn est obligatoire lorsqu’une activité est enregistrée',
    );
  }
  return parseBusinessTime(value);
}

function parseBusinessTime(value: BusinessTime): number {
  const match = BUSINESS_TIME_PATTERN.exec(value);
  if (!match) {
    throw new AttendanceDayInvariantError(
      `Heure métier invalide « ${value} » : format attendu HH:mm ou HH:mm:ss`,
    );
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function isBusinessTime(value: BusinessTime): boolean {
  return BUSINESS_TIME_PATTERN.test(value);
}

function validateCount(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new AttendanceDayInvariantError(`${field} doit être un entier positif ou nul`);
  }
}

function validateNullableMinutes(field: string, value: number | null): void {
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    throw new AttendanceDayInvariantError(`${field} doit être positif, nul ou null`);
  }
}

function uniqueIssues(issues: AttendanceIssue[]): AttendanceIssue[] {
  return [...new Set(issues)];
}
