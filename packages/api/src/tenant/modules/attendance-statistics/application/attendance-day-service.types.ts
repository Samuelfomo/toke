import type {
  AttendanceDay,
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
  BusinessDate,
  BusinessTime,
} from '../domain/attendance-day.types.js';
import type { BusinessNow } from './business-calendar.js';

export interface AttendanceEmployeeReference {
  id: number;
  guid: string;
}

export interface AttendancePeriod {
  startDate: BusinessDate;
  endDate: BusinessDate;
}

export interface AttendanceTimestamp {
  /** Date et heure déjà normalisées dans le fuseau métier. */
  businessDate: BusinessDate;
  businessTime: BusinessTime;

  /** Sert uniquement aux ordres et durées, jamais à l'affichage. */
  epochMilliseconds: number;
}

export type AttendanceSessionStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'CORRECTED'
  | 'ABANDONED'
  | 'UNKNOWN';

export type AttendanceEntryKind = 'PAUSE_START' | 'PAUSE_END' | 'OTHER';

export interface AttendanceSessionEntryRecord {
  id: number;
  kind: AttendanceEntryKind;
  occurredAt: AttendanceTimestamp;
}

/**
 * Session consolidée fournie par l'infrastructure. Une garde appartient à la
 * date métier de `startedAt`, même si `endedAt` tombe le lendemain.
 */
export interface AttendanceSessionRecord {
  id: number;
  employeeId: number;
  status: AttendanceSessionStatus;
  startedAt: AttendanceTimestamp;
  endedAt: AttendanceTimestamp | null;
  totalWorkDuration: string | null;
  totalPauseDuration: string | null;
  entries: readonly AttendanceSessionEntryRecord[];
}

export interface AttendanceScheduleRecord {
  employeeId: number;
  date: BusinessDate;
  schedule: AttendanceDaySchedule;
}

export interface AttendanceSessionRepository {
  listForPeriod(input: {
    employeeIds: readonly number[];
    period: AttendancePeriod;
    businessTimezone: string;
  }): Promise<readonly AttendanceSessionRecord[]>;
}

export interface AttendanceScheduleRepository {
  resolveForPeriod(input: {
    employees: readonly AttendanceEmployeeReference[];
    dates: readonly BusinessDate[];
    currentBusinessDate: BusinessDate;
  }): Promise<readonly AttendanceScheduleRecord[]>;
}

export interface BuildAttendanceDaysInput {
  employees: readonly AttendanceEmployeeReference[];
  period: AttendancePeriod;
  now: BusinessNow;
  businessTimezone: string;
}

export interface AttendanceDayBuildResult {
  days: readonly AttendanceDay[];
}

export type AttendanceActivityByEmployeeDate = ReadonlyMap<
  string,
  AttendanceDayActivityInput
>;
