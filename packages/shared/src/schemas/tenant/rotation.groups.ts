import { z } from 'zod';

import {
  CycleUnit,
  ROTATION_GROUP_CODES,
  ROTATION_GROUP_DEFAULTS,
  ROTATION_GROUP_ERRORS,
  ROTATION_GROUP_VALIDATION,
  RotationGroupCode,
} from '../../constants/tenant/rotation.groups.js';

// Base schema for common validations
const baseRotationGroupSchema = z.object({
  tenant: z
    .string({
      required_error: ROTATION_GROUP_ERRORS.TENANT_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.TENANT_INVALID,
    })
    .min(ROTATION_GROUP_VALIDATION.TENANT.MIN_LENGTH, ROTATION_GROUP_ERRORS.TENANT_INVALID)
    .max(ROTATION_GROUP_VALIDATION.TENANT.MAX_LENGTH, ROTATION_GROUP_ERRORS.TENANT_INVALID)
    .trim(),

  name: z
    .string({
      required_error: ROTATION_GROUP_ERRORS.NAME_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.NAME_INVALID,
    })
    .min(ROTATION_GROUP_VALIDATION.NAME.MIN_LENGTH, ROTATION_GROUP_ERRORS.NAME_INVALID)
    .max(ROTATION_GROUP_VALIDATION.NAME.MAX_LENGTH, ROTATION_GROUP_ERRORS.NAME_INVALID)
    .trim(),

  cycle_length: z
    .number({
      required_error: ROTATION_GROUP_ERRORS.CYCLE_LENGTH_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID,
    })
    .int(ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID)
    .min(ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MIN, ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID)
    .max(ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MAX, ROTATION_GROUP_ERRORS.CYCLE_LENGTH_INVALID),

  cycle_unit: z.nativeEnum(CycleUnit, {
    required_error: ROTATION_GROUP_ERRORS.CYCLE_UNIT_REQUIRED,
    invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_UNIT_INVALID,
  }),

  cycle_templates: z
    .array(z.number().int().positive(ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID), {
      required_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_INVALID,
    })
    .min(
      ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS,
      ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_EMPTY,
    )
    .max(
      ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS,
      ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_TOO_MANY,
    )
    .refine(
      (templates) => {
        // Check for duplicates
        const uniqueTemplates = new Set(templates);
        return uniqueTemplates.size === templates.length;
      },
      { message: ROTATION_GROUP_ERRORS.CYCLE_TEMPLATES_DUPLICATE },
    ),

  start_date: z
    .string({
      required_error: ROTATION_GROUP_ERRORS.START_DATE_REQUIRED,
      invalid_type_error: ROTATION_GROUP_ERRORS.START_DATE_INVALID,
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, ROTATION_GROUP_ERRORS.START_DATE_INVALID)
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: ROTATION_GROUP_ERRORS.START_DATE_INVALID },
    ),

  active: z
    .boolean({
      invalid_type_error: ROTATION_GROUP_ERRORS.ACTIVE_INVALID,
    })
    .default(ROTATION_GROUP_DEFAULTS.ACTIVE),
});

// Schema for creation - all fields required
export const createRotationGroupSchema = baseRotationGroupSchema;

// Schema for updates - all fields optional
export const updateRotationGroupSchema = baseRotationGroupSchema.partial();

// Schema for filters
export const rotationGroupFiltersSchema = z
  .object({
    tenant: z.string().optional(),
    name: z.string().optional(),
    cycle_unit: z.nativeEnum(CycleUnit).optional(),
    active: z.boolean().optional(),
    start_date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    start_date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

// Schema for GUID validation
export const rotationGroupGuidSchema = z
  .string()
  .min(ROTATION_GROUP_VALIDATION.GUID.MIN_LENGTH, ROTATION_GROUP_ERRORS.GUID_INVALID)
  .max(ROTATION_GROUP_VALIDATION.GUID.MAX_LENGTH, ROTATION_GROUP_ERRORS.GUID_INVALID);

// Shared constant for field -> code mapping
const FIELD_TO_CODE_MAP: Record<string, RotationGroupCode> = {
  tenant: ROTATION_GROUP_CODES.TENANT_INVALID,
  name: ROTATION_GROUP_CODES.NAME_INVALID,
  cycle_length: ROTATION_GROUP_CODES.CYCLE_LENGTH_INVALID,
  cycle_unit: ROTATION_GROUP_CODES.CYCLE_UNIT_INVALID,
  cycle_templates: ROTATION_GROUP_CODES.CYCLE_TEMPLATES_INVALID,
  start_date: ROTATION_GROUP_CODES.START_DATE_INVALID,
  active: ROTATION_GROUP_CODES.ACTIVE_INVALID,
};

// Validation function for creation
export const validateRotationGroupCreation = (data: any) => {
  const result = createRotationGroupSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

// Validation function for update
export const validateRotationGroupUpdate = (data: any) => {
  const result = updateRotationGroupSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;
    const field = firstError.path[0] as string;

    const error: any = new Error(firstError.message);
    error.code = FIELD_TO_CODE_MAP[field] || ROTATION_GROUP_CODES.VALIDATION_FAILED;
    throw error;
  }

  return result.data;
};

export const validateRotationGroupFilters = (data: any) => {
  const result = rotationGroupFiltersSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0]!;

    const error: any = new Error(firstError.message);
    error.code = ROTATION_GROUP_CODES.FILTER_INVALID;
    throw error;
  }

  return result.data;
};

export const validateRotationGroupGuid = (guid: any) => {
  const result = rotationGroupGuidSchema.safeParse(guid);

  if (!result.success) {
    const error: any = new Error(ROTATION_GROUP_ERRORS.GUID_INVALID);
    error.code = ROTATION_GROUP_CODES.INVALID_GUID;
    throw error;
  }

  return result.data;
};

// Complete schema for responses (with metadata)
export const rotationGroupResponseSchema = baseRotationGroupSchema.extend({
  id: z.number().int().positive(),
  guid: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// Grouped export for easier imports
export const rotationGroupSchemas = {
  validateRotationGroupCreation,
  validateRotationGroupUpdate,
  validateRotationGroupFilters,
  validateRotationGroupGuid,
  createRotationGroupSchema,
  updateRotationGroupSchema,
  rotationGroupFiltersSchema,
  rotationGroupGuidSchema,
};

// TypeScript types generated from schemas
export type CreateRotationGroupInput = z.infer<typeof createRotationGroupSchema>;
export type UpdateRotationGroupInput = z.infer<typeof updateRotationGroupSchema>;
export type RotationGroupData = z.infer<typeof rotationGroupResponseSchema>;
export type RotationGroupFilters = z.infer<typeof rotationGroupFiltersSchema>;
