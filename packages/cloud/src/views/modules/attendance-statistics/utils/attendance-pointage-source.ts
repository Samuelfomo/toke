import type {
  AttendanceIssue,
  AttendanceSourceContext,
  BusinessDate,
} from '../types/attendance-statistics.types.js';

export interface AttendancePointageSourceTarget {
  employeeGuid: string;
  employeeName: string | null;
  date: BusinessDate;
  issue: AttendanceIssue | null;
  entryGuid: string | null;
  sessionGuid: string | null;
  sourceContext: AttendanceSourceContext;
  /** Query prête à être transmise à la route réelle de gestion des pointages. */
  query: Record<string, string>;
}

export interface BuildAttendancePointageSourceTargetInput {
  employeeGuid: string;
  employeeName?: string | null;
  date: BusinessDate;
  issue?: AttendanceIssue | null;
  sourceContext: AttendanceSourceContext;
}

export function hasAttendancePointageSource(
  sourceContext: AttendanceSourceContext | null | undefined,
): boolean {
  if (!sourceContext) return false;
  return sourceContext.clockInEntryGuids.length > 0 || sourceContext.sessionGuids.length > 0;
}

export function buildAttendancePointageSourceTarget(
  input: BuildAttendancePointageSourceTargetInput,
): AttendancePointageSourceTarget {
  const entryGuid = input.sourceContext.clockInEntryGuids[0] ?? null;
  const sessionGuid = input.sourceContext.sessionGuids[0] ?? null;

  const query: Record<string, string> = {
    employee: input.employeeGuid,
    start_date: input.date,
    end_date: input.date,
  };

  if (entryGuid) query.entry = entryGuid;
  if (sessionGuid) query.session = sessionGuid;

  return {
    employeeGuid: input.employeeGuid,
    employeeName: input.employeeName?.trim() || null,
    date: input.date,
    issue: input.issue ?? null,
    entryGuid,
    sessionGuid,
    sourceContext: input.sourceContext,
    query,
  };
}
