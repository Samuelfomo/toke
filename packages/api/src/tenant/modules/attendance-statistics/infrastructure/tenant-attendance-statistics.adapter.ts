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

    const periodStart = createBusinessBoundary(query.startDate, false);
    const periodEnd = createBusinessBoundary(query.endDate, true);

    // Une session qui commence avant la période mais se termine pendant celle-ci
    // doit être chargée (cas typique d'une garde qui traverse minuit).
    const conditions: Record<string | symbol, unknown> = {
      user: { [Op.in]: [...query.employeeIds] },
      session_start_at: { [Op.lte]: periodEnd },
      [Op.or]: [
        { session_end_at: { [Op.gte]: periodStart } },
        { session_end_at: { [Op.is]: null } },
      ],
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
          pauseMinutes =
            rawPauseMinutes !== null &&
            rawPauseMinutes !== undefined &&
            Number.isFinite(rawPauseMinutes) &&
            rawPauseMinutes >= 0
              ? rawPauseMinutes
              : null;
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

    const grouped = new Map<string, Array<{ snapshot: SessionSnapshot; date: BusinessDate }>>();
    const businessNow = TimezoneConfigUtils.getCurrentTime();

    for (const snapshot of snapshots) {
      if (!snapshot) continue;

      for (const date of listOverlappedBusinessDates(
        snapshot,
        query.startDate,
        query.endDate,
        businessNow,
      )) {
        const key = attendanceActivityKey(snapshot.employeeId, date);
        const group = grouped.get(key) ?? [];
        group.push({ snapshot, date });
        grouped.set(key, group);
      }
    }

    const result = new Map<string, AttendanceDayActivityInput>();
    for (const [key, entries] of grouped.entries()) {
      entries.sort((a, b) => a.snapshot.startAt.getTime() - b.snapshot.startAt.getTime());
      const date = entries[0]!.date;
      const group = entries.map((entry) => entry.snapshot);

      const firstSession = group[0]!;
      const lastEnd = group
        .map((session) => session.endAt)
        .filter((value): value is Date => value !== null)
        .sort((a, b) => a.getTime() - b.getTime())
        .at(-1);

      const dailyDurations = entries.map(({ snapshot }) =>
        calculateSessionDurationForBusinessDate(snapshot, date),
      );
      const knownGross = dailyDurations.every((duration) => duration.grossMinutes !== null);
      const knownPause = dailyDurations.every((duration) => duration.pauseMinutes !== null);

      result.set(key, {
        sessionCount: group.length,
        openSessionCount: group.filter((session) => session.open).length,
        incompleteSessionCount: group.filter((session) => session.incomplete).length,
        firstClockIn: formatBusinessTime(firstSession.startAt),
        firstClockInDate: formatBusinessDate(firstSession.startAt),
        lastClockOut: lastEnd ? formatBusinessTime(lastEnd) : null,
        lastClockOutDate: lastEnd ? formatBusinessDate(lastEnd) : null,
        grossMinutes: knownGross
          ? dailyDurations.reduce((total, duration) => total + duration.grossMinutes!, 0)
          : null,
        pauseMinutes: knownPause
          ? dailyDurations.reduce((total, duration) => total + duration.pauseMinutes!, 0)
          : null,
        intervals: group.map((session) => ({
          startDate: formatBusinessDate(session.startAt),
          startTime: formatBusinessTime(session.startAt),
          endDate: session.endAt ? formatBusinessDate(session.endAt) : null,
          endTime: session.endAt ? formatBusinessTime(session.endAt) : null,
        })),
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
        pauseStartTime: Array.isArray(block.pause) ? block.pause[0] : null,
        pauseEndTime: Array.isArray(block.pause) ? block.pause[1] : null,
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

function listOverlappedBusinessDates(
  snapshot: SessionSnapshot,
  periodStart: BusinessDate,
  periodEnd: BusinessDate,
  businessNow: Date,
): BusinessDate[] {
  // Une session reste une donnée valide quelle que soit sa durée.
  // En revanche, elle ne doit pas fabriquer une présence sur chaque journée
  // civile comprise entre son entrée et sa sortie.
  //
  // Règle de projection statistique :
  // - toujours la journée de démarrage ;
  // - éventuellement le lendemain immédiat si la session traverse exactement
  //   un seul minuit (cas de garde 16:00 -> 08:00) ;
  // - jamais J+2, J+3, ... uniquement parce que session_end_at est éloigné.
  //
  // Pour une session OPEN, businessNow sert uniquement à savoir si le lendemain
  // immédiat a réellement commencé. OPEN_SESSION reste exposé par le domaine.
  const effectiveEnd = snapshot.endAt ?? businessNow;
  if (effectiveEnd <= snapshot.startAt) return [];

  const startDate = formatBusinessDate(snapshot.startAt);
  const endDate = formatBusinessDate(effectiveEnd);
  const nextDate = addBusinessDays(startDate, 1);
  const dates: BusinessDate[] = [];

  if (isBusinessDateWithinPeriod(startDate, periodStart, periodEnd)) {
    dates.push(startDate);
  }

  // Le lendemain n'est projeté que si la session se termine ce lendemain.
  // Une session qui reste ouverte/fermée au-delà n'est pas interprétée comme
  // une présence continue. Sa durée totale reste conservée sur sa journée de
  // démarrage par calculateSessionDurationForBusinessDate().
  if (endDate === nextDate && isBusinessDateWithinPeriod(nextDate, periodStart, periodEnd)) {
    const nextDayStart = createBusinessBoundary(nextDate, false);
    if (snapshot.startAt < nextDayStart && effectiveEnd > nextDayStart) {
      dates.push(nextDate);
    }
  }

  return dates;
}

function calculateSessionDurationForBusinessDate(
  snapshot: SessionSnapshot,
  date: BusinessDate,
): { grossMinutes: number | null; pauseMinutes: number | null } {
  if (!snapshot.endAt) {
    return { grossMinutes: null, pauseMinutes: null };
  }

  const startDate = formatBusinessDate(snapshot.startAt);
  const endDate = formatBusinessDate(snapshot.endAt);
  const nextDate = addBusinessDays(startDate, 1);
  const isSingleBusinessDay = startDate === endDate && startDate === date;

  if (isSingleBusinessDay) {
    return {
      grossMinutes: snapshot.grossMinutes,
      pauseMinutes: snapshot.pauseMinutes,
    };
  }

  const isSimpleOvernightSession = endDate === nextDate;

  // Une session qui couvre plus d'un minuit n'est pas ventilée artificiellement
  // en journées de 1440 min. On conserve sa durée calculable complète sur sa
  // journée de démarrage, sans la déclarer invalide.
  if (!isSimpleOvernightSession) {
    return date === startDate
      ? { grossMinutes: snapshot.grossMinutes, pauseMinutes: snapshot.pauseMinutes }
      : { grossMinutes: null, pauseMinutes: null };
  }

  const dayStart = createBusinessBoundary(date, false);
  const nextDayStart = createNextBusinessDayBoundary(date);
  const clippedStart = snapshot.startAt > dayStart ? snapshot.startAt : dayStart;
  const clippedEnd = snapshot.endAt < nextDayStart ? snapshot.endAt : nextDayStart;
  const rawSegmentMinutes = Math.max(
    0,
    (clippedEnd.getTime() - clippedStart.getTime()) / 60_000,
  );

  let grossMinutes: number;
  if (snapshot.grossMinutes !== null) {
    // Pour une garde simple J -> J+1, la somme des deux segments doit rester
    // exactement égale à la durée de référence de la WorkSession. On évite
    // ainsi de perdre une minute en tronquant indépendamment les deux côtés
    // de minuit (ex. 464.7 + 560.5 => 1025, pas 1024).
    if (date === startDate) {
      grossMinutes = Math.min(snapshot.grossMinutes, Math.floor(rawSegmentMinutes));
    } else {
      const firstDayStart = snapshot.startAt;
      const midnight = createNextBusinessDayBoundary(startDate);
      const firstDayRawMinutes = Math.max(
        0,
        (midnight.getTime() - firstDayStart.getTime()) / 60_000,
      );
      const firstDayMinutes = Math.min(
        snapshot.grossMinutes,
        Math.floor(firstDayRawMinutes),
      );
      grossMinutes = Math.max(0, snapshot.grossMinutes - firstDayMinutes);
    }
  } else {
    grossMinutes = Math.floor(rawSegmentMinutes);
  }

  // Sans horodatage précis des pauses, une pause non nulle ne peut pas être
  // répartie honnêtement entre les deux journées d'une garde.
  const pauseMinutes = snapshot.pauseMinutes === 0 ? 0 : null;
  return { grossMinutes, pauseMinutes };
}

function createNextBusinessDayBoundary(date: BusinessDate): Date {
  const result = createBusinessBoundary(date, false);
  result.setDate(result.getDate() + 1);
  return result;
}

function addBusinessDays(date: BusinessDate, days: number): BusinessDate {
  const timestamp = businessDateToUtcDay(date) + days * 86_400_000;
  return formatUtcBusinessDate(timestamp);
}

function isBusinessDateWithinPeriod(
  date: BusinessDate,
  periodStart: BusinessDate,
  periodEnd: BusinessDate,
): boolean {
  return date >= periodStart && date <= periodEnd;
}



function businessDateToUtcDay(value: BusinessDate): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

function formatUtcBusinessDate(timestamp: number): BusinessDate {
  const date = new Date(timestamp);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
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
