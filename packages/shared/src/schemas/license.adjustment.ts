// schemas/license.adjustment.ts
import { z } from 'zod';

import {
  LICENSE_ADJUSTMENT_DEFAULTS,
  LICENSE_ADJUSTMENT_ERRORS,
  LICENSE_ADJUSTMENT_VALIDATION,
  PAYMENT_STATUS,
} from '../constants/license.adjustment.js';

// Custom validation functions
const validateAmountCalculation = (data: {
  employees_added_count: number;
  months_remaining: number;
  price_per_employee_usd: number;
  subtotal_usd: number;
}) => {
  const calculatedSubtotal =
    data.employees_added_count * data.months_remaining * data.price_per_employee_usd;
  const tolerance = 0.01;
  return Math.abs(calculatedSubtotal - data.subtotal_usd) <= tolerance;
};

const validateTotalCalculation = (data: {
  subtotal_usd: number;
  tax_amount_usd: number;
  total_amount_usd: number;
}) => {
  const calculatedTotal = data.subtotal_usd + data.tax_amount_usd;
  const tolerance = 0.01;
  return Math.abs(calculatedTotal - data.total_amount_usd) <= tolerance;
};

const validateLocalAmountsConsistency = (data: {
  subtotal_usd: number;
  tax_amount_usd: number;
  total_amount_usd: number;
  exchange_rate_used: number;
  subtotal_local: number;
  tax_amount_local: number;
  total_amount_local: number;
}) => {
  const tolerance = 0.01;
  const calculatedSubtotalLocal = data.subtotal_usd * data.exchange_rate_used;
  const calculatedTaxLocal = data.tax_amount_usd * data.exchange_rate_used;
  const calculatedTotalLocal = data.total_amount_usd * data.exchange_rate_used;

  return (
    Math.abs(calculatedSubtotalLocal - data.subtotal_local) <= tolerance &&
    Math.abs(calculatedTaxLocal - data.tax_amount_local) <= tolerance &&
    Math.abs(calculatedTotalLocal - data.total_amount_local) <= tolerance
  );
};

// Base schema for common validations
const baseLicenseAdjustmentSchema = z.object({
  global_license: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.GLOBAL_LICENSE_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_GLOBAL_LICENSE,
    })
    .int()
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_GLOBAL_LICENSE,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_GLOBAL_LICENSE,
    ),

  adjustment_date: z
    .date({
      required_error: LICENSE_ADJUSTMENT_ERRORS.ADJUSTMENT_DATE_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_ADJUSTMENT_DATE,
    })
    .or(
      z
        .string()
        .datetime()
        .transform((val) => new Date(val)),
    ),

  employees_added_count: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.EMPLOYEES_ADDED_COUNT_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_EMPLOYEES_ADDED_COUNT,
    })
    .int()
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_EMPLOYEES_ADDED_COUNT,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_EMPLOYEES_ADDED_COUNT,
    ),

  months_remaining: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.MONTHS_REMAINING_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_MONTHS_REMAINING,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_MONTHS_REMAINING,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_MONTHS_REMAINING,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  price_per_employee_usd: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.PRICE_PER_EMPLOYEE_USD_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_PRICE_PER_EMPLOYEE_USD,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_PRICE_PER_EMPLOYEE_USD,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_PRICE_PER_EMPLOYEE_USD,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  subtotal_usd: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.SUBTOTAL_USD_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_SUBTOTAL_USD,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_SUBTOTAL_USD,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_SUBTOTAL_USD,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  tax_amount_usd: z
    .number({
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_AMOUNT_USD,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_AMOUNT_USD,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_AMOUNT_USD,
    )
    .default(LICENSE_ADJUSTMENT_DEFAULTS.TAX_AMOUNT_USD)
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  total_amount_usd: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.TOTAL_AMOUNT_USD_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_TOTAL_AMOUNT_USD,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TOTAL_AMOUNT_USD,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TOTAL_AMOUNT_USD,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  billing_currency_code: z
    .string({
      required_error: LICENSE_ADJUSTMENT_ERRORS.BILLING_CURRENCY_CODE_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_BILLING_CURRENCY_CODE,
    })
    .length(
      LICENSE_ADJUSTMENT_VALIDATION.BILLING_CURRENCY_CODE.LENGTH,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_BILLING_CURRENCY_CODE,
    )
    .regex(
      LICENSE_ADJUSTMENT_VALIDATION.BILLING_CURRENCY_CODE.PATTERN,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_BILLING_CURRENCY_CODE,
    )
    .transform((val) => val.trim().toUpperCase()),

  exchange_rate_used: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.EXCHANGE_RATE_USED_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_EXCHANGE_RATE_USED,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_EXCHANGE_RATE_USED,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_EXCHANGE_RATE_USED,
    )
    .transform((val) => Math.round(val * 1000000) / 1000000), // Round to 6 decimal places

  subtotal_local: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.SUBTOTAL_LOCAL_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_SUBTOTAL_LOCAL,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_LOCAL.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_SUBTOTAL_LOCAL,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_LOCAL.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_SUBTOTAL_LOCAL,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  tax_amount_local: z
    .number({
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_AMOUNT_LOCAL,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_LOCAL.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_AMOUNT_LOCAL,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_LOCAL.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_AMOUNT_LOCAL,
    )
    .default(LICENSE_ADJUSTMENT_DEFAULTS.TAX_AMOUNT_LOCAL)
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  total_amount_local: z
    .number({
      required_error: LICENSE_ADJUSTMENT_ERRORS.TOTAL_AMOUNT_LOCAL_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_TOTAL_AMOUNT_LOCAL,
    })
    .min(
      LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_LOCAL.MIN_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TOTAL_AMOUNT_LOCAL,
    )
    .max(
      LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_LOCAL.MAX_VALUE,
      LICENSE_ADJUSTMENT_ERRORS.INVALID_TOTAL_AMOUNT_LOCAL,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  tax_rules_applied: z
    .array(
      z
        .object({
          rate: z
            .number()
            .min(LICENSE_ADJUSTMENT_VALIDATION.TAX_RATE.MIN_VALUE)
            .max(LICENSE_ADJUSTMENT_VALIDATION.TAX_RATE.MAX_VALUE),
        })
        .passthrough(), // Allow additional properties
    )
    .min(1, LICENSE_ADJUSTMENT_ERRORS.INVALID_TAX_RULES_APPLIED)
    .default(LICENSE_ADJUSTMENT_DEFAULTS.TAX_RULES_APPLIED),

  payment_status: z
    .enum([...Object.values(PAYMENT_STATUS)] as [string, ...string[]], {
      required_error: LICENSE_ADJUSTMENT_ERRORS.PAYMENT_STATUS_REQUIRED,
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_PAYMENT_STATUS,
    })
    .default(PAYMENT_STATUS.PENDING),

  payment_due_immediately: z
    .boolean({
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_PAYMENT_DUE_IMMEDIATELY,
    })
    .default(LICENSE_ADJUSTMENT_DEFAULTS.PAYMENT_DUE_IMMEDIATELY),

  invoice_sent_at: z
    .date({
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_INVOICE_SENT_AT,
    })
    .or(
      z
        .string()
        .datetime()
        .transform((val) => new Date(val)),
    )
    .nullable()
    .optional(),

  payment_completed_at: z
    .date({
      invalid_type_error: LICENSE_ADJUSTMENT_ERRORS.INVALID_PAYMENT_COMPLETED_AT,
    })
    .or(
      z
        .string()
        .datetime()
        .transform((val) => new Date(val)),
    )
    .nullable()
    .optional(),
});

// Schema with business logic validation
const licenseAdjustmentWithValidation = baseLicenseAdjustmentSchema
  .refine((data) => validateAmountCalculation(data), {
    message: LICENSE_ADJUSTMENT_ERRORS.AMOUNT_CALCULATION_ERROR,
    path: ['subtotal_usd'],
  })
  .refine((data) => validateTotalCalculation(data), {
    message: LICENSE_ADJUSTMENT_ERRORS.TOTAL_CALCULATION_ERROR,
    path: ['total_amount_usd'],
  })
  .refine((data) => validateLocalAmountsConsistency(data), {
    message: LICENSE_ADJUSTMENT_ERRORS.LOCAL_AMOUNTS_INCONSISTENCY,
    path: ['total_amount_local'],
  })
  .refine(
    (data) => {
      if (data.payment_completed_at && data.adjustment_date) {
        return (
          new Date(data.payment_completed_at).getTime() >= new Date(data.adjustment_date).getTime()
        );
      }
      return true;
    },
    {
      message: LICENSE_ADJUSTMENT_ERRORS.PAYMENT_COMPLETED_BEFORE_ADJUSTMENT,
      path: ['payment_completed_at'],
    },
  )
  .refine(
    (data) => {
      if (data.payment_completed_at && data.invoice_sent_at) {
        return (
          new Date(data.payment_completed_at).getTime() >= new Date(data.invoice_sent_at).getTime()
        );
      }
      return true;
    },
    {
      message: LICENSE_ADJUSTMENT_ERRORS.PAYMENT_COMPLETED_BEFORE_INVOICE,
      path: ['payment_completed_at'],
    },
  );

// Schema for creation - all required fields
export const createLicenseAdjustmentSchema = licenseAdjustmentWithValidation;

// Schema for updates - all fields optional
export const updateLicenseAdjustmentSchema = baseLicenseAdjustmentSchema.partial();
// .refine(
//   (data) => {
//     if (data.employees_added_count && data.months_remaining && data.price_per_employee_usd && data.subtotal_usd) {
//       return validateAmountCalculation(data as any);
//     }
//     return true;
//   },
//   {
//     message: LICENSE_ADJUSTMENT_ERRORS.AMOUNT_CALCULATION_ERROR,
//     path: ['subtotal_usd'],
//   }
// )
// .refine(
//   (data) => {
//     if (data.subtotal_usd && data.tax_amount_usd !== undefined && data.total_amount_usd) {
//       return validateTotalCalculation(data as any);
//     }
//     return true;
//   },
//   {
//     message: LICENSE_ADJUSTMENT_ERRORS.TOTAL_CALCULATION_ERROR,
//     path: ['total_amount_usd'],
//   }
// )
// .refine(
//   (data) => {
//     if (data.payment_completed_at && data.adjustment_date) {
//       return new Date(data.payment_completed_at).getTime() >= new Date(data.adjustment_date).getTime();
//     }
//     return true;
//   },
//   {
//     message: LICENSE_ADJUSTMENT_ERRORS.PAYMENT_COMPLETED_BEFORE_ADJUSTMENT,
//     path: ['payment_completed_at'],
//   }
// )
// .refine(
//   (data) => {
//     if (data.payment_completed_at && data.invoice_sent_at) {
//       return new Date(data.payment_completed_at).getTime() >= new Date(data.invoice_sent_at).getTime();

// Schema for filters
export const licenseAdjustmentFiltersSchema = z
  .object({
    global_license: z.number().int().positive().optional(),
    adjustment_date_from: z
      .date()
      .or(
        z
          .string()
          .datetime()
          .transform((val) => new Date(val)),
      )
      .optional(),
    adjustment_date_to: z
      .date()
      .or(
        z
          .string()
          .datetime()
          .transform((val) => new Date(val)),
      )
      .optional(),
    employees_added_count_min: z.number().int().positive().optional(),
    employees_added_count_max: z.number().int().positive().optional(),
    months_remaining_min: z.number().min(0).optional(),
    months_remaining_max: z.number().max(99.99).optional(),
    price_per_employee_usd_min: z.number().min(0).optional(),
    price_per_employee_usd_max: z.number().optional(),
    subtotal_usd_min: z.number().min(0).optional(),
    subtotal_usd_max: z.number().optional(),
    total_amount_usd_min: z.number().min(0).optional(),
    total_amount_usd_max: z.number().optional(),
    billing_currency_code: z
      .string()
      .length(3)
      .regex(LICENSE_ADJUSTMENT_VALIDATION.BILLING_CURRENCY_CODE.PATTERN)
      .optional()
      .transform((val) => val?.toUpperCase()),
    payment_status: z.enum([...Object.values(PAYMENT_STATUS)] as [string, ...string[]]).optional(),
    payment_due_immediately: z.boolean().optional(),
    invoice_sent: z.boolean().optional(), // Filter for has invoice_sent_at or not
    payment_completed: z.boolean().optional(), // Filter for has payment_completed_at or not
  })
  .strict();

// Schema for GUID validation
export const licenseAdjustmentGuidSchema = z
  .string()
  .regex(/^\d{6}$/, LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= LICENSE_ADJUSTMENT_VALIDATION.GUID.MIN_VALUE &&
      val <= LICENSE_ADJUSTMENT_VALIDATION.GUID.MAX_VALUE,
    LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID,
  );

// Schema for payment status update
export const paymentStatusUpdateSchema = z.object({
  payment_status: z.enum([...Object.values(PAYMENT_STATUS)] as [string, ...string[]]),
  invoice_sent_at: z
    .date()
    .or(
      z
        .string()
        .datetime()
        .transform((val) => new Date(val)),
    )
    .nullable()
    .optional(),
  payment_completed_at: z
    .date()
    .or(
      z
        .string()
        .datetime()
        .transform((val) => new Date(val)),
    )
    .nullable()
    .optional(),
});

// Validation functions with error handling
export const validateLicenseAdjustmentCreation = (data: any) => {
  try {
    return createLicenseAdjustmentSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLicenseAdjustmentUpdate = (data: any) => {
  try {
    return updateLicenseAdjustmentSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLicenseAdjustmentFilters = (data: any) => {
  try {
    return licenseAdjustmentFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLicenseAdjustmentGuid = (guid: any) => {
  try {
    return licenseAdjustmentGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(LICENSE_ADJUSTMENT_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

export const validatePaymentStatusUpdate = (data: any) => {
  try {
    return paymentStatusUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Payment status update validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const licenseAdjustment = baseLicenseAdjustmentSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(LICENSE_ADJUSTMENT_VALIDATION.GUID.MIN_VALUE)
    .max(LICENSE_ADJUSTMENT_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Grouped export for easier imports
export const licenseAdjustmentSchemas = {
  validateLicenseAdjustmentCreation,
  validateLicenseAdjustmentUpdate,
  validateLicenseAdjustmentFilters,
  validateLicenseAdjustmentGuid,
  validatePaymentStatusUpdate,
  createLicenseAdjustmentSchema,
  updateLicenseAdjustmentSchema,
  licenseAdjustmentFiltersSchema,
  licenseAdjustmentGuidSchema,
  paymentStatusUpdateSchema,
};

// TypeScript types generated from schemas
export type CreateLicenseAdjustmentInput = z.infer<typeof createLicenseAdjustmentSchema>;
export type UpdateLicenseAdjustmentInput = z.infer<typeof updateLicenseAdjustmentSchema>;
export type LicenseAdjustmentData = z.infer<typeof licenseAdjustment>;
export type LicenseAdjustmentFilters = z.infer<typeof licenseAdjustmentFiltersSchema>;
export type PaymentStatusUpdateData = z.infer<typeof paymentStatusUpdateSchema>;
