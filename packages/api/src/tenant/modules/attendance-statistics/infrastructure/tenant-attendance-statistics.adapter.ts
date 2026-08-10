import { TimezoneConfigUtils } from '@toke/shared';
import { Op } from 'sequelize';

import User from '../../../class/User.js';
import OrgHierarchy from '../../../class/OrgHierarchy.js';
import Site from '../../../class/Site.js';
import WorkSessions from '../../../class/WorkSessions.js';
import ScheduleResolutionService from '../../../../tools/schedule.resolution.service.js';
import type {
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
  BusinessDate,
  ScheduleSource,
} from '../domain/attendance-day.types.js';
import {
  attendanceActivityKey,
  type AttendanceActivityQuery,
  type AttendanceBusinessNow,
  type AttendanceStatisticsPort,
  type ManagerTeamScope,
  type ResolvedAttendanceSite,
} from '../application/attendance-statistics.ports.js';

import { parsePostgresIntervalMinutes } from './postgres-interval.js';

interface SessionSnapshot {
  employeeId: number;
  date: BusinessDate;
  startAt: Date;
  endAt: Date | null;
  open: boolean;
  incomplete: boolean;
  grossMinutes: number | null;
  pauseMinutes: number | null;
}

/**
 * Adaptateur concret vers les classes métier existantes du tenant.
 * Il est le seul fichier du module qui connaît User, OrgHierarchy,
 * WorkSessions, Site, Sequelize et ScheduleResolutionService.
 */
export class TenantAttendanceStatisticsAdapter implements AttendanceStatisticsPort {
  async loadCurrentManagerTeam(managerGuid: string): Promise<ManagerTeamScope | null> {
    const manager = await User._load(managerGuid, true);
    const managerId = manager?.getId();
    if (!manager || !managerId) return null;

    // Décision validée : périmètre = membres actuels de l'équipe du manager.
    // includeSudTeam n'est pas activé : les sous-équipes ne sont pas ajoutées.
    const team = await OrgHierarchy.getAllTeamMembers(managerId);
    const uniqueEmployees = new Map<number, User>();

    for (const employee of team.all_employees_flat) {
      const id = employee.getId();
      const guid = employee.getGuid();
      if (!id || !guid || employee.isActive() === false) continue;
      uniqueEmployees.set(id, employee);
    }

    return {
      managerId,
      managerGuid: manager.getGuid() ?? managerGuid,
      employees: [...uniqueEmployees.values()]
        .map((employee) => ({
          id: employee.getId()!,
          guid: employee.getGuid()!,
          name: employee.getFullName(),
        }))
        .sort(
          (left, right) =>
            left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }) ||
            left.guid.localeCompare(right.guid),
        ),
    };
  }

  async resolveSite(siteGuid: string): Promise<ResolvedAttendanceSite | null> {
    const site = await Site._load(siteGuid, true);
    const id = site?.getId();
    const guid = site?.getGuid();
    return site && id && guid ? { id, guid } : null;
  }

  async loadActivities(
    query: AttendanceActivityQuery,
  ): Promise<ReadonlyMap<string, AttendanceDayActivityInput>> {
    if (query.employeeIds.length === 0) return new Map();

    const conditions: Record<string, unknown> = {
      user: { [Op.in]: [...query.employeeIds] },
      session_start_at: {
        [Op.between]: [
          createBusinessBoundary(query.startDate, false),
          createBusinessBoundary(query.endDate, true),
        ],
      },
    };
    if (query.siteId !== null) conditions.site = query.siteId;

    const sessions = (await WorkSessions._list(conditions)) ?? [];
    const snapshots = await mapWithConcurrency(
      sessions,
      8,
      async (session): Promise<SessionSnapshot | null> => {
        const employeeId = session.getUser();
        const startAt = session.getSessionStartAt();
        if (!employeeId || !startAt) return null;

        const endAt = session.getSessionEndAt() ?? null;
        const normalizedStatus = String(session.getSessionStatus() ?? '').toLowerCase();
        const open = normalizedStatus === 'open';
        const incomplete = !open && endAt === null;

        let pauseMinutes: number | null = null;
        try {
          const rawPauseMinutes = await session.getTotalPauseTime();

          if (rawPauseMinutes === null || rawPauseMinutes === undefined) {
            pauseMinutes = null;
          } else if (!Number.isFinite(rawPauseMinutes)) {
            console.warn('[AttendanceStatistics] Invalid pause duration', {
              sessionId: session.getId(),
              rawPauseMinutes,
            });

            pauseMinutes = null;
          } else if (rawPauseMinutes < 0) {
            console.warn('[AttendanceStatistics] Negative pause duration normalized', {
              sessionId: session.getId(),
              sessionGuid: session.getGuid(),
              rawPauseMinutes,
            });

            pauseMinutes = null;
          } else {
            pauseMinutes = rawPauseMinutes;
          }

          // pauseMinutes = await session.getTotalPauseTime();
          //
          // console.log('[AttendanceStatistics] pause:', {
          //   sessionId: session.getId(),
          //   sessionGuid: session.getGuid(),
          //   employeeId,
          //   startAt,
          //   endAt,
          //   status: normalizedStatus,
          //   open,
          //   incomplete,
          //   pauseMinutes,
          // });
        } catch (error) {
          console.error(
            `[AttendanceStatistics] Pause illisible pour session ${session.getGuid() ?? session.getId()}`,
            error,
          );
        }

        return {
          employeeId,
          date: formatBusinessDate(startAt),
          startAt,
          endAt,
          open,
          incomplete,
          grossMinutes: parsePostgresIntervalMinutes(session.getTotalWorkDuration()),
          pauseMinutes,
        };
      },
    );

    const grouped = new Map<string, SessionSnapshot[]>();
    for (const snapshot of snapshots) {
      if (!snapshot) continue;
      const key = attendanceActivityKey(snapshot.employeeId, snapshot.date);
      const group = grouped.get(key) ?? [];
      group.push(snapshot);
      grouped.set(key, group);
    }

    const result = new Map<string, AttendanceDayActivityInput>();
    for (const [key, group] of grouped.entries()) {
      group.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      const knownGross = group.every((session) => session.grossMinutes !== null);
      const knownPause = group.every((session) => session.pauseMinutes !== null);
      const lastEnd = group
        .map((session) => session.endAt)
        .filter((value): value is Date => value !== null)
        .sort((a, b) => a.getTime() - b.getTime())
        .at(-1);

      result.set(key, {
        sessionCount: group.length,
        openSessionCount: group.filter((session) => session.open).length,
        incompleteSessionCount: group.filter((session) => session.incomplete).length,
        firstClockIn: formatBusinessTime(group[0]!.startAt),
        lastClockOut: lastEnd ? formatBusinessTime(lastEnd) : null,
        grossMinutes: knownGross
          ? group.reduce((total, session) => total + session.grossMinutes!, 0)
          : null,
        pauseMinutes: knownPause
          ? group.reduce((total, session) => total + session.pauseMinutes!, 0)
          : null,
      });
    }

    return result;
  }

  async resolveSchedule(employeeId: number, date: BusinessDate): Promise<AttendanceDaySchedule> {
    const result = await ScheduleResolutionService.getApplicableSchedule(
      employeeId,
      createBusinessBoundary(date, false, 12),
    );

    const schedule = result.success ? result.applicable_schedule : null;
    if (!schedule) {
      return {
        state: 'UNRESOLVED',
        source: null,
        expectedBlocks: [],
        issue: 'MISSING_SCHEDULE',
      };
    }

    const source = mapScheduleSource(schedule.source);
    if (!schedule.is_work_day) {
      return { state: 'REST_DAY', source, expectedBlocks: [] };
    }

    return {
      state: 'WORK_DAY',
      source,
      expectedBlocks: schedule.expected_blocks.map((block) => ({
        startTime: block.work[0],
        endTime: block.work[1],
        toleranceMinutes: Number.isInteger(block.tolerance) ? block.tolerance : 0,
      })),
    };
  }

  getBusinessNow(): AttendanceBusinessNow {
    const now = TimezoneConfigUtils.getCurrentTime();
    return {
      date: formatBusinessDate(now),
      time: formatBusinessTime(now),
      iso: now.toISOString(),
    };
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  values: readonly TInput[],
  requestedConcurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (values.length === 0) return [];

  const concurrency = Math.max(1, Math.min(requestedConcurrency, values.length));
  const output = new Array<TOutput>(values.length);
  let cursor = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      const value = values[index];
      if (value === undefined) return;
      output[index] = await mapper(value, index);
    }
  });

  await Promise.all(workers);
  return output;
}

function mapScheduleSource(source: string): ScheduleSource {
  switch (source) {
    case 'rotation':
      return 'ROTATION';
    case 'default':
      return 'DEFAULT';
    case 'exception':
      return 'EXCEPTION';
    case 'direct':
    default:
      return 'DIRECT';
  }
}

function createBusinessBoundary(
  value: BusinessDate,
  endOfDay: boolean,
  explicitHour?: number,
): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = TimezoneConfigUtils.getCurrentTime();

  // Évite new Date('YYYY-MM-DD'), interprété comme UTC par JavaScript.
  date.setDate(1);
  date.setFullYear(year!);
  date.setMonth(month! - 1);
  date.setDate(day!);

  if (explicitHour !== undefined) {
    date.setHours(explicitHour, 0, 0, 0);
  } else if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function formatBusinessDate(date: Date): BusinessDate {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatBusinessTime(date: Date): string {
  // Les heures du serveur sont déjà préparées dans le fuseau métier.
  return date.toTimeString().slice(0, 8);
}
