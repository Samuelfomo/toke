import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AttendanceDayInvariantError, createAttendanceDay } from './attendance-day.js';
import type {
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
  CreateAttendanceDayInput,
} from './attendance-day.types.js';

const finalizedActivity: AttendanceDayActivityInput = {
  sessionCount: 1,
  openSessionCount: 0,
  incompleteSessionCount: 0,
  firstClockIn: '08:05:42',
  lastClockOut: '17:00:00',
  grossMinutes: 540,
  pauseMinutes: 60,
};

const noActivity: AttendanceDayActivityInput = {
  sessionCount: 0,
  openSessionCount: 0,
  incompleteSessionCount: 0,
  firstClockIn: null,
  lastClockOut: null,
  grossMinutes: null,
  pauseMinutes: null,
};

const workDay: AttendanceDaySchedule = {
  state: 'WORK_DAY',
  source: 'DIRECT',
  expectedBlocks: [
    {
      startTime: '08:00',
      endTime: '17:00',
      toleranceMinutes: 10,
    },
  ],
};

function makeInput(overrides: Partial<CreateAttendanceDayInput> = {}): CreateAttendanceDayInput {
  return {
    employeeId: 12,
    employeeGuid: 'employee-guid-12',
    date: '2026-07-21',
    schedule: workDay,
    activity: finalizedActivity,
    hasExpectedWorkDayEnded: true,
    ...overrides,
  };
}

describe('createAttendanceDay', () => {
  it('classe PRESENT dans la tolérance et calcule les durées', () => {
    const day = createAttendanceDay(makeInput());

    assert.equal(day.result.status, 'PRESENT');
    assert.equal(day.result.delayMinutes, 5);
    assert.equal(day.result.rateEligible, true);
    assert.equal(day.activity.hasActivity, true);
    assert.equal(day.activity.netMinutes, 480);
    assert.deepEqual(day.issues, []);
  });

  it('considère la limite exacte de tolérance comme PRESENT', () => {
    const day = createAttendanceDay(
      makeInput({
        activity: { ...finalizedActivity, firstClockIn: '08:10' },
      }),
    );

    assert.equal(day.result.status, 'PRESENT');
    assert.equal(day.result.delayMinutes, 10);
  });

  it('classe LATE uniquement au-delà de la tolérance', () => {
    const day = createAttendanceDay(
      makeInput({
        activity: { ...finalizedActivity, firstClockIn: '08:11' },
      }),
    );

    assert.equal(day.result.status, 'LATE');
    assert.equal(day.result.delayMinutes, 11);
    assert.equal(day.result.rateEligible, true);
  });

  it('conserve un retard connu de zéro pour une arrivée anticipée', () => {
    const day = createAttendanceDay(
      makeInput({
        activity: { ...finalizedActivity, firstClockIn: '07:45' },
      }),
    );

    assert.equal(day.result.status, 'PRESENT');
    assert.equal(day.result.delayMinutes, 0);
  });

  it('classe PENDING sans activité tant que la journée attendue continue', () => {
    const day = createAttendanceDay(
      makeInput({ activity: noActivity, hasExpectedWorkDayEnded: false }),
    );

    assert.deepEqual(day.result, {
      status: 'PENDING',
      delayMinutes: null,
      rateEligible: false,
    });
  });

  it('classe ABSENT uniquement après la fin d’une journée de travail valide', () => {
    const day = createAttendanceDay(makeInput({ activity: noActivity }));

    assert.deepEqual(day.result, {
      status: 'ABSENT',
      delayMinutes: null,
      rateEligible: true,
    });
  });

  it('exclut du taux une présence enregistrée pendant une journée non terminée', () => {
    const day = createAttendanceDay(makeInput({ hasExpectedWorkDayEnded: false }));

    assert.equal(day.result.status, 'PRESENT');
    assert.equal(day.result.rateEligible, false);
  });

  it('conserve REST_DAY et signale séparément une présence ce jour-là', () => {
    const restSchedule: AttendanceDaySchedule = {
      state: 'REST_DAY',
      source: 'DIRECT',
      expectedBlocks: [],
    };

    const day = createAttendanceDay(makeInput({ schedule: restSchedule }));

    assert.equal(day.result.status, 'REST_DAY');
    assert.equal(day.result.rateEligible, false);
    assert.deepEqual(day.issues, ['PRESENCE_ON_REST_DAY']);
  });

  it('ne signale rien pour un jour de repos sans activité', () => {
    const restSchedule: AttendanceDaySchedule = {
      state: 'REST_DAY',
      source: 'ROTATION',
      expectedBlocks: [],
    };

    const day = createAttendanceDay(
      makeInput({ schedule: restSchedule, activity: noActivity }),
    );

    assert.equal(day.result.status, 'REST_DAY');
    assert.deepEqual(day.issues, []);
  });

  it('classe UNDETERMINED lorsque le planning manque', () => {
    const unresolvedSchedule: AttendanceDaySchedule = {
      state: 'UNRESOLVED',
      source: null,
      expectedBlocks: [],
      issue: 'MISSING_SCHEDULE',
    };

    const day = createAttendanceDay(
      makeInput({ schedule: unresolvedSchedule, activity: noActivity }),
    );

    assert.equal(day.result.status, 'UNDETERMINED');
    assert.equal(day.result.rateEligible, false);
    assert.deepEqual(day.issues, ['MISSING_SCHEDULE']);
  });

  it('distingue une présence sans planning d’un jour de repos', () => {
    const unresolvedSchedule: AttendanceDaySchedule = {
      state: 'UNRESOLVED',
      source: null,
      expectedBlocks: [],
      issue: 'MISSING_SCHEDULE',
    };

    const day = createAttendanceDay(makeInput({ schedule: unresolvedSchedule }));

    assert.equal(day.result.status, 'UNDETERMINED');
    assert.deepEqual(day.issues, ['MISSING_SCHEDULE', 'PRESENCE_WITHOUT_SCHEDULE']);
  });

  it('transforme un WORK_DAY sans bloc en planning invalide et indéterminé', () => {
    const invalidSchedule: AttendanceDaySchedule = {
      state: 'WORK_DAY',
      source: 'DIRECT',
      expectedBlocks: [],
    };

    const day = createAttendanceDay(
      makeInput({ schedule: invalidSchedule, activity: noActivity }),
    );

    assert.deepEqual(day.schedule, {
      state: 'UNRESOLVED',
      source: 'DIRECT',
      expectedBlocks: [],
      issue: 'INVALID_SCHEDULE',
    });
    assert.equal(day.result.status, 'UNDETERMINED');
    assert.equal(day.result.rateEligible, false);
    assert.deepEqual(day.issues, ['INVALID_SCHEDULE']);
  });

  it('signale aussi la présence lorsque le planning fourni est invalide', () => {
    const invalidSchedule: AttendanceDaySchedule = {
      state: 'WORK_DAY',
      source: 'ROTATION',
      expectedBlocks: [
        {
          startTime: '25:00',
          endTime: '17:00',
          toleranceMinutes: 10,
        },
      ],
    };

    const day = createAttendanceDay(makeInput({ schedule: invalidSchedule }));

    assert.equal(day.result.status, 'UNDETERMINED');
    assert.deepEqual(day.issues, ['INVALID_SCHEDULE', 'PRESENCE_WITHOUT_SCHEDULE']);
  });

  it('signale les sessions ouvertes sans inventer une durée manquante', () => {
    const day = createAttendanceDay(
      makeInput({
        hasExpectedWorkDayEnded: false,
        activity: {
          sessionCount: 1,
          openSessionCount: 1,
          incompleteSessionCount: 0,
          firstClockIn: '08:02',
          lastClockOut: null,
          grossMinutes: null,
          pauseMinutes: null,
        },
      }),
    );

    assert.equal(day.result.status, 'PRESENT');
    assert.equal(day.activity.netMinutes, null);
    assert.deepEqual(day.issues, ['OPEN_SESSION']);
  });

  it('signale une durée manquante sur une session finalisée', () => {
    const day = createAttendanceDay(
      makeInput({
        activity: {
          ...finalizedActivity,
          grossMinutes: null,
          pauseMinutes: null,
        },
      }),
    );

    assert.equal(day.result.status, 'PRESENT');
    assert.deepEqual(day.issues, ['MISSING_DURATION']);
  });

  it('rejette une activité incohérente au lieu de produire une fausse statistique', () => {
    assert.throws(
      () =>
        createAttendanceDay(
          makeInput({
            activity: {
              ...noActivity,
              sessionCount: 1,
            },
          }),
        ),
      AttendanceDayInvariantError,
    );
  });
});
