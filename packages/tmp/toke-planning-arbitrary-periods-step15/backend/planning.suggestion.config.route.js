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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var shared_1 = require("@toke/shared");
var ensured_routes_js_1 = require("../../middle/ensured-routes.js");
var response_js_1 = require("../../tools/response.js");
var PlanningSuggestionConfig_js_1 = require("../class/PlanningSuggestionConfig.js");
var User_js_1 = require("../class/User.js");
var shared_2 = require("@toke/shared");
var router = (0, express_1.Router)();
var CODES = {
    NOT_FOUND: 'PLANNING_SUGGESTION_CONFIG_NOT_FOUND',
    CREATION_FAILED: 'PLANNING_SUGGESTION_CONFIG_CREATION_FAILED',
    UPDATE_FAILED: 'PLANNING_SUGGESTION_CONFIG_UPDATE_FAILED',
    LISTING_FAILED: 'PLANNING_SUGGESTION_CONFIG_LISTING_FAILED',
    DELETION_FAILED: 'PLANNING_SUGGESTION_CONFIG_DELETION_FAILED',
    MANAGER_NOT_FOUND: 'PLANNING_SUGGESTION_CONFIG_MANAGER_NOT_FOUND',
};
router.get('/', ensured_routes_js_1.default.get(), function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var configs, _a, _b, _c, _d, error_1;
    var _e, _f;
    var _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 5, , 6]);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._list()];
            case 1:
                configs = _h.sent();
                _b = (_a = response_js_1.default).handleSuccess;
                _c = [res];
                _e = {};
                _f = {
                    count: (_g = configs === null || configs === void 0 ? void 0 : configs.length) !== null && _g !== void 0 ? _g : 0
                };
                if (!configs) return [3 /*break*/, 3];
                return [4 /*yield*/, Promise.all(configs.map(function (config) { return config.toJSON(); }))];
            case 2:
                _d = _h.sent();
                return [3 /*break*/, 4];
            case 3:
                _d = [];
                _h.label = 4;
            case 4: return [2 /*return*/, _b.apply(_a, _c.concat([(_e.planning_suggestion_configs = (_f.items = _d,
                        _f),
                        _e)]))];
            case 5:
                error_1 = _h.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
                        code: CODES.LISTING_FAILED,
                        message: error_1.message,
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get('/active', ensured_routes_js_1.default.get(), function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var config, _a, _b, _c, _d, error_2;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 5, , 6]);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._loadActive()];
            case 1:
                config = _f.sent();
                _b = (_a = response_js_1.default).handleSuccess;
                _c = [res];
                _e = {};
                if (!config) return [3 /*break*/, 3];
                return [4 /*yield*/, config.toJSON()];
            case 2:
                _d = _f.sent();
                return [3 /*break*/, 4];
            case 3:
                _d = null;
                _f.label = 4;
            case 4: return [2 /*return*/, _b.apply(_a, _c.concat([(_e.planning_suggestion_config = _d,
                        _e)]))];
            case 5:
                error_2 = _f.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
                        code: CODES.LISTING_FAILED,
                        message: error_2.message,
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.get('/:guid', ensured_routes_js_1.default.get(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var guid, config, _a, _b, _c, error_3;
    var _d;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 3, , 4]);
                guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._load(guid, true)];
            case 1:
                config = _f.sent();
                if (!config) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                            code: CODES.NOT_FOUND,
                            message: 'Planning suggestion configuration not found',
                        })];
                }
                _b = (_a = response_js_1.default).handleSuccess;
                _c = [res];
                _d = {};
                return [4 /*yield*/, config.toJSON()];
            case 2: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.planning_suggestion_config = _f.sent(),
                        _d)]))];
            case 3:
                error_3 = _f.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, error_3.code ? shared_1.HttpStatus.BAD_REQUEST : shared_1.HttpStatus.INTERNAL_ERROR, {
                        code: (_e = error_3.code) !== null && _e !== void 0 ? _e : CODES.LISTING_FAILED,
                        message: error_3.message,
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/:manager', ensured_routes_js_1.default.post(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var managerGuid, manager, data, config, _a, _b, _c, error_4;
    var _d;
    var _e, _f, _g, _h, _j, _k, _l, _m;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                _o.trys.push([0, 4, , 5]);
                managerGuid = req.params.manager;
                if (!shared_1.UsersValidationUtils.validateGuid(managerGuid)) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                            code: 'INVALID_MANAGER_GUID',
                            message: 'Invalid manager GUID',
                        })];
                }
                return [4 /*yield*/, User_js_1.default._load(managerGuid, true)];
            case 1:
                manager = _o.sent();
                if (!manager) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                            code: CODES.MANAGER_NOT_FOUND,
                            message: 'Manager not found',
                        })];
                }
                data = (0, shared_2.validatePlanningSuggestionConfigCreation)(req.body);
                config = new PlanningSuggestionConfig_js_1.default()
                    .setName(data.name)
                    .setActive(data.active)
                    .setMinRestDaysPerWeek(data.min_rest_days_per_week)
                    .setMaxConsecutiveWorkDays(data.max_consecutive_work_days)
                    .setMaxWeeklyMinutes((_e = data.max_weekly_minutes) !== null && _e !== void 0 ? _e : null)
                    .setMinRestMinutesBetweenShifts(data.min_rest_minutes_between_shifts)
                    .setMaxConsecutiveGuards(data.max_consecutive_guards)
                    .setRestAfterGuardRequired(data.rest_after_guard_required)
                    .setPostGuardRestDays(data.post_guard_rest_days)
                    .setMaxRestingEmployeesPerDay((_f = data.max_resting_employees_per_day) !== null && _f !== void 0 ? _f : null)
                    .setWeeklyLeaveMode(data.weekly_leave_mode)
                    .setWeeklyLeaveEmployeesPerWeek(data.weekly_leave_employees_per_week)
                    .setWeeklyLeaveAllowedDays(data.weekly_leave_allowed_days)
                    .setWeeklyLeaveRotationAnchorDate((_g = data.weekly_leave_rotation_anchor_date) !== null && _g !== void 0 ? _g : null)
                    .setWeeklyLeaveCompleteWeeksOnly(data.weekly_leave_complete_weeks_only)
                    .setPostGuardRestCountsAsWeeklyLeave(data.post_guard_rest_counts_as_weekly_leave)
                    .setWeeklyLeaveSelector(data.weekly_leave_selector)
                    .setWeeklyLeaveDaysPerEmployee(data.weekly_leave_days_per_employee)
                    .setWeeklyLeaveCountMode(data.weekly_leave_count_mode)
                    .setWeeklyLeaveMaxEmployeesPerDay((_h = data.weekly_leave_max_employees_per_day) !== null && _h !== void 0 ? _h : null)
                    .setWeeklyLeaveRequireWorkOnOtherDays(data.weekly_leave_require_work_on_other_days)
                    .setWeeklyLeaveServiceScope(data.weekly_leave_service_scope)
                    .setGuardTeamMode(data.guard_team_mode)
                    .setGuardTeamEmployeesPerWeek(data.guard_team_employees_per_week)
                    .setGuardTeamSelectionMode(data.guard_team_selection_mode)
                    .setGuardTeamRotationAnchorDate((_j = data.guard_team_rotation_anchor_date) !== null && _j !== void 0 ? _j : null)
                    .setGuardTeamCompleteWeeksOnly(data.guard_team_complete_weeks_only)
                    .setGuardTeamRequireParticipation(data.guard_team_require_participation)
                    .setGuardTeamEligiblePlanningModes(data.guard_team_eligible_planning_modes)
                    .setGuardTeamMemberServiceAccess(data.guard_team_member_service_access)
                    .setGuardTeamBalanceMode(data.guard_team_balance_mode)
                    .setGuardTeamMaxMembershipSpread((_k = data.guard_team_max_membership_spread) !== null && _k !== void 0 ? _k : null)
                    .setGuardTeamMaxConsecutiveMembershipWeeks((_l = data.guard_team_max_consecutive_membership_weeks) !== null && _l !== void 0 ? _l : null)
                    .setFairnessWindowWeeks(data.fairness_window_weeks)
                    .setStrictCoverage(data.strict_coverage)
                    .setSolverType(data.solver_type)
                    .setSolverTimeoutSeconds(data.solver_timeout_seconds)
                    .setFallbackToGreedy(data.fallback_to_greedy)
                    .setCreatedBy(manager.getId());
                return [4 /*yield*/, config.save()];
            case 2:
                _o.sent();
                _b = (_a = response_js_1.default).handleCreated;
                _c = [res];
                _d = {
                    message: 'Planning suggestion configuration created successfully'
                };
                return [4 /*yield*/, config.toJSON()];
            case 3: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.planning_suggestion_config = _o.sent(),
                        _d)]))];
            case 4:
                error_4 = _o.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, error_4.code ? shared_1.HttpStatus.BAD_REQUEST : shared_1.HttpStatus.INTERNAL_ERROR, {
                        code: (_m = error_4.code) !== null && _m !== void 0 ? _m : CODES.CREATION_FAILED,
                        message: error_4.message,
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.put('/:guid', ensured_routes_js_1.default.put(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var guid, data, config, _a, _b, _c, error_5;
    var _d;
    var _e, _f, _g, _h, _j, _k, _l, _m, _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                _p.trys.push([0, 4, , 5]);
                guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
                data = (0, shared_2.validatePlanningSuggestionConfigUpdate)(req.body);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._load(guid, true)];
            case 1:
                config = _p.sent();
                if (!config) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                            code: CODES.NOT_FOUND,
                            message: 'Planning suggestion configuration not found',
                        })];
                }
                if (data.name !== undefined)
                    config.setName(data.name);
                if (data.active !== undefined)
                    config.setActive(data.active);
                if (data.min_rest_days_per_week !== undefined) {
                    config.setMinRestDaysPerWeek(data.min_rest_days_per_week);
                }
                if (data.max_consecutive_work_days !== undefined) {
                    config.setMaxConsecutiveWorkDays((_e = data.max_consecutive_work_days) !== null && _e !== void 0 ? _e : null);
                }
                if (data.max_weekly_minutes !== undefined) {
                    config.setMaxWeeklyMinutes((_f = data.max_weekly_minutes) !== null && _f !== void 0 ? _f : null);
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
                    config.setMaxRestingEmployeesPerDay((_g = data.max_resting_employees_per_day) !== null && _g !== void 0 ? _g : null);
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
                    config.setWeeklyLeaveRotationAnchorDate((_h = data.weekly_leave_rotation_anchor_date) !== null && _h !== void 0 ? _h : null);
                }
                if (data.weekly_leave_complete_weeks_only !== undefined) {
                    config.setWeeklyLeaveCompleteWeeksOnly(data.weekly_leave_complete_weeks_only);
                }
                if (data.post_guard_rest_counts_as_weekly_leave !== undefined) {
                    config.setPostGuardRestCountsAsWeeklyLeave(data.post_guard_rest_counts_as_weekly_leave);
                }
                if (data.weekly_leave_selector !== undefined) {
                    config.setWeeklyLeaveSelector(data.weekly_leave_selector);
                }
                if (data.weekly_leave_days_per_employee !== undefined) {
                    config.setWeeklyLeaveDaysPerEmployee(data.weekly_leave_days_per_employee);
                }
                if (data.weekly_leave_count_mode !== undefined) {
                    config.setWeeklyLeaveCountMode(data.weekly_leave_count_mode);
                }
                if (data.weekly_leave_max_employees_per_day !== undefined) {
                    config.setWeeklyLeaveMaxEmployeesPerDay((_j = data.weekly_leave_max_employees_per_day) !== null && _j !== void 0 ? _j : null);
                }
                if (data.weekly_leave_require_work_on_other_days !== undefined) {
                    config.setWeeklyLeaveRequireWorkOnOtherDays(data.weekly_leave_require_work_on_other_days);
                }
                if (data.weekly_leave_service_scope !== undefined) {
                    config.setWeeklyLeaveServiceScope(data.weekly_leave_service_scope);
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
                    config.setGuardTeamRotationAnchorDate((_k = data.guard_team_rotation_anchor_date) !== null && _k !== void 0 ? _k : null);
                }
                if (data.guard_team_complete_weeks_only !== undefined) {
                    config.setGuardTeamCompleteWeeksOnly(data.guard_team_complete_weeks_only);
                }
                if (data.guard_team_require_participation !== undefined) {
                    config.setGuardTeamRequireParticipation(data.guard_team_require_participation);
                }
                if (data.guard_team_eligible_planning_modes !== undefined) {
                    config.setGuardTeamEligiblePlanningModes(data.guard_team_eligible_planning_modes);
                }
                if (data.guard_team_member_service_access !== undefined) {
                    config.setGuardTeamMemberServiceAccess(data.guard_team_member_service_access);
                }
                if (data.guard_team_balance_mode !== undefined) {
                    config.setGuardTeamBalanceMode(data.guard_team_balance_mode);
                }
                if (data.guard_team_max_membership_spread !== undefined) {
                    config.setGuardTeamMaxMembershipSpread((_l = data.guard_team_max_membership_spread) !== null && _l !== void 0 ? _l : null);
                }
                if (data.guard_team_max_consecutive_membership_weeks !== undefined) {
                    config.setGuardTeamMaxConsecutiveMembershipWeeks((_m = data.guard_team_max_consecutive_membership_weeks) !== null && _m !== void 0 ? _m : null);
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
                return [4 /*yield*/, config.save()];
            case 2:
                _p.sent();
                _b = (_a = response_js_1.default).handleSuccess;
                _c = [res];
                _d = {
                    message: 'Planning suggestion configuration updated successfully'
                };
                return [4 /*yield*/, config.toJSON()];
            case 3: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.planning_suggestion_config = _p.sent(),
                        _d)]))];
            case 4:
                error_5 = _p.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, error_5.code ? shared_1.HttpStatus.BAD_REQUEST : shared_1.HttpStatus.INTERNAL_ERROR, {
                        code: (_o = error_5.code) !== null && _o !== void 0 ? _o : CODES.UPDATE_FAILED,
                        message: error_5.message,
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.patch('/:guid/activate', ensured_routes_js_1.default.patch(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var guid, config, _a, _b, _c, error_6;
    var _d;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 4, , 5]);
                guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._load(guid, true)];
            case 1:
                config = _f.sent();
                if (!config) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                            code: CODES.NOT_FOUND,
                            message: 'Planning suggestion configuration not found',
                        })];
                }
                return [4 /*yield*/, config.activate()];
            case 2:
                _f.sent();
                _b = (_a = response_js_1.default).handleSuccess;
                _c = [res];
                _d = {
                    message: 'Planning suggestion configuration activated successfully'
                };
                return [4 /*yield*/, config.toJSON()];
            case 3: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.planning_suggestion_config = _f.sent(),
                        _d)]))];
            case 4:
                error_6 = _f.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                        code: (_e = error_6.code) !== null && _e !== void 0 ? _e : CODES.UPDATE_FAILED,
                        message: error_6.message,
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.patch('/:guid/deactivate', ensured_routes_js_1.default.patch(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var guid, config, _a, _b, _c, error_7;
    var _d;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 4, , 5]);
                guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._load(guid, true)];
            case 1:
                config = _f.sent();
                if (!config) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                            code: CODES.NOT_FOUND,
                            message: 'Planning suggestion configuration not found',
                        })];
                }
                return [4 /*yield*/, config.deactivate()];
            case 2:
                _f.sent();
                _b = (_a = response_js_1.default).handleSuccess;
                _c = [res];
                _d = {
                    message: 'Planning suggestion configuration deactivated successfully'
                };
                return [4 /*yield*/, config.toJSON()];
            case 3: return [2 /*return*/, _b.apply(_a, _c.concat([(_d.planning_suggestion_config = _f.sent(),
                        _d)]))];
            case 4:
                error_7 = _f.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.BAD_REQUEST, {
                        code: (_e = error_7.code) !== null && _e !== void 0 ? _e : CODES.UPDATE_FAILED,
                        message: error_7.message,
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.delete('/:guid', ensured_routes_js_1.default.delete(), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var guid, config, error_8;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                guid = (0, shared_2.validatePlanningSuggestionConfigGuid)(req.params.guid);
                return [4 /*yield*/, PlanningSuggestionConfig_js_1.default._load(guid, true)];
            case 1:
                config = _b.sent();
                if (!config) {
                    return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                            code: CODES.NOT_FOUND,
                            message: 'Planning suggestion configuration not found',
                        })];
                }
                return [4 /*yield*/, config.softDelete()];
            case 2:
                _b.sent();
                return [2 /*return*/, response_js_1.default.handleSuccess(res, {
                        message: 'Planning suggestion configuration deleted successfully',
                    })];
            case 3:
                error_8 = _b.sent();
                return [2 /*return*/, response_js_1.default.handleError(res, shared_1.HttpStatus.INTERNAL_ERROR, {
                        code: (_a = error_8.code) !== null && _a !== void 0 ? _a : CODES.DELETION_FAILED,
                        message: error_8.message,
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
