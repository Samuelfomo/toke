import { Agent, fetch } from 'undici';

import { EngineDiagnostics, EngineResult, PlanningInfeasibleError } from '../suggestion.engine.js';

import {
  PLANNING_SOLVER_HTTP_TIMEOUT_MS,
  PLANNING_SOLVER_MAX_SECONDS,
} from './planning.solver.constants.js';
import {
  PlanningSolver,
  PlanningSolverInput,
  PlanningSolverTechnicalError,
} from './planning.solver.js';

type OrToolsStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';

interface OrToolsSolverStats {
  statusName: string;
  wallTimeSeconds: number;
  numConflicts: number;
  numBranches: number;
  numBooleans: number;
}

interface OrToolsApiResponse {
  success?: boolean;
  status: OrToolsStatus;
  result?: EngineResult;
  diagnostics?: Partial<EngineDiagnostics>;
  message?: string;
  solverVersion?: string;
  solverStats?: OrToolsSolverStats;
}

export interface OrToolsPlanningSolverOptions {
  endpoint: string;
  // timeoutSeconds: number;
}

function normalizeDiagnostics(diagnostics?: Partial<EngineDiagnostics> | null): EngineDiagnostics {
  return {
    violations: diagnostics?.violations ?? [],
    coverage: diagnostics?.coverage ?? [],
    guardPools: diagnostics?.guardPools ?? [],
    weeklyLeaveGroups: diagnostics?.weeklyLeaveGroups ?? [],
    fairnessScore: diagnostics?.fairnessScore ?? 0,
    coverageScore: diagnostics?.coverageScore ?? 0,
  };
}

const solverDispatcher = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
  connectTimeout: 10_000,
});

export default class OrToolsPlanningSolver implements PlanningSolver {
  readonly type = 'ORTOOLS' as const;
  readonly version = 'ortools-cp-sat-v1.6-continuation-workday';

  constructor(private readonly options: OrToolsPlanningSolverOptions) {}

  async solve(input: PlanningSolverInput): Promise<EngineResult> {
    // const fetchFn = (globalThis as any).fetch;
    //
    // if (typeof fetchFn !== 'function') {
    //   throw new PlanningSolverTechnicalError(
    //     'Global fetch is unavailable in this Node.js runtime',
    //     'PLANNING_SOLVER_UNAVAILABLE',
    //   );
    // }

    if (!this.options.endpoint?.trim()) {
      throw new PlanningSolverTechnicalError(
        'OR-Tools endpoint is not configured',
        'PLANNING_SOLVER_UNAVAILABLE',
      );
    }

    // const controller = new AbortController();
    // const timeout = setTimeout(() => controller.abort(), this.options.timeoutSeconds * 1000);

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), PLANNING_SOLVER_HTTP_TIMEOUT_MS);

    let response: any;

    try {
      const endpoint = this.options.endpoint.replace(/\/+$/, '');
      // response = await fetchFn(`${endpoint}/solve`, {
      //   method: 'POST',
      //   headers: { 'content-type': 'application/json' },
      //   body: JSON.stringify(input),
      //   signal: controller.signal,
      // });

      response = await fetch(`${endpoint}/solve`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
        dispatcher: solverDispatcher,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        throw new PlanningSolverTechnicalError(
          // `OR-Tools solver exceeded ${this.options.timeoutSeconds} second(s)`,
          `OR-Tools solver exceeded the fixed execution window of ${PLANNING_SOLVER_MAX_SECONDS} second(s)`,
          'PLANNING_SOLVER_TIMEOUT',
          {
            solver_timeout_seconds: PLANNING_SOLVER_MAX_SECONDS,
            http_timeout_ms: PLANNING_SOLVER_HTTP_TIMEOUT_MS,
            timeout_source: 'CODE_FIXED',
          },
          // { timeout_seconds: this.options.timeoutSeconds },
        );
      }

      throw new PlanningSolverTechnicalError(
        'Unable to contact OR-Tools solver',
        'PLANNING_SOLVER_UNAVAILABLE',
        {
          message: error?.message,
          name: error?.name,
          cause_name: error?.cause?.name,
          cause_message: error?.cause?.message,
          cause_code: error?.cause?.code,
          endpoint: this.options.endpoint,
          aborted: controller.signal.aborted,
          solver_timeout_seconds: PLANNING_SOLVER_MAX_SECONDS,
          http_timeout_ms: PLANNING_SOLVER_HTTP_TIMEOUT_MS,
        },
        // {
        //   message: error?.message,
        //   endpoint: this.options.endpoint,
        // },
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

      const errorBody = body as any;
      const solverMessage =
        errorBody?.detail?.message ??
        errorBody?.message ??
        `OR-Tools solver returned HTTP ${response?.status ?? 'unknown'}`;

      if (response?.status === 422) {
        throw new PlanningSolverTechnicalError(solverMessage, 'PLANNING_SOLVER_INVALID_INPUT', {
          status: response.status,
          body,
        });
      }

      throw new PlanningSolverTechnicalError(solverMessage, 'PLANNING_SOLVER_UNAVAILABLE', {
        status: response?.status,
        body,
      });
    }

    let payload: OrToolsApiResponse;
    try {
      payload = (await response.json()) as OrToolsApiResponse;
    } catch (error: any) {
      throw new PlanningSolverTechnicalError(
        'OR-Tools solver returned invalid JSON',
        'PLANNING_SOLVER_PROTOCOL_ERROR',
        { message: error?.message },
      );
    }

    if (payload.status === 'INFEASIBLE') {
      const diagnostics = normalizeDiagnostics(payload.diagnostics);
      if (payload.solverStats && diagnostics.violations.length > 0) {
        diagnostics.violations[0] = {
          ...diagnostics.violations[0]!,
          details: {
            ...(diagnostics.violations[0]!.details ?? {}),
            solverStats: payload.solverStats,
          },
        };
      }

      throw new PlanningInfeasibleError(
        payload.message ?? 'OR-Tools proved that the planning is infeasible',
        diagnostics,
      );
    }

    if (payload.status !== 'OPTIMAL' && payload.status !== 'FEASIBLE') {
      throw new PlanningSolverTechnicalError(
        payload.message ?? `Unexpected OR-Tools status: ${payload.status}`,
        'PLANNING_SOLVER_PROTOCOL_ERROR',
        {
          status: payload.status,
          solverStats: payload.solverStats,
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

// import { EngineDiagnostics, EngineResult, PlanningInfeasibleError } from '../suggestion.engine.js';
//
// import {
//   PlanningSolver,
//   PlanningSolverInput,
//   PlanningSolverTechnicalError,
// } from './planning.solver.js';
//
// type OrToolsStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
//
// interface OrToolsSolverStats {
//   statusName: string;
//   wallTimeSeconds: number;
//   numConflicts: number;
//   numBranches: number;
//   numBooleans: number;
// }
//
// interface OrToolsApiResponse {
//   success?: boolean;
//   status: OrToolsStatus;
//   result?: EngineResult;
//   diagnostics?: Partial<EngineDiagnostics>;
//   message?: string;
//   solverVersion?: string;
//   solverStats?: OrToolsSolverStats;
// }
//
// export interface OrToolsPlanningSolverOptions {
//   endpoint: string;
//   timeoutSeconds: number;
// }
//
// function normalizeDiagnostics(diagnostics?: Partial<EngineDiagnostics> | null): EngineDiagnostics {
//   return {
//     violations: diagnostics?.violations ?? [],
//     coverage: diagnostics?.coverage ?? [],
//     guardPools: diagnostics?.guardPools ?? [],
//     weeklyLeaveGroups: diagnostics?.weeklyLeaveGroups ?? [],
//     fairnessScore: diagnostics?.fairnessScore ?? 0,
//     coverageScore: diagnostics?.coverageScore ?? 0,
//   };
// }
//
// export default class OrToolsPlanningSolver implements PlanningSolver {
//   readonly type = 'ORTOOLS' as const;
//   readonly version = 'ortools-cp-sat-v1.5-arbitrary-horizon';
//
//   constructor(private readonly options: OrToolsPlanningSolverOptions) {}
//
//   async solve(input: PlanningSolverInput): Promise<EngineResult> {
//     const fetchFn = (globalThis as any).fetch;
//
//     if (typeof fetchFn !== 'function') {
//       throw new PlanningSolverTechnicalError(
//         'Global fetch is unavailable in this Node.js runtime',
//         'PLANNING_SOLVER_UNAVAILABLE',
//       );
//     }
//
//     if (!this.options.endpoint?.trim()) {
//       throw new PlanningSolverTechnicalError(
//         'OR-Tools endpoint is not configured',
//         'PLANNING_SOLVER_UNAVAILABLE',
//       );
//     }
//
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), this.options.timeoutSeconds * 1000);
//
//     let response: any;
//
//     try {
//       const endpoint = this.options.endpoint.replace(/\/+$/, '');
//       response = await fetchFn(`${endpoint}/solve`, {
//         method: 'POST',
//         headers: { 'content-type': 'application/json' },
//         body: JSON.stringify(input),
//         signal: controller.signal,
//       });
//     } catch (error: any) {
//       if (error?.name === 'AbortError' || controller.signal.aborted) {
//         throw new PlanningSolverTechnicalError(
//           `OR-Tools solver exceeded ${this.options.timeoutSeconds} second(s)`,
//           'PLANNING_SOLVER_TIMEOUT',
//           { timeout_seconds: this.options.timeoutSeconds },
//         );
//       }
//
//       throw new PlanningSolverTechnicalError(
//         'Unable to contact OR-Tools solver',
//         'PLANNING_SOLVER_UNAVAILABLE',
//         {
//           message: error?.message,
//           endpoint: this.options.endpoint,
//         },
//       );
//     } finally {
//       clearTimeout(timeout);
//     }
//
//     if (!response?.ok) {
//       let body: unknown = null;
//       try {
//         body = await response.json();
//       } catch {
//         try {
//           body = await response.text();
//         } catch {
//           body = null;
//         }
//       }
//
//       const errorBody = body as any;
//       const solverMessage =
//         errorBody?.detail?.message ??
//         errorBody?.message ??
//         `OR-Tools solver returned HTTP ${response?.status ?? 'unknown'}`;
//
//       if (response?.status === 422) {
//         throw new PlanningSolverTechnicalError(solverMessage, 'PLANNING_SOLVER_INVALID_INPUT', {
//           status: response.status,
//           body,
//         });
//       }
//
//       throw new PlanningSolverTechnicalError(solverMessage, 'PLANNING_SOLVER_UNAVAILABLE', {
//         status: response?.status,
//         body,
//       });
//     }
//
//     let payload: OrToolsApiResponse;
//     try {
//       payload = (await response.json()) as OrToolsApiResponse;
//     } catch (error: any) {
//       throw new PlanningSolverTechnicalError(
//         'OR-Tools solver returned invalid JSON',
//         'PLANNING_SOLVER_PROTOCOL_ERROR',
//         { message: error?.message },
//       );
//     }
//
//     if (payload.status === 'INFEASIBLE') {
//       const diagnostics = normalizeDiagnostics(payload.diagnostics);
//       if (payload.solverStats && diagnostics.violations.length > 0) {
//         diagnostics.violations[0] = {
//           ...diagnostics.violations[0]!,
//           details: {
//             ...(diagnostics.violations[0]!.details ?? {}),
//             solverStats: payload.solverStats,
//           },
//         };
//       }
//
//       throw new PlanningInfeasibleError(
//         payload.message ?? 'OR-Tools proved that the planning is infeasible',
//         diagnostics,
//       );
//     }
//
//     if (payload.status !== 'OPTIMAL' && payload.status !== 'FEASIBLE') {
//       throw new PlanningSolverTechnicalError(
//         payload.message ?? `Unexpected OR-Tools status: ${payload.status}`,
//         'PLANNING_SOLVER_PROTOCOL_ERROR',
//         {
//           status: payload.status,
//           solverStats: payload.solverStats,
//         },
//       );
//     }
//
//     if (!payload.result || !Array.isArray(payload.result.items) || !payload.result.diagnostics) {
//       throw new PlanningSolverTechnicalError(
//         'OR-Tools response does not contain a valid EngineResult',
//         'PLANNING_SOLVER_PROTOCOL_ERROR',
//       );
//     }
//
//     return {
//       ...payload.result,
//       diagnostics: normalizeDiagnostics(payload.result.diagnostics),
//     };
//   }
// }
