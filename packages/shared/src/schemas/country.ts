// shared/src/schemas/country.ts
import { z } from 'zod';

import { COUNTRY_DEFAULTS, COUNTRY_ERRORS, COUNTRY_VALIDATION } from '../constants/country.js';

// Schéma de base pour les validations communes
const baseCountrySchema = z.object({
  code: z
    .string({ required_error: COUNTRY_ERRORS.CODE_REQUIRED })
    .min(COUNTRY_VALIDATION.CODE.MIN_LENGTH)
    .max(COUNTRY_VALIDATION.CODE.MAX_LENGTH)
    .regex(COUNTRY_VALIDATION.CODE.PATTERN, COUNTRY_ERRORS.CODE_INVALID)
    .transform((val) => val.toUpperCase()),

  name_en: z
    .string({ required_error: COUNTRY_ERRORS.NAME_EN_REQUIRED })
    .min(COUNTRY_VALIDATION.NAME.MIN_LENGTH, COUNTRY_ERRORS.NAME_INVALID)
    .max(COUNTRY_VALIDATION.NAME.MAX_LENGTH, COUNTRY_ERRORS.NAME_INVALID)
    .trim(),

  name_local: z
    .string()
    .min(COUNTRY_VALIDATION.NAME.MIN_LENGTH, COUNTRY_ERRORS.NAME_INVALID)
    .max(COUNTRY_VALIDATION.NAME.MAX_LENGTH, COUNTRY_ERRORS.NAME_INVALID)
    .trim()
    .optional()
    .nullable(),

  default_currency_code: z
    .string({ required_error: COUNTRY_ERRORS.CURRENCY_REQUIRED })
    .length(COUNTRY_VALIDATION.CURRENCY_CODE.LENGTH)
    .regex(COUNTRY_VALIDATION.CURRENCY_CODE.PATTERN, COUNTRY_ERRORS.CURRENCY_INVALID)
    .transform((val) => val.toUpperCase()),

  default_language_code: z
    .string({ required_error: COUNTRY_ERRORS.LANGUAGE_REQUIRED })
    .length(COUNTRY_VALIDATION.LANGUAGE_CODE.LENGTH)
    .regex(COUNTRY_VALIDATION.LANGUAGE_CODE.PATTERN, COUNTRY_ERRORS.LANGUAGE_INVALID)
    .transform((val) => val.toLowerCase()),

  active: z.boolean().default(COUNTRY_DEFAULTS.ACTIVE),

  timezone_default: z
    .string()
    .max(COUNTRY_VALIDATION.TIMEZONE.MAX_LENGTH)
    .regex(COUNTRY_VALIDATION.TIMEZONE.PATTERN, COUNTRY_ERRORS.TIMEZONE_INVALID)
    .default(COUNTRY_DEFAULTS.TIMEZONE),

  phone_prefix: z
    .string({ required_error: COUNTRY_ERRORS.PHONE_PREFIX_REQUIRED })
    .min(COUNTRY_VALIDATION.PHONE_PREFIX.MIN_LENGTH)
    .max(COUNTRY_VALIDATION.PHONE_PREFIX.MAX_LENGTH)
    .regex(COUNTRY_VALIDATION.PHONE_PREFIX.PATTERN, COUNTRY_ERRORS.PHONE_PREFIX_INVALID),
});

// Schéma pour la création d'un pays
export const createCountrySchema = baseCountrySchema;

// Schéma pour la mise à jour (tous les champs optionnels)
export const updateCountrySchema = baseCountrySchema.partial();

// Schéma pour les réponses complètes (avec métadonnées)
export const country = baseCountrySchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(COUNTRY_VALIDATION.GUID.MIN_VALUE)
    .max(COUNTRY_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schéma pour la pagination
export const paginationSchema = z.object({
  offset: z.number().int().min(0).default(COUNTRY_DEFAULTS.PAGINATION.OFFSET),
  limit: z
    .number()
    .int()
    .min(1)
    .max(COUNTRY_DEFAULTS.PAGINATION.MAX_LIMIT)
    .default(COUNTRY_DEFAULTS.PAGINATION.LIMIT),
});

// Schéma pour les filtres de recherche
export const countryFiltersSchema = z.object({
  timezone_default: z.string().optional(),
  default_currency_code: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .transform((val) => val.toUpperCase())
    .optional(),
  default_language_code: z
    .string()
    .length(2)
    .regex(/^[a-z]{2}$/)
    .transform((val) => val.toLowerCase())
    .optional(),
  is_active: z.boolean().optional(),
});

// Schéma pour les paramètres d'URL
export const countryParamsSchema = z.object({
  guid: z
    .string()
    .regex(/^\d{6}$/, COUNTRY_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val)),

  code: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/i, COUNTRY_ERRORS.CODE_INVALID)
    .transform((val) => val.toUpperCase()),

  identifier: z.string().min(1),
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
export const countryResponseSchema = apiResponseSchema(country);
export const countryListResponseSchema = apiResponseSchema(
  z.object({
    countries: z.object({
      revision: z.string().optional(),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
      items: z.array(country),
    }),
  }),
);

// Types TypeScript générés à partir des schémas
export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
export type CountryData = z.infer<typeof country>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CountryFiltersInput = z.infer<typeof countryFiltersSchema>;
export type CountryParamsInput = z.infer<typeof countryParamsSchema>;
export type ApiErrorData = z.infer<typeof apiErrorSchema>;

// Fonctions utilitaires de validation
export const validateCountryCreation = (data: unknown) => createCountrySchema.parse(data);
export const validateCountryUpdate = (data: unknown) => updateCountrySchema.parse(data);
export const validatePagination = (data: unknown) => paginationSchema.parse(data);
export const validateCountryFilters = (data: unknown) => countryFiltersSchema.parse(data);
