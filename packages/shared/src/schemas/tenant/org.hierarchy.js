"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgHierarchySchemas = exports.orgHierarchyResponseSchema = exports.validateOrgHierarchyAssignment = exports.validateOrgHierarchyGuid = exports.validateOrgHierarchyFilters = exports.validateOrgHierarchyUpdate = exports.validateOrgHierarchyCreation = exports.orgHierarchyGuidSchema = exports.orgHierarchyFiltersSchema = exports.updateOrgHierarchySchema = exports.createOrgHierarchySchema = void 0;
// schemas/org_hierarchy.ts
const zod_1 = require("zod");
const org_hierarchy_js_1 = require("../../constants/tenant/org.hierarchy.js");
const timezone_config_validation_js_1 = require("../../utils/timezone.config.validation.js");
// Base schema pour les validations communes
const baseOrgHierarchySchema = zod_1.z.object({
    subordinate: zod_1.z
        .number({
        required_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUBORDINATE_REQUIRED,
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID,
    })
        .int()
        .min(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.SUBORDINATE.MIN, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID)
        .max(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.SUBORDINATE.MAX, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUBORDINATE_INVALID),
    supervisor: zod_1.z
        .number({
        required_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUPERVISOR_REQUIRED,
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID,
    })
        .int()
        .min(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.SUPERVISOR.MIN, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID)
        .max(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.SUPERVISOR.MAX, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SUPERVISOR_INVALID),
    relationship_type: zod_1.z
        .nativeEnum(org_hierarchy_js_1.RelationshipType, {
        required_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.RELATIONSHIP_TYPE_REQUIRED,
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.RELATIONSHIP_TYPE_INVALID,
    })
        .default(org_hierarchy_js_1.ORG_HIERARCHY_DEFAULTS.RELATIONSHIP_TYPE),
    effective_from: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        required_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.EFFECTIVE_FROM_REQUIRED,
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.EFFECTIVE_FROM_INVALID,
    })
        .refine((date) => date <= timezone_config_validation_js_1.TimezoneConfigUtils.getCurrentTime(), org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.FUTURE_EFFECTIVE_DATE),
    effective_to: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.EFFECTIVE_TO_INVALID,
    })
        .optional()
        .nullable(),
    department: zod_1.z
        .string({
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DEPARTMENT_INVALID,
    })
        .min(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.DEPARTMENT.MIN_LENGTH, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DEPARTMENT_INVALID)
        .max(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.DEPARTMENT.MAX_LENGTH, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DEPARTMENT_INVALID)
        .trim()
        .optional()
        .nullable(),
    cost_center: zod_1.z
        .string({
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.COST_CENTER_INVALID,
    })
        .min(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.COST_CENTER.MIN_LENGTH, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.COST_CENTER_INVALID)
        .max(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.COST_CENTER.MAX_LENGTH, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.COST_CENTER_INVALID)
        .trim()
        .optional()
        .nullable(),
    delegation_level: zod_1.z
        .number({
        required_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_REQUIRED,
        invalid_type_error: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_INVALID,
    })
        .int()
        .min(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MIN, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_INVALID)
        .max(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MAX, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.DELEGATION_LEVEL_INVALID)
        .default(org_hierarchy_js_1.ORG_HIERARCHY_DEFAULTS.DELEGATION_LEVEL),
});
// Schema avec validation des dates logiques
const orgHierarchyWithDateValidation = baseOrgHierarchySchema.refine((data) => {
    if (data.effective_to && data.effective_from > data.effective_to) {
        return false;
    }
    return true;
}, {
    message: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.EFFECTIVE_DATES_LOGIC_INVALID,
    path: ['effective_to'],
});
// Schema pour la création - tous les champs requis
exports.createOrgHierarchySchema = orgHierarchyWithDateValidation;
// Schema pour les mises à jour - tous les champs optionnels
exports.updateOrgHierarchySchema = baseOrgHierarchySchema.partial().refine((data) => {
    if (data.effective_to && data.effective_from > data.effective_to) {
        return false;
    }
    return true;
}, {
    message: org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.EFFECTIVE_DATES_LOGIC_INVALID,
    path: ['effective_to'],
});
// Schema pour les filtres
exports.orgHierarchyFiltersSchema = zod_1.z
    .object({
    subordinate: zod_1.z.number().int().optional(),
    supervisor: zod_1.z.number().int().optional(),
    relationship_type: zod_1.z.nativeEnum(org_hierarchy_js_1.RelationshipType).optional(),
    department: zod_1.z.string().optional(),
    cost_center: zod_1.z.string().optional(),
    delegation_level: zod_1.z.number().int().optional(),
    effective_from: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))]).optional(),
    effective_to: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))]).optional(),
    active_only: zod_1.z.boolean().optional(), // Pour filtrer les relations actives
})
    .strict();
// Schema pour validation GUID
exports.orgHierarchyGuidSchema = zod_1.z
    .string()
    .min(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.GUID.MIN_LENGTH, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.GUID_INVALID)
    .max(org_hierarchy_js_1.ORG_HIERARCHY_VALIDATION.GUID.MAX_LENGTH, org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.GUID_INVALID);
// Fonctions de validation avec gestion d'erreurs
const validateOrgHierarchyCreation = (data) => {
    try {
        return exports.createOrgHierarchySchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateOrgHierarchyCreation = validateOrgHierarchyCreation;
const validateOrgHierarchyUpdate = (data) => {
    try {
        return exports.updateOrgHierarchySchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateOrgHierarchyUpdate = validateOrgHierarchyUpdate;
const validateOrgHierarchyFilters = (data) => {
    try {
        return exports.orgHierarchyFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateOrgHierarchyFilters = validateOrgHierarchyFilters;
const validateOrgHierarchyGuid = (guid) => {
    try {
        return exports.orgHierarchyGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateOrgHierarchyGuid = validateOrgHierarchyGuid;
// Validation métier personnalisée pour éviter l'auto-supervision
const validateOrgHierarchyAssignment = (data) => {
    const validated = (0, exports.validateOrgHierarchyCreation)(data);
    if (validated.subordinate === validated.supervisor) {
        throw new Error(org_hierarchy_js_1.ORG_HIERARCHY_ERRORS.SELF_SUPERVISION_INVALID);
    }
    return validated;
};
exports.validateOrgHierarchyAssignment = validateOrgHierarchyAssignment;
// Schema complet pour les réponses (avec métadonnées)
exports.orgHierarchyResponseSchema = baseOrgHierarchySchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Export groupé pour faciliter les imports
exports.orgHierarchySchemas = {
    validateOrgHierarchyCreation: exports.validateOrgHierarchyCreation,
    validateOrgHierarchyUpdate: exports.validateOrgHierarchyUpdate,
    validateOrgHierarchyFilters: exports.validateOrgHierarchyFilters,
    validateOrgHierarchyGuid: exports.validateOrgHierarchyGuid,
    validateOrgHierarchyAssignment: exports.validateOrgHierarchyAssignment,
    createOrgHierarchySchema: exports.createOrgHierarchySchema,
    updateOrgHierarchySchema: exports.updateOrgHierarchySchema,
    orgHierarchyFiltersSchema: exports.orgHierarchyFiltersSchema,
    orgHierarchyGuidSchema: exports.orgHierarchyGuidSchema,
};
