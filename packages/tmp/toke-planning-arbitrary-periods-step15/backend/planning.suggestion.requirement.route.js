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
const PlanningSuggestionRequirement_js_1 = __importDefault(require("../class/PlanningSuggestionRequirement.js"));
const SessionTemplates_js_1 = __importDefault(require("../class/SessionTemplates.js"));
const shared_2 = require("@toke/shared");
const router = (0, express_1.Router)();
const DAY_KEYS = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
];
const CODES = {
    NOT_FOUND: 'PLANNING_SUGGESTION_REQUIREMENT_NOT_FOUND',
    CONFIG_NOT_FOUND: 'PLANNING_SUGGESTION_REQUIREMENT_CONFIG_NOT_FOUND',
    TEMPLATE_NOT_FOUND: 'PLANNING_SUGGESTION_REQUIREMENT_TEMPLATE_NOT_FOUND',
    CONTINUATION_TEMPLATE_NOT_FOUND: 'PLANNING_SUGGESTION_REQUIREMENT_CONTINUATION_TEMPLATE_NOT_FOUND',
    TEMPLATE_DAY_INVALID: 'PLANNING_SUGGESTION_REQUIREMENT_TEMPLATE_DAY_INVALID',
    CONTINUATION_TEMPLATE_DAY_INVALID: 'PLANNING_SUGGESTION_REQUIREMENT_CONTINUATION_TEMPLATE_DAY_INVALID',
    CREATION_FAILED: 'PLANNING_SUGGESTION_REQUIREMENT_CREATION_FAILED',
    UPDATE_FAILED: 'PLANNING_SUGGESTION_REQUIREMENT_UPDATE_FAILED',
    LISTING_FAILED: 'PLANNING_SUGGESTION_REQUIREMENT_LISTING_FAILED',
    DELETION_FAILED: 'PLANNING_SUGGESTION_REQUIREMENT_DELETION_FAILED',
};
function shiftDay(day, offset) {
    const index = DAY_KEYS.indexOf(day);
    return DAY_KEYS[(index + offset) % DAY_KEYS.length];
}
function hasWorkOnDay(template, day) {
    var _a;
    const blocks = (_a = template.getDefinition()) === null || _a === void 0 ? void 0 : _a[day];
    return Array.isArray(blocks) && blocks.length > 0;
}
function validateRequirementTemplates(requirement) {
    return __awaiter(this, void 0, void 0, function* () {
        const day = requirement.getDayOfWeek();
        if (!day) {
            return {
                code: CODES.TEMPLATE_DAY_INVALID,
                message: 'day_of_week is required',
            };
        }
        const mainTemplate = yield requirement.getSessionTemplateObj();
        if (!mainTemplate) {
            return {
                code: CODES.TEMPLATE_NOT_FOUND,
                message: 'Session template not found',
            };
        }
        if (!mainTemplate.isCurrent()) {
            return {
                code: CODES.TEMPLATE_NOT_FOUND,
                message: 'Session template is no longer current',
            };
        }
        if (!hasWorkOnDay(mainTemplate, day)) {
            return {
                code: CODES.TEMPLATE_DAY_INVALID,
                message: `The selected session template contains no work block for ${day}`,
            };
        }
        if (!requirement.isGuard()) {
            return null;
        }
        const continuationTemplate = yield requirement.getContinuationTemplateObj();
        if (!continuationTemplate) {
            return {
                code: CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
                message: 'Continuation template is required for a guard',
            };
        }
        if (!continuationTemplate.isCurrent()) {
            return {
                code: CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
                message: 'Continuation template is no longer current',
            };
        }
        const continuationDay = shiftDay(day, requirement.getContinuationDayOffset());
        if (!hasWorkOnDay(continuationTemplate, continuationDay)) {
            return {
                code: CODES.CONTINUATION_TEMPLATE_DAY_INVALID,
                message: `The continuation template contains no work block for ${continuationDay}`,
            };
        }
        return null;
    });
}
router.get('/config/:configGuid', ensured_routes_js_1.default.get(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const config = yield PlanningSuggestionConfig_js_1.default._load(req.params.configGuid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.CONFIG_NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        const requirements = yield PlanningSuggestionRequirement_js_1.default._listByConfig(config.getId(), true);
        return response_js_1.default.handleSuccess(res, {
            planning_suggestion_requirements: {
                count: (_a = requirements === null || requirements === void 0 ? void 0 : requirements.length) !== null && _a !== void 0 ? _a : 0,
                items: requirements
                    ? yield Promise.all(requirements.map((requirement) => requirement.toJSON()))
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
router.get('/:guid', ensured_routes_js_1.default.get(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionRequirementGuid)(req.params.guid);
        const requirement = yield PlanningSuggestionRequirement_js_1.default._load(guid, true);
        if (!requirement) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion requirement not found',
            });
        }
        return response_js_1.default.handleSuccess(res, {
            planning_suggestion_requirement: yield requirement.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, error.code
            ? shared_1.HttpStatus.BAD_REQUEST
            : shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_a = error.code) !== null && _a !== void 0 ? _a : CODES.LISTING_FAILED,
            message: error.message,
        });
    }
}));
router.post('/config/:configGuid', ensured_routes_js_1.default.post(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const config = yield PlanningSuggestionConfig_js_1.default._load(req.params.configGuid, true);
        if (!config) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.CONFIG_NOT_FOUND,
                message: 'Planning suggestion configuration not found',
            });
        }
        const data = (0, shared_2.validatePlanningSuggestionRequirementCreation)(req.body);
        const mainTemplate = yield SessionTemplates_js_1.default._load(data.session_template, true);
        if (!mainTemplate) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.TEMPLATE_NOT_FOUND,
                message: 'Session template not found',
            });
        }
        let continuationTemplateId = null;
        if (data.service_type === 'GUARD') {
            const continuationTemplate = yield SessionTemplates_js_1.default._load(data.continuation_template, true);
            if (!continuationTemplate) {
                return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                    code: CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
                    message: 'Continuation template not found',
                });
            }
            continuationTemplateId =
                continuationTemplate.getId();
        }
        const requirement = new PlanningSuggestionRequirement_js_1.default()
            .setConfig(config.getId())
            .setSessionTemplate(mainTemplate.getId())
            .setServiceType(data.service_type)
            .setAllocationMode(data.allocation_mode)
            .setContinuationTemplate(continuationTemplateId)
            .setContinuationDayOffset(data.continuation_day_offset)
            .setDayOfWeek(data.day_of_week)
            .setMinEmployees(data.min_employees)
            .setTargetEmployees(data.target_employees)
            .setMaxEmployees((_a = data.max_employees) !== null && _a !== void 0 ? _a : null)
            .setCreditedMinutes((_b = data.credited_minutes) !== null && _b !== void 0 ? _b : null)
            .setPriority(data.priority)
            .setActive(data.active)
            .setEligibilityPolicy(data.eligibility_policy);
        const templateError = yield validateRequirementTemplates(requirement);
        if (templateError) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.UNPROCESSABLE_ENTITY, templateError);
        }
        yield requirement.save();
        return response_js_1.default.handleCreated(res, {
            message: 'Planning suggestion requirement created successfully',
            planning_suggestion_requirement: yield requirement.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, error.code
            ? shared_1.HttpStatus.BAD_REQUEST
            : shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_c = error.code) !== null && _c !== void 0 ? _c : CODES.CREATION_FAILED,
            message: error.message,
        });
    }
}));
router.put('/:guid', ensured_routes_js_1.default.put(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionRequirementGuid)(req.params.guid);
        const data = (0, shared_2.validatePlanningSuggestionRequirementUpdate)(req.body);
        const requirement = yield PlanningSuggestionRequirement_js_1.default._load(guid, true);
        if (!requirement) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion requirement not found',
            });
        }
        if (data.session_template !== undefined) {
            const template = yield SessionTemplates_js_1.default._load(data.session_template, true);
            if (!template) {
                return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                    code: CODES.TEMPLATE_NOT_FOUND,
                    message: 'Session template not found',
                });
            }
            requirement.setSessionTemplate(template.getId());
        }
        if (data.service_type !== undefined) {
            requirement.setServiceType(data.service_type);
        }
        if (data.allocation_mode !== undefined) {
            requirement.setAllocationMode(data.allocation_mode);
        }
        if (data.continuation_template !== undefined) {
            if (data.continuation_template === null) {
                requirement.setContinuationTemplate(null);
            }
            else {
                const continuationTemplate = yield SessionTemplates_js_1.default._load(data.continuation_template, true);
                if (!continuationTemplate) {
                    return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                        code: CODES.CONTINUATION_TEMPLATE_NOT_FOUND,
                        message: 'Continuation template not found',
                    });
                }
                requirement.setContinuationTemplate(continuationTemplate.getId());
            }
        }
        if (data.continuation_day_offset !==
            undefined) {
            requirement.setContinuationDayOffset(data.continuation_day_offset);
        }
        if (data.day_of_week !== undefined) {
            requirement.setDayOfWeek(data.day_of_week);
        }
        if (data.min_employees !== undefined) {
            requirement.setMinEmployees(data.min_employees);
        }
        if (data.target_employees !== undefined) {
            requirement.setTargetEmployees(data.target_employees);
        }
        if (data.max_employees !== undefined) {
            requirement.setMaxEmployees((_a = data.max_employees) !== null && _a !== void 0 ? _a : null);
        }
        if (data.credited_minutes !== undefined) {
            requirement.setCreditedMinutes((_b = data.credited_minutes) !== null && _b !== void 0 ? _b : null);
        }
        if (data.priority !== undefined) {
            requirement.setPriority(data.priority);
        }
        if (data.active !== undefined) {
            requirement.setActive(data.active);
        }
        if (data.eligibility_policy !== undefined) {
            requirement.setEligibilityPolicy(data.eligibility_policy);
        }
        const templateError = yield validateRequirementTemplates(requirement);
        if (templateError) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.UNPROCESSABLE_ENTITY, templateError);
        }
        yield requirement.save();
        return response_js_1.default.handleSuccess(res, {
            message: 'Planning suggestion requirement updated successfully',
            planning_suggestion_requirement: yield requirement.toJSON(),
        });
    }
    catch (error) {
        return response_js_1.default.handleError(res, error.code
            ? shared_1.HttpStatus.BAD_REQUEST
            : shared_1.HttpStatus.INTERNAL_ERROR, {
            code: (_c = error.code) !== null && _c !== void 0 ? _c : CODES.UPDATE_FAILED,
            message: error.message,
        });
    }
}));
router.delete('/:guid', ensured_routes_js_1.default.delete(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const guid = (0, shared_2.validatePlanningSuggestionRequirementGuid)(req.params.guid);
        const requirement = yield PlanningSuggestionRequirement_js_1.default._load(guid, true);
        if (!requirement) {
            return response_js_1.default.handleError(res, shared_1.HttpStatus.NOT_FOUND, {
                code: CODES.NOT_FOUND,
                message: 'Planning suggestion requirement not found',
            });
        }
        yield requirement.softDelete();
        return response_js_1.default.handleSuccess(res, {
            message: 'Planning suggestion requirement deleted successfully',
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
