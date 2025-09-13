// schemas/fraud.detection.log.ts
import { z } from 'zod';

import {
  FRAUD_DETECTION_ERRORS,
  FRAUD_DETECTION_VALIDATION,
  FraudDetection,
  RiskLevel,
} from '../constants/fraud.detection.log.js';

// Base schema for common validations
const baseFraudDetectionLogSchema = z.object({
  tenant: z
    .number({
      required_error: FRAUD_DETECTION_ERRORS.TENANT_REQUIRED,
      invalid_type_error: FRAUD_DETECTION_ERRORS.TENANT_INVALID,
    })
    .int(FRAUD_DETECTION_ERRORS.TENANT_INVALID)
    .positive(FRAUD_DETECTION_ERRORS.TENANT_INVALID),

  detection_type: z.nativeEnum(FraudDetection, {
    required_error: FRAUD_DETECTION_ERRORS.DETECTION_TYPE_REQUIRED,
    invalid_type_error: FRAUD_DETECTION_ERRORS.DETECTION_TYPE_INVALID,
  }),

  employee_licenses_affected: z
    .array(
      z
        .string()
        .regex(
          FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.EMPLOYEE_ID_PATTERN,
          FRAUD_DETECTION_ERRORS.EMPLOYEE_ID_INVALID,
        ),
    )
    .min(
      FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.MIN_LENGTH,
      FRAUD_DETECTION_ERRORS.EMPLOYEE_LICENSES_AFFECTED_EMPTY,
    )
    .max(
      FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.MAX_LENGTH,
      FRAUD_DETECTION_ERRORS.EMPLOYEE_LICENSES_AFFECTED_INVALID,
    ),

  detection_criteria: z
    .record(z.any())
    .refine(
      (obj) => Object.keys(obj).length >= FRAUD_DETECTION_VALIDATION.DETECTION_CRITERIA.MIN_KEYS,
      FRAUD_DETECTION_ERRORS.DETECTION_CRITERIA_EMPTY,
    )
    .refine(
      (obj) =>
        JSON.stringify(obj).length <= FRAUD_DETECTION_VALIDATION.DETECTION_CRITERIA.MAX_JSON_SIZE,
      FRAUD_DETECTION_ERRORS.DETECTION_CRITERIA_INVALID,
    ),

  risk_level: z.nativeEnum(RiskLevel, {
    required_error: FRAUD_DETECTION_ERRORS.RISK_LEVEL_REQUIRED,
    invalid_type_error: FRAUD_DETECTION_ERRORS.RISK_LEVEL_INVALID,
  }),

  action_taken: z
    .string()
    .max(
      FRAUD_DETECTION_VALIDATION.ACTION_TAKEN.MAX_LENGTH,
      FRAUD_DETECTION_ERRORS.ACTION_TAKEN_INVALID,
    )
    .transform((val) => val.trim())
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(FRAUD_DETECTION_VALIDATION.NOTES.MAX_LENGTH, FRAUD_DETECTION_ERRORS.NOTES_INVALID)
    .transform((val) => val.trim())
    .optional()
    .nullable(),

  resolved_at: z
    .date({
      invalid_type_error: FRAUD_DETECTION_ERRORS.INVALID_DATE_FORMAT,
    })
    .optional()
    .nullable(),

  resolved_by: z
    .number()
    .int(FRAUD_DETECTION_ERRORS.RESOLVED_BY_INVALID)
    .positive(FRAUD_DETECTION_ERRORS.RESOLVED_BY_INVALID)
    .optional()
    .nullable(),
});

// Schema for creation - NOT ALLOWED (managed by PostgreSQL)
export const createFraudDetectionLogSchema = z.object({}).refine(() => false, {
  message: FRAUD_DETECTION_ERRORS.CREATION_NOT_ALLOWED,
});

// Schema for updates - only administrative fields can be updated
export const updateFraudDetectionLogSchema = z
  .object({
    action_taken: baseFraudDetectionLogSchema.shape.action_taken,
    notes: baseFraudDetectionLogSchema.shape.notes,
    resolved_at: baseFraudDetectionLogSchema.shape.resolved_at,
    resolved_by: baseFraudDetectionLogSchema.shape.resolved_by,
  })
  .partial()
  .refine(
    (data) => {
      // Validate resolution consistency
      const hasResolvedAt = data.resolved_at !== undefined && data.resolved_at !== null;
      const hasResolvedBy = data.resolved_by !== undefined && data.resolved_by !== null;

      if (hasResolvedAt || hasResolvedBy) {
        return hasResolvedAt && hasResolvedBy;
      }
      return true;
    },
    {
      message: FRAUD_DETECTION_ERRORS.RESOLUTION_CONSISTENCY_INVALID,
    },
  );

// Schema for administrative data cleaning
export const fraudDetectionAdminDataSchema = z
  .object({
    action_taken: z.string().optional(),
    notes: z.string().optional(),
    resolved_at: z.union([z.string(), z.date()]).optional(),
    resolved_by: z.union([z.string(), z.number()]).optional(),
  })
  .strict();

// Schema for filters
export const fraudDetectionFiltersSchema = z
  .object({
    tenant: z.number().int().positive().optional(),
    detection_type: z.nativeEnum(FraudDetection).optional(),
    risk_level: z.nativeEnum(RiskLevel).optional(),
    resolved: z.boolean().optional(),
    employee_id: z.string().optional(),
    created_from: z.date().optional(),
    created_to: z.date().optional(),
    resolved_from: z.date().optional(),
    resolved_to: z.date().optional(),
    resolved_by: z.number().int().positive().optional(),
  })
  .strict();

// Schema for ID validation
export const fraudDetectionLogIdSchema = z.union([z.string(), z.number()]).transform((val) => {
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num) || num < FRAUD_DETECTION_VALIDATION.ID.MIN_VALUE) {
    throw new Error(FRAUD_DETECTION_ERRORS.INVALID_ID);
  }
  return num;
});

// Validation functions with error handling
export const validateFraudDetectionUpdate = (data: any) => {
  try {
    return updateFraudDetectionLogSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateFraudDetectionFilters = (data: any) => {
  try {
    return fraudDetectionFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateFraudDetectionLogId = (id: any) => {
  try {
    return fraudDetectionLogIdSchema.parse(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(FRAUD_DETECTION_ERRORS.INVALID_ID);
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const fraudDetectionLogSchema = baseFraudDetectionLogSchema.extend({
  id: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export grouped for easier importing
export const fraudDetectionLogSchemas = {
  validateFraudDetectionUpdate,
  validateFraudDetectionFilters,
  validateFraudDetectionLogId,
  createFraudDetectionLogSchema,
  updateFraudDetectionLogSchema,
  fraudDetectionFiltersSchema,
  fraudDetectionLogIdSchema,
  fraudDetectionAdminDataSchema,
};

// TypeScript types generated from schemas
export type UpdateFraudDetectionLogInput = z.infer<typeof updateFraudDetectionLogSchema>;
export type FraudDetectionLogData = z.infer<typeof fraudDetectionLogSchema>;
export type FraudDetectionLogFilters = z.infer<typeof fraudDetectionFiltersSchema>;
export type FraudDetectionAdminData = z.infer<typeof fraudDetectionAdminDataSchema>;
