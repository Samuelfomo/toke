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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const greedy_planning_solver_js_1 = __importDefault(require("./greedy.planning.solver.js"));
const ortools_planning_solver_js_1 = __importDefault(require("./ortools.planning.solver.js"));
const planning_solver_js_1 = require("./planning.solver.js");
class PlanningSolverFactory {
    static createPrimary(options) {
        var _a, _b, _c, _d;
        if (options.solverType === 'GREEDY') {
            return new greedy_planning_solver_js_1.default();
        }
        return new ortools_planning_solver_js_1.default({
            endpoint: (_d = (_a = options.ortoolsEndpoint) !== null && _a !== void 0 ? _a : (_c = (_b = globalThis.process) === null || _b === void 0 ? void 0 : _b.env) === null || _c === void 0 ? void 0 : _c.PLANNING_ORTOOLS_URL) !== null && _d !== void 0 ? _d : '',
            timeoutSeconds: options.timeoutSeconds,
        });
    }
    static solve(input, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const primary = this.createPrimary(options);
            const startedAt = Date.now();
            try {
                const result = yield primary.solve(input);
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
            }
            catch (error) {
                const mayFallback = options.solverType === 'ORTOOLS' &&
                    options.fallbackToGreedy &&
                    error instanceof
                        planning_solver_js_1.PlanningSolverTechnicalError &&
                    error.code !== 'PLANNING_SOLVER_INVALID_INPUT';
                if (!mayFallback) {
                    throw error;
                }
                const fallback = new greedy_planning_solver_js_1.default();
                const result = yield fallback.solve(input);
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
        });
    }
}
exports.default = PlanningSolverFactory;
