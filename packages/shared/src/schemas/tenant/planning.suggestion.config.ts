// import { z } from 'zod';
//
// const dayKeySchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
// const planningModeSchema = z.enum(['FIXED', 'ROTATING']);
// const serviceTypeSchema = z.enum(['STANDARD', 'GUARD']);
// const solverTypeSchema = z.enum(['GREEDY', 'ORTOOLS']);
// const weeklyLeaveModeSchema = z.enum([
//   'NONE',
//   'PER_EMPLOYEE',
//   'TEAM_ROTATION',
//   'PER_ELIGIBLE_EMPLOYEE',
// ]);
// const weeklyLeaveCountModeSchema = z.enum(['MINIMUM', 'EXACT']);
// const guardPoolRelationSchema = z.enum(['ANY', 'MEMBER', 'NON_MEMBER']);
// const serviceScopeModeSchema = z.enum(['ANY', 'SERVICE_TYPE', 'TEMPLATE', 'REQUIREMENT']);
// const guardTeamModeSchema = z.enum(['DAILY_FLEXIBLE', 'WEEKLY_POOL']);
// const guardTeamSelectionModeSchema = z.enum(['ROTATION_ORDER', 'OPTIMIZED']);
// const guardMemberServiceAccessSchema = z.enum(['ANY_SERVICE', 'GUARD_ONLY']);
// const membershipBalanceModeSchema = z.enum(['NONE', 'SOFT', 'STRICT']);
//
// const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');
//
// const employeeSelectorSchema = z.object({
//   planning_modes: z
//     .array(planningModeSchema)
//     .min(1)
//     .refine((values) => new Set(values).size === values.length, {
//       message: 'planning_modes cannot contain duplicates',
//     }),
//   guard_pool_relation: guardPoolRelationSchema,
// });
//
// const serviceScopeSchema = z
//   .object({
//     mode: serviceScopeModeSchema,
//     service_types: z
//       .array(serviceTypeSchema)
//       .default([])
//       .refine((values) => new Set(values).size === values.length, {
//         message: 'service_types cannot contain duplicates',
//       }),
//     template_guids: z.array(z.string().trim().min(1)).default([]),
//     requirement_guids: z.array(z.string().trim().min(1)).default([]),
//     exclusive: z.boolean().default(false),
//   })
//   .superRefine((scope, ctx) => {
//     if (scope.mode === 'SERVICE_TYPE' && scope.service_types.length === 0) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ['service_types'],
//         message: 'SERVICE_TYPE requires at least one service type',
//       });
//     }
//     if (scope.mode === 'TEMPLATE' && scope.template_guids.length === 0) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ['template_guids'],
//         message: 'TEMPLATE requires at least one template',
//       });
//     }
//     if (scope.mode === 'REQUIREMENT' && scope.requirement_guids.length === 0) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ['requirement_guids'],
//         message: 'REQUIREMENT requires at least one requirement',
//       });
//     }
//   });
//
// const baseObject = z.object({
//   name: z.string().trim().min(2).max(128),
//   active: z.boolean().default(false),
//
//   min_rest_days_per_week: z.number().int().min(0).max(7).default(1),
//   max_consecutive_work_days: z.number().int().min(1).max(366).nullable().default(6),
//   max_weekly_minutes: z.number().int().min(1).max(10080).nullable().optional(),
//   min_rest_minutes_between_shifts: z.number().int().min(0).max(2880).default(660),
//   max_consecutive_guards: z.number().int().min(0).max(31).default(1),
//   rest_after_guard_required: z.boolean().default(true),
//   post_guard_rest_days: z.number().int().min(0).max(31).default(0),
//   max_resting_employees_per_day: z.number().int().min(1).nullable().optional(),
//   fairness_window_weeks: z.number().int().min(1).max(52).default(8),
//   strict_coverage: z.boolean().default(true),
//
//   weekly_leave_mode: weeklyLeaveModeSchema.default('PER_EMPLOYEE'),
//   weekly_leave_employees_per_week: z.number().int().min(1).max(1000).default(1),
//   weekly_leave_allowed_days: z
//     .array(dayKeySchema)
//     .min(1)
//     .default(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
//     .refine((days) => new Set(days).size === days.length, {
//       message: 'weekly_leave_allowed_days cannot contain duplicates',
//     }),
//   weekly_leave_rotation_anchor_date: isoDateSchema.nullable().optional(),
//   weekly_leave_complete_weeks_only: z.boolean().default(true),
//   post_guard_rest_counts_as_weekly_leave: z.boolean().default(false),
//
//   weekly_leave_selector: employeeSelectorSchema.default({
//     planning_modes: ['ROTATING'],
//     guard_pool_relation: 'ANY',
//   }),
//   weekly_leave_days_per_employee: z.number().int().min(1).max(7).default(1),
//   weekly_leave_count_mode: weeklyLeaveCountModeSchema.default('EXACT'),
//   weekly_leave_max_employees_per_day: z.number().int().min(1).nullable().optional(),
//   weekly_leave_require_work_on_other_days: z.boolean().default(false),
//   weekly_leave_service_scope: serviceScopeSchema.default({
//     mode: 'ANY',
//     service_types: [],
//     template_guids: [],
//     requirement_guids: [],
//     exclusive: false,
//   }),
//
//   guard_team_mode: guardTeamModeSchema.default('DAILY_FLEXIBLE'),
//   guard_team_employees_per_week: z.number().int().min(1).max(1000).default(1),
//   guard_team_selection_mode: guardTeamSelectionModeSchema.default('ROTATION_ORDER'),
//   guard_team_rotation_anchor_date: isoDateSchema.nullable().optional(),
//   guard_team_complete_weeks_only: z.boolean().default(true),
//   guard_team_require_participation: z.boolean().default(true),
//   guard_team_eligible_planning_modes: z
//     .array(planningModeSchema)
//     .min(1)
//     .default(['ROTATING'])
//     .refine((values) => new Set(values).size === values.length, {
//       message: 'guard_team_eligible_planning_modes cannot contain duplicates',
//     }),
//   guard_team_member_service_access: guardMemberServiceAccessSchema.default('ANY_SERVICE'),
//   guard_team_balance_mode: membershipBalanceModeSchema.default('NONE'),
//   guard_team_max_membership_spread: z.number().int().min(0).max(52).nullable().optional(),
//   guard_team_max_consecutive_membership_weeks: z
//     .number()
//     .int()
//     .min(1)
//     .max(52)
//     .nullable()
//     .optional(),
//
//   solver_type: solverTypeSchema.default('GREEDY'),
//   solver_timeout_seconds: z.number().int().min(1).max(300).default(20),
//   fallback_to_greedy: z.boolean().default(true),
// });
//
// type ConfigShape = z.infer<typeof baseObject>;
//
// function validatePolicy(data: ConfigShape, ctx: z.RefinementCtx): void {
//   const requiresOrTools =
//     data.weekly_leave_mode === 'TEAM_ROTATION' ||
//     data.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE' ||
//     data.guard_team_mode === 'WEEKLY_POOL';
//
//   if (data.weekly_leave_mode === 'TEAM_ROTATION' && !data.weekly_leave_rotation_anchor_date) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['weekly_leave_rotation_anchor_date'],
//       message: 'TEAM_ROTATION requires a rotation anchor date',
//     });
//   }
//
//   if (data.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE') {
//     if (
//       data.weekly_leave_count_mode === 'EXACT' &&
//       data.weekly_leave_days_per_employee > data.weekly_leave_allowed_days.length
//     ) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ['weekly_leave_days_per_employee'],
//         message: 'Exact leave days cannot exceed allowed days',
//       });
//     }
//
//     if (
//       data.weekly_leave_selector.guard_pool_relation !== 'ANY' &&
//       data.guard_team_mode !== 'WEEKLY_POOL'
//     ) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ['weekly_leave_selector', 'guard_pool_relation'],
//         message: 'A guard-pool relation requires WEEKLY_POOL',
//       });
//     }
//   }
//
//   if (
//     data.guard_team_mode === 'WEEKLY_POOL' &&
//     data.guard_team_selection_mode === 'ROTATION_ORDER' &&
//     !data.guard_team_rotation_anchor_date
//   ) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['guard_team_rotation_anchor_date'],
//       message: 'WEEKLY_POOL with ROTATION_ORDER requires an anchor date',
//     });
//   }
//
//   if (
//     data.guard_team_mode === 'WEEKLY_POOL' &&
//     !data.guard_team_eligible_planning_modes.includes('ROTATING')
//   ) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['guard_team_eligible_planning_modes'],
//       message: 'The current solver requires ROTATING as a guard-pool eligible mode',
//     });
//   }
//
//   if (data.guard_team_balance_mode === 'STRICT' && data.guard_team_max_membership_spread === null) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['guard_team_max_membership_spread'],
//       message: 'STRICT balance requires a maximum membership spread',
//     });
//   }
//
//   if (requiresOrTools && data.solver_type !== 'ORTOOLS') {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['solver_type'],
//       message: 'This policy requires the ORTOOLS solver',
//     });
//   }
//
//   if (requiresOrTools && data.fallback_to_greedy) {
//     ctx.addIssue({
//       code: z.ZodIssueCode.custom,
//       path: ['fallback_to_greedy'],
//       message: 'This policy cannot fallback to GREEDY',
//     });
//   }
// }
//
// export const createPlanningSuggestionConfigSchema = baseObject.superRefine(validatePolicy);
//
// // Updates are merged into the loaded entity before its domain validation.
// // The API validates the supplied field types here and the complete invariant in save().
// export const updatePlanningSuggestionConfigSchema = baseObject.partial();
//
// export const planningSuggestionConfigGuidSchema = z.string().trim().min(1).max(255);
//
// function throwValidation(issues: z.ZodIssue[]): never {
//   const first = issues[0]!;
//   const error: any = new Error(first.message);
//   error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
//   throw error;
// }
//
// export function validatePlanningSuggestionConfigCreation(data: unknown) {
//   const result = createPlanningSuggestionConfigSchema.safeParse(data);
//   if (!result.success) throwValidation(result.error.issues);
//   return result.data;
// }
//
// export function validatePlanningSuggestionConfigUpdate(data: unknown) {
//   const result = updatePlanningSuggestionConfigSchema.safeParse(data);
//   if (!result.success) throwValidation(result.error.issues);
//   return result.data;
// }
//
// export function validatePlanningSuggestionConfigGuid(data: unknown) {
//   const result = planningSuggestionConfigGuidSchema.safeParse(data);
//   if (!result.success) {
//     const error: any = new Error('Invalid planning suggestion configuration GUID');
//     error.code = 'PLANNING_SUGGESTION_CONFIG_INVALID_GUID';
//     throw error;
//   }
//   return result.data;
// }
//
// export type CreatePlanningSuggestionConfigInput = z.infer<
//   typeof createPlanningSuggestionConfigSchema
// >;
// export type UpdatePlanningSuggestionConfigInput = z.infer<
//   typeof updatePlanningSuggestionConfigSchema
// >;

import { z } from 'zod';

const dayKeySchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const planningModeSchema = z.enum(['FIXED', 'ROTATING']);
const serviceTypeSchema = z.enum(['STANDARD', 'GUARD']);
const solverTypeSchema = z.enum(['GREEDY', 'ORTOOLS']);
const weeklyLeaveModeSchema = z.enum([
  'NONE',
  'PER_EMPLOYEE',
  'TEAM_ROTATION',
  'PER_ELIGIBLE_EMPLOYEE',
]);
const weeklyLeaveCountModeSchema = z.enum(['MINIMUM', 'EXACT']);
const guardPoolRelationSchema = z.enum(['ANY', 'MEMBER', 'NON_MEMBER']);
const serviceScopeModeSchema = z.enum(['ANY', 'SERVICE_TYPE', 'TEMPLATE', 'REQUIREMENT']);
const guardTeamModeSchema = z.enum(['DAILY_FLEXIBLE', 'WEEKLY_POOL']);
const guardTeamSelectionModeSchema = z.enum(['ROTATION_ORDER', 'OPTIMIZED']);
const guardMemberServiceAccessSchema = z.enum(['ANY_SERVICE', 'GUARD_ONLY']);
const membershipBalanceModeSchema = z.enum(['NONE', 'SOFT', 'STRICT']);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

const employeeSelectorSchema = z.object({
  planning_modes: z
    .array(planningModeSchema)
    .min(1)
    .refine((values) => new Set(values).size === values.length, {
      message: 'planning_modes cannot contain duplicates',
    }),
  guard_pool_relation: guardPoolRelationSchema,
});

const serviceScopeSchema = z
  .object({
    mode: serviceScopeModeSchema,
    service_types: z
      .array(serviceTypeSchema)
      .default([])
      .refine((values) => new Set(values).size === values.length, {
        message: 'service_types cannot contain duplicates',
      }),
    template_guids: z.array(z.string().trim().min(1)).default([]),
    requirement_guids: z.array(z.string().trim().min(1)).default([]),
    exclusive: z.boolean().default(false),
  })
  .superRefine((scope, ctx) => {
    if (scope.mode === 'SERVICE_TYPE' && scope.service_types.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['service_types'],
        message: 'SERVICE_TYPE requires at least one service type',
      });
    }
    if (scope.mode === 'TEMPLATE' && scope.template_guids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['template_guids'],
        message: 'TEMPLATE requires at least one template',
      });
    }
    if (scope.mode === 'REQUIREMENT' && scope.requirement_guids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requirement_guids'],
        message: 'REQUIREMENT requires at least one requirement',
      });
    }
  });

const baseObject = z.object({
  name: z.string().trim().min(2).max(128),
  active: z.boolean().default(false),

  min_rest_days_per_week: z.number().int().min(0).max(7).default(1),
  max_consecutive_work_days: z.number().int().min(1).max(366).nullable().default(6),
  max_weekly_minutes: z.number().int().min(1).max(10080).nullable().optional(),
  min_rest_minutes_between_shifts: z.number().int().min(0).max(2880).default(660),
  max_consecutive_guards: z.number().int().min(0).max(31).default(1),
  rest_after_guard_required: z.boolean().default(true),
  post_guard_rest_days: z.number().int().min(0).max(31).default(0),
  max_resting_employees_per_day: z.number().int().min(1).nullable().optional(),
  fairness_window_weeks: z.number().int().min(1).max(52).default(8),
  strict_coverage: z.boolean().default(true),

  weekly_leave_mode: weeklyLeaveModeSchema.default('PER_EMPLOYEE'),
  weekly_leave_employees_per_week: z.number().int().min(1).max(1000).default(1),
  weekly_leave_allowed_days: z
    .array(dayKeySchema)
    .min(1)
    .default(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    .refine((days) => new Set(days).size === days.length, {
      message: 'weekly_leave_allowed_days cannot contain duplicates',
    }),
  weekly_leave_rotation_anchor_date: isoDateSchema.nullable().optional(),
  weekly_leave_complete_weeks_only: z.boolean().default(true),
  post_guard_rest_counts_as_weekly_leave: z.boolean().default(false),

  weekly_leave_selector: employeeSelectorSchema.default({
    planning_modes: ['ROTATING'],
    guard_pool_relation: 'ANY',
  }),
  weekly_leave_days_per_employee: z.number().int().min(1).max(7).default(1),
  weekly_leave_count_mode: weeklyLeaveCountModeSchema.default('EXACT'),
  weekly_leave_max_employees_per_day: z.number().int().min(1).nullable().optional(),
  weekly_leave_require_work_on_other_days: z.boolean().default(false),
  weekly_leave_service_scope: serviceScopeSchema.default({
    mode: 'ANY',
    service_types: [],
    template_guids: [],
    requirement_guids: [],
    exclusive: false,
  }),

  guard_team_mode: guardTeamModeSchema.default('DAILY_FLEXIBLE'),
  guard_team_employees_per_week: z.number().int().min(1).max(1000).default(1),
  guard_team_selection_mode: guardTeamSelectionModeSchema.default('ROTATION_ORDER'),
  guard_team_rotation_anchor_date: isoDateSchema.nullable().optional(),
  guard_team_complete_weeks_only: z.boolean().default(true),
  guard_team_require_participation: z.boolean().default(true),
  guard_team_eligible_planning_modes: z
    .array(planningModeSchema)
    .min(1)
    .default(['ROTATING'])
    .refine((values) => new Set(values).size === values.length, {
      message: 'guard_team_eligible_planning_modes cannot contain duplicates',
    }),
  guard_team_member_service_access: guardMemberServiceAccessSchema.default('ANY_SERVICE'),
  guard_team_balance_mode: membershipBalanceModeSchema.default('NONE'),
  guard_team_max_membership_spread: z.number().int().min(0).max(52).nullable().optional(),
  guard_team_max_consecutive_membership_weeks: z
    .number()
    .int()
    .min(1)
    .max(52)
    .nullable()
    .optional(),

  solver_type: solverTypeSchema.default('GREEDY'),
  solver_timeout_seconds: z.number().int().min(1).max(300).default(20),
  fallback_to_greedy: z.boolean().default(true),
});

type ConfigShape = z.infer<typeof baseObject>;

function validatePolicy(data: ConfigShape, ctx: z.RefinementCtx): void {
  const requiresOrTools =
    data.weekly_leave_mode === 'TEAM_ROTATION' ||
    data.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE' ||
    data.guard_team_mode === 'WEEKLY_POOL';

  if (data.weekly_leave_mode === 'TEAM_ROTATION' && !data.weekly_leave_rotation_anchor_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['weekly_leave_rotation_anchor_date'],
      message: 'TEAM_ROTATION requires a rotation anchor date',
    });
  }

  if (data.weekly_leave_mode === 'PER_ELIGIBLE_EMPLOYEE') {
    if (
      data.weekly_leave_count_mode === 'EXACT' &&
      data.weekly_leave_days_per_employee > data.weekly_leave_allowed_days.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekly_leave_days_per_employee'],
        message: 'Exact leave days cannot exceed allowed days',
      });
    }

    if (
      data.weekly_leave_selector.guard_pool_relation !== 'ANY' &&
      data.guard_team_mode !== 'WEEKLY_POOL'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekly_leave_selector', 'guard_pool_relation'],
        message: 'A guard-pool relation requires WEEKLY_POOL',
      });
    }
  }

  if (
    data.guard_team_mode === 'WEEKLY_POOL' &&
    data.guard_team_selection_mode === 'ROTATION_ORDER' &&
    !data.guard_team_rotation_anchor_date
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guard_team_rotation_anchor_date'],
      message: 'WEEKLY_POOL with ROTATION_ORDER requires an anchor date',
    });
  }

  if (
    data.guard_team_mode === 'WEEKLY_POOL' &&
    !data.guard_team_eligible_planning_modes.includes('ROTATING')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guard_team_eligible_planning_modes'],
      message: 'The current solver requires ROTATING as a guard-pool eligible mode',
    });
  }

  if (data.guard_team_balance_mode === 'STRICT' && data.guard_team_max_membership_spread === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guard_team_max_membership_spread'],
      message: 'STRICT balance requires a maximum membership spread',
    });
  }

  if (requiresOrTools && data.solver_type !== 'ORTOOLS') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['solver_type'],
      message: 'This policy requires the ORTOOLS solver',
    });
  }

  if (requiresOrTools && data.fallback_to_greedy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fallback_to_greedy'],
      message: 'This policy cannot fallback to GREEDY',
    });
  }
}

export const createPlanningSuggestionConfigSchema = baseObject.superRefine(validatePolicy);

// Updates are merged into the loaded entity before its domain validation.
// The API validates the supplied field types here and the complete invariant in save().
export const updatePlanningSuggestionConfigSchema = baseObject.partial();

export const planningSuggestionConfigGuidSchema = z.string().trim().min(1).max(255);

function throwValidation(issues: z.ZodIssue[]): never {
  const first = issues[0]!;
  const error: any = new Error(first.message);
  error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
  throw error;
}

export function validatePlanningSuggestionConfigCreation(data: unknown) {
  const result = createPlanningSuggestionConfigSchema.safeParse(data);
  if (!result.success) throwValidation(result.error.issues);
  return result.data;
}

export function validatePlanningSuggestionConfigUpdate(data: unknown) {
  const result = updatePlanningSuggestionConfigSchema.safeParse(data);
  if (!result.success) throwValidation(result.error.issues);
  return result.data;
}

export function validatePlanningSuggestionConfigGuid(data: unknown) {
  const result = planningSuggestionConfigGuidSchema.safeParse(data);
  if (!result.success) {
    const error: any = new Error('Invalid planning suggestion configuration GUID');
    error.code = 'PLANNING_SUGGESTION_CONFIG_INVALID_GUID';
    throw error;
  }
  return result.data;
}

export type CreatePlanningSuggestionConfigInput = z.infer<
  typeof createPlanningSuggestionConfigSchema
>;
export type UpdatePlanningSuggestionConfigInput = z.infer<
  typeof updatePlanningSuggestionConfigSchema
>;
