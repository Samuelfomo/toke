import { z } from 'zod';

const dayKeySchema = z.enum([
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]);

const solverTypeSchema = z.enum(['GREEDY', 'ORTOOLS']);
const weeklyLeaveModeSchema = z.enum([
  'NONE',
  'PER_EMPLOYEE',
  'TEAM_ROTATION',
]);
const guardTeamModeSchema = z.enum([
  'DAILY_FLEXIBLE',
  'WEEKLY_POOL',
]);
const guardTeamSelectionModeSchema = z.enum([
  'ROTATION_ORDER',
  'OPTIMIZED',
]);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

const baseObject = z.object({
  name: z.string().trim().min(2).max(128),
  active: z.boolean().default(false),

  // Used only when weekly_leave_mode = PER_EMPLOYEE.
  min_rest_days_per_week: z.number().int().min(0).max(7).default(1),

  // null disables this rule. Plateau uses null because employees who are not
  // selected for weekly leave may work seven consecutive days or more.
  max_consecutive_work_days: z
    .number()
    .int()
    .min(1)
    .max(366)
    .nullable()
    .default(6),

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

  guard_team_mode: guardTeamModeSchema.default('DAILY_FLEXIBLE'),
  guard_team_employees_per_week: z.number().int().min(1).max(1000).default(1),
  guard_team_selection_mode: guardTeamSelectionModeSchema.default('ROTATION_ORDER'),
  guard_team_rotation_anchor_date: isoDateSchema.nullable().optional(),
  guard_team_complete_weeks_only: z.boolean().default(true),
  guard_team_require_participation: z.boolean().default(true),

  solver_type: solverTypeSchema.default('GREEDY'),
  solver_timeout_seconds: z.number().int().min(1).max(300).default(20),
  fallback_to_greedy: z.boolean().default(true),
});

function validatePolicy(
  data: z.infer<typeof baseObject>,
  ctx: z.RefinementCtx,
): void {
  const requiresOrTools =
    data.weekly_leave_mode === 'TEAM_ROTATION' ||
    data.guard_team_mode === 'WEEKLY_POOL';

  if (data.weekly_leave_mode === 'TEAM_ROTATION') {
    if (!data.weekly_leave_rotation_anchor_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekly_leave_rotation_anchor_date'],
        message: 'TEAM_ROTATION requires a rotation anchor date',
      });
    }
  }

  if (data.guard_team_mode === 'WEEKLY_POOL') {
    if (
      data.guard_team_selection_mode === 'ROTATION_ORDER' &&
      !data.guard_team_rotation_anchor_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guard_team_rotation_anchor_date'],
        message: 'WEEKLY_POOL with ROTATION_ORDER requires a rotation anchor date',
      });
    }
  }

  if (requiresOrTools && data.solver_type !== 'ORTOOLS') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['solver_type'],
      message: 'TEAM_ROTATION and WEEKLY_POOL require the ORTOOLS solver',
    });
  }

  if (requiresOrTools && data.fallback_to_greedy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fallback_to_greedy'],
      message: 'TEAM_ROTATION and WEEKLY_POOL cannot fallback to GREEDY',
    });
  }
}

export const createPlanningSuggestionConfigSchema =
  baseObject.superRefine(validatePolicy);

export const updatePlanningSuggestionConfigSchema =
  baseObject.partial();

export const planningSuggestionConfigGuidSchema =
  z.string().trim().min(1).max(255);

export function validatePlanningSuggestionConfigCreation(data: unknown) {
  const result = createPlanningSuggestionConfigSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0]!;
    const error: any = new Error(first.message);
    error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
    throw error;
  }
  return result.data;
}

export function validatePlanningSuggestionConfigUpdate(data: unknown) {
  const result = updatePlanningSuggestionConfigSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0]!;
    const error: any = new Error(first.message);
    error.code = 'PLANNING_SUGGESTION_CONFIG_VALIDATION_FAILED';
    throw error;
  }
  return result.data;
}

export function validatePlanningSuggestionConfigGuid(data: unknown) {
  const result = planningSuggestionConfigGuidSchema.safeParse(data);
  if (!result.success) {
    const error: any = new Error(
      'Invalid planning suggestion configuration GUID',
    );
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
