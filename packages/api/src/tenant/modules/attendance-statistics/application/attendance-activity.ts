import type { AttendanceDayActivityInput } from '../domain/attendance-day.types.js';
import type {
  AttendanceActivityByEmployeeDate,
  AttendanceSessionEntryRecord,
  AttendanceSessionRecord,
} from './attendance-day-service.types.js';

const MILLISECONDS_PER_MINUTE = 60_000;

export class AttendanceActivityInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceActivityInvariantError';
  }
}

interface SessionMeasurement {
  open: boolean;
  incomplete: boolean;
  grossMinutes: number | null;
  pauseMinutes: number | null;
}

export function attendanceEmployeeDateKey(employeeId: number, date: string): string {
  return `${employeeId}:${date}`;
}

/**
 * Regroupe toutes les sessions par couple employé × date de début métier.
 * Aucune session n'est comptée comme une journée supplémentaire à cause d'une
 * pause ou d'un passage de minuit.
 */
export function aggregateAttendanceActivities(
  sessions: readonly AttendanceSessionRecord[],
): AttendanceActivityByEmployeeDate {
  const sessionIds = new Set<number>();
  const grouped = new Map<string, AttendanceSessionRecord[]>();

  for (const session of sessions) {
    validateSessionIdentity(session);
    if (sessionIds.has(session.id)) {
      throw new AttendanceActivityInvariantError(`Session dupliquée : ${session.id}`);
    }
    sessionIds.add(session.id);

    const key = attendanceEmployeeDateKey(
      session.employeeId,
      session.startedAt.businessDate,
    );
    const group = grouped.get(key) ?? [];
    group.push(session);
    grouped.set(key, group);
  }

  const result = new Map<string, AttendanceDayActivityInput>();

  for (const [key, daySessions] of grouped.entries()) {
    const ordered = [...daySessions].sort(
      (left, right) =>
        left.startedAt.epochMilliseconds - right.startedAt.epochMilliseconds,
    );
    const measurements = ordered.map(measureSession);

    const openSessionCount = measurements.filter((item) => item.open).length;
    const incompleteSessionCount = measurements.filter(
      (item) => !item.open && item.incomplete,
    ).length;
    const allDurationsKnown = measurements.every(
      (item) =>
        !item.open &&
        !item.incomplete &&
        item.grossMinutes !== null &&
        item.pauseMinutes !== null,
    );

    const firstSession = ordered[0];
    if (!firstSession) continue;

    const endedSessions = ordered
      .filter(
        (session): session is AttendanceSessionRecord & {
          endedAt: NonNullable<AttendanceSessionRecord['endedAt']>;
        } => session.endedAt !== null,
      )
      .sort(
        (left, right) =>
          left.endedAt.epochMilliseconds - right.endedAt.epochMilliseconds,
      );
    const lastEndedSession = endedSessions.at(-1);

    result.set(key, {
      sessionCount: ordered.length,
      openSessionCount,
      incompleteSessionCount,
      firstClockIn: firstSession.startedAt.businessTime,
      lastClockOut: lastEndedSession?.endedAt.businessTime ?? null,
      grossMinutes: allDurationsKnown
        ? sumKnownMinutes(measurements.map((item) => item.grossMinutes))
        : null,
      pauseMinutes: allDurationsKnown
        ? sumKnownMinutes(measurements.map((item) => item.pauseMinutes))
        : null,
    });
  }

  return result;
}

export function emptyAttendanceActivity(): AttendanceDayActivityInput {
  return {
    sessionCount: 0,
    openSessionCount: 0,
    incompleteSessionCount: 0,
    firstClockIn: null,
    lastClockOut: null,
    grossMinutes: null,
    pauseMinutes: null,
  };
}

/**
 * Parse les formats effectivement rencontrés avec PostgreSQL INTERVAL :
 * `8 hours 30 minutes`, `08:30:00`, `1 day 02:30:00` et `PT8H30M`.
 */
export function parsePostgresIntervalMinutes(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 || normalized.startsWith('-')) return null;
  if (normalized === '0') return 0;

  const iso = /^p(?:(\d+)d)?(?:t(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?)?$/i.exec(
    normalized,
  );
  if (iso) {
    return totalMinutes(
      Number(iso[1] ?? 0),
      Number(iso[2] ?? 0),
      Number(iso[3] ?? 0),
      Number(iso[4] ?? 0),
    );
  }

  const clock = /^(?:(\d+)\s+days?\s+)?(\d{1,4}):([0-5]\d)(?::([0-5]\d(?:\.\d+)?))?$/.exec(
    normalized,
  );
  if (clock) {
    return totalMinutes(
      Number(clock[1] ?? 0),
      Number(clock[2] ?? 0),
      Number(clock[3] ?? 0),
      Number(clock[4] ?? 0),
    );
  }

  const tokenPattern = /(\d+(?:\.\d+)?)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)/g;
  let days = 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let matched = false;
  let remaining = normalized;

  for (const match of normalized.matchAll(tokenPattern)) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2] ?? '';
    if (unit.startsWith('day')) days += amount;
    else if (unit.startsWith('hour') || unit.startsWith('hr')) hours += amount;
    else if (unit.startsWith('min')) minutes += amount;
    else if (unit.startsWith('sec')) seconds += amount;
    remaining = remaining.replace(match[0], ' ');
  }

  if (!matched || remaining.trim().length > 0) return null;
  return totalMinutes(days, hours, minutes, seconds);
}

function measureSession(session: AttendanceSessionRecord): SessionMeasurement {
  if (session.status === 'OPEN') {
    return { open: true, incomplete: false, grossMinutes: null, pauseMinutes: null };
  }

  const endedAt = session.endedAt;
  if (!endedAt) {
    return { open: false, incomplete: true, grossMinutes: null, pauseMinutes: null };
  }

  const elapsedMinutes = durationBetween(
    session.startedAt.epochMilliseconds,
    endedAt.epochMilliseconds,
  );
  const pauseMeasurement = measurePauses(session.entries);
  const storedGross = parseNullableInterval(session.totalWorkDuration);
  const storedPause = parseNullableInterval(session.totalPauseDuration);
  const grossMinutes = storedGross ?? elapsedMinutes;
  const pauseMinutes = storedPause ?? pauseMeasurement.minutes;
  const invalidDuration =
    grossMinutes === null ||
    pauseMinutes === null ||
    pauseMinutes > grossMinutes;
  const incomplete =
    session.status === 'ABANDONED' ||
    session.status === 'UNKNOWN' ||
    pauseMeasurement.incomplete ||
    invalidDuration;

  return {
    open: false,
    incomplete,
    grossMinutes: incomplete ? null : grossMinutes,
    pauseMinutes: incomplete ? null : pauseMinutes,
  };
}

function measurePauses(entries: readonly AttendanceSessionEntryRecord[]): {
  minutes: number | null;
  incomplete: boolean;
} {
  const pauses = entries
    .filter((entry) => entry.kind === 'PAUSE_START' || entry.kind === 'PAUSE_END')
    .sort(
      (left, right) =>
        left.occurredAt.epochMilliseconds - right.occurredAt.epochMilliseconds,
    );

  if (pauses.length === 0) return { minutes: 0, incomplete: false };

  let activeStart: AttendanceSessionEntryRecord | null = null;
  let minutes = 0;

  for (const entry of pauses) {
    if (entry.kind === 'PAUSE_START') {
      if (activeStart !== null) return { minutes: null, incomplete: true };
      activeStart = entry;
      continue;
    }

    if (activeStart === null) return { minutes: null, incomplete: true };
    const pauseMinutes = durationBetween(
      activeStart.occurredAt.epochMilliseconds,
      entry.occurredAt.epochMilliseconds,
    );
    if (pauseMinutes === null) return { minutes: null, incomplete: true };
    minutes += pauseMinutes;
    activeStart = null;
  }

  return activeStart === null
    ? { minutes, incomplete: false }
    : { minutes: null, incomplete: true };
}

function parseNullableInterval(value: string | null): number | null {
  return value === null ? null : parsePostgresIntervalMinutes(value);
}

function durationBetween(start: number, end: number): number | null {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / MILLISECONDS_PER_MINUTE);
}

function totalMinutes(days: number, hours: number, minutes: number, seconds: number): number | null {
  const values = [days, hours, minutes, seconds];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  return Math.floor(days * 1_440 + hours * 60 + minutes + seconds / 60);
}

function sumKnownMinutes(values: readonly (number | null)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function validateSessionIdentity(session: AttendanceSessionRecord): void {
  if (!Number.isInteger(session.id) || session.id <= 0) {
    throw new AttendanceActivityInvariantError('Chaque session doit avoir un id positif');
  }
  if (!Number.isInteger(session.employeeId) || session.employeeId <= 0) {
    throw new AttendanceActivityInvariantError(
      `Session ${session.id} : employeeId doit être positif`,
    );
  }
  if (!Number.isFinite(session.startedAt.epochMilliseconds)) {
    throw new AttendanceActivityInvariantError(
      `Session ${session.id} : instant de début invalide`,
    );
  }
}
