"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lexiconSchemas = exports.lexiconListResponseSchema = exports.lexiconResponseSchema = exports.apiResponseSchema = exports.apiErrorSchema = exports.lexiconParamsSchema = exports.lexicon = exports.validatePartialTranslations = exports.validateLexiconGuid = exports.validateLexiconFilters = exports.validateLexiconUpdate = exports.validateLexiconCreation = exports.partialTranslationSchema = exports.lexiconGuidSchema = exports.lexiconFiltersSchema = exports.updateLexiconSchema = exports.createLexiconSchema = void 0;
const zod_1 = require("zod");
const lexicon_js_1 = require("../constants/lexicon.js");
const language_validation_js_1 = require("../utils/language.validation.js");
// Schéma de base pour les validations communes
const baseLexiconSchema = zod_1.z.object({
    reference: zod_1.z
        .string({
        required_error: lexicon_js_1.LEXICON_ERRORS.REFERENCE_REQUIRED,
        invalid_type_error: lexicon_js_1.LEXICON_ERRORS.REFERENCE_INVALID,
    })
        .min(lexicon_js_1.LEXICON_VALIDATION.REFERENCE.MIN_LENGTH, lexicon_js_1.LEXICON_ERRORS.REFERENCE_INVALID)
        .max(lexicon_js_1.LEXICON_VALIDATION.REFERENCE.MAX_LENGTH, lexicon_js_1.LEXICON_ERRORS.REFERENCE_INVALID)
        .regex(lexicon_js_1.LEXICON_VALIDATION.REFERENCE.PATTERN, lexicon_js_1.LEXICON_ERRORS.REFERENCE_INVALID)
        .transform((val) => val.trim()),
    translation: zod_1.z
        .record(zod_1.z.string().min(1, 'Translation value cannot be empty'))
        .refine((translations) => {
        // Vérifier la présence de la langue par défaut (français)
        return (translations[lexicon_js_1.LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG] &&
            translations[lexicon_js_1.LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG].trim().length > 0);
    }, {
        message: lexicon_js_1.LEXICON_ERRORS.DEFAULT_LANGUAGE_REQUIRED,
    })
        .refine((translations) => __awaiter(void 0, void 0, void 0, function* () {
        // Valider tous les codes de langue
        for (const langCode of Object.keys(translations)) {
            if (!language_validation_js_1.LanguageValidationUtils.validateCode(langCode)) {
                return false;
            }
        }
        return true;
    }), {
        message: lexicon_js_1.LEXICON_ERRORS.LANGUAGE_CODE_INVALID,
    })
        .transform((translations) => {
        // Nettoyer les traductions
        const cleaned = {};
        for (const [langCode, translation] of Object.entries(translations)) {
            cleaned[langCode.trim().toLowerCase()] = translation.trim();
        }
        return cleaned;
    }),
    portable: zod_1.z.coerce
        .boolean()
        .default(lexicon_js_1.LEXICON_DEFAULTS.PORTABLE)
        .transform((val) => {
        if (typeof val === 'string') {
            return val === 'true' || val === '1';
        }
        return Boolean(val);
    }),
});
// Schéma pour création - tous les champs requis
exports.createLexiconSchema = baseLexiconSchema;
// Schéma pour mise à jour - tous les champs optionnels
exports.updateLexiconSchema = baseLexiconSchema.partial();
// Schéma pour les filtres de recherche
exports.lexiconFiltersSchema = zod_1.z
    .object({
    reference: zod_1.z
        .string()
        .regex(lexicon_js_1.LEXICON_VALIDATION.REFERENCE.PATTERN, lexicon_js_1.LEXICON_ERRORS.REFERENCE_INVALID)
        .transform((val) => val.trim())
        .optional(),
    portable: zod_1.z.coerce.boolean().optional(),
    language: zod_1.z
        .string()
        .length(2)
        .transform((val) => val.trim().toLowerCase())
        .optional(),
})
    .strict();
// Schéma pour validation du GUID
exports.lexiconGuidSchema = zod_1.z
    .string()
    .regex(/^\d{6}$/, lexicon_js_1.LEXICON_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val))
    .refine((val) => val >= lexicon_js_1.LEXICON_VALIDATION.GUID.MIN_VALUE && val <= lexicon_js_1.LEXICON_VALIDATION.GUID.MAX_VALUE, lexicon_js_1.LEXICON_ERRORS.GUID_INVALID);
// Schéma pour mise à jour partielle des traductions
exports.partialTranslationSchema = zod_1.z
    .record(zod_1.z.string().min(1, 'Translation value cannot be empty'))
    .refine((translations) => __awaiter(void 0, void 0, void 0, function* () {
    // Valider tous les codes de langue
    for (const langCode of Object.keys(translations)) {
        if (!language_validation_js_1.LanguageValidationUtils.validateCode(langCode)) {
            return false;
        }
    }
    return true;
}), {
    message: lexicon_js_1.LEXICON_ERRORS.LANGUAGE_CODE_INVALID,
})
    .transform((translations) => {
    // Nettoyer les traductions
    const cleaned = {};
    for (const [langCode, translation] of Object.entries(translations)) {
        cleaned[langCode.trim().toLowerCase()] = translation.trim();
    }
    return cleaned;
});
// Fonctions de validation avec gestion d'erreurs
const validateLexiconCreation = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return exports.createLexiconSchema.parseAsync(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
});
exports.validateLexiconCreation = validateLexiconCreation;
const validateLexiconUpdate = (data) => {
    try {
        return exports.updateLexiconSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateLexiconUpdate = validateLexiconUpdate;
const validateLexiconFilters = (data) => {
    try {
        return exports.lexiconFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateLexiconFilters = validateLexiconFilters;
const validateLexiconGuid = (guid) => {
    try {
        return exports.lexiconGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(lexicon_js_1.LEXICON_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateLexiconGuid = validateLexiconGuid;
const validatePartialTranslations = (data) => {
    try {
        return exports.partialTranslationSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Translation validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validatePartialTranslations = validatePartialTranslations;
// Schéma complet pour les réponses (avec métadonnées)
exports.lexicon = baseLexiconSchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z
        .number()
        .int()
        .min(lexicon_js_1.LEXICON_VALIDATION.GUID.MIN_VALUE)
        .max(lexicon_js_1.LEXICON_VALIDATION.GUID.MAX_VALUE),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Schéma pour les paramètres d'URL
exports.lexiconParamsSchema = zod_1.z.object({
    guid: zod_1.z
        .string()
        .regex(/^\d{6}$/, lexicon_js_1.LEXICON_ERRORS.GUID_INVALID)
        .transform((val) => parseInt(val)),
    reference: zod_1.z
        .string()
        .min(1)
        .max(lexicon_js_1.LEXICON_VALIDATION.REFERENCE.MAX_LENGTH)
        .regex(lexicon_js_1.LEXICON_VALIDATION.REFERENCE.PATTERN, lexicon_js_1.LEXICON_ERRORS.REFERENCE_INVALID),
    language: zod_1.z
        .string()
        .length(2)
        .transform((val) => val.toLowerCase()),
});
// Schéma pour les réponses d'erreur API
exports.apiErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// Schéma pour les réponses API génériques
const apiResponseSchema = (dataSchema) => zod_1.z.object({
    data: dataSchema.optional(),
    error: exports.apiErrorSchema.optional(),
    success: zod_1.z.boolean(),
});
exports.apiResponseSchema = apiResponseSchema;
// Schémas de réponses spécifiques
exports.lexiconResponseSchema = (0, exports.apiResponseSchema)(exports.lexicon);
exports.lexiconListResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.object({
    lexicons: zod_1.z.object({
        revision: zod_1.z.string().optional(),
        pagination: zod_1.z.object({
            offset: zod_1.z.number(),
            limit: zod_1.z.number(),
            count: zod_1.z.number(),
        }),
        items: zod_1.z.array(exports.lexicon),
    }),
    available_language: zod_1.z.array(zod_1.z.string()).optional(),
}));
// Export groupé pour faciliter l'import
exports.lexiconSchemas = {
    validateLexiconCreation: exports.validateLexiconCreation,
    validateLexiconUpdate: exports.validateLexiconUpdate,
    validateLexiconFilters: exports.validateLexiconFilters,
    validateLexiconGuid: exports.validateLexiconGuid,
    validatePartialTranslations: exports.validatePartialTranslations,
    createLexiconSchema: exports.createLexiconSchema,
    updateLexiconSchema: exports.updateLexiconSchema,
    lexiconFiltersSchema: exports.lexiconFiltersSchema,
    lexiconGuidSchema: exports.lexiconGuidSchema,
    partialTranslationSchema: exports.partialTranslationSchema,
};
