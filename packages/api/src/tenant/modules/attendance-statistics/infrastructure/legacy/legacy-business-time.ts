import type {
  AttendanceTimestamp,
  AttendancePeriod,
} from '../../application/attendance-day-service.types.js';
import { addBusinessDays } from '../../application/business-calendar.js';

export class LegacyBusinessTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyBusinessTimeError';
  }
}

export class LegacyBusinessTimeFormatter {
  private readonly dateTimeFormatter: Intl.DateTimeFormat;

  constructor(readonly businessTimezone: string) {
    try {
      this.dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: businessTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      this.dateTimeFormatter.format(new Date(0));
    } catch {
      throw new LegacyBusinessTimeError(
        `Fuseau métier invalide ou indisponible : ${businessTimezone}`,
      );
    }
  }

  toAttendanceTimestamp(value: Date): AttendanceTimestamp {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new LegacyBusinessTimeError('Instant de session invalide');
    }

    const parts = new Map(
      this.dateTimeFormatter
        .formatToParts(value)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    const year = requiredPart(parts, 'year');
    const month = requiredPart(parts, 'month');
    const day = requiredPart(parts, 'day');
    const hour = requiredPart(parts, 'hour');
    const minute = requiredPart(parts, 'minute');
    const second = requiredPart(parts, 'second');

    return {
      businessDate: `${year}-${month}-${day}`,
      businessTime: `${hour}:${minute}:${second}`,
      epochMilliseconds: value.getTime(),
    };
  }

  toBusinessDate(value: Date): string {
    return this.toAttendanceTimestamp(value).businessDate;
  }

  /**
   * Bornes volontairement plus larges que la période civile. Le filtrage exact
   * se fait ensuite sur `businessDate`, ce qui évite de supposer un offset UTC.
   */
  toWideUtcQueryRange(period: AttendancePeriod): { start: Date; endExclusive: Date } {
    const start = new Date(`${addBusinessDays(period.startDate, -1)}T00:00:00.000Z`);
    const endExclusive = new Date(`${addBusinessDays(period.endDate, 2)}T00:00:00.000Z`);
    return { start, endExclusive };
  }
}

function requiredPart(parts: ReadonlyMap<string, string>, key: string): string {
  const value = parts.get(key);
  if (!value) {
    throw new LegacyBusinessTimeError(`Composante temporelle absente : ${key}`);
  }
  return value;
}
