import { PointageStatus, PointageType, TimezoneConfigUtils } from '@toke/shared';
import { Op } from 'sequelize';

import User from '../../../class/User.js';
import OrgHierarchy from '../../../class/OrgHierarchy.js';
import Site from '../../../class/Site.js';
import WorkSessions from '../../../class/WorkSessions.js';
import TimeEntries from '../../../class/TimeEntries.js';
import SessionTemplate from '../../../class/SessionTemplates.js';
import ScheduleResolutionService from '../../../../tools/schedule.resolution.service.js';
import type {
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
  BusinessDate,
  ScheduleSource,
  AttendanceExtraPolicy,
  AttendancePresenceEvidence,
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
  sessionId: number;
  sessionGuid: string | null;
  employeeId: number;
  date: BusinessDate;
  startAt: Date;
  endAt: Date | null;
  open: boolean;
  incomplete: boolean;
  corrected: boolean;
  grossMinutes: number | null;
  pauseMinutes: number | null;
}

/**
 * Adaptateur concret vers les classes métier existantes du tenant.
 * Il est le seul fichier du module qui connaît User, OrgHierarchy,
 * WorkSessions, Site, Sequelize et ScheduleResolutionService.
 */
export class TenantAttendanceStatisticsAdapter implements AttendanceStatisticsPort {
  private readonly extraPolicyByTemplateId = new Map<number, Promise<AttendanceExtraPolicy>>();
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

    const sessionIds = sessions
      .map((session) => session.getId())
      .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0);
    const clockIns =
      sessionIds.length > 0
        ? ((await TimeEntries._list({
            session: { [Op.in]: sessionIds },
            pointage_type: PointageType.CLOCK_IN,
            pointage_status: {
              [Op.in]: [PointageStatus.ACCEPTED, PointageStatus.ACCOUNTED],
            },
          })) ?? [])
        : [];
    const clockInsBySession = new Map<number, typeof clockIns>();
    for (const entry of clockIns) {
      const sessionId = entry.getSession();
      if (!sessionId) continue;
      const entries = clockInsBySession.get(sessionId) ?? [];
      entries.push(entry);
      clockInsBySession.set(sessionId, entries);
    }

    const snapshots = await mapWithConcurrency(
      sessions,
      8,
      async (session): Promise<SessionSnapshot | null> => {
        const sessionId = session.getId();
        const employeeId = session.getUser();
        const startAt = session.getSessionStartAt();
        if (!sessionId || !employeeId || !startAt) return null;

        const endAt = session.getSessionEndAt() ?? null;
        const normalizedStatus = String(session.getSessionStatus() ?? '').toLowerCase();
        const open = normalizedStatus === 'open';
        const corrected = normalizedStatus === 'corrected';
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
          sessionId,
          sessionGuid: session.getGuid() ?? null,
          employeeId,
          date: formatBusinessDate(startAt),
          startAt,
          endAt,
          open,
          incomplete,
          corrected,
          grossMinutes: parsePostgresIntervalMinutes(session.getTotalWorkDuration()),
          pauseMinutes,
        };
      },
    );

    const grouped = new Map<
      string,
      Array<{
        snapshot: SessionSnapshot;
        date: BusinessDate;
        duration: { grossMinutes: number | null; pauseMinutes: number | null };
        interval: {
          startDate: BusinessDate;
          startTime: string;
          endDate: BusinessDate | null;
          endTime: string | null;
          attributableNetMinutes: number | null;
        };
      }>
    >();
    const businessNow = TimezoneConfigUtils.getCurrentTime();

    for (const snapshot of snapshots) {
      if (!snapshot) continue;

      for (const date of listOverlappedBusinessDates(
        snapshot,
        query.startDate,
        query.endDate,
        businessNow,
      )) {
        const duration = calculateSessionDurationForBusinessDate(snapshot, date);
        const interval = projectSessionIntervalForBusinessDate(snapshot, date, duration);
        const key = attendanceActivityKey(snapshot.employeeId, date);
        const group = grouped.get(key) ?? [];
        group.push({ snapshot, date, duration, interval });
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

      const dailyDurations = entries.map(({ duration }) => duration);
      const knownGross = dailyDurations.every((duration) => duration.grossMinutes !== null);
      const knownPause = dailyDurations.every((duration) => duration.pauseMinutes !== null);
      const presenceEvidence = resolvePresenceEvidence(group, clockInsBySession);
      const sourceSessionGuids = uniqueStrings(
        group.map((session) => session.sessionGuid),
      );
      const sourceClockInEntryGuids = uniqueStrings(
        group.flatMap((session) =>
          (clockInsBySession.get(session.sessionId) ?? []).map((entry) => entry.getGuid() ?? null),
        ),
      );

      result.set(key, {
        sessionCount: group.length,
        sourceSessionGuids,
        sourceClockInEntryGuids,
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
        presenceEvidence,
        intervals: entries.map(({ interval }) => interval),
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

    const extraPolicy = await this.resolveExtraPolicy(schedule.template_id);

    return {
      state: 'WORK_DAY',
      source,
      extraPolicy,
      expectedBlocks: schedule.expected_blocks.map((block) => ({
        startTime: block.work[0],
        endTime: block.work[1],
        toleranceMinutes: Number.isInteger(block.tolerance) ? block.tolerance : 0,
        pauseStartTime: Array.isArray(block.pause) ? block.pause[0] : null,
        pauseEndTime: Array.isArray(block.pause) ? block.pause[1] : null,
      })),
    };
  }

  private resolveExtraPolicy(templateId: number): Promise<AttendanceExtraPolicy> {
    const cached = this.extraPolicyByTemplateId.get(templateId);
    if (cached) return cached;

    const policyPromise = this.loadExtraPolicy(templateId);
    this.extraPolicyByTemplateId.set(templateId, policyPromise);
    return policyPromise;
  }

  private async loadExtraPolicy(templateId: number): Promise<AttendanceExtraPolicy> {
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return { resolved: false, allowed: null, maxMinutes: null };
    }

    const template = await SessionTemplate._load(templateId);
    const sessionModel = await template?.getSessionModelObj();
    if (!sessionModel) {
      return { resolved: false, allowed: null, maxMinutes: null };
    }

    const allowed = sessionModel.isExtraAllowed();
    if (allowed === false) {
      return { resolved: true, allowed: false, maxMinutes: null };
    }
    if (allowed !== true) {
      return { resolved: false, allowed: null, maxMinutes: null };
    }

    const maxMinutes = sessionModel.getExtraMax();
    if (!Number.isInteger(maxMinutes) || maxMinutes! < 0) {
      return { resolved: false, allowed: null, maxMinutes: null };
    }

    return { resolved: true, allowed: true, maxMinutes: maxMinutes! };
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

function resolvePresenceEvidence(
  sessions: readonly SessionSnapshot[],
  clockInsBySession: ReadonlyMap<number, readonly TimeEntries[]>,
): AttendancePresenceEvidence | null {
  const candidates = sessions
    .flatMap((session) =>
      (clockInsBySession.get(session.sessionId) ?? []).map((entry) => ({ session, entry })),
    )
    .filter(({ entry }) => entry.getClockedAt() instanceof Date)
    .sort(
      (left, right) =>
        left.entry.getClockedAt()!.getTime() - right.entry.getClockedAt()!.getTime(),
    );

  const first = candidates[0];
  if (first) {
    const clockedAt = first.entry.getClockedAt()!;
    const autoGenerated = first.entry.getDeviceInfo()?.auto_generated === true;
    const corrected = autoGenerated || first.session.corrected;
    return {
      kind: corrected ? 'CORRECTED' : 'DIRECT',
      occurredAt: formatBusinessTime(clockedAt),
      occurredDate: formatBusinessDate(clockedAt),
      autoGenerated,
    };
  }

  // Une WorkSession, même CORRECTED, ne constitue pas à elle seule une preuve
  // de présence. La présence statistique exige désormais un CLOCK_IN exploitable
  // dont le cycle de validation est finalisé (ACCEPTED ou ACCOUNTED).
  //
  // Les CLOCK_IN auto-générés par les corrections métier restent traçables :
  // une fois acceptés, ils sont chargés ci-dessus et leur device_info.auto_generated
  // permet de retourner une preuve CORRECTED plutôt qu'une preuve DIRECT.
  return null;
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

function projectSessionIntervalForBusinessDate(
  snapshot: SessionSnapshot,
  date: BusinessDate,
  duration: { grossMinutes: number | null; pauseMinutes: number | null },
): {
  startDate: BusinessDate;
  startTime: string;
  endDate: BusinessDate | null;
  endTime: string | null;
  attributableNetMinutes: number | null;
} {
  const sessionStartDate = formatBusinessDate(snapshot.startAt);
  const sessionEndDate = snapshot.endAt ? formatBusinessDate(snapshot.endAt) : null;
  const simpleOrSameDay =
    sessionEndDate !== null &&
    (sessionEndDate === sessionStartDate ||
      sessionEndDate === addBusinessDays(sessionStartDate, 1));

  // L'intervalle conserve les bornes réelles de la WorkSession. La durée
  // attribuable, elle, correspond uniquement au segment projeté sur `date`.
  // Cela permet de distinguer une vraie continuité de garde (entrée la veille)
  // d'une nouvelle prise de service le jour même.
  const attributableNetMinutes =
    simpleOrSameDay && duration.grossMinutes !== null && duration.pauseMinutes !== null
      ? duration.grossMinutes - duration.pauseMinutes
      : null;

  return {
    startDate: sessionStartDate,
    startTime: formatBusinessTime(snapshot.startAt),
    endDate: snapshot.endAt ? formatBusinessDate(snapshot.endAt) : null,
    endTime: snapshot.endAt ? formatBusinessTime(snapshot.endAt) : null,
    attributableNetMinutes,
  };
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

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
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
