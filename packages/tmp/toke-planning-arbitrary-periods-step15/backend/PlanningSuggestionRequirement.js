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
const PlanningSuggestionRequirementModel_js_1 = __importDefault(require("../model/PlanningSuggestionRequirementModel.js"));
const PlanningSuggestionConfig_js_1 = __importDefault(require("./PlanningSuggestionConfig.js"));
const SessionTemplates_js_1 = __importDefault(require("./SessionTemplates.js"));
class PlanningSuggestionRequirement extends PlanningSuggestionRequirementModel_js_1.default {
    constructor() {
        super();
    }
    static _load(identifier, byGuid = false) {
        return new PlanningSuggestionRequirement().load(identifier, byGuid);
    }
    static _listByConfig(configId, activeOnly = false) {
        return new PlanningSuggestionRequirement().listByConfig(configId, activeOnly);
    }
    getId() {
        return this.id;
    }
    getGuid() {
        return this.guid;
    }
    getConfig() {
        return this.config;
    }
    getSessionTemplate() {
        return this.session_template;
    }
    getContinuationTemplate() {
        return this.continuation_template;
    }
    getContinuationDayOffset() {
        return this.continuation_day_offset;
    }
    getDayOfWeek() {
        return this.day_of_week;
    }
    getServiceType() {
        return this.service_type;
    }
    getAllocationMode() {
        return this.allocation_mode;
    }
    getMinEmployees() {
        return this.min_employees;
    }
    getTargetEmployees() {
        return this.target_employees;
    }
    getMaxEmployees() {
        return this.max_employees;
    }
    getCreditedMinutes() {
        return this.credited_minutes;
    }
    getPriority() {
        return this.priority;
    }
    isActive() {
        return this.active;
    }
    getEligibilityPolicy() {
        return {
            planning_modes: [...this.eligibility_policy.planning_modes],
            guard_pool_relation: this.eligibility_policy.guard_pool_relation,
        };
    }
    isGuard() {
        return this.service_type === 'GUARD';
    }
    isFillRemaining() {
        return (this.allocation_mode ===
            'FILL_REMAINING');
    }
    setConfig(value) {
        this.config = value;
        this.configObj = undefined;
        return this;
    }
    setSessionTemplate(value) {
        this.session_template = value;
        this.sessionTemplateObj = undefined;
        return this;
    }
    setContinuationTemplate(value) {
        this.continuation_template = value;
        this.continuationTemplateObj = undefined;
        return this;
    }
    setContinuationDayOffset(value) {
        this.continuation_day_offset = value;
        return this;
    }
    setDayOfWeek(value) {
        this.day_of_week = value;
        return this;
    }
    setServiceType(value) {
        this.service_type = value;
        if (value === 'STANDARD') {
            this.continuation_template = null;
            this.continuation_day_offset = 0;
            this.continuationTemplateObj = undefined;
        }
        return this;
    }
    setAllocationMode(value) {
        this.allocation_mode = value;
        return this;
    }
    setMinEmployees(value) {
        this.min_employees = value;
        return this;
    }
    setTargetEmployees(value) {
        this.target_employees = value;
        return this;
    }
    setMaxEmployees(value) {
        this.max_employees = value;
        return this;
    }
    setCreditedMinutes(value) {
        this.credited_minutes = value;
        return this;
    }
    setPriority(value) {
        this.priority = value;
        return this;
    }
    setActive(value) {
        this.active = value;
        return this;
    }
    setEligibilityPolicy(value) {
        this.eligibility_policy = {
            planning_modes: [...value.planning_modes],
            guard_pool_relation: value.guard_pool_relation,
        };
        return this;
    }
    isNew() {
        return this.id === undefined;
    }
    getConfigObj() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.configObj)
                return this.configObj;
            if (!this.config)
                return null;
            const config = yield PlanningSuggestionConfig_js_1.default._load(this.config);
            if (config) {
                this.configObj = config;
            }
            return config;
        });
    }
    getSessionTemplateObj() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.sessionTemplateObj) {
                return this.sessionTemplateObj;
            }
            if (!this.session_template) {
                return null;
            }
            const template = yield SessionTemplates_js_1.default._load(this.session_template);
            if (template) {
                this.sessionTemplateObj = template;
            }
            return template;
        });
    }
    getContinuationTemplateObj() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.continuationTemplateObj) {
                return this.continuationTemplateObj;
            }
            if (!this.continuation_template) {
                return null;
            }
            const template = yield SessionTemplates_js_1.default._load(this.continuation_template);
            if (template) {
                this.continuationTemplateObj = template;
            }
            return template;
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
    softDelete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.id)
                return false;
            return yield this.trash(this.id);
        });
    }
    toJSON() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const config = yield this.getConfigObj();
            const template = yield this.getSessionTemplateObj();
            const continuationTemplate = yield this.getContinuationTemplateObj();
            return {
                guid: this.guid,
                config: config
                    ? {
                        guid: config.getGuid(),
                        name: config.getName(),
                        version: config.getVersion(),
                    }
                    : null,
                session_template: template
                    ? {
                        guid: template.getGuid(),
                        name: template.getName(),
                        definition: template.getDefinition(),
                    }
                    : null,
                continuation_template: continuationTemplate
                    ? {
                        guid: continuationTemplate.getGuid(),
                        name: continuationTemplate.getName(),
                        definition: continuationTemplate.getDefinition(),
                    }
                    : null,
                continuation_day_offset: this.continuation_day_offset,
                day_of_week: this.day_of_week,
                service_type: this.service_type,
                allocation_mode: this.allocation_mode,
                min_employees: this.min_employees,
                target_employees: this.target_employees,
                max_employees: (_a = this.max_employees) !== null && _a !== void 0 ? _a : null,
                credited_minutes: (_b = this.credited_minutes) !== null && _b !== void 0 ? _b : null,
                priority: this.priority,
                active: this.active,
                eligibility_policy: this.getEligibilityPolicy(),
                created_at: this.created_at,
                updated_at: this.updated_at,
            };
        });
    }
    hydrate(data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        this.id = data.id;
        this.guid = data.guid;
        this.config = data.config;
        this.session_template = data.session_template;
        this.continuation_template =
            (_a = data.continuation_template) !== null && _a !== void 0 ? _a : null;
        this.continuation_day_offset =
            (_b = data.continuation_day_offset) !== null && _b !== void 0 ? _b : 0;
        this.day_of_week = data.day_of_week;
        this.service_type =
            (_c = data.service_type) !== null && _c !== void 0 ? _c : 'STANDARD';
        this.allocation_mode =
            (_d = data.allocation_mode) !== null && _d !== void 0 ? _d : 'RANGE';
        this.min_employees = (_e = data.min_employees) !== null && _e !== void 0 ? _e : 0;
        this.target_employees =
            (_f = data.target_employees) !== null && _f !== void 0 ? _f : 0;
        this.max_employees = (_g = data.max_employees) !== null && _g !== void 0 ? _g : null;
        this.credited_minutes = (_h = data.credited_minutes) !== null && _h !== void 0 ? _h : null;
        this.priority = (_j = data.priority) !== null && _j !== void 0 ? _j : 100;
        this.active = (_k = data.active) !== null && _k !== void 0 ? _k : true;
        this.eligibility_policy = (_l = data.eligibility_policy) !== null && _l !== void 0 ? _l : {
            planning_modes: ['FIXED', 'ROTATING'],
            guard_pool_relation: 'ANY',
        };
        this.deleted_at = (_m = data.deleted_at) !== null && _m !== void 0 ? _m : null;
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
    listByConfig(configId, activeOnly) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataset = yield this.listAllByConfig(configId, activeOnly);
            if (!(dataset === null || dataset === void 0 ? void 0 : dataset.length)) {
                return null;
            }
            return dataset.map((data) => new PlanningSuggestionRequirement().hydrate(data));
        });
    }
}
exports.default = PlanningSuggestionRequirement;
