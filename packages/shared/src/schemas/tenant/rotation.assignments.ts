import { z } from 'zod';

// import TimezoneConfig from '@toke/api/dist/utils/timezone.config.js';
import {
  ROTATION_ASSIGNMENT_CODES,
  ROTATION_ASSIGNMENT_DEFAULTS,
  ROTATION_ASSIGNMENT_ERRORS,
  ROTATION_ASSIGNMENT_VALIDATION,
  RotationAssignmentCode,
} from '../../constants/tenant/rotation.assignments.js';
import { TimezoneConfigUtils } from '../../utils/timezone.config.validation.js';

// Base schema for common validations
const baseRotationAssignmentSchema = z.object({
  user: z
    .string({
      invalid_type_error: ROTATION_ASSIGNMENT_ERRORS.USER_INVALID,
    })
    .trim()
    .min(ROTATION_ASSIGNMENT_VALIDATION.USER.MIN_LENGTH, ROTATION_ASSIGNMENT_ERRORS.USER_INVALID)
    .max(ROTATION_ASSIGNMENT_VALIDATION.USER.MAX_LENGTH, ROTATION_ASSIGNMENT_ERRORS.USER_INVALID)
    .nullable()
    .optional(),

  assigned_by: z
    .string({
      required_error: ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_REQUIRED,
      invalid_type_error: ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_INVALID,
    })
    .trim()
    .min(
      ROTATION_ASSIGNMENT_VALIDATION.ASSIGNED_BY.MIN_LENGTH,
      ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_INVALID,
    )
    .max(
      ROTATION_ASSIGNMENT_VALIDATION.ASSIGNED_BY.MAX_LENGTH,
      ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_BY_INVALID,
    ),

  group: z
    .string({
      invalid_type_error: ROTATION_ASSIGNMENT_ERRORS.GROUPS_INVALID,
    })
    .trim()
    .min(
      ROTATION_ASSIGNMENT_VALIDATION.GROUPS.MIN_LENGTH,
      ROTATION_ASSIGNMENT_ERRORS.GROUPS_INVALID,
    )
    .max(
      ROTATION_ASSIGNMENT_VALIDATION.GROUPS.MAX_LENGTH,
      ROTATION_ASSIGNMENT_ERRORS.GROUPS_INVALID,
    )
    .nullable()
    .optional(),

  rotation_group: z
    .string({
      required_error: ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_REQUIRED,
      invalid_type_error: ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_INVALID,
    })
    .min(
      ROTATION_ASSIGNMENT_VALIDATION.ROTATION_GROUP.MIN_LENGTH,
      ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_INVALID,
    )
    .max(
      ROTATION_ASSIGNMENT_VALIDATION.ROTATION_GROUP.MAX_LENGTH,
      ROTATION_ASSIGNMENT_ERRORS.ROTATION_GROUP_INVALID,
    )
    .trim(),

  offset: z
    .number({
      invalid_type_error: ROTATION_ASSIGNMENT_ERRORS.OFFSET_INVALID,
    })
    .int(ROTATION_ASSIGNMENT_ERRORS.OFFSET_INVALID)
    .min(ROTATION_ASSIGNMENT_VALIDATION.OFFSET.MIN, ROTATION_ASSIGNMENT_ERRORS.OFFSET_INVALID)
    .max(ROTATION_ASSIGNMENT_VALIDATION.OFFSET.MAX, ROTATION_ASSIGNMENT_ERRORS.OFFSET_INVALID)
    .default(ROTATION_ASSIGNMENT_DEFAULTS.OFFSET),

  assigned_at: z
    .string({
      invalid_type_error: ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_AT_INVALID,
    })
    .datetime(ROTATION_ASSIGNMENT_ERRORS.ASSIGNED_AT_INVALID)
    .or(z.date())
    .optional()
    .default(() => TimezoneConfigUtils.getCurrentTime().toISOString()),
});

// Schema for creation - all fields required except defaults
export const createRotationAssignmentSchema = baseRotationAssignmentSchema.refine(
  (data) => {
    // Either user or groups must be specified, but not both
    const hasUser = data.user !== null && data.user !== undefined;
    const hasGroups = data.group !== null && data.group !== undefined;
    return hasUser !== hasGroups; // XOR: exactly one must be true
  },
  {
    message: ROTATION_ASSIGNMENT_ERRORS.USER_OR_GROUPS_REQUIRED,
  },
);

// Schema for updates - all fields optional
export const updateRotationAssignmentSchema = baseRotationAssignmentSchema.partial().refine(
  (data) => {
    // Either user or groups must be specified, but not both
    const hasUser = data.user !== null && data.user !== undefined;
    const hasGroups = data.group !== null && data.group !== undefined;
    return hasUser !== hasGroups; // XOR: exactly one must be true
  },
  {
    message: ROTATION_ASSIGNMENT_ERRORS.USER_OR_GROUPS_REQUIRED,
  },
);

// Schema for filters
export const rotationAssignmentFiltersSchema = z
  .object({
    user: z.number().int().optional(),
    assigned_by: z.number().int().optional(),
    group: z.number().int().optional(),
    rotation_group: z.number().int().optional(),
    offset: z.number().int().optional(),
    assigned_at_from: z.string().datetime().optional(),
    assigned_at_to: z.string().datetime().optional(),
  })
  .strict();

// Schema for GUID validation
export const rotationAssignmentGuidSchema = z
  .string()
  .min(ROTATION_ASSIGNMENT_VALIDATION.GUID.MIN_LENGTH, ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID)
  .max(ROTATION_ASSIGNMENT_VALIDATION.GUID.MAX_LENGTH, ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID);

// Shared constant for field -> code mapping
const FIELD_TO_CODE_MAP: Record<string, RotationAssignmentCode> = {
  user: ROTATION_ASSIGNMENT_CODES.USER_INVALID,
  assigned_by: ROTATION_ASSIGNMENT_CODES.ASSIGNED_BY_INVALID,
  group: ROTATION_ASSIGNMENT_CODES.GROUPS_INVALID,
  rotation_group: ROTATION_ASSIGNMENT_CODES.ROTATION_GROUP_INVALID,
  offset: ROTATION_ASSIGNMENT_CODES.OFFSET_INVALID,
  assigned_at: ROTATION_ASSIGNMENT_CODES.ASSIGNED_AT_INVALID,
};

// Validation function for creation
export const validateRotationAssignmentCreation = (data: any) => {
  const result = createRotationAssignmentSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_ASSIGNMENT_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Validation function for update
export const validateRotationAssignmentUpdate = (data: any) => {
  const result = updateRotationAssignmentSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_ASSIGNMENT_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateRotationAssignmentFilters = (data: any) => {
  const result = rotationAssignmentFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = ROTATION_ASSIGNMENT_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateRotationAssignmentGuid = (guid: any) => {
  const result = rotationAssignmentGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(ROTATION_ASSIGNMENT_ERRORS.GUID_INVALID);
    error.code = ROTATION_ASSIGNMENT_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Complete schema for responses (with metadata)
export const rotationAssignmentResponseSchema = baseRotationAssignmentSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Grouped export for easier imports
export const rotationAssignmentSchemas = {
  validateRotationAssignmentCreation,
  validateRotationAssignmentUpdate,
  validateRotationAssignmentFilters,
  validateRotationAssignmentGuid,
  createRotationAssignmentSchema,
  updateRotationAssignmentSchema,
  rotationAssignmentFiltersSchema,
  rotationAssignmentGuidSchema,
};

// TypeScript types generated from schemas
export type CreateRotationAssignmentInput = z.infer<typeof createRotationAssignmentSchema>;
export type UpdateRotationAssignmentInput = z.infer<typeof updateRotationAssignmentSchema>;
export type RotationAssignmentData = z.infer<typeof rotationAssignmentResponseSchema>;
export type RotationAssignmentFilters = z.infer<typeof rotationAssignmentFiltersSchema>;
