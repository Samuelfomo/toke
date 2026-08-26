import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAttendanceOverview } from './attendance-overview.js';
import type { AttendanceDay } from '../domain/attendance-day.types.js';

function makeDay(
  employeeId: number,
  employeeGuid: string,
  date: string,
  status: AttendanceDay['result']['status'],
  options: {
    rateEligible?: boolean;
    delayMinutes?: number | null;
    grossMinutes?: number | null;
    pauseMinutes?: number | null;
    issues?: AttendanceDay['issues'];
  } = {},
): AttendanceDay {
  const grossMinutes = Object.prototype.hasOwnProperty.call(options, 'grossMinutes')
    ? (options.grossMinutes ?? null)
    : status === 'PRESENT' || status === 'LATE'
      ? 480
      : null;
  const pauseMinutes = Object.prototype.hasOwnProperty.call(options, 'pauseMinutes')
    ? (options.pauseMinutes ?? null)
    : grossMinutes === null
      ? null
      : 60;
  return {
    employeeId,
    employeeGuid,
    date,
    schedule:
      status === 'REST_DAY'
        ? { state: 'REST_DAY', source: 'DIRECT', expectedBlocks: [] }
        : status === 'UNDETERMINED'
          ? {
              state: 'UNRESOLVED',
              source: null,
              expectedBlocks: [],
              issue: 'MISSING_SCHEDULE',
            }
          : {
              state: 'WORK_DAY',
              source: 'DIRECT',
              expectedBlocks: [
                { startTime: '08:00', endTime: '17:00', toleranceMinutes: 10 },
              ],
            },
    activity: {
      sessionCount: status === 'PRESENT' || status === 'LATE' ? 1 : 0,
      openSessionCount: 0,
      incompleteSessionCount: 0,
      firstClockIn: status === 'PRESENT' || status === 'LATE' ? '08:05' : null,
      lastClockOut: status === 'PRESENT' || status === 'LATE' ? '17:00' : null,
      grossMinutes,
      pauseMinutes,
      hasActivity: status === 'PRESENT' || status === 'LATE',
      netMinutes:
        grossMinutes !== null && pauseMinutes !== null ? grossMinutes - pauseMinutes : null,
    },
    result: {
      status,
      delayMinutes: options.delayMinutes ?? null,
      rateEligible:
        options.rateEligible ?? ['PRESENT', 'LATE', 'ABSENT'].includes(status),
    },
    issues: options.issues ?? [],
  };
}

describe('buildAttendanceOverview', () => {
  it('calcule le taux uniquement sur les journées éligibles', () => {
    const overview = buildAttendanceOverview({
      generatedAt: '2026-07-22T10:00:00.000Z',
      managerGuid: 'manager-1',
      siteGuid: null,
      startDate: '2026-07-20',
      endDate: '2026-07-21',
      dates: ['2026-07-20', '2026-07-21'],
      employees: [
        { id: 1, guid: 'e1', name: 'Employé 1' },
        { id: 2, guid: 'e2', name: 'Employé 2' },
      ],
      days: [
        makeDay(1, 'e1', '2026-07-20', 'PRESENT'),
        makeDay(1, 'e1', '2026-07-21', 'PENDING', { rateEligible: false }),
        makeDay(2, 'e2', '2026-07-20', 'LATE', { delayMinutes: 20 }),
        makeDay(2, 'e2', '2026-07-21', 'ABSENT'),
      ],
    });

    assert.equal(overview.summary.rates.employeeWorkingDaysExpected, 3);
    assert.equal(overview.summary.rates.attendedWorkingDays, 2);
    assert.equal(overview.summary.rates.attendanceRate, 66.7);
    assert.equal(overview.summary.rates.punctualityRate, 50);
    assert.equal(overview.summary.statusTotals.PENDING, 1);
    assert.equal(overview.daily[0]?.durations.netMinutes, 840);
    assert.equal(overview.daily[0]?.durations.daysWithKnownNetDuration, 2);
  });

  it('sépare les anomalies de repos et les problèmes de planning', () => {
    const overview = buildAttendanceOverview({
      generatedAt: '2026-07-22T10:00:00.000Z',
      managerGuid: 'manager-1',
      siteGuid: null,
      startDate: '2026-07-20',
      endDate: '2026-07-20',
      dates: ['2026-07-20'],
      employees: [
        { id: 1, guid: 'e1', name: 'Employé 1' },
        { id: 2, guid: 'e2', name: 'Employé 2' },
      ],
      days: [
        makeDay(1, 'e1', '2026-07-20', 'REST_DAY', {
          issues: ['PRESENCE_ON_REST_DAY'],
          grossMinutes: null,
          pauseMinutes: null,
        }),
        makeDay(2, 'e2', '2026-07-20', 'UNDETERMINED', {
          issues: ['MISSING_SCHEDULE', 'PRESENCE_WITHOUT_SCHEDULE'],
          grossMinutes: null,
          pauseMinutes: null,
        }),
      ],
    });

    assert.equal(overview.summary.rates.attendanceRate, null);
    assert.equal(overview.dataQuality.unresolvedScheduleDays, 1);
    assert.equal(overview.dataQuality.presenceWithoutScheduleDays, 1);
    assert.equal(overview.dataQuality.reliableForAttendanceRate, false);
    assert.equal(
      overview.issues.find((issue) => issue.issue === 'PRESENCE_ON_REST_DAY')?.count,
      1,
    );
  });

  it('ne remplace pas une durée manquante par zéro', () => {
    const day = makeDay(1, 'e1', '2026-07-20', 'PRESENT', {
      grossMinutes: null,
      pauseMinutes: null,
      issues: ['MISSING_DURATION'],
    });

    const overview = buildAttendanceOverview({
      generatedAt: '2026-07-22T10:00:00.000Z',
      managerGuid: 'manager-1',
      siteGuid: null,
      startDate: '2026-07-20',
      endDate: '2026-07-20',
      dates: ['2026-07-20'],
      employees: [{ id: 1, guid: 'e1', name: 'Employé 1' }],
      days: [day],
    });

    assert.equal(overview.summary.durations.grossMinutes, 0);
    assert.equal(overview.summary.durations.daysWithKnownGrossDuration, 0);
    assert.equal(overview.summary.durations.daysWithMissingDuration, 1);
    assert.equal(overview.daily[0]?.durations.netMinutes, 0);
    assert.equal(overview.daily[0]?.durations.daysWithKnownNetDuration, 0);
    assert.equal(overview.daily[0]?.durations.daysWithMissingDuration, 1);
  });
});
