import { createAttendanceDay } from '../domain/attendance-day.js';
import type {
  AttendanceDay,
  AttendanceDayActivityInput,
  BusinessDate,
  ExpectedWorkBlock,
} from '../domain/attendance-day.types.js';

import { buildAttendanceOverview } from './attendance-overview.js';
import type { AttendanceOverview } from './attendance-overview.types.js';
import {
  attendanceActivityKey,
  type AttendanceStatisticsPort,
} from './attendance-statistics.ports.js';

const EMPTY_ACTIVITY: AttendanceDayActivityInput = {
  sessionCount: 0,
  openSessionCount: 0,
  incompleteSessionCount: 0,
  firstClockIn: null,
  lastClockOut: null,
  grossMinutes: null,
  pauseMinutes: null,
};

export type AttendanceStatisticsErrorCode = 'MANAGER_NOT_FOUND' | 'SITE_NOT_FOUND';

export class AttendanceStatisticsError extends Error {
  constructor(
    public readonly code: AttendanceStatisticsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AttendanceStatisticsError';
  }
}

export interface AttendanceOverviewRequest {
  managerGuid: string;
  siteGuid: string | null;
  startDate: BusinessDate;
  endDate: BusinessDate;
}

/**
 * Orchestre le périmètre, les sessions, les plannings et l'agrégation.
 * La classe ne connaît ni Express ni Sequelize.
 */
export class AttendanceStatisticsService {
  constructor(
    private readonly port: AttendanceStatisticsPort,
    private readonly scheduleConcurrency: number = 8,
  ) {}

  getBusinessToday(): BusinessDate {
    return this.port.getBusinessNow().date;
  }

  async getOverview(request: AttendanceOverviewRequest): Promise<AttendanceOverview> {
    console.log('[AttendanceStats] request:', request);

    const scope = await this.port.loadCurrentManagerTeam(request.managerGuid);

    console.log('[AttendanceStats] scope:', scope);

    if (!scope) {
      throw new AttendanceStatisticsError(
        'MANAGER_NOT_FOUND',
        `Manager introuvable : ${request.managerGuid}`,
      );
    }

    let siteId: number | null = null;
    if (request.siteGuid) {
      console.log('[AttendanceStats] resolving site:', request.siteGuid);
      const site = await this.port.resolveSite(request.siteGuid);
      if (!site) {
        throw new AttendanceStatisticsError(
          'SITE_NOT_FOUND',
          `Site introuvable : ${request.siteGuid}`,
        );
      }
      siteId = site.id;
    }

    const dates = listBusinessDates(request.startDate, request.endDate);

    console.log('[AttendanceStats] dates:', dates);

    const activities = await this.port.loadActivities({
      employeeIds: scope.employees.map((employee) => employee.id),
      startDate: request.startDate,
      endDate: request.endDate,
      siteId,
    });

    console.log('[AttendanceStats] activities loaded');

    const now = this.port.getBusinessNow();

    const jobs = scope.employees.flatMap((employee) =>
      dates.map((date) => async (): Promise<AttendanceDay> => {
        const schedule = await this.port.resolveSchedule(employee.id, date);
        const activity = activities.get(attendanceActivityKey(employee.id, date)) ?? EMPTY_ACTIVITY;

        return createAttendanceDay({
          employeeId: employee.id,
          employeeGuid: employee.guid,
          date,
          schedule,
          activity,
          hasExpectedWorkDayEnded: hasExpectedWorkDayEnded(
            date,
            schedule.state === 'WORK_DAY' ? schedule.expectedBlocks : [],
            now.date,
            now.time,
          ),
        });
      }),
    );

    const days = await runWithConcurrency(jobs, this.scheduleConcurrency);

    return buildAttendanceOverview({
      generatedAt: now.iso,
      managerGuid: scope.managerGuid,
      siteGuid: request.siteGuid,
      startDate: request.startDate,
      endDate: request.endDate,
      dates,
      employees: scope.employees,
      days,
    });
  }
}

export function listBusinessDates(startDate: BusinessDate, endDate: BusinessDate): BusinessDate[] {
  const start = parseBusinessDate(startDate);
  const end = parseBusinessDate(endDate);
  const result: BusinessDate[] = [];

  for (let cursor = start; cursor <= end; cursor += 86_400_000) {
    result.push(formatUtcBusinessDate(cursor));
  }
  return result;
}

export function hasExpectedWorkDayEnded(
  date: BusinessDate,
  expectedBlocks: readonly ExpectedWorkBlock[],
  nowDate: BusinessDate,
  nowTime: string,
): boolean {
  if (date < nowDate) return true;
  if (date > nowDate) return false;
  if (expectedBlocks.length === 0) return false;

  // Un bloc qui traverse minuit n'est pas terminé le jour de son démarrage.
  if (expectedBlocks.some((block) => block.endTime < block.startTime)) return false;

  const latestEnd = expectedBlocks
    .map((block) => block.endTime.slice(0, 5))
    .sort()
    .at(-1);

  return latestEnd ? nowTime.slice(0, 5) >= latestEnd : false;
}

async function runWithConcurrency<T>(
  jobs: ReadonlyArray<() => Promise<T>>,
  requestedConcurrency: number,
): Promise<T[]> {
  if (jobs.length === 0) return [];
  const concurrency = Math.max(1, Math.min(requestedConcurrency, jobs.length));
  const results = new Array<T>(jobs.length);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= jobs.length) return;
      const job = jobs[index];
      if (!job) return;
      results[index] = await job();
    }
  });

  await Promise.all(workers);
  return results;
}

function parseBusinessDate(value: BusinessDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Date métier invalide : ${value}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatUtcBusinessDate(timestamp: number): BusinessDate {
  const date = new Date(timestamp);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
