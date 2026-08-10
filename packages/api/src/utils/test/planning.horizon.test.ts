function fail(message: string): never {
  throw new Error(message);
}

const assert = {
  equal(actual: unknown, expected: unknown, message = 'Values differ'): void {
    if (actual !== expected) fail(`${message}: ${String(actual)} !== ${String(expected)}`);
  },
  deepEqual(actual: unknown, expected: unknown, message = 'Objects differ'): void {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) fail(`${message}: ${left} !== ${right}`);
  },
};

import {
  normalizePlanningHorizon,
  projectEngineResultToRequestedPeriod,
} from '../planning.horizon.js';

const fullWeekConfig = {
  minRestDaysPerWeek: 0,
  maxWeeklyMinutes: null,
  weeklyLeavePolicy: {
    mode: 'PER_ELIGIBLE_EMPLOYEE',
    completeWeeksOnly: true,
  },
  guardTeamPolicy: {
    mode: 'WEEKLY_POOL',
    completeWeeksOnly: true,
  },
};

const arbitrary = normalizePlanningHorizon(
  '2026-08-06',
  '2026-08-20',
  { config: fullWeekConfig },
);

assert.deepEqual(arbitrary, {
  requestedFrom: '2026-08-06',
  requestedTo: '2026-08-20',
  solveFrom: '2026-08-03',
  solveTo: '2026-08-23',
  expandedBeforeDays: 3,
  expandedAfterDays: 3,
  completeWeekExpansionApplied: true,
});

const aligned = normalizePlanningHorizon(
  '2026-08-10',
  '2026-08-16',
  { config: fullWeekConfig },
);
assert.equal(aligned.solveFrom, '2026-08-10');
assert.equal(aligned.solveTo, '2026-08-16');
assert.equal(aligned.completeWeekExpansionApplied, false);

const noWeeklyPolicy = normalizePlanningHorizon(
  '2026-08-06',
  '2026-08-20',
  {
    config: {
      minRestDaysPerWeek: 0,
      maxWeeklyMinutes: null,
      weeklyLeavePolicy: {
        mode: 'NONE',
        completeWeeksOnly: true,
      },
      guardTeamPolicy: {
        mode: 'DAILY_FLEXIBLE',
        completeWeeksOnly: true,
      },
    },
  },
);
assert.equal(noWeeklyPolicy.solveFrom, '2026-08-06');
assert.equal(noWeeklyPolicy.solveTo, '2026-08-20');

const projected = projectEngineResultToRequestedPeriod(
  {
    items: [
      {
        userGuid: 'employee-1',
        schedule: {
          '2026-08-03': 'context-prefix',
          '2026-08-06': 'visible',
          '2026-08-20': 'guard-start',
          '2026-08-21': 'guard-end',
          '2026-08-22': 'context-suffix',
        },
        reasons: {
          '2026-08-03': {
            source: 'GENERATED',
            factors: ['Contexte technique'],
          },
          '2026-08-06': {
            source: 'GENERATED',
            factors: ['Jour demandé'],
          },
          '2026-08-20': {
            source: 'GENERATED',
            factors: ['Jour demandé'],
          },
          '2026-08-21': {
            source: 'GUARD_CONTINUATION',
            factors: [
              'Suite automatique de la garde commencée le 2026-08-20',
            ],
          },
          '2026-08-22': {
            source: 'GENERATED',
            factors: ['Contexte technique'],
          },
        },
      },
    ],
    conformityScore: 100,
    diagnostics: {
      violations: [],
      coverage: [
        { date: '2026-08-03', target: 1, assigned: 1 },
        { date: '2026-08-06', target: 1, assigned: 1 },
        { date: '2026-08-20', target: 1, assigned: 1 },
        { date: '2026-08-22', target: 1, assigned: 1 },
      ],
      guardPools: [
        {
          weekFrom: '2026-08-03',
          weekTo: '2026-08-09',
          employeeGuids: ['employee-1'],
        },
        {
          weekFrom: '2026-08-24',
          weekTo: '2026-08-30',
          employeeGuids: ['employee-1'],
        },
      ],
      weeklyLeaveGroups: [
        {
          weekFrom: '2026-08-03',
          weekTo: '2026-08-09',
          employeeGuids: ['employee-1'],
          leaveByEmployee: {
            'employee-1': ['2026-08-04', '2026-08-07'],
          },
        },
      ],
      fairnessScore: 80,
      coverageScore: 100,
    },
  },
  arbitrary,
);

assert.deepEqual(Object.keys(projected.items[0]!.schedule), [
  '2026-08-06',
  '2026-08-20',
  '2026-08-21',
]);
assert.deepEqual(
  projected.diagnostics.coverage.map((slot) => slot.date),
  ['2026-08-06', '2026-08-20'],
);
assert.equal(projected.diagnostics.guardPools.length, 1);
assert.deepEqual(
  projected.diagnostics.weeklyLeaveGroups[0]!.leaveByEmployee,
  { 'employee-1': ['2026-08-07'] },
);
assert.equal(projected.diagnostics.coverageScore, 100);
assert.equal(projected.conformityScore, 95);

console.log({
  status: 'ok',
  arbitrary,
  projectedDates: Object.keys(projected.items[0]!.schedule),
});
