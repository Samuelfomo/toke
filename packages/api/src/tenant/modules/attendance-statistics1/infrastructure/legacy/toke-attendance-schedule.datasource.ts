import Groups from '../../../../class/Groups.js';
import RotationAssignment from '../../../../class/RotationAssignments.js';
import RotationGroup from '../../../../class/RotationGroups.js';
import ScheduleAssignments from '../../../../class/ScheduleAssignments.js';
import type { AttendanceEmployeeReference } from '../../application/attendance-day-service.types.js';
import { LegacyBusinessTimeFormatter } from './legacy-business-time.js';
import type {
  LegacyAttendanceScheduleDataSource,
  LegacyDirectScheduleAssignment,
  LegacyGroupMembership,
  LegacyRotationAssignment,
  LegacyRotationGroup,
  LegacyScheduleDataset,
} from './legacy-attendance-schedule.repository.js';

export class TokeAttendanceScheduleDataSource
  implements LegacyAttendanceScheduleDataSource
{
  constructor(private readonly businessTimezone: string) {}

  async loadDataset(
    employees: readonly AttendanceEmployeeReference[],
  ): Promise<LegacyScheduleDataset> {
    const formatter = new LegacyBusinessTimeFormatter(this.businessTimezone);
    const employeeIds = new Set(employees.map((employee) => employee.id));
    const employeeGuids = new Set(employees.map((employee) => employee.guid));
    const [groups, schedules, rotations] = await Promise.all([
      Groups._list({}, {}, false),
      ScheduleAssignments._list(),
      RotationAssignment._list(),
    ]);

    const memberships: LegacyGroupMembership[] = [];
    const relevantGroupGuids = new Set<string>();

    for (const group of groups ?? []) {
      const groupGuid = group.getGuid();
      if (!groupGuid) continue;

      for (const member of group.getMembers()) {
        if (!employeeIds.has(member.user)) continue;
        const joinedDate = normalizeDateValue(member.joined_at, formatter);
        memberships.push({
          employeeId: member.user,
          groupGuid,
          joinedDate,
          active: member.active !== false,
        });
        relevantGroupGuids.add(groupGuid);
      }
    }

    const relatedIsRelevant = (type: string | undefined, guid: string | undefined): boolean =>
      Boolean(
        guid &&
          ((type === 'user' && employeeGuids.has(guid)) ||
            (type === 'group' && relevantGroupGuids.has(guid))),
      );

    const directAssignments: LegacyDirectScheduleAssignment[] = (schedules ?? [])
      .filter((assignment) =>
        relatedIsRelevant(assignment.getFamily(), assignment.getRelated()),
      )
      .map((assignment) => {
        const id = assignment.getId();
        const relatedGuid = assignment.getRelated();
        const relatedType = normalizeRelatedType(assignment.getFamily());
        const startDate = assignment.getStartDate();
        if (!id || !relatedGuid || !startDate) {
          throw new Error('ScheduleAssignment incomplète pour les statistiques');
        }

        const createdAt = assignment.getCreatedAt();
        const updatedAt = assignment.getUpdatedAt();
        return {
          id,
          relatedType,
          relatedGuid,
          active: assignment.isActive() === true,
          startDate,
          endDate: assignment.getEndDate() ?? null,
          version: assignment.getVersion() ?? 1,
          updatedBusinessDate: updatedAt ? formatter.toBusinessDate(updatedAt) : null,
          sortEpochMilliseconds:
            createdAt?.getTime() ?? Date.parse(`${startDate}T00:00:00.000Z`),
          snapshot: assignment.getSessionTemplate() ?? {},
        };
      });

    const rotationAssignments: LegacyRotationAssignment[] = (rotations ?? [])
      .filter((assignment) =>
        relatedIsRelevant(assignment.getFamily(), assignment.getRelated()),
      )
      .map((assignment) => {
        const id = assignment.getId();
        const relatedGuid = assignment.getRelated();
        const relatedType = normalizeRelatedType(assignment.getFamily());
        const assignedAt = assignment.getAssignedAt();
        const rotationGroupId = assignment.getRotationGroup();
        if (!id || !relatedGuid || !assignedAt || !rotationGroupId) {
          throw new Error('RotationAssignment incomplète pour les statistiques');
        }

        return {
          id,
          relatedType,
          relatedGuid,
          active: assignment.isActive(),
          assignedDate: formatter.toBusinessDate(assignedAt),
          sortEpochMilliseconds:
            assignment.getCreatedAt()?.getTime() ?? assignedAt.getTime(),
          rotationGroupId,
          offset: assignment.getOffset() ?? 0,
        };
      });

    const rotationGroupIds = [
      ...new Set(rotationAssignments.map((assignment) => assignment.rotationGroupId)),
    ];
    const rotationGroups: LegacyRotationGroup[] = [];

    for (const rotationGroupId of rotationGroupIds) {
      const group = await RotationGroup._load(rotationGroupId);
      if (!group) continue;
      const slots = await group.getCycleSlots();
      rotationGroups.push({
        id: rotationGroupId,
        active: group.isActive() === true,
        slots: slots.flatMap((slot) => {
          const position = slot.getPosition();
          const snapshot = slot.getTemplateSnapshot();
          return position === undefined || !snapshot
            ? []
            : [{ position, snapshot }];
        }),
      });
    }

    return { directAssignments, rotationAssignments, memberships, rotationGroups };
  }
}

function normalizeRelatedType(value: string | undefined): 'USER' | 'GROUP' {
  if (value === 'user') return 'USER';
  if (value === 'group') return 'GROUP';
  throw new Error(`Famille d'affectation inconnue : ${value ?? 'undefined'}`);
}

function normalizeDateValue(
  value: Date | string | undefined,
  formatter: LegacyBusinessTimeFormatter,
): string {
  if (value === undefined) {
    throw new Error("Date d'adhésion au groupe absente");
  }
  if (value instanceof Date) return formatter.toBusinessDate(value);
  const datePrefix = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePrefix)) return datePrefix;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Date d'adhésion au groupe invalide : ${value}`);
  }
  return formatter.toBusinessDate(parsed);
}
