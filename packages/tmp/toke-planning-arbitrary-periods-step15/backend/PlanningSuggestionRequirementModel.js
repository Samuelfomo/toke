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
class PlanningSuggestionRequirementModel extends db_base_js_1.default {
    constructor() {
        super();
        this.db = {
            tableName: response_model_js_1.tableName.PLANNING_SUGGESTION_REQUIREMENT,
            id: 'id',
            guid: 'guid',
            config: 'config',
            session_template: 'session_template',
            continuation_template: 'continuation_template',
            continuation_day_offset: 'continuation_day_offset',
            day_of_week: 'day_of_week',
            service_type: 'service_type',
            allocation_mode: 'allocation_mode',
            min_employees: 'min_employees',
            target_employees: 'target_employees',
            max_employees: 'max_employees',
            credited_minutes: 'credited_minutes',
            priority: 'priority',
            active: 'active',
            eligibility_policy: 'eligibility_policy',
            deleted_at: 'deleted_at',
            created_at: 'created_at',
            updated_at: 'updated_at',
        };
        this.continuation_day_offset = 0;
        this.service_type = 'STANDARD';
        this.allocation_mode = 'RANGE';
        this.min_employees = 0;
        this.target_employees = 0;
        this.priority = 100;
        this.active = true;
        this.eligibility_policy = {
            planning_modes: ['FIXED', 'ROTATING'],
            guard_pool_relation: 'ANY',
        };
    }
    find(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, includeDeleted = false) {
            const conditions = {
                [this.db.id]: id,
            };
            if (!includeDeleted) {
                conditions[this.db.deleted_at] = null;
            }
            return yield this.findOne(this.db.tableName, conditions);
        });
    }
    findByGuid(guid_1) {
        return __awaiter(this, arguments, void 0, function* (guid, includeDeleted = false) {
            const conditions = {
                [this.db.guid]: guid,
            };
            if (!includeDeleted) {
                conditions[this.db.deleted_at] = null;
            }
            return yield this.findOne(this.db.tableName, conditions);
        });
    }
    findBySlot(configId, dayOfWeek, sessionTemplateId, eligibilityPolicy) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const candidates = (_a = (yield this.findAll(this.db.tableName, {
                [this.db.config]: configId,
                [this.db.day_of_week]: dayOfWeek,
                [this.db.session_template]: sessionTemplateId,
                [this.db.active]: true,
                [this.db.deleted_at]: null,
            }))) !== null && _a !== void 0 ? _a : [];
            return ((_b = candidates.find((candidate) => this.sameEligibilityPolicy(candidate === null || candidate === void 0 ? void 0 : candidate[this.db.eligibility_policy], eligibilityPolicy))) !== null && _b !== void 0 ? _b : null);
        });
    }
    findFillRemainingByDay(configId, dayOfWeek, eligibilityPolicy) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const candidates = (_a = (yield this.findAll(this.db.tableName, {
                [this.db.config]: configId,
                [this.db.day_of_week]: dayOfWeek,
                [this.db.allocation_mode]: 'FILL_REMAINING',
                [this.db.active]: true,
                [this.db.deleted_at]: null,
            }))) !== null && _a !== void 0 ? _a : [];
            return ((_b = candidates.find((candidate) => this.sameEligibilityPolicy(candidate === null || candidate === void 0 ? void 0 : candidate[this.db.eligibility_policy], eligibilityPolicy))) !== null && _b !== void 0 ? _b : null);
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
    listAllByConfig(configId_1) {
        return __awaiter(this, arguments, void 0, function* (configId, activeOnly = false) {
            const conditions = {
                [this.db.config]: configId,
            };
            if (activeOnly) {
                conditions[this.db.active] = true;
            }
            return yield this.listAll(conditions);
        });
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            this.eligibility_policy = this.normalizeEligibilityPolicy(this.eligibility_policy);
            this.validate();
            const duplicate = yield this.findBySlot(this.config, this.day_of_week, this.session_template, this.eligibility_policy);
            if (duplicate) {
                throw new Error('An active requirement already exists for this configuration slot and employee population');
            }
            if (this.allocation_mode ===
                'FILL_REMAINING') {
                const existingFill = yield this.findFillRemainingByDay(this.config, this.day_of_week, this.eligibility_policy);
                if (existingFill) {
                    throw new Error('An active FILL_REMAINING requirement already exists for this day and employee population');
                }
            }
            const guid = yield this.randomGuidGenerator(this.db.tableName);
            if (!guid) {
                throw new Error('GUID generation failed for PlanningSuggestionRequirement');
            }
            const lastID = yield this.insertOne(this.db.tableName, {
                [this.db.guid]: guid,
                [this.db.config]: this.config,
                [this.db.session_template]: this.session_template,
                [this.db.continuation_template]: (_a = this.continuation_template) !== null && _a !== void 0 ? _a : null,
                [this.db.continuation_day_offset]: this.continuation_day_offset,
                [this.db.day_of_week]: this.day_of_week,
                [this.db.service_type]: this.service_type,
                [this.db.allocation_mode]: this.allocation_mode,
                [this.db.min_employees]: this.min_employees,
                [this.db.target_employees]: this.target_employees,
                [this.db.max_employees]: (_b = this.max_employees) !== null && _b !== void 0 ? _b : null,
                [this.db.credited_minutes]: (_c = this.credited_minutes) !== null && _c !== void 0 ? _c : null,
                [this.db.priority]: this.priority,
                [this.db.active]: this.active,
                [this.db.eligibility_policy]: this.eligibility_policy,
            });
            if (!lastID) {
                throw new Error('PlanningSuggestionRequirement creation failed');
            }
            this.id =
                typeof lastID === 'object' ? lastID.id : lastID;
            this.guid = guid;
        });
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!this.id) {
                throw new Error('ID required to update PlanningSuggestionRequirement');
            }
            this.eligibility_policy = this.normalizeEligibilityPolicy(this.eligibility_policy);
            this.validate();
            const duplicate = yield this.findBySlot(this.config, this.day_of_week, this.session_template, this.eligibility_policy);
            if (duplicate && duplicate.id !== this.id) {
                throw new Error('An active requirement already exists for this configuration slot and employee population');
            }
            if (this.allocation_mode ===
                'FILL_REMAINING') {
                const existingFill = yield this.findFillRemainingByDay(this.config, this.day_of_week, this.eligibility_policy);
                if (existingFill &&
                    existingFill.id !== this.id) {
                    throw new Error('An active FILL_REMAINING requirement already exists for this day and employee population');
                }
            }
            const updated = yield this.updateOne(this.db.tableName, {
                [this.db.config]: this.config,
                [this.db.session_template]: this.session_template,
                [this.db.continuation_template]: (_a = this.continuation_template) !== null && _a !== void 0 ? _a : null,
                [this.db.continuation_day_offset]: this.continuation_day_offset,
                [this.db.day_of_week]: this.day_of_week,
                [this.db.service_type]: this.service_type,
                [this.db.allocation_mode]: this.allocation_mode,
                [this.db.min_employees]: this.min_employees,
                [this.db.target_employees]: this.target_employees,
                [this.db.max_employees]: (_b = this.max_employees) !== null && _b !== void 0 ? _b : null,
                [this.db.credited_minutes]: (_c = this.credited_minutes) !== null && _c !== void 0 ? _c : null,
                [this.db.priority]: this.priority,
                [this.db.active]: this.active,
                [this.db.eligibility_policy]: this.eligibility_policy,
            }, {
                [this.db.id]: this.id,
            });
            if (!updated) {
                throw new Error('PlanningSuggestionRequirement update failed');
            }
        });
    }
    trash(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const affected = yield this.updateOne(this.db.tableName, {
                [this.db.active]: false,
                [this.db.deleted_at]: shared_1.TimezoneConfigUtils.getCurrentTime(),
            }, {
                [this.db.id]: id,
            });
            return affected > 0;
        });
    }
    normalizeEligibilityPolicy(value) {
        let parsed = value;
        if (typeof value === 'string') {
            try {
                parsed = JSON.parse(value);
            }
            catch (_a) {
                parsed = null;
            }
        }
        const requestedModes = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.planning_modes)
            ? parsed.planning_modes
            : ['FIXED', 'ROTATING'];
        const planningModes = ['FIXED', 'ROTATING'].filter((mode) => requestedModes.includes(mode));
        return {
            planning_modes: planningModes.length > 0
                ? [...planningModes]
                : ['FIXED', 'ROTATING'],
            guard_pool_relation: ['ANY', 'MEMBER', 'NON_MEMBER'].includes(parsed === null || parsed === void 0 ? void 0 : parsed.guard_pool_relation)
                ? parsed.guard_pool_relation
                : 'ANY',
        };
    }
    sameEligibilityPolicy(left, right) {
        const normalizedLeft = this.normalizeEligibilityPolicy(left);
        const normalizedRight = this.normalizeEligibilityPolicy(right);
        return (normalizedLeft.guard_pool_relation ===
            normalizedRight.guard_pool_relation &&
            normalizedLeft.planning_modes.length ===
                normalizedRight.planning_modes.length &&
            normalizedLeft.planning_modes.every((mode, index) => mode === normalizedRight.planning_modes[index]));
    }
    validate() {
        if (!this.config) {
            throw new Error('config is required');
        }
        if (!this.session_template) {
            throw new Error('session_template is required');
        }
        if (!this.day_of_week) {
            throw new Error('day_of_week is required');
        }
        if (this.min_employees < 0) {
            throw new Error('min_employees cannot be negative');
        }
        if (this.target_employees < this.min_employees) {
            throw new Error('target_employees must be greater than or equal to min_employees');
        }
        if (this.max_employees !== null &&
            this.max_employees !== undefined &&
            this.max_employees < this.target_employees) {
            throw new Error('max_employees must be greater than or equal to target_employees');
        }
        if (this.credited_minutes !== null &&
            this.credited_minutes !== undefined &&
            (this.credited_minutes < 1 || this.credited_minutes > 10080)) {
            throw new Error('credited_minutes must be between 1 and 10080');
        }
        if (this.priority < 1) {
            throw new Error('priority must be greater than 0');
        }
        if (this.allocation_mode === 'EXACT') {
            if (this.max_employees === null ||
                this.max_employees === undefined) {
                throw new Error('max_employees is required for an EXACT requirement');
            }
            if (!(this.min_employees ===
                this.target_employees &&
                this.target_employees ===
                    this.max_employees)) {
                throw new Error('EXACT requires min_employees, target_employees and max_employees to be equal');
            }
        }
        if (this.allocation_mode ===
            'FILL_REMAINING' &&
            this.service_type !== 'STANDARD') {
            throw new Error('FILL_REMAINING is only allowed for a STANDARD requirement');
        }
        if (!this.eligibility_policy.planning_modes.length) {
            throw new Error('eligibility_policy.planning_modes cannot be empty');
        }
        if (!['ANY', 'MEMBER', 'NON_MEMBER'].includes(this.eligibility_policy.guard_pool_relation)) {
            throw new Error('eligibility_policy.guard_pool_relation is invalid');
        }
        if (this.service_type === 'GUARD') {
            if (!this.continuation_template) {
                throw new Error('continuation_template is required for a GUARD requirement');
            }
            if (this.continuation_day_offset !== 1) {
                throw new Error('continuation_day_offset must be 1 for a GUARD requirement');
            }
            return;
        }
        if (this.continuation_template !== null &&
            this.continuation_template !== undefined) {
            throw new Error('continuation_template is only allowed for a GUARD requirement');
        }
        if (this.continuation_day_offset !== 0) {
            throw new Error('continuation_day_offset must be 0 for a STANDARD requirement');
        }
    }
}
exports.default = PlanningSuggestionRequirementModel;
