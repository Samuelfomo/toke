import type { PlanningSolverBoundaryState, PlanningSolverLockedAssignment } from './solver/planning.solver.js';
import type { FixedAlternationSolverPolicy, FixedAlternationStatus } from './planning.fixed.alternation.js';
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
  | 'PREFLIGHT_DAILY_WORK_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_WEEKLY_WORK_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_DAILY_REST_CAPACITY_INSUFFICIENT'
  | 'PREFLIGHT_WEEKLY_REST_CAPACITY_INSUFFICIENT';

export type PlanningPreflightWarningCode =
  | 'PREFLIGHT_TARGET_ABOVE_STATIC_CAPACITY'
  | 'PREFLIGHT_NEAR_DAILY_CAPACITY'
  | 'PREFLIGHT_FIXED_ALTERNATION_NOT_APPLIED'
  | 'PREFLIGHT_WEEKLY_LEAVE_SCOPE_UNVERIFIED';

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
  fixedAlternationStatus?: FixedAlternationStatus;
  fixedAlternationPolicy?: FixedAlternationSolverPolicy;
  lockedAssignments?: PlanningSolverLockedAssignment[];
  boundaryState?: PlanningSolverBoundaryState;
  configGuid?: string;
}

export const FIXED_ALTERNATION_MESSAGES: Record<FixedAlternationStatus, string> = {
  PENDING_SOLVER_SUPPORT: 'L’alternance fixe est configurée. Le moteur actuel ne l’applique pas encore.',
  NOT_APPLICABLE: 'La paire d’alternance fixe est incomplète dans cette génération.',
  INCOMPATIBLE_PROFILES: 'Les profils ou les horaires actuels ne correspondent plus à la politique d’alternance fixe.',
};

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

/**
 * Bound work capacity from above, without guessing pool membership. A deficit
 * in this relaxation is sufficient to disprove feasibility. Spare capacity is
 * inconclusive because the same employees may compete for it.
 */
function validateRequiredWorkCapacity(
  input: PlanningPreflightInput, dates: string[], poolWeeks: Set<string>,
): PlanningPreflightIssue[] {
  const leave = input.config.weeklyLeavePolicy;
  const pool = input.config.guardTeamPolicy;
  if (leave.mode !== 'PER_ELIGIBLE_EMPLOYEE' || leave.countMode !== 'EXACT' ||
      !leave.requireWorkOnOtherDays || !leave.selector.planningModes.includes('ROTATING')) return [];

  const rotating = new Set(input.employees.filter(employee => employee.mode === 'ROTATING').map(employee => employee.guid));
  const included = new Set(input.employees.filter(employee => employee.mode !== 'EXCLUDED').map(employee => employee.guid));
  const alternating = input.fixedAlternationPolicy;
  const limited = alternating?.limitedServiceTemplateGuid;
  const pinnedFixedOnLimitedService = input.employees.filter(employee =>
    employee.mode === 'FIXED' && employee.fixedRestDayMode === 'TEMPLATE' &&
    !leave.selector.planningModes.includes('FIXED') && !alternating?.employeeGuids.includes(employee.guid) &&
    employee.fixedTemplate?.guid === limited && employee.fixedTemplate !== null);
  const recoveryDays = input.config.restAfterGuardRequired ? input.config.postGuardRestDays : 0;
  const locks = input.lockedAssignments ?? [];
  const byDate = new Map(dates.map(date => [date, input.requirements.filter(requirement =>
    requirement.dayOfWeek === dayKey(date) && requirement.eligibility.planningModes.includes('ROTATING'))]));
  const issues: PlanningPreflightIssue[] = [];

  for (const [weekFrom, weekDates] of weekGroups(dates)) {
    if (leave.completeWeeksOnly && weekDates.length !== 7) continue;
    const active = poolWeeks.has(weekFrom);
    const members = active ? pool.employeesPerWeek : 0;
    if (members > rotating.size) continue;

    const selector = leave.selector.guardPoolRelation;
    const populations = selector === 'ANY'
      ? [{ relation: 'ANY', count: rotating.size }, ...(active ? [
        { relation: 'MEMBER', count: members }, { relation: 'NON_MEMBER', count: rotating.size - members },
      ] : [])]
      : [{ relation: selector, count: selector === 'MEMBER' ? members : rotating.size - members }];

    for (const { relation, count } of populations) {
      if (!count) continue;
      const dayBounds = weekDates.map(date => {
        const requirements = (byDate.get(date) ?? []).filter(requirement => {
          if (!scopeMatchesRequirement(requirement, leave.serviceScope)) return false;
          const eligibility = requirement.eligibility.guardPoolRelation;
          if (eligibility === 'MEMBER' && (!active || relation === 'NON_MEMBER')) return false;
          if (eligibility === 'NON_MEMBER' && relation === 'MEMBER') return false;
          if (active && relation === 'NON_MEMBER' && requirement.serviceType === 'GUARD') return false;
          return !(active && relation === 'MEMBER' && pool.memberServiceAccess === 'GUARD_ONLY' &&
            requirement.serviceType === 'STANDARD');
        });
        const dateLocks = locks.filter(lock => lock.date === date);
        const unlockedRotationCapacity = (requirement: PlanningRequirementInput) => {
          const maximum = hardMaximum(requirement);
          if (maximum == null) return count;
          const locked = new Set(dateLocks.filter(lock => rotating.has(lock.employeeGuid) &&
            lock.requirementGuid === requirement.guid).map(lock => lock.employeeGuid)).size;
          return Math.max(0, maximum - locked);
        };
        const regular = requirements.filter(requirement => requirement.template.guid !== limited)
          .reduce((sum, requirement) => sum + unlockedRotationCapacity(requirement), 0);
        const limitedOccupied = dateLocks.some(lock => included.has(lock.employeeGuid) && lock.templateGuid === limited) ||
          pinnedFixedOnLimitedService.some(employee => !dateLocks.some(lock => lock.employeeGuid === employee.guid) &&
            templateHasWork(employee.fixedTemplate, date));
        const limitedCapacity = limited && !limitedOccupied
          ? Math.min(1, requirements.filter(requirement => requirement.template.guid === limited)
            .reduce((sum, requirement) => sum + unlockedRotationCapacity(requirement), 0))
          : 0;

        // A direct lock bypasses work-on-other-days. Continuation and recovery
        // also satisfy that rule, even when their template is outside its scope.
        let alternatives = new Set(dateLocks.filter(lock => rotating.has(lock.employeeGuid))
          .map(lock => lock.employeeGuid)).size;
        alternatives += input.boundaryState ? new Set(input.boundaryState.guardContinuations
          .filter(entry => rotating.has(entry.employeeGuid) && entry.continuationDate <= date &&
            addDays(entry.continuationDate, recoveryDays) >= date).map(entry => entry.employeeGuid)).size
          : Number(date <= addDays(input.periodFrom, recoveryDays)) * count;

        for (let offset = 1; offset <= recoveryDays + 1; offset++) {
          const source = addDays(date, -offset);
          for (const guard of byDate.get(source) ?? []) {
            if (guard.serviceType !== 'GUARD' || (offset === 1 && guard.continuationDayOffset !== 1)) continue;
            const guardLocks = locks.filter(lock => lock.date === source && lock.requirementGuid === guard.guid &&
              rotating.has(lock.employeeGuid)).length;
            // A non-member cannot start an automatic guard in this same
            // pool week; a previous week's pool may have a different roster.
            const samePoolExcludes = active && relation === 'NON_MEMBER' && mondayOfWeek(source) === weekFrom;
            alternatives += samePoolExcludes ? guardLocks : Math.max(hardMaximum(guard) ?? count, guardLocks);
          }
        }
        const ordinary = Math.min(count, regular + alternatives);
        return {
          date, ordinary, limited: Math.min(count - ordinary, limitedCapacity),
          alternativeCapacity: Math.min(count, alternatives),
          requirements,
        };
      });

      let violation: { days: typeof dayBounds; required: number; capacity: number; deficit: number } | undefined;
      // Check single days, the complete week and constrained subsets. There
      // are at most 127 non-empty subsets of a civil week.
      for (let mask = 1; mask < (1 << dayBounds.length); mask++) {
        const days = dayBounds.filter((_, index) => mask & (1 << index));
        const allowed = days.filter(day => leave.allowedDays.includes(dayKey(day.date))).length;
        const maxLeaves = Math.min(count * leave.daysPerEmployee, allowed * Math.min(count, leave.maxEmployeesPerDay ?? count));
        const required = Math.max(0, count * days.length - maxLeaves);
        const capacity = days.reduce((sum, day) => sum + day.ordinary, 0) +
          Math.min(count, days.reduce((sum, day) => sum + day.limited, 0));
        const deficit = required - capacity;
        if (deficit > 0 && (!violation || deficit > violation.deficit ||
          (deficit === violation.deficit && days.length > violation.days.length))) {
          violation = { days, required, capacity, deficit };
        }
      }
      if (!violation) continue;
      const { days, required, capacity, deficit } = violation;
      const requirementGuids = [...new Set(days.flatMap(day => day.requirements.map(requirement => requirement.guid)))];
      issues.push({
        code: days.length === 1 ? 'PREFLIGHT_DAILY_WORK_CAPACITY_INSUFFICIENT' : 'PREFLIGHT_WEEKLY_WORK_CAPACITY_INSUFFICIENT',
        weekFrom,
        ...(days.length === 1 && { date: days[0]!.date }),
        requirementGuids,
        message: `Le travail obligatoire demande ${required} affectation(s), mais la capacité est d’au plus ${capacity}.`,
        details: {
          configGuid: input.configGuid,
          periodFrom: days[0]!.date, periodTo: days.at(-1)!.date,
          dates: days.map(day => day.date),
          population: { planningMode: 'ROTATING', guardPoolRelation: relation, eligibleEmployees: count },
          requiredAssignments: required, maximumAssignments: capacity, deficit,
          weeklyLeave: { daysPerEmployee: leave.daysPerEmployee, allowedDays: leave.allowedDays, maxEmployeesPerDay: leave.maxEmployeesPerDay },
          serviceScope: leave.serviceScope,
          ...(limited && { serviceQuota: { templateGuid: limited, maxPerDate: 1, maxPerEmployeePerWeek: 1 } }),
          dailyCapacity: days.map(day => ({
            date: day.date, ordinaryCapacity: day.ordinary, quotaCapacity: day.limited,
            alternativeCapacity: day.alternativeCapacity,
            requirements: day.requirements.map(requirement => ({
              guid: requirement.guid, templateGuid: requirement.template.guid, maximum: hardMaximum(requirement),
            })),
          })),
          suggestedActions: [
            {
              code: 'REVIEW_SERVICE_MAXIMA',
              message: `Libérer au moins ${deficit} affectation(s) sur les dates concernées en réexaminant les plafonds des services admissibles.`,
              minimumAdditionalSlots: deficit, requirementGuids, requiresRevalidation: true,
            },
            { code: 'REVIEW_WEEKLY_LEAVE_POLICY', message: 'Réexaminer les jours de repos autorisés, la taille du pool ou l’obligation de travail hors repos.', requiresRevalidation: true },
          ],
        },
      });
    }
  }
  return issues;
}

export function validatePlanningPreflight(input: PlanningPreflightInput, options: { workCapacityOnly?: boolean } = {}): PlanningPreflightReport {
  const dates = periodDates(input.periodFrom, input.periodTo);
  const issues: PlanningPreflightIssue[] = [];
  const warnings: PlanningPreflightWarning[] = [];
  const poolWeeks = activePoolWeeks(dates, input.requirements, input.config);
  issues.push(...validateRequiredWorkCapacity(input, dates, poolWeeks));
  if (options.workCapacityOnly) {
    return { valid: !issues.length, checkedDates: dates.length, checkedRequirements: input.requirements.length,
      issueCount: issues.length, warningCount: 0, issues, warnings };
  }
  if (input.fixedAlternationStatus) {
    warnings.push({
      code: 'PREFLIGHT_FIXED_ALTERNATION_NOT_APPLIED',
      message: FIXED_ALTERNATION_MESSAGES[input.fixedAlternationStatus],
      details: { status: input.fixedAlternationStatus },
    });
  }
  const rotating = input.employees.filter((employee) => employee.mode === 'ROTATING');
  const fixed = input.employees.filter((employee) => employee.mode === 'FIXED');

  const alternating = input.fixedAlternationPolicy;
  const capacityEmployees = alternating
    ? input.employees.filter(employee => !alternating.employeeGuids.includes(employee.guid))
    : input.employees;
  const alternatingEmployees = alternating
    ? fixed.filter(employee => alternating.employeeGuids.includes(employee.guid))
    : [];
  const locks = new Map((input.lockedAssignments ?? []).map(lock => [`${lock.employeeGuid}|${lock.date}`, lock]));
  const alternatingCapacity = (requirement: PlanningRequirementInput, iso: string, mandatory: boolean) => {
    if (!requirement.eligibility.planningModes.includes('FIXED') ||
        requirement.eligibility.guardPoolRelation === 'MEMBER') return 0;
    const target = alternating?.templates.find(template => template.guid === requirement.template.guid);
    if (!target) return 0;
    return alternatingEmployees.filter(employee => {
      const lock = locks.get(`${employee.guid}|${iso}`);
      if (lock) return lock.templateGuid === target.guid;
      const weekendTarget = alternating?.limitedServiceTemplateGuid &&
        target.guid !== alternating.limitedServiceTemplateGuid &&
        ['Sat', 'Sun'].includes(dayKey(iso));
      return !mandatory && (weekendTarget || templateHasWork(employee.fixedTemplate, iso)) && templateHasWork(target, iso);
    }).length;
  };
  const mandatoryCapacity = (requirement: PlanningRequirementInput, iso: string) =>
    fixedMandatoryCapacity(capacityEmployees, requirement, iso) + alternatingCapacity(requirement, iso, true);
  const maximumCapacity = (requirement: PlanningRequirementInput, iso: string) =>
    fixedMaximumCapacity(capacityEmployees, requirement, iso) + alternatingCapacity(requirement, iso, false);

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
      const mandatoryFixed = mandatoryCapacity(requirement, iso);
      const maximumFixed = maximumCapacity(requirement, iso);
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
          const mandatoryFixed = mandatoryCapacity(requirement, iso);
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
          const fixedMax = maximumCapacity(requirement, iso);
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
      warnings.push({
        code: 'PREFLIGHT_WEEKLY_LEAVE_SCOPE_UNVERIFIED',
        message: 'Aucun besoin actif ne correspond au périmètre du travail obligatoire. Les horaires fixes et les exceptions peuvent néanmoins couvrir ce périmètre.',
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
