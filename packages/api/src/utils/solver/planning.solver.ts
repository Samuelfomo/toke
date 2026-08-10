// import {
//   EngineConfig,
//   EngineDiagnostics,
//   EngineResult,
//   EngineTemplate,
//   HistoricalAssignment,
//   PlanningEmployeeInput,
//   PlanningRequirementInput,
// } from '../suggestion.engine.js';
//
// export type PlanningSolverType = 'GREEDY' | 'ORTOOLS';
//
// export interface PlanningBoundaryGuardContinuation {
//   employeeGuid: string;
//   guardDate: string;
//   continuationDate: string;
//   continuationTemplate: EngineTemplate;
//   creditedMinutes: number;
// }
//
// export interface PlanningSolverBoundaryState {
//   guardContinuations: PlanningBoundaryGuardContinuation[];
// }
//
// export interface PlanningSolverInput {
//   employees: PlanningEmployeeInput[];
//   requirements: PlanningRequirementInput[];
//   historicalAssignments: HistoricalAssignment[];
//   boundaryState?: PlanningSolverBoundaryState;
//   periodFrom: string;
//   periodTo: string;
//   requestedPeriodFrom?: string;
//   requestedPeriodTo?: string;
//   config: EngineConfig;
//   solverTimeoutSeconds?: number;
// }
//
// export interface PlanningSolverHorizonMetadata {
//   requestedFrom: string;
//   requestedTo: string;
//   solveFrom: string;
//   solveTo: string;
//   expandedBeforeDays: number;
//   expandedAfterDays: number;
//   completeWeekExpansionApplied: boolean;
// }
//
// export interface PlanningSolverExecutionMetadata {
//   requestedSolver: PlanningSolverType;
//   usedSolver: PlanningSolverType;
//   fallbackUsed: boolean;
//   durationMs: number;
//   solverVersion: string;
//   warning?: string;
//   horizon?: PlanningSolverHorizonMetadata;
// }
//
// export interface PlanningSolverExecutionResult {
//   result: EngineResult;
//   metadata: PlanningSolverExecutionMetadata;
// }
//
// export interface PlanningSolver {
//   readonly type: PlanningSolverType;
//   readonly version: string;
//
//   solve(input: PlanningSolverInput): Promise<EngineResult>;
// }
//
// export class PlanningSolverTechnicalError extends Error {
//   constructor(
//     message: string,
//     public readonly code:
//       | 'PLANNING_SOLVER_UNAVAILABLE'
//       | 'PLANNING_SOLVER_TIMEOUT'
//       | 'PLANNING_SOLVER_PROTOCOL_ERROR'
//       | 'PLANNING_SOLVER_INVALID_INPUT',
//     public readonly details?: unknown,
//   ) {
//     super(message);
//     this.name = 'PlanningSolverTechnicalError';
//   }
// }
//
// export function withSolverDiagnostics(
//   diagnostics: EngineDiagnostics,
//   metadata: PlanningSolverExecutionMetadata,
// ): EngineDiagnostics & {
//   solver: PlanningSolverExecutionMetadata;
// } {
//   return {
//     ...diagnostics,
//     solver: metadata,
//   };
// }

import {
  EngineConfig,
  EngineDiagnostics,
  EngineResult,
  HistoricalAssignment,
  PlanningEmployeeInput,
  PlanningRequirementInput,
} from '../suggestion.engine.js';

export type PlanningSolverType = 'GREEDY' | 'ORTOOLS';

export interface PlanningSolverInput {
  employees: PlanningEmployeeInput[];
  requirements: PlanningRequirementInput[];
  historicalAssignments: HistoricalAssignment[];
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
