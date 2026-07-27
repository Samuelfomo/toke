import GreedyPlanningSolver from './greedy.planning.solver.js';
import OrToolsPlanningSolver from './ortools.planning.solver.js';
import {
  PlanningSolver,
  PlanningSolverExecutionResult,
  PlanningSolverInput,
  PlanningSolverTechnicalError,
  PlanningSolverType,
} from './planning.solver.js';

export interface PlanningSolverFactoryOptions {
  solverType: PlanningSolverType;
  timeoutSeconds: number;
  fallbackToGreedy: boolean;
  ortoolsEndpoint?: string;
}

export default class PlanningSolverFactory {
  static async solve(
    input: PlanningSolverInput,
    options: PlanningSolverFactoryOptions,
  ): Promise<PlanningSolverExecutionResult> {
    const primary = this.createPrimary(options);

    const startedAt = Date.now();

    try {
      const result = await primary.solve(input);

      return {
        result,
        metadata: {
          requestedSolver: options.solverType,
          usedSolver: primary.type,
          fallbackUsed: false,
          durationMs: Date.now() - startedAt,
          solverVersion: primary.version,
        },
      };
    } catch (error) {
      const mayFallback =
        options.solverType === 'ORTOOLS' &&
        options.fallbackToGreedy &&
        error instanceof PlanningSolverTechnicalError;

      if (!mayFallback) {
        throw error;
      }

      const fallback = new GreedyPlanningSolver();

      const result = await fallback.solve(input);

      return {
        result,
        metadata: {
          requestedSolver: options.solverType,
          usedSolver: fallback.type,
          fallbackUsed: true,
          durationMs: Date.now() - startedAt,
          solverVersion: fallback.version,
          warning: error.message,
        },
      };
    }
  }

  private static createPrimary(options: PlanningSolverFactoryOptions): PlanningSolver {
    if (options.solverType === 'GREEDY') {
      return new GreedyPlanningSolver();
    }

    return new OrToolsPlanningSolver({
      endpoint:
        options.ortoolsEndpoint ?? (globalThis as any).process?.env?.PLANNING_ORTOOLS_URL ?? '',
      timeoutSeconds: options.timeoutSeconds,
    });
  }
}
