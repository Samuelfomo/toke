import { z } from 'zod';

import { LEXICON_DEFAULTS, LEXICON_ERRORS, LEXICON_VALIDATION } from '../constants/lexicon.js';
import { LanguageValidationUtils } from '../utils/language.validation.js';

// Schéma de base pour les validations communes
const baseLexiconSchema = z.object({
  reference: z
    .string({
      required_error: LEXICON_ERRORS.REFERENCE_REQUIRED,
      invalid_type_error: LEXICON_ERRORS.REFERENCE_INVALID,
    })
    .min(LEXICON_VALIDATION.REFERENCE.MIN_LENGTH, LEXICON_ERRORS.REFERENCE_INVALID)
    .max(LEXICON_VALIDATION.REFERENCE.MAX_LENGTH, LEXICON_ERRORS.REFERENCE_INVALID)
    .regex(LEXICON_VALIDATION.REFERENCE.PATTERN, LEXICON_ERRORS.REFERENCE_INVALID)
    .transform((val) => val.trim()),

  translation: z
    .record(z.string().min(1, 'Translation value cannot be empty'))
    .refine(
      (translations) => {
        // Vérifier la présence de la langue par défaut (français)
        return (
          translations[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG] &&
          translations[LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG]!.trim().length > 0
        );
      },
      {
        message: LEXICON_ERRORS.DEFAULT_LANGUAGE_REQUIRED,
      },
    )
    .refine(
      async (translations) => {
        // Valider tous les codes de langue
        for (const langCode of Object.keys(translations)) {
          if (!LanguageValidationUtils.validateCode(langCode)) {
            return false;
          }
        }
        return true;
      },
      {
        message: LEXICON_ERRORS.LANGUAGE_CODE_INVALID,
      },
    )
    .transform((translations) => {
      // Nettoyer les traductions
      const cleaned: Record<string, string> = {};
      for (const [langCode, translation] of Object.entries(translations)) {
        cleaned[langCode.trim().toLowerCase()] = translation.trim();
      }
      return cleaned;
    }),

  portable: z.coerce
    .boolean()
    .default(LEXICON_DEFAULTS.PORTABLE)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),
});

// Schéma pour création - tous les champs requis
export const createLexiconSchema = baseLexiconSchema;

// Schéma pour mise à jour - tous les champs optionnels
export const updateLexiconSchema = baseLexiconSchema.partial();

// Schéma pour les filtres de recherche
export const lexiconFiltersSchema = z
  .object({
    reference: z
      .string()
      .regex(LEXICON_VALIDATION.REFERENCE.PATTERN, LEXICON_ERRORS.REFERENCE_INVALID)
      .transform((val) => val.trim())
      .optional(),
    portable: z.coerce.boolean().optional(),
    language: z
      .string()
      .length(2)
      .transform((val) => val.trim().toLowerCase())
      .optional(),
  })
  .strict();

// Schéma pour validation du GUID
export const lexiconGuidSchema = z
  .string()
  .regex(/^\d{6}$/, LEXICON_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) => val >= LEXICON_VALIDATION.GUID.MIN_VALUE && val <= LEXICON_VALIDATION.GUID.MAX_VALUE,
    LEXICON_ERRORS.GUID_INVALID,
  );

// Schéma pour mise à jour partielle des traductions
export const partialTranslationSchema = z
  .record(z.string().min(1, 'Translation value cannot be empty'))
  .refine(
    async (translations) => {
      // Valider tous les codes de langue
      for (const langCode of Object.keys(translations)) {
        if (!LanguageValidationUtils.validateCode(langCode)) {
          return false;
        }
      }
      return true;
    },
    {
      message: LEXICON_ERRORS.LANGUAGE_CODE_INVALID,
    },
  )
  .transform((translations) => {
    // Nettoyer les traductions
    const cleaned: Record<string, string> = {};
    for (const [langCode, translation] of Object.entries(translations)) {
      cleaned[langCode.trim().toLowerCase()] = translation.trim();
    }
    return cleaned;
  });

// Fonctions de validation avec gestion d'erreurs
export const validateLexiconCreation = (data: any) => {
  try {
    return createLexiconSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLexiconUpdate = (data: any) => {
  try {
    return updateLexiconSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLexiconFilters = (data: any) => {
  try {
    return lexiconFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateLexiconGuid = (guid: any) => {
  try {
    return lexiconGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(LEXICON_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

export const validatePartialTranslations = (data: any) => {
  try {
    return partialTranslationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Translation validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
};

// Schéma complet pour les réponses (avec métadonnées)
export const lexicon = baseLexiconSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(LEXICON_VALIDATION.GUID.MIN_VALUE)
    .max(LEXICON_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schéma pour les paramètres d'URL
export const lexiconParamsSchema = z.object({
  guid: z
    .string()
    .regex(/^\d{6}$/, LEXICON_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val)),

  reference: z
    .string()
    .min(1)
    .max(LEXICON_VALIDATION.REFERENCE.MAX_LENGTH)
    .regex(LEXICON_VALIDATION.REFERENCE.PATTERN, LEXICON_ERRORS.REFERENCE_INVALID),

  language: z
    .string()
    .length(2)
    .transform((val) => val.toLowerCase()),
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
export const lexiconResponseSchema = apiResponseSchema(lexicon);
export const lexiconListResponseSchema = apiResponseSchema(
  z.object({
    lexicons: z.object({
      revision: z.string().optional(),
      pagination: z.object({
        offset: z.number(),
        limit: z.number(),
        count: z.number(),
      }),
      items: z.array(lexicon),
    }),
    available_language: z.array(z.string()).optional(),
  }),
);

// Export groupé pour faciliter l'import
export const lexiconSchemas = {
  validateLexiconCreation,
  validateLexiconUpdate,
  validateLexiconFilters,
  validateLexiconGuid,
  validatePartialTranslations,
  createLexiconSchema,
  updateLexiconSchema,
  lexiconFiltersSchema,
  lexiconGuidSchema,
  partialTranslationSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateLexiconInput = z.infer<typeof createLexiconSchema>;
export type UpdateLexiconInput = z.infer<typeof updateLexiconSchema>;
export type LexiconData = z.infer<typeof lexicon>;
export type LexiconFiltersInput = z.infer<typeof lexiconFiltersSchema>;
export type LexiconParamsInput = z.infer<typeof lexiconParamsSchema>;
export type PartialTranslationInput = z.infer<typeof partialTranslationSchema>;
export type ApiErrorData = z.infer<typeof apiErrorSchema>;
