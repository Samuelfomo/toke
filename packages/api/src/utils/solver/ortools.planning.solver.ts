import { Agent, fetch } from 'undici';
import { captureUnknownPlanningWindow } from './ortools.diagnostic.capture.js';

import { EngineDiagnostics, EngineResult, PlanningInfeasibleError } from '../suggestion.engine.js';

import {
  PLANNING_SOLVER_HTTP_TIMEOUT_MS,
  PLANNING_SOLVER_MAX_SECONDS,
} from './planning.solver.constants.js';
import {
  fixedAlternationContractVersion,
  FixedAlternationAcknowledgementError,
  PlanningSolver,
  PlanningSolverInput,
  planningSolverPayload,
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
  fixedAlternationSupported?: boolean;
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
    ...(diagnostics?.fixedAlternationEvaluation && { fixedAlternationEvaluation: diagnostics.fixedAlternationEvaluation }),
  };
}

const solverDispatcher = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
  connectTimeout: 10_000,
});

/** Probe once per generation. Older or unavailable endpoints keep the legacy payload. */
export async function supportsOrToolsFixedAlternation(endpoint: string | undefined, minimumVersion: 1 | 2 | 3 = 1): Promise<boolean> {
  if (!endpoint?.trim()) return false;
  try {
    const response = await fetch(`${endpoint.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(2_000), dispatcher: solverDispatcher,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return false;
    }
    const health = await response.json() as { capabilities?: { fixedAlternation?: number; fixedAlternationMandatoryWeekendRest?: number; fixedAlternationLimitedService?: number } };
    if (minimumVersion === 3) return health.capabilities?.fixedAlternationLimitedService === 3;
    return minimumVersion === 2
      ? health.capabilities?.fixedAlternationMandatoryWeekendRest === 2
      : health.capabilities?.fixedAlternation === 1;
  } catch {
    return false;
  }
}

export default class OrToolsPlanningSolver implements PlanningSolver {
  readonly type = 'ORTOOLS' as const;
  readonly version = 'ortools-cp-sat-v1.10-history-fairness';

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

    const configuredBudget = process.env.PLANNING_ORTOOLS_SEARCH_SECONDS;
    let solverTimeoutSeconds = input.solverTimeoutSeconds;
    if (configuredBudget !== undefined && solverTimeoutSeconds === undefined) {
      const seconds = Number(configuredBudget);
      if (!/^\d+$/.test(configuredBudget) || seconds < 1 || seconds > 299) {
        throw new PlanningSolverTechnicalError(
          'Le budget de recherche OR-Tools doit être un entier compris entre 1 et 299 secondes.',
          'PLANNING_SOLVER_PROTOCOL_ERROR',
        );
      }
      // The existing worker contract reserves one second outside CP-SAT.
      solverTimeoutSeconds = seconds + 1;
    }

    const wirePayload = planningSolverPayload({
      ...input,
      ...(solverTimeoutSeconds === undefined ? {} : { solverTimeoutSeconds }),
    }, this.options.fixedAlternationSupported === true);
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
        body: JSON.stringify(wirePayload),
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

    if (payload.solverVersion && payload.solverVersion !== this.version) {
      throw new PlanningSolverTechnicalError(
        `OR-Tools protocol mismatch: expected ${this.version}, got ${payload.solverVersion}`,
        'PLANNING_SOLVER_PROTOCOL_ERROR',
        { expected: this.version, received: payload.solverVersion },
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

    if (payload.status === 'UNKNOWN' && payload.solverStats?.statusName === 'UNKNOWN') {
      const searchSeconds = Math.max(1, (solverTimeoutSeconds ?? 20) - 1);
      await captureUnknownPlanningWindow(wirePayload, {
        searchSeconds, workerStatus: payload.status, workerWallSeconds: payload.solverStats.wallTimeSeconds,
        workerVersion: payload.solverVersion,
      });
      throw new PlanningSolverTechnicalError(
        'Aucun planning faisable n’a été trouvé dans le temps imparti. Relancez avec un budget de calcul plus long.',
        'PLANNING_SOLVER_NO_FEASIBLE_SOLUTION',
        {
          period_from: input.periodFrom,
          period_to: input.periodTo,
          search_seconds: searchSeconds,
          solverStats: payload.solverStats,
        },
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

    const requestedPolicy = this.options.fixedAlternationSupported ? input.fixedAlternationPolicy : undefined;
    if (requestedPolicy) {
      const evaluation = payload.result.diagnostics.fixedAlternationEvaluation;
      const details = {
        solver_version: payload.solverVersion,
        expected_contract_version: fixedAlternationContractVersion(requestedPolicy),
        received_contract_version: evaluation?.contractVersion,
        period_from: input.periodFrom,
        period_to: input.periodTo,
      };
      if (evaluation == null) throw new FixedAlternationAcknowledgementError(details);
      if (evaluation.contractVersion !== details.expected_contract_version || !Array.isArray(evaluation.checks) ||
          !Array.isArray(evaluation.employeeGuids) || evaluation.employeeGuids.length !== 2 ||
          evaluation.employeeGuids.some((guid, index) => guid !== requestedPolicy.employeeGuids[index]) ||
          evaluation.checks.some(check =>
            !check || typeof check.date !== 'string' || check.date < input.periodFrom || check.date > input.periodTo ||
            !['SHIFT', 'WEEKEND_REST'].includes(check.kind) ||
            ![check.expected, check.actual].every(pair => Array.isArray(pair) && pair.length === 2 &&
              pair.every(value => value === null || typeof value === 'string')) ||
            !Array.isArray(check.lockedEmployeeGuids),
          )) {
        throw new PlanningSolverTechnicalError(
          'OR-Tools a renvoyé une évaluation d’alternance fixe incompatible.',
          'PLANNING_SOLVER_PROTOCOL_ERROR',
          details,
        );
      }
    }

    const diagnostics = normalizeDiagnostics(payload.result.diagnostics);
    if (!requestedPolicy) delete diagnostics.fixedAlternationEvaluation;
    return { ...payload.result, diagnostics };
  }
}
