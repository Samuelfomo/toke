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
exports.SuggestionGenerationError = void 0;
exports.generateConfiguredSuggestion = generateConfiguredSuggestion;
const shared_1 = require("@toke/shared");
const EmployeePlanningProfile_js_1 = __importDefault(require("../tenant/class/EmployeePlanningProfile.js"));
const Groups_js_1 = __importDefault(require("../tenant/class/Groups.js"));
const OrgHierarchy_js_1 = __importDefault(require("../tenant/class/OrgHierarchy.js"));
const PlanningSuggestionConfig_js_1 = __importDefault(require("../tenant/class/PlanningSuggestionConfig.js"));
const PlanningSuggestionRequirement_js_1 = __importDefault(require("../tenant/class/PlanningSuggestionRequirement.js"));
const ScheduleAssignments_js_1 = __importDefault(require("../tenant/class/ScheduleAssignments.js"));
const ScheduleSuggestion_js_1 = __importDefault(require("../tenant/class/ScheduleSuggestion.js"));
const ScheduleSuggestionItem_js_1 = __importDefault(require("../tenant/class/ScheduleSuggestionItem.js"));
const User_js_1 = __importDefault(require("../tenant/class/User.js"));
const suggestion_engine_js_1 = require("./suggestion.engine.js");
const planning_solver_factory_js_1 = __importDefault(require("./planning.solver.factory.js"));
const planning_solver_js_1 = require("./planning.solver.js");
function addDays(iso, amount) {
    const date = new Date(`${iso}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}
class SuggestionGenerationError extends Error {
    constructor(message, code, status, details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.name = 'SuggestionGenerationError';
    }
}
exports.SuggestionGenerationError = SuggestionGenerationError;
function generateConfiguredSuggestion(managerGuid, periodFrom, periodTo) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        if (!shared_1.UsersValidationUtils.validateGuid(managerGuid)) {
            throw new SuggestionGenerationError('Invalid manager GUID', 'SUGGESTION_INVALID_GUID', 400);
        }
        const manager = yield User_js_1.default._load(managerGuid, true);
        if (!manager) {
            throw new SuggestionGenerationError('Manager not found', 'SUGGESTION_MANAGER_NOT_FOUND', 404);
        }
        const isManager = yield OrgHierarchy_js_1.default.hasManagerRole(manager.getId());
        if (!isManager) {
            throw new SuggestionGenerationError('The specified user does not have manager privileges', 'SUGGESTION_NOT_A_MANAGER', 403);
        }
        const config = yield PlanningSuggestionConfig_js_1.default._loadActive();
        if (!config) {
            throw new SuggestionGenerationError('No active planning suggestion configuration', 'PLANNING_SUGGESTION_CONFIG_REQUIRED', 422);
        }
        const requirements = yield PlanningSuggestionRequirement_js_1.default._listByConfig(config.getId(), true);
        if (!(requirements === null || requirements === void 0 ? void 0 : requirements.length)) {
            throw new SuggestionGenerationError('The active configuration has no coverage requirements', 'PLANNING_SUGGESTION_REQUIREMENTS_REQUIRED', 422);
        }
        const teamResult = yield OrgHierarchy_js_1.default.getAllTeamMembers(manager.getId(), false);
        const activeTeam = teamResult.all_employees_flat;
        const activeTeamIds = new Set(activeTeam
            .map((employee) => employee.getId())
            .filter((id) => typeof id === 'number'));
        if (activeTeamIds.size === 0) {
            throw new SuggestionGenerationError('No active employee in the manager team', 'SUGGESTION_NO_EMPLOYEES', 422);
        }
        const allProfiles = yield EmployeePlanningProfile_js_1.default._listActive();
        const teamProfiles = (_a = allProfiles === null || allProfiles === void 0 ? void 0 : allProfiles.filter((profile) => profile.getUser() !== undefined &&
            activeTeamIds.has(profile.getUser()))) !== null && _a !== void 0 ? _a : [];
        const configuredUserIds = new Set(teamProfiles
            .map((profile) => profile.getUser())
            .filter((id) => typeof id === 'number'));
        const unconfiguredEmployees = activeTeam.filter((employee) => !configuredUserIds.has(employee.getId()));
        if (unconfiguredEmployees.length > 0) {
            throw new SuggestionGenerationError('Every active employee must have a planning profile before generation', 'EMPLOYEE_PLANNING_PROFILE_INCOMPLETE', 422, {
                employees: unconfiguredEmployees.map((employee) => ({
                    guid: employee.getGuid(),
                    name: employee.getFullName(),
                })),
            });
        }
        const employees = [];
        for (const profile of teamProfiles) {
            const user = yield profile.getUserObj();
            if (!user || profile.isExcluded())
                continue;
            const fixedTemplate = profile.isFixed()
                ? yield profile.getFixedSessionTemplateObj()
                : null;
            if (profile.isFixed() && !fixedTemplate) {
                throw new SuggestionGenerationError(`Fixed employee ${user.getFullName()} has no fixed template`, 'FIXED_EMPLOYEE_TEMPLATE_REQUIRED', 422);
            }
            employees.push({
                guid: user.getGuid(),
                name: user.getFullName(),
                code: (_d = (_c = (_b = user).getEmployeeCode) === null || _c === void 0 ? void 0 : _c.call(_b)) !== null && _d !== void 0 ? _d : '',
                mode: profile.getPlanningMode(),
                rotationOrder: (_e = profile.getRotationOrder()) !== null && _e !== void 0 ? _e : null,
                maxWeeklyMinutes: (_f = profile.getMaxWeeklyMinutes()) !== null && _f !== void 0 ? _f : null,
                fixedRestDayMode: profile.getFixedRestDayMode(),
                fixedTemplate: fixedTemplate
                    ? {
                        guid: fixedTemplate.getGuid(),
                        name: fixedTemplate.getName(),
                        definition: fixedTemplate.getDefinition(),
                    }
                    : null,
            });
        }
        if (employees.length === 0) {
            throw new SuggestionGenerationError('No employee is eligible for automatic planning', 'SUGGESTION_NO_EMPLOYEES', 422);
        }
        if (config.getWeeklyLeaveMode() === 'TEAM_ROTATION') {
            if (config.getSolverType() !== 'ORTOOLS' ||
                config.shouldFallbackToGreedy()) {
                throw new SuggestionGenerationError('TEAM_ROTATION requires ORTOOLS and fallback_to_greedy=false', 'TEAM_WEEKLY_LEAVE_REQUIRES_ORTOOLS', 422);
            }
            const missingRotationOrder = employees.filter((employee) => employee.rotationOrder === null ||
                employee.rotationOrder < 1);
            if (missingRotationOrder.length > 0) {
                throw new SuggestionGenerationError('Every included employee requires rotation_order for TEAM_ROTATION', 'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_REQUIRED', 422, {
                    employees: missingRotationOrder.map((employee) => ({
                        guid: employee.guid,
                        name: employee.name,
                    })),
                });
            }
            const rotationOrders = employees.map((employee) => employee.rotationOrder);
            if (new Set(rotationOrders).size !== rotationOrders.length) {
                throw new SuggestionGenerationError('rotation_order must be unique for TEAM_ROTATION', 'TEAM_WEEKLY_LEAVE_ROTATION_ORDER_DUPLICATE', 422);
            }
            if (config.getWeeklyLeaveEmployeesPerWeek() >
                employees.length) {
                throw new SuggestionGenerationError('weekly_leave_employees_per_week exceeds included employees', 'TEAM_WEEKLY_LEAVE_EMPLOYEE_COUNT_INVALID', 422);
            }
        }
        if (config.getGuardTeamMode() === 'WEEKLY_POOL') {
            if (config.getSolverType() !== 'ORTOOLS' ||
                config.shouldFallbackToGreedy()) {
                throw new SuggestionGenerationError('WEEKLY_POOL requires ORTOOLS and fallback_to_greedy=false', 'WEEKLY_GUARD_POOL_REQUIRES_ORTOOLS', 422);
            }
            const rotatingEmployees = employees.filter((employee) => employee.mode === 'ROTATING');
            if (config.getGuardTeamEmployeesPerWeek() >
                rotatingEmployees.length) {
                throw new SuggestionGenerationError('guard_team_employees_per_week exceeds ROTATING employees', 'WEEKLY_GUARD_POOL_EMPLOYEE_COUNT_INVALID', 422, {
                    configured: config.getGuardTeamEmployeesPerWeek(),
                    rotatingEmployees: rotatingEmployees.length,
                });
            }
            if (config.getGuardTeamSelectionMode() === 'ROTATION_ORDER') {
                const missingRotationOrder = rotatingEmployees.filter((employee) => employee.rotationOrder === null ||
                    employee.rotationOrder < 1);
                if (missingRotationOrder.length > 0) {
                    throw new SuggestionGenerationError('Every ROTATING employee requires rotation_order for guard pool rotation', 'WEEKLY_GUARD_POOL_ROTATION_ORDER_REQUIRED', 422, {
                        employees: missingRotationOrder.map((employee) => ({
                            guid: employee.guid,
                            name: employee.name,
                        })),
                    });
                }
                const rotationOrders = rotatingEmployees.map((employee) => employee.rotationOrder);
                if (new Set(rotationOrders).size !== rotationOrders.length) {
                    throw new SuggestionGenerationError('rotation_order must be unique among ROTATING employees for guard pool rotation', 'WEEKLY_GUARD_POOL_ROTATION_ORDER_DUPLICATE', 422);
                }
            }
        }
        const engineRequirements = [];
        const serviceTypeByTemplateGuid = new Map();
        for (const requirement of requirements) {
            const template = yield requirement.getSessionTemplateObj();
            if (!template) {
                throw new SuggestionGenerationError(`Requirement ${requirement.getGuid()} references an unavailable template`, 'PLANNING_SUGGESTION_TEMPLATE_NOT_FOUND', 422);
            }
            const templateGuid = template.getGuid();
            serviceTypeByTemplateGuid.set(templateGuid, requirement.getServiceType());
            const continuationTemplate = requirement.isGuard()
                ? yield requirement.getContinuationTemplateObj()
                : null;
            if (requirement.isGuard() && !continuationTemplate) {
                throw new SuggestionGenerationError(`Guard requirement ${requirement.getGuid()} has no continuation template`, 'PLANNING_SUGGESTION_GUARD_CONTINUATION_REQUIRED', 422);
            }
            if (continuationTemplate) {
                serviceTypeByTemplateGuid.set(continuationTemplate.getGuid(), 'GUARD_CONTINUATION');
            }
            engineRequirements.push({
                guid: requirement.getGuid(),
                dayOfWeek: requirement.getDayOfWeek(),
                serviceType: requirement.getServiceType(),
                minEmployees: requirement.getMinEmployees(),
                targetEmployees: requirement.getTargetEmployees(),
                maxEmployees: (_g = requirement.getMaxEmployees()) !== null && _g !== void 0 ? _g : null,
                priority: requirement.getPriority(),
                allocationMode: requirement.getAllocationMode(),
                template: {
                    guid: templateGuid,
                    name: template.getName(),
                    definition: template.getDefinition(),
                },
                continuationTemplate: continuationTemplate
                    ? {
                        guid: continuationTemplate.getGuid(),
                        name: continuationTemplate.getName(),
                        definition: continuationTemplate.getDefinition(),
                    }
                    : null,
                continuationDayOffset: requirement.getContinuationDayOffset(),
                creditedMinutes: (_h = requirement.getCreditedMinutes()) !== null && _h !== void 0 ? _h : null,
            });
        }
        const historyWeeks = config.getFairnessWindowWeeks();
        const historyFrom = addDays(periodFrom, -(historyWeeks * 7));
        if (config.getGuardTeamMode() === 'WEEKLY_POOL' &&
            !engineRequirements.some((requirement) => requirement.serviceType === 'GUARD')) {
            throw new SuggestionGenerationError('WEEKLY_POOL requires at least one active GUARD requirement', 'WEEKLY_GUARD_POOL_REQUIREMENT_REQUIRED', 422);
        }
        const historyTo = addDays(periodFrom, -1);
        const historicalRaw = yield ScheduleAssignments_js_1.default._listByDateRange(historyFrom, historyTo);
        const employeeGuids = new Set(employees.map((employee) => employee.guid));
        const historicalAssignments = [];
        if (historicalRaw) {
            for (const assignment of historicalRaw) {
                const snapshot = assignment.getSessionTemplate();
                if (!(snapshot === null || snapshot === void 0 ? void 0 : snapshot.guid) || !(snapshot === null || snapshot === void 0 ? void 0 : snapshot.definition))
                    continue;
                const historicalBase = {
                    startDate: assignment.getStartDate(),
                    endDate: (_j = assignment.getEndDate()) !== null && _j !== void 0 ? _j : historyTo,
                    templateGuid: snapshot.guid,
                    templateName: (_k = snapshot.name) !== null && _k !== void 0 ? _k : '—',
                    definition: snapshot.definition,
                    serviceType: (_l = serviceTypeByTemplateGuid.get(snapshot.guid)) !== null && _l !== void 0 ? _l : 'STANDARD',
                };
                if (assignment.getFamily() === shared_1.SAFamily.USER) {
                    const userGuid = assignment.getRelated();
                    if (!userGuid || !employeeGuids.has(userGuid))
                        continue;
                    historicalAssignments.push(Object.assign({ userGuid }, historicalBase));
                    continue;
                }
                if (assignment.getFamily() === shared_1.SAFamily.GROUP) {
                    const groupGuid = assignment.getRelated();
                    if (!groupGuid)
                        continue;
                    const group = yield Groups_js_1.default._load(groupGuid, true);
                    if (!group)
                        continue;
                    const activeMembers = yield group.getDirectMembers(true);
                    for (const member of activeMembers) {
                        const userGuid = member.getGuid();
                        if (!userGuid || !employeeGuids.has(userGuid))
                            continue;
                        historicalAssignments.push(Object.assign({ userGuid }, historicalBase));
                    }
                }
            }
        }
        const engineConfig = {
            minRestDaysPerWeek: config.getMinRestDaysPerWeek(),
            maxConsecutiveWorkDays: config.getMaxConsecutiveWorkDays(),
            maxWeeklyMinutes: (_m = config.getMaxWeeklyMinutes()) !== null && _m !== void 0 ? _m : null,
            minRestMinutesBetweenShifts: config.getMinRestMinutesBetweenShifts(),
            maxConsecutiveGuards: config.getMaxConsecutiveGuards(),
            restAfterGuardRequired: config.isRestAfterGuardRequired(),
            postGuardRestDays: config.getPostGuardRestDays(),
            maxRestingEmployeesPerDay: (_o = config.getMaxRestingEmployeesPerDay()) !== null && _o !== void 0 ? _o : null,
            fairnessWindowWeeks: config.getFairnessWindowWeeks(),
            strictCoverage: config.isStrictCoverage(),
            weeklyLeavePolicy: {
                mode: config.getWeeklyLeaveMode(),
                employeesPerWeek: config.getWeeklyLeaveEmployeesPerWeek(),
                allowedDays: config.getWeeklyLeaveAllowedDays(),
                rotationAnchorDate: (_p = config.getWeeklyLeaveRotationAnchorDate()) !== null && _p !== void 0 ? _p : null,
                completeWeeksOnly: config.isWeeklyLeaveCompleteWeeksOnly(),
                postGuardRestCountsAsLeave: config.doesPostGuardRestCountAsWeeklyLeave(),
            },
            guardTeamPolicy: {
                mode: config.getGuardTeamMode(),
                employeesPerWeek: config.getGuardTeamEmployeesPerWeek(),
                selectionMode: config.getGuardTeamSelectionMode(),
                rotationAnchorDate: (_q = config.getGuardTeamRotationAnchorDate()) !== null && _q !== void 0 ? _q : null,
                completeWeeksOnly: config.isGuardTeamCompleteWeeksOnly(),
                requireParticipation: config.doesGuardTeamRequireParticipation(),
            },
        };
        const solverInput = {
            employees,
            requirements: engineRequirements,
            historicalAssignments,
            periodFrom,
            periodTo,
            config: engineConfig,
            solverTimeoutSeconds: config.getSolverTimeoutSeconds(),
        };
        let engineResult;
        let solverMetadata;
        try {
            const execution = yield planning_solver_factory_js_1.default.solve(solverInput, {
                solverType: config.getSolverType(),
                timeoutSeconds: config.getSolverTimeoutSeconds(),
                fallbackToGreedy: config.shouldFallbackToGreedy(),
                ortoolsEndpoint: (_s = (_r = globalThis.process) === null || _r === void 0 ? void 0 : _r.env) === null || _s === void 0 ? void 0 : _s.PLANNING_ORTOOLS_URL,
            });
            engineResult = execution.result;
            solverMetadata = execution.metadata;
        }
        catch (error) {
            if (error instanceof
                suggestion_engine_js_1.PlanningInfeasibleError) {
                throw new SuggestionGenerationError(error.message, error.code, 422, error.diagnostics);
            }
            if (error instanceof
                planning_solver_js_1.PlanningSolverTechnicalError) {
                throw new SuggestionGenerationError(error.message, error.code, 503, error.details);
            }
            throw error;
        }
        const persistedDiagnostics = (0, planning_solver_js_1.withSolverDiagnostics)(engineResult.diagnostics, solverMetadata);
        const suggestion = new ScheduleSuggestion_js_1.default()
            .setTenant((_u = (_t = manager.getTenant) === null || _t === void 0 ? void 0 : _t.call(manager)) !== null && _u !== void 0 ? _u : '')
            .setManager(manager.getId())
            .setPeriodFrom(periodFrom)
            .setPeriodTo(periodTo)
            .setHistoryWeeks(historyWeeks)
            .setConformityScore(engineResult.conformityScore)
            .setConfig(config.getId())
            .setEngineVersion(solverMetadata.solverVersion)
            .setDiagnostics(persistedDiagnostics);
        yield suggestion.save();
        for (const employeeResult of engineResult.items) {
            const user = yield User_js_1.default._load(employeeResult.userGuid, true);
            if (!user)
                continue;
            const item = new ScheduleSuggestionItem_js_1.default()
                .setSuggestion(suggestion.getId())
                .setUser(user.getId())
                .setSchedule(employeeResult.schedule)
                .setReasons(employeeResult.reasons);
            yield item.save();
        }
        return {
            suggestion,
            engineResult,
            employeeCount: engineResult.items.length,
            configGuid: config.getGuid(),
            configVersion: config.getVersion(),
            solver: solverMetadata,
        };
    });
}
