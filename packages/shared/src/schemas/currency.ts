import { z } from 'zod';

import { CURRENCY_DEFAULTS, CURRENCY_ERRORS, CURRENCY_VALIDATION } from '../constants/currency';

// Schéma de base pour les validations communes
const baseCurrencySchema = z.object({
  code: z
    .string({
      required_error: CURRENCY_ERRORS.CODE_REQUIRED,
      invalid_type_error: CURRENCY_ERRORS.CODE_INVALID,
    })
    .min(CURRENCY_VALIDATION.CODE.MIN_LENGTH, CURRENCY_ERRORS.CODE_INVALID)
    .max(CURRENCY_VALIDATION.CODE.MAX_LENGTH, CURRENCY_ERRORS.CODE_INVALID)
    .regex(CURRENCY_VALIDATION.CODE.PATTERN, CURRENCY_ERRORS.CODE_INVALID)
    .transform((val) => val.trim().toUpperCase()),

  name: z
    .string({
      required_error: CURRENCY_ERRORS.NAME_REQUIRED,
      invalid_type_error: CURRENCY_ERRORS.NAME_INVALID,
    })
    .min(CURRENCY_VALIDATION.NAME.MIN_LENGTH, CURRENCY_ERRORS.NAME_INVALID)
    .max(CURRENCY_VALIDATION.NAME.MAX_LENGTH, CURRENCY_ERRORS.NAME_INVALID)
    .transform((val) => val.trim()),

  symbol: z
    .string({
      required_error: CURRENCY_ERRORS.SYMBOL_REQUIRED,
      invalid_type_error: CURRENCY_ERRORS.SYMBOL_INVALID,
    })
    .min(CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH, CURRENCY_ERRORS.SYMBOL_INVALID)
    .max(CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH, CURRENCY_ERRORS.SYMBOL_INVALID)
    .transform((val) => val.trim()),

  decimal_places: z.coerce
    .number({
      required_error: CURRENCY_ERRORS.DECIMAL_PLACES_REQUIRED,
      invalid_type_error: CURRENCY_ERRORS.DECIMAL_PLACES_INVALID,
    })
    .int(CURRENCY_ERRORS.DECIMAL_PLACES_INVALID)
    .min(CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE, CURRENCY_ERRORS.DECIMAL_PLACES_INVALID)
    .max(CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE, CURRENCY_ERRORS.DECIMAL_PLACES_INVALID)
    .default(CURRENCY_DEFAULTS.DECIMAL_PLACES),

  active: z.coerce
    .boolean()
    .default(CURRENCY_DEFAULTS.ACTIVE)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),
});

// Schéma pour création - tous les champs requis
export const createCurrencySchema = baseCurrencySchema;

// Schéma pour mise à jour - tous les champs optionnels
export const updateCurrencySchema = baseCurrencySchema.partial();

// Schéma pour les filtres de recherche
export const currencyFiltersSchema = z
  .object({
    is_active: z.coerce.boolean().optional(),
  })
  .strict();

// Schéma pour pagination (réutilisable)
export const paginationSchema = z
  .object({
    offset: z.coerce.number().int().min(0).default(CURRENCY_DEFAULTS.PAGINATION.OFFSET),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CURRENCY_DEFAULTS.PAGINATION.MAX_LIMIT)
      .default(CURRENCY_DEFAULTS.PAGINATION.LIMIT),
  })
  .partial();

// Schéma pour validation du GUID
export const currencyGuidSchema = z
  .string()
  .regex(/^\d{6}$/, CURRENCY_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) => val >= CURRENCY_VALIDATION.GUID.MIN_VALUE && val <= CURRENCY_VALIDATION.GUID.MAX_VALUE,
    CURRENCY_ERRORS.GUID_INVALID,
  );

// Fonctions de validation avec gestion d'erreurs
export const validateCurrencyCreation = (data: any) => {
  try {
    return createCurrencySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateCurrencyUpdate = (data: any) => {
  try {
    return updateCurrencySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateCurrencyFilters = (data: any) => {
  try {
    return currencyFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateCurrencyGuid = (guid: any) => {
  try {
    return currencyGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(CURRENCY_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Export groupé pour faciliter l'import
export const currencySchemas = {
  validateCurrencyCreation,
  validateCurrencyUpdate,
  validateCurrencyFilters,
  validateCurrencyGuid,
  createCurrencySchema,
  updateCurrencySchema,
  currencyFiltersSchema,
  paginationSchema,
  currencyGuidSchema,
};

// // Schéma pour les réponses complètes (avec métadonnées)
export const currency = baseCurrencySchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(CURRENCY_VALIDATION.GUID.MIN_VALUE)
    .max(CURRENCY_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// // Schéma pour la pagination
// export const paginationSchema = z.object({
//   offset: z.number().int().min(0).default(CURRENCY_DEFAULTS.PAGINATION.OFFSET),
//   limit: z
//     .number()
//     .int()
//     .min(1)
//     .max(CURRENCY_DEFAULTS.PAGINATION.MAX_LIMIT)
//     .default(CURRENCY_DEFAULTS.PAGINATION.LIMIT),
// });

// // Schéma pour les filtres de recherche
// export const currencyFiltersSchema = z.object({
//   is_active: z.boolean().optional(),
// });

// Schéma pour les paramètres d'URL
export const currencyParamsSchema = z.object({
  guid: z
    .string()
    .regex(/^\d{6}$/, CURRENCY_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val)),

  code: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/i, CURRENCY_ERRORS.CODE_INVALID)
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
export const currencyResponseSchema = apiResponseSchema(currency);
export const currencyListResponseSchema = apiResponseSchema(
  z.object({
    countries: z.object({
      revision: z.string().optional(),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
      items: z.array(currency),
    }),
  }),
);

// Types TypeScript générés à partir des schémas
export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;
export type CurrencyData = z.infer<typeof currency>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CurrencyFiltersInput = z.infer<typeof currencyFiltersSchema>;
export type CurrencyParamsInput = z.infer<typeof currencyParamsSchema>;
export type ApiErrorData = z.infer<typeof apiErrorSchema>;

// Fonctions utilitaires de validation
// export const validateCurrencyCreation = (data: unknown) => createCurrencySchema.parse(data);
// export const validateCurrencyUpdate = (data: unknown) => updateCurrencySchema.parse(data);
export const validatePagination = (data: unknown) => paginationSchema.parse(data);
// export const validateCurrencyFilters = (data: unknown) => currencyFiltersSchema.parse(data);
