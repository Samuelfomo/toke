import { z } from 'zod';

const baseEmployeePlanningProfileSchema = z
  .object({
    user: z.string().trim().min(1).max(255),

    planning_mode: z.enum(['FIXED', 'ROTATING', 'EXCLUDED']),

    fixed_session_template: z.string().trim().min(1).max(255).nullable().optional(),

    fixed_rest_day_mode: z.enum(['TEMPLATE', 'ROTATING']).default('TEMPLATE'),

    rotation_order: z.number().int().min(0).nullable().optional(),

    max_weekly_minutes: z.number().int().min(1).max(10080).nullable().optional(),

    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.planning_mode === 'FIXED' && !data.fixed_session_template) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixed_session_template'],
        message: 'fixed_session_template is required for a FIXED employee',
      });
    }

    if (data.planning_mode !== 'FIXED' && data.fixed_session_template) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixed_session_template'],
        message: 'fixed_session_template is only allowed for a FIXED employee',
      });
    }

    if (data.planning_mode !== 'FIXED' && data.fixed_rest_day_mode === 'ROTATING') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixed_rest_day_mode'],
        message: 'fixed_rest_day_mode ROTATING is only allowed for a FIXED employee',
      });
    }
  });

export const createEmployeePlanningProfileSchema = baseEmployeePlanningProfileSchema;

export const updateEmployeePlanningProfileSchema = z
  .object({
    planning_mode: z.enum(['FIXED', 'ROTATING', 'EXCLUDED']).optional(),
    fixed_session_template: z.string().trim().min(1).max(255).nullable().optional(),
    fixed_rest_day_mode: z.enum(['TEMPLATE', 'ROTATING']).optional(),
    rotation_order: z.number().int().min(0).nullable().optional(),
    max_weekly_minutes: z.number().int().min(1).max(10080).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const employeePlanningProfileGuidSchema = z.string().trim().min(1).max(255);

export function validateEmployeePlanningProfileCreation(data: unknown) {
  const result = createEmployeePlanningProfileSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0]!;
    const error: any = new Error(first.message);
    error.code = 'EMPLOYEE_PLANNING_PROFILE_VALIDATION_FAILED';
    throw error;
  }
  return result.data;
}

export function validateEmployeePlanningProfileUpdate(data: unknown) {
  const result = updateEmployeePlanningProfileSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0]!;
    const error: any = new Error(first.message);
    error.code = 'EMPLOYEE_PLANNING_PROFILE_VALIDATION_FAILED';
    throw error;
  }
  return result.data;
}

export function validateEmployeePlanningProfileGuid(data: unknown) {
  const result = employeePlanningProfileGuidSchema.safeParse(data);
  if (!result.success) {
    const error: any = new Error('Invalid employee planning profile GUID');
    error.code = 'EMPLOYEE_PLANNING_PROFILE_INVALID_GUID';
    throw error;
  }
  return result.data;
}

export type CreateEmployeePlanningProfileInput = z.infer<
  typeof createEmployeePlanningProfileSchema
>;

export type UpdateEmployeePlanningProfileInput = z.infer<
  typeof updateEmployeePlanningProfileSchema
>;
