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
const express_1 = require("express");
const shared_1 = require("@toke/shared");
const ensured_routes_js_1 = __importDefault(require("../../middle/ensured-routes.js"));
const response_js_1 = __importDefault(require("../../tools/response.js"));
const PlanningSuggestionConfig_js_1 = __importDefault(require("../class/PlanningSuggestionConfig.js"));
const User_js_1 = __importDefault(require("../class/User.js"));
const shared_2 = require("@toke/shared");
const router = (0, express_1.Router)();
const CODES = {
    NOT_FOUND: 'PLANNING_SUGGESTION_CONFIG_NOT_FOUND',
    CREATION_FAILED: 'PLANNING_SUGGESTION_CONFIG_CREATION_FAILED',
    UPDATE_FAILED: 'PLANNING_SUGGESTION_CONFIG_UPDATE_FAILED',
    LISTING_FAILED: 'PLANNING_SUGGESTION_CONFIG_LISTING_FAILED',
    DELETION_FAILED: 'PLANNING_SUGGESTION_CONFIG_DELETION_FAILED',
    MANAGER_NOT_FOUND: 'PLANNING_SUGGESTION_CONFIG_MANAGER_NOT_FOUND',
};
router.get('/', ensured_routes_js_1.default.get(), (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const configs = yield PlanningSuggestionConfig_js_1.default._list();
        return response_js_1.default.handleSuccess(res, {
            planning_suggestion_configs: {
                count: (_a = configs === null || configs === void 0 ? void 0 : configs.length) !== null && _a !== void 0 ? _a : 0,
                items: configs
                    ? yield Promise.all(configs.map((config) => config.toJSON()))
                    : [],
            },
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: CODES.LISTING_FAILED,
            message: error.message,
        });
    }
}));
router.get('/active', ensured_routes_js_1.default.get(), (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = yield PlanningSuggestionConfig_js_1.default._loadActive();
        return response_js_1.default.handleSuccess(res, {
            planning_suggestion_config: config ? yield config.toJSON() : null,
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: CODES.LISTING_FAILED,
            message: error.message,
        });
    }
}));
router.get('/:guid', ensured_routes_js_1.default.get(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
        const config = yield PlanningSuggestionConfig_js_1.default._load(guid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        return response_js_1.default.handleSuccess(res, {
            planning_suggestion_config: yield config.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, error.code ? shared_1.HttpStatus.BAD_REQUEST : shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_a = error.code) !== null && _a !== void 0 ? _a : CODES.LISTING_FAILED,
            message: error.message,
        });
    }
}));
router.post('/:manager', ensured_routes_js_1.default.post(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const managerGuid = req.params.manager;
        if (!shared_1.UsersValidationUtils.validateGuid(managerGuid)) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                code: 'INVALID_MANAGER_GUID',
                message: 'Invalid manager GUID',
            });
        }
        const manager = yield User_js_1.default._load(managerGuid, true);
        if (!manager) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.MANAGER_NOT_FOUND,
                message: 'Manager not found',
            });
        }
        const data = (0, shared_2.validatePlanningSuggestionConfigCreation)(req.body);
        const config = new PlanningSuggestionConfig_js_1.default()
            .setName(data.name)
            .setActive(data.active)
            .setMinRestDaysPerWeek(data.min_rest_days_per_week)
            .setMaxConsecutiveWorkDays(data.max_consecutive_work_days)
            .setMaxWeeklyMinutes((_a = data.max_weekly_minutes) !== null && _a !== void 0 ? _a : null)
            .setMinRestMinutesBetweenShifts(data.min_rest_minutes_between_shifts)
            .setMaxConsecutiveGuards(data.max_consecutive_guards)
            .setRestAfterGuardRequired(data.rest_after_guard_required)
            .setPostGuardRestDays(data.post_guard_rest_days)
            .setMaxRestingEmployeesPerDay((_b = data.max_resting_employees_per_day) !== null && _b !== void 0 ? _b : null)
            .setWeeklyLeaveMode(data.weekly_leave_mode)
            .setWeeklyLeaveEmployeesPerWeek(data.weekly_leave_employees_per_week)
            .setWeeklyLeaveAllowedDays(data.weekly_leave_allowed_days)
            .setWeeklyLeaveRotationAnchorDate((_c = data.weekly_leave_rotation_anchor_date) !== null && _c !== void 0 ? _c : null)
            .setWeeklyLeaveCompleteWeeksOnly(data.weekly_leave_complete_weeks_only)
            .setPostGuardRestCountsAsWeeklyLeave(data.post_guard_rest_counts_as_weekly_leave)
            .setGuardTeamMode(data.guard_team_mode)
            .setGuardTeamEmployeesPerWeek(data.guard_team_employees_per_week)
            .setGuardTeamSelectionMode(data.guard_team_selection_mode)
            .setGuardTeamRotationAnchorDate((_d = data.guard_team_rotation_anchor_date) !== null && _d !== void 0 ? _d : null)
            .setGuardTeamCompleteWeeksOnly(data.guard_team_complete_weeks_only)
            .setGuardTeamRequireParticipation(data.guard_team_require_participation)
            .setFairnessWindowWeeks(data.fairness_window_weeks)
            .setStrictCoverage(data.strict_coverage)
            .setSolverType(data.solver_type)
            .setSolverTimeoutSeconds(data.solver_timeout_seconds)
            .setFallbackToGreedy(data.fallback_to_greedy)
            .setCreatedBy(manager.getId());
        yield config.save();
        return response_js_1.default.handleCreated(res, {
            message: 'Planning suggestion configuration created successfully',
            planning_suggestion_config: yield config.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, error.code ? shared_1.HttpStatus.BAD_REQUEST : shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_e = error.code) !== null && _e !== void 0 ? _e : CODES.CREATION_FAILED,
            message: error.message,
        });
    }
}));
router.put('/:guid', ensured_routes_js_1.default.put(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
        const data = (0, shared_2.validatePlanningSuggestionConfigUpdate)(req.body);
        const config = yield PlanningSuggestionConfig_js_1.default._load(guid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        if (data.name !== undefined)
            config.setName(data.name);
        if (data.active !== undefined)
            config.setActive(data.active);
        if (data.min_rest_days_per_week !== undefined) {
            config.setMinRestDaysPerWeek(data.min_rest_days_per_week);
        }
        if (data.max_consecutive_work_days !== undefined) {
            config.setMaxConsecutiveWorkDays((_a = data.max_consecutive_work_days) !== null && _a !== void 0 ? _a : null);
        }
        if (data.max_weekly_minutes !== undefined) {
            config.setMaxWeeklyMinutes((_b = data.max_weekly_minutes) !== null && _b !== void 0 ? _b : null);
        }
        if (data.min_rest_minutes_between_shifts !== undefined) {
            config.setMinRestMinutesBetweenShifts(data.min_rest_minutes_between_shifts);
        }
        if (data.max_consecutive_guards !== undefined) {
            config.setMaxConsecutiveGuards(data.max_consecutive_guards);
        }
        if (data.rest_after_guard_required !== undefined) {
            config.setRestAfterGuardRequired(data.rest_after_guard_required);
        }
        if (data.post_guard_rest_days !== undefined) {
            config.setPostGuardRestDays(data.post_guard_rest_days);
        }
        if (data.max_resting_employees_per_day !== undefined) {
            config.setMaxRestingEmployeesPerDay((_c = data.max_resting_employees_per_day) !== null && _c !== void 0 ? _c : null);
        }
        if (data.weekly_leave_mode !== undefined) {
            config.setWeeklyLeaveMode(data.weekly_leave_mode);
        }
        if (data.weekly_leave_employees_per_week !== undefined) {
            config.setWeeklyLeaveEmployeesPerWeek(data.weekly_leave_employees_per_week);
        }
        if (data.weekly_leave_allowed_days !== undefined) {
            config.setWeeklyLeaveAllowedDays(data.weekly_leave_allowed_days);
        }
        if (data.weekly_leave_rotation_anchor_date !== undefined) {
            config.setWeeklyLeaveRotationAnchorDate((_d = data.weekly_leave_rotation_anchor_date) !== null && _d !== void 0 ? _d : null);
        }
        if (data.weekly_leave_complete_weeks_only !== undefined) {
            config.setWeeklyLeaveCompleteWeeksOnly(data.weekly_leave_complete_weeks_only);
        }
        if (data.post_guard_rest_counts_as_weekly_leave !== undefined) {
            config.setPostGuardRestCountsAsWeeklyLeave(data.post_guard_rest_counts_as_weekly_leave);
        }
        if (data.guard_team_mode !== undefined) {
            config.setGuardTeamMode(data.guard_team_mode);
        }
        if (data.guard_team_employees_per_week !== undefined) {
            config.setGuardTeamEmployeesPerWeek(data.guard_team_employees_per_week);
        }
        if (data.guard_team_selection_mode !== undefined) {
            config.setGuardTeamSelectionMode(data.guard_team_selection_mode);
        }
        if (data.guard_team_rotation_anchor_date !== undefined) {
            config.setGuardTeamRotationAnchorDate((_e = data.guard_team_rotation_anchor_date) !== null && _e !== void 0 ? _e : null);
        }
        if (data.guard_team_complete_weeks_only !== undefined) {
            config.setGuardTeamCompleteWeeksOnly(data.guard_team_complete_weeks_only);
        }
        if (data.guard_team_require_participation !== undefined) {
            config.setGuardTeamRequireParticipation(data.guard_team_require_participation);
        }
        if (data.fairness_window_weeks !== undefined) {
            config.setFairnessWindowWeeks(data.fairness_window_weeks);
        }
        if (data.strict_coverage !== undefined) {
            config.setStrictCoverage(data.strict_coverage);
        }
        if (data.solver_type !== undefined) {
            config.setSolverType(data.solver_type);
        }
        if (data.solver_timeout_seconds !==
            undefined) {
            config.setSolverTimeoutSeconds(data.solver_timeout_seconds);
        }
        if (data.fallback_to_greedy !==
            undefined) {
            config.setFallbackToGreedy(data.fallback_to_greedy);
        }
        yield config.save();
        return response_js_1.default.handleSuccess(res, {
            message: 'Planning suggestion configuration updated successfully',
            planning_suggestion_config: yield config.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, error.code ? shared_1.HttpStatus.BAD_REQUEST : shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_f = error.code) !== null && _f !== void 0 ? _f : CODES.UPDATE_FAILED,
            message: error.message,
        });
    }
}));
router.patch('/:guid/activate', ensured_routes_js_1.default.patch(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
        const config = yield PlanningSuggestionConfig_js_1.default._load(guid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        yield config.activate();
        return response_js_1.default.handleSuccess(res, {
            message: 'Planning suggestion configuration activated successfully',
            planning_suggestion_config: yield config.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
            code: (_a = error.code) !== null && _a !== void 0 ? _a : CODES.UPDATE_FAILED,
            message: error.message,
        });
    }
}));
router.patch('/:guid/deactivate', ensured_routes_js_1.default.patch(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
        const config = yield PlanningSuggestionConfig_js_1.default._load(guid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        yield config.deactivate();
        return response_js_1.default.handleSuccess(res, {
            message: 'Planning suggestion configuration deactivated successfully',
            planning_suggestion_config: yield config.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
            code: (_a = error.code) !== null && _a !== void 0 ? _a : CODES.UPDATE_FAILED,
            message: error.message,
        });
    }
}));
router.delete('/:guid', ensured_routes_js_1.default.delete(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
        const config = yield PlanningSuggestionConfig_js_1.default._load(guid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        yield config.softDelete();
        return response_js_1.default.handleSuccess(res, {
            message: 'Planning suggestion configuration deleted successfully',
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_a = error.code) !== null && _a !== void 0 ? _a : CODES.DELETION_FAILED,
            message: error.message,
        });
    }
}));
exports.default = router;
