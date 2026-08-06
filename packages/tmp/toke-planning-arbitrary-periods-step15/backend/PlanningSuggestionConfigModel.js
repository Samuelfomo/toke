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
const shared_1 = require("@toke/shared");
const db_base_js_1 = __importDefault(require("../database/db.base.js"));
const response_model_js_1 = require("../../utils/response.model.js");
class PlanningSuggestionConfigModel extends db_base_js_1.default {
    constructor() {
        super();
        this.db = {
            tableName: response_model_js_1.tableName.PLANNING_SUGGESTION_CONFIG,
            id: 'id',
            guid: 'guid',
            name: 'name',
            version: 'version',
            active: 'active',
            min_rest_days_per_week: 'min_rest_days_per_week',
            max_consecutive_work_days: 'max_consecutive_work_days',
            max_weekly_minutes: 'max_weekly_minutes',
            min_rest_minutes_between_shifts: 'min_rest_minutes_between_shifts',
            max_consecutive_guards: 'max_consecutive_guards',
            rest_after_guard_required: 'rest_after_guard_required',
            post_guard_rest_days: 'post_guard_rest_days',
            max_resting_employees_per_day: 'max_resting_employees_per_day',
            weekly_leave_mode: 'weekly_leave_mode',
            weekly_leave_employees_per_week: 'weekly_leave_employees_per_week',
            weekly_leave_allowed_days: 'weekly_leave_allowed_days',
            weekly_leave_rotation_anchor_date: 'weekly_leave_rotation_anchor_date',
            weekly_leave_complete_weeks_only: 'weekly_leave_complete_weeks_only',
            post_guard_rest_counts_as_weekly_leave: 'post_guard_rest_counts_as_weekly_leave',
            policy_schema_version: 'policy_schema_version',
            weekly_leave_selector: 'weekly_leave_selector',
            weekly_leave_days_per_employee: 'weekly_leave_days_per_employee',
            weekly_leave_count_mode: 'weekly_leave_count_mode',
            weekly_leave_max_employees_per_day: 'weekly_leave_max_employees_per_day',
            weekly_leave_require_work_on_other_days: 'weekly_leave_require_work_on_other_days',
            weekly_leave_service_scope: 'weekly_leave_service_scope',
            guard_team_mode: 'guard_team_mode',
            guard_team_employees_per_week: 'guard_team_employees_per_week',
            guard_team_selection_mode: 'guard_team_selection_mode',
            guard_team_rotation_anchor_date: 'guard_team_rotation_anchor_date',
            guard_team_complete_weeks_only: 'guard_team_complete_weeks_only',
            guard_team_require_participation: 'guard_team_require_participation',
            guard_team_eligible_planning_modes: 'guard_team_eligible_planning_modes',
            guard_team_member_service_access: 'guard_team_member_service_access',
            guard_team_balance_mode: 'guard_team_balance_mode',
            guard_team_max_membership_spread: 'guard_team_max_membership_spread',
            guard_team_max_consecutive_membership_weeks: 'guard_team_max_consecutive_membership_weeks',
            fairness_window_weeks: 'fairness_window_weeks',
            strict_coverage: 'strict_coverage',
            solver_type: 'solver_type',
            solver_timeout_seconds: 'solver_timeout_seconds',
            fallback_to_greedy: 'fallback_to_greedy',
            created_by: 'created_by',
            deleted_at: 'deleted_at',
            created_at: 'created_at',
            updated_at: 'updated_at',
        };
        this.version = 1;
        this.active = false;
        this.min_rest_days_per_week = 1;
        this.max_consecutive_work_days = 6;
        this.min_rest_minutes_between_shifts = 660;
        this.max_consecutive_guards = 1;
        this.rest_after_guard_required = true;
        this.post_guard_rest_days = 0;
        this.weekly_leave_mode = 'PER_EMPLOYEE';
        this.weekly_leave_employees_per_week = 1;
        this.weekly_leave_allowed_days = [
            'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
        ];
        this.weekly_leave_complete_weeks_only = true;
        this.post_guard_rest_counts_as_weekly_leave = false;
        this.policy_schema_version = 2;
        this.weekly_leave_selector = {
            planning_modes: ['ROTATING'],
            guard_pool_relation: 'ANY',
        };
        this.weekly_leave_days_per_employee = 1;
        this.weekly_leave_count_mode = 'EXACT';
        this.weekly_leave_require_work_on_other_days = false;
        this.weekly_leave_service_scope = {
            mode: 'ANY', service_types: [], template_guids: [], requirement_guids: [], exclusive: false,
        };
        this.guard_team_mode = 'DAILY_FLEXIBLE';
        this.guard_team_employees_per_week = 1;
        this.guard_team_selection_mode = 'ROTATION_ORDER';
        this.guard_team_complete_weeks_only = true;
        this.guard_team_require_participation = true;
        this.guard_team_eligible_planning_modes = ['ROTATING'];
        this.guard_team_member_service_access = 'ANY_SERVICE';
        this.guard_team_balance_mode = 'NONE';
        this.fairness_window_weeks = 8;
        this.strict_coverage = true;
        this.solver_type = 'GREEDY';
        this.solver_timeout_seconds = 20;
        this.fallback_to_greedy = true;
    }
    find(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, includeDeleted = false) {
            const conditions = { [this.db.id]: id };
            if (!includeDeleted)
                conditions[this.db.deleted_at] = null;
            return yield this.findOne(this.db.tableName, conditions);
        });
    }
    findByGuid(guid_1) {
        return __awaiter(this, arguments, void 0, function* (guid, includeDeleted = false) {
            const conditions = { [this.db.guid]: guid };
            if (!includeDeleted)
                conditions[this.db.deleted_at] = null;
            return yield this.findOne(this.db.tableName, conditions);
        });
    }
    findActive() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findOne(this.db.tableName, {
                [this.db.active]: true,
                [this.db.deleted_at]: null,
            });
        });
    }
    listAll() {
        return __awaiter(this, arguments, void 0, function* (conditions = {}, paginationOptions = {}) {
            if (conditions[this.db.deleted_at] === undefined) {
                conditions[this.db.deleted_at] = null;
            }
            return yield this.findAll(this.db.tableName, conditions, paginationOptions);
        });
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            this.validate();
            if (this.active) {
                const currentActive = yield this.findActive();
                if (currentActive) {
                    throw new Error('An active planning suggestion configuration already exists');
                }
            }
            const guid = yield this.randomGuidGenerator(this.db.tableName);
            if (!guid) {
                throw new Error('GUID generation failed for PlanningSuggestionConfig');
            }
            const lastID = yield this.insertOne(this.db.tableName, {
                [this.db.guid]: guid,
                [this.db.name]: this.name,
                [this.db.version]: this.version,
                [this.db.active]: this.active,
                [this.db.min_rest_days_per_week]: this.min_rest_days_per_week,
                [this.db.max_consecutive_work_days]: this.max_consecutive_work_days,
                [this.db.max_weekly_minutes]: (_a = this.max_weekly_minutes) !== null && _a !== void 0 ? _a : null,
                [this.db.min_rest_minutes_between_shifts]: this.min_rest_minutes_between_shifts,
                [this.db.max_consecutive_guards]: this.max_consecutive_guards,
                [this.db.rest_after_guard_required]: this.rest_after_guard_required,
                [this.db.post_guard_rest_days]: this.post_guard_rest_days,
                [this.db.max_resting_employees_per_day]: (_b = this.max_resting_employees_per_day) !== null && _b !== void 0 ? _b : null,
                [this.db.weekly_leave_mode]: this.weekly_leave_mode,
                [this.db.weekly_leave_employees_per_week]: this.weekly_leave_employees_per_week,
                [this.db.weekly_leave_allowed_days]: this.weekly_leave_allowed_days,
                [this.db.weekly_leave_rotation_anchor_date]: (_c = this.weekly_leave_rotation_anchor_date) !== null && _c !== void 0 ? _c : null,
                [this.db.weekly_leave_complete_weeks_only]: this.weekly_leave_complete_weeks_only,
                [this.db.post_guard_rest_counts_as_weekly_leave]: this.post_guard_rest_counts_as_weekly_leave,
                [this.db.policy_schema_version]: this.policy_schema_version,
                [this.db.weekly_leave_selector]: this.weekly_leave_selector,
                [this.db.weekly_leave_days_per_employee]: this.weekly_leave_days_per_employee,
                [this.db.weekly_leave_count_mode]: this.weekly_leave_count_mode,
                [this.db.weekly_leave_max_employees_per_day]: (_d = this.weekly_leave_max_employees_per_day) !== null && _d !== void 0 ? _d : null,
                [this.db.weekly_leave_require_work_on_other_days]: this.weekly_leave_require_work_on_other_days,
                [this.db.weekly_leave_service_scope]: this.weekly_leave_service_scope,
                [this.db.guard_team_mode]: this.guard_team_mode,
                [this.db.guard_team_employees_per_week]: this.guard_team_employees_per_week,
                [this.db.guard_team_selection_mode]: this.guard_team_selection_mode,
                [this.db.guard_team_rotation_anchor_date]: (_e = this.guard_team_rotation_anchor_date) !== null && _e !== void 0 ? _e : null,
                [this.db.guard_team_complete_weeks_only]: this.guard_team_complete_weeks_only,
                [this.db.guard_team_require_participation]: this.guard_team_require_participation,
                [this.db.guard_team_eligible_planning_modes]: this.guard_team_eligible_planning_modes,
                [this.db.guard_team_member_service_access]: this.guard_team_member_service_access,
                [this.db.guard_team_balance_mode]: this.guard_team_balance_mode,
                [this.db.guard_team_max_membership_spread]: (_f = this.guard_team_max_membership_spread) !== null && _f !== void 0 ? _f : null,
                [this.db.guard_team_max_consecutive_membership_weeks]: (_g = this.guard_team_max_consecutive_membership_weeks) !== null && _g !== void 0 ? _g : null,
                [this.db.fairness_window_weeks]: this.fairness_window_weeks,
                [this.db.strict_coverage]: this.strict_coverage,
                [this.db.solver_type]: this.solver_type,
                [this.db.solver_timeout_seconds]: this.solver_timeout_seconds,
                [this.db.fallback_to_greedy]: this.fallback_to_greedy,
                [this.db.created_by]: this.created_by,
            });
            if (!lastID)
                throw new Error('PlanningSuggestionConfig creation failed');
            this.id = typeof lastID === 'object' ? lastID.id : lastID;
            this.guid = guid;
        });
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (!this.id)
                throw new Error('ID required to update PlanningSuggestionConfig');
            this.validate();
            if (this.active) {
                const currentActive = yield this.findActive();
                if (currentActive && currentActive.id !== this.id) {
                    throw new Error('An active planning suggestion configuration already exists');
                }
            }
            const current = yield this.find(this.id);
            if (!current)
                throw new Error('PlanningSuggestionConfig not found');
            this.version = ((_a = current.version) !== null && _a !== void 0 ? _a : 1) + 1;
            const updated = yield this.updateOne(this.db.tableName, {
                [this.db.name]: this.name,
                [this.db.version]: this.version,
                [this.db.active]: this.active,
                [this.db.min_rest_days_per_week]: this.min_rest_days_per_week,
                [this.db.max_consecutive_work_days]: this.max_consecutive_work_days,
                [this.db.max_weekly_minutes]: (_b = this.max_weekly_minutes) !== null && _b !== void 0 ? _b : null,
                [this.db.min_rest_minutes_between_shifts]: this.min_rest_minutes_between_shifts,
                [this.db.max_consecutive_guards]: this.max_consecutive_guards,
                [this.db.rest_after_guard_required]: this.rest_after_guard_required,
                [this.db.post_guard_rest_days]: this.post_guard_rest_days,
                [this.db.max_resting_employees_per_day]: (_c = this.max_resting_employees_per_day) !== null && _c !== void 0 ? _c : null,
                [this.db.weekly_leave_mode]: this.weekly_leave_mode,
                [this.db.weekly_leave_employees_per_week]: this.weekly_leave_employees_per_week,
                [this.db.weekly_leave_allowed_days]: this.weekly_leave_allowed_days,
                [this.db.weekly_leave_rotation_anchor_date]: (_d = this.weekly_leave_rotation_anchor_date) !== null && _d !== void 0 ? _d : null,
                [this.db.weekly_leave_complete_weeks_only]: this.weekly_leave_complete_weeks_only,
                [this.db.post_guard_rest_counts_as_weekly_leave]: this.post_guard_rest_counts_as_weekly_leave,
                [this.db.policy_schema_version]: this.policy_schema_version,
                [this.db.weekly_leave_selector]: this.weekly_leave_selector,
                [this.db.weekly_leave_days_per_employee]: this.weekly_leave_days_per_employee,
                [this.db.weekly_leave_count_mode]: this.weekly_leave_count_mode,
                [this.db.weekly_leave_max_employees_per_day]: (_e = this.weekly_leave_max_employees_per_day) !== null && _e !== void 0 ? _e : null,
                [this.db.weekly_leave_require_work_on_other_days]: this.weekly_leave_require_work_on_other_days,
                [this.db.weekly_leave_service_scope]: this.weekly_leave_service_scope,
                [this.db.guard_team_mode]: this.guard_team_mode,
                [this.db.guard_team_employees_per_week]: this.guard_team_employees_per_week,
                [this.db.guard_team_selection_mode]: this.guard_team_selection_mode,
                [this.db.guard_team_rotation_anchor_date]: (_f = this.guard_team_rotation_anchor_date) !== null && _f !== void 0 ? _f : null,
                [this.db.guard_team_complete_weeks_only]: this.guard_team_complete_weeks_only,
                [this.db.guard_team_require_participation]: this.guard_team_require_participation,
                [this.db.guard_team_eligible_planning_modes]: this.guard_team_eligible_planning_modes,
                [this.db.guard_team_member_service_access]: this.guard_team_member_service_access,
                [this.db.guard_team_balance_mode]: this.guard_team_balance_mode,
                [this.db.guard_team_max_membership_spread]: (_g = this.guard_team_max_membership_spread) !== null && _g !== void 0 ? _g : null,
                [this.db.guard_team_max_consecutive_membership_weeks]: (_h = this.guard_team_max_consecutive_membership_weeks) !== null && _h !== void 0 ? _h : null,
                [this.db.fairness_window_weeks]: this.fairness_window_weeks,
                [this.db.strict_coverage]: this.strict_coverage,
                [this.db.solver_type]: this.solver_type,
                [this.db.solver_timeout_seconds]: this.solver_timeout_seconds,
                [this.db.fallback_to_greedy]: this.fallback_to_greedy,
            }, { [this.db.id]: this.id });
            if (!updated)
                throw new Error('PlanningSuggestionConfig update failed');
        });
    }
    updateActive(active) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.id)
                throw new Error('ID required to change configuration status');
            if (active) {
                const currentActive = yield this.findActive();
                if (currentActive && currentActive.id !== this.id) {
                    throw new Error('An active planning suggestion configuration already exists');
                }
            }
            const updated = yield this.updateOne(this.db.tableName, { [this.db.active]: active }, { [this.db.id]: this.id });
            if (!updated)
                throw new Error('PlanningSuggestionConfig status update failed');
            this.active = active;
        });
    }
    trash(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const affected = yield this.updateOne(this.db.tableName, {
                [this.db.active]: false,
                [this.db.deleted_at]: shared_1.TimezoneConfigUtils.getCurrentTime(),
            }, { [this.db.id]: id });
            return affected > 0;
        });
    }
    validate() {
        var _a;
        if (!((_a = this.name) === null || _a === void 0 ? void 0 : _a.trim()))
            throw new Error('Configuration name is required');
        if (!this.created_by)
            throw new Error('created_by is required');
        if (this.min_rest_days_per_week < 0 || this.min_rest_days_per_week > 7) {
            throw new Error('min_rest_days_per_week must be between 0 and 7');
        }
        if (this.max_consecutive_work_days !== null &&
            this.max_consecutive_work_days !== undefined &&
            (this.max_consecutive_work_days < 1 ||
                this.max_consecutive_work_days > 366)) {
            throw new Error('max_consecutive_work_days must be null or between 1 and 366');
        }
        if (this.max_weekly_minutes !== null && this.max_weekly_minutes !== undefined) {
            if (this.max_weekly_minutes < 1 || this.max_weekly_minutes > 10080) {
                throw new Error('max_weekly_minutes must be between 1 and 10080');
            }
        }
        if (this.min_rest_minutes_between_shifts < 0) {
            throw new Error('min_rest_minutes_between_shifts cannot be negative');
        }
        if (this.max_consecutive_guards < 0) {
            throw new Error('max_consecutive_guards cannot be negative');
        }
        if (this.post_guard_rest_days < 0 ||
            this.post_guard_rest_days > 31) {
            throw new Error('post_guard_rest_days must be between 0 and 31');
        }
        if (this.max_resting_employees_per_day !== null &&
            this.max_resting_employees_per_day !== undefined &&
            this.max_resting_employees_per_day < 1) {
            throw new Error('max_resting_employees_per_day must be greater than 0');
        }
        if (!['NONE', 'PER_EMPLOYEE', 'TEAM_ROTATION', 'PER_ELIGIBLE_EMPLOYEE'].includes(this.weekly_leave_mode)) {
            throw new Error('weekly_leave_mode is invalid');
        }
        if (this.weekly_leave_employees_per_week < 1) {
            throw new Error('weekly_leave_employees_per_week must be greater than 0');
        }
        const allowedDays = new Set([
            'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
        ]);
        if (!Array.isArray(this.weekly_leave_allowed_days) ||
            this.weekly_leave_allowed_days.length === 0 ||
            this.weekly_leave_allowed_days.some((day) => !allowedDays.has(day)) ||
            new Set(this.weekly_leave_allowed_days).size !==
                this.weekly_leave_allowed_days.length) {
            throw new Error('weekly_leave_allowed_days is invalid');
        }
        if (this.weekly_leave_mode === 'TEAM_ROTATION' &&
            !this.weekly_leave_rotation_anchor_date) {
            throw new Error('TEAM_ROTATION requires weekly_leave_rotation_anchor_date');
        }
        if (this.weekly_leave_mode === 'TEAM_ROTATION' &&
            (this.solver_type !== 'ORTOOLS' || this.fallback_to_greedy)) {
            throw new Error('TEAM_ROTATION requires ORTOOLS with fallback_to_greedy=false');
        }
        if (this.weekly_leave_days_per_employee < 1 || this.weekly_leave_days_per_employee > 7) {
            throw new Error('weekly_leave_days_per_employee must be between 1 and 7');
        }
        if (!['MINIMUM', 'EXACT'].includes(this.weekly_leave_count_mode)) {
            throw new Error('weekly_leave_count_mode is invalid');
        }
        if (!this.weekly_leave_selector ||
            !Array.isArray(this.weekly_leave_selector.planning_modes) ||
            this.weekly_leave_selector.planning_modes.length === 0) {
            throw new Error('weekly_leave_selector.planning_modes cannot be empty');
        }
        if (new Set(this.weekly_leave_selector.planning_modes).size !==
            this.weekly_leave_selector.planning_modes.length) {
            throw new Error('weekly_leave_selector.planning_modes cannot contain duplicates');
        }
        if (!['ANY', 'MEMBER', 'NON_MEMBER'].includes(this.weekly_leave_selector.guard_pool_relation)) {
            throw new Error('weekly_leave_selector.guard_pool_relation is invalid');
        }
        if (this.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE' &&
            this.weekly_leave_count_mode === 'EXACT' &&
            this.weekly_leave_days_per_employee > this.weekly_leave_allowed_days.length) {
            throw new Error('weekly_leave_days_per_employee cannot exceed allowed days in EXACT mode');
        }
        if (this.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE' &&
            this.weekly_leave_selector.guard_pool_relation !== 'ANY' &&
            this.guard_team_mode !== 'WEEKLY_POOL') {
            throw new Error('A weekly leave guard-pool relation requires WEEKLY_POOL');
        }
        if (this.weekly_leave_max_employees_per_day !== null &&
            this.weekly_leave_max_employees_per_day !== undefined &&
            this.weekly_leave_max_employees_per_day < 1) {
            throw new Error('weekly_leave_max_employees_per_day must be null or greater than 0');
        }
        if (!this.weekly_leave_service_scope) {
            throw new Error('weekly_leave_service_scope is required');
        }
        if (!['ANY', 'SERVICE_TYPE', 'TEMPLATE', 'REQUIREMENT'].includes(this.weekly_leave_service_scope.mode)) {
            throw new Error('weekly_leave_service_scope.mode is invalid');
        }
        if (this.weekly_leave_service_scope.mode === 'SERVICE_TYPE' &&
            this.weekly_leave_service_scope.service_types.length === 0) {
            throw new Error('SERVICE_TYPE scope requires at least one service type');
        }
        if (this.weekly_leave_service_scope.mode === 'TEMPLATE' &&
            this.weekly_leave_service_scope.template_guids.length === 0) {
            throw new Error('TEMPLATE scope requires at least one template');
        }
        if (this.weekly_leave_service_scope.mode === 'REQUIREMENT' &&
            this.weekly_leave_service_scope.requirement_guids.length === 0) {
            throw new Error('REQUIREMENT scope requires at least one requirement');
        }
        if (this.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE' &&
            (this.solver_type !== 'ORTOOLS' || this.fallback_to_greedy)) {
            throw new Error('PER_ELIGIBLE_EMPLOYEE requires ORTOOLS with fallback_to_greedy=false');
        }
        if (!['DAILY_FLEXIBLE', 'WEEKLY_POOL'].includes(this.guard_team_mode)) {
            throw new Error('guard_team_mode must be DAILY_FLEXIBLE or WEEKLY_POOL');
        }
        if (this.guard_team_employees_per_week < 1) {
            throw new Error('guard_team_employees_per_week must be greater than 0');
        }
        if (!['ROTATION_ORDER', 'OPTIMIZED'].includes(this.guard_team_selection_mode)) {
            throw new Error('guard_team_selection_mode must be ROTATION_ORDER or OPTIMIZED');
        }
        if (this.guard_team_mode === 'WEEKLY_POOL' &&
            this.guard_team_selection_mode === 'ROTATION_ORDER' &&
            !this.guard_team_rotation_anchor_date) {
            throw new Error('WEEKLY_POOL with ROTATION_ORDER requires guard_team_rotation_anchor_date');
        }
        if (this.guard_team_mode === 'WEEKLY_POOL' &&
            (this.solver_type !== 'ORTOOLS' || this.fallback_to_greedy)) {
            throw new Error('WEEKLY_POOL requires ORTOOLS with fallback_to_greedy=false');
        }
        if (!Array.isArray(this.guard_team_eligible_planning_modes) ||
            this.guard_team_eligible_planning_modes.length === 0) {
            throw new Error('guard_team_eligible_planning_modes cannot be empty');
        }
        if (new Set(this.guard_team_eligible_planning_modes).size !==
            this.guard_team_eligible_planning_modes.length) {
            throw new Error('guard_team_eligible_planning_modes cannot contain duplicates');
        }
        if (this.guard_team_mode === 'WEEKLY_POOL' &&
            !this.guard_team_eligible_planning_modes.includes('ROTATING')) {
            throw new Error('The current solver requires ROTATING for WEEKLY_POOL');
        }
        if (!['ANY_SERVICE', 'GUARD_ONLY'].includes(this.guard_team_member_service_access)) {
            throw new Error('guard_team_member_service_access is invalid');
        }
        if (!['NONE', 'SOFT', 'STRICT'].includes(this.guard_team_balance_mode)) {
            throw new Error('guard_team_balance_mode is invalid');
        }
        if (this.guard_team_balance_mode === 'STRICT' &&
            (this.guard_team_max_membership_spread === null ||
                this.guard_team_max_membership_spread === undefined)) {
            throw new Error('STRICT guard pool balance requires max membership spread');
        }
        if (this.guard_team_max_membership_spread !== null &&
            this.guard_team_max_membership_spread !== undefined &&
            (this.guard_team_max_membership_spread < 0 ||
                this.guard_team_max_membership_spread > 52)) {
            throw new Error('guard team membership spread must be between 0 and 52');
        }
        if (this.guard_team_max_consecutive_membership_weeks !== null &&
            this.guard_team_max_consecutive_membership_weeks !== undefined &&
            (this.guard_team_max_consecutive_membership_weeks < 1 ||
                this.guard_team_max_consecutive_membership_weeks > 52)) {
            throw new Error('guard team consecutive membership weeks must be between 1 and 52');
        }
        if (this.fairness_window_weeks < 1 || this.fairness_window_weeks > 52) {
            throw new Error('fairness_window_weeks must be between 1 and 52');
        }
        if (!['GREEDY', 'ORTOOLS'].includes(this.solver_type)) {
            throw new Error('solver_type must be GREEDY or ORTOOLS');
        }
        if (this.solver_timeout_seconds < 1 ||
            this.solver_timeout_seconds > 300) {
            throw new Error('solver_timeout_seconds must be between 1 and 300');
        }
    }
}
exports.default = PlanningSuggestionConfigModel;
