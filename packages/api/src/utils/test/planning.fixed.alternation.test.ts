import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseFixedAlternationPolicy,
  prepareFixedAlternation,
} from '../planning.fixed.alternation.js';
import { buildRollingWindows } from '../planning.rolling.horizon.js';
import { legacyPlanningSolverPayload, type PlanningSolverInput } from '../solver/planning.solver.js';
import type { PlanningEmployeeInput } from '../suggestion.engine.js';

const input = {
  enabled: true,
  employee_guids: ['101', '102'],
  template_guids: ['202', '201'],
  anchor_date: '2026-11-30',
  shift_cadence_days: 1,
  weekend_rest: 'ALTERNATE_SAT_SUN',
};

const employees: PlanningEmployeeInput[] = [101, 102, 103].map((id, index) => ({
  guid: String(id), name: String(id), code: String(id), mode: 'FIXED',
  rotationOrder: 11 + index, maxWeeklyMinutes: 2400,
  fixedRestDayMode: index ? 'ROTATING' : 'TEMPLATE',
  fixedTemplate: { guid: String(201 + index), name: String(id), definition: {} },
}));

test('validates pairs, dates, cadence, states and unknown fields', () => {
  assert.deepEqual(parseFixedAlternationPolicy(input), input);
  assert.equal(parseFixedAlternationPolicy(null), null);
  for (const changes of [
    { employee_guids: ['101', '101'] }, { template_guids: ['201', '201'] },
    { anchor_date: '2026-02-30' }, { weekend_rest: 'FRIDAY' },
    { shift_cadence_days: 0 }, { shift_cadence_days: 1.5 },
    { enabled: 'yes' }, { unknown: true },
  ]) {
    assert.throws(() => parseFixedAlternationPolicy({ ...input, ...changes }), {
      code: 'PLANNING_FIXED_ALTERNATION_INVALID',
    });
  }
});

test('prepares an optional pair without changing profiles, including exclusion and drift', () => {
  const before = structuredClone(employees);
  assert.equal(prepareFixedAlternation(null, employees), undefined);
  assert.equal(prepareFixedAlternation(parseFixedAlternationPolicy({ ...input, enabled: false }), employees), undefined);
  const policy = parseFixedAlternationPolicy(input)!;
  const prepared = prepareFixedAlternation(policy, employees);
  assert.equal(prepared?.status, 'PENDING_SOLVER_SUPPORT');
  assert.deepEqual(prepared?.policy?.templates.map(template => template.guid), input.template_guids);
  assert.deepEqual(prepared?.policy?.employeeGuids, input.employee_guids);
  assert.deepEqual(employees, before);
  assert.equal(prepareFixedAlternation(policy, employees.slice(1))?.status, 'NOT_APPLICABLE');
  assert.equal(prepareFixedAlternation(policy, [{ ...employees[0]!, mode: 'ROTATING' }, ...employees.slice(1)])?.status, 'INCOMPATIBLE_PROFILES');
});

test('keeps the anchor across month and year boundaries and preserves explicit locks on the legacy wire', () => {
  const commands = [
    ...buildRollingWindows('2026-12-01', '2026-12-31'),
    ...buildRollingWindows('2027-01-01', '2027-01-31'),
  ];
  const policy = prepareFixedAlternation(parseFixedAlternationPolicy(input), employees)!.policy!;
  const lock = { employeeGuid: '101', date: '2026-12-29', templateGuid: '202', requirementGuid: null };
  for (const window of commands) {
    const payload = {
      employees, fixedAlternationPolicy: policy, periodFrom: window.solveFrom, periodTo: window.solveTo,
      lockedAssignments: [lock],
    } as PlanningSolverInput;
    assert.equal(payload.fixedAlternationPolicy?.anchorDate, input.anchor_date);
    assert.ok(!('fixedAlternationPolicy' in legacyPlanningSolverPayload(payload)));
    assert.deepEqual(legacyPlanningSolverPayload(payload).lockedAssignments, [lock]);
    assert.deepEqual(legacyPlanningSolverPayload(payload).employees, employees);
  }
});

test('negotiated transport keeps ordered pairs and the API summarizes observed deviations', async () => {
  const { planningSolverPayload } = await import('../solver/planning.solver.js');
  const { summarizeFixedAlternation } = await import('../planning.fixed.alternation.js');
  const policy = prepareFixedAlternation(parseFixedAlternationPolicy(input), employees)!.policy!;
  const payload = { fixedAlternationPolicy: policy } as PlanningSolverInput;
  assert.deepEqual(planningSolverPayload(payload, false), {});
  assert.deepEqual(planningSolverPayload(payload, true), {
    fixed_alternation_policy: { ...input, contract_version: 1 },
  });
  const check = {
    date: '2026-12-01', kind: 'SHIFT' as const,
    expected: ['201', '202'] as [string, string],
    actual: ['201', '202'] as [string, string],
    lockedEmployeeGuids: [],
  };
  const evaluation = { contractVersion: 1 as const, employeeGuids: policy.employeeGuids, checks: [check] };
  assert.equal(summarizeFixedAlternation(evaluation).status, 'APPLIED');
  assert.equal(summarizeFixedAlternation({ ...evaluation, checks: [] }).applied, false);
  const conflict = { ...check, actual: ['201', '201'] as [string, string] };
  assert.equal(summarizeFixedAlternation({ ...evaluation, checks: [conflict] }).status, 'NOT_RESPECTED');
  assert.equal(summarizeFixedAlternation({ ...evaluation, checks: [check, conflict] }).status, 'PARTIALLY_APPLIED');
});
