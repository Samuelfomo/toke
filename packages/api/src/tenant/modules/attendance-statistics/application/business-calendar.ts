import type {
  AttendanceDaySchedule,
  BusinessDate,
  BusinessTime,
} from '../domain/attendance-day.types.js';

const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const BUSINESS_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const MINUTES_PER_DAY = 24 * 60;

export type WeekdayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface BusinessNow {
  date: BusinessDate;
  time: BusinessTime;
}

export class BusinessCalendarInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessCalendarInvariantError';
  }
}

/**
 * Ces fonctions manipulent des dates civiles, pas des instants UTC. Date.UTC
 * sert uniquement à appliquer correctement le calendrier grégorien sans
 * dépendre du fuseau horaire de la machine.
 */
export function enumerateBusinessDates(
  startDate: BusinessDate,
  endDate: BusinessDate,
): BusinessDate[] {
  assertBusinessDate(startDate);
  assertBusinessDate(endDate);

  if (startDate > endDate) {
    throw new BusinessCalendarInvariantError('startDate doit précéder ou égaler endDate');
  }

  const dates: BusinessDate[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addBusinessDays(cursor, 1);
  }

  return dates;
}

export function addBusinessDays(date: BusinessDate, days: number): BusinessDate {
  assertBusinessDate(date);
  if (!Number.isInteger(days)) {
    throw new BusinessCalendarInvariantError('days doit être un entier');
  }

  const { year, month, day } = parseBusinessDate(date);
  const timestamp = Date.UTC(year, month - 1, day + days);
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getWeekdayKey(date: BusinessDate): WeekdayKey {
  assertBusinessDate(date);
  const { year, month, day } = parseBusinessDate(date);
  const keys: readonly WeekdayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const key = keys[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  if (!key) {
    throw new BusinessCalendarInvariantError(`Jour de semaine introuvable pour ${date}`);
  }
  return key;
}

export function parseBusinessTimeToMinutes(time: BusinessTime): number {
  const match = BUSINESS_TIME_PATTERN.exec(time);
  if (!match) {
    throw new BusinessCalendarInvariantError(
      `Heure métier invalide « ${time} » : format attendu HH:mm ou HH:mm:ss`,
    );
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function assertBusinessDate(date: BusinessDate): void {
  const parsed = parseBusinessDate(date);
  const roundTrip = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
    .toISOString()
    .slice(0, 10);

  if (roundTrip !== date) {
    throw new BusinessCalendarInvariantError(`Date métier invalide « ${date} »`);
  }
}

export function assertBusinessNow(now: BusinessNow): void {
  assertBusinessDate(now.date);
  parseBusinessTimeToMinutes(now.time);
}

/**
 * Retourne true uniquement lorsque la fin du dernier bloc attendu est atteinte.
 * Un bloc dont l'heure de fin est antérieure à l'heure de début traverse minuit.
 */
export function hasExpectedWorkDayEnded(
  date: BusinessDate,
  schedule: AttendanceDaySchedule,
  now: BusinessNow,
): boolean {
  if (schedule.state !== 'WORK_DAY' || schedule.expectedBlocks.length === 0) {
    return false;
  }

  assertBusinessDate(date);
  assertBusinessNow(now);

  let previousEndAbsoluteMinutes = 0;
  let lastEndAbsoluteMinutes = 0;

  try {
    for (const block of schedule.expectedBlocks) {
      const startMinute = parseBusinessTimeToMinutes(block.startTime);
      const endMinute = parseBusinessTimeToMinutes(block.endTime);

      if (startMinute === endMinute) return false;

      let startAbsoluteMinutes = startMinute;
      while (startAbsoluteMinutes < previousEndAbsoluteMinutes) {
        startAbsoluteMinutes += MINUTES_PER_DAY;
      }

      let endAbsoluteMinutes = endMinute + Math.floor(startAbsoluteMinutes / MINUTES_PER_DAY) * MINUTES_PER_DAY;
      while (endAbsoluteMinutes <= startAbsoluteMinutes) {
        endAbsoluteMinutes += MINUTES_PER_DAY;
      }

      previousEndAbsoluteMinutes = endAbsoluteMinutes;
      lastEndAbsoluteMinutes = Math.max(lastEndAbsoluteMinutes, endAbsoluteMinutes);
    }
  } catch {
    return false;
  }

  const endDayOffset = Math.floor(lastEndAbsoluteMinutes / MINUTES_PER_DAY);
  const endDate = addBusinessDays(date, endDayOffset);
  const endMinute = lastEndAbsoluteMinutes % MINUTES_PER_DAY;

  if (now.date > endDate) return true;
  if (now.date < endDate) return false;

  return parseBusinessTimeToMinutes(now.time) >= endMinute;
}

function parseBusinessDate(date: BusinessDate): {
  year: number;
  month: number;
  day: number;
} {
  const match = BUSINESS_DATE_PATTERN.exec(date);
  if (!match) {
    throw new BusinessCalendarInvariantError(
      `Date métier invalide « ${date} » : format attendu YYYY-MM-DD`,
    );
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}
