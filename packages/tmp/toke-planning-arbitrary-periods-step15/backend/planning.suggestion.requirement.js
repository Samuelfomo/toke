"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningSuggestionRequirementGuidSchema = exports.updatePlanningSuggestionRequirementSchema = exports.createPlanningSuggestionRequirementSchema = void 0;
exports.validatePlanningSuggestionRequirementCreation = validatePlanningSuggestionRequirementCreation;
exports.validatePlanningSuggestionRequirementUpdate = validatePlanningSuggestionRequirementUpdate;
exports.validatePlanningSuggestionRequirementGuid = validatePlanningSuggestionRequirementGuid;
const zod_1 = require("zod");
const dayOfWeekSchema = zod_1.z.enum([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
]);
const serviceTypeSchema = zod_1.z.enum(['STANDARD', 'GUARD']);
const planningModeSchema = zod_1.z.enum(['FIXED', 'ROTATING']);
const guardPoolRelationSchema = zod_1.z.enum(['ANY', 'MEMBER', 'NON_MEMBER']);
const eligibilityPolicySchema = zod_1.z.object({
    planning_modes: zod_1.z
        .array(planningModeSchema)
        .min(1)
        .refine((values) => new Set(values).size === values.length, {
        message: 'eligibility_policy.planning_modes cannot contain duplicates',
    }),
    guard_pool_relation: guardPoolRelationSchema,
});
const allocationModeSchema = zod_1.z.enum([
    'EXACT',
    'RANGE',
    'FILL_REMAINING',
]);
const createBaseSchema = zod_1.z
    .object({
    session_template: zod_1.z.string().trim().min(1).max(255),
    continuation_template: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(255)
        .nullable()
        .optional(),
    continuation_day_offset: zod_1.z.number().int().min(0).max(1).default(0),
    day_of_week: dayOfWeekSchema,
    service_type: serviceTypeSchema.default('STANDARD'),
    allocation_mode: allocationModeSchema.default('RANGE'),
    min_employees: zod_1.z.number().int().min(0).default(0),
    target_employees: zod_1.z.number().int().min(0),
    max_employees: zod_1.z.number().int().min(0).nullable().optional(),
    credited_minutes: zod_1.z.number().int().min(1).max(10080).nullable().optional(),
    priority: zod_1.z.number().int().min(1).max(1000).default(100),
    active: zod_1.z.boolean().default(true),
    eligibility_policy: eligibilityPolicySchema.default({
        planning_modes: ['FIXED', 'ROTATING'],
        guard_pool_relation: 'ANY',
    }),
})
    .strict()
    .superRefine((data, ctx) => {
    if (data.target_employees < data.min_employees) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['target_employees'],
            message: 'target_employees must be greater than or equal to min_employees',
        });
    }
    if (data.max_employees !== null &&
        data.max_employees !== undefined &&
        data.max_employees < data.target_employees) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['max_employees'],
            message: 'max_employees must be greater than or equal to target_employees',
        });
    }
    if (data.allocation_mode === 'EXACT') {
        if (data.max_employees === null ||
            data.max_employees === undefined) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['max_employees'],
                message: 'max_employees is required for an EXACT requirement',
            });
        }
        else if (!(data.min_employees ===
            data.target_employees &&
            data.target_employees ===
                data.max_employees)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['allocation_mode'],
                message: 'EXACT requires min_employees, target_employees and max_employees to be equal',
            });
        }
    }
    if (data.allocation_mode ===
        'FILL_REMAINING' &&
        data.service_type !== 'STANDARD') {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['allocation_mode'],
            message: 'FILL_REMAINING is only allowed for a STANDARD requirement',
        });
    }
    if (data.service_type === 'GUARD') {
        if (!data.continuation_template) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['continuation_template'],
                message: 'continuation_template is required for a GUARD requirement',
            });
        }
        if (data.continuation_day_offset !== 1) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['continuation_day_offset'],
                message: 'continuation_day_offset must be 1 for a GUARD requirement',
            });
        }
        return;
    }
    if (data.continuation_template) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['continuation_template'],
            message: 'continuation_template is only allowed for a GUARD requirement',
        });
    }
    if (data.continuation_day_offset !== 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['continuation_day_offset'],
            message: 'continuation_day_offset must be 0 for a STANDARD requirement',
        });
    }
});
exports.createPlanningSuggestionRequirementSchema = createBaseSchema;
/**
 * La validation croisée complète d'une mise à jour se fait après fusion avec
 * l'état actuel dans la route, puis dans la classe métier.
 */
exports.updatePlanningSuggestionRequirementSchema = zod_1.z
    .object({
    session_template: zod_1.z.string().trim().min(1).max(255).optional(),
    continuation_template: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(255)
        .nullable()
        .optional(),
    continuation_day_offset: zod_1.z.number().int().min(0).max(1).optional(),
    day_of_week: dayOfWeekSchema.optional(),
    service_type: serviceTypeSchema.optional(),
    allocation_mode: allocationModeSchema.optional(),
    min_employees: zod_1.z.number().int().min(0).optional(),
    target_employees: zod_1.z.number().int().min(0).optional(),
    max_employees: zod_1.z.number().int().min(0).nullable().optional(),
    credited_minutes: zod_1.z.number().int().min(1).max(10080).nullable().optional(),
    priority: zod_1.z.number().int().min(1).max(1000).optional(),
    active: zod_1.z.boolean().optional(),
    eligibility_policy: eligibilityPolicySchema.optional(),
})
    .strict();
exports.planningSuggestionRequirementGuidSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(255);
function throwFirst(result) {
    const first = result.error.issues[0];
    const error = new Error(first.message);
    error.code = 'PLANNING_SUGGESTION_REQUIREMENT_VALIDATION_FAILED';
    throw error;
}
function validatePlanningSuggestionRequirementCreation(data) {
    const result = exports.createPlanningSuggestionRequirementSchema.safeParse(data);
    if (!result.success)
        throwFirst(result);
    return result.data;
}
function validatePlanningSuggestionRequirementUpdate(data) {
    const result = exports.updatePlanningSuggestionRequirementSchema.safeParse(data);
    if (!result.success)
        throwFirst(result);
    return result.data;
}
function validatePlanningSuggestionRequirementGuid(data) {
    const result = exports.planningSuggestionRequirementGuidSchema.safeParse(data);
    if (!result.success) {
        const error = new Error('Invalid planning suggestion requirement GUID');
        error.code = 'PLANNING_SUGGESTION_REQUIREMENT_INVALID_GUID';
        throw error;
    }
    return result.data;
}
