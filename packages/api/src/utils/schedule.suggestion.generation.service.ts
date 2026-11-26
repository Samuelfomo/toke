import { UniqueConstraintError, ValidationError } from 'sequelize';
import { UsersValidationUtils } from '@toke/shared';

import TenantManager from '../tenant/database/db.tenant-manager.js';
import EmployeePlanningProfile from '../tenant/class/EmployeePlanningProfile.js';
import OrgHierarchy from '../tenant/class/OrgHierarchy.js';
import PlanningSuggestionConfig from '../tenant/class/PlanningSuggestionConfig.js';
import PlanningSuggestionRequirement from '../tenant/class/PlanningSuggestionRequirement.js';
import ScheduleSuggestion from '../tenant/class/ScheduleSuggestion.js';
import ScheduleSuggestionItem from '../tenant/class/ScheduleSuggestionItem.js';
import User from '../tenant/class/User.js';

import {
  EngineConfig,
  EngineResult,
  EngineTemplate,
  PlanningEmployeeInput,
  PlanningInfeasibleError,
  PlanningRequirementInput,
} from './suggestion.engine.js';
import { supportsOrToolsFixedAlternation } from './solver/ortools.planning.solver.js';
import PlanningSolverFactory from './solver/planning.solver.factory.js';
import { FIXED_ALTERNATION_MESSAGES, validatePlanningPreflight } from './planning.preflight.validation.service.js';
import { prepareFixedAlternation, summarizeFixedAlternation } from './planning.fixed.alternation.js';
import {
  analyzePlanningHistory,
  emptyPlanningHistoryAnalysis,
  HistoryAdjustment,
  HistoryRequirementDescriptor,
  PlanningHistoryAnalysis,
} from './planning.history.analysis.service.js';
import { normalizePlanningHorizon, projectEngineResultToRequestedPeriod, } from './planning.horizon.js';
import {
  ROLLING_HORIZON_DEFAULTS,
  buildMergedRollingResult,
  buildRollingBoundaryState,
  buildRollingFairnessBaseline,
  buildRollingWindowLocks,
  buildRollingWindows,
  buildTemplateCatalog,
  commitEngineWindow,
  createCommittedState,
  rollingDayCount,
  RollingChunkMetadata,
} from './planning.rolling.horizon.js';
import {
  fixedAlternationContractVersion,
  FixedAlternationAcknowledgementError,
  PlanningSolverExecutionMetadata,
  PlanningSolverInput,
  PlanningSolverTechnicalError,
  withSolverDiagnostics,
} from './solver/planning.solver.js';

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function dayKey(iso: string): keyof EngineTemplate['definition'] {
  const day = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return DAY_KEYS[day] as keyof EngineTemplate['definition'];
}

function templateHasWork(template: EngineTemplate, iso: string): boolean {
  const blocks = template.definition?.[dayKey(iso)];
  return Array.isArray(blocks) && blocks.length > 0;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + (minutes ?? 0);
}

function templateMinutes(template: EngineTemplate, iso: string): number {
  const blocks = template.definition?.[dayKey(iso)] ?? [];
  return blocks.reduce((total, block) => {
    const start = toMinutes(block.work[0]);
    let end = toMinutes(block.work[1]);
    if (end <= start) end += 24 * 60;

    let duration = end - start;
    if (block.pause) {
      const pauseStart = toMinutes(block.pause[0]);
      let pauseEnd = toMinutes(block.pause[1]);
      if (pauseEnd <= pauseStart) pauseEnd += 24 * 60;
      duration -= pauseEnd - pauseStart;
    }

    return total + Math.max(0, duration);
  }, 0);
}

function continuationCreditedMinutes(
  requirement: PlanningRequirementInput,
  guardDate: string,
  continuationDate: string,
): number {
  if (!requirement.continuationTemplate) return 0;

  const mainActual = templateMinutes(requirement.template, guardDate);
  const continuationActual = templateMinutes(requirement.continuationTemplate, continuationDate);
  const totalActual = mainActual + continuationActual;
  const credited = requirement.creditedMinutes ?? totalActual;

  if (totalActual <= 0) return 0;
  const mainCredited = Math.round(credited * (mainActual / totalActual));
  return Math.max(0, credited - mainCredited);
}

export class SuggestionGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SuggestionGenerationError';
  }
}

export interface TemporarilyExcludedEmployee {
  guid: string;
  name: string;
}

export interface GeneratedSuggestionPayload {
  suggestion: ScheduleSuggestion;
  engineResult: EngineResult;
  employeeCount: number;
  excludedEmployeeCount: number;
  excludedEmployees: TemporarilyExcludedEmployee[];
  configGuid: string;
  configVersion: number;
  solver: PlanningSolverExecutionMetadata;
}

export interface ConfiguredSuggestionSolvePayload {
  manager: User;
  config: PlanningSuggestionConfig;
  engineResult: EngineResult;
  employeeCount: number;
  excludedEmployeeCount: number;
  excludedEmployees: TemporarilyExcludedEmployee[];
  configGuid: string;
  configVersion: number;
  solver: PlanningSolverExecutionMetadata;
  persistedDiagnostics: Record<string, any>;
  historyWeeks: number;
}

export async function solveConfiguredSuggestion(
  managerGuid: string,
  periodFrom: string,
  periodTo: string,
  excludedEmployeeGuids: string[] = [],
  lockedAssignments: NonNullable<PlanningSolverInput['lockedAssignments']> = [],
  historyAdjustments: HistoryAdjustment[] = [],
  legacyAfterMissingAcknowledgement = false,
): Promise<ConfiguredSuggestionSolvePayload> {
  if (!UsersValidationUtils.validateGuid(managerGuid)) {
    throw new SuggestionGenerationError('Invalid manager GUID', 'SUGGESTION_INVALID_GUID', 400);
  }

  const manager = await User._load(managerGuid, true);
  if (!manager) {
    throw new SuggestionGenerationError('Manager not found', 'SUGGESTION_MANAGER_NOT_FOUND', 404);
  }

  const isManager = await OrgHierarchy.hasManagerRole(manager.getId()!);
  if (!isManager) {
    throw new SuggestionGenerationError(
      'The specified user does not have manager privileges',
      'SUGGESTION_NOT_A_MANAGER',
      403,
    );
  }

  const config = await PlanningSuggestionConfig._loadActive();
  if (!config) {
    throw new SuggestionGenerationError(
      'No active planning suggestion configuration',
      'PLANNING_SUGGESTION_CONFIG_REQUIRED',
      422,
    );
  }

  const requirements = await PlanningSuggestionRequirement._listByConfig(config.getId()!, true);

  if (!requirements?.length) {
    throw new SuggestionGenerationError(
      'The active configuration has no coverage requirements',
      'PLANNING_SUGGESTION_REQUIREMENTS_REQUIRED',
      422,
    );
  }

  const teamResult = await OrgHierarchy.getAllTeamMembers(manager.getId()!, false);
  const activeTeam = teamResult.all_employees_flat;

  if (activeTeam.length === 0) {
    throw new SuggestionGenerationError(
      'No active employee in the manager team',
      'SUGGESTION_NO_EMPLOYEES',
      422,
    );
  }

  const normalizedExcludedEmployeeGuids = [
    ...new Set(
      excludedEmployeeGuids
        .map((guid) => guid.trim())
        .filter(Boolean),
    ),
  ];

  const invalidExcludedEmployeeGuids = normalizedExcludedEmployeeGuids.filter(
    (guid) => !UsersValidationUtils.validateGuid(guid),
  );

  if (invalidExcludedEmployeeGuids.length > 0) {
    throw new SuggestionGenerationError(
      'One or more temporarily excluded employee GUIDs are invalid',
      'SUGGESTION_INVALID_EXCLUDED_EMPLOYEE_GUID',
      400,
      { employee_guids: invalidExcludedEmployeeGuids },
    );
  }

  const activeTeamByGuid = new Map(
    activeTeam.flatMap((employee) => {
      const guid = employee.getGuid();
      return guid ? [[guid, employee] as const] : [];
    }),
  );

  const outOfScopeExcludedEmployeeGuids = normalizedExcludedEmployeeGuids.filter(
    (guid) => !activeTeamByGuid.has(guid),
  );

  if (outOfScopeExcludedEmployeeGuids.length > 0) {
    throw new SuggestionGenerationError(
      'A temporarily excluded employee is not part of the manager active team',
      'SUGGESTION_EXCLUDED_EMPLOYEE_OUT_OF_SCOPE',
      422,
      { employee_guids: outOfScopeExcludedEmployeeGuids },
    );
  }

  const excludedEmployeeGuidSet = new Set(normalizedExcludedEmployeeGuids);
  const excludedEmployees: TemporarilyExcludedEmployee[] =
    normalizedExcludedEmployeeGuids.map((guid) => {
      const employee = activeTeamByGuid.get(guid)!;
      return {
        guid,
        name: employee.getFullName(),
      };
    });

  // Important : l'exclusion ponctuelle est appliquée AVANT la validation des
  // profils et AVANT la construction du payload OR-Tools. Elle ne crée donc
  // jamais un faux repos dans la suggestion.
  const generationTeam = activeTeam.filter((employee) => {
    const guid = employee.getGuid();
    return !guid || !excludedEmployeeGuidSet.has(guid);
  });

  const activeTeamIds = new Set(
    generationTeam
      .map((employee) => employee.getId())
      .filter((id): id is number => typeof id === 'number'),
  );

  if (activeTeamIds.size === 0) {
    throw new SuggestionGenerationError(
      'No employee remains in scope after temporary exclusions',
      'SUGGESTION_NO_EMPLOYEES',
      422,
      { excluded_employees: excludedEmployees },
    );
  }

  const allProfiles = await EmployeePlanningProfile._listActive();
  const teamProfiles =
    allProfiles?.filter(
      (profile) => profile.getUser() !== undefined && activeTeamIds.has(profile.getUser()!),
    ) ?? [];

  const configuredUserIds = new Set(
    teamProfiles
      .map((profile) => profile.getUser())
      .filter((id): id is number => typeof id === 'number'),
  );

  const unconfiguredEmployees = generationTeam.filter(
    (employee) => !configuredUserIds.has(employee.getId()!),
  );

  if (unconfiguredEmployees.length > 0) {
    throw new SuggestionGenerationError(
      'Every active employee must have a planning profile before generation',
      'EMPLOYEE_PLANNING_PROFILE_INCOMPLETE',
      422,
      {
        employees: unconfiguredEmployees.map((employee) => ({
          guid: employee.getGuid(),
          name: employee.getFullName(),
        })),
      },
    );
  }

  const employees: PlanningEmployeeInput[] = [];

  for (const profile of teamProfiles) {
    const user = await profile.getUserObj();
    if (!user || profile.isExcluded()) continue;

    const fixedTemplate = profile.isFixed() ? await profile.getFixedSessionTemplateObj() : null;

    if (profile.isFixed() && !fixedTemplate) {
      throw new SuggestionGenerationError(
        `Fixed employee ${user.getFullName()} has no fixed template`,
        'FIXED_EMPLOYEE_TEMPLATE_REQUIRED',
        422,
      );
    }

    employees.push({
      guid: user.getGuid()!,
      name: user.getFullName(),
      code: (user as any).getEmployeeCode?.() ?? '',
      mode: profile.getPlanningMode(),
      rotationOrder: profile.getRotationOrder() ?? null,
      maxWeeklyMinutes: profile.getMaxWeeklyMinutes() ?? null,
      fixedRestDayMode: profile.getFixedRestDayMode(),
      fixedTemplate: fixedTemplate
        ? {
            guid: fixedTemplate.getGuid()!,
            name: fixedTemplate.getName()!,
            definition: fixedTemplate.getDefinition(),
          }
        : null,
    });
  }

  if (employees.length === 0) {
    throw new SuggestionGenerationError(
      'No employee is eligible for automatic planning',
      'SUGGESTION_NO_EMPLOYEES',
      422,
    );
  }

  if (config.getWeeklyLeaveMode() === 'TEAM_ROTATION') {
    const selector = config.getWeeklyLeaveSelector();
    if (selector.guard_pool_relation !== 'ANY') {
      throw new SuggestionGenerationError(
        'TEAM_ROTATION cannot select weekly leave from guard-pool membership; use PER_ELIGIBLE_EMPLOYEE',
        'TEAM_WEEKLY_LEAVE_POOL_SELECTOR_UNSUPPORTED',
        422,
        {
          configuredGuardPoolRelation: selector.guard_pool_relation,
          recommendedMode: 'PER_ELIGIBLE_EMPLOYEE',
        },
      );
    }

    if (config.getSolverType() !== 'ORTOOLS' || config.shouldFallbackToGreedy()) {
      throw new SuggestionGenerationError(
        'TEAM_ROTATION requires ORTOOLS and fallback_to_greedy=false',
        'TEAM_WEEKLY_LEAVE_REQUIRES_ORTOOLS',
        422,
      );
    }

    const missingRotationOrder = employees.filter(
      (employee) => employee.rotationOrder === null || employee.rotationOrder < 1,
    );
    if (missingRotationOrder.length > 0) {
      throw new SuggestionGenerationError(
        'Every included employee requires rotation_order for TEAM_ROTATION',
        'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_REQUIRED',
        422,
        {
          employees: missingRotationOrder.map((employee) => ({
            guid: employee.guid,
            name: employee.name,
          })),
        },
      );
    }

    const rotationOrders = employees.map((employee) => employee.rotationOrder!);
    if (new Set(rotationOrders).size !== rotationOrders.length) {
      throw new SuggestionGenerationError(
        'rotation_order must be unique for TEAM_ROTATION',
        'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_DUPLICATE',
        422,
      );
    }

    if (config.getWeeklyLeaveEmployeesPerWeek() > employees.length) {
      throw new SuggestionGenerationError(
        'weekly_leave_employees_per_week exceeds included employees',
        'TEAM_WEEKLY_LEAVE_EMPLOYEE_COUNT_INVALID',
        422,
      );
    }
  }

  if (config.getWeeklyLeaveMode() === 'PER_ELIGIBLE_EMPLOYEE') {
    if (config.getSolverType() !== 'ORTOOLS' || config.shouldFallbackToGreedy()) {
      throw new SuggestionGenerationError(
        'PER_ELIGIBLE_EMPLOYEE requires ORTOOLS and fallback_to_greedy=false',
        'ELIGIBLE_WEEKLY_LEAVE_REQUIRES_ORTOOLS',
        422,
      );
    }

    const selector = config.getWeeklyLeaveSelector();
    if (selector.guard_pool_relation !== 'ANY' && config.getGuardTeamMode() !== 'WEEKLY_POOL') {
      throw new SuggestionGenerationError(
        'A weekly leave selector based on guard pool membership requires WEEKLY_POOL',
        'ELIGIBLE_WEEKLY_LEAVE_GUARD_POOL_REQUIRED',
        422,
      );
    }
  }

  if (config.getGuardTeamMode() === 'WEEKLY_POOL') {
    if (config.getSolverType() !== 'ORTOOLS' || config.shouldFallbackToGreedy()) {
      throw new SuggestionGenerationError(
        'WEEKLY_POOL requires ORTOOLS and fallback_to_greedy=false',
        'WEEKLY_GUARD_POOL_REQUIRES_ORTOOLS',
        422,
      );
    }

    const rotatingEmployees = employees.filter((employee) => employee.mode === 'ROTATING');

    if (config.getGuardTeamEmployeesPerWeek() > rotatingEmployees.length) {
      throw new SuggestionGenerationError(
        'guard_team_employees_per_week exceeds ROTATING employees',
        'WEEKLY_GUARD_POOL_EMPLOYEE_COUNT_INVALID',
        422,
        {
          configured: config.getGuardTeamEmployeesPerWeek(),
          rotatingEmployees: rotatingEmployees.length,
        },
      );
    }

    if (config.getGuardTeamSelectionMode() === 'ROTATION_ORDER') {
      const missingRotationOrder = rotatingEmployees.filter(
        (employee) => employee.rotationOrder === null || employee.rotationOrder < 1,
      );
      if (missingRotationOrder.length > 0) {
        throw new SuggestionGenerationError(
          'Every ROTATING employee requires rotation_order for guard pool rotation',
          'WEEKLY_GUARD_POOL_ROTATION_ORDER_REQUIRED',
          422,
          {
            employees: missingRotationOrder.map((employee) => ({
              guid: employee.guid,
              name: employee.name,
            })),
          },
        );
      }

      const rotationOrders = rotatingEmployees.map((employee) => employee.rotationOrder!);
      if (new Set(rotationOrders).size !== rotationOrders.length) {
        throw new SuggestionGenerationError(
          'rotation_order must be unique among ROTATING employees for guard pool rotation',
          'WEEKLY_GUARD_POOL_ROTATION_ORDER_DUPLICATE',
          422,
        );
      }
    }
  }

  const engineRequirements: PlanningRequirementInput[] = [];

  for (const requirement of requirements) {
    const template = await requirement.getSessionTemplateObj();
    if (!template) {
      throw new SuggestionGenerationError(
        `Requirement ${requirement.getGuid()} references an unavailable template`,
        'PLANNING_SUGGESTION_TEMPLATE_NOT_FOUND',
        422,
      );
    }

    const templateGuid = template.getGuid()!;

    const continuationTemplate = requirement.isGuard()
      ? await requirement.getContinuationTemplateObj()
      : null;

    if (requirement.isGuard() && !continuationTemplate) {
      throw new SuggestionGenerationError(
        `Guard requirement ${requirement.getGuid()} has no continuation template`,
        'PLANNING_SUGGESTION_GUARD_CONTINUATION_REQUIRED',
        422,
      );
    }

    if (continuationTemplate) {
    }

    engineRequirements.push({
      guid: requirement.getGuid()!,
      dayOfWeek: requirement.getDayOfWeek()!,
      serviceType: requirement.getServiceType(),
      minEmployees: requirement.getMinEmployees(),
      targetEmployees: requirement.getTargetEmployees(),
      maxEmployees: requirement.getMaxEmployees() ?? null,
      priority: requirement.getPriority(),
      allocationMode: requirement.getAllocationMode(),
      template: {
        guid: templateGuid,
        name: template.getName()!,
        definition: template.getDefinition(),
      },
      continuationTemplate: continuationTemplate
        ? {
            guid: continuationTemplate.getGuid()!,
            name: continuationTemplate.getName()!,
            definition: continuationTemplate.getDefinition(),
          }
        : null,
      continuationDayOffset: requirement.getContinuationDayOffset(),
      creditedMinutes: requirement.getCreditedMinutes() ?? null,
      eligibility: {
        planningModes: requirement.getEligibilityPolicy().planning_modes,
        guardPoolRelation: requirement.getEligibilityPolicy().guard_pool_relation,
      },
    });
  }

  const engineConfig: EngineConfig = {
    minRestDaysPerWeek: config.getMinRestDaysPerWeek(),
    maxConsecutiveWorkDays: config.getMaxConsecutiveWorkDays() ?? null,
    maxWeeklyMinutes: config.getMaxWeeklyMinutes() ?? null,
    minRestMinutesBetweenShifts: config.getMinRestMinutesBetweenShifts(),
    maxConsecutiveGuards: config.getMaxConsecutiveGuards(),
    restAfterGuardRequired: config.isRestAfterGuardRequired(),
    postGuardRestDays: config.getPostGuardRestDays(),
    maxRestingEmployeesPerDay: config.getMaxRestingEmployeesPerDay() ?? null,
    fairnessWindowWeeks: config.getFairnessWindowWeeks(),
    strictCoverage: config.isStrictCoverage(),
    weeklyLeavePolicy: {
      mode: config.getWeeklyLeaveMode(),
      employeesPerWeek: config.getWeeklyLeaveEmployeesPerWeek(),
      allowedDays: config.getWeeklyLeaveAllowedDays() as any,
      rotationAnchorDate: config.getWeeklyLeaveRotationAnchorDate() ?? null,
      completeWeeksOnly: config.isWeeklyLeaveCompleteWeeksOnly(),
      postGuardRestCountsAsLeave: config.doesPostGuardRestCountAsWeeklyLeave(),
      selector: {
        planningModes: config.getWeeklyLeaveSelector().planning_modes,
        guardPoolRelation: config.getWeeklyLeaveSelector().guard_pool_relation,
      },
      daysPerEmployee: config.getWeeklyLeaveDaysPerEmployee(),
      countMode: config.getWeeklyLeaveCountMode(),
      maxEmployeesPerDay: config.getWeeklyLeaveMaxEmployeesPerDay() ?? null,
      requireWorkOnOtherDays: config.doesWeeklyLeaveRequireWorkOnOtherDays(),
      serviceScope: {
        mode: config.getWeeklyLeaveServiceScope().mode,
        serviceTypes: config.getWeeklyLeaveServiceScope().service_types,
        templateGuids: config.getWeeklyLeaveServiceScope().template_guids,
        requirementGuids: config.getWeeklyLeaveServiceScope().requirement_guids,
        exclusive: config.getWeeklyLeaveServiceScope().exclusive,
      },
    },
    guardTeamPolicy: {
      mode: config.getGuardTeamMode(),
      employeesPerWeek: config.getGuardTeamEmployeesPerWeek(),
      selectionMode: config.getGuardTeamSelectionMode(),
      rotationAnchorDate: config.getGuardTeamRotationAnchorDate() ?? null,
      completeWeeksOnly: config.isGuardTeamCompleteWeeksOnly(),
      requireParticipation: config.doesGuardTeamRequireParticipation(),
      eligiblePlanningModes: config.getGuardTeamEligiblePlanningModes(),
      memberServiceAccess: config.getGuardTeamMemberServiceAccess(),
      balance: {
        mode: config.getGuardTeamBalanceMode(),
        maxMembershipSpread: config.getGuardTeamMaxMembershipSpread() ?? null,
        maxConsecutiveMembershipWeeks: config.getGuardTeamMaxConsecutiveMembershipWeeks() ?? null,
      },
    },
  };

  const configuredAlternation = config.getFixedAlternationPolicy();
  const limitedServiceConfigured = Boolean(configuredAlternation?.enabled && configuredAlternation.limited_service_template_guid);
  const horizon = normalizePlanningHorizon(periodFrom, periodTo, {
    config: engineConfig,
    requiresCalendarWeeks: limitedServiceConfigured,
    hasEmployeeWeeklyMinuteLimits: employees.some((employee) => employee.maxWeeklyMinutes !== null),
  });

  const historyWeeks = config.getFairnessWindowWeeks();
  const historyFrom = addDays(horizon.solveFrom, -(historyWeeks * 7));
  if (
    config.getGuardTeamMode() === 'WEEKLY_POOL' &&
    !engineRequirements.some((requirement) => requirement.serviceType === 'GUARD')
  ) {
    throw new SuggestionGenerationError(
      'WEEKLY_POOL requires at least one active GUARD requirement',
      'WEEKLY_GUARD_POOL_REQUIREMENT_REQUIRED',
      422,
    );
  }

  const poolScopedRequirements = engineRequirements.filter(
    (requirement) => requirement.eligibility.guardPoolRelation !== 'ANY',
  );

  if (config.getGuardTeamMode() !== 'WEEKLY_POOL' && poolScopedRequirements.length > 0) {
    throw new SuggestionGenerationError(
      'Requirements using MEMBER or NON_MEMBER require WEEKLY_POOL',
      'PLANNING_REQUIREMENT_GUARD_POOL_REQUIRED',
      422,
      {
        requirements: poolScopedRequirements.map((requirement) => requirement.guid),
      },
    );
  }

  if (config.getGuardTeamMode() === 'WEEKLY_POOL') {
    const nonMemberGuards = engineRequirements.filter(
      (requirement) =>
        requirement.serviceType === 'GUARD' &&
        requirement.eligibility.guardPoolRelation === 'NON_MEMBER',
    );

    if (nonMemberGuards.length > 0) {
      throw new SuggestionGenerationError(
        'A GUARD requirement cannot target NON_MEMBER while WEEKLY_POOL is active',
        'PLANNING_REQUIREMENT_GUARD_POOL_CONFLICT',
        422,
        {
          requirements: nonMemberGuards.map((requirement) => requirement.guid),
        },
      );
    }

    if (config.getGuardTeamMemberServiceAccess() === 'GUARD_ONLY') {
      const memberStandardRequirements = engineRequirements.filter(
        (requirement) =>
          requirement.serviceType === 'STANDARD' &&
          requirement.minEmployees > 0 &&
          requirement.eligibility.guardPoolRelation === 'MEMBER',
      );

      if (memberStandardRequirements.length > 0) {
        throw new SuggestionGenerationError(
          'A STANDARD requirement cannot target MEMBER when pool members are GUARD_ONLY',
          'PLANNING_REQUIREMENT_MEMBER_SERVICE_CONFLICT',
          422,
          {
            requirements: memberStandardRequirements.map((requirement) => requirement.guid),
          },
        );
      }
    }
  }

  // API preflight: reject deterministic impossibilities before any history load
  // and before the OR-Tools HTTP request. This is intentionally conservative:
  // only mathematically certain failures are blocking here.
  const requestedSolverType = lockedAssignments.length > 0
    ? 'ORTOOLS' as const
    : config.getSolverType();
  const ortoolsEndpoint = process.env.PLANNING_ORTOOLS_URL;
  const fixedAlternation = prepareFixedAlternation(configuredAlternation, employees, excludedEmployeeGuids);
  const alternatingPolicy = fixedAlternation?.policy;
  if (limitedServiceConfigured && !alternatingPolicy) {
    throw new SuggestionGenerationError(
      'La règle du service de 10 h 30 nécessite les deux profils fixes configurés.',
      'FIXED_ALTERNATION_LIMITED_SERVICE_PAIR_REQUIRED', 422, { reason: fixedAlternation?.reason },
    );
  }
  const mandatoryWeekendRest = alternatingPolicy?.weekendRest === 'ALTERNATE_SAT_SUN';
  const fixedAlternationSupported = Boolean(!legacyAfterMissingAcknowledgement && alternatingPolicy && requestedSolverType === 'ORTOOLS' &&
    await supportsOrToolsFixedAlternation(ortoolsEndpoint, fixedAlternationContractVersion(alternatingPolicy)));
  if (mandatoryWeekendRest && !fixedAlternationSupported) {
    throw new SuggestionGenerationError(
      limitedServiceConfigured ? 'Le moteur configuré ne prend pas en charge la règle du service de 10 h 30.'
        : 'Le moteur configuré ne peut pas garantir les repos alternés du week-end.',
      limitedServiceConfigured ? 'FIXED_ALTERNATION_LIMITED_SERVICE_UNSUPPORTED' : 'FIXED_ALTERNATION_WEEKEND_REST_UNSUPPORTED',
      503,
    );
  }
  const solverPolicy = fixedAlternationSupported ? alternatingPolicy : undefined;
  const preflightInput = {
    employees,
    requirements: engineRequirements,
    config: engineConfig,
    periodFrom: horizon.solveFrom,
    periodTo: horizon.solveTo,
    lockedAssignments,
    configGuid: config.getGuid()!,
  };
  const preflight = validatePlanningPreflight({
    ...preflightInput,
    fixedAlternationStatus: fixedAlternationSupported ? undefined : fixedAlternation?.status,
    fixedAlternationPolicy: solverPolicy,
  });

  if (!preflight.valid) {
    throw new SuggestionGenerationError(
      'Planning input failed API feasibility pre-checks',
      'PLANNING_PREFLIGHT_INFEASIBLE',
      422,
      preflight,
    );
  }

  const historyTo = addDays(horizon.solveFrom, -1);
  const historyEmployees = employees.map((employee) => ({
    guid: employee.guid,
    name: employee.name,
  }));
  const historyRequirements: HistoryRequirementDescriptor[] = engineRequirements.map(
    (requirement) => ({
      guid: requirement.guid,
      dayOfWeek: requirement.dayOfWeek,
      serviceType: requirement.serviceType,
      templateGuid: requirement.template.guid,
      templateName: requirement.template.name,
      minEmployees: requirement.minEmployees,
      targetEmployees: requirement.targetEmployees,
      maxEmployees: requirement.maxEmployees,
      continuationTemplateGuid: requirement.continuationTemplate?.guid ?? null,
      continuationDayOffset: requirement.continuationDayOffset,
    }),
  );

  let historyAnalysis: PlanningHistoryAnalysis;
  try {
    historyAnalysis = await analyzePlanningHistory({
      employees: historyEmployees,
      requirements: historyRequirements,
      historyFrom,
      historyTo,
      solveFrom: horizon.solveFrom,
      postGuardRestDays: engineConfig.postGuardRestDays,
      adjustments: historyAdjustments,
    });
  } catch (error: any) {
    // Historical data is advisory for fairness. It must never prevent the
    // manager from obtaining a new suggestion.
    historyAnalysis = emptyPlanningHistoryAnalysis({
      employees: historyEmployees,
      historyFrom,
      historyTo,
      message: error?.message ?? 'Historical fairness could not be analysed.',
    });
  }

  const boundaryGuardDate = addDays(horizon.solveFrom, -1);
  const boundaryContinuationsByEmployee = new Map<
    string,
    NonNullable<PlanningSolverInput['boundaryState']>['guardContinuations'][number]
  >();

  for (const fact of historyAnalysis.boundaryGuardFacts) {
    if (fact.guardDate !== boundaryGuardDate) continue;

    const guardRequirement = engineRequirements.find(
      (requirement) =>
        requirement.serviceType === 'GUARD' &&
        requirement.template.guid === fact.templateGuid &&
        requirement.continuationDayOffset === 1 &&
        requirement.continuationTemplate !== null,
    );

    if (!guardRequirement?.continuationTemplate) continue;
    if (!templateHasWork(guardRequirement.continuationTemplate, horizon.solveFrom)) continue;

    boundaryContinuationsByEmployee.set(fact.employeeGuid, {
      employeeGuid: fact.employeeGuid,
      guardDate: fact.guardDate,
      continuationDate: horizon.solveFrom,
      continuationTemplate: guardRequirement.continuationTemplate,
      creditedMinutes: continuationCreditedMinutes(
        guardRequirement,
        fact.guardDate,
        horizon.solveFrom,
      ),
    });
  }

  const boundaryState = {
    guardContinuations: [...boundaryContinuationsByEmployee.values()],
  };

  const planningDiagnosticsEnabled =
    (globalThis as any).process?.env?.PLANNING_DIAGNOSTICS === 'true';

  if (planningDiagnosticsEnabled) {
    console.info('[PLANNING_DIAG][HISTORY_FAIRNESS]', {
      historyFrom,
      historyTo,
      available: historyAnalysis.available,
      summary: historyAnalysis.summary,
      anomalyCount: historyAnalysis.anomalies.length,
      boundaryGuardFactCount: historyAnalysis.boundaryGuardFacts.length,
    });

    console.info('[PLANNING_DIAG][BOUNDARY_STATE_FINAL]', {
      continuationCount: boundaryState.guardContinuations.length,
      continuations: boundaryState.guardContinuations.map((item) => ({
        employeeGuid: item.employeeGuid,
        guardDate: item.guardDate,
        continuationDate: item.continuationDate,
        continuationTemplateGuid: item.continuationTemplate.guid,
        creditedMinutes: item.creditedMinutes,
      })),
    });
  }

  const totalSolveDays = rollingDayCount(horizon.solveFrom, horizon.solveTo);
  const rollingEnabled =
    requestedSolverType === 'ORTOOLS' &&
    totalSolveDays > ROLLING_HORIZON_DEFAULTS.thresholdDays;

  let engineResult: EngineResult;
  let solverMetadata: PlanningSolverExecutionMetadata;
  let historyBoundaryRelaxed = false;
  let rollingMetadata: Record<string, any> = {
    enabled: false,
    thresholdDays: ROLLING_HORIZON_DEFAULTS.thresholdDays,
    commitDays: ROLLING_HORIZON_DEFAULTS.commitDays,
    overlapDays: ROLLING_HORIZON_DEFAULTS.overlapDays,
    lookaheadDays: ROLLING_HORIZON_DEFAULTS.lookaheadDays,
    totalSolveDays,
    chunkCount: 1,
    totalSolverDurationMs: 0,
    chunks: [],
  };

  const baseSolveOptions = {
    solverType: requestedSolverType,
    // A rolling plan cannot safely fall back to GREEDY after the first chunk,
    // because subsequent windows contain overlap locks. Keep one solver model
    // for the complete suggestion.
    fallbackToGreedy: rollingEnabled || mandatoryWeekendRest
      ? false
      : (lockedAssignments.length > 0 ? false : config.shouldFallbackToGreedy()),
    ortoolsEndpoint,
    fixedAlternationSupported,
  };

  const solveOneWindow = async (
    input: PlanningSolverInput,
    allowBoundaryRelaxation: boolean,
  ): Promise<{
    result: EngineResult;
    metadata: PlanningSolverExecutionMetadata;
    boundaryRelaxed: boolean;
  }> => {
    const windowPreflight = validatePlanningPreflight({
      ...input,
      configGuid: config.getGuid()!,
    }, { workCapacityOnly: true });
    if (!windowPreflight.valid) {
      throw new SuggestionGenerationError(
        'La capacité des services ne permet pas de respecter le travail obligatoire.',
        'PLANNING_PREFLIGHT_INFEASIBLE', 422, windowPreflight,
      );
    }
    try {
      const execution = await PlanningSolverFactory.solve(input, baseSolveOptions);
      return { result: execution.result, metadata: execution.metadata, boundaryRelaxed: false };
    } catch (error) {
      if (
        allowBoundaryRelaxation && !mandatoryWeekendRest &&
        (input.boundaryState?.guardContinuations.length ?? 0) > 0 &&
        (
          error instanceof PlanningInfeasibleError ||
          (
            error instanceof PlanningSolverTechnicalError &&
            error.code === 'PLANNING_SOLVER_INVALID_INPUT'
          )
        )
      ) {
        const retry = await PlanningSolverFactory.solve(
          {
            ...input,
            boundaryState: { guardContinuations: [] },
          },
          baseSolveOptions,
        );
        return { result: retry.result, metadata: retry.metadata, boundaryRelaxed: true };
      }
      throw error;
    }
  };

  try {
    if (!rollingEnabled) {
      const solverInput: PlanningSolverInput = {
        ...(solverPolicy && { fixedAlternationPolicy: solverPolicy }),
        employees,
        requirements: engineRequirements,
        historicalAssignments: [],
        historicalFairness: historyAnalysis.fairness,
        boundaryState,
        lockedAssignments,
        periodFrom: horizon.solveFrom,
        periodTo: horizon.solveTo,
        requestedPeriodFrom: periodFrom,
        requestedPeriodTo: periodTo,
        config: engineConfig,
      };

      const solvedWindow = await solveOneWindow(solverInput, true);
      engineResult = solvedWindow.result;
      solverMetadata = solvedWindow.metadata;
      historyBoundaryRelaxed = solvedWindow.boundaryRelaxed;
      rollingMetadata.totalSolverDurationMs = solverMetadata.durationMs;
    } else {
      const windows = buildRollingWindows(horizon.solveFrom, horizon.solveTo);
      const committedState = createCommittedState(employees);
      const templates = buildTemplateCatalog(employees, engineRequirements, lockedAssignments);
      const solvedChunks: Array<{ result: EngineResult; window: ReturnType<typeof buildRollingWindows>[number] }> = [];
      const chunkMetadata: RollingChunkMetadata[] = [];
      let totalDurationMs = 0;
      let lastMetadata: PlanningSolverExecutionMetadata | null = null;

      if (planningDiagnosticsEnabled) {
        console.info('[PLANNING_DIAG][ROLLING_HORIZON_START]', {
          requestedPeriodFrom: periodFrom,
          requestedPeriodTo: periodTo,
          solveFrom: horizon.solveFrom,
          solveTo: horizon.solveTo,
          totalSolveDays,
          chunks: windows.length,
          commitDays: ROLLING_HORIZON_DEFAULTS.commitDays,
          overlapDays: ROLLING_HORIZON_DEFAULTS.overlapDays,
          lookaheadDays: ROLLING_HORIZON_DEFAULTS.lookaheadDays,
        });
      }

      for (const window of windows) {
        const windowLocks = buildRollingWindowLocks(
          committedState,
          window,
          lockedAssignments,
          engineRequirements,
          templates,
        );
        const windowFairness = buildRollingFairnessBaseline(
          historyAnalysis.fairness,
          committedState,
          window.solveFrom,
          engineRequirements,
          templates,
        );
        const windowBoundary = window.solveFrom === horizon.solveFrom
          ? boundaryState
          : buildRollingBoundaryState(committedState, window.solveFrom, engineRequirements);

        const input: PlanningSolverInput = {
          ...(solverPolicy && { fixedAlternationPolicy: solverPolicy }),
          employees,
          requirements: engineRequirements,
          historicalAssignments: [],
          historicalFairness: windowFairness,
          boundaryState: windowBoundary,
          lockedAssignments: windowLocks.locks,
          periodFrom: window.solveFrom,
          periodTo: window.solveTo,
          requestedPeriodFrom: window.commitFrom,
          requestedPeriodTo: window.commitTo,
          config: engineConfig,
        };

        // Only a boundary coming from real pre-existing history is advisory.
        // Boundaries derived from already committed rolling chunks must remain
        // hard; otherwise a later chunk could contradict an earlier one.
        const canRelaxHistoricalBoundary =
          window.solveFrom === horizon.solveFrom && window.index <= 1;
        const solvedWindow = await solveOneWindow(input, canRelaxHistoricalBoundary);
        historyBoundaryRelaxed = historyBoundaryRelaxed || solvedWindow.boundaryRelaxed;
        lastMetadata = solvedWindow.metadata;
        totalDurationMs += solvedWindow.metadata.durationMs;

        commitEngineWindow(
          committedState,
          solvedWindow.result,
          window.commitFrom,
          window.commitTo,
        );
        solvedChunks.push({ result: solvedWindow.result, window });
        chunkMetadata.push({
          ...window,
          durationMs: solvedWindow.metadata.durationMs,
          solverVersion: solvedWindow.metadata.solverVersion,
          committedDays: rollingDayCount(window.commitFrom, window.commitTo),
          lockedCarryCount: windowLocks.carryCount,
          managerLockCount: windowLocks.managerCount,
          boundaryContinuationCount: windowBoundary.guardContinuations.length,
        });

        if (planningDiagnosticsEnabled) {
          console.info('[PLANNING_DIAG][ROLLING_HORIZON_CHUNK]', chunkMetadata.at(-1));
        }
      }

      if (!lastMetadata) {
        throw new PlanningSolverTechnicalError(
          'Rolling horizon did not execute any solver window',
          'PLANNING_SOLVER_PROTOCOL_ERROR',
        );
      }

      engineResult = buildMergedRollingResult(
        employees,
        committedState,
        solvedChunks,
        historyAnalysis.fairness,
        engineRequirements,
        templates,
      );
      solverMetadata = {
        ...lastMetadata,
        durationMs: totalDurationMs,
        fallbackUsed: false,
        warning: windows.length > 1
          ? `Rolling horizon: ${windows.length} solver windows`
          : lastMetadata.warning,
      };
      rollingMetadata = {
        enabled: true,
        thresholdDays: ROLLING_HORIZON_DEFAULTS.thresholdDays,
        commitDays: ROLLING_HORIZON_DEFAULTS.commitDays,
        overlapDays: ROLLING_HORIZON_DEFAULTS.overlapDays,
        lookaheadDays: ROLLING_HORIZON_DEFAULTS.lookaheadDays,
        totalSolveDays,
        chunkCount: windows.length,
        totalSolverDurationMs: totalDurationMs,
        chunks: chunkMetadata,
      };

      if (planningDiagnosticsEnabled) {
        console.info('[PLANNING_DIAG][ROLLING_HORIZON_DONE]', {
          chunkCount: windows.length,
          totalSolverDurationMs: totalDurationMs,
          conformityScore: engineResult.conformityScore,
        });
      }
    }
  } catch (error) {
    if (error instanceof FixedAlternationAcknowledgementError && solverPolicy && !mandatoryWeekendRest) {
      // Discard all calculated windows and rerun the historical preflight before accepting a legacy result.
      console.warn('[PLANNING_FIXED_ALTERNATION_ACK_MISSING]', error.details);
      return solveConfiguredSuggestion(
        managerGuid, periodFrom, periodTo, excludedEmployeeGuids, lockedAssignments, historyAdjustments, true,
      );
    }

    if (error instanceof PlanningInfeasibleError) {
      throw new SuggestionGenerationError(error.message, error.code, 422, error.diagnostics);
    }

    if (error instanceof PlanningSolverTechnicalError) {
      throw new SuggestionGenerationError(
        error.message,
        error.code,
        error.code === 'PLANNING_SOLVER_INVALID_INPUT' ? 422 : 503,
        error.details,
      );
    }

    throw error;
  }

  if (solverPolicy && solverMetadata.fallbackUsed) {
    const legacyPreflight = validatePlanningPreflight({
      ...preflightInput,
      fixedAlternationStatus: 'PENDING_SOLVER_SUPPORT',
    });
    if (!legacyPreflight.valid) {
      throw new SuggestionGenerationError(
        'Le moteur de repli ne peut pas satisfaire les contrôles de capacité des profils fixes.',
        'PLANNING_PREFLIGHT_INFEASIBLE',
        422,
        legacyPreflight,
      );
    }
  }
  engineResult = projectEngineResultToRequestedPeriod(engineResult, horizon);
  const alternationEvaluation = engineResult.diagnostics.fixedAlternationEvaluation;
  if (solverPolicy && alternationEvaluation) {
    engineResult.diagnostics.fixedAlternation = summarizeFixedAlternation(alternationEvaluation);
    delete engineResult.diagnostics.fixedAlternationEvaluation;
  } else if (fixedAlternation) {
    engineResult.diagnostics.fixedAlternation = {
      status: fixedAlternation.status,
      applied: false,
      message: legacyAfterMissingAcknowledgement
        ? 'Le moteur n’a pas confirmé la prise en charge. Le planning a été recalculé sans alternance.'
        : fixedAlternation.reason === 'EMPLOYEE_EXCLUDED'
          ? 'L’alternance ne s’applique pas car au moins un membre de la paire a été exclu.'
          : FIXED_ALTERNATION_MESSAGES[fixedAlternation.status],
      ...(fixedAlternation.reason && { reason: fixedAlternation.reason }),
      ...(fixedAlternation.missingEmployeeGuids && { missingEmployeeGuids: fixedAlternation.missingEmployeeGuids }),
      ...(legacyAfterMissingAcknowledgement && { reason: 'SOLVER_ACK_MISSING' as const }),
    };
  }
  solverMetadata = {
    ...solverMetadata,
    horizon,
  };

  const persistedDiagnostics = {
    ...withSolverDiagnostics(engineResult.diagnostics, solverMetadata),
    generationScope: {
      teamEmployeeCount: activeTeam.length,
      includedEmployeeCount: engineResult.items.length,
      temporaryExcludedEmployeeCount: excludedEmployees.length,
      temporaryExcludedEmployeeGuids: excludedEmployees.map((employee) => employee.guid),
      temporaryExcludedEmployees: excludedEmployees,
      configGuid: config.getGuid(),
      configVersion: config.getVersion(),
      lockedAssignmentCount: lockedAssignments.length,
      historyAdjustments,
    },
    historyReview: {
      available: historyAnalysis.available,
      historyFrom: historyAnalysis.historyFrom,
      historyTo: historyAnalysis.historyTo,
      summary: historyAnalysis.summary,
      anomalies: historyAnalysis.anomalies,
      fairness: historyAnalysis.fairness,
      boundaryGuardFacts: historyAnalysis.boundaryGuardFacts,
      boundaryRelaxedForFeasibility: historyBoundaryRelaxed,
      warning: historyAnalysis.warning ?? null,
    },
    rollingHorizon: rollingMetadata,
    apiPreflight: {
      valid: preflight.valid,
      checkedDates: preflight.checkedDates,
      checkedRequirements: preflight.checkedRequirements,
      warningCount: preflight.warningCount,
      warnings: preflight.warnings,
    },
  };

  return {
    manager,
    config,
    engineResult,
    employeeCount: engineResult.items.length,
    excludedEmployeeCount: excludedEmployees.length,
    excludedEmployees,
    configGuid: config.getGuid()!,
    configVersion: config.getVersion(),
    solver: solverMetadata,
    persistedDiagnostics,
    historyWeeks,
  };
}

export async function generateConfiguredSuggestion(
  managerGuid: string,
  periodFrom: string,
  periodTo: string,
  excludedEmployeeGuids: string[] = [],
  historyAdjustments: HistoryAdjustment[] = [],
): Promise<GeneratedSuggestionPayload> {
  const solved = await solveConfiguredSuggestion(
    managerGuid,
    periodFrom,
    periodTo,
    excludedEmployeeGuids,
    [],
    historyAdjustments,
  );

  const suggestion = await persistConfiguredSuggestion(solved, periodFrom, periodTo);

  return {
    suggestion,
    engineResult: solved.engineResult,
    employeeCount: solved.employeeCount,
    excludedEmployeeCount: solved.excludedEmployeeCount,
    excludedEmployees: solved.excludedEmployees,
    configGuid: solved.configGuid,
    configVersion: solved.configVersion,
    solver: solved.solver,
  };
}

export async function persistConfiguredSuggestion(
  solved: ConfiguredSuggestionSolvePayload,
  periodFrom: string,
  periodTo: string,
): Promise<ScheduleSuggestion> {
  const suggestion = new ScheduleSuggestion()
    .setTenant(solved.manager.getTenant()?.trim() || TenantManager.getCurrentTenant())
    .setManager(solved.manager.getId()!)
    .setPeriodFrom(periodFrom)
    .setPeriodTo(periodTo)
    .setHistoryWeeks(solved.historyWeeks)
    .setConformityScore(solved.engineResult.conformityScore)
    .setConfig(solved.config.getId()!)
    .setEngineVersion(solved.solver.solverVersion)
    .setDiagnostics(solved.persistedDiagnostics);

  const items = await Promise.all(solved.engineResult.items.map(async employeeResult => {
    const user = await User._load(employeeResult.userGuid, true);
    if (!user) {
      throw new SuggestionGenerationError(
        'Un collaborateur du planning est devenu indisponible. Relancez la génération.',
        'SUGGESTION_EMPLOYEE_NOT_FOUND',
        422,
      );
    }
    return new ScheduleSuggestionItem()
      .setUser(user.getId()!)
      .setSchedule(employeeResult.schedule)
      .setReasons(employeeResult.reasons);
  }));

  let stage: 'suggestion' | 'item' = 'suggestion';
  try {
    await TenantManager.getConnectionSync().transaction(async transaction => {
      await suggestion.save(transaction);
      stage = 'item';
      for (const item of items) {
        await item.setSuggestion(suggestion.getId()!).save(transaction);
      }
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError && stage === 'suggestion' &&
        (error.parent as { constraint?: string }).constraint === 'unique_manager_draft_suggestion_period') {
      throw new SuggestionGenerationError(
        'Un brouillon existe déjà pour cette période. Consultez, régénérez ou rejetez ce brouillon avant de relancer la génération.',
        'SUGGESTION_DRAFT_ALREADY_EXISTS',
        409,
        { period_from: periodFrom, period_to: periodTo },
      );
    }
    if (error instanceof ValidationError) {
      const fields = [...new Set(error.errors.flatMap(issue => issue.path ? [issue.path] : []))];
      console.warn('[PLANNING_SUGGESTION_PERSISTENCE_VALIDATION]', { stage, fields, name: error.name });
      throw new SuggestionGenerationError(
        'La suggestion a été calculée mais son enregistrement a échoué.',
        'SUGGESTION_PERSISTENCE_VALIDATION_FAILED',
        500,
        { stage, fields },
      );
    }
    throw error;
  }

  return suggestion;
}


// import { SAFamily, UsersValidationUtils } from '@toke/shared';
//
// import EmployeePlanningProfile from '../tenant/class/EmployeePlanningProfile.js';
// import Groups from '../tenant/class/Groups.js';
// import OrgHierarchy from '../tenant/class/OrgHierarchy.js';
// import PlanningSuggestionConfig from '../tenant/class/PlanningSuggestionConfig.js';
// import PlanningSuggestionRequirement from '../tenant/class/PlanningSuggestionRequirement.js';
// import ScheduleAssignments from '../tenant/class/ScheduleAssignments.js';
// import ScheduleSuggestion from '../tenant/class/ScheduleSuggestion.js';
// import ScheduleSuggestionItem from '../tenant/class/ScheduleSuggestionItem.js';
// import User from '../tenant/class/User.js';
//
// import {
//   EngineConfig,
//   EngineResult,
//   HistoricalAssignment,
//   HistoricalServiceType,
//   PlanningEmployeeInput,
//   PlanningInfeasibleError,
//   PlanningRequirementInput,
// } from './suggestion.engine.js';
// import PlanningSolverFactory from './solver/planning.solver.factory.js';
// import {
//   normalizePlanningHorizon,
//   projectEngineResultToRequestedPeriod,
// } from './planning.horizon.js';
// import {
//   PlanningSolverExecutionMetadata,
//   PlanningSolverInput,
//   PlanningSolverTechnicalError,
//   withSolverDiagnostics,
// } from './solver/planning.solver.js';
//
// function addDays(iso: string, amount: number): string {
//   const date = new Date(`${iso}T00:00:00.000Z`);
//   date.setUTCDate(date.getUTCDate() + amount);
//   return date.toISOString().slice(0, 10);
// }
//
// export class SuggestionGenerationError extends Error {
//   constructor(
//     message: string,
//     public readonly code: string,
//     public readonly status: number,
//     public readonly details?: unknown,
//   ) {
//     super(message);
//     this.name = 'SuggestionGenerationError';
//   }
// }
//
// export interface GeneratedSuggestionPayload {
//   suggestion: ScheduleSuggestion;
//   engineResult: EngineResult;
//   employeeCount: number;
//   configGuid: string;
//   configVersion: number;
//   solver: PlanningSolverExecutionMetadata;
// }
//
// export async function generateConfiguredSuggestion(
//   managerGuid: string,
//   periodFrom: string,
//   periodTo: string,
// ): Promise<GeneratedSuggestionPayload> {
//   if (!UsersValidationUtils.validateGuid(managerGuid)) {
//     throw new SuggestionGenerationError('Invalid manager GUID', 'SUGGESTION_INVALID_GUID', 400);
//   }
//
//   const manager = await User._load(managerGuid, true);
//   if (!manager) {
//     throw new SuggestionGenerationError('Manager not found', 'SUGGESTION_MANAGER_NOT_FOUND', 404);
//   }
//
//   const isManager = await OrgHierarchy.hasManagerRole(manager.getId()!);
//   if (!isManager) {
//     throw new SuggestionGenerationError(
//       'The specified user does not have manager privileges',
//       'SUGGESTION_NOT_A_MANAGER',
//       403,
//     );
//   }
//
//   const config = await PlanningSuggestionConfig._loadActive();
//   if (!config) {
//     throw new SuggestionGenerationError(
//       'No active planning suggestion configuration',
//       'PLANNING_SUGGESTION_CONFIG_REQUIRED',
//       422,
//     );
//   }
//
//   const requirements = await PlanningSuggestionRequirement._listByConfig(config.getId()!, true);
//
//   if (!requirements?.length) {
//     throw new SuggestionGenerationError(
//       'The active configuration has no coverage requirements',
//       'PLANNING_SUGGESTION_REQUIREMENTS_REQUIRED',
//       422,
//     );
//   }
//
//   const teamResult = await OrgHierarchy.getAllTeamMembers(manager.getId()!, false);
//   const activeTeam = teamResult.all_employees_flat;
//   const activeTeamIds = new Set(
//     activeTeam
//       .map((employee) => employee.getId())
//       .filter((id): id is number => typeof id === 'number'),
//   );
//
//   if (activeTeamIds.size === 0) {
//     throw new SuggestionGenerationError(
//       'No active employee in the manager team',
//       'SUGGESTION_NO_EMPLOYEES',
//       422,
//     );
//   }
//
//   const allProfiles = await EmployeePlanningProfile._listActive();
//   const teamProfiles =
//     allProfiles?.filter(
//       (profile) => profile.getUser() !== undefined && activeTeamIds.has(profile.getUser()!),
//     ) ?? [];
//
//   const configuredUserIds = new Set(
//     teamProfiles
//       .map((profile) => profile.getUser())
//       .filter((id): id is number => typeof id === 'number'),
//   );
//
//   const unconfiguredEmployees = activeTeam.filter(
//     (employee) => !configuredUserIds.has(employee.getId()!),
//   );
//
//   if (unconfiguredEmployees.length > 0) {
//     throw new SuggestionGenerationError(
//       'Every active employee must have a planning profile before generation',
//       'EMPLOYEE_PLANNING_PROFILE_INCOMPLETE',
//       422,
//       {
//         employees: unconfiguredEmployees.map((employee) => ({
//           guid: employee.getGuid(),
//           name: employee.getFullName(),
//         })),
//       },
//     );
//   }
//
//   const employees: PlanningEmployeeInput[] = [];
//
//   for (const profile of teamProfiles) {
//     const user = await profile.getUserObj();
//     if (!user || profile.isExcluded()) continue;
//
//     const fixedTemplate = profile.isFixed() ? await profile.getFixedSessionTemplateObj() : null;
//
//     if (profile.isFixed() && !fixedTemplate) {
//       throw new SuggestionGenerationError(
//         `Fixed employee ${user.getFullName()} has no fixed template`,
//         'FIXED_EMPLOYEE_TEMPLATE_REQUIRED',
//         422,
//       );
//     }
//
//     employees.push({
//       guid: user.getGuid()!,
//       name: user.getFullName(),
//       code: (user as any).getEmployeeCode?.() ?? '',
//       mode: profile.getPlanningMode(),
//       rotationOrder: profile.getRotationOrder() ?? null,
//       maxWeeklyMinutes: profile.getMaxWeeklyMinutes() ?? null,
//       fixedRestDayMode: profile.getFixedRestDayMode(),
//       fixedTemplate: fixedTemplate
//         ? {
//             guid: fixedTemplate.getGuid()!,
//             name: fixedTemplate.getName()!,
//             definition: fixedTemplate.getDefinition(),
//           }
//         : null,
//     });
//   }
//
//   if (employees.length === 0) {
//     throw new SuggestionGenerationError(
//       'No employee is eligible for automatic planning',
//       'SUGGESTION_NO_EMPLOYEES',
//       422,
//     );
//   }
//
//   if (config.getWeeklyLeaveMode() === 'TEAM_ROTATION') {
//     if (config.getSolverType() !== 'ORTOOLS' || config.shouldFallbackToGreedy()) {
//       throw new SuggestionGenerationError(
//         'TEAM_ROTATION requires ORTOOLS and fallback_to_greedy=false',
//         'TEAM_WEEKLY_LEAVE_REQUIRES_ORTOOLS',
//         422,
//       );
//     }
//
//     const missingRotationOrder = employees.filter(
//       (employee) => employee.rotationOrder === null || employee.rotationOrder < 1,
//     );
//     if (missingRotationOrder.length > 0) {
//       throw new SuggestionGenerationError(
//         'Every included employee requires rotation_order for TEAM_ROTATION',
//         'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_REQUIRED',
//         422,
//         {
//           employees: missingRotationOrder.map((employee) => ({
//             guid: employee.guid,
//             name: employee.name,
//           })),
//         },
//       );
//     }
//
//     const rotationOrders = employees.map((employee) => employee.rotationOrder!);
//     if (new Set(rotationOrders).size !== rotationOrders.length) {
//       throw new SuggestionGenerationError(
//         'rotation_order must be unique for TEAM_ROTATION',
//         'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_DUPLICATE',
//         422,
//       );
//     }
//
//     if (config.getWeeklyLeaveEmployeesPerWeek() > employees.length) {
//       throw new SuggestionGenerationError(
//         'weekly_leave_employees_per_week exceeds included employees',
//         'TEAM_WEEKLY_LEAVE_EMPLOYEE_COUNT_INVALID',
//         422,
//       );
//     }
//   }
//
//   if (config.getWeeklyLeaveMode() === 'PER_ELIGIBLE_EMPLOYEE') {
//     if (config.getSolverType() !== 'ORTOOLS' || config.shouldFallbackToGreedy()) {
//       throw new SuggestionGenerationError(
//         'PER_ELIGIBLE_EMPLOYEE requires ORTOOLS and fallback_to_greedy=false',
//         'ELIGIBLE_WEEKLY_LEAVE_REQUIRES_ORTOOLS',
//         422,
//       );
//     }
//
//     const selector = config.getWeeklyLeaveSelector();
//     if (selector.guard_pool_relation !== 'ANY' && config.getGuardTeamMode() !== 'WEEKLY_POOL') {
//       throw new SuggestionGenerationError(
//         'A weekly leave selector based on guard pool membership requires WEEKLY_POOL',
//         'ELIGIBLE_WEEKLY_LEAVE_GUARD_POOL_REQUIRED',
//         422,
//       );
//     }
//   }
//
//   if (config.getGuardTeamMode() === 'WEEKLY_POOL') {
//     if (config.getSolverType() !== 'ORTOOLS' || config.shouldFallbackToGreedy()) {
//       throw new SuggestionGenerationError(
//         'WEEKLY_POOL requires ORTOOLS and fallback_to_greedy=false',
//         'WEEKLY_GUARD_POOL_REQUIRES_ORTOOLS',
//         422,
//       );
//     }
//
//     const rotatingEmployees = employees.filter((employee) => employee.mode === 'ROTATING');
//
//     if (config.getGuardTeamEmployeesPerWeek() > rotatingEmployees.length) {
//       throw new SuggestionGenerationError(
//         'guard_team_employees_per_week exceeds ROTATING employees',
//         'WEEKLY_GUARD_POOL_EMPLOYEE_COUNT_INVALID',
//         422,
//         {
//           configured: config.getGuardTeamEmployeesPerWeek(),
//           rotatingEmployees: rotatingEmployees.length,
//         },
//       );
//     }
//
//     if (config.getGuardTeamSelectionMode() === 'ROTATION_ORDER') {
//       const missingRotationOrder = rotatingEmployees.filter(
//         (employee) => employee.rotationOrder === null || employee.rotationOrder < 1,
//       );
//       if (missingRotationOrder.length > 0) {
//         throw new SuggestionGenerationError(
//           'Every ROTATING employee requires rotation_order for guard pool rotation',
//           'WEEKLY_GUARD_POOL_ROTATION_ORDER_REQUIRED',
//           422,
//           {
//             employees: missingRotationOrder.map((employee) => ({
//               guid: employee.guid,
//               name: employee.name,
//             })),
//           },
//         );
//       }
//
//       const rotationOrders = rotatingEmployees.map((employee) => employee.rotationOrder!);
//       if (new Set(rotationOrders).size !== rotationOrders.length) {
//         throw new SuggestionGenerationError(
//           'rotation_order must be unique among ROTATING employees for guard pool rotation',
//           'WEEKLY_GUARD_POOL_ROTATION_ORDER_DUPLICATE',
//           422,
//         );
//       }
//     }
//   }
//
//   const engineRequirements: PlanningRequirementInput[] = [];
//   const serviceTypeByTemplateGuid = new Map<string, HistoricalServiceType>();
//
//   for (const requirement of requirements) {
//     const template = await requirement.getSessionTemplateObj();
//     if (!template) {
//       throw new SuggestionGenerationError(
//         `Requirement ${requirement.getGuid()} references an unavailable template`,
//         'PLANNING_SUGGESTION_TEMPLATE_NOT_FOUND',
//         422,
//       );
//     }
//
//     const templateGuid = template.getGuid()!;
//     serviceTypeByTemplateGuid.set(templateGuid, requirement.getServiceType());
//
//     const continuationTemplate = requirement.isGuard()
//       ? await requirement.getContinuationTemplateObj()
//       : null;
//
//     if (requirement.isGuard() && !continuationTemplate) {
//       throw new SuggestionGenerationError(
//         `Guard requirement ${requirement.getGuid()} has no continuation template`,
//         'PLANNING_SUGGESTION_GUARD_CONTINUATION_REQUIRED',
//         422,
//       );
//     }
//
//     if (continuationTemplate) {
//       serviceTypeByTemplateGuid.set(continuationTemplate.getGuid()!, 'GUARD_CONTINUATION');
//     }
//
//     engineRequirements.push({
//       guid: requirement.getGuid()!,
//       dayOfWeek: requirement.getDayOfWeek()!,
//       serviceType: requirement.getServiceType(),
//       minEmployees: requirement.getMinEmployees(),
//       targetEmployees: requirement.getTargetEmployees(),
//       maxEmployees: requirement.getMaxEmployees() ?? null,
//       priority: requirement.getPriority(),
//       allocationMode: requirement.getAllocationMode(),
//       template: {
//         guid: templateGuid,
//         name: template.getName()!,
//         definition: template.getDefinition(),
//       },
//       continuationTemplate: continuationTemplate
//         ? {
//             guid: continuationTemplate.getGuid()!,
//             name: continuationTemplate.getName()!,
//             definition: continuationTemplate.getDefinition(),
//           }
//         : null,
//       continuationDayOffset: requirement.getContinuationDayOffset(),
//       creditedMinutes: requirement.getCreditedMinutes() ?? null,
//       eligibility: {
//         planningModes: requirement.getEligibilityPolicy().planning_modes,
//         guardPoolRelation: requirement.getEligibilityPolicy().guard_pool_relation,
//       },
//     });
//   }
//
//   const engineConfig: EngineConfig = {
//     minRestDaysPerWeek: config.getMinRestDaysPerWeek(),
//     maxConsecutiveWorkDays: config.getMaxConsecutiveWorkDays() ?? null,
//     maxWeeklyMinutes: config.getMaxWeeklyMinutes() ?? null,
//     minRestMinutesBetweenShifts: config.getMinRestMinutesBetweenShifts(),
//     maxConsecutiveGuards: config.getMaxConsecutiveGuards(),
//     restAfterGuardRequired: config.isRestAfterGuardRequired(),
//     postGuardRestDays: config.getPostGuardRestDays(),
//     maxRestingEmployeesPerDay: config.getMaxRestingEmployeesPerDay() ?? null,
//     fairnessWindowWeeks: config.getFairnessWindowWeeks(),
//     strictCoverage: config.isStrictCoverage(),
//     weeklyLeavePolicy: {
//       mode: config.getWeeklyLeaveMode(),
//       employeesPerWeek: config.getWeeklyLeaveEmployeesPerWeek(),
//       allowedDays: config.getWeeklyLeaveAllowedDays() as any,
//       rotationAnchorDate: config.getWeeklyLeaveRotationAnchorDate() ?? null,
//       completeWeeksOnly: config.isWeeklyLeaveCompleteWeeksOnly(),
//       postGuardRestCountsAsLeave: config.doesPostGuardRestCountAsWeeklyLeave(),
//       selector: {
//         planningModes: config.getWeeklyLeaveSelector().planning_modes,
//         guardPoolRelation: config.getWeeklyLeaveSelector().guard_pool_relation,
//       },
//       daysPerEmployee: config.getWeeklyLeaveDaysPerEmployee(),
//       countMode: config.getWeeklyLeaveCountMode(),
//       maxEmployeesPerDay: config.getWeeklyLeaveMaxEmployeesPerDay() ?? null,
//       requireWorkOnOtherDays: config.doesWeeklyLeaveRequireWorkOnOtherDays(),
//       serviceScope: {
//         mode: config.getWeeklyLeaveServiceScope().mode,
//         serviceTypes: config.getWeeklyLeaveServiceScope().service_types,
//         templateGuids: config.getWeeklyLeaveServiceScope().template_guids,
//         requirementGuids: config.getWeeklyLeaveServiceScope().requirement_guids,
//         exclusive: config.getWeeklyLeaveServiceScope().exclusive,
//       },
//     },
//     guardTeamPolicy: {
//       mode: config.getGuardTeamMode(),
//       employeesPerWeek: config.getGuardTeamEmployeesPerWeek(),
//       selectionMode: config.getGuardTeamSelectionMode(),
//       rotationAnchorDate: config.getGuardTeamRotationAnchorDate() ?? null,
//       completeWeeksOnly: config.isGuardTeamCompleteWeeksOnly(),
//       requireParticipation: config.doesGuardTeamRequireParticipation(),
//       eligiblePlanningModes: config.getGuardTeamEligiblePlanningModes(),
//       memberServiceAccess: config.getGuardTeamMemberServiceAccess(),
//       balance: {
//         mode: config.getGuardTeamBalanceMode(),
//         maxMembershipSpread: config.getGuardTeamMaxMembershipSpread() ?? null,
//         maxConsecutiveMembershipWeeks: config.getGuardTeamMaxConsecutiveMembershipWeeks() ?? null,
//       },
//     },
//   };
//
//   const horizon = normalizePlanningHorizon(periodFrom, periodTo, {
//     config: engineConfig,
//     hasEmployeeWeeklyMinuteLimits: employees.some((employee) => employee.maxWeeklyMinutes !== null),
//   });
//
//   const historyWeeks = config.getFairnessWindowWeeks();
//   const historyFrom = addDays(horizon.solveFrom, -(historyWeeks * 7));
//   if (
//     config.getGuardTeamMode() === 'WEEKLY_POOL' &&
//     !engineRequirements.some((requirement) => requirement.serviceType === 'GUARD')
//   ) {
//     throw new SuggestionGenerationError(
//       'WEEKLY_POOL requires at least one active GUARD requirement',
//       'WEEKLY_GUARD_POOL_REQUIREMENT_REQUIRED',
//       422,
//     );
//   }
//
//   const poolScopedRequirements = engineRequirements.filter(
//     (requirement) => requirement.eligibility.guardPoolRelation !== 'ANY',
//   );
//
//   if (config.getGuardTeamMode() !== 'WEEKLY_POOL' && poolScopedRequirements.length > 0) {
//     throw new SuggestionGenerationError(
//       'Requirements using MEMBER or NON_MEMBER require WEEKLY_POOL',
//       'PLANNING_REQUIREMENT_GUARD_POOL_REQUIRED',
//       422,
//       {
//         requirements: poolScopedRequirements.map((requirement) => requirement.guid),
//       },
//     );
//   }
//
//   if (config.getGuardTeamMode() === 'WEEKLY_POOL') {
//     const nonMemberGuards = engineRequirements.filter(
//       (requirement) =>
//         requirement.serviceType === 'GUARD' &&
//         requirement.eligibility.guardPoolRelation === 'NON_MEMBER',
//     );
//
//     if (nonMemberGuards.length > 0) {
//       throw new SuggestionGenerationError(
//         'A GUARD requirement cannot target NON_MEMBER while WEEKLY_POOL is active',
//         'PLANNING_REQUIREMENT_GUARD_POOL_CONFLICT',
//         422,
//         {
//           requirements: nonMemberGuards.map((requirement) => requirement.guid),
//         },
//       );
//     }
//
//     if (config.getGuardTeamMemberServiceAccess() === 'GUARD_ONLY') {
//       const memberStandardRequirements = engineRequirements.filter(
//         (requirement) =>
//           requirement.serviceType === 'STANDARD' &&
//           requirement.minEmployees > 0 &&
//           requirement.eligibility.guardPoolRelation === 'MEMBER',
//       );
//
//       if (memberStandardRequirements.length > 0) {
//         throw new SuggestionGenerationError(
//           'A STANDARD requirement cannot target MEMBER when pool members are GUARD_ONLY',
//           'PLANNING_REQUIREMENT_MEMBER_SERVICE_CONFLICT',
//           422,
//           {
//             requirements: memberStandardRequirements.map((requirement) => requirement.guid),
//           },
//         );
//       }
//     }
//   }
//
//   const historyTo = addDays(horizon.solveFrom, -1);
//   const historicalRaw = await ScheduleAssignments._listByDateRange(historyFrom, historyTo);
//
//   const employeeGuids = new Set(employees.map((employee) => employee.guid));
//   const historicalAssignments: HistoricalAssignment[] = [];
//
//   if (historicalRaw) {
//     for (const assignment of historicalRaw) {
//       const snapshot = assignment.getSessionTemplate();
//       if (!snapshot?.guid || !snapshot?.definition) continue;
//
//       const historicalBase = {
//         startDate: assignment.getStartDate()!,
//         endDate: assignment.getEndDate() ?? historyTo,
//         templateGuid: snapshot.guid,
//         templateName: snapshot.name ?? '—',
//         definition: snapshot.definition,
//         serviceType: serviceTypeByTemplateGuid.get(snapshot.guid) ?? 'STANDARD',
//       } as const;
//
//       if (assignment.getFamily() === SAFamily.USER) {
//         const userGuid = assignment.getRelated();
//         if (!userGuid || !employeeGuids.has(userGuid)) continue;
//
//         historicalAssignments.push({
//           userGuid,
//           ...historicalBase,
//         });
//         continue;
//       }
//
//       if (assignment.getFamily() === SAFamily.GROUP) {
//         const groupGuid = assignment.getRelated();
//         if (!groupGuid) continue;
//
//         const group = await Groups._load(groupGuid, true);
//         if (!group) continue;
//
//         const activeMembers = await group.getDirectMembers(true);
//
//         for (const member of activeMembers) {
//           const userGuid = member.getGuid();
//           if (!userGuid || !employeeGuids.has(userGuid)) continue;
//
//           historicalAssignments.push({
//             userGuid,
//             ...historicalBase,
//           });
//         }
//       }
//     }
//   }
//
//   const solverInput: PlanningSolverInput = {
//     employees,
//     requirements: engineRequirements,
//     historicalAssignments,
//     periodFrom: horizon.solveFrom,
//     periodTo: horizon.solveTo,
//     requestedPeriodFrom: periodFrom,
//     requestedPeriodTo: periodTo,
//     config: engineConfig,
//     solverTimeoutSeconds: config.getSolverTimeoutSeconds(),
//   };
//
//   let engineResult: EngineResult;
//   let solverMetadata: PlanningSolverExecutionMetadata;
//
//   try {
//     const execution = await PlanningSolverFactory.solve(solverInput, {
//       solverType: config.getSolverType(),
//       timeoutSeconds: config.getSolverTimeoutSeconds(),
//       fallbackToGreedy: config.shouldFallbackToGreedy(),
//       ortoolsEndpoint: (globalThis as any).process?.env?.PLANNING_ORTOOLS_URL,
//     });
//
//     engineResult = execution.result;
//     solverMetadata = execution.metadata;
//   } catch (error) {
//     if (error instanceof PlanningInfeasibleError) {
//       throw new SuggestionGenerationError(error.message, error.code, 422, error.diagnostics);
//     }
//
//     if (error instanceof PlanningSolverTechnicalError) {
//       throw new SuggestionGenerationError(
//         error.message,
//         error.code,
//         error.code === 'PLANNING_SOLVER_INVALID_INPUT' ? 422 : 503,
//         error.details,
//       );
//     }
//
//     throw error;
//   }
//
//   engineResult = projectEngineResultToRequestedPeriod(engineResult, horizon);
//   solverMetadata = {
//     ...solverMetadata,
//     horizon,
//   };
//
//   const persistedDiagnostics = withSolverDiagnostics(engineResult.diagnostics, solverMetadata);
//
//   const suggestion = new ScheduleSuggestion()
//     .setTenant(manager.getTenant?.() ?? '')
//     .setManager(manager.getId()!)
//     .setPeriodFrom(periodFrom)
//     .setPeriodTo(periodTo)
//     .setHistoryWeeks(historyWeeks)
//     .setConformityScore(engineResult.conformityScore)
//     .setConfig(config.getId()!)
//     .setEngineVersion(solverMetadata.solverVersion)
//     .setDiagnostics(persistedDiagnostics);
//
//   await suggestion.save();
//
//   for (const employeeResult of engineResult.items) {
//     const user = await User._load(employeeResult.userGuid, true);
//     if (!user) continue;
//
//     const item = new ScheduleSuggestionItem()
//       .setSuggestion(suggestion.getId()!)
//       .setUser(user.getId()!)
//       .setSchedule(employeeResult.schedule)
//       .setReasons(employeeResult.reasons);
//
//     await item.save();
//   }
//
//   return {
//     suggestion,
//     engineResult,
//     employeeCount: engineResult.items.length,
//     configGuid: config.getGuid()!,
//     configVersion: config.getVersion(),
//     solver: solverMetadata,
//   };
// }
