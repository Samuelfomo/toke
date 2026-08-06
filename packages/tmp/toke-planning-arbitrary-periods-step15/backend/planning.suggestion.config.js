"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningSuggestionConfigGuidSchema = exports.updatePlanningSuggestionConfigSchema = exports.createPlanningSuggestionConfigSchema = void 0;
exports.validatePlanningSuggestionConfigCreation = validatePlanningSuggestionConfigCreation;
exports.validatePlanningSuggestionConfigUpdate = validatePlanningSuggestionConfigUpdate;
exports.validatePlanningSuggestionConfigGuid = validatePlanningSuggestionConfigGuid;
const zod_1 = require("zod");
const dayKeySchema = zod_1.z.enum([
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
]);
const planningModeSchema = zod_1.z.enum(['FIXED', 'ROTATING']);
const serviceTypeSchema = zod_1.z.enum(['STANDARD', 'GUARD']);
const solverTypeSchema = zod_1.z.enum(['GREEDY', 'ORTOOLS']);
const weeklyLeaveModeSchema = zod_1.z.enum([
    'NONE',
    'PER_EMPLOYEE',
    'TEAM_ROTATION',
    'PER_ELIGIBLE_EMPLOYEE',
]);
const weeklyLeaveCountModeSchema = zod_1.z.enum(['MINIMUM', 'EXACT']);
const guardPoolRelationSchema = zod_1.z.enum(['ANY', 'MEMBER', 'NON_MEMBER']);
const serviceScopeModeSchema = zod_1.z.enum([
    'ANY', 'SERVICE_TYPE', 'TEMPLATE', 'REQUIREMENT',
]);
const guardTeamModeSchema = zod_1.z.enum(['DAILY_FLEXIBLE', 'WEEKLY_POOL']);
const guardTeamSelectionModeSchema = zod_1.z.enum(['ROTATION_ORDER', 'OPTIMIZED']);
const guardMemberServiceAccessSchema = zod_1.z.enum(['ANY_SERVICE', 'GUARD_ONLY']);
const membershipBalanceModeSchema = zod_1.z.enum(['NONE', 'SOFT', 'STRICT']);
const isoDateSchema = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');
const employeeSelectorSchema = zod_1.z.object({
    planning_modes: zod_1.z
        .array(planningModeSchema)
        .min(1)
        .refine((values) => new Set(values).size === values.length, {
        message: 'planning_modes cannot contain duplicates',
    }),
    guard_pool_relation: guardPoolRelationSchema,
});
const serviceScopeSchema = zod_1.z.object({
    mode: serviceScopeModeSchema,
    service_types: zod_1.z
        .array(serviceTypeSchema)
        .default([])
        .refine((values) => new Set(values).size === values.length, {
        message: 'service_types cannot contain duplicates',
    }),
    template_guids: zod_1.z.array(zod_1.z.string().trim().min(1)).default([]),
    requirement_guids: zod_1.z.array(zod_1.z.string().trim().min(1)).default([]),
    exclusive: zod_1.z.boolean().default(false),
}).superRefine((scope, ctx) => {
    if (scope.mode === 'SERVICE_TYPE' && scope.service_types.length === 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['service_types'],
            message: 'SERVICE_TYPE requires at least one service type',
        });
    }
    if (scope.mode === 'TEMPLATE' && scope.template_guids.length === 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['template_guids'],
            message: 'TEMPLATE requires at least one template',
        });
    }
    if (scope.mode === 'REQUIREMENT' && scope.requirement_guids.length === 0) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['requirement_guids'],
            message: 'REQUIREMENT requires at least one requirement',
        });
    }
});
const baseObject = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(128),
    active: zod_1.z.boolean().default(false),
    min_rest_days_per_week: zod_1.z.number().int().min(0).max(7).default(1),
    max_consecutive_work_days: zod_1.z
        .number().int().min(1).max(366).nullable().default(6),
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
    weekly_leave_selector: employeeSelectorSchema.default({
        planning_modes: ['ROTATING'],
        guard_pool_relation: 'ANY',
    }),
    weekly_leave_days_per_employee: zod_1.z.number().int().min(1).max(7).default(1),
    weekly_leave_count_mode: weeklyLeaveCountModeSchema.default('EXACT'),
    weekly_leave_max_employees_per_day: zod_1.z.number().int().min(1).nullable().optional(),
    weekly_leave_require_work_on_other_days: zod_1.z.boolean().default(false),
    weekly_leave_service_scope: serviceScopeSchema.default({
        mode: 'ANY',
        service_types: [],
        template_guids: [],
        requirement_guids: [],
        exclusive: false,
    }),
    guard_team_mode: guardTeamModeSchema.default('DAILY_FLEXIBLE'),
    guard_team_employees_per_week: zod_1.z.number().int().min(1).max(1000).default(1),
    guard_team_selection_mode: guardTeamSelectionModeSchema.default('ROTATION_ORDER'),
    guard_team_rotation_anchor_date: isoDateSchema.nullable().optional(),
    guard_team_complete_weeks_only: zod_1.z.boolean().default(true),
    guard_team_require_participation: zod_1.z.boolean().default(true),
    guard_team_eligible_planning_modes: zod_1.z
        .array(planningModeSchema)
        .min(1)
        .default(['ROTATING'])
        .refine((values) => new Set(values).size === values.length, {
        message: 'guard_team_eligible_planning_modes cannot contain duplicates',
    }),
    guard_team_member_service_access: guardMemberServiceAccessSchema.default('ANY_SERVICE'),
    guard_team_balance_mode: membershipBalanceModeSchema.default('NONE'),
    guard_team_max_membership_spread: zod_1.z.number().int().min(0).max(52).nullable().optional(),
    guard_team_max_consecutive_membership_weeks: zod_1.z.number().int().min(1).max(52).nullable().optional(),
    solver_type: solverTypeSchema.default('GREEDY'),
    solver_timeout_seconds: zod_1.z.number().int().min(1).max(300).default(20),
    fallback_to_greedy: zod_1.z.boolean().default(true),
});
function validatePolicy(data, ctx) {
    const requiresOrTools = data.weekly_leave_mode === 'TEAM_ROTATION' ||
        data.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE' ||
        data.guard_team_mode === 'WEEKLY_POOL';
    if (data.weekly_leave_mode === 'TEAM_ROTATION' &&
        !data.weekly_leave_rotation_anchor_date) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['weekly_leave_rotation_anchor_date'],
            message: 'TEAM_ROTATION requires a rotation anchor date',
        });
    }
    if (data.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE') {
        if (data.weekly_leave_count_mode === 'EXACT' &&
            data.weekly_leave_days_per_employee > data.weekly_leave_allowed_days.length) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['weekly_leave_days_per_employee'],
                message: 'Exact leave days cannot exceed allowed days',
            });
        }
        if (data.weekly_leave_selector.guard_pool_relation !== 'ANY' &&
            data.guard_team_mode !== 'WEEKLY_POOL') {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['weekly_leave_selector', 'guard_pool_relation'],
                message: 'A guard-pool relation requires WEEKLY_POOL',
            });
        }
    }
    if (data.guard_team_mode === 'WEEKLY_POOL' &&
        data.guard_team_selection_mode === 'ROTATION_ORDER' &&
        !data.guard_team_rotation_anchor_date) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['guard_team_rotation_anchor_date'],
            message: 'WEEKLY_POOL with ROTATION_ORDER requires an anchor date',
        });
    }
    if (data.guard_team_mode === 'WEEKLY_POOL' &&
        !data.guard_team_eligible_planning_modes.includes('ROTATING')) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['guard_team_eligible_planning_modes'],
            message: 'The current solver requires ROTATING as a guard-pool eligible mode',
        });
    }
    if (data.guard_team_balance_mode === 'STRICT' &&
        data.guard_team_max_membership_spread === null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['guard_team_max_membership_spread'],
            message: 'STRICT balance requires a maximum membership spread',
        });
    }
    if (requiresOrTools && data.solver_type !== 'ORTOOLS') {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['solver_type'],
            message: 'This policy requires the ORTOOLS solver',
        });
    }
    if (requiresOrTools && data.fallback_to_greedy) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fallback_to_greedy'],
            message: 'This policy cannot fallback to GREEDY',
        });
    }
}
exports.createPlanningSuggestionConfigSchema = baseObject.superRefine(validatePolicy);
// Updates are merged into the loaded entity before its domain validation.
// The API validates the supplied field types here and the complete invariant in save().
exports.updatePlanningSuggestionConfigSchema = baseObject.partial();
exports.planningSuggestionConfigGuidSchema = zod_1.z.string().trim().min(1).max(255);
function throwValidation(issues) {
    const first = issues[0];
    const error = new Error(first.message);
    error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
    throw error;
}
function validatePlanningSuggestionConfigCreation(data) {
    const result = exports.createPlanningSuggestionConfigSchema.safeParse(data);
    if (!result.success)
        throwValidation(result.error.issues);
    return result.data;
}
function validatePlanningSuggestionConfigUpdate(data) {
    const result = exports.updatePlanningSuggestionConfigSchema.safeParse(data);
    if (!result.success)
        throwValidation(result.error.issues);
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
