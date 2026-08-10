import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
} from '../domain/attendance-day.types.js';
import {
  attendanceActivityKey,
  type AttendanceActivityQuery,
  type AttendanceStatisticsPort,
  type ManagerTeamScope,
  type ResolvedAttendanceSite,
} from './attendance-statistics.ports.js';
import {
  AttendanceStatisticsError,
  AttendanceStatisticsService,
  hasExpectedWorkDayEnded,
  listBusinessDates,
} from './attendance-statistics.service.js';

const workDay: AttendanceDaySchedule = {
  state: 'WORK_DAY',
  source: 'DIRECT',
  expectedBlocks: [
    { startTime: '08:00', endTime: '17:00', toleranceMinutes: 10 },
  ],
};

const restDay: AttendanceDaySchedule = {
  state: 'REST_DAY',
  source: 'ROTATION',
  expectedBlocks: [],
};

class FakePort implements AttendanceStatisticsPort {
  team: ManagerTeamScope | null = {
    managerId: 99,
    managerGuid: 'manager-99',
    employees: [
      { id: 1, guid: 'employee-1', name: 'Alice' },
      { id: 2, guid: 'employee-2', name: 'Bob' },
    ],
  };

  site: ResolvedAttendanceSite | null = { id: 4, guid: 'site-4' };
  schedules = new Map<string, AttendanceDaySchedule>();
  activities = new Map<string, AttendanceDayActivityInput>();
  lastActivityQuery: AttendanceActivityQuery | null = null;

  async loadCurrentManagerTeam(): Promise<ManagerTeamScope | null> {
    return this.team;
  }

  async resolveSite(): Promise<ResolvedAttendanceSite | null> {
    return this.site;
  }

  async loadActivities(
    query: AttendanceActivityQuery,
  ): Promise<ReadonlyMap<string, AttendanceDayActivityInput>> {
    this.lastActivityQuery = query;
    return this.activities;
  }

  async resolveSchedule(employeeId: number, date: string): Promise<AttendanceDaySchedule> {
    return this.schedules.get(`${employeeId}:${date}`) ?? workDay;
  }

  getBusinessNow() {
    return {
      date: '2026-07-22',
      time: '18:00:00',
      iso: '2026-07-22T18:00:00.000Z',
    };
  }
}

describe('AttendanceStatisticsService', () => {
  it('utilise exclusivement l’équipe actuelle retournée par le port', async () => {
    const port = new FakePort();
    port.schedules.set('2:2026-07-21', restDay);
    port.activities.set(attendanceActivityKey(1, '2026-07-21'), {
      sessionCount: 1,
      openSessionCount: 0,
      incompleteSessionCount: 0,
      firstClockIn: '08:05',
      lastClockOut: '17:00',
      grossMinutes: 535,
      pauseMinutes: 60,
    });

    const service = new AttendanceStatisticsService(port, 2);
    const overview = await service.getOverview({
      managerGuid: 'manager-99',
      siteGuid: 'site-4',
      startDate: '2026-07-21',
      endDate: '2026-07-21',
    });

    assert.equal(overview.scope.teamSize, 2);
    assert.deepEqual(
      overview.scope.employees.map((employee) => employee.guid),
      ['employee-1', 'employee-2'],
    );
    assert.equal(overview.summary.statusTotals.PRESENT, 1);
    assert.equal(overview.summary.statusTotals.REST_DAY, 1);
    assert.deepEqual(port.lastActivityQuery, {
      employeeIds: [1, 2],
      startDate: '2026-07-21',
      endDate: '2026-07-21',
      siteId: 4,
    });
  });

  it('retourne une équipe vide sans inventer des employés', async () => {
    const port = new FakePort();
    port.team = { managerId: 99, managerGuid: 'manager-99', employees: [] };

    const overview = await new AttendanceStatisticsService(port).getOverview({
      managerGuid: 'manager-99',
      siteGuid: null,
      startDate: '2026-07-21',
      endDate: '2026-07-22',
    });

    assert.equal(overview.scope.teamSize, 0);
    assert.deepEqual(overview.employees, []);
    assert.equal(overview.summary.rates.attendanceRate, null);
  });

  it('signale un site inconnu', async () => {
    const port = new FakePort();
    port.site = null;

    await assert.rejects(
      () =>
        new AttendanceStatisticsService(port).getOverview({
          managerGuid: 'manager-99',
          siteGuid: 'missing-site',
          startDate: '2026-07-21',
          endDate: '2026-07-21',
        }),
      (error: unknown) =>
        error instanceof AttendanceStatisticsError && error.code === 'SITE_NOT_FOUND',
    );
  });

  it('signale un manager inconnu', async () => {
    const port = new FakePort();
    port.team = null;

    await assert.rejects(
      () =>
        new AttendanceStatisticsService(port).getOverview({
          managerGuid: 'missing',
          siteGuid: null,
          startDate: '2026-07-21',
          endDate: '2026-07-21',
        }),
      (error: unknown) =>
        error instanceof AttendanceStatisticsError && error.code === 'MANAGER_NOT_FOUND',
    );
  });
});

describe('outils de période métier', () => {
  it('énumère les dates sans conversion de fuseau', () => {
    assert.deepEqual(listBusinessDates('2026-07-30', '2026-08-02'), [
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
  });

  it('considère une journée passée comme terminée', () => {
    assert.equal(
      hasExpectedWorkDayEnded(
        '2026-07-21',
        [{ startTime: '08:00', endTime: '17:00', toleranceMinutes: 0 }],
        '2026-07-22',
        '09:00',
      ),
      true,
    );
  });

  it('ne clôture pas le jour courant avant la fin du dernier bloc', () => {
    assert.equal(
      hasExpectedWorkDayEnded(
        '2026-07-22',
        [{ startTime: '08:00', endTime: '17:00', toleranceMinutes: 0 }],
        '2026-07-22',
        '16:59',
      ),
      false,
    );
  });

  it('ne clôture pas un bloc traversant minuit le jour de son démarrage', () => {
    assert.equal(
      hasExpectedWorkDayEnded(
        '2026-07-22',
        [{ startTime: '16:00', endTime: '08:00', toleranceMinutes: 0 }],
        '2026-07-22',
        '23:30',
      ),
      false,
    );
  });

});
