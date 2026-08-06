import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AttendanceDaySchedule } from '../domain/attendance-day.types.js';
import {
  addBusinessDays,
  BusinessCalendarInvariantError,
  enumerateBusinessDates,
  getWeekdayKey,
  hasExpectedWorkDayEnded,
} from './business-calendar.js';

const daytimeSchedule: AttendanceDaySchedule = {
  state: 'WORK_DAY',
  source: 'DIRECT',
  expectedBlocks: [
    { startTime: '08:00', endTime: '17:00', toleranceMinutes: 10 },
  ],
};

const overnightSchedule: AttendanceDaySchedule = {
  state: 'WORK_DAY',
  source: 'ROTATION',
  expectedBlocks: [
    { startTime: '16:00', endTime: '08:00', toleranceMinutes: 0 },
  ],
};

describe('business-calendar', () => {
  it('énumère les dates civiles sans dépendre du fuseau de la machine', () => {
    assert.deepEqual(enumerateBusinessDates('2026-02-27', '2026-03-02'), [
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    assert.equal(addBusinessDays('2024-02-28', 1), '2024-02-29');
    assert.equal(getWeekdayKey('2026-08-05'), 'Wed');
  });

  it('rejette une date civile inexistante', () => {
    assert.throws(
      () => enumerateBusinessDates('2026-02-30', '2026-03-01'),
      BusinessCalendarInvariantError,
    );
  });

  it('finalise une journée normale à l’heure de fin attendue', () => {
    assert.equal(
      hasExpectedWorkDayEnded('2026-08-05', daytimeSchedule, {
        date: '2026-08-05',
        time: '16:59',
      }),
      false,
    );
    assert.equal(
      hasExpectedWorkDayEnded('2026-08-05', daytimeSchedule, {
        date: '2026-08-05',
        time: '17:00',
      }),
      true,
    );
  });

  it('ne finalise une garde qu’après sa fin le lendemain', () => {
    assert.equal(
      hasExpectedWorkDayEnded('2026-08-05', overnightSchedule, {
        date: '2026-08-05',
        time: '23:59',
      }),
      false,
    );
    assert.equal(
      hasExpectedWorkDayEnded('2026-08-05', overnightSchedule, {
        date: '2026-08-06',
        time: '08:00',
      }),
      true,
    );
  });
});
