// schemas/billing.cycle.ts
import { z } from 'zod';

import {
  BILLING_CYCLE_DEFAULTS,
  BILLING_CYCLE_ERRORS,
  BILLING_CYCLE_VALIDATION,
  BillingStatus,
} from '../constants/billing.cycle.js';

// Base schema for common validations
const baseBillingCycleSchema = z.object({
  global_license: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_INVALID,
    })
    .int(BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_INVALID)
    .positive(BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_INVALID),

  period_start: z.date({
    required_error: BILLING_CYCLE_ERRORS.PERIOD_START_REQUIRED,
    invalid_type_error: BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
  }),

  period_end: z.date({
    required_error: BILLING_CYCLE_ERRORS.PERIOD_END_REQUIRED,
    invalid_type_error: BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
  }),

  base_employee_count: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID,
    })
    .int(BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID)
    .min(
      BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE,
      BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE,
      BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID,
    ),

  final_employee_count: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID,
    })
    .int(BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID)
    .min(
      BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE,
      BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE,
      BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID,
    ),

  base_amount_usd: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE,
      BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE,
      BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  adjustments_amount_usd: z
    .number({
      invalid_type_error: BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_USD_INVALID,
    })
    .min(
      -BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE,
      BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_USD_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE,
      BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_USD_INVALID,
    )
    .default(BILLING_CYCLE_DEFAULTS.ADJUSTMENTS_AMOUNT_USD)
    .transform((val) => Math.round(val * 100) / 100),

  subtotal_usd: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.SUBTOTAL_USD_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.SUBTOTAL_USD_INVALID,
    })
    .min(BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE, BILLING_CYCLE_ERRORS.SUBTOTAL_USD_INVALID)
    .max(BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, BILLING_CYCLE_ERRORS.SUBTOTAL_USD_INVALID)
    .transform((val) => Math.round(val * 100) / 100),

  tax_amount_usd: z
    .number({
      invalid_type_error: BILLING_CYCLE_ERRORS.TAX_AMOUNT_USD_INVALID,
    })
    .min(BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE, BILLING_CYCLE_ERRORS.TAX_AMOUNT_USD_INVALID)
    .max(BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, BILLING_CYCLE_ERRORS.TAX_AMOUNT_USD_INVALID)
    .default(BILLING_CYCLE_DEFAULTS.TAX_AMOUNT_USD)
    .transform((val) => Math.round(val * 100) / 100),

  total_amount_usd: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE,
      BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE,
      BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100),

  billing_currency_code: z
    .string({
      required_error: BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID,
    })
    .length(
      BILLING_CYCLE_VALIDATION.CURRENCY_CODE.LENGTH,
      BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID,
    )
    .regex(
      BILLING_CYCLE_VALIDATION.CURRENCY_CODE.PATTERN,
      BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID,
    )
    .transform((val) => val.toUpperCase()),

  exchange_rate_used: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.EXCHANGE_RATE_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.EXCHANGE_RATE_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MIN_VALUE,
      BILLING_CYCLE_ERRORS.EXCHANGE_RATE_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MAX_VALUE,
      BILLING_CYCLE_ERRORS.EXCHANGE_RATE_INVALID,
    )
    .transform((val) => Math.round(val * 1000000) / 1000000), // Round to 6 decimal places

  base_amount_local: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE,
      BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100),

  adjustments_amount_local: z
    .number({
      invalid_type_error: BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_LOCAL_INVALID,
    })
    .min(
      -BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_LOCAL_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_LOCAL_INVALID,
    )
    .default(BILLING_CYCLE_DEFAULTS.ADJUSTMENTS_AMOUNT_LOCAL)
    .transform((val) => Math.round(val * 100) / 100),

  subtotal_local: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE,
      BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100),

  tax_amount_local: z
    .number({
      invalid_type_error: BILLING_CYCLE_ERRORS.TAX_AMOUNT_LOCAL_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE,
      BILLING_CYCLE_ERRORS.TAX_AMOUNT_LOCAL_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      BILLING_CYCLE_ERRORS.TAX_AMOUNT_LOCAL_INVALID,
    )
    .default(BILLING_CYCLE_DEFAULTS.TAX_AMOUNT_LOCAL)
    .transform((val) => Math.round(val * 100) / 100),

  total_amount_local: z
    .number({
      required_error: BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_REQUIRED,
      invalid_type_error: BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_INVALID,
    })
    .min(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE,
      BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_INVALID,
    )
    .max(
      BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100),

  tax_rules_applied: z
    .array(
      z.object({
        rate: z.number().min(0).max(100),
        name: z.string().optional(),
        type: z.string().optional(),
        amount_usd: z.number().optional(),
        amount_local: z.number().optional(),
      }),
    )
    .default(BILLING_CYCLE_DEFAULTS.TAX_RULES_APPLIED),

  billing_status: z
    .nativeEnum(BillingStatus, {
      invalid_type_error: BILLING_CYCLE_ERRORS.BILLING_STATUS_INVALID,
    })
    .default(BILLING_CYCLE_DEFAULTS.BILLING_STATUS),

  invoice_generated_at: z
    .date({
      invalid_type_error: BILLING_CYCLE_ERRORS.INVOICE_GENERATED_AT_INVALID,
    })
    .optional(),

  payment_due_date: z.date({
    required_error: BILLING_CYCLE_ERRORS.PAYMENT_DUE_DATE_REQUIRED,
    invalid_type_error: BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
  }),

  payment_completed_at: z
    .date({
      invalid_type_error: BILLING_CYCLE_ERRORS.PAYMENT_COMPLETED_AT_INVALID,
    })
    .optional(),
});

// Schema for creation - all required fields
export const createBillingCycleSchema = baseBillingCycleSchema;

// Schema for updates - all fields optional
export const updateBillingCycleSchema = baseBillingCycleSchema.partial();

// Schema for filters
export const billingCycleFiltersSchema = z
  .object({
    global_license: z.number().int().positive().optional(),
    billing_status: z.nativeEnum(BillingStatus).optional(),
    billing_currency_code: z
      .string()
      .length(3)
      .regex(BILLING_CYCLE_VALIDATION.CURRENCY_CODE.PATTERN)
      .optional(),
    period_start_from: z.date().optional(),
    period_start_to: z.date().optional(),
    period_end_from: z.date().optional(),
    period_end_to: z.date().optional(),
    payment_due_from: z.date().optional(),
    payment_due_to: z.date().optional(),
    min_total_amount_usd: z.number().min(0).optional(),
    max_total_amount_usd: z.number().min(0).optional(),
    min_employee_count: z.number().int().positive().optional(),
    max_employee_count: z.number().int().positive().optional(),
  })
  .strict();

// Schema for GUID validation
export const billingCycleGuidSchema = z
  .string()
  .regex(/^\d{6}$/, BILLING_CYCLE_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= BILLING_CYCLE_VALIDATION.GUID.MIN_VALUE &&
      val <= BILLING_CYCLE_VALIDATION.GUID.MAX_VALUE,
    BILLING_CYCLE_ERRORS.GUID_INVALID,
  );

// Validation functions with error handling
export const validateBillingCycleCreation = (data: any) => {
  try {
    return createBillingCycleSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateBillingCycleUpdate = (data: any) => {
  try {
    return updateBillingCycleSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateBillingCycleFilters = (data: any) => {
  try {
    return billingCycleFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateBillingCycleGuid = (guid: any) => {
  try {
    return billingCycleGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(BILLING_CYCLE_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const billingCycle = baseBillingCycleSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(BILLING_CYCLE_VALIDATION.GUID.MIN_VALUE)
    .max(BILLING_CYCLE_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Grouped export for easier imports
export const billingCycleSchemas = {
  validateBillingCycleCreation,
  validateBillingCycleUpdate,
  validateBillingCycleFilters,
  validateBillingCycleGuid,
  createBillingCycleSchema,
  updateBillingCycleSchema,
  billingCycleFiltersSchema,
  billingCycleGuidSchema,
};

// TypeScript types generated from schemas
export type CreateBillingCycleInput = z.infer<typeof createBillingCycleSchema>;
export type UpdateBillingCycleInput = z.infer<typeof updateBillingCycleSchema>;
export type BillingCycleData = z.infer<typeof billingCycle>;
export type BillingCycleFilters = z.infer<typeof billingCycleFiltersSchema>;
