"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningSuggestionConfigGuidSchema = exports.updatePlanningSuggestionConfigSchema = exports.createPlanningSuggestionConfigSchema = void 0;
exports.validatePlanningSuggestionConfigCreation = validatePlanningSuggestionConfigCreation;
exports.validatePlanningSuggestionConfigUpdate = validatePlanningSuggestionConfigUpdate;
exports.validatePlanningSuggestionConfigGuid = validatePlanningSuggestionConfigGuid;
const zod_1 = require("zod");
const dayKeySchema = zod_1.z.enum([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
]);
const solverTypeSchema = zod_1.z.enum(['GREEDY', 'ORTOOLS']);
const weeklyLeaveModeSchema = zod_1.z.enum([
    'NONE',
    'PER_EMPLOYEE',
    'TEAM_ROTATION',
]);
const guardTeamModeSchema = zod_1.z.enum([
    'DAILY_FLEXIBLE',
    'WEEKLY_POOL',
]);
const guardTeamSelectionModeSchema = zod_1.z.enum([
    'ROTATION_ORDER',
    'OPTIMIZED',
]);
const isoDateSchema = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');
const baseObject = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(128),
    active: zod_1.z.boolean().default(false),
    // Used only when weekly_leave_mode = PER_EMPLOYEE.
    min_rest_days_per_week: zod_1.z.number().int().min(0).max(7).default(1),
    // null disables this rule. Plateau uses null because employees who are not
    // selected for weekly leave may work seven consecutive days or more.
    max_consecutive_work_days: zod_1.z
        .number()
        .int()
        .min(1)
        .max(366)
        .nullable()
        .default(6),
    max_weekly_minutes: zod_1.z.number().int().min(1).max(10080).nullable().optional(),
    min_rest_minutes_between_shifts: zod_1.z.number().int().min(0).max(2880).default(660),
    max_consecutive_guards: zod_1.z.number().int().min(0).max(31).default(1),
    rest_after_guard_required: zod_1.z.boolean().default(true),
    post_guard_rest_days: zod_1.z.number().int().min(0).max(31).default(0),
    max_resting_employees_per_day: zod_1.z.number().int().min(1).nullable().optional(),
    fairness_window_weeks: zod_1.z.number().int().min(1).max(52).default(8),
    strict_coverage: zod_1.z.boolean().default(true),
    weekly_leave_mode: weeklyLeaveModeSchema.default('PER_EMPLOYEE'),
    weekly_leave_employees_per_week: zod_1.z.number().int().min(1).max(1000).default(1),
    weekly_leave_allowed_days: zod_1.z
        .array(dayKeySchema)
        .min(1)
        .default(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        .refine((days) => new Set(days).size === days.length, {
        message: 'weekly_leave_allowed_days cannot contain duplicates',
    }),
    weekly_leave_rotation_anchor_date: isoDateSchema.nullable().optional(),
    weekly_leave_complete_weeks_only: zod_1.z.boolean().default(true),
    post_guard_rest_counts_as_weekly_leave: zod_1.z.boolean().default(false),
    guard_team_mode: guardTeamModeSchema.default('DAILY_FLEXIBLE'),
    guard_team_employees_per_week: zod_1.z.number().int().min(1).max(1000).default(1),
    guard_team_selection_mode: guardTeamSelectionModeSchema.default('ROTATION_ORDER'),
    guard_team_rotation_anchor_date: isoDateSchema.nullable().optional(),
    guard_team_complete_weeks_only: zod_1.z.boolean().default(true),
    guard_team_require_participation: zod_1.z.boolean().default(true),
    solver_type: solverTypeSchema.default('GREEDY'),
    solver_timeout_seconds: zod_1.z.number().int().min(1).max(300).default(20),
    fallback_to_greedy: zod_1.z.boolean().default(true),
});
function validatePolicy(data, ctx) {
    const requiresOrTools = data.weekly_leave_mode === 'TEAM_ROTATION' ||
        data.guard_team_mode === 'WEEKLY_POOL';
    if (data.weekly_leave_mode === 'TEAM_ROTATION') {
        if (!data.weekly_leave_rotation_anchor_date) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['weekly_leave_rotation_anchor_date'],
                message: 'TEAM_ROTATION requires a rotation anchor date',
            });
        }
    }
    if (data.guard_team_mode === 'WEEKLY_POOL') {
        if (data.guard_team_selection_mode === 'ROTATION_ORDER' &&
            !data.guard_team_rotation_anchor_date) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['guard_team_rotation_anchor_date'],
                message: 'WEEKLY_POOL with ROTATION_ORDER requires a rotation anchor date',
            });
        }
    }
    if (requiresOrTools && data.solver_type !== 'ORTOOLS') {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['solver_type'],
            message: 'TEAM_ROTATION and WEEKLY_POOL require the ORTOOLS solver',
        });
    }
    if (requiresOrTools && data.fallback_to_greedy) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fallback_to_greedy'],
            message: 'TEAM_ROTATION and WEEKLY_POOL cannot fallback to GREEDY',
        });
    }
}
exports.createPlanningSuggestionConfigSchema = baseObject.superRefine(validatePolicy);
exports.updatePlanningSuggestionConfigSchema = baseObject.partial();
exports.planningSuggestionConfigGuidSchema = zod_1.z.string().trim().min(1).max(255);
function validatePlanningSuggestionConfigCreation(data) {
    const result = exports.createPlanningSuggestionConfigSchema.safeParse(data);
    if (!result.success) {
        const first = result.error.issues[0];
        const error = new Error(first.message);
        error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
        throw error;
    }
    return result.data;
}
function validatePlanningSuggestionConfigUpdate(data) {
    const result = exports.updatePlanningSuggestionConfigSchema.safeParse(data);
    if (!result.success) {
        const first = result.error.issues[0];
        const error = new Error(first.message);
        error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
        throw error;
    }
    return result.data;
}
function validatePlanningSuggestionConfigGuid(data) {
    const result = exports.planningSuggestionConfigGuidSchema.safeParse(data);
    if (!result.success) {
        const error = new Error('Invalid planning suggestion configuration GUID');
        error.code = 'PLANNING_SUGGESTION_CONFIG_INVALID_GUID';
        throw error;
    }
    return result.data;
}
