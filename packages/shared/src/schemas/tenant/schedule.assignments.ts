// schemas/schedule_assignments.ts
import { z } from 'zod';

import {
  SCHEDULE_ASSIGNMENTS_CODES,
  SCHEDULE_ASSIGNMENTS_DEFAULTS,
  SCHEDULE_ASSIGNMENTS_ERRORS,
  SCHEDULE_ASSIGNMENTS_VALIDATION,
  ScheduleAssignmentsCode,
} from '../../constants/tenant/schedule.assignments.js';

// Base schema for common validations
const baseScheduleAssignmentSchema = z.object({
  // tenant: z
  //   .string({
  //     required_error: SCHEDULE_EXCEPTION_ERRORS.TENANT_REQUIRED,
  //     invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.TENANT_INVALID,
  //   })
  //   .min(SCHEDULE_EXCEPTION_VALIDATION.TENANT.MIN_LENGTH, SCHEDULE_EXCEPTION_ERRORS.TENANT_INVALID)
  //   .max(SCHEDULE_EXCEPTION_VALIDATION.TENANT.MAX_LENGTH, SCHEDULE_EXCEPTION_ERRORS.TENANT_INVALID)
  //   .trim(),

  user: z
    .string({
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.USER_INVALID,
    })
    .trim()
    .min(SCHEDULE_ASSIGNMENTS_VALIDATION.USER.MIN_LENGTH, SCHEDULE_ASSIGNMENTS_ERRORS.USER_INVALID)
    .max(SCHEDULE_ASSIGNMENTS_VALIDATION.USER.MAX_LENGTH, SCHEDULE_ASSIGNMENTS_ERRORS.USER_INVALID)
    .nullable()
    .optional(),

  groups: z
    .string({
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_INVALID,
    })
    .trim()
    .min(
      SCHEDULE_ASSIGNMENTS_VALIDATION.GROUPS.MIN_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_INVALID,
    )
    .max(
      SCHEDULE_ASSIGNMENTS_VALIDATION.GROUPS.MAX_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.GROUPS_INVALID,
    )
    .nullable()
    .optional(),

  session_template: z
    .string({
      required_error: SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_REQUIRED,
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_INVALID,
    })
    .trim()
    .min(
      SCHEDULE_ASSIGNMENTS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_INVALID,
    )
    .max(
      SCHEDULE_ASSIGNMENTS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.SESSION_TEMPLATE_INVALID,
    ),

  start_date: z
    .string({
      required_error: SCHEDULE_ASSIGNMENTS_ERRORS.START_DATE_REQUIRED,
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.START_DATE_INVALID,
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, SCHEDULE_ASSIGNMENTS_ERRORS.START_DATE_INVALID)
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: SCHEDULE_ASSIGNMENTS_ERRORS.START_DATE_INVALID },
    ),

  end_date: z
    .string({
      // required_error: SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_REQUIRED,
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_INVALID,
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_INVALID)
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_INVALID },
    )
    .optional()
    .nullable(),

  created_by: z
    .string({
      required_error: SCHEDULE_ASSIGNMENTS_ERRORS.CREATED_BY_REQUIRED,
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.CREATED_BY_INVALID,
    })
    .trim()
    .min(
      SCHEDULE_ASSIGNMENTS_VALIDATION.CREATED_BY.MIN_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.CREATED_BY_INVALID,
    )
    .max(
      SCHEDULE_ASSIGNMENTS_VALIDATION.CREATED_BY.MAX_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.CREATED_BY_INVALID,
    ),
  // .nullable()
  // .optional(),

  reason: z
    .string({
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.REASON_INVALID,
    })
    .min(
      SCHEDULE_ASSIGNMENTS_VALIDATION.REASON.MIN_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.REASON_INVALID,
    )
    .max(
      SCHEDULE_ASSIGNMENTS_VALIDATION.REASON.MAX_LENGTH,
      SCHEDULE_ASSIGNMENTS_ERRORS.REASON_INVALID,
    )
    .trim()
    .nullable()
    .optional(),

  active: z
    .boolean({
      invalid_type_error: SCHEDULE_ASSIGNMENTS_ERRORS.ACTIVE_INVALID,
    })
    .default(SCHEDULE_ASSIGNMENTS_DEFAULTS.ACTIVE),
});

// Schema for creation - all fields required
export const createScheduleAssignmentSchema = baseScheduleAssignmentSchema
  .refine(
    (data) => {
      // Either user or groups must be specified, but not both
      const hasUser = data.user !== null && data.user !== undefined;
      const hasGroups = data.groups !== null && data.groups !== undefined;
      return hasUser !== hasGroups; // XOR: exactly one must be true
    },
    {
      message: SCHEDULE_ASSIGNMENTS_ERRORS.USER_OR_GROUPS_REQUIRED,
    },
  )
  .refine(
    (data) => {
      // end_date must be after or equal to start_date
      const startDate = new Date(data.start_date);
      const endDate = data.end_date ? new Date(data.end_date) : null;
      if (endDate !== null) {
        return endDate >= startDate;
      }
      return true;
    },
    {
      message: SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_BEFORE_START,
      path: ['end_date'],
    },
  );

// Schema for updates - all fields optional
export const updateScheduleAssignmentSchema = baseScheduleAssignmentSchema
  .partial()
  .refine(
    (data) => {
      // Either user or groups must be specified, but not both
      const hasUser = data.user !== null && data.user !== undefined;
      const hasGroups = data.groups !== null && data.groups !== undefined;
      return hasUser !== hasGroups; // XOR: exactly one must be true
    },
    {
      message: SCHEDULE_ASSIGNMENTS_ERRORS.USER_OR_GROUPS_REQUIRED,
    },
  )
  .refine(
    (data) => {
      // end_date must be after or equal to start_date
      const startDate = new Date(data.start_date!);
      const endDate = data.end_date ? new Date(data.end_date) : null;
      if (endDate !== null) {
        return endDate >= startDate;
      }
      return true;
    },
    {
      message: SCHEDULE_ASSIGNMENTS_ERRORS.END_DATE_BEFORE_START,
      path: ['end_date'],
    },
  );

// Schema for filters
export const scheduleAssignmentsFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    user: z.number().int().optional(),
    groups: z.number().int().optional(),
    session_template: z.number().int().optional(),
    active: z.boolean().optional(),
    start_date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    start_date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end_date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end_date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    created_by: z.number().int().optional(),
  })
  .strict();

// Schema for GUID validation
export const scheduleAssignmentsGuidSchema = z
  .string()
  .min(SCHEDULE_ASSIGNMENTS_VALIDATION.GUID.MIN_LENGTH, SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID)
  .max(SCHEDULE_ASSIGNMENTS_VALIDATION.GUID.MAX_LENGTH, SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID);

// Shared constant for field -> code mapping
const FIELD_TO_CODE_MAP: Record<string, ScheduleAssignmentsCode> = {
  tenant: SCHEDULE_ASSIGNMENTS_CODES.TENANT_INVALID,
  user: SCHEDULE_ASSIGNMENTS_CODES.USER_INVALID,
  groups: SCHEDULE_ASSIGNMENTS_CODES.GROUPS_INVALID,
  session_template: SCHEDULE_ASSIGNMENTS_CODES.SESSION_TEMPLATE_INVALID,
  start_date: SCHEDULE_ASSIGNMENTS_CODES.START_DATE_INVALID,
  end_date: SCHEDULE_ASSIGNMENTS_CODES.END_DATE_INVALID,
  created_by: SCHEDULE_ASSIGNMENTS_CODES.CREATED_BY_INVALID,
  reason: SCHEDULE_ASSIGNMENTS_CODES.REASON_INVALID,
  active: SCHEDULE_ASSIGNMENTS_CODES.ACTIVE_INVALID,
};

// Validation function for creation
export const validateScheduleAssignmentsCreation = (data: any) => {
  const result = createScheduleAssignmentSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || SCHEDULE_ASSIGNMENTS_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Validation function for update
export const validateScheduleAssignmentsUpdate = (data: any) => {
  const result = updateScheduleAssignmentSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || SCHEDULE_ASSIGNMENTS_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateScheduleAssignmentsFilters = (data: any) => {
  const result = scheduleAssignmentsFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = SCHEDULE_ASSIGNMENTS_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateScheduleAssignmentsGuid = (guid: any) => {
  const result = scheduleAssignmentsGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(SCHEDULE_ASSIGNMENTS_ERRORS.GUID_INVALID);
    error.code = SCHEDULE_ASSIGNMENTS_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Complete schema for responses (with metadata)
export const scheduleAssignmentsResponseSchema = baseScheduleAssignmentSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Grouped export for easier imports
export const scheduleAssignmentSchemas = {
  validateScheduleAssignmentsCreation: validateScheduleAssignmentsCreation,
  validateScheduleAssignmentsUpdate: validateScheduleAssignmentsUpdate,
  validateScheduleAssignmentsFilters: validateScheduleAssignmentsFilters,
  validateScheduleAssignmentsGuid: validateScheduleAssignmentsGuid,
  createScheduleAssignmentSchema: createScheduleAssignmentSchema,
  updateScheduleAssignmentSchema: updateScheduleAssignmentSchema,
  scheduleAssignmentsFiltersSchema: scheduleAssignmentsFiltersSchema,
  scheduleAssignmentsGuidSchema: scheduleAssignmentsGuidSchema,
};

// TypeScript types generated from schemas
export type CreateScheduleAssignmentsInput = z.infer<typeof createScheduleAssignmentSchema>;
export type UpdateScheduleAssignmentsInput = z.infer<typeof updateScheduleAssignmentSchema>;
export type ScheduleAssignmentsData = z.infer<typeof scheduleAssignmentsResponseSchema>;
export type ScheduleAssignmentsFilters = z.infer<typeof scheduleAssignmentsFiltersSchema>;
