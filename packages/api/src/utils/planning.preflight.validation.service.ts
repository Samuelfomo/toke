import type {
  DayKey,
  EngineConfig,
  EngineTemplate,
  PlanningEmployeeInput,
  PlanningRequirementInput,
  ServiceScope,
} from './suggestion.engine.js';

export type PlanningPreflightIssueCode =
  | 'PREFLIGHT_POLICY_CONFIGURATION_INVALID'
  | 'PREFLIGHT_INVALID_REQUIREMENT_CONFIGURATION'
  | 'PREFLIGHT_REQUIREMENT_TEMPLATE_DAY_INVALID'
  | 'PREFLIGHT_GUARD_CONTINUATION_INVALID'
  | 'PREFLIGHT_REQUIREMENT_SELECTOR_INVALID'
  | 'PREFLIGHT_REQUIREMENT_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_DAILY_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_GUARD_POOL_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_NON_MEMBER_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_GUARD_PARTICIPATION_IMPOSSIBLE'
  | 'PREFLIGHT_GUARD_RECOVERY_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_WEEKLY_LEAVE_SELECTOR_EMPTY'
  | 'PREFLIGHT_WEEKLY_LEAVE_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_WEEKLY_LEAVE_SCOPE_EMPTY'
  | 'PREFLIGHT_DAILY_REST_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_WEEKLY_REST_CAPACITY_INSUFFICIENT';

export type PlanningPreflightWarningCode =
  | 'PREFLIGHT_TARGET_ABOVE_STATIC_CAPACITY'
  | 'PREFLIGHT_NEAR_DAILY_CAPACITY';

export interface PlanningPreflightIssue {
  code: PlanningPreflightIssueCode;
  message: string;
  date?: string;
  weekFrom?: string;
  requirementGuid?: string;
  requirementGuids?: string[];
  details?: Record<string, unknown>;
}

export interface PlanningPreflightWarning {
  code: PlanningPreflightWarningCode;
  message: string;
  date?: string;
  requirementGuid?: string;
  details?: Record<string, unknown>;
}

export interface PlanningPreflightReport {
  valid: boolean;
  checkedDates: number;
  checkedRequirements: number;
  issueCount: number;
  warningCount: number;
  issues: PlanningPreflightIssue[];
  warnings: PlanningPreflightWarning[];
}

export interface PlanningPreflightInput {
  employees: PlanningEmployeeInput[];
  requirements: PlanningRequirementInput[];
  config: EngineConfig;
  periodFrom: string;
  periodTo: string;
}

const DAY_KEYS: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseIso(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: string, amount: number): string {
  const date = parseIso(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dayKey(value: string): DayKey {
  return DAY_KEYS[parseIso(value).getUTCDay()]!;
}

function mondayOfWeek(value: string): string {
  const date = parseIso(value);
  const jsDay = date.getUTCDay();
  const distance = jsDay === 0 ? 6 : jsDay - 1;
  date.setUTCDate(date.getUTCDate() - distance);
  return date.toISOString().slice(0, 10);
}

function periodDates(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function weekGroups(dates: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const iso of dates) {
    const monday = mondayOfWeek(iso);
    const current = result.get(monday) ?? [];
    current.push(iso);
    result.set(monday, current);
  }
  return result;
}

function templateHasWork(template: EngineTemplate | null, iso: string): boolean {
  if (!template) return false;
  const blocks = template.definition?.[dayKey(iso)];
  return Array.isArray(blocks) && blocks.length > 0;
}

function requirementDates(requirement: PlanningRequirementInput, dates: string[]): string[] {
  return dates.filter((iso) => dayKey(iso) === requirement.dayOfWeek);
}

function hardMinimum(requirement: PlanningRequirementInput): number {
  return requirement.allocationMode === 'EXACT'
    ? requirement.targetEmployees
    : requirement.minEmployees;
}

function hardMaximum(requirement: PlanningRequirementInput): number | null {
  if (requirement.allocationMode === 'EXACT') return requirement.targetEmployees;
  return requirement.maxEmployees;
}

function fixedMandatoryCapacity(
  employees: PlanningEmployeeInput[],
  requirement: PlanningRequirementInput,
  iso: string,
): number {
  if (!requirement.eligibility.planningModes.includes('FIXED')) return 0;
  if (requirement.eligibility.guardPoolRelation === 'MEMBER') return 0;

  return employees.filter(
    (employee) =>
      employee.mode === 'FIXED' &&
      employee.fixedRestDayMode === 'TEMPLATE' &&
      employee.fixedTemplate?.guid === requirement.template.guid &&
      templateHasWork(employee.fixedTemplate, iso),
  ).length;
}

function fixedMaximumCapacity(
  employees: PlanningEmployeeInput[],
  requirement: PlanningRequirementInput,
  iso: string,
): number {
  if (!requirement.eligibility.planningModes.includes('FIXED')) return 0;
  if (requirement.eligibility.guardPoolRelation === 'MEMBER') return 0;

  return employees.filter(
    (employee) =>
      employee.mode === 'FIXED' &&
      employee.fixedTemplate?.guid === requirement.template.guid &&
      templateHasWork(employee.fixedTemplate, iso),
  ).length;
}

function scopeMatchesRequirement(
  requirement: PlanningRequirementInput,
  scope: ServiceScope,
): boolean {
  if (scope.mode === 'ANY') return true;
  if (scope.mode === 'SERVICE_TYPE') {
    return scope.serviceTypes.includes(requirement.serviceType);
  }
  if (scope.mode === 'TEMPLATE') {
    return scope.templateGuids.includes(requirement.template.guid);
  }
  if (scope.mode === 'REQUIREMENT') {
    return scope.requirementGuids.includes(requirement.guid);
  }
  return false;
}

function activePoolWeeks(
  dates: string[],
  requirements: PlanningRequirementInput[],
  config: EngineConfig,
): Set<string> {
  const result = new Set<string>();
  if (config.guardTeamPolicy.mode !== 'WEEKLY_POOL') return result;

  for (const [weekFrom, weekDates] of weekGroups(dates)) {
    if (config.guardTeamPolicy.completeWeeksOnly && weekDates.length !== 7) {
      continue;
    }

    const hasGuard = weekDates.some((iso) =>
      requirements.some(
        (requirement) =>
          requirement.serviceType === 'GUARD' && requirement.dayOfWeek === dayKey(iso),
      ),
    );

    if (hasGuard) result.add(weekFrom);
  }

  return result;
}

function rotatingCapacity(
  employees: PlanningEmployeeInput[],
  requirement: PlanningRequirementInput,
  iso: string,
  config: EngineConfig,
  poolWeeks: Set<string>,
): number {
  if (!requirement.eligibility.planningModes.includes('ROTATING')) return 0;

  const rotatingCount = employees.filter((employee) => employee.mode === 'ROTATING').length;
  if (config.guardTeamPolicy.mode !== 'WEEKLY_POOL') return rotatingCount;

  const poolActive = poolWeeks.has(mondayOfWeek(iso));
  const relation = requirement.eligibility.guardPoolRelation;

  if (!poolActive) {
    return relation === 'MEMBER' ? 0 : rotatingCount;
  }

  const poolSize = config.guardTeamPolicy.employeesPerWeek;
  const nonMemberCount = Math.max(0, rotatingCount - poolSize);

  if (relation === 'MEMBER') return poolSize;
  if (relation === 'NON_MEMBER') return nonMemberCount;

  // In WEEKLY_POOL, every rotating GUARD start is bound to pool membership,
  // even when the requirement selector itself is ANY.
  if (requirement.serviceType === 'GUARD') return poolSize;

  // GUARD_ONLY prevents current pool members from covering STANDARD work.
  if (config.guardTeamPolicy.memberServiceAccess === 'GUARD_ONLY') {
    return nonMemberCount;
  }

  return rotatingCount;
}

function validateRequirementStructure(
  requirement: PlanningRequirementInput,
  dates: string[],
  issues: PlanningPreflightIssue[],
): void {
  const allocationErrors: string[] = [];

  if (requirement.minEmployees < 0) allocationErrors.push('minEmployees < 0');
  if (requirement.targetEmployees < requirement.minEmployees) {
    allocationErrors.push('targetEmployees < minEmployees');
  }
  if (requirement.maxEmployees !== null && requirement.maxEmployees < requirement.targetEmployees) {
    allocationErrors.push('maxEmployees < targetEmployees');
  }
  if (
    requirement.allocationMode === 'EXACT' &&
    (requirement.maxEmployees === null ||
      requirement.minEmployees !== requirement.targetEmployees ||
      requirement.targetEmployees !== requirement.maxEmployees)
  ) {
    allocationErrors.push('EXACT requires min = target = max');
  }
  if (requirement.allocationMode === 'FILL_REMAINING' && requirement.serviceType !== 'STANDARD') {
    allocationErrors.push('FILL_REMAINING is only valid for STANDARD');
  }

  if (allocationErrors.length > 0) {
    issues.push({
      code: 'PREFLIGHT_INVALID_REQUIREMENT_CONFIGURATION',
      requirementGuid: requirement.guid,
      message: `Requirement ${requirement.guid} has an invalid allocation configuration.`,
      details: { errors: allocationErrors },
    });
  }

  const modes = requirement.eligibility.planningModes;
  if (modes.length === 0 || modes.includes('EXCLUDED')) {
    issues.push({
      code: 'PREFLIGHT_REQUIREMENT_SELECTOR_INVALID',
      requirementGuid: requirement.guid,
      message: `Requirement ${requirement.guid} has an invalid employee selector.`,
      details: { planningModes: modes },
    });
  }

  const matchingDates = requirementDates(requirement, dates);
  if (matchingDates.length > 0 && !templateHasWork(requirement.template, matchingDates[0]!)) {
    issues.push({
      code: 'PREFLIGHT_REQUIREMENT_TEMPLATE_DAY_INVALID',
      requirementGuid: requirement.guid,
      message: `Template ${requirement.template.name} has no work block for ${requirement.dayOfWeek}.`,
      details: {
        templateGuid: requirement.template.guid,
        dayOfWeek: requirement.dayOfWeek,
      },
    });
  }

  if (requirement.serviceType === 'GUARD') {
    const sampleDate = matchingDates[0];
    if (
      !requirement.continuationTemplate ||
      requirement.continuationDayOffset !== 1 ||
      (sampleDate && !templateHasWork(requirement.continuationTemplate, addDays(sampleDate, 1)))
    ) {
      issues.push({
        code: 'PREFLIGHT_GUARD_CONTINUATION_INVALID',
        requirementGuid: requirement.guid,
        message: `Guard requirement ${requirement.guid} has an invalid next-day continuation.`,
        details: {
          continuationTemplateGuid: requirement.continuationTemplate?.guid ?? null,
          continuationDayOffset: requirement.continuationDayOffset,
        },
      });
    }
  } else if (requirement.continuationTemplate !== null || requirement.continuationDayOffset !== 0) {
    issues.push({
      code: 'PREFLIGHT_GUARD_CONTINUATION_INVALID',
      requirementGuid: requirement.guid,
      message: `STANDARD requirement ${requirement.guid} must not define guard continuation data.`,
    });
  }
}

export function validatePlanningPreflight(input: PlanningPreflightInput): PlanningPreflightReport {
  const dates = periodDates(input.periodFrom, input.periodTo);
  const issues: PlanningPreflightIssue[] = [];
  const warnings: PlanningPreflightWarning[] = [];
  const rotating = input.employees.filter((employee) => employee.mode === 'ROTATING');
  const fixed = input.employees.filter((employee) => employee.mode === 'FIXED');
  const poolWeeks = activePoolWeeks(dates, input.requirements, input.config);

  const leavePolicy = input.config.weeklyLeavePolicy;
  const guardPolicy = input.config.guardTeamPolicy;

  if (
    ['TEAM_ROTATION', 'PER_ELIGIBLE_EMPLOYEE'].includes(leavePolicy.mode) &&
    leavePolicy.allowedDays.length === 0
  ) {
    issues.push({
      code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
      message: `${leavePolicy.mode} requires at least one allowed weekly leave day.`,
    });
  }

  if (new Set(leavePolicy.allowedDays).size !== leavePolicy.allowedDays.length) {
    issues.push({
      code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
      message: 'weeklyLeavePolicy.allowedDays contains duplicates.',
      details: { allowedDays: leavePolicy.allowedDays },
    });
  }

  if (leavePolicy.mode === 'TEAM_ROTATION' && leavePolicy.selector.guardPoolRelation !== 'ANY') {
    issues.push({
      code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
      message: 'TEAM_ROTATION cannot use a guard-pool selector.',
      details: { guardPoolRelation: leavePolicy.selector.guardPoolRelation },
    });
  }

  if (
    leavePolicy.mode === 'PER_ELIGIBLE_EMPLOYEE' &&
    leavePolicy.selector.guardPoolRelation !== 'ANY' &&
    guardPolicy.mode !== 'WEEKLY_POOL'
  ) {
    issues.push({
      code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
      message: 'Weekly leave MEMBER/NON_MEMBER selection requires WEEKLY_POOL.',
    });
  }

  if (
    guardPolicy.eligiblePlanningModes.length === 0 ||
    guardPolicy.eligiblePlanningModes.includes('EXCLUDED')
  ) {
    issues.push({
      code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
      message: 'guardTeamPolicy.eligiblePlanningModes is invalid.',
      details: { eligiblePlanningModes: guardPolicy.eligiblePlanningModes },
    });
  }

  if (
    guardPolicy.mode === 'WEEKLY_POOL' &&
    !guardPolicy.eligiblePlanningModes.includes('ROTATING')
  ) {
    issues.push({
      code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
      message: 'WEEKLY_POOL currently requires ROTATING in eligiblePlanningModes.',
    });
  }

  for (const requirement of input.requirements) {
    if (requirement.eligibility.guardPoolRelation !== 'ANY' && guardPolicy.mode !== 'WEEKLY_POOL') {
      issues.push({
        code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
        requirementGuid: requirement.guid,
        message: `Requirement ${requirement.guid} uses ${requirement.eligibility.guardPoolRelation} without WEEKLY_POOL.`,
      });
    }

    if (
      guardPolicy.mode === 'WEEKLY_POOL' &&
      requirement.serviceType === 'GUARD' &&
      requirement.eligibility.guardPoolRelation === 'NON_MEMBER'
    ) {
      issues.push({
        code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
        requirementGuid: requirement.guid,
        message: `Guard requirement ${requirement.guid} cannot target NON_MEMBER in WEEKLY_POOL.`,
      });
    }

    if (
      guardPolicy.mode === 'WEEKLY_POOL' &&
      guardPolicy.memberServiceAccess === 'GUARD_ONLY' &&
      requirement.serviceType === 'STANDARD' &&
      requirement.eligibility.guardPoolRelation === 'MEMBER' &&
      hardMinimum(requirement) > 0
    ) {
      issues.push({
        code: 'PREFLIGHT_POLICY_CONFIGURATION_INVALID',
        requirementGuid: requirement.guid,
        message: `STANDARD requirement ${requirement.guid} targets MEMBER while pool members are GUARD_ONLY.`,
      });
    }

    validateRequirementStructure(requirement, dates, issues);
  }

  if (input.config.guardTeamPolicy.mode === 'WEEKLY_POOL') {
    const poolEligible = rotating.filter((employee) =>
      input.config.guardTeamPolicy.eligiblePlanningModes.includes(employee.mode),
    );

    if (poolWeeks.size > 0 && input.config.guardTeamPolicy.employeesPerWeek > poolEligible.length) {
      issues.push({
        code: 'PREFLIGHT_GUARD_POOL_CAPACITY_INSUFFICIENT',
        message:
          'The configured weekly guard pool is larger than the eligible rotating population.',
        details: {
          poolSize: input.config.guardTeamPolicy.employeesPerWeek,
          eligibleRotatingEmployees: poolEligible.length,
        },
      });
    }
  }

  // Per-requirement and per-day hard capacity checks.
  for (const iso of dates) {
    const dayRequirements = input.requirements.filter(
      (requirement) => requirement.dayOfWeek === dayKey(iso),
    );

    let totalRotatingMinimum = 0;
    let memberBoundMinimum = 0;
    let nonMemberBoundMinimum = 0;
    const residualRequirementGuids: string[] = [];

    const poolActive = poolWeeks.has(mondayOfWeek(iso));
    const poolSize = poolActive ? input.config.guardTeamPolicy.employeesPerWeek : 0;
    const nonMemberCount = Math.max(0, rotating.length - poolSize);

    for (const requirement of dayRequirements) {
      const required = hardMinimum(requirement);
      const maximum = hardMaximum(requirement);
      const mandatoryFixed = fixedMandatoryCapacity(input.employees, requirement, iso);
      const maximumFixed = fixedMaximumCapacity(input.employees, requirement, iso);
      const rotatingMax = rotatingCapacity(
        input.employees,
        requirement,
        iso,
        input.config,
        poolWeeks,
      );
      const staticMaximum = maximumFixed + rotatingMax;

      if (maximum !== null && mandatoryFixed > maximum) {
        issues.push({
          code: 'PREFLIGHT_REQUIREMENT_CAPACITY_INSUFFICIENT',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Mandatory FIXED coverage already exceeds the maximum for requirement ${requirement.guid}.`,
          details: {
            mandatoryFixed,
            maximum,
            templateGuid: requirement.template.guid,
          },
        });
      }

      if (required > staticMaximum) {
        issues.push({
          code: 'PREFLIGHT_REQUIREMENT_CAPACITY_INSUFFICIENT',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Requirement ${requirement.guid} requires ${required} employee(s), but static capacity is ${staticMaximum}.`,
          details: {
            required,
            fixedCapacity: maximumFixed,
            rotatingCapacity: rotatingMax,
            staticCapacity: staticMaximum,
            selector: requirement.eligibility,
          },
        });
      } else if (
        requirement.allocationMode !== 'EXACT' &&
        requirement.targetEmployees > staticMaximum
      ) {
        warnings.push({
          code: 'PREFLIGHT_TARGET_ABOVE_STATIC_CAPACITY',
          date: iso,
          requirementGuid: requirement.guid,
          message: `Target ${requirement.targetEmployees} is above static capacity ${staticMaximum}; the minimum remains feasible.`,
          details: {
            target: requirement.targetEmployees,
            staticCapacity: staticMaximum,
          },
        });
      }

      const residual = Math.max(0, required - maximumFixed);
      if (residual > 0 && requirement.eligibility.planningModes.includes('ROTATING')) {
        totalRotatingMinimum += residual;
        residualRequirementGuids.push(requirement.guid);

        if (poolActive) {
          const relation = requirement.eligibility.guardPoolRelation;
          const poolBound = relation === 'MEMBER' || requirement.serviceType === 'GUARD';
          const nonMemberBound =
            relation === 'NON_MEMBER' ||
            (requirement.serviceType === 'STANDARD' &&
              input.config.guardTeamPolicy.memberServiceAccess === 'GUARD_ONLY');

          if (poolBound) memberBoundMinimum += residual;
          if (nonMemberBound) nonMemberBoundMinimum += residual;
        }
      }
    }

    if (totalRotatingMinimum > rotating.length) {
      issues.push({
        code: 'PREFLIGHT_DAILY_CAPACITY_INSUFFICIENT',
        date: iso,
        requirementGuids: residualRequirementGuids,
        message: `Daily minimum requires at least ${totalRotatingMinimum} rotating assignment(s), but only ${rotating.length} rotating employee(s) are available.`,
        details: {
          requiredRotatingAssignments: totalRotatingMinimum,
          rotatingEmployees: rotating.length,
        },
      });
    } else if (rotating.length > 0 && totalRotatingMinimum === rotating.length) {
      warnings.push({
        code: 'PREFLIGHT_NEAR_DAILY_CAPACITY',
        date: iso,
        message: 'Daily rotating capacity is fully consumed by hard minimum coverage.',
        details: {
          requiredRotatingAssignments: totalRotatingMinimum,
          rotatingEmployees: rotating.length,
        },
      });
    }

    if (poolActive && memberBoundMinimum > poolSize) {
      issues.push({
        code: 'PREFLIGHT_GUARD_POOL_CAPACITY_INSUFFICIENT',
        date: iso,
        message: `Pool-bound minimum requires ${memberBoundMinimum} employee(s), but the weekly guard pool contains ${poolSize}.`,
        details: { requiredPoolMembers: memberBoundMinimum, poolSize },
      });
    }

    if (poolActive && nonMemberBoundMinimum > nonMemberCount) {
      issues.push({
        code: 'PREFLIGHT_NON_MEMBER_CAPACITY_INSUFFICIENT',
        date: iso,
        message: `Non-member minimum requires ${nonMemberBoundMinimum} employee(s), but only ${nonMemberCount} rotating non-member slot(s) are available.`,
        details: {
          requiredNonMembers: nonMemberBoundMinimum,
          nonMemberCapacity: nonMemberCount,
          poolSize,
          rotatingEmployees: rotating.length,
        },
      });
    }
  }

  // Guard pool participation: when every weekly pool member must perform at
  // least one guard, there must be enough possible rotating guard assignments.
  if (
    input.config.guardTeamPolicy.mode === 'WEEKLY_POOL' &&
    input.config.guardTeamPolicy.requireParticipation
  ) {
    for (const [weekFrom, weekDates] of weekGroups(dates)) {
      if (!poolWeeks.has(weekFrom)) continue;

      let possibleRotatingGuardAssignments = 0;
      for (const iso of weekDates) {
        for (const requirement of input.requirements) {
          if (
            requirement.serviceType !== 'GUARD' ||
            requirement.dayOfWeek !== dayKey(iso) ||
            !requirement.eligibility.planningModes.includes('ROTATING')
          ) {
            continue;
          }

          const max = hardMaximum(requirement);
          const mandatoryFixed = fixedMandatoryCapacity(input.employees, requirement, iso);
          const rotatingMax = rotatingCapacity(
            input.employees,
            requirement,
            iso,
            input.config,
            poolWeeks,
          );
          const slotMax =
            max === null ? rotatingMax : Math.min(rotatingMax, Math.max(0, max - mandatoryFixed));
          possibleRotatingGuardAssignments += slotMax;
        }
      }

      if (possibleRotatingGuardAssignments < input.config.guardTeamPolicy.employeesPerWeek) {
        issues.push({
          code: 'PREFLIGHT_GUARD_PARTICIPATION_IMPOSSIBLE',
          weekFrom,
          message:
            'Guard pool participation is required, but the week does not contain enough possible guard assignments for every pool member.',
          details: {
            poolSize: input.config.guardTeamPolicy.employeesPerWeek,
            possibleRotatingGuardAssignments,
          },
        });
      }
    }
  }

  // Guard continuation + configured post-guard recovery impose a minimum gap
  // before the same rotating employee may start another guard.
  const guardGapDays =
    2 + (input.config.restAfterGuardRequired ? input.config.postGuardRestDays : 0);

  if (guardGapDays > 1 && rotating.length > 0) {
    for (let start = 0; start + guardGapDays <= dates.length; start++) {
      const window = dates.slice(start, start + guardGapDays);
      let requiredRotatingGuards = 0;

      for (const iso of window) {
        for (const requirement of input.requirements) {
          if (requirement.serviceType !== 'GUARD' || requirement.dayOfWeek !== dayKey(iso)) {
            continue;
          }
          const required = hardMinimum(requirement);
          const fixedMax = fixedMaximumCapacity(input.employees, requirement, iso);
          requiredRotatingGuards += Math.max(0, required - fixedMax);
        }
      }

      if (requiredRotatingGuards === 0) continue;

      const weekFrom = mondayOfWeek(window[0]!);
      const sameWeek = window.every((iso) => mondayOfWeek(iso) === weekFrom);
      const capacity =
        sameWeek && poolWeeks.has(weekFrom)
          ? input.config.guardTeamPolicy.employeesPerWeek
          : rotating.length;

      if (requiredRotatingGuards > capacity) {
        issues.push({
          code: 'PREFLIGHT_GUARD_RECOVERY_CAPACITY_INSUFFICIENT',
          date: window[0],
          message: `Guard/recovery window requires ${requiredRotatingGuards} rotating guard start(s), but at most ${capacity} distinct rotating employee(s) can cover them.`,
          details: {
            windowFrom: window[0],
            windowTo: window[window.length - 1],
            guardGapDays,
            requiredRotatingGuards,
            distinctEmployeeCapacity: capacity,
          },
        });
      }
    }
  }

  // Weekly leave checks mirroring deterministic solver-side validation.
  const leave = input.config.weeklyLeavePolicy;
  if (leave.mode === 'PER_ELIGIBLE_EMPLOYEE') {
    const selectable = input.employees.filter((employee) =>
      leave.selector.planningModes.includes(employee.mode),
    );

    if (selectable.length === 0) {
      issues.push({
        code: 'PREFLIGHT_WEEKLY_LEAVE_SELECTOR_EMPTY',
        message: 'Weekly leave selector does not match any included employee.',
        details: { selector: leave.selector },
      });
    }

    if (leave.countMode === 'EXACT' && leave.daysPerEmployee > leave.allowedDays.length) {
      issues.push({
        code: 'PREFLIGHT_WEEKLY_LEAVE_CAPACITY_INSUFFICIENT',
        message: 'daysPerEmployee exceeds the number of allowed weekly leave days.',
        details: {
          daysPerEmployee: leave.daysPerEmployee,
          allowedDays: leave.allowedDays,
        },
      });
    }

    if (
      leave.requireWorkOnOtherDays &&
      !input.requirements.some((requirement) =>
        scopeMatchesRequirement(requirement, leave.serviceScope),
      )
    ) {
      issues.push({
        code: 'PREFLIGHT_WEEKLY_LEAVE_SCOPE_EMPTY',
        message:
          'Weekly leave requires work on other days, but its service scope matches no active requirement.',
        details: { serviceScope: leave.serviceScope },
      });
    }

    if (leave.maxEmployeesPerDay !== null) {
      for (const [weekFrom, weekDates] of weekGroups(dates)) {
        if (leave.completeWeeksOnly && weekDates.length !== 7) continue;

        const allowedDates = weekDates.filter((iso) => leave.allowedDays.includes(dayKey(iso)));
        const poolActive = poolWeeks.has(weekFrom);
        let eligibleCount = selectable.length;

        const selectableRotating = selectable.filter(
          (employee) => employee.mode === 'ROTATING',
        ).length;
        const selectedFromSelector = Math.min(
          input.config.guardTeamPolicy.employeesPerWeek,
          selectableRotating,
        );

        if (leave.selector.guardPoolRelation === 'MEMBER') {
          eligibleCount = poolActive ? selectedFromSelector : 0;
        } else if (leave.selector.guardPoolRelation === 'NON_MEMBER' && poolActive) {
          eligibleCount = Math.max(0, selectable.length - selectedFromSelector);
        }

        const requiredLeaveSlots = eligibleCount * leave.daysPerEmployee;
        const availableLeaveSlots = allowedDates.length * leave.maxEmployeesPerDay;

        if (requiredLeaveSlots > availableLeaveSlots) {
          issues.push({
            code: 'PREFLIGHT_WEEKLY_LEAVE_CAPACITY_INSUFFICIENT',
            weekFrom,
            message: `Weekly leave requires ${requiredLeaveSlots} slot(s), but only ${availableLeaveSlots} are available under allowedDays/maxEmployeesPerDay.`,
            details: {
              eligibleEmployees: eligibleCount,
              daysPerEmployee: leave.daysPerEmployee,
              allowedDates: allowedDates.length,
              maxEmployeesPerDay: leave.maxEmployeesPerDay,
            },
          });
        }
      }
    }
  }

  // Daily/weekly rest capacity: reject only mathematically certain overloads.
  const maxResting = input.config.maxRestingEmployeesPerDay;
  if (maxResting !== null) {
    for (const iso of dates) {
      const mandatoryTemplateRest = fixed.filter(
        (employee) =>
          employee.fixedRestDayMode === 'TEMPLATE' &&
          employee.fixedTemplate !== null &&
          !templateHasWork(employee.fixedTemplate, iso),
      ).length;

      if (mandatoryTemplateRest > maxResting) {
        issues.push({
          code: 'PREFLIGHT_DAILY_REST_CAPACITY_INSUFFICIENT',
          date: iso,
          message: `Template-defined mandatory rest already requires ${mandatoryTemplateRest} resting employee(s), above maxRestingEmployeesPerDay=${maxResting}.`,
          details: { mandatoryTemplateRest, maxRestingEmployeesPerDay: maxResting },
        });
      }
    }

    // Weekly leave itself consumes rest capacity. On FIXED profiles leave can
    // only be placed on template work days, so template-defined non-work days
    // are disjoint mandatory rest slots and can safely be added here.
    if (leave.mode === 'TEAM_ROTATION' || leave.mode === 'PER_ELIGIBLE_EMPLOYEE') {
      for (const [weekFrom, weekDates] of weekGroups(dates)) {
        if (leave.completeWeeksOnly && weekDates.length !== 7) continue;

        const mandatoryFixedRestOnAllowedDays = leave.allowedDays.reduce(
          (total, allowedDay) =>
            total +
            weekDates
              .filter((iso) => dayKey(iso) === allowedDay)
              .reduce(
                (dateTotal, iso) =>
                  dateTotal +
                  fixed.filter(
                    (employee) =>
                      employee.fixedTemplate !== null &&
                      !templateHasWork(employee.fixedTemplate, iso),
                  ).length,
                0,
              ),
          0,
        );

        const allowedDates = weekDates.filter((iso) => leave.allowedDays.includes(dayKey(iso)));
        const availableLeaveRestSlots =
          allowedDates.length * maxResting - mandatoryFixedRestOnAllowedDays;

        let requiredLeaveSlots = 0;
        if (leave.mode === 'TEAM_ROTATION') {
          requiredLeaveSlots = leave.employeesPerWeek;
        } else {
          const selectable = input.employees.filter((employee) =>
            leave.selector.planningModes.includes(employee.mode),
          );
          const poolActive = poolWeeks.has(weekFrom);
          const selectableRotating = selectable.filter(
            (employee) => employee.mode === 'ROTATING',
          ).length;
          const selectedFromSelector = Math.min(
            input.config.guardTeamPolicy.employeesPerWeek,
            selectableRotating,
          );
          let eligibleCount = selectable.length;
          if (leave.selector.guardPoolRelation === 'MEMBER') {
            eligibleCount = poolActive ? selectedFromSelector : 0;
          } else if (leave.selector.guardPoolRelation === 'NON_MEMBER' && poolActive) {
            eligibleCount = Math.max(0, selectable.length - selectedFromSelector);
          }
          requiredLeaveSlots = eligibleCount * leave.daysPerEmployee;
        }

        if (requiredLeaveSlots > availableLeaveRestSlots) {
          issues.push({
            code: 'PREFLIGHT_WEEKLY_LEAVE_CAPACITY_INSUFFICIENT',
            weekFrom,
            message: `Weekly leave requires ${requiredLeaveSlots} rest slot(s) on allowed days, but maxRestingEmployeesPerDay leaves only ${Math.max(0, availableLeaveRestSlots)} available.`,
            details: {
              requiredLeaveSlots,
              availableLeaveRestSlots: Math.max(0, availableLeaveRestSlots),
              maxRestingEmployeesPerDay: maxResting,
              allowedDays: leave.allowedDays,
            },
          });
        }
      }
    }

    if (!['NONE', 'TEAM_ROTATION'].includes(leave.mode)) {
      for (const [weekFrom, weekDates] of weekGroups(dates)) {
        if (weekDates.length !== 7) continue;

        let minimumRestSlots = rotating.length * input.config.minRestDaysPerWeek;

        for (const employee of fixed) {
          if (!employee.fixedTemplate) continue;

          const potentialWorkDays = weekDates.filter((iso) =>
            templateHasWork(employee.fixedTemplate, iso),
          ).length;
          const templateRestDays = weekDates.length - potentialWorkDays;

          if (employee.fixedRestDayMode === 'ROTATING') {
            minimumRestSlots +=
              templateRestDays + Math.min(input.config.minRestDaysPerWeek, potentialWorkDays);
          } else {
            minimumRestSlots += templateRestDays;
          }
        }

        const availableRestSlots = weekDates.length * maxResting;
        if (minimumRestSlots > availableRestSlots) {
          issues.push({
            code: 'PREFLIGHT_WEEKLY_REST_CAPACITY_INSUFFICIENT',
            weekFrom,
            message: `Minimum weekly rest requires at least ${minimumRestSlots} rest slot(s), but daily rest capacity allows only ${availableRestSlots}.`,
            details: {
              minimumRestSlots,
              availableRestSlots,
              maxRestingEmployeesPerDay: maxResting,
            },
          });
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    checkedDates: dates.length,
    checkedRequirements: input.requirements.length,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
  };
}
