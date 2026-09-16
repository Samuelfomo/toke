import type {
  AttendanceDay,
  AttendanceDayActivity,
  AttendanceDayActivityInput,
  AttendanceDayResult,
  AttendanceIssue,
  BusinessDate,
  BusinessTime,
  ExpectedWorkBlock,
  AttendanceActivityInterval,
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
    input.date,
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
  date: BusinessDate,
  schedule: AttendanceDaySchedule,
  activity: AttendanceDayActivity,
  hasExpectedWorkDayEnded: boolean,
): { result: AttendanceDayResult; issues: AttendanceIssue[] } {
  if (schedule.state === 'UNRESOLVED') {
    return {
      result: {
        status: 'UNDETERMINED',
        delayMinutes: null,
        arrivalDelayMinutes: null,
        toleranceMinutes: null,
        expectedWorkMinutes: null,
        rateEligible: false,
      },
      issues: hasNonCarryOverActivity(date, activity)
        ? [schedule.issue, 'PRESENCE_WITHOUT_SCHEDULE']
        : [schedule.issue],
    };
  }

  if (schedule.state === 'REST_DAY') {
    return {
      result: {
        status: 'REST_DAY',
        delayMinutes: null,
        arrivalDelayMinutes: null,
        toleranceMinutes: null,
        expectedWorkMinutes: null,
        rateEligible: false,
      },
      issues: hasNonCarryOverActivity(date, activity) ? ['PRESENCE_ON_REST_DAY'] : [],
    };
  }

  const firstExpectedBlock = schedule.expectedBlocks[0];
  if (!firstExpectedBlock) {
    throw new AttendanceDayInvariantError(
      'Invariant interne violé : un WORK_DAY normalisé doit contenir un bloc',
    );
  }

  const hasAttendanceActivity = hasActivityRelevantToSchedule(
    date,
    schedule.expectedBlocks,
    activity,
  );

  if (!hasAttendanceActivity) {
    return {
      result: {
        status: hasExpectedWorkDayEnded ? 'ABSENT' : 'PENDING',
        delayMinutes: null,
        arrivalDelayMinutes: null,
        toleranceMinutes: firstExpectedBlock.toleranceMinutes,
        expectedWorkMinutes: calculateExpectedWorkMinutes(schedule.expectedBlocks),
        rateEligible: hasExpectedWorkDayEnded,
      },
      // Une activité réelle peut exister sans couvrir une prise de service
      // attendue (mauvais créneau, continuité non qualifiante, etc.).
      // On conserve la durée, mais on signale explicitement pourquoi cette
      // activité ne transforme pas la journée en présence au planning.
      issues: activity.hasActivity ? ['ACTIVITY_OUTSIDE_EXPECTED_BLOCK'] : [],
    };
  }

  const lateness = evaluateLatenessForExpectedBlocks(
    date,
    schedule.expectedBlocks,
    activity,
  );

  return {
    result: {
      status: lateness.delayMinutes > 0 ? 'LATE' : 'PRESENT',
      delayMinutes: lateness.delayMinutes,
      arrivalDelayMinutes: lateness.arrivalDelayMinutes,
      toleranceMinutes: lateness.toleranceMinutes,
      expectedWorkMinutes: calculateExpectedWorkMinutes(schedule.expectedBlocks),
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
    if (
      input.firstClockIn !== null ||
      input.firstClockInDate !== null ||
      input.lastClockOut !== null ||
      input.lastClockOutDate !== null
    ) {
      throw new AttendanceDayInvariantError(
        'Une journée sans session ne peut contenir une date/heure d’entrée ou de sortie',
      );
    }
  } else {
    parseRequiredClockIn(input.firstClockIn);
    validateActivityDate('firstClockInDate', input.firstClockInDate);
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
    validateActivityDate('lastClockOutDate', input.lastClockOutDate);
  } else if (input.lastClockOutDate !== null) {
    throw new AttendanceDayInvariantError(
      'lastClockOutDate doit être null lorsque lastClockOut est null',
    );
  }

  const intervals = normalizeActivityIntervals(input.intervals ?? []);
  if (!hasActivity && intervals.length > 0) {
    throw new AttendanceDayInvariantError(
      'Une journée sans session ne peut contenir d’intervalle d’activité',
    );
  }

  return {
    ...input,
    intervals,
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

  const isValid = isValidExpectedBlocks(schedule.expectedBlocks);

  if (isValid) return schedule;

  return {
    state: 'UNRESOLVED',
    source: schedule.source,
    expectedBlocks: [],
    issue: 'INVALID_SCHEDULE',
  };
}

function isValidExpectedBlocks(blocks: readonly ExpectedWorkBlock[]): boolean {
  if (blocks.length === 0) return false;

  for (const block of blocks) {
    if (
      !isBusinessTime(block.startTime) ||
      !isBusinessTime(block.endTime) ||
      !Number.isInteger(block.toleranceMinutes) ||
      block.toleranceMinutes < 0 ||
      !isOptionalBusinessTime(block.pauseStartTime) ||
      !isOptionalBusinessTime(block.pauseEndTime) ||
      ((block.pauseStartTime == null) !== (block.pauseEndTime == null))
    ) {
      return false;
    }

    const start = parseBusinessTime(block.startTime);
    const end = parseBusinessTime(block.endTime);
    // Même règle que SessionTemplates : un bloc appartient à une seule journée civile.
    if (start >= end) return false;

    if (block.pauseStartTime != null && block.pauseEndTime != null) {
      const pauseStart = parseBusinessTime(block.pauseStartTime);
      const pauseEnd = parseBusinessTime(block.pauseEndTime);
      if (pauseStart >= pauseEnd || pauseStart < start || pauseEnd > end) return false;
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const leftStart = parseBusinessTime(blocks[i]!.startTime);
    const leftEnd = parseBusinessTime(blocks[i]!.endTime);
    for (let j = i + 1; j < blocks.length; j++) {
      const rightStart = parseBusinessTime(blocks[j]!.startTime);
      const rightEnd = parseBusinessTime(blocks[j]!.endTime);
      if (leftStart < rightEnd && rightStart < leftEnd) return false;
    }
  }

  return true;
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

function validateActivityDate(field: string, value: BusinessDate | null): void {
  if (value === null || !BUSINESS_DATE_PATTERN.test(value)) {
    throw new AttendanceDayInvariantError(`${field} doit respecter le format YYYY-MM-DD`);
  }
}

function isOptionalBusinessTime(value: BusinessTime | null | undefined): boolean {
  return value == null || isBusinessTime(value);
}

interface BlockLatenessResult {
  arrivalDelayMinutes: number;
  delayMinutes: number;
  toleranceMinutes: number;
}

function hasNonCarryOverActivity(
  date: BusinessDate,
  activity: AttendanceDayActivity,
): boolean {
  if (!activity.hasActivity) return false;
  const intervals = activity.intervals ?? [];
  if (intervals.length === 0) return activity.firstClockInDate === date;
  return intervals.some((interval) => interval.startDate === date);
}

function hasActivityRelevantToSchedule(
  date: BusinessDate,
  blocks: readonly ExpectedWorkBlock[],
  activity: AttendanceDayActivity,
): boolean {
  if (!activity.hasActivity) return false;

  const intervals = activity.intervals ?? [];
  if (intervals.length === 0) {
    if (activity.firstClockInDate === date) {
      const clockInMinutes = parseRequiredClockIn(activity.firstClockIn);
      return blocks.some((block) => {
        const blockStart = parseBusinessTime(block.startTime);
        const blockEnd = parseBusinessTime(block.endTime);
        return clockInMinutes >= blockStart && clockInMinutes < blockEnd;
      });
    }

    // Compatibilité avec un ancien adaptateur ne fournissant pas les intervalles :
    // une entrée provenant d'une date antérieure ne peut prouver qu'une
    // continuation de bloc commençant à minuit.
    return blocks.some((block) => parseBusinessTime(block.startTime) === 0);
  }

  // Une activité démarrée le jour même ne prouve la couverture du planning
  // que si elle chevauche réellement au moins un bloc attendu. Une activité
  // enregistrée complètement hors des blocs reste conservée dans les durées,
  // mais ne doit pas inventer une présence ponctuelle.
  const sameDayIntervals = intervals.filter((interval) => interval.startDate === date);
  const hasSameDayBlockCoverage = blocks.some((block) => {
    const blockStart = businessDateTimeToMinutes(date, block.startTime);
    const blockEnd = businessDateTimeToMinutes(date, block.endTime);

    return sameDayIntervals.some((interval) => {
      const start = businessDateTimeToMinutes(interval.startDate, interval.startTime);
      const end =
        interval.endDate !== null && interval.endTime !== null
          ? businessDateTimeToMinutes(interval.endDate, interval.endTime)
          : Number.POSITIVE_INFINITY;
      return start < blockEnd && end > blockStart;
    });
  });
  if (hasSameDayBlockCoverage) return true;

  // Une activité commencée la veille n'est reconnue automatiquement comme
  // continuité que pour un bloc qui démarre à minuit. C'est la règle validée
  // pour les gardes scindées J 16:00-23:59 / J+1 00:00-08:00.
  const midnightBlocks = blocks.filter((block) => parseBusinessTime(block.startTime) === 0);
  if (midnightBlocks.length === 0) return false;

  return midnightBlocks.some((block) => {
    const blockStart = businessDateTimeToMinutes(date, block.startTime);
    const blockEnd = businessDateTimeToMinutes(date, block.endTime);
    return intervals.some((interval) => {
      const start = businessDateTimeToMinutes(interval.startDate, interval.startTime);
      const end =
        interval.endDate !== null && interval.endTime !== null
          ? businessDateTimeToMinutes(interval.endDate, interval.endTime)
          : Number.POSITIVE_INFINITY;
      return interval.startDate < date && start < blockEnd && end > blockStart;
    });
  });
}

function evaluateLatenessForExpectedBlocks(
  date: BusinessDate,
  blocks: readonly ExpectedWorkBlock[],
  activity: AttendanceDayActivity,
): BlockLatenessResult {
  const intervals = activity.intervals ?? [];

  if (intervals.length === 0) {
    const firstBlock = blocks[0]!;

    // Compatibilité avec un adaptateur ancien : une entrée dont la date réelle
    // est antérieure à la journée analysée est une continuation de session, pas
    // une nouvelle prise de service. Elle ne doit jamais produire un retard à
    // 00:00 ou au début du premier bloc de la journée.
    if (activity.firstClockInDate !== date) {
      return {
        arrivalDelayMinutes: 0,
        delayMinutes: 0,
        toleranceMinutes: firstBlock.toleranceMinutes,
      };
    }

    const expectedStartMinutes = parseBusinessTime(firstBlock.startTime);
    const clockInMinutes = parseRequiredClockIn(activity.firstClockIn);
    const arrivalDelayMinutes = Math.max(0, clockInMinutes - expectedStartMinutes);
    const delayMinutes = Math.max(0, arrivalDelayMinutes - firstBlock.toleranceMinutes);
    return {
      arrivalDelayMinutes,
      delayMinutes,
      toleranceMinutes: firstBlock.toleranceMinutes,
    };
  }

  const evaluations: BlockLatenessResult[] = [];

  for (const block of blocks) {
    const blockStart = businessDateTimeToMinutes(date, block.startTime);
    const blockEnd = businessDateTimeToMinutes(date, block.endTime);
    const matchingIntervals = intervals
      .map((interval) => ({
        interval,
        start: businessDateTimeToMinutes(interval.startDate, interval.startTime),
        end:
          interval.endDate !== null && interval.endTime !== null
            ? businessDateTimeToMinutes(interval.endDate, interval.endTime)
            : Number.POSITIVE_INFINITY,
      }))
      .filter(({ start, end }) => start < blockEnd && end > blockStart)
      .sort((left, right) => left.start - right.start);

    const match = matchingIntervals[0];
    if (!match) continue;

    // Une session déjà ouverte avant le début du bloc (ex. garde de nuit qui
    // traverse minuit) couvre ce bloc sans créer une nouvelle prise de service.
    const arrivalDelayMinutes = Math.max(0, match.start - blockStart);
    const delayMinutes = Math.max(0, arrivalDelayMinutes - block.toleranceMinutes);

    evaluations.push({
      arrivalDelayMinutes,
      delayMinutes,
      toleranceMinutes: block.toleranceMinutes,
    });
  }

  if (evaluations.length === 0) {
    // Cette branche ne doit normalement plus être atteinte : la classification
    // vérifie d'abord qu'un bloc planifié est réellement couvert. On conserve
    // néanmoins un garde-fou sans fabriquer de retard massif.
    return {
      arrivalDelayMinutes: 0,
      delayMinutes: 0,
      toleranceMinutes: blocks[0]!.toleranceMinutes,
    };
  }

  return evaluations.reduce((selected, current) => {
    if (current.delayMinutes !== selected.delayMinutes) {
      return current.delayMinutes > selected.delayMinutes ? current : selected;
    }
    return current.arrivalDelayMinutes > selected.arrivalDelayMinutes ? current : selected;
  });
}

function normalizeActivityIntervals(
  intervals: readonly AttendanceActivityInterval[],
): readonly AttendanceActivityInterval[] {
  return intervals.map((interval) => {
    validateActivityDate('interval.startDate', interval.startDate);
    parseBusinessTime(interval.startTime);

    if ((interval.endDate === null) !== (interval.endTime === null)) {
      throw new AttendanceDayInvariantError(
        'interval.endDate et interval.endTime doivent être tous les deux renseignés ou null',
      );
    }

    if (interval.endDate !== null && interval.endTime !== null) {
      validateActivityDate('interval.endDate', interval.endDate);
      parseBusinessTime(interval.endTime);
      const start = businessDateTimeToMinutes(interval.startDate, interval.startTime);
      const end = businessDateTimeToMinutes(interval.endDate, interval.endTime);
      if (end < start) {
        throw new AttendanceDayInvariantError('Un intervalle d’activité ne peut pas finir avant son début');
      }
    }

    return interval;
  });
}

function businessDateTimeToMinutes(date: BusinessDate, time: BusinessTime): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new AttendanceDayInvariantError(`Date métier invalide « ${date} »`);
  }
  const day = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
  return day * 24 * 60 + parseBusinessTime(time);
}

function calculateExpectedWorkMinutes(
  blocks: readonly ExpectedWorkBlock[],
): number {
  return blocks.reduce((total, block) => {
    const workMinutes = calculateBusinessDuration(block.startTime, block.endTime);
    const pauseMinutes =
      block.pauseStartTime != null && block.pauseEndTime != null
        ? calculateBusinessDuration(block.pauseStartTime, block.pauseEndTime)
        : 0;

    if (pauseMinutes > workMinutes) {
      throw new AttendanceDayInvariantError(
        'La pause planifiée ne peut pas dépasser la durée du bloc de travail',
      );
    }

    return total + workMinutes - pauseMinutes;
  }, 0);
}

function calculateBusinessDuration(start: BusinessTime, end: BusinessTime): number {
  const startMinutes = parseBusinessTime(start);
  const endMinutes = parseBusinessTime(end);
  return endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : 24 * 60 - startMinutes + endMinutes;
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
