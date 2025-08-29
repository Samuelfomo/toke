import { z } from 'zod';

import { CURRENCY_DEFAULTS, CURRENCY_ERRORS, CURRENCY_VALIDATION } from '../constants/currency';

// Schéma de base pour les validations communes
const baseCurrencySchema = z.object({
  code: z
    .string({ required_error: CURRENCY_ERRORS.CODE_REQUIRED })
    .min(CURRENCY_VALIDATION.CODE.MIN_LENGTH)
    .max(CURRENCY_VALIDATION.CODE.MAX_LENGTH)
    .regex(CURRENCY_VALIDATION.CODE.PATTERN, CURRENCY_ERRORS.CODE_INVALID)
    .transform((val) => val.toUpperCase()),

  name: z
    .string({ required_error: CURRENCY_ERRORS.NAME_REQUIRED })
    .min(CURRENCY_VALIDATION.NAME.MIN_LENGTH)
    .max(CURRENCY_VALIDATION.NAME.MAX_LENGTH),

  symbol: z
    .string({ required_error: CURRENCY_ERRORS.SYMBOL_REQUIRED })
    .min(CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH)
    .max(CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH),

  decimal_places: z
    .number({ required_error: CURRENCY_ERRORS.DECIMAL_PLACES_REQUIRED })
    .int()
    .min(CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE)
    .max(CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE),

  active: z.boolean().default(CURRENCY_DEFAULTS.ACTIVE),
});

// Schéma pour la création d'un pays
export const createCurrencySchema = baseCurrencySchema;

// Schéma pour la mise à jour (tous les champs optionnels)
export const updateCurrencySchema = baseCurrencySchema.partial();

// Schéma pour les réponses complètes (avec métadonnées)
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

// Schéma pour la pagination
export const paginationSchema = z.object({
  offset: z.number().int().min(0).default(CURRENCY_DEFAULTS.PAGINATION.OFFSET),
  limit: z
    .number()
    .int()
    .min(1)
    .max(CURRENCY_DEFAULTS.PAGINATION.MAX_LIMIT)
    .default(CURRENCY_DEFAULTS.PAGINATION.LIMIT),
});

// Schéma pour les filtres de recherche
export const currencyFiltersSchema = z.object({
  is_active: z.boolean().optional(),
});

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
export const countryResponseSchema = apiResponseSchema(currency);
export const countryListResponseSchema = apiResponseSchema(
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
export const validateCurrencyCreation = (data: unknown) => createCurrencySchema.parse(data);
export const validateCurrencyUpdate = (data: unknown) => updateCurrencySchema.parse(data);
export const validatePagination = (data: unknown) => paginationSchema.parse(data);
export const validateCurrencyFilters = (data: unknown) => currencyFiltersSchema.parse(data);
