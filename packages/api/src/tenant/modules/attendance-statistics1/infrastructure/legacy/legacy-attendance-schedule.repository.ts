import type {
  AttendanceEmployeeReference,
  AttendanceScheduleRecord,
  AttendanceScheduleRepository,
} from '../../application/attendance-day-service.types.js';
import { getWeekdayKey } from '../../application/business-calendar.js';
import type {
  AttendanceDaySchedule,
  BusinessDate,
  ExpectedWorkBlock,
  ScheduleSource,
} from '../../domain/attendance-day.types.js';

export interface LegacyTemplateSnapshot {
  definition?: unknown;
  [key: string]: unknown;
}

export interface LegacyDirectScheduleAssignment {
  id: number;
  relatedType: 'USER' | 'GROUP';
  relatedGuid: string;
  active: boolean;
  startDate: BusinessDate;
  endDate: BusinessDate | null;
  version: number;
  updatedBusinessDate: BusinessDate | null;
  sortEpochMilliseconds: number;
  snapshot: LegacyTemplateSnapshot;
}

export interface LegacyRotationAssignment {
  id: number;
  relatedType: 'USER' | 'GROUP';
  relatedGuid: string;
  active: boolean;
  assignedDate: BusinessDate;
  sortEpochMilliseconds: number;
  rotationGroupId: number;
  offset: number;
}

export interface LegacyGroupMembership {
  employeeId: number;
  groupGuid: string;
  joinedDate: BusinessDate;
  active: boolean;
}

export interface LegacyRotationGroup {
  id: number;
  active: boolean;
  slots: readonly {
    position: number;
    snapshot: LegacyTemplateSnapshot;
  }[];
}

export interface LegacyScheduleDataset {
  directAssignments: readonly LegacyDirectScheduleAssignment[];
  rotationAssignments: readonly LegacyRotationAssignment[];
  memberships: readonly LegacyGroupMembership[];
  rotationGroups: readonly LegacyRotationGroup[];
}

export interface LegacyAttendanceScheduleDataSource {
  loadDataset(
    employees: readonly AttendanceEmployeeReference[],
  ): Promise<LegacyScheduleDataset>;
}

type Candidate =
  | { type: 'DIRECT'; value: LegacyDirectScheduleAssignment }
  | { type: 'ROTATION'; value: LegacyRotationAssignment };

/**
 * Résout uniquement ce que les données actuelles peuvent prouver. Une rotation
 * passée, une affectation modifiée après la date ou une appartenance historique
 * ambiguë reste UNDETERMINED en attendant les journaux d'historique.
 */
export class LegacyAttendanceScheduleRepository
  implements AttendanceScheduleRepository
{
  constructor(private readonly dataSource: LegacyAttendanceScheduleDataSource) {}

  async resolveForPeriod(input: {
    employees: readonly AttendanceEmployeeReference[];
    dates: readonly BusinessDate[];
    currentBusinessDate: BusinessDate;
  }): Promise<readonly AttendanceScheduleRecord[]> {
    if (input.employees.length === 0 || input.dates.length === 0) return [];

    const dataset = await this.dataSource.loadDataset(input.employees);
    return input.employees.flatMap((employee) =>
      input.dates.map((date) => ({
        employeeId: employee.id,
        date,
        schedule: resolveScheduleForDate(
          dataset,
          employee,
          date,
          input.currentBusinessDate,
        ),
      })),
    );
  }
}

function resolveScheduleForDate(
  dataset: LegacyScheduleDataset,
  employee: AttendanceEmployeeReference,
  date: BusinessDate,
  currentBusinessDate: BusinessDate,
): AttendanceDaySchedule {
  const memberships = dataset.memberships.filter(
    (membership) =>
      membership.employeeId === employee.id && membership.joinedDate <= date,
  );
  const activeGroupGuids = new Set(
    memberships
      .filter((membership) => membership.active)
      .map((membership) => membership.groupGuid),
  );
  const uncertainHistoricalGroupGuids = new Set(
    memberships
      .filter((membership) => !membership.active && date < currentBusinessDate)
      .map((membership) => membership.groupGuid),
  );

  const directCandidates = dataset.directAssignments
    .filter(
      (assignment) =>
        assignment.active &&
        coversDate(assignment, date) &&
        appliesTo(
          assignment.relatedType,
          assignment.relatedGuid,
          employee.guid,
          activeGroupGuids,
        ),
    )
    .map<Candidate>((value) => ({ type: 'DIRECT', value }));
  const rotationCandidates = dataset.rotationAssignments
    .filter(
      (assignment) =>
        assignment.active &&
        assignment.assignedDate <= date &&
        appliesTo(
          assignment.relatedType,
          assignment.relatedGuid,
          employee.guid,
          activeGroupGuids,
        ),
    )
    .map<Candidate>((value) => ({ type: 'ROTATION', value }));
  const candidates = [...directCandidates, ...rotationCandidates].sort(
    (left, right) => sortEpoch(right) - sortEpoch(left),
  );

  if (candidates.length === 0) {
    return hasPotentialHistoricalAssignment(
      dataset,
      employee,
      date,
      uncertainHistoricalGroupGuids,
    )
      ? unresolved('HISTORICAL_SCHEDULE_UNAVAILABLE')
      : unresolved('MISSING_SCHEDULE');
  }

  const winner = candidates[0];
  const second = candidates[1];
  if (!winner) return unresolved('MISSING_SCHEDULE');
  if (second && sortEpoch(second) === sortEpoch(winner)) {
    return unresolved('AMBIGUOUS_SCHEDULE');
  }

  if (winner.type === 'DIRECT') {
    const assignment = winner.value;
    if (
      assignment.version > 1 &&
      assignment.updatedBusinessDate !== null &&
      date < assignment.updatedBusinessDate
    ) {
      return unresolved('HISTORICAL_SCHEDULE_UNAVAILABLE', 'DIRECT');
    }
    return scheduleFromSnapshot(assignment.snapshot, date, 'DIRECT');
  }

  if (date !== currentBusinessDate) {
    return unresolved('HISTORICAL_SCHEDULE_UNAVAILABLE', 'ROTATION');
  }

  const rotationGroup = dataset.rotationGroups.find(
    (group) => group.id === winner.value.rotationGroupId,
  );
  if (!rotationGroup || !rotationGroup.active || rotationGroup.slots.length === 0) {
    return unresolved('INVALID_SCHEDULE', 'ROTATION');
  }

  const position = positiveModulo(winner.value.offset, rotationGroup.slots.length);
  const slot = rotationGroup.slots.find((item) => item.position === position);
  if (!slot) return unresolved('INVALID_SCHEDULE', 'ROTATION');
  return scheduleFromSnapshot(slot.snapshot, date, 'ROTATION');
}

function scheduleFromSnapshot(
  snapshot: LegacyTemplateSnapshot,
  date: BusinessDate,
  source: ScheduleSource,
): AttendanceDaySchedule {
  const definition = snapshot.definition;
  if (!isPlainRecord(definition)) return unresolved('INVALID_SCHEDULE', source);

  const weekday = getWeekdayKey(date);
  if (!Object.prototype.hasOwnProperty.call(definition, weekday)) {
    return unresolved('INVALID_SCHEDULE', source);
  }

  const dayDefinition = definition[weekday];
  if (dayDefinition === null) return restDay(source);
  if (!Array.isArray(dayDefinition)) return unresolved('INVALID_SCHEDULE', source);
  if (dayDefinition.length === 0) return restDay(source);

  const expectedBlocks: ExpectedWorkBlock[] = [];
  for (const rawBlock of dayDefinition) {
    if (!isPlainRecord(rawBlock)) return unresolved('INVALID_SCHEDULE', source);
    const work = rawBlock.work;
    const tolerance = rawBlock.tolerance;
    if (
      !Array.isArray(work) ||
      work.length !== 2 ||
      typeof work[0] !== 'string' ||
      typeof work[1] !== 'string' ||
      !Number.isInteger(tolerance) ||
      Number(tolerance) < 0
    ) {
      return unresolved('INVALID_SCHEDULE', source);
    }

    expectedBlocks.push({
      startTime: work[0],
      endTime: work[1],
      toleranceMinutes: Number(tolerance),
    });
  }

  return { state: 'WORK_DAY', source, expectedBlocks };
}

function hasPotentialHistoricalAssignment(
  dataset: LegacyScheduleDataset,
  employee: AttendanceEmployeeReference,
  date: BusinessDate,
  uncertainGroupGuids: ReadonlySet<string>,
): boolean {
  const inactiveDirect = dataset.directAssignments.some(
    (assignment) =>
      !assignment.active &&
      assignment.updatedBusinessDate !== null &&
      date < assignment.updatedBusinessDate &&
      coversDate(assignment, date) &&
      (assignment.relatedGuid === employee.guid ||
        uncertainGroupGuids.has(assignment.relatedGuid)),
  );
  const inactiveRotation = dataset.rotationAssignments.some(
    (assignment) =>
      !assignment.active &&
      assignment.assignedDate <= date &&
      (assignment.relatedGuid === employee.guid ||
        uncertainGroupGuids.has(assignment.relatedGuid)),
  );
  const uncertainGroupAssignment =
    dataset.directAssignments.some(
      (assignment) =>
        assignment.active &&
        coversDate(assignment, date) &&
        uncertainGroupGuids.has(assignment.relatedGuid),
    ) ||
    dataset.rotationAssignments.some(
      (assignment) =>
        assignment.active &&
        assignment.assignedDate <= date &&
        uncertainGroupGuids.has(assignment.relatedGuid),
    );

  return inactiveDirect || inactiveRotation || uncertainGroupAssignment;
}

function coversDate(
  assignment: LegacyDirectScheduleAssignment,
  date: BusinessDate,
): boolean {
  return assignment.startDate <= date &&
    (assignment.endDate === null || assignment.endDate >= date);
}

function appliesTo(
  relatedType: 'USER' | 'GROUP',
  relatedGuid: string,
  employeeGuid: string,
  activeGroupGuids: ReadonlySet<string>,
): boolean {
  return relatedType === 'USER'
    ? relatedGuid === employeeGuid
    : activeGroupGuids.has(relatedGuid);
}

function sortEpoch(candidate: Candidate): number {
  return candidate.value.sortEpochMilliseconds;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function restDay(source: ScheduleSource): AttendanceDaySchedule {
  return { state: 'REST_DAY', source, expectedBlocks: [] };
}

function unresolved(
  issue:
    | 'MISSING_SCHEDULE'
    | 'INVALID_SCHEDULE'
    | 'HISTORICAL_SCHEDULE_UNAVAILABLE'
    | 'AMBIGUOUS_SCHEDULE',
  source: ScheduleSource | null = null,
): AttendanceDaySchedule {
  return { state: 'UNRESOLVED', source, expectedBlocks: [], issue };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
