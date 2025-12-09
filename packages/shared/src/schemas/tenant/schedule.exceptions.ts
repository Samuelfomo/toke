// schemas/schedule_exceptions.ts
import { z } from 'zod';

import {
  SCHEDULE_EXCEPTION_CODES,
  SCHEDULE_EXCEPTION_DEFAULTS,
  SCHEDULE_EXCEPTION_ERRORS,
  SCHEDULE_EXCEPTION_VALIDATION,
  ScheduleExceptionCode,
} from '../../constants/tenant/schedule.exceptions.js';

// Base schema for common validations
const baseScheduleExceptionSchema = z.object({
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
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.USER_INVALID,
    })
    .trim()
    .min(SCHEDULE_EXCEPTION_VALIDATION.USER.MIN_LENGTH, SCHEDULE_EXCEPTION_ERRORS.USER_INVALID)
    .max(SCHEDULE_EXCEPTION_VALIDATION.USER.MAX_LENGTH, SCHEDULE_EXCEPTION_ERRORS.USER_INVALID)
    .nullable()
    .optional(),

  group: z
    .string({
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.GROUP_INVALID,
    })
    .trim()
    .min(SCHEDULE_EXCEPTION_VALIDATION.GROUP.MIN_LENGTH, SCHEDULE_EXCEPTION_ERRORS.GROUP_INVALID)
    .max(SCHEDULE_EXCEPTION_VALIDATION.GROUP.MAX_LENGTH, SCHEDULE_EXCEPTION_ERRORS.GROUP_INVALID)
    .nullable()
    .optional(),

  session_template: z
    .string({
      required_error: SCHEDULE_EXCEPTION_ERRORS.SESSION_TEMPLATE_REQUIRED,
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.SESSION_TEMPLATE_INVALID,
    })
    .trim()
    .min(
      SCHEDULE_EXCEPTION_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH,
      SCHEDULE_EXCEPTION_ERRORS.SESSION_TEMPLATE_INVALID,
    )
    .max(
      SCHEDULE_EXCEPTION_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH,
      SCHEDULE_EXCEPTION_ERRORS.SESSION_TEMPLATE_INVALID,
    ),

  start_date: z
    .string({
      required_error: SCHEDULE_EXCEPTION_ERRORS.START_DATE_REQUIRED,
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.START_DATE_INVALID,
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, SCHEDULE_EXCEPTION_ERRORS.START_DATE_INVALID)
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: SCHEDULE_EXCEPTION_ERRORS.START_DATE_INVALID },
    ),

  end_date: z
    .string({
      required_error: SCHEDULE_EXCEPTION_ERRORS.END_DATE_REQUIRED,
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.END_DATE_INVALID,
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, SCHEDULE_EXCEPTION_ERRORS.END_DATE_INVALID)
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: SCHEDULE_EXCEPTION_ERRORS.END_DATE_INVALID },
    ),

  created_by: z
    .string({
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.CREATED_BY_INVALID,
    })
    .trim()
    .min(
      SCHEDULE_EXCEPTION_VALIDATION.CREATED_BY.MIN_LENGTH,
      SCHEDULE_EXCEPTION_ERRORS.CREATED_BY_INVALID,
    )
    .max(
      SCHEDULE_EXCEPTION_VALIDATION.CREATED_BY.MAX_LENGTH,
      SCHEDULE_EXCEPTION_ERRORS.CREATED_BY_INVALID,
    )
    .nullable()
    .optional(),

  reason: z
    .string({
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.REASON_INVALID,
    })
    .min(SCHEDULE_EXCEPTION_VALIDATION.REASON.MIN_LENGTH, SCHEDULE_EXCEPTION_ERRORS.REASON_INVALID)
    .max(SCHEDULE_EXCEPTION_VALIDATION.REASON.MAX_LENGTH, SCHEDULE_EXCEPTION_ERRORS.REASON_INVALID)
    .trim()
    .nullable()
    .optional(),

  active: z
    .boolean({
      invalid_type_error: SCHEDULE_EXCEPTION_ERRORS.ACTIVE_INVALID,
    })
    .default(SCHEDULE_EXCEPTION_DEFAULTS.ACTIVE),
});

// Schema for creation - all fields required
export const createScheduleExceptionSchema = baseScheduleExceptionSchema
  .refine(
    (data) => {
      // Either user or group must be specified, but not both
      const hasUser = data.user !== null && data.user !== undefined;
      const hasGroup = data.group !== null && data.group !== undefined;
      return hasUser !== hasGroup; // XOR: exactly one must be true
    },
    {
      message: SCHEDULE_EXCEPTION_ERRORS.USER_OR_GROUP_REQUIRED,
    },
  )
  .refine(
    (data) => {
      // end_date must be after or equal to start_date
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      return endDate >= startDate;
    },
    {
      message: SCHEDULE_EXCEPTION_ERRORS.END_DATE_BEFORE_START,
      path: ['end_date'],
    },
  );

// Schema for updates - all fields optional
export const updateScheduleExceptionSchema = baseScheduleExceptionSchema
  .partial()
  .refine(
    (data) => {
      // Either user or group must be specified, but not both
      const hasUser = data.user !== null && data.user !== undefined;
      const hasGroup = data.group !== null && data.group !== undefined;
      return hasUser !== hasGroup; // XOR: exactly one must be true
    },
    {
      message: SCHEDULE_EXCEPTION_ERRORS.USER_OR_GROUP_REQUIRED,
    },
  )
  .refine(
    (data) => {
      // end_date must be after or equal to start_date
      const startDate = new Date(data.start_date!);
      const endDate = new Date(data.end_date!);
      return endDate >= startDate;
    },
    {
      message: SCHEDULE_EXCEPTION_ERRORS.END_DATE_BEFORE_START,
      path: ['end_date'],
    },
  );

// Schema for filters
export const scheduleExceptionFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    user: z.number().int().optional(),
    group: z.number().int().optional(),
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
export const scheduleExceptionGuidSchema = z
  .string()
  .min(SCHEDULE_EXCEPTION_VALIDATION.GUID.MIN_LENGTH, SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID)
  .max(SCHEDULE_EXCEPTION_VALIDATION.GUID.MAX_LENGTH, SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID);

// Shared constant for field -> code mapping
const FIELD_TO_CODE_MAP: Record<string, ScheduleExceptionCode> = {
  tenant: SCHEDULE_EXCEPTION_CODES.TENANT_INVALID,
  user: SCHEDULE_EXCEPTION_CODES.USER_INVALID,
  group: SCHEDULE_EXCEPTION_CODES.GROUP_INVALID,
  session_template: SCHEDULE_EXCEPTION_CODES.SESSION_TEMPLATE_INVALID,
  start_date: SCHEDULE_EXCEPTION_CODES.START_DATE_INVALID,
  end_date: SCHEDULE_EXCEPTION_CODES.END_DATE_INVALID,
  created_by: SCHEDULE_EXCEPTION_CODES.CREATED_BY_INVALID,
  reason: SCHEDULE_EXCEPTION_CODES.REASON_INVALID,
  active: SCHEDULE_EXCEPTION_CODES.ACTIVE_INVALID,
};

// Validation function for creation
export const validateScheduleExceptionCreation = (data: any) => {
  const result = createScheduleExceptionSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || SCHEDULE_EXCEPTION_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Validation function for update
export const validateScheduleExceptionUpdate = (data: any) => {
  const result = updateScheduleExceptionSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || SCHEDULE_EXCEPTION_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateScheduleExceptionFilters = (data: any) => {
  const result = scheduleExceptionFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = SCHEDULE_EXCEPTION_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateScheduleExceptionGuid = (guid: any) => {
  const result = scheduleExceptionGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(SCHEDULE_EXCEPTION_ERRORS.GUID_INVALID);
    error.code = SCHEDULE_EXCEPTION_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Complete schema for responses (with metadata)
export const scheduleExceptionResponseSchema = baseScheduleExceptionSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Grouped export for easier imports
export const scheduleExceptionSchemas = {
  validateScheduleExceptionCreation,
  validateScheduleExceptionUpdate,
  validateScheduleExceptionFilters,
  validateScheduleExceptionGuid,
  createScheduleExceptionSchema,
  updateScheduleExceptionSchema,
  scheduleExceptionFiltersSchema,
  scheduleExceptionGuidSchema,
};

// TypeScript types generated from schemas
export type CreateScheduleExceptionInput = z.infer<typeof createScheduleExceptionSchema>;
export type UpdateScheduleExceptionInput = z.infer<typeof updateScheduleExceptionSchema>;
export type ScheduleExceptionData = z.infer<typeof scheduleExceptionResponseSchema>;
export type ScheduleExceptionFilters = z.infer<typeof scheduleExceptionFiltersSchema>;
