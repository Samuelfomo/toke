import { z } from 'zod';

const dayOfWeekSchema = z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

const serviceTypeSchema = z.enum(['STANDARD', 'GUARD']);

const allocationModeSchema = z.enum(['EXACT', 'RANGE', 'FILL_REMAINING']);

const createBaseSchema = z
  .object({
    session_template: z.string().trim().min(1).max(255),

    continuation_template: z.string().trim().min(1).max(255).nullable().optional(),

    continuation_day_offset: z.number().int().min(0).max(1).default(0),

    day_of_week: dayOfWeekSchema,

    service_type: serviceTypeSchema.default('STANDARD'),

    allocation_mode: allocationModeSchema.default('RANGE'),

    min_employees: z.number().int().min(0).default(0),

    target_employees: z.number().int().min(0),

    max_employees: z.number().int().min(0).nullable().optional(),

    priority: z.number().int().min(1).max(1000).default(100),

    active: z.boolean().default(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.target_employees < data.min_employees) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_employees'],
        message: 'target_employees must be greater than or equal to min_employees',
      });
    }

    if (
      data.max_employees !== null &&
      data.max_employees !== undefined &&
      data.max_employees < data.target_employees
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_employees'],
        message: 'max_employees must be greater than or equal to target_employees',
      });
    }

    if (data.allocation_mode === 'EXACT') {
      if (data.max_employees === null || data.max_employees === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['max_employees'],
          message: 'max_employees is required for an EXACT requirement',
        });
      } else if (
        !(
          data.min_employees === data.target_employees &&
          data.target_employees === data.max_employees
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allocation_mode'],
          message: 'EXACT requires min_employees, target_employees and max_employees to be equal',
        });
      }
    }

    if (data.allocation_mode === 'FILL_REMAINING' && data.service_type !== 'STANDARD') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allocation_mode'],
        message: 'FILL_REMAINING is only allowed for a STANDARD requirement',
      });
    }

    if (data.service_type === 'GUARD') {
      if (!data.continuation_template) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['continuation_template'],
          message: 'continuation_template is required for a GUARD requirement',
        });
      }

      if (data.continuation_day_offset !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['continuation_day_offset'],
          message: 'continuation_day_offset must be 1 for a GUARD requirement',
        });
      }

      return;
    }

    if (data.continuation_template) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['continuation_template'],
        message: 'continuation_template is only allowed for a GUARD requirement',
      });
    }

    if (data.continuation_day_offset !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['continuation_day_offset'],
        message: 'continuation_day_offset must be 0 for a STANDARD requirement',
      });
    }
  });

export const createPlanningSuggestionRequirementSchema = createBaseSchema;

/**
 * La validation croisée complète d'une mise à jour se fait après fusion avec
 * l'état actuel dans la route, puis dans la classe métier.
 */
export const updatePlanningSuggestionRequirementSchema = z
  .object({
    session_template: z.string().trim().min(1).max(255).optional(),

    continuation_template: z.string().trim().min(1).max(255).nullable().optional(),

    continuation_day_offset: z.number().int().min(0).max(1).optional(),

    day_of_week: dayOfWeekSchema.optional(),

    service_type: serviceTypeSchema.optional(),

    allocation_mode: allocationModeSchema.optional(),

    min_employees: z.number().int().min(0).optional(),

    target_employees: z.number().int().min(0).optional(),

    max_employees: z.number().int().min(0).nullable().optional(),

    priority: z.number().int().min(1).max(1000).optional(),

    active: z.boolean().optional(),
  })
  .strict();

export const planningSuggestionRequirementGuidSchema = z.string().trim().min(1).max(255);

function throwFirst(result: z.SafeParseError<any>): never {
  const first = result.error.issues[0]!;
  const error: any = new Error(first.message);
  error.code = 'PLANNING_SUGGESTION_REQUIREMENT_VALIDATION_FAILED';
  throw error;
}

export function validatePlanningSuggestionRequirementCreation(data: unknown) {
  const result = createPlanningSuggestionRequirementSchema.safeParse(data);
  if (!result.success) throwFirst(result);
  return result.data;
}

export function validatePlanningSuggestionRequirementUpdate(data: unknown) {
  const result = updatePlanningSuggestionRequirementSchema.safeParse(data);
  if (!result.success) throwFirst(result);
  return result.data;
}

export function validatePlanningSuggestionRequirementGuid(data: unknown) {
  const result = planningSuggestionRequirementGuidSchema.safeParse(data);

  if (!result.success) {
    const error: any = new Error('Invalid planning suggestion requirement GUID');
    error.code = 'PLANNING_SUGGESTION_REQUIREMENT_INVALID_GUID';
    throw error;
  }

  return result.data;
}

export type CreatePlanningSuggestionRequirementInput = z.infer<
  typeof createPlanningSuggestionRequirementSchema
>;

export type UpdatePlanningSuggestionRequirementInput = z.infer<
  typeof updatePlanningSuggestionRequirementSchema
>;
