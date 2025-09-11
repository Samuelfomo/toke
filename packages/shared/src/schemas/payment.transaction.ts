// schemas/payment.transaction.ts
import { z } from 'zod';

import {
  PAYMENT_TRANSACTION_ERRORS,
  PAYMENT_TRANSACTION_STATUS_TRANSITIONS,
  PAYMENT_TRANSACTION_VALIDATION,
  PaymentTransactionStatus,
} from '../constants/payment.transaction.js';

// Base schema for common validations
const basePaymentTransactionSchema = z.object({
  billing_cycle: z
    .number({
      required_error: PAYMENT_TRANSACTION_ERRORS.BILLING_CYCLE_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.BILLING_CYCLE_INVALID,
    })
    .int(PAYMENT_TRANSACTION_ERRORS.BILLING_CYCLE_INVALID)
    .min(
      PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MIN_VALUE,
      PAYMENT_TRANSACTION_ERRORS.BILLING_CYCLE_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MAX_VALUE,
      PAYMENT_TRANSACTION_ERRORS.BILLING_CYCLE_INVALID,
    ),

  adjustment: z
    .number({
      required_error: PAYMENT_TRANSACTION_ERRORS.ADJUSTMENT_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.ADJUSTMENT_INVALID,
    })
    .int(PAYMENT_TRANSACTION_ERRORS.ADJUSTMENT_INVALID)
    .min(
      PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MIN_VALUE,
      PAYMENT_TRANSACTION_ERRORS.ADJUSTMENT_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MAX_VALUE,
      PAYMENT_TRANSACTION_ERRORS.ADJUSTMENT_INVALID,
    ),

  amount_usd: z
    .number({
      required_error: PAYMENT_TRANSACTION_ERRORS.AMOUNT_USD_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.AMOUNT_USD_INVALID,
    })
    .min(
      PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MIN_VALUE,
      PAYMENT_TRANSACTION_ERRORS.AMOUNT_USD_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MAX_VALUE,
      PAYMENT_TRANSACTION_ERRORS.AMOUNT_USD_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  amount_local: z
    .number({
      required_error: PAYMENT_TRANSACTION_ERRORS.AMOUNT_LOCAL_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.AMOUNT_LOCAL_INVALID,
    })
    .min(
      PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MIN_VALUE,
      PAYMENT_TRANSACTION_ERRORS.AMOUNT_LOCAL_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MAX_VALUE,
      PAYMENT_TRANSACTION_ERRORS.AMOUNT_LOCAL_INVALID,
    )
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  currency_code: z
    .string({
      required_error: PAYMENT_TRANSACTION_ERRORS.CURRENCY_CODE_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.CURRENCY_CODE_INVALID,
    })
    .length(
      PAYMENT_TRANSACTION_VALIDATION.CURRENCY_CODE.LENGTH,
      PAYMENT_TRANSACTION_ERRORS.CURRENCY_CODE_INVALID,
    )
    .regex(
      PAYMENT_TRANSACTION_VALIDATION.CURRENCY_CODE.PATTERN,
      PAYMENT_TRANSACTION_ERRORS.CURRENCY_CODE_INVALID,
    )
    .transform((val) => val.trim().toUpperCase()),

  exchange_rate_used: z
    .number({
      required_error: PAYMENT_TRANSACTION_ERRORS.EXCHANGE_RATE_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.EXCHANGE_RATE_INVALID,
    })
    .min(
      PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MIN_VALUE,
      PAYMENT_TRANSACTION_ERRORS.EXCHANGE_RATE_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MAX_VALUE,
      PAYMENT_TRANSACTION_ERRORS.EXCHANGE_RATE_INVALID,
    )
    .transform((val) => Math.round(val * 1000000) / 1000000), // Round to 6 decimal places

  payment_method: z
    .number({
      required_error: PAYMENT_TRANSACTION_ERRORS.PAYMENT_METHOD_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.PAYMENT_METHOD_INVALID,
    })
    .int(PAYMENT_TRANSACTION_ERRORS.PAYMENT_METHOD_INVALID)
    .min(
      PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MIN_VALUE,
      PAYMENT_TRANSACTION_ERRORS.PAYMENT_METHOD_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MAX_VALUE,
      PAYMENT_TRANSACTION_ERRORS.PAYMENT_METHOD_INVALID,
    ),

  payment_reference: z
    .string({
      required_error: PAYMENT_TRANSACTION_ERRORS.PAYMENT_REFERENCE_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.PAYMENT_REFERENCE_INVALID,
    })
    .min(
      PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MIN_LENGTH,
      PAYMENT_TRANSACTION_ERRORS.PAYMENT_REFERENCE_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MAX_LENGTH,
      PAYMENT_TRANSACTION_ERRORS.PAYMENT_REFERENCE_INVALID,
    )
    .transform((val) => val.trim()),

  transaction_status: z
    .nativeEnum(PaymentTransactionStatus, {
      required_error: PAYMENT_TRANSACTION_ERRORS.TRANSACTION_STATUS_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.TRANSACTION_STATUS_INVALID,
    })
    .default(PaymentTransactionStatus.PENDING),

  initiated_at: z
    .date({
      required_error: PAYMENT_TRANSACTION_ERRORS.INITIATED_AT_REQUIRED,
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.INITIATED_AT_INVALID,
    })
    .default(() => new Date()),

  completed_at: z
    .date({
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.COMPLETED_AT_INVALID,
    })
    .optional()
    .nullable(),

  failed_at: z
    .date({
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.FAILED_AT_INVALID,
    })
    .optional()
    .nullable(),

  failure_reason: z
    .string({
      invalid_type_error: PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_INVALID,
    })
    .min(
      PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MIN_LENGTH,
      PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MAX_LENGTH,
      PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_INVALID,
    )
    .transform((val) => val?.trim())
    .optional()
    .nullable(),
});

// Schema with business logic validations
const paymentTransactionWithValidations = basePaymentTransactionSchema
  .refine(
    (data) => {
      // Amount consistency validation
      const calculatedLocal = data.amount_usd * data.exchange_rate_used;
      const tolerance = PAYMENT_TRANSACTION_VALIDATION.AMOUNT_CONSISTENCY_TOLERANCE;
      return Math.abs(calculatedLocal - data.amount_local) <= tolerance;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.AMOUNT_CONSISTENCY_INVALID,
      path: ['amount_local'],
    },
  )
  .refine(
    (data) => {
      // Completed date must be after initiated date
      if (data.completed_at && data.initiated_at) {
        return data.completed_at.getTime() >= data.initiated_at.getTime();
      }
      return true;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.DATE_SEQUENCE_INVALID,
      path: ['completed_at'],
    },
  )
  .refine(
    (data) => {
      // Failed date must be after initiated date
      if (data.failed_at && data.initiated_at) {
        return data.failed_at.getTime() >= data.initiated_at.getTime();
      }
      return true;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.DATE_SEQUENCE_INVALID,
      path: ['failed_at'],
    },
  )
  .refine(
    (data) => {
      // Failure reason is required when status is FAILED
      if (data.transaction_status === PaymentTransactionStatus.FAILED) {
        return data.failure_reason && data.failure_reason.trim().length > 0;
      }
      return true;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_REQUIRED,
      path: ['failure_reason'],
    },
  );

// Puis appliquer les règles métier sur ce sous-schéma
export const createPaymentTransactionSchema = basePaymentTransactionSchema
  .omit({
    completed_at: true,
    failed_at: true,
    failure_reason: true,
  })
  .refine(
    (data) => {
      const calculatedLocal = data.amount_usd * data.exchange_rate_used;
      const tolerance = PAYMENT_TRANSACTION_VALIDATION.AMOUNT_CONSISTENCY_TOLERANCE;
      return Math.abs(calculatedLocal - data.amount_local) <= tolerance;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.AMOUNT_CONSISTENCY_INVALID,
      path: ['amount_local'],
    },
  );

// Schema for updates - most fields optional
export const updatePaymentTransactionSchema = basePaymentTransactionSchema
  .partial()
  .refine(
    (data) => {
      // Amount consistency validation (only if all three values are present)
      if (
        data.amount_usd !== undefined &&
        data.exchange_rate_used !== undefined &&
        data.amount_local !== undefined
      ) {
        const calculatedLocal = data.amount_usd * data.exchange_rate_used;
        const tolerance = PAYMENT_TRANSACTION_VALIDATION.AMOUNT_CONSISTENCY_TOLERANCE;
        return Math.abs(calculatedLocal - data.amount_local) <= tolerance;
      }
      return true;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.AMOUNT_CONSISTENCY_INVALID,
      path: ['amount_local'],
    },
  )
  .refine(
    (data) => {
      // Date validation only if both dates are present
      if (data.completed_at && data.initiated_at) {
        return data.completed_at.getTime() >= data.initiated_at.getTime();
      }
      return true;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.DATE_SEQUENCE_INVALID,
      path: ['completed_at'],
    },
  )
  .refine(
    (data) => {
      // Failure reason validation for FAILED status
      if (data.transaction_status === PaymentTransactionStatus.FAILED) {
        return data.failure_reason && data.failure_reason.trim().length > 0;
      }
      return true;
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_REQUIRED,
      path: ['failure_reason'],
    },
  );

// Schema for filters
export const paymentTransactionFiltersSchema = z
  .object({
    billing_cycle: z.number().int().min(1).optional(),
    adjustment: z.number().int().min(1).optional(),
    payment_method: z.number().int().min(1).optional(),
    currency_code: z
      .string()
      .length(3)
      .regex(PAYMENT_TRANSACTION_VALIDATION.CURRENCY_CODE.PATTERN)
      .optional()
      .transform((val) => val?.toUpperCase()),
    transaction_status: z.nativeEnum(PaymentTransactionStatus).optional(),
    payment_reference: z.string().min(1).max(100).optional(),
    min_amount_usd: z.number().min(0).optional(),
    max_amount_usd: z.number().min(0).optional(),
    min_amount_local: z.number().min(0).optional(),
    max_amount_local: z.number().min(0).optional(),
    initiated_after: z.date().optional(),
    initiated_before: z.date().optional(),
    completed_after: z.date().optional(),
    completed_before: z.date().optional(),
    failed_after: z.date().optional(),
    failed_before: z.date().optional(),
  })
  .strict();

// Schema for GUID validation
export const paymentTransactionGuidSchema = z
  .string()
  .regex(/^\d{6}$/, PAYMENT_TRANSACTION_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= PAYMENT_TRANSACTION_VALIDATION.GUID.MIN_VALUE &&
      val <= PAYMENT_TRANSACTION_VALIDATION.GUID.MAX_VALUE,
    PAYMENT_TRANSACTION_ERRORS.GUID_INVALID,
  );

// Schema for status transitions
export const statusTransitionSchema = z
  .object({
    current_status: z.nativeEnum(PaymentTransactionStatus),
    new_status: z.nativeEnum(PaymentTransactionStatus),
  })
  .refine(
    (data) => {
      const allowedTransitions = PAYMENT_TRANSACTION_STATUS_TRANSITIONS[
        data.current_status
      ] as PaymentTransactionStatus[];
      return allowedTransitions.includes(data.new_status);
    },
    {
      message: PAYMENT_TRANSACTION_ERRORS.INVALID_STATUS_TRANSITION,
      path: ['new_status'],
    },
  );
// .refine(
//   (data) => {
//     const allowedTransitions = PAYMENT_TRANSACTION_STATUS_TRANSITIONS[data.current_status];
//     return allowedTransitions.includes(data.new_status);
//   },
//   {
//     message: PAYMENT_TRANSACTION_ERRORS.INVALID_STATUS_TRANSITION,
//     path: ['new_status'],
//   },
// );

// Schema for transaction completion
export const completeTransactionSchema = z.object({
  completed_at: z
    .date()
    .optional()
    .default(() => new Date()),
});

// Schema for transaction failure
export const failTransactionSchema = z.object({
  failure_reason: z
    .string({
      required_error: PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_REQUIRED,
    })
    .min(
      PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MIN_LENGTH,
      PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_INVALID,
    )
    .max(
      PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MAX_LENGTH,
      PAYMENT_TRANSACTION_ERRORS.FAILURE_REASON_INVALID,
    )
    .transform((val) => val.trim()),
  failed_at: z
    .date()
    .optional()
    .default(() => new Date()),
});

// Schema for search criteria
export const paymentTransactionSearchSchema = z
  .object({
    status: z.nativeEnum(PaymentTransactionStatus).optional(),
    payment_method: z.number().int().min(1).optional(),
    currency_code: z
      .string()
      .length(3)
      .regex(PAYMENT_TRANSACTION_VALIDATION.CURRENCY_CODE.PATTERN)
      .optional(),
    min_amount: z.number().min(0).optional(),
    max_amount: z.number().min(0).optional(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    payment_reference: z.string().min(1).max(100).optional(),
  })
  .refine(
    (data) => {
      // End date must be after start date
      if (data.start_date && data.end_date) {
        return data.end_date.getTime() >= data.start_date.getTime();
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    },
  );

// Validation functions with error handling
export const validatePaymentTransactionCreation = (data: any) => {
  try {
    return createPaymentTransactionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validatePaymentTransactionUpdate = (data: any) => {
  try {
    return updatePaymentTransactionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validatePaymentTransactionFilters = (data: any) => {
  try {
    return paymentTransactionFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validatePaymentTransactionGuid = (guid: any) => {
  try {
    return paymentTransactionGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(PAYMENT_TRANSACTION_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

export const validateStatusTransition = (data: any) => {
  try {
    return statusTransitionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(PAYMENT_TRANSACTION_ERRORS.INVALID_STATUS_TRANSITION);
    }
    throw error;
  }
};

export const validateTransactionCompletion = (data: any) => {
  try {
    return completeTransactionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Completion validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
};

export const validateTransactionFailure = (data: any) => {
  try {
    return failTransactionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Failure validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
};

export const validatePaymentTransactionSearch = (data: any) => {
  try {
    return paymentTransactionSearchSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Search validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

// Complete schema for responses (with metadata)
export const paymentTransaction = basePaymentTransactionSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(PAYMENT_TRANSACTION_VALIDATION.GUID.MIN_VALUE)
    .max(PAYMENT_TRANSACTION_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Grouped export for easier imports
export const paymentTransactionSchemas = {
  validatePaymentTransactionCreation,
  validatePaymentTransactionUpdate,
  validatePaymentTransactionFilters,
  validatePaymentTransactionGuid,
  validateStatusTransition,
  validateTransactionCompletion,
  validateTransactionFailure,
  validatePaymentTransactionSearch,
  createPaymentTransactionSchema,
  updatePaymentTransactionSchema,
  paymentTransactionFiltersSchema,
  paymentTransactionGuidSchema,
  statusTransitionSchema,
  completeTransactionSchema,
  failTransactionSchema,
  paymentTransactionSearchSchema,
};

// TypeScript types generated from schemas
export type CreatePaymentTransactionInput = z.infer<typeof createPaymentTransactionSchema>;
export type UpdatePaymentTransactionInput = z.infer<typeof updatePaymentTransactionSchema>;
export type PaymentTransactionData = z.infer<typeof paymentTransaction>;
export type PaymentTransactionFilters = z.infer<typeof paymentTransactionFiltersSchema>;
export type StatusTransitionData = z.infer<typeof statusTransitionSchema>;
export type CompleteTransactionData = z.infer<typeof completeTransactionSchema>;
export type FailTransactionData = z.infer<typeof failTransactionSchema>;
export type PaymentTransactionSearchData = z.infer<typeof paymentTransactionSearchSchema>;
