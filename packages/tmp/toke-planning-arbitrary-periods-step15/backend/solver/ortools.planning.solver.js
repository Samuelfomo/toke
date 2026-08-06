"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const suggestion_engine_js_1 = require("../suggestion.engine.js");
const planning_solver_js_1 = require("./planning.solver.js");
function normalizeDiagnostics(diagnostics) {
    var _a, _b, _c, _d, _e, _f;
    return {
        violations: (_a = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.violations) !== null && _a !== void 0 ? _a : [],
        coverage: (_b = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.coverage) !== null && _b !== void 0 ? _b : [],
        guardPools: (_c = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.guardPools) !== null && _c !== void 0 ? _c : [],
        weeklyLeaveGroups: (_d = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.weeklyLeaveGroups) !== null && _d !== void 0 ? _d : [],
        fairnessScore: (_e = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.fairnessScore) !== null && _e !== void 0 ? _e : 0,
        coverageScore: (_f = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.coverageScore) !== null && _f !== void 0 ? _f : 0,
    };
}
class OrToolsPlanningSolver {
    constructor(options) {
        this.options = options;
        this.type = 'ORTOOLS';
        this.version = 'ortools-cp-sat-v1.5-arbitrary-horizon';
    }
    solve(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const fetchFn = globalThis.fetch;
            if (typeof fetchFn !== 'function') {
                throw new planning_solver_js_1.PlanningSolverTechnicalError('Global fetch is unavailable in this Node.js runtime', 'PLANNING_SOLVER_UNAVAILABLE');
            }
            if (!((_a = this.options.endpoint) === null || _a === void 0 ? void 0 : _a.trim())) {
                throw new planning_solver_js_1.PlanningSolverTechnicalError('OR-Tools endpoint is not configured', 'PLANNING_SOLVER_UNAVAILABLE');
            }
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.options.timeoutSeconds * 1000);
            let response;
            try {
                const endpoint = this.options.endpoint.replace(/\/+$/, '');
                response = yield fetchFn(`${endpoint}/solve`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(input),
                    signal: controller.signal,
                });
            }
            catch (error) {
                if ((error === null || error === void 0 ? void 0 : error.name) === 'AbortError' || controller.signal.aborted) {
                    throw new planning_solver_js_1.PlanningSolverTechnicalError(`OR-Tools solver exceeded ${this.options.timeoutSeconds} second(s)`, 'PLANNING_SOLVER_TIMEOUT', { timeout_seconds: this.options.timeoutSeconds });
                }
                throw new planning_solver_js_1.PlanningSolverTechnicalError('Unable to contact OR-Tools solver', 'PLANNING_SOLVER_UNAVAILABLE', {
                    message: error === null || error === void 0 ? void 0 : error.message,
                    endpoint: this.options.endpoint,
                });
            }
            finally {
                clearTimeout(timeout);
            }
            if (!(response === null || response === void 0 ? void 0 : response.ok)) {
                let body = null;
                try {
                    body = yield response.json();
                }
                catch (_j) {
                    try {
                        body = yield response.text();
                    }
                    catch (_k) {
                        body = null;
                    }
                }
                const errorBody = body;
                const solverMessage = (_d = (_c = (_b = errorBody === null || errorBody === void 0 ? void 0 : errorBody.detail) === null || _b === void 0 ? void 0 : _b.message) !== null && _c !== void 0 ? _c : errorBody === null || errorBody === void 0 ? void 0 : errorBody.message) !== null && _d !== void 0 ? _d : `OR-Tools solver returned HTTP ${(_e = response === null || response === void 0 ? void 0 : response.status) !== null && _e !== void 0 ? _e : 'unknown'}`;
                if ((response === null || response === void 0 ? void 0 : response.status) === 422) {
                    throw new planning_solver_js_1.PlanningSolverTechnicalError(solverMessage, 'PLANNING_SOLVER_INVALID_INPUT', { status: response.status, body });
                }
                throw new planning_solver_js_1.PlanningSolverTechnicalError(solverMessage, 'PLANNING_SOLVER_UNAVAILABLE', { status: response === null || response === void 0 ? void 0 : response.status, body });
            }
            let payload;
            try {
                payload = (yield response.json());
            }
            catch (error) {
                throw new planning_solver_js_1.PlanningSolverTechnicalError('OR-Tools solver returned invalid JSON', 'PLANNING_SOLVER_PROTOCOL_ERROR', { message: error === null || error === void 0 ? void 0 : error.message });
            }
            if (payload.status === 'INFEASIBLE') {
                const diagnostics = normalizeDiagnostics(payload.diagnostics);
                if (payload.solverStats && diagnostics.violations.length > 0) {
                    diagnostics.violations[0] = Object.assign(Object.assign({}, diagnostics.violations[0]), { details: Object.assign(Object.assign({}, ((_f = diagnostics.violations[0].details) !== null && _f !== void 0 ? _f : {})), { solverStats: payload.solverStats }) });
                }
                throw new suggestion_engine_js_1.PlanningInfeasibleError((_g = payload.message) !== null && _g !== void 0 ? _g : 'OR-Tools proved that the planning is infeasible', diagnostics);
            }
            if (payload.status !== 'OPTIMAL' && payload.status !== 'FEASIBLE') {
                throw new planning_solver_js_1.PlanningSolverTechnicalError((_h = payload.message) !== null && _h !== void 0 ? _h : `Unexpected OR-Tools status: ${payload.status}`, 'PLANNING_SOLVER_PROTOCOL_ERROR', {
                    status: payload.status,
                    solverStats: payload.solverStats,
                });
            }
            if (!payload.result ||
                !Array.isArray(payload.result.items) ||
                !payload.result.diagnostics) {
                throw new planning_solver_js_1.PlanningSolverTechnicalError('OR-Tools response does not contain a valid EngineResult', 'PLANNING_SOLVER_PROTOCOL_ERROR');
            }
            return Object.assign(Object.assign({}, payload.result), { diagnostics: normalizeDiagnostics(payload.result.diagnostics) });
        });
    }
}
exports.default = OrToolsPlanningSolver;
