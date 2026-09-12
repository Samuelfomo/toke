import {
  EngineConfig,
  EngineDiagnostics,
  EngineResult,
  EngineTemplate,
  HistoricalAssignment,
  PlanningEmployeeInput,
  PlanningRequirementInput,
} from '../suggestion.engine.js';

export type PlanningSolverType = 'GREEDY' | 'ORTOOLS';

export interface PlanningBoundaryGuardContinuation {
  employeeGuid: string;
  guardDate: string;
  continuationDate: string;
  continuationTemplate: EngineTemplate;
  creditedMinutes: number;
}

export interface PlanningSolverBoundaryState {
  guardContinuations: PlanningBoundaryGuardContinuation[];
}


export interface PlanningHistoricalFairnessBaseline {
  employeeGuid: string;
  workedDays: number;
  guardDays: number;
  weekendWorkedDays: number;
  workedMinutes: number;
  restDays: number;
  templateCounts: Record<string, number>;
}

export interface PlanningSolverLockedAssignment {
  employeeGuid: string;
  date: string;
  templateGuid: string | null;
  requirementGuid?: string | null;
  /** Snapshot used for manager services that are outside engine requirements. */
  template?: EngineTemplate | null;
}

export interface PlanningSolverInput {
  employees: PlanningEmployeeInput[];
  requirements: PlanningRequirementInput[];
  /** Legacy raw history kept empty from Lot 5.1 onward. */
  historicalAssignments: HistoricalAssignment[];
  /** Aggregated, non-blocking history used only by fairness objectives. */
  historicalFairness?: PlanningHistoricalFairnessBaseline[];
  boundaryState?: PlanningSolverBoundaryState;
  lockedAssignments?: PlanningSolverLockedAssignment[];
  periodFrom: string;
  periodTo: string;
  requestedPeriodFrom?: string;
  requestedPeriodTo?: string;
  config: EngineConfig;
  solverTimeoutSeconds?: number;
}

export interface PlanningSolverHorizonMetadata {
  requestedFrom: string;
  requestedTo: string;
  solveFrom: string;
  solveTo: string;
  expandedBeforeDays: number;
  expandedAfterDays: number;
  completeWeekExpansionApplied: boolean;
}

export interface PlanningSolverExecutionMetadata {
  requestedSolver: PlanningSolverType;
  usedSolver: PlanningSolverType;
  fallbackUsed: boolean;
  durationMs: number;
  solverVersion: string;
  warning?: string;
  horizon?: PlanningSolverHorizonMetadata;
}

export interface PlanningSolverExecutionResult {
  result: EngineResult;
  metadata: PlanningSolverExecutionMetadata;
}

export interface PlanningSolver {
  readonly type: PlanningSolverType;
  readonly version: string;

  solve(input: PlanningSolverInput): Promise<EngineResult>;
}

export class PlanningSolverTechnicalError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'PLANNING_SOLVER_UNAVAILABLE'
      | 'PLANNING_SOLVER_TIMEOUT'
      | 'PLANNING_SOLVER_PROTOCOL_ERROR'
      | 'PLANNING_SOLVER_INVALID_INPUT',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PlanningSolverTechnicalError';
  }
}

export function withSolverDiagnostics(
  diagnostics: EngineDiagnostics,
  metadata: PlanningSolverExecutionMetadata,
): EngineDiagnostics & {
  solver: PlanningSolverExecutionMetadata;
} {
  return {
    ...diagnostics,
    solver: metadata,
  };
}
