"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningSolverTechnicalError = void 0;
exports.withSolverDiagnostics = withSolverDiagnostics;
class PlanningSolverTechnicalError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'PlanningSolverTechnicalError';
    }
}
exports.PlanningSolverTechnicalError = PlanningSolverTechnicalError;
function withSolverDiagnostics(diagnostics, metadata) {
    return Object.assign(Object.assign({}, diagnostics), { solver: metadata });
}
