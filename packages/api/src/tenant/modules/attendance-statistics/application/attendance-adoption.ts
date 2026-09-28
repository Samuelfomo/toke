import type {
  AttendanceAdoptionSession,
  AttendanceDay,
  BusinessDate,
  ExpectedWorkBlock,
} from '../domain/attendance-day.types.js';

export type AdoptionState = 'COMPLETE' | 'INCOMPLETE' | 'UNDETERMINED' | 'NOT_ELIGIBLE' | 'CONTINUATION';

export interface AdoptionMetrics {
  coveredFinalizedOperations: number;
  completeOperations: number;
  incompleteOperations: number;
  undeterminedOperations: number;
  evaluatedOperations: number;
  adoptionRate: number | null;
}

export interface AdoptionAssessment {
  employeeId: number;
  date: BusinessDate;
  operationId: string;
  state: AdoptionState;
  sessionGuid: string | null;
}

type Operation = { employeeId: number; id: string; days: AttendanceDay[] };

const covered = (day: AttendanceDay) => day.result.rateEligible &&
  (day.result.status === 'PRESENT' || day.result.status === 'LATE');

/** Évalue des processus de pointage, sans changer la classification des journées. */
export function assessAttendanceAdoption(days: readonly AttendanceDay[]): AdoptionAssessment[] {
  const operations = new Map<string, Operation>();
  for (const day of days) {
    if (day.schedule.state !== 'WORK_DAY') continue;
    const id = day.schedule.attendanceOperation?.id ??
      `${day.schedule.assignmentGuid ?? 'schedule'}:${day.date}`;
    const key = `${day.employeeId}:${id}`;
    const operation = operations.get(key) ?? { employeeId: day.employeeId, id, days: [] };
    operation.days.push(day);
    operations.set(key, operation);
  }

  const candidates = new Map<string, AttendanceAdoptionSession[]>();
  const claims = new Map<string, number>();
  for (const [key, operation] of operations) {
    const ordered = operation.days.sort((a, b) => a.date.localeCompare(b.date));
    const guard = ordered.some((day) => day.schedule.state === 'WORK_DAY' &&
      day.schedule.attendanceOperation?.kind === 'GUARD');
    if (guard && (ordered.length !== 2 ||
      !ordered.some((day) => day.schedule.state === 'WORK_DAY' &&
        day.schedule.attendanceOperation?.role === 'START') ||
      !ordered.some((day) => day.schedule.state === 'WORK_DAY' &&
        day.schedule.attendanceOperation?.role === 'CONTINUATION'))) continue;
    if (!ordered.every(covered)) continue;

    const sessions = new Map<string, AttendanceAdoptionSession>();
    for (const day of ordered) for (const session of day.activity.adoptionSessions ?? []) {
      sessions.set(session.sessionGuid, session);
    }
    const complete = [...sessions.values()].filter((session) =>
      validPair(session) && ordered.every((day) => overlapsExpectedDay(session, day)));
    candidates.set(key, complete);
    for (const session of complete) {
      const claim = `${operation.employeeId}:${session.sessionGuid}`;
      claims.set(claim, (claims.get(claim) ?? 0) + 1);
    }
  }

  const assessments: AdoptionAssessment[] = [];
  for (const [key, operation] of operations) {
    const ordered = operation.days;
    const primary = ordered.find((day) => day.schedule.state === 'WORK_DAY' &&
      day.schedule.attendanceOperation?.role === 'START') ?? ordered[0]!;
    const guard = ordered.some((day) => day.schedule.state === 'WORK_DAY' &&
      day.schedule.attendanceOperation?.kind === 'GUARD');
    const validGuard = !guard || (ordered.length === 2 &&
      ordered.some((day) => day.schedule.state === 'WORK_DAY' &&
        day.schedule.attendanceOperation?.role === 'START') &&
      ordered.some((day) => day.schedule.state === 'WORK_DAY' &&
        day.schedule.attendanceOperation?.role === 'CONTINUATION'));
    const coverage = ordered.every(covered);
    const choices = candidates.get(key) ?? [];
    const shared = choices.some((session) =>
      (claims.get(`${operation.employeeId}:${session.sessionGuid}`) ?? 0) > 1);
    const state: AdoptionState = !validGuard ? (ordered.some(covered) ? 'UNDETERMINED' : 'NOT_ELIGIBLE')
      : !coverage ? 'NOT_ELIGIBLE'
      : shared || choices.length > 1 ? 'UNDETERMINED'
      : choices.length === 1 ? 'COMPLETE' : 'INCOMPLETE';

    assessments.push({
      employeeId: operation.employeeId, date: primary.date, operationId: operation.id,
      state, sessionGuid: state === 'COMPLETE' ? choices[0]!.sessionGuid : null,
    });
    for (const day of ordered) if (day !== primary) assessments.push({
      employeeId: operation.employeeId, date: day.date, operationId: operation.id,
      state: 'CONTINUATION', sessionGuid: null,
    });
  }
  return assessments;
}

export function calculateAdoptionMetrics(assessments: readonly AdoptionAssessment[]): AdoptionMetrics {
  const completeOperations = assessments.filter((item) => item.state === 'COMPLETE').length;
  const incompleteOperations = assessments.filter((item) => item.state === 'INCOMPLETE').length;
  const undeterminedOperations = assessments.filter((item) => item.state === 'UNDETERMINED').length;
  const evaluatedOperations = completeOperations + incompleteOperations;
  return {
    coveredFinalizedOperations: evaluatedOperations + undeterminedOperations,
    completeOperations, incompleteOperations, undeterminedOperations, evaluatedOperations,
    adoptionRate: evaluatedOperations > 0
      ? Math.round((completeOperations / evaluatedOperations) * 1000) / 10 : null,
  };
}

function validPair(session: AttendanceAdoptionSession): boolean {
  return session.clockInGuids.length > 0 && session.clockOutGuids.length > 0 &&
    session.clockInAt !== null && session.clockOutAt !== null &&
    session.clockOutAt > session.clockInAt && session.endDate !== null;
}

function overlapsExpectedDay(session: AttendanceAdoptionSession, day: AttendanceDay): boolean {
  if (day.schedule.state !== 'WORK_DAY' || session.endDate === null ||
      session.endTime === null) return false;
  const start = `${session.startDate}T${session.startTime}`;
  const end = `${session.endDate}T${session.endTime}`;
  return day.schedule.expectedBlocks.some((block: ExpectedWorkBlock) =>
    start < `${day.date}T${block.endTime}` && end > `${day.date}T${block.startTime}`);
}
