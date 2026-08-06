import type {
  AttendanceEntryKind,
  AttendancePeriod,
  AttendanceSessionRecord,
  AttendanceSessionRepository,
  AttendanceSessionStatus,
} from '../../application/attendance-day-service.types.js';
import { LegacyBusinessTimeFormatter } from './legacy-business-time.js';

export interface LegacyWorkSessionRow {
  id: number;
  employeeId: number;
  status: string | null;
  startedAt: Date;
  endedAt: Date | null;
  totalWorkDuration: string | null;
  totalPauseDuration: string | null;
}

export interface LegacyTimeEntryRow {
  id: number;
  sessionId: number;
  type: string;
  status: string | null;
  clockedAt: Date;
}

export interface LegacyAttendanceSessionDataSource {
  loadWorkSessions(input: {
    employeeIds: readonly number[];
    start: Date;
    endExclusive: Date;
  }): Promise<readonly LegacyWorkSessionRow[]>;

  loadTimeEntriesBySessionIds(
    sessionIds: readonly number[],
  ): Promise<readonly LegacyTimeEntryRow[]>;
}

export class LegacyAttendanceSessionRepository implements AttendanceSessionRepository {
  constructor(private readonly dataSource: LegacyAttendanceSessionDataSource) {}

  async listForPeriod(input: {
    employeeIds: readonly number[];
    period: AttendancePeriod;
    businessTimezone: string;
  }): Promise<readonly AttendanceSessionRecord[]> {
    if (input.employeeIds.length === 0) return [];

    const formatter = new LegacyBusinessTimeFormatter(input.businessTimezone);
    const range = formatter.toWideUtcQueryRange(input.period);
    const sourceSessions = await this.dataSource.loadWorkSessions({
      employeeIds: input.employeeIds,
      start: range.start,
      endExclusive: range.endExclusive,
    });
    const sessionsInBusinessPeriod = sourceSessions.filter((session) => {
      const date = formatter.toBusinessDate(session.startedAt);
      return date >= input.period.startDate && date <= input.period.endDate;
    });
    const sessionIds = sessionsInBusinessPeriod.map((session) => session.id);
    const sourceEntries =
      sessionIds.length === 0
        ? []
        : await this.dataSource.loadTimeEntriesBySessionIds(sessionIds);
    const entriesBySession = groupUsableEntries(sourceEntries);

    return sessionsInBusinessPeriod.map((session) => ({
      id: session.id,
      employeeId: session.employeeId,
      status: normalizeSessionStatus(session.status),
      startedAt: formatter.toAttendanceTimestamp(session.startedAt),
      endedAt:
        session.endedAt === null
          ? null
          : formatter.toAttendanceTimestamp(session.endedAt),
      totalWorkDuration: session.totalWorkDuration,
      totalPauseDuration: session.totalPauseDuration,
      entries: (entriesBySession.get(session.id) ?? []).map((entry) => ({
        id: entry.id,
        kind: normalizeEntryKind(entry.type),
        occurredAt: formatter.toAttendanceTimestamp(entry.clockedAt),
      })),
    }));
  }
}

function groupUsableEntries(
  entries: readonly LegacyTimeEntryRow[],
): ReadonlyMap<number, LegacyTimeEntryRow[]> {
  const grouped = new Map<number, LegacyTimeEntryRow[]>();

  for (const entry of entries) {
    const status = normalizeToken(entry.status);
    if (status === 'REJECTED' || status === 'DRAFT') continue;

    const group = grouped.get(entry.sessionId) ?? [];
    group.push(entry);
    grouped.set(entry.sessionId, group);
  }

  return grouped;
}

function normalizeSessionStatus(value: string | null): AttendanceSessionStatus {
  const normalized = normalizeToken(value);
  if (
    normalized === 'OPEN' ||
    normalized === 'CLOSED' ||
    normalized === 'CORRECTED' ||
    normalized === 'ABANDONED'
  ) {
    return normalized;
  }
  return 'UNKNOWN';
}

function normalizeEntryKind(value: string): AttendanceEntryKind {
  const normalized = normalizeToken(value);
  if (normalized === 'PAUSE_START' || normalized === 'PAUSE_END') {
    return normalized;
  }
  return 'OTHER';
}

function normalizeToken(value: string | null): string {
  return (value ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
}
