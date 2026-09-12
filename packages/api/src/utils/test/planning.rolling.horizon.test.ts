import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRollingBoundaryState,
  buildRollingFairnessBaseline,
  buildRollingWindowLocks,
  buildRollingWindows,
  buildTemplateCatalog,
  commitEngineWindow,
  createCommittedState,
  rollingDayCount,
} from '../planning.rolling.horizon.js';
import type {
  EngineResult,
  EngineTemplate,
  PlanningEmployeeInput,
  PlanningRequirementInput,
} from '../suggestion.engine.js';

const standard: EngineTemplate = {
  guid: 'standard',
  name: 'Standard',
  definition: Object.fromEntries(
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => [day, [{ work: ['08:00', '16:00'] }]]),
  ) as any,
};
const guard: EngineTemplate = {
  guid: 'guard',
  name: 'Garde',
  definition: Object.fromEntries(
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => [day, [{ work: ['16:00', '23:59'] }]]),
  ) as any,
};
const continuation: EngineTemplate = {
  guid: 'continuation',
  name: 'Suite garde',
  definition: Object.fromEntries(
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => [day, [{ work: ['00:01', '08:00'] }]]),
  ) as any,
};

const employees: PlanningEmployeeInput[] = [
  {
    guid: 'e1', name: 'E1', code: 'E1', mode: 'ROTATING', rotationOrder: 1,
    maxWeeklyMinutes: null, fixedTemplate: null, fixedRestDayMode: 'TEMPLATE',
  },
  {
    guid: 'e2', name: 'E2', code: 'E2', mode: 'ROTATING', rotationOrder: 2,
    maxWeeklyMinutes: null, fixedTemplate: null, fixedRestDayMode: 'TEMPLATE',
  },
];

const requirements: PlanningRequirementInput[] = [
  {
    guid: 'r-standard', dayOfWeek: 'Mon', serviceType: 'STANDARD', minEmployees: 1,
    targetEmployees: 1, maxEmployees: 1, priority: 1, allocationMode: 'EXACT',
    template: standard, continuationTemplate: null, continuationDayOffset: 0,
    creditedMinutes: null, eligibility: { planningModes: ['ROTATING'], guardPoolRelation: 'ANY' },
  },
  {
    guid: 'r-guard', dayOfWeek: 'Sun', serviceType: 'GUARD', minEmployees: 1,
    targetEmployees: 1, maxEmployees: 1, priority: 1, allocationMode: 'EXACT',
    template: guard, continuationTemplate: continuation, continuationDayOffset: 1,
    creditedMinutes: 960, eligibility: { planningModes: ['ROTATING'], guardPoolRelation: 'ANY' },
  },
];

function fakeResult(from: string, to: string): EngineResult {
  const schedule: Record<string, string | null> = {};
  const reasons: Record<string, any> = {};
  let cursor = from;
  while (cursor <= to) {
    schedule[cursor] = standard.guid;
    reasons[cursor] = { templateName: 'Standard', templateGuid: standard.guid, confidence: 100, factors: [], source: 'GENERATED' };
    const date = new Date(`${cursor}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    cursor = date.toISOString().slice(0, 10);
  }
  return {
    items: [{ userGuid: 'e1', schedule, reasons }, { userGuid: 'e2', schedule: {}, reasons: {} }],
    conformityScore: 100,
    diagnostics: { violations: [], coverage: [], guardPools: [], weeklyLeaveGroups: [], fairnessScore: 100, coverageScore: 100 },
  };
}

test('30 days are split into windows no larger than 21 days', () => {
  const windows = buildRollingWindows('2026-09-14', '2026-10-13');
  assert.equal(windows.length, 5);
  assert.ok(windows.every((window) => rollingDayCount(window.solveFrom, window.solveTo) <= 21));
  assert.equal(windows[0]?.commitFrom, '2026-09-14');
  assert.equal(windows.at(-1)?.commitTo, '2026-10-13');
  for (let index = 1; index < windows.length; index += 1) {
    const previous = windows[index - 1]!;
    const current = windows[index]!;
    const expected = new Date(`${previous.commitTo}T00:00:00.000Z`);
    expected.setUTCDate(expected.getUTCDate() + 1);
    assert.equal(current.commitFrom, expected.toISOString().slice(0, 10));
  }
});

test('three months stay bounded to 21-day CP-SAT windows', () => {
  const windows = buildRollingWindows('2026-09-14', '2026-12-13');
  assert.equal(windows.length, 13);
  assert.ok(windows.every((window) => rollingDayCount(window.solveFrom, window.solveTo) <= 21));
});

test('committed days become fairness carry only before the next solve window', () => {
  const state = createCommittedState(employees);
  commitEngineWindow(state, fakeResult('2026-09-14', '2026-09-20'), '2026-09-14', '2026-09-20');
  const templates = buildTemplateCatalog(employees, requirements, []);
  const fairness = buildRollingFairnessBaseline([
    { employeeGuid: 'e1', workedDays: 2, guardDays: 0, weekendWorkedDays: 0, workedMinutes: 960, restDays: 0, templateCounts: {} },
    { employeeGuid: 'e2', workedDays: 2, guardDays: 0, weekendWorkedDays: 0, workedMinutes: 960, restDays: 0, templateCounts: {} },
  ], state, '2026-09-21', requirements, templates);
  assert.equal(fairness.find((item) => item.employeeGuid === 'e1')?.workedDays, 9);
  assert.equal(fairness.find((item) => item.employeeGuid === 'e2')?.workedDays, 2);
});

test('manager lock overrides a generated overlap lock for the same employee/day', () => {
  const state = createCommittedState(employees);
  commitEngineWindow(state, fakeResult('2026-09-14', '2026-09-20'), '2026-09-14', '2026-09-20');
  const window = buildRollingWindows('2026-09-14', '2026-10-13')[1]!;
  const templates = buildTemplateCatalog(employees, requirements, []);
  const result = buildRollingWindowLocks(
    state,
    window,
    [{ employeeGuid: 'e1', date: '2026-09-17', templateGuid: null, requirementGuid: null }],
    requirements,
    templates,
  );
  const lock = result.locks.find((item) => item.employeeGuid === 'e1' && item.date === '2026-09-17');
  assert.equal(lock?.templateGuid, null);
});

test('a committed guard creates a boundary continuation for a later rolling window', () => {
  const state = createCommittedState(employees);
  state.schedules.get('e1')!['2026-09-20'] = 'guard';
  const boundary = buildRollingBoundaryState(state, '2026-09-21', requirements);
  assert.equal(boundary.guardContinuations.length, 1);
  assert.equal(boundary.guardContinuations[0]?.continuationDate, '2026-09-21');
  assert.equal(boundary.guardContinuations[0]?.continuationTemplate.guid, 'continuation');
});
