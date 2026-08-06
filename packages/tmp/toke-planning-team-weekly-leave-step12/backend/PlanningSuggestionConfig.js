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
            var _a, _b, _c;
            const createdBy = yield this.getCreatedByObj();
            return {
                guid: this.guid,
                name: this.name,
                version: this.version,
                active: this.active,
                rules: {
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
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
        this.fairness_window_weeks = (_q = data.fairness_window_weeks) !== null && _q !== void 0 ? _q : 8;
        this.strict_coverage = (_r = data.strict_coverage) !== null && _r !== void 0 ? _r : true;
        this.solver_type =
            (_s = data.solver_type) !== null && _s !== void 0 ? _s : 'GREEDY';
        this.solver_timeout_seconds =
            (_t = data.solver_timeout_seconds) !== null && _t !== void 0 ? _t : 20;
        this.fallback_to_greedy =
            (_u = data.fallback_to_greedy) !== null && _u !== void 0 ? _u : true;
        this.created_by = data.created_by;
        this.deleted_at = (_v = data.deleted_at) !== null && _v !== void 0 ? _v : null;
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
