// schemas/payment.method.ts
import { z } from 'zod';

import {
  PAYMENT_METHOD_DEFAULTS,
  PAYMENT_METHOD_ERRORS,
  PAYMENT_METHOD_VALIDATION,
} from '../constants/payment.method.js';

// Base schema for common validations
const basePaymentMethodSchema = z.object({
  code: z
    .string({
      required_error: PAYMENT_METHOD_ERRORS.CODE_REQUIRED,
      invalid_type_error: PAYMENT_METHOD_ERRORS.CODE_INVALID,
    })
    .min(PAYMENT_METHOD_VALIDATION.CODE.MIN_LENGTH, PAYMENT_METHOD_ERRORS.CODE_INVALID)
    .max(PAYMENT_METHOD_VALIDATION.CODE.MAX_LENGTH, PAYMENT_METHOD_ERRORS.CODE_INVALID)
    .regex(PAYMENT_METHOD_VALIDATION.CODE.PATTERN, PAYMENT_METHOD_ERRORS.CODE_INVALID)
    .transform((val) => val.trim().toUpperCase()),

  name: z
    .string({
      required_error: PAYMENT_METHOD_ERRORS.NAME_REQUIRED,
      invalid_type_error: PAYMENT_METHOD_ERRORS.NAME_INVALID,
    })
    .min(PAYMENT_METHOD_VALIDATION.NAME.MIN_LENGTH, PAYMENT_METHOD_ERRORS.NAME_INVALID)
    .max(PAYMENT_METHOD_VALIDATION.NAME.MAX_LENGTH, PAYMENT_METHOD_ERRORS.NAME_INVALID)
    .transform((val) => val.trim()),

  method_type: z
    .string({
      required_error: PAYMENT_METHOD_ERRORS.METHOD_TYPE_REQUIRED,
      invalid_type_error: PAYMENT_METHOD_ERRORS.METHOD_TYPE_INVALID,
    })
    .min(
      PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MIN_LENGTH,
      PAYMENT_METHOD_ERRORS.METHOD_TYPE_INVALID,
    )
    .max(
      PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MAX_LENGTH,
      PAYMENT_METHOD_ERRORS.METHOD_TYPE_INVALID,
    )
    .regex(PAYMENT_METHOD_VALIDATION.METHOD_TYPE.PATTERN, PAYMENT_METHOD_ERRORS.METHOD_TYPE_INVALID)
    .transform((val) => val.trim().toUpperCase()),

  supported_currencies: z
    .array(
      z
        .string()
        .length(
          PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.ITEM_LENGTH,
          PAYMENT_METHOD_ERRORS.CURRENCY_CODE_INVALID,
        )
        .regex(
          PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.PATTERN,
          PAYMENT_METHOD_ERRORS.CURRENCY_CODE_INVALID,
        )
        .transform((val) => val.toUpperCase()),
    )
    .max(
      PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.MAX_CURRENCIES,
      PAYMENT_METHOD_ERRORS.SUPPORTED_CURRENCIES_INVALID,
    )
    .default(PAYMENT_METHOD_DEFAULTS.SUPPORTED_CURRENCIES)
    .refine((currencies) => {
      // Check for duplicates
      const uniqueCurrencies = new Set(currencies);
      return uniqueCurrencies.size === currencies.length;
    }, PAYMENT_METHOD_ERRORS.DUPLICATE_CURRENCY_CODE),

  active: z
    .boolean({
      invalid_type_error: PAYMENT_METHOD_ERRORS.ACTIVE_INVALID,
    })
    .default(PAYMENT_METHOD_DEFAULTS.ACTIVE),

  processing_fee_rate: z
    .number({
      required_error: PAYMENT_METHOD_ERRORS.PROCESSING_FEE_RATE_REQUIRED,
      invalid_type_error: PAYMENT_METHOD_ERRORS.PROCESSING_FEE_RATE_INVALID,
    })
    .min(
      PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MIN_VALUE,
      PAYMENT_METHOD_ERRORS.PROCESSING_FEE_RATE_INVALID,
    )
    .max(
      PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MAX_VALUE,
      PAYMENT_METHOD_ERRORS.PROCESSING_FEE_RATE_INVALID,
    )
    .default(PAYMENT_METHOD_DEFAULTS.PROCESSING_FEE_RATE)
    .transform((val) => Math.round(val * 10000) / 10000), // Round to 4 decimal places

  min_amount_usd: z
    .number({
      required_error: PAYMENT_METHOD_ERRORS.MIN_AMOUNT_USD_REQUIRED,
      invalid_type_error: PAYMENT_METHOD_ERRORS.MIN_AMOUNT_USD_INVALID,
    })
    .min(
      PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MIN_VALUE,
      PAYMENT_METHOD_ERRORS.MIN_AMOUNT_USD_INVALID,
    )
    .max(
      PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MAX_VALUE,
      PAYMENT_METHOD_ERRORS.MIN_AMOUNT_USD_INVALID,
    )
    .default(PAYMENT_METHOD_DEFAULTS.MIN_AMOUNT_USD)
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  max_amount_usd: z
    .number({
      required_error: PAYMENT_METHOD_ERRORS.MAX_AMOUNT_USD_REQUIRED,
      invalid_type_error: PAYMENT_METHOD_ERRORS.MAX_AMOUNT_USD_INVALID,
    })
    .min(
      PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MIN_VALUE,
      PAYMENT_METHOD_ERRORS.MAX_AMOUNT_USD_INVALID,
    )
    .max(
      PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MAX_VALUE,
      PAYMENT_METHOD_ERRORS.MAX_AMOUNT_USD_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places
});

// Schema with amount range validation
const paymentMethodWithAmountValidation = basePaymentMethodSchema.refine(
  (data) => data.max_amount_usd >= data.min_amount_usd,
  {
    message: PAYMENT_METHOD_ERRORS.AMOUNT_RANGE_INVALID,
    path: ['max_amount_usd'],
  },
);

// Schema for creation - all required fields
export const createPaymentMethodSchema = paymentMethodWithAmountValidation;

// Schema for updates - all fields optional
// export const updatePaymentMethodSchema = paymentMethodWithAmountValidation.partial();
export const updatePaymentMethodSchema = basePaymentMethodSchema
  .partial()
  .refine(
    (data) =>
      data.max_amount_usd === undefined ||
      data.min_amount_usd === undefined ||
      data.max_amount_usd >= data.min_amount_usd,
    {
      message: PAYMENT_METHOD_ERRORS.AMOUNT_RANGE_INVALID,
      path: ['max_amount_usd'],
    },
  );

// Schema for filters
export const paymentMethodFiltersSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(20)
      .regex(PAYMENT_METHOD_VALIDATION.CODE.PATTERN)
      .optional()
      .transform((val) => val?.toUpperCase()),
    name: z.string().min(1).max(50).optional(),
    method_type: z
      .string()
      .min(1)
      .max(20)
      .regex(PAYMENT_METHOD_VALIDATION.METHOD_TYPE.PATTERN)
      .optional()
      .transform((val) => val?.toUpperCase()),
    active: z.boolean().optional(),
    supported_currency: z
      .string()
      .length(3)
      .regex(PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.PATTERN)
      .optional()
      .transform((val) => val?.toUpperCase()),
    min_processing_fee_rate: z.number().min(0).max(99.9999).optional(),
    max_processing_fee_rate: z.number().min(0).max(99.9999).optional(),
    min_amount_usd_from: z.number().min(0).optional(),
    min_amount_usd_to: z.number().min(0).optional(),
    max_amount_usd_from: z.number().min(0).optional(),
    max_amount_usd_to: z.number().min(0).optional(),
  })
  .strict();

// Schema for GUID validation
export const paymentMethodGuidSchema = z
  .string()
  .regex(/^\d{6}$/, PAYMENT_METHOD_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= PAYMENT_METHOD_VALIDATION.GUID.MIN_VALUE &&
      val <= PAYMENT_METHOD_VALIDATION.GUID.MAX_VALUE,
    PAYMENT_METHOD_ERRORS.GUID_INVALID,
  );

// Schema for currency support validation
export const currencySupportSchema = z.object({
  payment_method_code: z.string().min(1).max(20).regex(PAYMENT_METHOD_VALIDATION.CODE.PATTERN),
  currency_code: z
    .string()
    .length(3)
    .regex(PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.PATTERN)
    .transform((val) => val.toUpperCase()),
  amount: z.number().min(0).optional(),
});

// Schema for amount validation against payment method
export const amountValidationSchema = z.object({
  payment_method_code: z.string().min(1).max(20).regex(PAYMENT_METHOD_VALIDATION.CODE.PATTERN),
  amount_usd: z.number().min(0),
  currency_code: z
    .string()
    .length(3)
    .regex(PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.PATTERN)
    .transform((val) => val.toUpperCase()),
});

// Validation functions with error handling
export const validatePaymentMethodCreation = (data: any) => {
  try {
    return createPaymentMethodSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validatePaymentMethodUpdate = (data: any) => {
  try {
    return updatePaymentMethodSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validatePaymentMethodFilters = (data: any) => {
  try {
    return paymentMethodFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validatePaymentMethodGuid = (guid: any) => {
  try {
    return paymentMethodGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(PAYMENT_METHOD_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

export const validateCurrencySupport = (data: any) => {
  try {
    return currencySupportSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Currency support validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
};

export const validateAmountForPaymentMethod = (data: any) => {
  try {
    return amountValidationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Amount validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const paymentMethod = basePaymentMethodSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(PAYMENT_METHOD_VALIDATION.GUID.MIN_VALUE)
    .max(PAYMENT_METHOD_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Grouped export for easier imports
export const paymentMethodSchemas = {
  validatePaymentMethodCreation,
  validatePaymentMethodUpdate,
  validatePaymentMethodFilters,
  validatePaymentMethodGuid,
  validateCurrencySupport,
  validateAmountForPaymentMethod,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  paymentMethodFiltersSchema,
  paymentMethodGuidSchema,
  currencySupportSchema,
  amountValidationSchema,
};

// TypeScript types generated from schemas
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type PaymentMethodData = z.infer<typeof paymentMethod>;
export type PaymentMethodFilters = z.infer<typeof paymentMethodFiltersSchema>;
export type CurrencySupportData = z.infer<typeof currencySupportSchema>;
export type AmountValidationData = z.infer<typeof amountValidationSchema>;
