import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAttendanceDay } from '../domain/attendance-day.js';
import type {
  AttendanceDay,
  AttendanceDayActivityInput,
  AttendanceDaySchedule,
  AttendanceStatus,
} from '../domain/attendance-day.types.js';
import {
  AttendanceOverviewInvariantError,
  buildAttendanceOverview,
} from './attendance-overview.js';
import type { BuildAttendanceOverviewInput } from './attendance-overview.types.js';

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

const restDay: AttendanceDaySchedule = {
  state: 'REST_DAY',
  source: 'DIRECT',
  expectedBlocks: [],
};

const missingSchedule: AttendanceDaySchedule = {
  state: 'UNRESOLVED',
  source: null,
  expectedBlocks: [],
  issue: 'MISSING_SCHEDULE',
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

const completeActivity: AttendanceDayActivityInput = {
  sessionCount: 1,
  openSessionCount: 0,
  incompleteSessionCount: 0,
  firstClockIn: '08:05',
  lastClockOut: '17:00',
  grossMinutes: 540,
  pauseMinutes: 60,
};

function makeDay(options: {
  employeeId: number;
  date: string;
  schedule?: AttendanceDaySchedule;
  activity?: AttendanceDayActivityInput;
  ended?: boolean;
}): AttendanceDay {
  return createAttendanceDay({
    employeeId: options.employeeId,
    employeeGuid: `employee-${options.employeeId}`,
    date: options.date,
    schedule: options.schedule ?? workDay,
    activity: options.activity ?? completeActivity,
    hasExpectedWorkDayEnded: options.ended ?? true,
  });
}

function input(days: readonly AttendanceDay[]): BuildAttendanceOverviewInput {
  return {
    period: {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    },
    managerGuid: 'manager-guid',
    generatedAt: '2026-07-31T18:00:00+01:00',
    businessTimezone: 'Africa/Douala',
    days,
  };
}

describe('buildAttendanceOverview', () => {
  it('calcule les taux sur les seules journées employé attendues et finalisées', () => {
    const days = [
      makeDay({ employeeId: 1, date: '2026-07-01' }),
      makeDay({
        employeeId: 2,
        date: '2026-07-01',
        activity: { ...completeActivity, firstClockIn: '08:20' },
      }),
      makeDay({
        employeeId: 3,
        date: '2026-07-01',
        activity: noActivity,
      }),
      makeDay({
        employeeId: 1,
        date: '2026-07-02',
        schedule: restDay,
        activity: noActivity,
      }),
      makeDay({
        employeeId: 2,
        date: '2026-07-02',
        schedule: missingSchedule,
      }),
      makeDay({
        employeeId: 3,
        date: '2026-07-02',
        activity: noActivity,
        ended: false,
      }),
    ];

    const overview = buildAttendanceOverview(input(days));

    assert.deepEqual(overview.attendance, {
      status: 'PARTIAL',
      unavailability_reason: null,
      employee_working_days_expected: 3,
      present_employee_days: 1,
      late_employee_days: 1,
      absent_employee_days: 1,
      attendance_rate: 66.67,
      absence_rate: 33.33,
      punctuality_rate: 50,
      total_delay_minutes: 20,
      average_delay_minutes: 20,
    });

    assert.deepEqual(overview.scope, {
      manager_guid: 'manager-guid',
      employees_evaluated: 3,
      employee_days_evaluated: 6,
    });
    assert.equal(overview.data_quality.schedule.coverage_rate, 83.33);
    assert.equal(overview.signals.presence_without_schedule_employee_days, 1);
  });

  it('compte une journée avec plusieurs sessions une seule fois comme journée active', () => {
    const day = makeDay({
      employeeId: 1,
      date: '2026-07-01',
      activity: {
        ...completeActivity,
        sessionCount: 2,
        grossMinutes: 480,
        pauseMinutes: 30,
      },
    });

    const overview = buildAttendanceOverview(input([day]));

    assert.equal(overview.recorded_activity.employees_with_activity, 1);
    assert.equal(overview.recorded_activity.employee_days_with_activity, 1);
    assert.equal(overview.recorded_activity.sessions.total, 2);
  });

  it('retourne des taux null quand aucun planning exploitable ne fournit de dénominateur', () => {
    const overview = buildAttendanceOverview(
      input([
        makeDay({
          employeeId: 1,
          date: '2026-07-01',
          schedule: missingSchedule,
        }),
      ]),
    );

    assert.equal(overview.attendance.status, 'NOT_COMPUTABLE');
    assert.equal(
      overview.attendance.unavailability_reason,
      'INSUFFICIENT_SCHEDULE_DATA',
    );
    assert.equal(overview.attendance.attendance_rate, null);
    assert.equal(overview.attendance.absence_rate, null);
    assert.equal(overview.attendance.punctuality_rate, null);
    assert.equal(overview.data_quality.status, 'INSUFFICIENT');
    assert.equal(overview.data_quality.schedule.coverage_rate, 0);
  });

  it('distingue l’absence de journée finalisée d’un planning insuffisant', () => {
    const overview = buildAttendanceOverview(
      input([
        makeDay({
          employeeId: 1,
          date: '2026-07-01',
          activity: noActivity,
          ended: false,
        }),
        makeDay({
          employeeId: 1,
          date: '2026-07-02',
          schedule: restDay,
          activity: noActivity,
        }),
      ]),
    );

    assert.equal(overview.attendance.status, 'NOT_COMPUTABLE');
    assert.equal(
      overview.attendance.unavailability_reason,
      'NO_FINALIZED_EXPECTED_WORK_DAY',
    );
    assert.equal(overview.data_quality.status, 'RELIABLE');
  });

  it('retourne un résultat explicite pour un périmètre sans journée employé', () => {
    const overview = buildAttendanceOverview(input([]));

    assert.equal(overview.scope.employees_evaluated, 0);
    assert.equal(overview.attendance.unavailability_reason, 'NO_EMPLOYEE_DAY');
    assert.equal(overview.attendance.attendance_rate, null);
    assert.equal(overview.data_quality.status, 'INSUFFICIENT');
    assert.deepEqual(overview.data_quality.reasons, ['NO_EMPLOYEE_DAY']);
    assert.equal(overview.data_quality.schedule.coverage_rate, null);
    assert.equal(overview.data_quality.duration.status, 'NOT_APPLICABLE');
    assert.deepEqual(overview.recorded_activity.durations, {
      known_gross_minutes: 0,
      known_pause_minutes: 0,
      known_net_minutes: 0,
    });
  });

  it('rend explicite une couverture de durée partielle', () => {
    const complete = makeDay({ employeeId: 1, date: '2026-07-01' });
    const open = makeDay({
      employeeId: 2,
      date: '2026-07-01',
      ended: false,
      activity: {
        sessionCount: 1,
        openSessionCount: 1,
        incompleteSessionCount: 0,
        firstClockIn: '08:03',
        lastClockOut: null,
        grossMinutes: null,
        pauseMinutes: null,
      },
    });

    const overview = buildAttendanceOverview(input([complete, open]));

    assert.deepEqual(overview.recorded_activity.durations, {
      known_gross_minutes: 540,
      known_pause_minutes: 60,
      known_net_minutes: 480,
    });
    assert.deepEqual(overview.data_quality.duration, {
      status: 'PARTIAL',
      employee_days_with_activity: 2,
      complete_employee_days: 1,
      incomplete_employee_days: 1,
      coverage_rate: 50,
    });
    assert.equal(overview.data_quality.status, 'PARTIAL');
    assert.deepEqual(overview.data_quality.reasons, ['OPEN_SESSION']);
  });

  it('ne transforme pas une présence en cours de journée en journée attendue finalisée', () => {
    const day = makeDay({ employeeId: 1, date: '2026-07-31', ended: false });
    const overview = buildAttendanceOverview(input([day]));

    assert.equal(day.result.status, 'PRESENT');
    assert.equal(overview.attendance.employee_working_days_expected, 0);
    assert.equal(overview.attendance.attendance_rate, null);
    assert.equal(overview.recorded_activity.employee_days_with_activity, 1);
  });

  it('compte les signaux par journée employé et non par session', () => {
    const onRest = makeDay({
      employeeId: 1,
      date: '2026-07-01',
      schedule: restDay,
      activity: { ...completeActivity, sessionCount: 3 },
    });
    const withoutSchedule = makeDay({
      employeeId: 2,
      date: '2026-07-01',
      schedule: missingSchedule,
      activity: { ...completeActivity, sessionCount: 2 },
    });

    const overview = buildAttendanceOverview(input([onRest, withoutSchedule]));

    assert.deepEqual(overview.signals, {
      presence_on_rest_day_employee_days: 1,
      presence_without_schedule_employee_days: 1,
    });
    assert.equal(overview.recorded_activity.sessions.total, 5);
  });

  it('expose séparément une impossibilité de reconstruire le planning historique', () => {
    const historicalUnavailable: AttendanceDaySchedule = {
      state: 'UNRESOLVED',
      source: 'ROTATION',
      expectedBlocks: [],
      issue: 'HISTORICAL_SCHEDULE_UNAVAILABLE',
    };
    const overview = buildAttendanceOverview(
      input([
        makeDay({
          employeeId: 1,
          date: '2026-07-01',
          schedule: historicalUnavailable,
          activity: noActivity,
        }),
      ]),
    );

    assert.deepEqual(overview.data_quality.reasons, [
      'HISTORICAL_SCHEDULE_UNAVAILABLE',
    ]);
    assert.equal(
      overview.data_quality.schedule.historical_schedule_unavailable_employee_days,
      1,
    );
    assert.equal(overview.attendance.attendance_rate, null);
  });

  it('rejette deux objets pour le même couple employé et date', () => {
    const day = makeDay({ employeeId: 1, date: '2026-07-01' });

    assert.throws(
      () => buildAttendanceOverview(input([day, day])),
      AttendanceOverviewInvariantError,
    );
  });

  it('rejette une journée située hors de la période demandée', () => {
    const day = makeDay({ employeeId: 1, date: '2026-08-01' });

    assert.throws(
      () => buildAttendanceOverview(input([day])),
      AttendanceOverviewInvariantError,
    );
  });

  it('rejette un statut non admissible marqué à tort comme éligible aux taux', () => {
    const day = makeDay({
      employeeId: 1,
      date: '2026-07-01',
      schedule: restDay,
      activity: noActivity,
    });
    const malformedStatus: AttendanceStatus = 'REST_DAY';
    const malformed: AttendanceDay = {
      ...day,
      result: {
        status: malformedStatus,
        delayMinutes: null,
        rateEligible: true,
      },
    };

    assert.throws(
      () => buildAttendanceOverview(input([malformed])),
      AttendanceOverviewInvariantError,
    );
  });
});
