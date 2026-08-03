import { EngineDiagnostics, EngineResult, PlanningInfeasibleError } from '../suggestion.engine.js';

import {
  PlanningSolver,
  PlanningSolverInput,
  PlanningSolverTechnicalError,
} from './planning.solver.js';

type OrToolsStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';

interface OrToolsApiResponse {
  success?: boolean;
  status: OrToolsStatus;
  result?: EngineResult;
  diagnostics?: Partial<EngineDiagnostics>;
  message?: string;
  solverVersion?: string;
}

export interface OrToolsPlanningSolverOptions {
  endpoint: string;
  timeoutSeconds: number;
}

function emptyDiagnostics(): EngineDiagnostics {
  return {
    violations: [],
    coverage: [],
    guardPools: [],
    fairnessScore: 0,
    coverageScore: 0,
  };
}

function normalizeDiagnostics(diagnostics?: Partial<EngineDiagnostics> | null): EngineDiagnostics {
  return {
    violations: diagnostics?.violations ?? [],
    coverage: diagnostics?.coverage ?? [],
    guardPools: diagnostics?.guardPools ?? [],
    fairnessScore: diagnostics?.fairnessScore ?? 0,
    coverageScore: diagnostics?.coverageScore ?? 0,
  };
}

export default class OrToolsPlanningSolver implements PlanningSolver {
  readonly type = 'ORTOOLS' as const;
  readonly version = 'ortools-cp-sat-v1.3-weekly-guard-pool';

  constructor(private readonly options: OrToolsPlanningSolverOptions) {}

  async solve(input: PlanningSolverInput): Promise<EngineResult> {
    const fetchFn = (globalThis as any).fetch;

    if (typeof fetchFn !== 'function') {
      throw new PlanningSolverTechnicalError(
        'Global fetch is unavailable in this Node.js runtime',
        'PLANNING_SOLVER_UNAVAILABLE',
      );
    }

    if (!this.options.endpoint?.trim()) {
      throw new PlanningSolverTechnicalError(
        'OR-Tools endpoint is not configured',
        'PLANNING_SOLVER_UNAVAILABLE',
      );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), this.options.timeoutSeconds * 1000);

    let response: any;

    try {
      const endpoint = this.options.endpoint.replace(/\/+$/, '');

      response = await fetchFn(`${endpoint}/solve`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        throw new PlanningSolverTechnicalError(
          `OR-Tools solver exceeded ${this.options.timeoutSeconds} second(s)`,
          'PLANNING_SOLVER_TIMEOUT',
          {
            timeout_seconds: this.options.timeoutSeconds,
          },
        );
      }

      throw new PlanningSolverTechnicalError(
        'Unable to contact OR-Tools solver',
        'PLANNING_SOLVER_UNAVAILABLE',
        {
          message: error?.message,
          endpoint: this.options.endpoint,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response?.ok) {
      let body: unknown = null;

      try {
        body = await response.json();
      } catch {
        try {
          body = await response.text();
        } catch {
          body = null;
        }
      }

      throw new PlanningSolverTechnicalError(
        `OR-Tools solver returned HTTP ${response?.status ?? 'unknown'}`,
        'PLANNING_SOLVER_UNAVAILABLE',
        {
          status: response?.status,
          body,
        },
      );
    }

    let payload: OrToolsApiResponse;

    try {
      payload = (await response.json()) as OrToolsApiResponse;
    } catch (error: any) {
      throw new PlanningSolverTechnicalError(
        'OR-Tools solver returned invalid JSON',
        'PLANNING_SOLVER_PROTOCOL_ERROR',
        {
          message: error?.message,
        },
      );
    }

    if (payload.status === 'INFEASIBLE') {
      throw new PlanningInfeasibleError(
        payload.message ?? 'OR-Tools proved that the planning is infeasible',
        payload.diagnostics ? normalizeDiagnostics(payload.diagnostics) : emptyDiagnostics(),
      );
    }

    if (payload.status !== 'OPTIMAL' && payload.status !== 'FEASIBLE') {
      throw new PlanningSolverTechnicalError(
        payload.message ?? `Unexpected OR-Tools status: ${payload.status}`,
        'PLANNING_SOLVER_PROTOCOL_ERROR',
        {
          status: payload.status,
        },
      );
    }

    if (!payload.result || !Array.isArray(payload.result.items) || !payload.result.diagnostics) {
      throw new PlanningSolverTechnicalError(
        'OR-Tools response does not contain a valid EngineResult',
        'PLANNING_SOLVER_PROTOCOL_ERROR',
      );
    }

    return {
      ...payload.result,
      diagnostics: normalizeDiagnostics(payload.result.diagnostics),
    };
  }
}
