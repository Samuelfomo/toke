import { z } from 'zod';

import {
  EXCHANGE_RATE_DEFAULTS,
  EXCHANGE_RATE_ERRORS,
  EXCHANGE_RATE_VALIDATION,
} from '../constants/exchange.rate.js';

// Schéma de base pour les validations communes
const baseExchangeRateSchema = z.object({
  from_currency_code: z
    .string({
      required_error: EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_REQUIRED,
      invalid_type_error: EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
    })
    .min(
      EXCHANGE_RATE_VALIDATION.FROM_CURRENCY_CODE.MIN_LENGTH,
      EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
    )
    .max(
      EXCHANGE_RATE_VALIDATION.FROM_CURRENCY_CODE.MAX_LENGTH,
      EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
    )
    .regex(
      EXCHANGE_RATE_VALIDATION.FROM_CURRENCY_CODE.PATTERN,
      EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
    )
    .transform((val) => val.trim().toUpperCase()),

  to_currency_code: z
    .string({
      required_error: EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_REQUIRED,
      invalid_type_error: EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
    })
    .min(
      EXCHANGE_RATE_VALIDATION.TO_CURRENCY_CODE.MIN_LENGTH,
      EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
    )
    .max(
      EXCHANGE_RATE_VALIDATION.TO_CURRENCY_CODE.MAX_LENGTH,
      EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
    )
    .regex(
      EXCHANGE_RATE_VALIDATION.TO_CURRENCY_CODE.PATTERN,
      EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
    )
    .transform((val) => val.trim().toUpperCase()),

  exchange_rate: z.coerce
    .number({
      required_error: EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_REQUIRED,
      invalid_type_error: EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_INVALID,
    })
    .positive(EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_ZERO)
    .min(
      EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MIN_VALUE,
      EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_INVALID,
    )
    .max(
      EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MAX_VALUE,
      EXCHANGE_RATE_ERRORS.EXCHANGE_RATE_INVALID,
    ),

  created_by: z.coerce
    .number({
      required_error: EXCHANGE_RATE_ERRORS.CREATED_BY_REQUIRED,
      invalid_type_error: EXCHANGE_RATE_ERRORS.CREATED_BY_INVALID,
    })
    .int(EXCHANGE_RATE_ERRORS.CREATED_BY_INVALID)
    .min(EXCHANGE_RATE_VALIDATION.CREATED_BY.MIN_VALUE, EXCHANGE_RATE_ERRORS.CREATED_BY_INVALID)
    .max(EXCHANGE_RATE_VALIDATION.CREATED_BY.MAX_VALUE, EXCHANGE_RATE_ERRORS.CREATED_BY_INVALID),

  current: z.coerce
    .boolean()
    .default(EXCHANGE_RATE_DEFAULTS.CURRENT)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),
});
export const refinedBaseExchangeRateSchema = baseExchangeRateSchema.refine(
  (data) => data.from_currency_code !== data.to_currency_code,
  {
    message: EXCHANGE_RATE_ERRORS.SAME_CURRENCY_PAIR,
    path: ['from_currency_code', 'to_currency_code'],
  },
);
// .refine((data) => data.from_currency_code !== data.to_currency_code, {
//   message: EXCHANGE_RATE_ERRORS.SAME_CURRENCY_PAIR,
//   path: ['from_currency_code', 'to_currency_code'],
// });

// Schéma pour création - tous les champs requis
export const createExchangeRateSchema = baseExchangeRateSchema;

// Schéma pour mise à jour - tous les champs optionnels
export const updateExchangeRateSchema = baseExchangeRateSchema.partial().refine(
  (data: any) => {
    if (data.from_currency_code && data.to_currency_code) {
      return data.from_currency_code !== data.to_currency_code;
    }
    return true;
  },
  {
    message: EXCHANGE_RATE_ERRORS.SAME_CURRENCY_PAIR,
    path: ['from_currency_code', 'to_currency_code'],
  },
);

// Schéma pour les filtres de recherche
export const exchangeRateFiltersSchema = z
  .object({
    from_currency_code: z
      .string()
      .regex(
        EXCHANGE_RATE_VALIDATION.FROM_CURRENCY_CODE.PATTERN,
        EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
      )
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    to_currency_code: z
      .string()
      .regex(
        EXCHANGE_RATE_VALIDATION.TO_CURRENCY_CODE.PATTERN,
        EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
      )
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    current: z.coerce.boolean().optional(),
    created_by: z.coerce.number().int().positive().optional(),
  })
  .strict();

// Schéma pour validation du GUID
export const exchangeRateGuidSchema = z
  .string()
  .regex(/^\d{6}$/, EXCHANGE_RATE_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= EXCHANGE_RATE_VALIDATION.GUID.MIN_VALUE &&
      val <= EXCHANGE_RATE_VALIDATION.GUID.MAX_VALUE,
    EXCHANGE_RATE_ERRORS.GUID_INVALID,
  );

// Schéma pour les paramètres de conversion
export const currencyConversionSchema = z
  .object({
    amount: z.coerce
      .number({
        required_error: EXCHANGE_RATE_ERRORS.INVALID_AMOUNT,
        invalid_type_error: EXCHANGE_RATE_ERRORS.INVALID_AMOUNT,
      })
      .positive(EXCHANGE_RATE_ERRORS.INVALID_AMOUNT),

    from_currency: z
      .string()
      .regex(
        EXCHANGE_RATE_VALIDATION.FROM_CURRENCY_CODE.PATTERN,
        EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID,
      )
      .transform((val) => val.trim().toUpperCase()),

    to_currency: z
      .string()
      .regex(
        EXCHANGE_RATE_VALIDATION.TO_CURRENCY_CODE.PATTERN,
        EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID,
      )
      .transform((val) => val.trim().toUpperCase()),
  })
  .refine((data) => data.from_currency !== data.to_currency, {
    message: EXCHANGE_RATE_ERRORS.SAME_CURRENCY_PAIR,
    path: ['from_currency', 'to_currency'],
  });

// Fonctions de validation avec gestion d'erreurs
export const validateExchangeRateCreation = (data: any) => {
  try {
    return createExchangeRateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateExchangeRateUpdate = (data: any) => {
  try {
    return updateExchangeRateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateExchangeRateFilters = (data: any) => {
  try {
    return exchangeRateFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateExchangeRateGuid = (guid: any) => {
  try {
    return exchangeRateGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(EXCHANGE_RATE_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

export const validateCurrencyConversion = (data: any) => {
  try {
    return currencyConversionSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Conversion validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
};

// Schéma complet pour les réponses (avec métadonnées)
export const exchangeRate = baseExchangeRateSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(EXCHANGE_RATE_VALIDATION.GUID.MIN_VALUE)
    .max(EXCHANGE_RATE_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schéma pour les paramètres d'URL
export const exchangeRateParamsSchema = z.object({
  guid: z
    .string()
    .regex(/^\d{6}$/, EXCHANGE_RATE_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val)),

  from_currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/i, EXCHANGE_RATE_ERRORS.FROM_CURRENCY_CODE_INVALID)
    .transform((val) => val.toUpperCase()),

  to_currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/i, EXCHANGE_RATE_ERRORS.TO_CURRENCY_CODE_INVALID)
    .transform((val) => val.toUpperCase()),
});

// Schéma pour les réponses d'erreur API
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// Schéma pour les réponses API génériques
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
    success: z.boolean(),
  });

// Schémas de réponses spécifiques
export const exchangeRateResponseSchema = apiResponseSchema(exchangeRate);
export const exchangeRateListResponseSchema = apiResponseSchema(
  z.object({
    exchange_rates: z.object({
      revision: z.string().optional(),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
      items: z.array(exchangeRate),
    }),
  }),
);

// Export groupé pour faciliter l'import
export const exchangeRateSchemas = {
  validateExchangeRateCreation,
  validateExchangeRateUpdate,
  validateExchangeRateFilters,
  validateExchangeRateGuid,
  validateCurrencyConversion,
  createExchangeRateSchema,
  updateExchangeRateSchema,
  exchangeRateFiltersSchema,
  exchangeRateGuidSchema,
  currencyConversionSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;
export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>;
export type ExchangeRateData = z.infer<typeof exchangeRate>;
export type ExchangeRateFiltersInput = z.infer<typeof exchangeRateFiltersSchema>;
export type ExchangeRateParamsInput = z.infer<typeof exchangeRateParamsSchema>;
export type CurrencyConversionInput = z.infer<typeof currencyConversionSchema>;
export type ApiErrorData = z.infer<typeof apiErrorSchema>;
