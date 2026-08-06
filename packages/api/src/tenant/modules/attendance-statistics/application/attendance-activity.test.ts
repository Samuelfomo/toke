import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggregateAttendanceActivities,
  parsePostgresIntervalMinutes,
} from './attendance-activity.js';
import type {
  AttendanceSessionEntryRecord,
  AttendanceSessionRecord,
  AttendanceTimestamp,
} from './attendance-day-service.types.js';

function timestamp(
  businessDate: string,
  businessTime: string,
  iso: string,
): AttendanceTimestamp {
  return {
    businessDate,
    businessTime,
    epochMilliseconds: Date.parse(iso),
  };
}

function pauseEntry(
  id: number,
  kind: 'PAUSE_START' | 'PAUSE_END',
  businessTime: string,
  iso: string,
): AttendanceSessionEntryRecord {
  return {
    id,
    kind,
    occurredAt: timestamp('2026-08-05', businessTime, iso),
  };
}

function session(overrides: Partial<AttendanceSessionRecord> = {}): AttendanceSessionRecord {
  return {
    id: 1,
    employeeId: 10,
    status: 'CLOSED',
    startedAt: timestamp('2026-08-05', '08:00', '2026-08-05T07:00:00Z'),
    endedAt: timestamp('2026-08-05', '17:00', '2026-08-05T16:00:00Z'),
    totalWorkDuration: '9 hours',
    totalPauseDuration: '1 hour',
    entries: [],
    ...overrides,
  };
}

describe('parsePostgresIntervalMinutes', () => {
  it('accepte les formats textuel, horloge et ISO', () => {
    assert.equal(parsePostgresIntervalMinutes('8 hours 30 minutes'), 510);
    assert.equal(parsePostgresIntervalMinutes('08:30:00'), 510);
    assert.equal(parsePostgresIntervalMinutes('1 day 02:30:00'), 1_590);
    assert.equal(parsePostgresIntervalMinutes('PT8H30M'), 510);
  });

  it('refuse une durée invalide au lieu de la convertir en zéro', () => {
    assert.equal(parsePostgresIntervalMinutes('unknown interval'), null);
    assert.equal(parsePostgresIntervalMinutes('-1 hour'), null);
  });
});

describe('aggregateAttendanceActivities', () => {
  it('regroupe deux sessions dans une seule journée-employé', () => {
    const activities = aggregateAttendanceActivities([
      session({
        id: 1,
        endedAt: timestamp('2026-08-05', '12:00', '2026-08-05T11:00:00Z'),
        totalWorkDuration: '4 hours',
        totalPauseDuration: '0 minutes',
      }),
      session({
        id: 2,
        startedAt: timestamp('2026-08-05', '13:00', '2026-08-05T12:00:00Z'),
        totalWorkDuration: '4 hours',
        totalPauseDuration: '30 minutes',
      }),
    ]);

    assert.deepEqual(activities.get('10:2026-08-05'), {
      sessionCount: 2,
      openSessionCount: 0,
      incompleteSessionCount: 0,
      firstClockIn: '08:00',
      lastClockOut: '17:00',
      grossMinutes: 480,
      pauseMinutes: 30,
    });
  });

  it('rattache une garde à sa date de début', () => {
    const activities = aggregateAttendanceActivities([
      session({
        startedAt: timestamp('2026-08-05', '16:00', '2026-08-05T15:00:00Z'),
        endedAt: timestamp('2026-08-06', '08:00', '2026-08-06T07:00:00Z'),
        totalWorkDuration: '16 hours',
        totalPauseDuration: '0 minutes',
      }),
    ]);

    assert.equal(activities.size, 1);
    assert.equal(activities.get('10:2026-08-05')?.lastClockOut, '08:00');
  });

  it('rend les durées indisponibles dès qu’une session de la journée est ouverte', () => {
    const activities = aggregateAttendanceActivities([
      session(),
      session({
        id: 2,
        status: 'OPEN',
        startedAt: timestamp('2026-08-05', '18:00', '2026-08-05T17:00:00Z'),
        endedAt: null,
        totalWorkDuration: null,
        totalPauseDuration: null,
      }),
    ]);
    const activity = activities.get('10:2026-08-05');

    assert.equal(activity?.sessionCount, 2);
    assert.equal(activity?.openSessionCount, 1);
    assert.equal(activity?.grossMinutes, null);
    assert.equal(activity?.pauseMinutes, null);
  });

  it('classe une session abandonnée comme incomplète', () => {
    const activity = aggregateAttendanceActivities([
      session({ status: 'ABANDONED' }),
    ]).get('10:2026-08-05');

    assert.equal(activity?.incompleteSessionCount, 1);
    assert.equal(activity?.grossMinutes, null);
  });

  it('classe une session annoncée fermée mais sans fin comme incomplète, pas ouverte', () => {
    const activity = aggregateAttendanceActivities([
      session({
        status: 'CLOSED',
        endedAt: null,
        totalWorkDuration: null,
        totalPauseDuration: null,
      }),
    ]).get('10:2026-08-05');

    assert.equal(activity?.openSessionCount, 0);
    assert.equal(activity?.incompleteSessionCount, 1);
  });

  it('détecte une pause non refermée', () => {
    const activity = aggregateAttendanceActivities([
      session({
        totalPauseDuration: null,
        entries: [
          pauseEntry(1, 'PAUSE_START', '12:00', '2026-08-05T11:00:00Z'),
        ],
      }),
    ]).get('10:2026-08-05');

    assert.equal(activity?.incompleteSessionCount, 1);
    assert.equal(activity?.pauseMinutes, null);
  });

  it('reconstruit une pause complète lorsque la durée consolidée manque', () => {
    const activity = aggregateAttendanceActivities([
      session({
        totalPauseDuration: null,
        entries: [
          pauseEntry(1, 'PAUSE_START', '12:00', '2026-08-05T11:00:00Z'),
          pauseEntry(2, 'PAUSE_END', '12:45', '2026-08-05T11:45:00Z'),
        ],
      }),
    ]).get('10:2026-08-05');

    assert.equal(activity?.incompleteSessionCount, 0);
    assert.equal(activity?.pauseMinutes, 45);
  });
});
