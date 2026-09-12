import assert from 'node:assert/strict';

import type {
  EngineConfig,
  PlanningEmployeeInput,
  PlanningRequirementInput,
} from '../suggestion.engine.js';
import { validatePlanningPreflight } from '../planning.preflight.validation.service.js';

const work = (from: string, to: string) => [
  { work: [from, to] as [string, string], pause: null, tolerance: 0 },
];

function employee(index: number): PlanningEmployeeInput {
  return {
    guid: `E${index}`,
    name: `Employee ${index}`,
    code: `E${index}`,
    mode: 'ROTATING',
    rotationOrder: index,
    maxWeeklyMinutes: null,
    fixedRestDayMode: 'TEMPLATE',
    fixedTemplate: null,
  };
}

function config(): EngineConfig {
  return {
    minRestDaysPerWeek: 1,
    maxConsecutiveWorkDays: 6,
    maxWeeklyMinutes: null,
    minRestMinutesBetweenShifts: 660,
    maxConsecutiveGuards: 1,
    restAfterGuardRequired: false,
    postGuardRestDays: 0,
    maxRestingEmployeesPerDay: null,
    fairnessWindowWeeks: 8,
    strictCoverage: true,
    weeklyLeavePolicy: {
      mode: 'NONE',
      employeesPerWeek: 1,
      allowedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      rotationAnchorDate: null,
      completeWeeksOnly: true,
      postGuardRestCountsAsLeave: false,
      selector: { planningModes: ['ROTATING'], guardPoolRelation: 'ANY' },
      daysPerEmployee: 1,
      countMode: 'EXACT',
      maxEmployeesPerDay: null,
      requireWorkOnOtherDays: false,
      serviceScope: {
        mode: 'ANY',
        serviceTypes: [],
        templateGuids: [],
        requirementGuids: [],
        exclusive: false,
      },
    },
    guardTeamPolicy: {
      mode: 'DAILY_FLEXIBLE',
      employeesPerWeek: 1,
      selectionMode: 'ROTATION_ORDER',
      rotationAnchorDate: null,
      completeWeeksOnly: true,
      requireParticipation: true,
      eligiblePlanningModes: ['ROTATING'],
      memberServiceAccess: 'ANY_SERVICE',
      balance: {
        mode: 'NONE',
        maxMembershipSpread: null,
        maxConsecutiveMembershipWeeks: null,
      },
    },
  };
}

function standardRequirement(min: number): PlanningRequirementInput {
  return {
    guid: 'STD-MON',
    dayOfWeek: 'Mon',
    serviceType: 'STANDARD',
    allocationMode: 'EXACT',
    minEmployees: min,
    targetEmployees: min,
    maxEmployees: min,
    priority: 100,
    template: {
      guid: 'STD',
      name: 'Standard',
      definition: { Mon: work('08:00', '16:00') },
    },
    continuationTemplate: null,
    continuationDayOffset: 0,
    creditedMinutes: null,
    eligibility: { planningModes: ['ROTATING'], guardPoolRelation: 'ANY' },
  };
}

function guardRequirement(day: 'Mon' | 'Tue', min: number): PlanningRequirementInput {
  const next = day === 'Mon' ? 'Tue' : 'Wed';
  return {
    guid: `GUARD-${day}`,
    dayOfWeek: day,
    serviceType: 'GUARD',
    allocationMode: 'EXACT',
    minEmployees: min,
    targetEmployees: min,
    maxEmployees: min,
    priority: 100,
    template: {
      guid: 'GUARD-START',
      name: 'Guard start',
      definition: { [day]: work('16:00', '23:59') },
    },
    continuationTemplate: {
      guid: 'GUARD-END',
      name: 'Guard end',
      definition: { [next]: work('00:00', '08:00') },
    },
    continuationDayOffset: 1,
    creditedMinutes: 960,
    eligibility: { planningModes: ['ROTATING'], guardPoolRelation: 'ANY' },
  };
}

{
  const report = validatePlanningPreflight({
    employees: [employee(1), employee(2), employee(3)],
    requirements: [standardRequirement(2)],
    config: config(),
    periodFrom: '2026-09-07',
    periodTo: '2026-09-13',
  });
  assert.equal(report.valid, true);
}

{
  const report = validatePlanningPreflight({
    employees: [employee(1), employee(2)],
    requirements: [standardRequirement(3)],
    config: config(),
    periodFrom: '2026-09-07',
    periodTo: '2026-09-13',
  });
  assert.equal(report.valid, false);
  assert.ok(
    report.issues.some((issue) => issue.code === 'PREFLIGHT_REQUIREMENT_CAPACITY_INSUFFICIENT'),
  );
}

{
  const cfg = config();
  cfg.guardTeamPolicy.mode = 'WEEKLY_POOL';
  cfg.guardTeamPolicy.employeesPerWeek = 6;
  cfg.guardTeamPolicy.memberServiceAccess = 'GUARD_ONLY';
  cfg.guardTeamPolicy.rotationAnchorDate = '2026-09-07';

  const standard = standardRequirement(5);
  standard.eligibility.guardPoolRelation = 'NON_MEMBER';

  const report = validatePlanningPreflight({
    employees: Array.from({ length: 10 }, (_, index) => employee(index + 1)),
    requirements: [standard, guardRequirement('Mon', 3)],
    config: cfg,
    periodFrom: '2026-09-07',
    periodTo: '2026-09-13',
  });

  assert.equal(report.valid, false);
  assert.ok(
    report.issues.some((issue) => issue.code === 'PREFLIGHT_NON_MEMBER_CAPACITY_INSUFFICIENT'),
  );
}

{
  const cfg = config();
  const report = validatePlanningPreflight({
    employees: Array.from({ length: 6 }, (_, index) => employee(index + 1)),
    requirements: [guardRequirement('Mon', 4), guardRequirement('Tue', 4)],
    config: cfg,
    periodFrom: '2026-09-07',
    periodTo: '2026-09-13',
  });

  assert.equal(report.valid, false);
  assert.ok(
    report.issues.some((issue) => issue.code === 'PREFLIGHT_GUARD_RECOVERY_CAPACITY_INSUFFICIENT'),
  );
}

{
  const cfg = config();
  cfg.weeklyLeavePolicy.mode = 'PER_ELIGIBLE_EMPLOYEE';
  cfg.weeklyLeavePolicy.allowedDays = ['Sun'];
  cfg.weeklyLeavePolicy.daysPerEmployee = 1;
  cfg.weeklyLeavePolicy.maxEmployeesPerDay = 1;

  const report = validatePlanningPreflight({
    employees: [employee(1), employee(2), employee(3)],
    requirements: [standardRequirement(1)],
    config: cfg,
    periodFrom: '2026-09-07',
    periodTo: '2026-09-13',
  });

  assert.equal(report.valid, false);
  assert.ok(
    report.issues.some((issue) => issue.code === 'PREFLIGHT_WEEKLY_LEAVE_CAPACITY_INSUFFICIENT'),
  );
}

console.log('planning.preflight.validation.service.test.ts: OK');
