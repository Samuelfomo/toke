import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AttendanceDaySchedule } from '../domain/attendance-day.types.js';
import { AttendanceDayService } from './attendance-day.service.js';
import type {
  AttendanceScheduleRepository,
  AttendanceSessionRecord,
  AttendanceSessionRepository,
} from './attendance-day-service.types.js';

const workDay: AttendanceDaySchedule = {
  state: 'WORK_DAY',
  source: 'DIRECT',
  expectedBlocks: [
    { startTime: '08:00', endTime: '17:00', toleranceMinutes: 10 },
  ],
};

const guardDay: AttendanceDaySchedule = {
  state: 'WORK_DAY',
  source: 'ROTATION',
  expectedBlocks: [
    { startTime: '16:00', endTime: '08:00', toleranceMinutes: 0 },
  ],
};

function closedSession(overrides: Partial<AttendanceSessionRecord> = {}): AttendanceSessionRecord {
  return {
    id: 1,
    employeeId: 1,
    status: 'CLOSED',
    startedAt: {
      businessDate: '2026-08-04',
      businessTime: '08:05',
      epochMilliseconds: Date.parse('2026-08-04T07:05:00Z'),
    },
    endedAt: {
      businessDate: '2026-08-04',
      businessTime: '17:00',
      epochMilliseconds: Date.parse('2026-08-04T16:00:00Z'),
    },
    totalWorkDuration: '8 hours 55 minutes',
    totalPauseDuration: '1 hour',
    entries: [],
    ...overrides,
  };
}

class FakeSessionRepository implements AttendanceSessionRepository {
  constructor(private readonly sessions: readonly AttendanceSessionRecord[]) {}

  async listForPeriod(): Promise<readonly AttendanceSessionRecord[]> {
    return this.sessions;
  }
}

class FakeScheduleRepository implements AttendanceScheduleRepository {
  constructor(
    private readonly scheduleByKey: ReadonlyMap<string, AttendanceDaySchedule>,
  ) {}

  async resolveForPeriod(input: Parameters<AttendanceScheduleRepository['resolveForPeriod']>[0]) {
    return input.employees.flatMap((employee) =>
      input.dates.flatMap((date) => {
        const schedule = this.scheduleByKey.get(`${employee.id}:${date}`);
        return schedule ? [{ employeeId: employee.id, date, schedule }] : [];
      }),
    );
  }
}

function service(
  sessions: readonly AttendanceSessionRecord[],
  schedules: ReadonlyMap<string, AttendanceDaySchedule>,
): AttendanceDayService {
  return new AttendanceDayService(
    new FakeSessionRepository(sessions),
    new FakeScheduleRepository(schedules),
  );
}

describe('AttendanceDayService', () => {
  it('produit exactement une journée par employé et par date', async () => {
    const schedules = new Map<string, AttendanceDaySchedule>([
      ['1:2026-08-04', workDay],
      ['1:2026-08-05', workDay],
      ['2:2026-08-04', workDay],
      ['2:2026-08-05', workDay],
    ]);

    const days = await service([closedSession()], schedules).buildDays({
      employees: [
        { id: 1, guid: 'employee-1' },
        { id: 2, guid: 'employee-2' },
      ],
      period: { startDate: '2026-08-04', endDate: '2026-08-05' },
      now: { date: '2026-08-05', time: '18:00' },
      businessTimezone: 'Africa/Douala',
    });

    assert.equal(days.length, 4);
    assert.equal(days[0]?.result.status, 'PRESENT');
    assert.equal(days[1]?.result.status, 'ABSENT');
    assert.equal(days[2]?.result.status, 'ABSENT');
    assert.equal(days[3]?.result.status, 'ABSENT');
  });

  it('transforme un planning omis par le repository en MISSING_SCHEDULE', async () => {
    const days = await service([], new Map()).buildDays({
      employees: [{ id: 1, guid: 'employee-1' }],
      period: { startDate: '2026-08-05', endDate: '2026-08-05' },
      now: { date: '2026-08-05', time: '18:00' },
      businessTimezone: 'Africa/Douala',
    });

    assert.equal(days[0]?.result.status, 'UNDETERMINED');
    assert.deepEqual(days[0]?.issues, ['MISSING_SCHEDULE']);
  });

  it('ne déclare pas absent un employé de garde avant 08h le lendemain', async () => {
    const schedules = new Map<string, AttendanceDaySchedule>([
      ['1:2026-08-05', guardDay],
    ]);

    const beforeEnd = await service([], schedules).buildDays({
      employees: [{ id: 1, guid: 'employee-1' }],
      period: { startDate: '2026-08-05', endDate: '2026-08-05' },
      now: { date: '2026-08-06', time: '07:59' },
      businessTimezone: 'Africa/Douala',
    });
    const afterEnd = await service([], schedules).buildDays({
      employees: [{ id: 1, guid: 'employee-1' }],
      period: { startDate: '2026-08-05', endDate: '2026-08-05' },
      now: { date: '2026-08-06', time: '08:00' },
      businessTimezone: 'Africa/Douala',
    });

    assert.equal(beforeEnd[0]?.result.status, 'PENDING');
    assert.equal(afterEnd[0]?.result.status, 'ABSENT');
  });

  it('regroupe plusieurs sessions avant de classifier la journée', async () => {
    const schedules = new Map<string, AttendanceDaySchedule>([
      ['1:2026-08-04', workDay],
    ]);
    const sessions = [
      closedSession({
        id: 1,
        endedAt: {
          businessDate: '2026-08-04',
          businessTime: '12:00',
          epochMilliseconds: Date.parse('2026-08-04T11:00:00Z'),
        },
        totalWorkDuration: '4 hours',
        totalPauseDuration: '0 minutes',
      }),
      closedSession({
        id: 2,
        startedAt: {
          businessDate: '2026-08-04',
          businessTime: '13:00',
          epochMilliseconds: Date.parse('2026-08-04T12:00:00Z'),
        },
        totalWorkDuration: '4 hours',
        totalPauseDuration: '30 minutes',
      }),
    ];

    const days = await service(sessions, schedules).buildDays({
      employees: [{ id: 1, guid: 'employee-1' }],
      period: { startDate: '2026-08-04', endDate: '2026-08-04' },
      now: { date: '2026-08-05', time: '08:00' },
      businessTimezone: 'Africa/Douala',
    });

    assert.equal(days[0]?.activity.sessionCount, 2);
    assert.equal(days[0]?.activity.netMinutes, 450);
  });
});
