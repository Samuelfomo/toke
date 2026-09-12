import { UsersValidationUtils } from '@toke/shared';

import EmployeePlanningProfile from '../tenant/class/EmployeePlanningProfile.js';
import OrgHierarchy from '../tenant/class/OrgHierarchy.js';
import PlanningSuggestionConfig from '../tenant/class/PlanningSuggestionConfig.js';
import PlanningSuggestionRequirement from '../tenant/class/PlanningSuggestionRequirement.js';
import User from '../tenant/class/User.js';

import {
  analyzePlanningHistory,
  emptyPlanningHistoryAnalysis,
  HistoryAdjustment,
  HistoryRequirementDescriptor,
  PlanningHistoryAnalysis,
} from './planning.history.analysis.service.js';

function addDays(iso: string, amount: number): string {
  const value = new Date(`${iso}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function mondayOfWeek(iso: string): string {
  const value = new Date(`${iso}T00:00:00.000Z`);
  const day = value.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

export class PlanningHistoryReviewError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PlanningHistoryReviewError';
  }
}

export async function reviewPlanningHistoryForManager(
  managerGuid: string,
  periodFrom: string,
  excludedEmployeeGuids: string[] = [],
  adjustments: HistoryAdjustment[] = [],
): Promise<PlanningHistoryAnalysis> {
  if (!UsersValidationUtils.validateGuid(managerGuid)) {
    throw new PlanningHistoryReviewError(
      'Invalid manager GUID',
      'PLANNING_HISTORY_INVALID_MANAGER_GUID',
      400,
    );
  }

  const manager = await User._load(managerGuid, true);
  if (!manager) {
    throw new PlanningHistoryReviewError(
      'Manager not found',
      'PLANNING_HISTORY_MANAGER_NOT_FOUND',
      404,
    );
  }

  if (!(await OrgHierarchy.hasManagerRole(manager.getId()!))) {
    throw new PlanningHistoryReviewError(
      'The specified user does not have manager privileges',
      'PLANNING_HISTORY_NOT_A_MANAGER',
      403,
    );
  }

  const config = await PlanningSuggestionConfig._loadActive();
  if (!config) {
    throw new PlanningHistoryReviewError(
      'No active planning suggestion configuration',
      'PLANNING_HISTORY_CONFIG_REQUIRED',
      422,
    );
  }

  const requirements = await PlanningSuggestionRequirement._listByConfig(
    config.getId()!,
    true,
  );
  if (!requirements?.length) {
    throw new PlanningHistoryReviewError(
      'The active configuration has no coverage requirements',
      'PLANNING_HISTORY_REQUIREMENTS_REQUIRED',
      422,
    );
  }

  const team = (await OrgHierarchy.getAllTeamMembers(manager.getId()!, false))
    .all_employees_flat;
  const excludedSet = new Set(excludedEmployeeGuids);
  const activeProfiles = await EmployeePlanningProfile._listActive();
  const profileByUserId = new Map<number, any>(
    (activeProfiles ?? [])
      .filter((profile) => typeof profile.getUser() === 'number')
      .map((profile) => [profile.getUser()!, profile] as const),
  );
  const employees = team
    .filter((employee) => {
      const guid = employee.getGuid();
      const id = employee.getId();
      if (!guid || !id || excludedSet.has(guid)) return false;
      const profile = profileByUserId.get(id);
      return Boolean(profile && !profile.isExcluded());
    })
    .map((employee) => ({
      guid: employee.getGuid()!,
      name: employee.getFullName(),
    }));

  const descriptors: HistoryRequirementDescriptor[] = [];
  for (const requirement of requirements) {
    const template = await requirement.getSessionTemplateObj();
    if (!template?.getGuid()) continue;
    const continuation = requirement.isGuard()
      ? await requirement.getContinuationTemplateObj()
      : null;

    descriptors.push({
      guid: requirement.getGuid()!,
      dayOfWeek: requirement.getDayOfWeek()!,
      serviceType: requirement.getServiceType(),
      templateGuid: template.getGuid()!,
      templateName: template.getName() ?? '—',
      minEmployees: requirement.getMinEmployees(),
      targetEmployees: requirement.getTargetEmployees(),
      maxEmployees: requirement.getMaxEmployees() ?? null,
      continuationTemplateGuid: continuation?.getGuid() ?? null,
      continuationDayOffset: requirement.getContinuationDayOffset(),
    });
  }

  const solveFrom = mondayOfWeek(periodFrom);
  const historyTo = addDays(solveFrom, -1);
  const historyFrom = addDays(
    solveFrom,
    -(config.getFairnessWindowWeeks() * 7),
  );

  try {
    return await analyzePlanningHistory({
      employees,
      requirements: descriptors,
      historyFrom,
      historyTo,
      solveFrom,
      postGuardRestDays: config.getPostGuardRestDays(),
      adjustments,
    });
  } catch (error: any) {
    // A history read problem must remain non-blocking for suggestion generation.
    return emptyPlanningHistoryAnalysis({
      employees,
      historyFrom,
      historyTo,
      message: error?.message ?? 'Historical fairness could not be analysed.',
    });
  }
}
