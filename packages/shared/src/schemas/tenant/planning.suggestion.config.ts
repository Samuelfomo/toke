import { z } from 'zod';

const solverTypeSchema = z.enum(['GREEDY', 'ORTOOLS']);

const basePlanningSuggestionConfigSchema = z.object({
  name: z.string().trim().min(2).max(128),

  active: z.boolean().default(false),

  min_rest_days_per_week: z.number().int().min(0).max(7).default(1),

  max_consecutive_work_days: z.number().int().min(1).max(31).default(6),

  max_weekly_minutes: z.number().int().min(1).max(10080).nullable().optional(),

  min_rest_minutes_between_shifts: z.number().int().min(0).max(2880).default(660),

  max_consecutive_guards: z.number().int().min(0).max(31).default(1),

  rest_after_guard_required: z.boolean().default(true),

  post_guard_rest_days: z.number().int().min(0).max(31).default(0),

  max_resting_employees_per_day: z.number().int().min(1).nullable().optional(),

  fairness_window_weeks: z.number().int().min(1).max(52).default(8),

  strict_coverage: z.boolean().default(true),

  solver_type: solverTypeSchema.default('GREEDY'),

  solver_timeout_seconds: z.number().int().min(1).max(300).default(20),

  fallback_to_greedy: z.boolean().default(true),
});

export const createPlanningSuggestionConfigSchema = basePlanningSuggestionConfigSchema;

export const updatePlanningSuggestionConfigSchema = basePlanningSuggestionConfigSchema.partial();

export const planningSuggestionConfigGuidSchema = z.string().trim().min(1).max(255);

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
