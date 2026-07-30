import { SAFamily, UsersValidationUtils } from '@toke/shared';

import EmployeePlanningProfile from '../tenant/class/EmployeePlanningProfile.js';
import Groups from '../tenant/class/Groups.js';
import OrgHierarchy from '../tenant/class/OrgHierarchy.js';
import PlanningSuggestionConfig from '../tenant/class/PlanningSuggestionConfig.js';
import PlanningSuggestionRequirement from '../tenant/class/PlanningSuggestionRequirement.js';
import ScheduleAssignments from '../tenant/class/ScheduleAssignments.js';
import ScheduleSuggestion from '../tenant/class/ScheduleSuggestion.js';
import ScheduleSuggestionItem from '../tenant/class/ScheduleSuggestionItem.js';
import User from '../tenant/class/User.js';

import {
  EngineConfig,
  EngineResult,
  HistoricalAssignment,
  HistoricalServiceType,
  PlanningEmployeeInput,
  PlanningInfeasibleError,
  PlanningRequirementInput,
} from './suggestion.engine.js';

import PlanningSolverFactory from './planning.solver.factory.js';

import {
  PlanningSolverExecutionMetadata,
  PlanningSolverInput,
  PlanningSolverTechnicalError,
  withSolverDiagnostics,
} from './planning.solver.js';

function addDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
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

export interface GeneratedSuggestionPayload {
  suggestion: ScheduleSuggestion;
  engineResult: EngineResult;
  employeeCount: number;
  configGuid: string;
  configVersion: number;
  solver: PlanningSolverExecutionMetadata;
}

export async function generateConfiguredSuggestion(
  managerGuid: string,
  periodFrom: string,
  periodTo: string,
): Promise<GeneratedSuggestionPayload> {
  if (!UsersValidationUtils.validateGuid(managerGuid)) {
    throw new SuggestionGenerationError(
      'Invalid manager GUID',
      'SUGGESTION_INVALID_GUID',
      400,
    );
  }

  const manager = await User._load(managerGuid, true);
  if (!manager) {
    throw new SuggestionGenerationError(
      'Manager not found',
      'SUGGESTION_MANAGER_NOT_FOUND',
      404,
    );
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

  const requirements =
    await PlanningSuggestionRequirement._listByConfig(config.getId()!, true);

  if (!requirements?.length) {
    throw new SuggestionGenerationError(
      'The active configuration has no coverage requirements',
      'PLANNING_SUGGESTION_REQUIREMENTS_REQUIRED',
      422,
    );
  }

  const teamResult = await OrgHierarchy.getAllTeamMembers(manager.getId()!, false);
  const activeTeam = teamResult.all_employees_flat;
  const activeTeamIds = new Set(
    activeTeam
      .map((employee) => employee.getId())
      .filter((id): id is number => typeof id === 'number'),
  );

  if (activeTeamIds.size === 0) {
    throw new SuggestionGenerationError(
      'No active employee in the manager team',
      'SUGGESTION_NO_EMPLOYEES',
      422,
    );
  }

  const allProfiles = await EmployeePlanningProfile._listActive();
  const teamProfiles =
    allProfiles?.filter(
      (profile) =>
        profile.getUser() !== undefined &&
        activeTeamIds.has(profile.getUser()!),
    ) ?? [];

  const configuredUserIds = new Set(
    teamProfiles
      .map((profile) => profile.getUser())
      .filter((id): id is number => typeof id === 'number'),
  );

  const unconfiguredEmployees = activeTeam.filter(
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

    const fixedTemplate = profile.isFixed()
      ? await profile.getFixedSessionTemplateObj()
      : null;

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
    if (
      config.getSolverType() !== 'ORTOOLS' ||
      config.shouldFallbackToGreedy()
    ) {
      throw new SuggestionGenerationError(
        'TEAM_ROTATION requires ORTOOLS and fallback_to_greedy=false',
        'TEAM_WEEKLY_LEAVE_REQUIRES_ORTOOLS',
        422,
      );
    }

    const missingRotationOrder = employees.filter(
      (employee) =>
        employee.rotationOrder === null ||
        employee.rotationOrder < 1,
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

    const rotationOrders = employees.map(
      (employee) => employee.rotationOrder!,
    );
    if (new Set(rotationOrders).size !== rotationOrders.length) {
      throw new SuggestionGenerationError(
        'rotation_order must be unique for TEAM_ROTATION',
        'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_DUPLICATE',
        422,
      );
    }

    if (
      config.getWeeklyLeaveEmployeesPerWeek() >
      employees.length
    ) {
      throw new SuggestionGenerationError(
        'weekly_leave_employees_per_week exceeds included employees',
        'TEAM_WEEKLY_LEAVE_EMPLOYEE_COUNT_INVALID',
        422,
      );
    }
  }

  const engineRequirements: PlanningRequirementInput[] = [];
  const serviceTypeByTemplateGuid = new Map<string, HistoricalServiceType>();

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
    serviceTypeByTemplateGuid.set(
      templateGuid,
      requirement.getServiceType(),
    );

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
      serviceTypeByTemplateGuid.set(
        continuationTemplate.getGuid()!,
        'GUARD_CONTINUATION',
      );
    }

    engineRequirements.push({
      guid: requirement.getGuid()!,
      dayOfWeek: requirement.getDayOfWeek()!,
      serviceType: requirement.getServiceType(),
      minEmployees: requirement.getMinEmployees(),
      targetEmployees: requirement.getTargetEmployees(),
      maxEmployees: requirement.getMaxEmployees() ?? null,
      priority: requirement.getPriority(),
      allocationMode:
        requirement.getAllocationMode(),
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
      continuationDayOffset:
        requirement.getContinuationDayOffset(),
      creditedMinutes:
        requirement.getCreditedMinutes() ?? null,
    });
  }

  const historyWeeks = config.getFairnessWindowWeeks();
  const historyFrom = addDays(periodFrom, -(historyWeeks * 7));
  const historyTo = addDays(periodFrom, -1);
  const historicalRaw =
    await ScheduleAssignments._listByDateRange(historyFrom, historyTo);

  const employeeGuids = new Set(employees.map((employee) => employee.guid));
  const historicalAssignments: HistoricalAssignment[] = [];

  if (historicalRaw) {
    for (const assignment of historicalRaw) {
      const snapshot = assignment.getSessionTemplate();
      if (!snapshot?.guid || !snapshot?.definition) continue;

      const historicalBase = {
        startDate: assignment.getStartDate()!,
        endDate: assignment.getEndDate() ?? historyTo,
        templateGuid: snapshot.guid,
        templateName: snapshot.name ?? '—',
        definition: snapshot.definition,
        serviceType:
          serviceTypeByTemplateGuid.get(snapshot.guid) ?? 'STANDARD',
      } as const;

      if (assignment.getFamily() === SAFamily.USER) {
        const userGuid = assignment.getRelated();
        if (!userGuid || !employeeGuids.has(userGuid)) continue;

        historicalAssignments.push({
          userGuid,
          ...historicalBase,
        });
        continue;
      }

      if (assignment.getFamily() === SAFamily.GROUP) {
        const groupGuid = assignment.getRelated();
        if (!groupGuid) continue;

        const group = await Groups._load(groupGuid, true);
        if (!group) continue;

        const activeMembers = await group.getDirectMembers(true);

        for (const member of activeMembers) {
          const userGuid = member.getGuid();
          if (!userGuid || !employeeGuids.has(userGuid)) continue;

          historicalAssignments.push({
            userGuid,
            ...historicalBase,
          });
        }
      }
    }
  }

  const engineConfig: EngineConfig = {
    minRestDaysPerWeek: config.getMinRestDaysPerWeek(),
    maxConsecutiveWorkDays: config.getMaxConsecutiveWorkDays(),
    maxWeeklyMinutes: config.getMaxWeeklyMinutes() ?? null,
    minRestMinutesBetweenShifts:
      config.getMinRestMinutesBetweenShifts(),
    maxConsecutiveGuards: config.getMaxConsecutiveGuards(),
    restAfterGuardRequired: config.isRestAfterGuardRequired(),
    postGuardRestDays: config.getPostGuardRestDays(),
    maxRestingEmployeesPerDay:
      config.getMaxRestingEmployeesPerDay() ?? null,
    fairnessWindowWeeks: config.getFairnessWindowWeeks(),
    strictCoverage: config.isStrictCoverage(),
    weeklyLeavePolicy: {
      mode: config.getWeeklyLeaveMode(),
      employeesPerWeek:
        config.getWeeklyLeaveEmployeesPerWeek(),
      allowedDays:
        config.getWeeklyLeaveAllowedDays() as any,
      rotationAnchorDate:
        config.getWeeklyLeaveRotationAnchorDate() ?? null,
      completeWeeksOnly:
        config.isWeeklyLeaveCompleteWeeksOnly(),
      postGuardRestCountsAsLeave:
        config.doesPostGuardRestCountAsWeeklyLeave(),
    },
  };

  const solverInput: PlanningSolverInput = {
    employees,
    requirements: engineRequirements,
    historicalAssignments,
    periodFrom,
    periodTo,
    config: engineConfig,
    solverTimeoutSeconds:
      config.getSolverTimeoutSeconds(),
  };

  let engineResult: EngineResult;
  let solverMetadata:
    PlanningSolverExecutionMetadata;

  try {
    const execution =
      await PlanningSolverFactory.solve(
        solverInput,
        {
          solverType:
            config.getSolverType(),
          timeoutSeconds:
            config.getSolverTimeoutSeconds(),
          fallbackToGreedy:
            config.shouldFallbackToGreedy(),
          ortoolsEndpoint:
            (globalThis as any).process?.env
              ?.PLANNING_ORTOOLS_URL,
        },
      );

    engineResult = execution.result;
    solverMetadata = execution.metadata;
  } catch (error) {
    if (
      error instanceof
      PlanningInfeasibleError
    ) {
      throw new SuggestionGenerationError(
        error.message,
        error.code,
        422,
        error.diagnostics,
      );
    }

    if (
      error instanceof
      PlanningSolverTechnicalError
    ) {
      throw new SuggestionGenerationError(
        error.message,
        error.code,
        503,
        error.details,
      );
    }

    throw error;
  }

  const persistedDiagnostics =
    withSolverDiagnostics(
      engineResult.diagnostics,
      solverMetadata,
    );

  const suggestion = new ScheduleSuggestion()
    .setTenant(manager.getTenant?.() ?? '')
    .setManager(manager.getId()!)
    .setPeriodFrom(periodFrom)
    .setPeriodTo(periodTo)
    .setHistoryWeeks(historyWeeks)
    .setConformityScore(
      engineResult.conformityScore,
    )
    .setConfig(config.getId()!)
    .setEngineVersion(
      solverMetadata.solverVersion,
    )
    .setDiagnostics(
      persistedDiagnostics,
    );

  await suggestion.save();

  for (const employeeResult of engineResult.items) {
    const user = await User._load(employeeResult.userGuid, true);
    if (!user) continue;

    const item = new ScheduleSuggestionItem()
      .setSuggestion(suggestion.getId()!)
      .setUser(user.getId()!)
      .setSchedule(employeeResult.schedule)
      .setReasons(employeeResult.reasons);

    await item.save();
  }

  return {
    suggestion,
    engineResult,
    employeeCount: engineResult.items.length,
    configGuid: config.getGuid()!,
    configVersion: config.getVersion(),
    solver: solverMetadata,
  };
}
