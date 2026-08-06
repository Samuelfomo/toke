"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeePlanningProfileGuidSchema = exports.updateEmployeePlanningProfileSchema = exports.createEmployeePlanningProfileSchema = void 0;
exports.validateEmployeePlanningProfileCreation = validateEmployeePlanningProfileCreation;
exports.validateEmployeePlanningProfileUpdate = validateEmployeePlanningProfileUpdate;
exports.validateEmployeePlanningProfileGuid = validateEmployeePlanningProfileGuid;
const zod_1 = require("zod");
const baseEmployeePlanningProfileSchema = zod_1.z
    .object({
    user: zod_1.z.string().trim().min(1).max(255),
    planning_mode: zod_1.z.enum(['FIXED', 'ROTATING', 'EXCLUDED']),
    fixed_session_template: zod_1.z.string().trim().min(1).max(255).nullable().optional(),
    fixed_rest_day_mode: zod_1.z.enum(['TEMPLATE', 'ROTATING']).default('TEMPLATE'),
    rotation_order: zod_1.z.number().int().min(1).nullable().optional(),
    max_weekly_minutes: zod_1.z.number().int().min(1).max(10080).nullable().optional(),
    active: zod_1.z.boolean().default(true),
})
    .superRefine((data, ctx) => {
    if (data.planning_mode === 'FIXED' && !data.fixed_session_template) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fixed_session_template'],
            message: 'fixed_session_template is required for a FIXED employee',
        });
    }
    if (data.planning_mode !== 'FIXED' && data.fixed_session_template) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fixed_session_template'],
            message: 'fixed_session_template is only allowed for a FIXED employee',
        });
    }
    if (data.planning_mode !== 'FIXED' &&
        data.fixed_rest_day_mode === 'ROTATING') {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fixed_rest_day_mode'],
            message: 'fixed_rest_day_mode ROTATING is only allowed for a FIXED employee',
        });
    }
});
exports.createEmployeePlanningProfileSchema = baseEmployeePlanningProfileSchema;
exports.updateEmployeePlanningProfileSchema = zod_1.z
    .object({
    planning_mode: zod_1.z.enum(['FIXED', 'ROTATING', 'EXCLUDED']).optional(),
    fixed_session_template: zod_1.z.string().trim().min(1).max(255).nullable().optional(),
    fixed_rest_day_mode: zod_1.z.enum(['TEMPLATE', 'ROTATING']).optional(),
    rotation_order: zod_1.z.number().int().min(1).nullable().optional(),
    max_weekly_minutes: zod_1.z.number().int().min(1).max(10080).nullable().optional(),
    active: zod_1.z.boolean().optional(),
})
    .strict();
exports.employeePlanningProfileGuidSchema = zod_1.z.string().trim().min(1).max(255);
function validateEmployeePlanningProfileCreation(data) {
    const result = exports.createEmployeePlanningProfileSchema.safeParse(data);
    if (!result.success) {
        const first = result.error.issues[0];
        const error = new Error(first.message);
        error.code = 'EMPLOYEE_PLANNING_PROFILE_VALIDATION_FAILED';
        throw error;
    }
    return result.data;
}
function validateEmployeePlanningProfileUpdate(data) {
    const result = exports.updateEmployeePlanningProfileSchema.safeParse(data);
    if (!result.success) {
        const first = result.error.issues[0];
        const error = new Error(first.message);
        error.code = 'EMPLOYEE_PLANNING_PROFILE_VALIDATION_FAILED';
        throw error;
    }
    return result.data;
}
function validateEmployeePlanningProfileGuid(data) {
    const result = exports.employeePlanningProfileGuidSchema.safeParse(data);
    if (!result.success) {
        const error = new Error('Invalid employee planning profile GUID');
        error.code = 'EMPLOYEE_PLANNING_PROFILE_INVALID_GUID';
        throw error;
    }
    return result.data;
}
