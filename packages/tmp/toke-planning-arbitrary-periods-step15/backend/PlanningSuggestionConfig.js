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
const PlanningSuggestionConfigModel_js_1 = __importDefault(require("../model/PlanningSuggestionConfigModel.js"));
const User_js_1 = __importDefault(require("./User.js"));
class PlanningSuggestionConfig extends PlanningSuggestionConfigModel_js_1.default {
    constructor() {
        super();
    }
    static _load(identifier, byGuid = false) {
        return new PlanningSuggestionConfig().load(identifier, byGuid);
    }
    static _loadActive() {
        return new PlanningSuggestionConfig().loadActive();
    }
    static _list(conditions = {}, paginationOptions = {}) {
        return new PlanningSuggestionConfig().list(conditions, paginationOptions);
    }
    getId() {
        return this.id;
    }
    getGuid() {
        return this.guid;
    }
    getName() {
        return this.name;
    }
    getVersion() {
        return this.version;
    }
    isActive() {
        return this.active;
    }
    getMinRestDaysPerWeek() {
        return this.min_rest_days_per_week;
    }
    getMaxConsecutiveWorkDays() {
        return this.max_consecutive_work_days;
    }
    getMaxWeeklyMinutes() {
        return this.max_weekly_minutes;
    }
    getMinRestMinutesBetweenShifts() {
        return this.min_rest_minutes_between_shifts;
    }
    getMaxConsecutiveGuards() {
        return this.max_consecutive_guards;
    }
    isRestAfterGuardRequired() {
        return this.rest_after_guard_required;
    }
    getPostGuardRestDays() {
        return this.post_guard_rest_days;
    }
    getMaxRestingEmployeesPerDay() {
        return this.max_resting_employees_per_day;
    }
    getWeeklyLeaveMode() {
        return this.weekly_leave_mode;
    }
    getWeeklyLeaveEmployeesPerWeek() {
        return this.weekly_leave_employees_per_week;
    }
    getWeeklyLeaveAllowedDays() {
        return [...this.weekly_leave_allowed_days];
    }
    getWeeklyLeaveRotationAnchorDate() {
        return this.weekly_leave_rotation_anchor_date;
    }
    isWeeklyLeaveCompleteWeeksOnly() {
        return this.weekly_leave_complete_weeks_only;
    }
    doesPostGuardRestCountAsWeeklyLeave() {
        return this.post_guard_rest_counts_as_weekly_leave;
    }
    getPolicySchemaVersion() { return this.policy_schema_version; }
    getWeeklyLeaveSelector() {
        return Object.assign(Object.assign({}, this.weekly_leave_selector), { planning_modes: [...this.weekly_leave_selector.planning_modes] });
    }
    getWeeklyLeaveDaysPerEmployee() { return this.weekly_leave_days_per_employee; }
    getWeeklyLeaveCountMode() { return this.weekly_leave_count_mode; }
    getWeeklyLeaveMaxEmployeesPerDay() {
        return this.weekly_leave_max_employees_per_day;
    }
    doesWeeklyLeaveRequireWorkOnOtherDays() {
        return this.weekly_leave_require_work_on_other_days;
    }
    getWeeklyLeaveServiceScope() {
        return Object.assign(Object.assign({}, this.weekly_leave_service_scope), { service_types: [...this.weekly_leave_service_scope.service_types], template_guids: [...this.weekly_leave_service_scope.template_guids], requirement_guids: [...this.weekly_leave_service_scope.requirement_guids] });
    }
    getGuardTeamMode() {
        return this.guard_team_mode;
    }
    getGuardTeamEmployeesPerWeek() {
        return this.guard_team_employees_per_week;
    }
    getGuardTeamSelectionMode() {
        return this.guard_team_selection_mode;
    }
    getGuardTeamRotationAnchorDate() {
        return this.guard_team_rotation_anchor_date;
    }
    isGuardTeamCompleteWeeksOnly() {
        return this.guard_team_complete_weeks_only;
    }
    doesGuardTeamRequireParticipation() {
        return this.guard_team_require_participation;
    }
    getGuardTeamEligiblePlanningModes() {
        return [...this.guard_team_eligible_planning_modes];
    }
    getGuardTeamMemberServiceAccess() {
        return this.guard_team_member_service_access;
    }
    getGuardTeamBalanceMode() {
        return this.guard_team_balance_mode;
    }
    getGuardTeamMaxMembershipSpread() {
        return this.guard_team_max_membership_spread;
    }
    getGuardTeamMaxConsecutiveMembershipWeeks() {
        return this.guard_team_max_consecutive_membership_weeks;
    }
    getFairnessWindowWeeks() {
        return this.fairness_window_weeks;
    }
    isStrictCoverage() {
        return this.strict_coverage;
    }
    getSolverType() {
        return this.solver_type;
    }
    getSolverTimeoutSeconds() {
        return this.solver_timeout_seconds;
    }
    shouldFallbackToGreedy() {
        return this.fallback_to_greedy;
    }
    getCreatedBy() {
        return this.created_by;
    }
    getCreatedAt() {
        return this.created_at;
    }
    getUpdatedAt() {
        return this.updated_at;
    }
    setName(value) {
        this.name = value;
        return this;
    }
    setActive(value) {
        this.active = value;
        return this;
    }
    setMinRestDaysPerWeek(value) {
        this.min_rest_days_per_week = value;
        return this;
    }
    setMaxConsecutiveWorkDays(value) {
        this.max_consecutive_work_days = value;
        return this;
    }
    setMaxWeeklyMinutes(value) {
        this.max_weekly_minutes = value;
        return this;
    }
    setMinRestMinutesBetweenShifts(value) {
        this.min_rest_minutes_between_shifts = value;
        return this;
    }
    setMaxConsecutiveGuards(value) {
        this.max_consecutive_guards = value;
        return this;
    }
    setRestAfterGuardRequired(value) {
        this.rest_after_guard_required = value;
        return this;
    }
    setPostGuardRestDays(value) {
        this.post_guard_rest_days = value;
        return this;
    }
    setMaxRestingEmployeesPerDay(value) {
        this.max_resting_employees_per_day = value;
        return this;
    }
    setWeeklyLeaveMode(value) {
        this.weekly_leave_mode = value;
        return this;
    }
    setWeeklyLeaveEmployeesPerWeek(value) {
        this.weekly_leave_employees_per_week = value;
        return this;
    }
    setWeeklyLeaveAllowedDays(value) {
        this.weekly_leave_allowed_days = [...value];
        return this;
    }
    setWeeklyLeaveRotationAnchorDate(value) {
        this.weekly_leave_rotation_anchor_date = value;
        return this;
    }
    setWeeklyLeaveCompleteWeeksOnly(value) {
        this.weekly_leave_complete_weeks_only = value;
        return this;
    }
    setPostGuardRestCountsAsWeeklyLeave(value) {
        this.post_guard_rest_counts_as_weekly_leave = value;
        return this;
    }
    setWeeklyLeaveSelector(value) {
        this.weekly_leave_selector = Object.assign(Object.assign({}, value), { planning_modes: [...value.planning_modes] });
        return this;
    }
    setWeeklyLeaveDaysPerEmployee(value) {
        this.weekly_leave_days_per_employee = value;
        return this;
    }
    setWeeklyLeaveCountMode(value) {
        this.weekly_leave_count_mode = value;
        return this;
    }
    setWeeklyLeaveMaxEmployeesPerDay(value) {
        this.weekly_leave_max_employees_per_day = value;
        return this;
    }
    setWeeklyLeaveRequireWorkOnOtherDays(value) {
        this.weekly_leave_require_work_on_other_days = value;
        return this;
    }
    setWeeklyLeaveServiceScope(value) {
        this.weekly_leave_service_scope = Object.assign(Object.assign({}, value), { service_types: [...value.service_types], template_guids: [...value.template_guids], requirement_guids: [...value.requirement_guids] });
        return this;
    }
    setGuardTeamMode(value) {
        this.guard_team_mode = value;
        return this;
    }
    setGuardTeamEmployeesPerWeek(value) {
        this.guard_team_employees_per_week = value;
        return this;
    }
    setGuardTeamSelectionMode(value) {
        this.guard_team_selection_mode = value;
        return this;
    }
    setGuardTeamRotationAnchorDate(value) {
        this.guard_team_rotation_anchor_date = value;
        return this;
    }
    setGuardTeamCompleteWeeksOnly(value) {
        this.guard_team_complete_weeks_only = value;
        return this;
    }
    setGuardTeamRequireParticipation(value) {
        this.guard_team_require_participation = value;
        return this;
    }
    setGuardTeamEligiblePlanningModes(value) {
        this.guard_team_eligible_planning_modes = [...value];
        return this;
    }
    setGuardTeamMemberServiceAccess(value) {
        this.guard_team_member_service_access = value;
        return this;
    }
    setGuardTeamBalanceMode(value) {
        this.guard_team_balance_mode = value;
        return this;
    }
    setGuardTeamMaxMembershipSpread(value) {
        this.guard_team_max_membership_spread = value;
        return this;
    }
    setGuardTeamMaxConsecutiveMembershipWeeks(value) {
        this.guard_team_max_consecutive_membership_weeks = value;
        return this;
    }
    setFairnessWindowWeeks(value) {
        this.fairness_window_weeks = value;
        return this;
    }
    setStrictCoverage(value) {
        this.strict_coverage = value;
        return this;
    }
    setSolverType(value) {
        this.solver_type = value;
        return this;
    }
    setSolverTimeoutSeconds(value) {
        this.solver_timeout_seconds = value;
        return this;
    }
    setFallbackToGreedy(value) {
        this.fallback_to_greedy = value;
        return this;
    }
    setCreatedBy(value) {
        this.created_by = value;
        this.createdByObj = undefined;
        return this;
    }
    isNew() {
        return this.id === undefined;
    }
    getCreatedByObj() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.createdByObj)
                return this.createdByObj;
            if (!this.created_by)
                return null;
            const user = yield User_js_1.default._load(this.created_by);
            if (user)
                this.createdByObj = user;
            return user;
        });
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isNew()) {
                yield this.create();
            }
            else {
                yield this.update();
            }
        });
    }
    activate() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateActive(true);
        });
    }
    deactivate() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateActive(false);
        });
    }
    softDelete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.id)
                return false;
            return yield this.trash(this.id);
        });
    }
    toJSON() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const createdBy = yield this.getCreatedByObj();
            return {
                guid: this.guid,
                name: this.name,
                version: this.version,
                active: this.active,
                rules: {
                    policy_schema_version: this.policy_schema_version,
                    min_rest_days_per_week: this.min_rest_days_per_week,
                    max_consecutive_work_days: this.max_consecutive_work_days,
                    max_weekly_minutes: (_a = this.max_weekly_minutes) !== null && _a !== void 0 ? _a : null,
                    min_rest_minutes_between_shifts: this.min_rest_minutes_between_shifts,
                    max_consecutive_guards: this.max_consecutive_guards,
                    rest_after_guard_required: this.rest_after_guard_required,
                    post_guard_rest_days: this.post_guard_rest_days,
                    max_resting_employees_per_day: (_b = this.max_resting_employees_per_day) !== null && _b !== void 0 ? _b : null,
                    weekly_leave_policy: {
                        mode: this.weekly_leave_mode,
                        employees_per_week: this.weekly_leave_employees_per_week,
                        allowed_days: this.weekly_leave_allowed_days,
                        rotation_anchor_date: (_c = this.weekly_leave_rotation_anchor_date) !== null && _c !== void 0 ? _c : null,
                        complete_weeks_only: this.weekly_leave_complete_weeks_only,
                        post_guard_rest_counts_as_leave: this.post_guard_rest_counts_as_weekly_leave,
                        selector: this.getWeeklyLeaveSelector(),
                        days_per_employee: this.weekly_leave_days_per_employee,
                        count_mode: this.weekly_leave_count_mode,
                        max_employees_per_day: (_d = this.weekly_leave_max_employees_per_day) !== null && _d !== void 0 ? _d : null,
                        require_work_on_other_days: this.weekly_leave_require_work_on_other_days,
                        service_scope: this.getWeeklyLeaveServiceScope(),
                    },
                    guard_team_policy: {
                        mode: this.guard_team_mode,
                        employees_per_week: this.guard_team_employees_per_week,
                        selection_mode: this.guard_team_selection_mode,
                        rotation_anchor_date: (_e = this.guard_team_rotation_anchor_date) !== null && _e !== void 0 ? _e : null,
                        complete_weeks_only: this.guard_team_complete_weeks_only,
                        require_participation: this.guard_team_require_participation,
                        eligible_planning_modes: this.getGuardTeamEligiblePlanningModes(),
                        member_service_access: this.guard_team_member_service_access,
                        balance: {
                            mode: this.guard_team_balance_mode,
                            max_membership_spread: (_f = this.guard_team_max_membership_spread) !== null && _f !== void 0 ? _f : null,
                            max_consecutive_membership_weeks: (_g = this.guard_team_max_consecutive_membership_weeks) !== null && _g !== void 0 ? _g : null,
                        },
                    },
                    fairness_window_weeks: this.fairness_window_weeks,
                    strict_coverage: this.strict_coverage,
                },
                solver: {
                    type: this.solver_type,
                    timeout_seconds: this.solver_timeout_seconds,
                    fallback_to_greedy: this.fallback_to_greedy,
                },
                created_by: createdBy
                    ? {
                        guid: createdBy.getGuid(),
                        name: createdBy.getFullName(),
                    }
                    : null,
                created_at: this.created_at,
                updated_at: this.updated_at,
            };
        });
    }
    hydrate(data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13;
        this.id = data.id;
        this.guid = data.guid;
        this.name = data.name;
        this.version = (_a = data.version) !== null && _a !== void 0 ? _a : 1;
        this.active = (_b = data.active) !== null && _b !== void 0 ? _b : false;
        this.min_rest_days_per_week = (_c = data.min_rest_days_per_week) !== null && _c !== void 0 ? _c : 1;
        this.max_consecutive_work_days =
            data.max_consecutive_work_days === undefined
                ? 6
                : data.max_consecutive_work_days;
        this.max_weekly_minutes = (_d = data.max_weekly_minutes) !== null && _d !== void 0 ? _d : null;
        this.min_rest_minutes_between_shifts = (_e = data.min_rest_minutes_between_shifts) !== null && _e !== void 0 ? _e : 660;
        this.max_consecutive_guards = (_f = data.max_consecutive_guards) !== null && _f !== void 0 ? _f : 1;
        this.rest_after_guard_required = (_g = data.rest_after_guard_required) !== null && _g !== void 0 ? _g : true;
        this.post_guard_rest_days = (_h = data.post_guard_rest_days) !== null && _h !== void 0 ? _h : 0;
        this.max_resting_employees_per_day =
            (_j = data.max_resting_employees_per_day) !== null && _j !== void 0 ? _j : null;
        this.weekly_leave_mode =
            (_k = data.weekly_leave_mode) !== null && _k !== void 0 ? _k : 'PER_EMPLOYEE';
        this.weekly_leave_employees_per_week =
            (_l = data.weekly_leave_employees_per_week) !== null && _l !== void 0 ? _l : 1;
        this.weekly_leave_allowed_days =
            Array.isArray(data.weekly_leave_allowed_days)
                ? data.weekly_leave_allowed_days
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        this.weekly_leave_rotation_anchor_date =
            (_m = data.weekly_leave_rotation_anchor_date) !== null && _m !== void 0 ? _m : null;
        this.weekly_leave_complete_weeks_only =
            (_o = data.weekly_leave_complete_weeks_only) !== null && _o !== void 0 ? _o : true;
        this.post_guard_rest_counts_as_weekly_leave =
            (_p = data.post_guard_rest_counts_as_weekly_leave) !== null && _p !== void 0 ? _p : false;
        this.policy_schema_version = (_q = data.policy_schema_version) !== null && _q !== void 0 ? _q : 2;
        this.weekly_leave_selector = (_r = data.weekly_leave_selector) !== null && _r !== void 0 ? _r : {
            planning_modes: ['ROTATING'], guard_pool_relation: 'ANY',
        };
        this.weekly_leave_days_per_employee = (_s = data.weekly_leave_days_per_employee) !== null && _s !== void 0 ? _s : 1;
        this.weekly_leave_count_mode = (_t = data.weekly_leave_count_mode) !== null && _t !== void 0 ? _t : 'EXACT';
        this.weekly_leave_max_employees_per_day =
            (_u = data.weekly_leave_max_employees_per_day) !== null && _u !== void 0 ? _u : null;
        this.weekly_leave_require_work_on_other_days =
            (_v = data.weekly_leave_require_work_on_other_days) !== null && _v !== void 0 ? _v : false;
        this.weekly_leave_service_scope = (_w = data.weekly_leave_service_scope) !== null && _w !== void 0 ? _w : {
            mode: 'ANY', service_types: [], template_guids: [], requirement_guids: [], exclusive: false,
        };
        this.guard_team_mode =
            (_x = data.guard_team_mode) !== null && _x !== void 0 ? _x : 'DAILY_FLEXIBLE';
        this.guard_team_employees_per_week =
            (_y = data.guard_team_employees_per_week) !== null && _y !== void 0 ? _y : 1;
        this.guard_team_selection_mode =
            (_z = data.guard_team_selection_mode) !== null && _z !== void 0 ? _z : 'ROTATION_ORDER';
        this.guard_team_rotation_anchor_date =
            (_0 = data.guard_team_rotation_anchor_date) !== null && _0 !== void 0 ? _0 : null;
        this.guard_team_complete_weeks_only =
            (_1 = data.guard_team_complete_weeks_only) !== null && _1 !== void 0 ? _1 : true;
        this.guard_team_require_participation =
            (_2 = data.guard_team_require_participation) !== null && _2 !== void 0 ? _2 : true;
        this.guard_team_eligible_planning_modes =
            (_3 = data.guard_team_eligible_planning_modes) !== null && _3 !== void 0 ? _3 : ['ROTATING'];
        this.guard_team_member_service_access =
            (_4 = data.guard_team_member_service_access) !== null && _4 !== void 0 ? _4 : 'ANY_SERVICE';
        this.guard_team_balance_mode = (_5 = data.guard_team_balance_mode) !== null && _5 !== void 0 ? _5 : 'NONE';
        this.guard_team_max_membership_spread =
            (_6 = data.guard_team_max_membership_spread) !== null && _6 !== void 0 ? _6 : null;
        this.guard_team_max_consecutive_membership_weeks =
            (_7 = data.guard_team_max_consecutive_membership_weeks) !== null && _7 !== void 0 ? _7 : null;
        this.fairness_window_weeks = (_8 = data.fairness_window_weeks) !== null && _8 !== void 0 ? _8 : 8;
        this.strict_coverage = (_9 = data.strict_coverage) !== null && _9 !== void 0 ? _9 : true;
        this.solver_type =
            (_10 = data.solver_type) !== null && _10 !== void 0 ? _10 : 'GREEDY';
        this.solver_timeout_seconds =
            (_11 = data.solver_timeout_seconds) !== null && _11 !== void 0 ? _11 : 20;
        this.fallback_to_greedy =
            (_12 = data.fallback_to_greedy) !== null && _12 !== void 0 ? _12 : true;
        this.created_by = data.created_by;
        this.deleted_at = (_13 = data.deleted_at) !== null && _13 !== void 0 ? _13 : null;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        return this;
    }
    load(identifier, byGuid) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = byGuid
                ? yield this.findByGuid(String(identifier))
                : yield this.find(Number(identifier));
            return data ? this.hydrate(data) : null;
        });
    }
    loadActive() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.findActive();
            return data ? this.hydrate(data) : null;
        });
    }
    list(conditions, paginationOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataset = yield this.listAll(conditions, paginationOptions);
            if (!(dataset === null || dataset === void 0 ? void 0 : dataset.length))
                return null;
            return dataset.map((data) => new PlanningSuggestionConfig().hydrate(data));
        });
    }
}
exports.default = PlanningSuggestionConfig;
