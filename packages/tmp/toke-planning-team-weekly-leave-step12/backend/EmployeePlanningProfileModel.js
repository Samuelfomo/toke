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
class EmployeePlanningProfileModel extends db_base_js_1.default {
    constructor() {
        super();
        this.db = {
            tableName: response_model_js_1.tableName.EMPLOYEE_PLANNING_PROFILE,
            id: 'id',
            guid: 'guid',
            user: 'user',
            planning_mode: 'planning_mode',
            fixed_session_template: 'fixed_session_template',
            fixed_rest_day_mode: 'fixed_rest_day_mode',
            rotation_order: 'rotation_order',
            max_weekly_minutes: 'max_weekly_minutes',
            active: 'active',
            deleted_at: 'deleted_at',
            created_at: 'created_at',
            updated_at: 'updated_at',
        };
        this.planning_mode = 'ROTATING';
        this.fixed_rest_day_mode = 'TEMPLATE';
        this.active = true;
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
    findByUser(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, activeOnly = true) {
            const conditions = {
                [this.db.user]: userId,
                [this.db.deleted_at]: null,
            };
            if (activeOnly)
                conditions[this.db.active] = true;
            return yield this.findOne(this.db.tableName, conditions);
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
    listAllActive() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.listAll({ [this.db.active]: true });
        });
    }
    listAllByMode(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.listAll({
                [this.db.planning_mode]: mode,
                [this.db.active]: true,
            });
        });
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            this.validate();
            const existing = yield this.findByUser(this.user, true);
            if (existing) {
                throw new Error('An active planning profile already exists for this employee');
            }
            const guid = yield this.randomGuidGenerator(this.db.tableName);
            if (!guid) {
                throw new Error('GUID generation failed for EmployeePlanningProfile');
            }
            const lastID = yield this.insertOne(this.db.tableName, {
                [this.db.guid]: guid,
                [this.db.user]: this.user,
                [this.db.planning_mode]: this.planning_mode,
                [this.db.fixed_session_template]: (_a = this.fixed_session_template) !== null && _a !== void 0 ? _a : null,
                [this.db.fixed_rest_day_mode]: this.fixed_rest_day_mode,
                [this.db.rotation_order]: (_b = this.rotation_order) !== null && _b !== void 0 ? _b : null,
                [this.db.max_weekly_minutes]: (_c = this.max_weekly_minutes) !== null && _c !== void 0 ? _c : null,
                [this.db.active]: this.active,
            });
            if (!lastID)
                throw new Error('EmployeePlanningProfile creation failed');
            this.id = typeof lastID === 'object' ? lastID.id : lastID;
            this.guid = guid;
        });
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!this.id)
                throw new Error('ID required to update EmployeePlanningProfile');
            this.validate();
            const existing = yield this.findByUser(this.user, true);
            if (existing && existing.id !== this.id) {
                throw new Error('An active planning profile already exists for this employee');
            }
            const updated = yield this.updateOne(this.db.tableName, {
                [this.db.user]: this.user,
                [this.db.planning_mode]: this.planning_mode,
                [this.db.fixed_session_template]: (_a = this.fixed_session_template) !== null && _a !== void 0 ? _a : null,
                [this.db.fixed_rest_day_mode]: this.fixed_rest_day_mode,
                [this.db.rotation_order]: (_b = this.rotation_order) !== null && _b !== void 0 ? _b : null,
                [this.db.max_weekly_minutes]: (_c = this.max_weekly_minutes) !== null && _c !== void 0 ? _c : null,
                [this.db.active]: this.active,
            }, { [this.db.id]: this.id });
            if (!updated)
                throw new Error('EmployeePlanningProfile update failed');
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
        if (!this.user)
            throw new Error('user is required');
        if (this.planning_mode === 'FIXED' && !this.fixed_session_template) {
            throw new Error('fixed_session_template is required for a FIXED employee');
        }
        if (this.planning_mode !== 'FIXED' && this.fixed_session_template) {
            throw new Error('fixed_session_template is only allowed for a FIXED employee');
        }
        if (this.planning_mode !== 'FIXED' &&
            this.fixed_rest_day_mode !== 'TEMPLATE') {
            throw new Error('fixed_rest_day_mode ROTATING is only allowed for a FIXED employee');
        }
        if (this.max_weekly_minutes !== null &&
            this.max_weekly_minutes !== undefined &&
            (this.max_weekly_minutes < 1 || this.max_weekly_minutes > 10080)) {
            throw new Error('max_weekly_minutes must be between 1 and 10080');
        }
        if (this.rotation_order !== null &&
            this.rotation_order !== undefined &&
            this.rotation_order < 1) {
            throw new Error('rotation_order must be a positive integer');
        }
    }
}
exports.default = EmployeePlanningProfileModel;
