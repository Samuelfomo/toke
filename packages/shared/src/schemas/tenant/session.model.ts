// validation/tenant/session.model.schema.ts
import { z } from 'zod';

import {
  SESSION_MODEL_CODES,
  SESSION_MODEL_ERRORS,
  SESSION_MODEL_VALIDATION,
  SessionModelCode,
  VALID_WORKDAYS,
} from '../../constants/tenant/session.model.js';

// ─── Base schema ─────────────────────────────────────────────────────────────

const baseSchema = z.object({
  name: z
    .string({ required_error: SESSION_MODEL_ERRORS.NAME_REQUIRED })
    .min(SESSION_MODEL_VALIDATION.NAME.MIN_LENGTH, SESSION_MODEL_ERRORS.NAME_INVALID)
    .max(SESSION_MODEL_VALIDATION.NAME.MAX_LENGTH, SESSION_MODEL_ERRORS.NAME_INVALID)
    .trim(),

  workday: z
    .array(
      z.enum(VALID_WORKDAYS, {
        errorMap: () => ({ message: SESSION_MODEL_ERRORS.WORKDAY_INVALID }),
      }),
      {
        required_error: SESSION_MODEL_ERRORS.WORKDAY_REQUIRED,
        invalid_type_error: SESSION_MODEL_ERRORS.WORKDAY_INVALID,
      },
    )
    .min(SESSION_MODEL_VALIDATION.WORKDAY.MIN_COUNT, SESSION_MODEL_ERRORS.WORKDAY_INVALID)
    .max(SESSION_MODEL_VALIDATION.WORKDAY.MAX_COUNT, SESSION_MODEL_ERRORS.WORKDAY_INVALID)
    .refine((days) => new Set(days).size === days.length, {
      message: 'workday must not contain duplicate days',
    }),

  max_working_time: z
    .number({ required_error: SESSION_MODEL_ERRORS.MAX_WORKING_TIME_REQUIRED })
    .int(SESSION_MODEL_ERRORS.MAX_WORKING_TIME_INVALID)
    .min(SESSION_MODEL_VALIDATION.WORKING_TIME.MIN, SESSION_MODEL_ERRORS.MAX_WORKING_TIME_INVALID)
    .max(SESSION_MODEL_VALIDATION.WORKING_TIME.MAX, SESSION_MODEL_ERRORS.MAX_WORKING_TIME_INVALID),

  min_working_time: z
    .number({ required_error: SESSION_MODEL_ERRORS.MIN_WORKING_TIME_REQUIRED })
    .int(SESSION_MODEL_ERRORS.MIN_WORKING_TIME_INVALID)
    .min(SESSION_MODEL_VALIDATION.WORKING_TIME.MIN, SESSION_MODEL_ERRORS.MIN_WORKING_TIME_INVALID)
    .max(SESSION_MODEL_VALIDATION.WORKING_TIME.MAX, SESSION_MODEL_ERRORS.MIN_WORKING_TIME_INVALID),

  normal_session_time: z
    .number({ required_error: SESSION_MODEL_ERRORS.NORMAL_SESSION_TIME_REQUIRED })
    .int(SESSION_MODEL_ERRORS.NORMAL_SESSION_TIME_INVALID)
    .min(
      SESSION_MODEL_VALIDATION.WORKING_TIME.MIN,
      SESSION_MODEL_ERRORS.NORMAL_SESSION_TIME_INVALID,
    )
    .max(
      SESSION_MODEL_VALIDATION.WORKING_TIME.MAX,
      SESSION_MODEL_ERRORS.NORMAL_SESSION_TIME_INVALID,
    ),

  allowed_tolerance: z
    .number({ required_error: SESSION_MODEL_ERRORS.TOLERANCE_REQUIRED })
    .int(SESSION_MODEL_ERRORS.TOLERANCE_INVALID)
    .min(SESSION_MODEL_VALIDATION.TOLERANCE.MIN, SESSION_MODEL_ERRORS.TOLERANCE_INVALID)
    .max(SESSION_MODEL_VALIDATION.TOLERANCE.MAX, SESSION_MODEL_ERRORS.TOLERANCE_INVALID)
    .optional(),

  pause_allowed: z.boolean().default(false),

  pause_duration: z
    .number()
    .int(SESSION_MODEL_ERRORS.PAUSE_DURATION_INVALID)
    .min(SESSION_MODEL_VALIDATION.PAUSE_DURATION.MIN, SESSION_MODEL_ERRORS.PAUSE_DURATION_INVALID)
    .max(SESSION_MODEL_VALIDATION.PAUSE_DURATION.MAX, SESSION_MODEL_ERRORS.PAUSE_DURATION_INVALID)
    .optional(),

  pause_count: z
    .number()
    .int(SESSION_MODEL_ERRORS.PAUSE_COUNT_INVALID)
    .min(SESSION_MODEL_VALIDATION.PAUSE_COUNT.MIN, SESSION_MODEL_ERRORS.PAUSE_COUNT_INVALID)
    .max(SESSION_MODEL_VALIDATION.PAUSE_COUNT.MAX, SESSION_MODEL_ERRORS.PAUSE_COUNT_INVALID)
    .optional(),

  rotation_allowed: z.boolean().default(false),

  extra_allowed: z.boolean().default(false),

  extra_max: z
    .number()
    .int(SESSION_MODEL_ERRORS.EXTRA_MAX_INVALID)
    .min(SESSION_MODEL_VALIDATION.EXTRA_MAX.MIN, SESSION_MODEL_ERRORS.EXTRA_MAX_INVALID)
    .max(SESSION_MODEL_VALIDATION.EXTRA_MAX.MAX, SESSION_MODEL_ERRORS.EXTRA_MAX_INVALID)
    .optional(),

  leave_allowed: z.boolean().default(false),

  leave_eligibility_after_session: z
    .number()
    .int(SESSION_MODEL_ERRORS.LEAVE_ELIGIBILITY_INVALID)
    .min(
      SESSION_MODEL_VALIDATION.LEAVE_ELIGIBILITY.MIN,
      SESSION_MODEL_ERRORS.LEAVE_ELIGIBILITY_INVALID,
    )
    .max(
      SESSION_MODEL_VALIDATION.LEAVE_ELIGIBILITY.MAX,
      SESSION_MODEL_ERRORS.LEAVE_ELIGIBILITY_INVALID,
    )
    .optional(),

  leave_is_optional: z.boolean().default(false),

  created_by: z
    .string({
      required_error: SESSION_MODEL_ERRORS.CREATED_BY_REQUIRED,
      invalid_type_error: SESSION_MODEL_ERRORS.CREATED_BY_INVALID,
    })
    .min(SESSION_MODEL_VALIDATION.GUID.MIN_LENGTH, SESSION_MODEL_ERRORS.CREATED_BY_INVALID)
    .max(SESSION_MODEL_VALIDATION.GUID.MAX_LENGTH, SESSION_MODEL_ERRORS.CREATED_BY_INVALID)
    .trim(),

  active: z.boolean().default(true),
});

// ─── Cross-field refinements ──────────────────────────────────────────────────
// Factorisés pour éviter la duplication entre create et update

const applyRefinements = (data: any, ctx: z.RefinementCtx) => {
  // function applyRefinements(data: Partial<z.infer<typeof baseSchema>>, ctx: z.RefinementCtx): void {
  // min ≤ normal ≤ max
  if (
    data.min_working_time !== undefined &&
    data.normal_session_time !== undefined &&
    data.min_working_time > data.normal_session_time
  ) {
    ctx.addIssue({
      path: ['normal_session_time'],
      code: z.ZodIssueCode.custom,
      message: SESSION_MODEL_ERRORS.WORKING_TIME_INCONSISTENT,
    });
  }
  if (
    data.normal_session_time !== undefined &&
    data.max_working_time !== undefined &&
    data.normal_session_time > data.max_working_time
  ) {
    ctx.addIssue({
      path: ['normal_session_time'],
      code: z.ZodIssueCode.custom,
      message: SESSION_MODEL_ERRORS.WORKING_TIME_INCONSISTENT,
    });
  }

  // pause cohérence
  if (data.pause_allowed === true) {
    if (data.pause_duration == null) {
      ctx.addIssue({
        path: ['pause_duration'],
        code: z.ZodIssueCode.custom,
        message: SESSION_MODEL_ERRORS.PAUSE_DURATION_REQUIRED,
      });
    }
    if (data.pause_count == null) {
      ctx.addIssue({
        path: ['pause_count'],
        code: z.ZodIssueCode.custom,
        message: SESSION_MODEL_ERRORS.PAUSE_COUNT_REQUIRED,
      });
    }
  }
  if (data.pause_allowed === false) {
    if (data.pause_duration !== undefined) {
      ctx.addIssue({
        path: ['pause_duration'],
        code: z.ZodIssueCode.custom,
        message: 'pause_duration must not be provided when pause is disabled',
      });
    }
    if (data.pause_count !== undefined) {
      ctx.addIssue({
        path: ['pause_count'],
        code: z.ZodIssueCode.custom,
        message: 'pause_count must not be provided when pause is disabled',
      });
    }
  }

  // extra cohérence
  if (data.extra_allowed === true && (data.extra_max === undefined || data.extra_max === null)) {
    ctx.addIssue({
      path: ['extra_max'],
      code: z.ZodIssueCode.custom,
      message: SESSION_MODEL_ERRORS.EXTRA_MAX_REQUIRED,
    });
  }
  if (data.extra_allowed === false && data.extra_max !== undefined) {
    ctx.addIssue({
      path: ['extra_max'],
      code: z.ZodIssueCode.custom,
      message: 'extra_max must not be provided when extra is disabled',
    });
  }

  // leave cohérence
  if (data.leave_allowed === true && data.leave_eligibility_after_session == null) {
    ctx.addIssue({
      path: ['leave_eligibility_after_session'],
      code: z.ZodIssueCode.custom,
      message: SESSION_MODEL_ERRORS.LEAVE_ELIGIBILITY_REQUIRED,
    });
  }
  if (data.leave_allowed === false && data.leave_eligibility_after_session !== undefined) {
    ctx.addIssue({
      path: ['leave_eligibility_after_session'],
      code: z.ZodIssueCode.custom,
      message: 'leave_eligibility_after_session must not be provided when early leave is disabled',
    });
  }

  // tolerance vs normal session
  if (
    data.allowed_tolerance != null &&
    data.normal_session_time != null &&
    data.allowed_tolerance > data.normal_session_time
  ) {
    ctx.addIssue({
      path: ['allowed_tolerance'],
      code: z.ZodIssueCode.custom,
      message: 'tolerance cannot exceed normal session time',
    });
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────
export const createSessionModelSchema = baseSchema.superRefine(applyRefinements);
export const updateSessionModelSchema = baseSchema.partial().superRefine(applyRefinements);

export const sessionModelFiltersSchema = z
  .object({
    name: z.string().optional(),
    pause_allowed: z.boolean().optional(),
    rotation_allowed: z.boolean().optional(),
    extra_allowed: z.boolean().optional(),
    leave_allowed: z.boolean().optional(),
    active: z.boolean().optional(),
    created_by: z.string().optional(),
  })
  .strict();

export const sessionModelGuidSchema = z
  .string()
  .min(SESSION_MODEL_VALIDATION.GUID.MIN_LENGTH, SESSION_MODEL_ERRORS.GUID_INVALID)
  .max(SESSION_MODEL_VALIDATION.GUID.MAX_LENGTH, SESSION_MODEL_ERRORS.GUID_INVALID);

// ─── Validators ──────────────────────────────────────────────────────────────

const FIELD_TO_CODE: Record<string, SessionModelCode> = {
  name: SESSION_MODEL_CODES.NAME_INVALID,
  workday: SESSION_MODEL_CODES.WORKDAY_INVALID,
  max_working_time: SESSION_MODEL_CODES.MAX_WORKING_TIME_INVALID,
  min_working_time: SESSION_MODEL_CODES.MIN_WORKING_TIME_INVALID,
  normal_session_time: SESSION_MODEL_CODES.NORMAL_SESSION_TIME_INVALID,
  allowed_tolerance: SESSION_MODEL_CODES.TOLERANCE_INVALID,
  pause_duration: SESSION_MODEL_CODES.PAUSE_DURATION_INVALID,
  pause_count: SESSION_MODEL_CODES.PAUSE_COUNT_INVALID,
  extra_max: SESSION_MODEL_CODES.EXTRA_MAX_INVALID,
  leave_eligibility_after_session: SESSION_MODEL_CODES.LEAVE_ELIGIBILITY_INVALID,
  created_by: SESSION_MODEL_CODES.CREATED_BY_INVALID,
};

function throwFirst(result: z.SafeParseError<any>): never {
  const first = result.error.issues[0]!;
  const field = first.path[0] as string;
  const error: any = new Error(first.message);
  error.code = FIELD_TO_CODE[field] ?? SESSION_MODEL_CODES.VALIDATION_FAILED;
  throw error;
}

export const validateSessionModelCreation = (data: unknown) => {
  const result = createSessionModelSchema.safeParse(data);
  if (!result.success) throwFirst(result);
  return result.data;
};

export const validateSessionModelUpdate = (data: unknown) => {
  const result = updateSessionModelSchema.safeParse(data);
  if (!result.success) throwFirst(result);
  return result.data;
};

export const validateSessionModelFilters = (data: unknown) => {
  const result = sessionModelFiltersSchema.safeParse(data);
  if (!result.success) {
    const error: any = new Error(result.error.issues[0]!.message);
    error.code = SESSION_MODEL_CODES.FILTER_INVALID;
    throw error;
  }
  return result.data;
};

export const validateSessionModelGuid = (guid: unknown) => {
  const result = sessionModelGuidSchema.safeParse(guid);
  if (!result.success) {
    const error: any = new Error(SESSION_MODEL_ERRORS.GUID_INVALID);
    error.code = SESSION_MODEL_CODES.INVALID_GUID;
    throw error;
  }
  return result.data;
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateSessionModelInput = z.infer<typeof createSessionModelSchema>;
export type UpdateSessionModelInput = z.infer<typeof updateSessionModelSchema>;
export type SessionModelFilters = z.infer<typeof sessionModelFiltersSchema>;
