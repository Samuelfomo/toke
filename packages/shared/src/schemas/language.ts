import { z } from 'zod';

import { LANGUAGE_DEFAULTS, LANGUAGE_ERRORS, LANGUAGE_VALIDATION } from '../constants/language.js'; // Schéma de base pour les validations communes

// Schéma de base pour les validations communes
const baseLanguageSchema = z.object({
  code: z
    .string({
      required_error: LANGUAGE_ERRORS.CODE_REQUIRED,
      invalid_type_error: LANGUAGE_ERRORS.CODE_INVALID,
    })
    .min(LANGUAGE_VALIDATION.CODE.MIN_LENGTH, LANGUAGE_ERRORS.CODE_INVALID)
    .max(LANGUAGE_VALIDATION.CODE.MAX_LENGTH, LANGUAGE_ERRORS.CODE_INVALID)
    .regex(LANGUAGE_VALIDATION.CODE.PATTERN, LANGUAGE_ERRORS.CODE_INVALID)
    .transform((val) => val.trim().toLowerCase()),

  name_en: z
    .string({
      required_error: LANGUAGE_ERRORS.NAME_EN_REQUIRED,
      invalid_type_error: LANGUAGE_ERRORS.NAME_EN_INVALID,
    })
    .min(LANGUAGE_VALIDATION.NAME_EN.MIN_LENGTH, LANGUAGE_ERRORS.NAME_EN_INVALID)
    .max(LANGUAGE_VALIDATION.NAME_EN.MAX_LENGTH, LANGUAGE_ERRORS.NAME_EN_INVALID)
    .transform((val) => val.trim()),

  name_local: z
    .string({
      required_error: LANGUAGE_ERRORS.NAME_LOCAL_REQUIRED,
      invalid_type_error: LANGUAGE_ERRORS.NAME_LOCAL_INVALID,
    })
    .min(LANGUAGE_VALIDATION.NAME_LOCAL.MIN_LENGTH, LANGUAGE_ERRORS.NAME_LOCAL_INVALID)
    .max(LANGUAGE_VALIDATION.NAME_LOCAL.MAX_LENGTH, LANGUAGE_ERRORS.NAME_LOCAL_INVALID)
    .transform((val) => val.trim()),

  active: z.coerce
    .boolean()
    .default(LANGUAGE_DEFAULTS.ACTIVE)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),
});

// Schéma pour création - tous les champs requis
export const createLanguageSchema = baseLanguageSchema;

// Schéma pour mise à jour - tous les champs optionnels
export const updateLanguageSchema = baseLanguageSchema.partial();

// Schéma pour les filtres de recherche
export const languageFiltersSchema = z
  .object({
    code: z
      .string()
      .regex(LANGUAGE_VALIDATION.CODE.PATTERN, LANGUAGE_ERRORS.CODE_INVALID)
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    name_en: z
      .string()
      .min(1)
      .transform((val) => val.trim())
      .optional(),
    name_local: z
      .string()
      .min(1)
      .transform((val) => val.trim())
      .optional(),
    active: z.coerce.boolean().optional(),
  })
  .strict();

// Schéma pour validation du GUID
export const languageGuidSchema = z
  .string()
  .regex(/^\d{6}$/, LANGUAGE_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) => val >= LANGUAGE_VALIDATION.GUID.MIN_VALUE && val <= LANGUAGE_VALIDATION.GUID.MAX_VALUE,
    LANGUAGE_ERRORS.GUID_INVALID,
  );

// Fonctions de validation avec gestion d'erreurs
export const validateLanguageCreation = (data: any) => {
  try {
    return createLanguageSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLanguageUpdate = (data: any) => {
  try {
    return updateLanguageSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLanguageFilters = (data: any) => {
  try {
    return languageFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLanguageGuid = (guid: any) => {
  try {
    return languageGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(LANGUAGE_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Schéma complet pour les réponses (avec métadonnées)
export const language = baseLanguageSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(LANGUAGE_VALIDATION.GUID.MIN_VALUE)
    .max(LANGUAGE_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schéma pour les paramètres d'URL
export const languageParamsSchema = z.object({
  guid: z
    .string()
    .regex(/^\d{6}$/, LANGUAGE_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val)),

  code: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/i, LANGUAGE_ERRORS.CODE_INVALID)
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
export const languageResponseSchema = apiResponseSchema(language);
export const languageListResponseSchema = apiResponseSchema(
  z.object({
    languages: z.object({
      revision: z.string().optional(),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
      items: z.array(language),
    }),
  }),
);

// Export groupé pour faciliter l'import
export const languageSchemas = {
  validateLanguageCreation,
  validateLanguageUpdate,
  validateLanguageFilters,
  validateLanguageGuid,
  createLanguageSchema,
  updateLanguageSchema,
  languageFiltersSchema,
  languageGuidSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateLanguageInput = z.infer<typeof createLanguageSchema>;
export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>;
export type LanguageData = z.infer<typeof language>;
export type LanguageFiltersInput = z.infer<typeof languageFiltersSchema>;
export type LanguageParamsInput = z.infer<typeof languageParamsSchema>;
export type ApiErrorData = z.infer<typeof apiErrorSchema>;
