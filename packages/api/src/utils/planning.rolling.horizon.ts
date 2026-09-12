import {
  EngineDiagnostics,
  EngineResult,
  EngineTemplate,
  PlanningEmployeeInput,
  PlanningRequirementInput,
} from './suggestion.engine.js';
import {
  PlanningHistoricalFairnessBaseline,
  PlanningSolverBoundaryState,
  PlanningSolverLockedAssignment,
} from './solver/planning.solver.js';

const DAY_MS = 86_400_000;

export const ROLLING_HORIZON_DEFAULTS = {
  thresholdDays: 21,
  commitDays: 7,
  overlapDays: 7,
  lookaheadDays: 7,
} as const;

export interface RollingWindow {
  index: number;
  solveFrom: string;
  solveTo: string;
  commitFrom: string;
  commitTo: string;
  overlapFrom: string | null;
  overlapTo: string | null;
  lookaheadFrom: string | null;
  lookaheadTo: string | null;
}

export interface RollingChunkMetadata extends RollingWindow {
  durationMs: number;
  solverVersion: string;
  committedDays: number;
  lockedCarryCount: number;
  managerLockCount: number;
  boundaryContinuationCount: number;
}

export interface RollingHorizonMetadata {
  enabled: boolean;
  thresholdDays: number;
  commitDays: number;
  overlapDays: number;
  lookaheadDays: number;
  totalSolveDays: number;
  chunkCount: number;
  totalSolverDurationMs: number;
  chunks: RollingChunkMetadata[];
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addRollingDays(iso: string, amount: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function rollingDayCount(from: string, to: string): number {
  return Math.floor((parseIso(to).getTime() - parseIso(from).getTime()) / DAY_MS) + 1;
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

export function buildRollingWindows(
  solveFrom: string,
  solveTo: string,
  options: Partial<typeof ROLLING_HORIZON_DEFAULTS> = {},
): RollingWindow[] {
  const commitDays = options.commitDays ?? ROLLING_HORIZON_DEFAULTS.commitDays;
  const overlapDays = options.overlapDays ?? ROLLING_HORIZON_DEFAULTS.overlapDays;
  const lookaheadDays = options.lookaheadDays ?? ROLLING_HORIZON_DEFAULTS.lookaheadDays;

  if (commitDays < 1 || overlapDays < 0 || lookaheadDays < 0) {
    throw new Error('Invalid rolling horizon configuration');
  }

  const windows: RollingWindow[] = [];
  let commitFrom = solveFrom;
  let index = 0;

  while (commitFrom <= solveTo) {
    const commitTo = minIso(addRollingDays(commitFrom, commitDays - 1), solveTo);
    const solveStartCandidate = addRollingDays(commitFrom, -overlapDays);
    const windowSolveFrom = index === 0 ? solveFrom : maxIso(solveFrom, solveStartCandidate);
    const solveEndCandidate = addRollingDays(commitTo, lookaheadDays);
    const windowSolveTo = minIso(solveEndCandidate, solveTo);

    const overlapTo = index === 0 ? null : addRollingDays(commitFrom, -1);
    const overlapFrom = overlapTo === null ? null : windowSolveFrom;
    const lookaheadFrom = commitTo < windowSolveTo ? addRollingDays(commitTo, 1) : null;
    const lookaheadTo = lookaheadFrom ? windowSolveTo : null;

    windows.push({
      index,
      solveFrom: windowSolveFrom,
      solveTo: windowSolveTo,
      commitFrom,
      commitTo,
      overlapFrom,
      overlapTo,
      lookaheadFrom,
      lookaheadTo,
    });

    commitFrom = addRollingDays(commitTo, 1);
    index += 1;
  }

  return windows;
}

export function dateInRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

export function filterLocksForWindow(
  locks: PlanningSolverLockedAssignment[],
  from: string,
  to: string,
): PlanningSolverLockedAssignment[] {
  return locks.filter((lock) => dateInRange(lock.date, from, to));
}

export function buildTemplateCatalog(
  employees: PlanningEmployeeInput[],
  requirements: PlanningRequirementInput[],
  managerLocks: PlanningSolverLockedAssignment[],
): Map<string, EngineTemplate> {
  const templates = new Map<string, EngineTemplate>();

  for (const requirement of requirements) {
    templates.set(requirement.template.guid, requirement.template);
    if (requirement.continuationTemplate) {
      templates.set(requirement.continuationTemplate.guid, requirement.continuationTemplate);
    }
  }

  for (const employee of employees) {
    if (employee.fixedTemplate) {
      templates.set(employee.fixedTemplate.guid, employee.fixedTemplate);
    }
  }

  for (const lock of managerLocks) {
    if (lock.template?.guid) templates.set(lock.template.guid, lock.template);
  }

  return templates;
}

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function dayKey(iso: string): keyof EngineTemplate['definition'] {
  return DAY_KEYS[parseIso(iso).getUTCDay()] as keyof EngineTemplate['definition'];
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + (minutes ?? 0);
}

export function rollingTemplateMinutes(template: EngineTemplate, iso: string): number {
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

export interface RollingCommittedState {
  schedules: Map<string, Record<string, string | null>>;
  reasons: Map<string, Record<string, any>>;
}

export function createCommittedState(employees: PlanningEmployeeInput[]): RollingCommittedState {
  return {
    schedules: new Map(employees.map((employee) => [employee.guid, {}])),
    reasons: new Map(employees.map((employee) => [employee.guid, {}])),
  };
}

export function commitEngineWindow(
  state: RollingCommittedState,
  result: EngineResult,
  commitFrom: string,
  commitTo: string,
): void {
  for (const item of result.items) {
    const schedule = state.schedules.get(item.userGuid) ?? {};
    const reasons = state.reasons.get(item.userGuid) ?? {};
    for (const [date, value] of Object.entries(item.schedule)) {
      if (!dateInRange(date, commitFrom, commitTo)) continue;
      schedule[date] = value;
      reasons[date] = item.reasons?.[date] ?? null;
    }
    state.schedules.set(item.userGuid, schedule);
    state.reasons.set(item.userGuid, reasons);
  }
}

export function buildOverlapLocks(
  state: RollingCommittedState,
  window: RollingWindow,
  requirements: PlanningRequirementInput[],
  templates: Map<string, EngineTemplate>,
): PlanningSolverLockedAssignment[] {
  if (!window.overlapFrom || !window.overlapTo) return [];

  const requirementsByTemplate = new Map<string, PlanningRequirementInput[]>();
  for (const requirement of requirements) {
    const list = requirementsByTemplate.get(requirement.template.guid) ?? [];
    list.push(requirement);
    requirementsByTemplate.set(requirement.template.guid, list);
  }

  const locks: PlanningSolverLockedAssignment[] = [];
  for (const [employeeGuid, schedule] of state.schedules) {
    for (const [date, templateGuid] of Object.entries(schedule)) {
      if (!dateInRange(date, window.overlapFrom, window.overlapTo)) continue;

      let requirementGuid: string | null = null;
      if (templateGuid) {
        const candidates = requirementsByTemplate.get(templateGuid) ?? [];
        requirementGuid = candidates.find((candidate) => candidate.dayOfWeek === dayKey(date))?.guid ?? null;
      }

      locks.push({
        employeeGuid,
        date,
        templateGuid,
        requirementGuid,
        template: templateGuid ? templates.get(templateGuid) ?? null : null,
      });
    }
  }

  return locks;
}

function mergeLockSets(
  generated: PlanningSolverLockedAssignment[],
  manager: PlanningSolverLockedAssignment[],
): PlanningSolverLockedAssignment[] {
  const merged = new Map<string, PlanningSolverLockedAssignment>();
  for (const lock of generated) merged.set(`${lock.employeeGuid}|${lock.date}`, lock);
  for (const lock of manager) merged.set(`${lock.employeeGuid}|${lock.date}`, lock);
  return [...merged.values()];
}

export function buildRollingWindowLocks(
  state: RollingCommittedState,
  window: RollingWindow,
  managerLocks: PlanningSolverLockedAssignment[],
  requirements: PlanningRequirementInput[],
  templates: Map<string, EngineTemplate>,
): { locks: PlanningSolverLockedAssignment[]; carryCount: number; managerCount: number } {
  const carryLocks = buildOverlapLocks(state, window, requirements, templates);
  const scopedManagerLocks = filterLocksForWindow(managerLocks, window.solveFrom, window.solveTo);
  return {
    locks: mergeLockSets(carryLocks, scopedManagerLocks),
    carryCount: carryLocks.length,
    managerCount: scopedManagerLocks.length,
  };
}

function isWeekend(iso: string): boolean {
  const day = parseIso(iso).getUTCDay();
  return day === 0 || day === 6;
}

export function buildRollingFairnessBaseline(
  base: PlanningHistoricalFairnessBaseline[],
  state: RollingCommittedState,
  beforeDate: string,
  requirements: PlanningRequirementInput[],
  templates: Map<string, EngineTemplate>,
): PlanningHistoricalFairnessBaseline[] {
  const baselineByEmployee = new Map(
    base.map((item) => [item.employeeGuid, {
      ...item,
      templateCounts: { ...item.templateCounts },
    }]),
  );
  const guardTemplateGuids = new Set(
    requirements.filter((item) => item.serviceType === 'GUARD').map((item) => item.template.guid),
  );

  for (const [employeeGuid, schedule] of state.schedules) {
    const current = baselineByEmployee.get(employeeGuid) ?? {
      employeeGuid,
      workedDays: 0,
      guardDays: 0,
      weekendWorkedDays: 0,
      workedMinutes: 0,
      restDays: 0,
      templateCounts: {},
    };

    for (const [date, templateGuid] of Object.entries(schedule)) {
      if (date >= beforeDate) continue;
      if (templateGuid === null) {
        current.restDays += 1;
        continue;
      }

      current.workedDays += 1;
      if (isWeekend(date)) current.weekendWorkedDays += 1;
      if (guardTemplateGuids.has(templateGuid)) current.guardDays += 1;
      current.templateCounts[templateGuid] = (current.templateCounts[templateGuid] ?? 0) + 1;
      const template = templates.get(templateGuid);
      if (template) current.workedMinutes += rollingTemplateMinutes(template, date);
    }

    baselineByEmployee.set(employeeGuid, current);
  }

  return [...baselineByEmployee.values()];
}

export function buildRollingBoundaryState(
  state: RollingCommittedState,
  windowStart: string,
  requirements: PlanningRequirementInput[],
): PlanningSolverBoundaryState {
  const guardDate = addRollingDays(windowStart, -1);
  const continuations: PlanningSolverBoundaryState['guardContinuations'] = [];

  for (const [employeeGuid, schedule] of state.schedules) {
    const templateGuid = schedule[guardDate];
    if (!templateGuid) continue;
    const requirement = requirements.find(
      (item) => item.serviceType === 'GUARD' &&
        item.template.guid === templateGuid &&
        item.continuationTemplate !== null &&
        item.continuationDayOffset === 1,
    );
    if (!requirement?.continuationTemplate) continue;

    const mainMinutes = rollingTemplateMinutes(requirement.template, guardDate);
    const continuationMinutes = rollingTemplateMinutes(requirement.continuationTemplate, windowStart);
    const totalActual = mainMinutes + continuationMinutes;
    const credited = requirement.creditedMinutes ?? totalActual;
    const mainCredited = totalActual > 0 ? Math.round(credited * (mainMinutes / totalActual)) : credited;

    continuations.push({
      employeeGuid,
      guardDate,
      continuationDate: windowStart,
      continuationTemplate: requirement.continuationTemplate,
      creditedMinutes: Math.max(0, credited - mainCredited),
    });
  }

  return { guardContinuations: continuations };
}

export function mergeRollingDiagnostics(
  chunks: Array<{ result: EngineResult; window: RollingWindow }>,
): EngineDiagnostics {
  const coverage = new Map<string, EngineDiagnostics['coverage'][number]>();
  const violations = new Map<string, EngineDiagnostics['violations'][number]>();
  const guardPools = new Map<string, EngineDiagnostics['guardPools'][number]>();
  const weeklyLeaveGroups = new Map<string, EngineDiagnostics['weeklyLeaveGroups'][number]>();
  let weightedFairness = 0;
  let fairnessDays = 0;

  for (const { result, window } of chunks) {
    const committedDays = rollingDayCount(window.commitFrom, window.commitTo);
    weightedFairness += result.diagnostics.fairnessScore * committedDays;
    fairnessDays += committedDays;

    for (const entry of result.diagnostics.coverage) {
      if (!dateInRange(entry.date, window.commitFrom, window.commitTo)) continue;
      coverage.set(`${entry.date}|${entry.requirementGuid}`, entry);
    }

    for (const violation of result.diagnostics.violations) {
      if (violation.date && !dateInRange(violation.date, window.commitFrom, window.commitTo)) continue;
      const key = `${violation.code}|${violation.date ?? ''}|${violation.employeeGuid ?? ''}|${violation.requirementGuid ?? ''}|${violation.message}`;
      violations.set(key, violation);
    }

    for (const pool of result.diagnostics.guardPools) {
      if (pool.weekFrom < window.commitFrom || pool.weekFrom > window.commitTo) continue;
      guardPools.set(pool.weekFrom, pool);
    }

    for (const leave of result.diagnostics.weeklyLeaveGroups) {
      if (leave.weekFrom < window.commitFrom || leave.weekFrom > window.commitTo) continue;
      weeklyLeaveGroups.set(leave.weekFrom, leave);
    }
  }

  const coverageValues = [...coverage.values()];
  const coverageScore = coverageValues.length === 0
    ? 0
    : Math.round(
        coverageValues.reduce((sum, slot) => {
          if (slot.target === 0) return sum + 1;
          return sum + Math.min(1, slot.assigned / slot.target);
        }, 0) / coverageValues.length * 100,
      );

  return {
    violations: [...violations.values()],
    coverage: coverageValues.sort((a, b) => a.date.localeCompare(b.date) || a.requirementGuid.localeCompare(b.requirementGuid)),
    guardPools: [...guardPools.values()].sort((a, b) => a.weekFrom.localeCompare(b.weekFrom)),
    weeklyLeaveGroups: [...weeklyLeaveGroups.values()].sort((a, b) => a.weekFrom.localeCompare(b.weekFrom)),
    fairnessScore: fairnessDays > 0 ? Math.round(weightedFairness / fairnessDays) : 0,
    coverageScore,
  };
}

export function buildMergedRollingResult(
  employees: PlanningEmployeeInput[],
  state: RollingCommittedState,
  chunks: Array<{ result: EngineResult; window: RollingWindow }>,
  baseFairness: PlanningHistoricalFairnessBaseline[],
  requirements: PlanningRequirementInput[],
  templates: Map<string, EngineTemplate>,
): EngineResult {
  const diagnostics = mergeRollingDiagnostics(chunks);
  const totalFairness = buildRollingFairnessBaseline(
    baseFairness,
    state,
    '9999-12-31',
    requirements,
    templates,
  );
  const rotatingGuids = new Set(
    employees.filter((employee) => employee.mode === 'ROTATING').map((employee) => employee.guid),
  );
  const loads = totalFairness
    .filter((item) => rotatingGuids.has(item.employeeGuid))
    .map((item) => item.workedDays + item.guardDays * 2 + item.weekendWorkedDays);
  if (loads.length <= 1) {
    diagnostics.fairnessScore = 100;
  } else {
    const spread = Math.max(...loads) - Math.min(...loads);
    diagnostics.fairnessScore = Math.max(0, Math.round(100 - spread * 12.5));
  }
  const warningPenalty = Math.min(
    20,
    diagnostics.violations.filter((violation: any) => violation.severity === 'WARNING').length * 2,
  );
  const conformityScore = Math.max(
    0,
    Math.round(diagnostics.coverageScore * 0.75 + diagnostics.fairnessScore * 0.25 - warningPenalty),
  );

  return {
    items: employees.map((employee) => ({
      userGuid: employee.guid,
      schedule: state.schedules.get(employee.guid) ?? {},
      reasons: state.reasons.get(employee.guid) ?? {},
    })),
    conformityScore,
    diagnostics,
  };
}
