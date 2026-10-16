"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageSchemas = exports.languageListResponseSchema = exports.languageResponseSchema = exports.apiResponseSchema = exports.apiErrorSchema = exports.languageParamsSchema = exports.language = exports.validateLanguageGuid = exports.validateLanguageFilters = exports.validateLanguageUpdate = exports.validateLanguageCreation = exports.languageGuidSchema = exports.languageFiltersSchema = exports.updateLanguageSchema = exports.createLanguageSchema = void 0;
const zod_1 = require("zod");
const language_js_1 = require("../constants/language.js"); // Schéma de base pour les validations communes
// Schéma de base pour les validations communes
const baseLanguageSchema = zod_1.z.object({
    code: zod_1.z
        .string({
        required_error: language_js_1.LANGUAGE_ERRORS.CODE_REQUIRED,
        invalid_type_error: language_js_1.LANGUAGE_ERRORS.CODE_INVALID,
    })
        .min(language_js_1.LANGUAGE_VALIDATION.CODE.MIN_LENGTH, language_js_1.LANGUAGE_ERRORS.CODE_INVALID)
        .max(language_js_1.LANGUAGE_VALIDATION.CODE.MAX_LENGTH, language_js_1.LANGUAGE_ERRORS.CODE_INVALID)
        .regex(language_js_1.LANGUAGE_VALIDATION.CODE.PATTERN, language_js_1.LANGUAGE_ERRORS.CODE_INVALID)
        .transform((val) => val.trim().toLowerCase()),
    name_en: zod_1.z
        .string({
        required_error: language_js_1.LANGUAGE_ERRORS.NAME_EN_REQUIRED,
        invalid_type_error: language_js_1.LANGUAGE_ERRORS.NAME_EN_INVALID,
    })
        .min(language_js_1.LANGUAGE_VALIDATION.NAME_EN.MIN_LENGTH, language_js_1.LANGUAGE_ERRORS.NAME_EN_INVALID)
        .max(language_js_1.LANGUAGE_VALIDATION.NAME_EN.MAX_LENGTH, language_js_1.LANGUAGE_ERRORS.NAME_EN_INVALID)
        .transform((val) => val.trim()),
    name_local: zod_1.z
        .string({
        required_error: language_js_1.LANGUAGE_ERRORS.NAME_LOCAL_REQUIRED,
        invalid_type_error: language_js_1.LANGUAGE_ERRORS.NAME_LOCAL_INVALID,
    })
        .min(language_js_1.LANGUAGE_VALIDATION.NAME_LOCAL.MIN_LENGTH, language_js_1.LANGUAGE_ERRORS.NAME_LOCAL_INVALID)
        .max(language_js_1.LANGUAGE_VALIDATION.NAME_LOCAL.MAX_LENGTH, language_js_1.LANGUAGE_ERRORS.NAME_LOCAL_INVALID)
        .transform((val) => val.trim()),
    active: zod_1.z.coerce
        .boolean()
        .default(language_js_1.LANGUAGE_DEFAULTS.ACTIVE)
        .transform((val) => {
        if (typeof val === 'string') {
            return val === 'true' || val === '1';
        }
        return Boolean(val);
    }),
});
// Schéma pour création - tous les champs requis
exports.createLanguageSchema = baseLanguageSchema;
// Schéma pour mise à jour - tous les champs optionnels
exports.updateLanguageSchema = baseLanguageSchema.partial();
// Schéma pour les filtres de recherche
exports.languageFiltersSchema = zod_1.z
    .object({
    code: zod_1.z
        .string()
        .regex(language_js_1.LANGUAGE_VALIDATION.CODE.PATTERN, language_js_1.LANGUAGE_ERRORS.CODE_INVALID)
        .transform((val) => val.trim().toUpperCase())
        .optional(),
    name_en: zod_1.z
        .string()
        .min(1)
        .transform((val) => val.trim())
        .optional(),
    name_local: zod_1.z
        .string()
        .min(1)
        .transform((val) => val.trim())
        .optional(),
    active: zod_1.z.coerce.boolean().optional(),
})
    .strict();
// Schéma pour validation du GUID
exports.languageGuidSchema = zod_1.z
    .string()
    .regex(/^\d{6}$/, language_js_1.LANGUAGE_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val))
    .refine((val) => val >= language_js_1.LANGUAGE_VALIDATION.GUID.MIN_VALUE && val <= language_js_1.LANGUAGE_VALIDATION.GUID.MAX_VALUE, language_js_1.LANGUAGE_ERRORS.GUID_INVALID);
// Fonctions de validation avec gestion d'erreurs
const validateLanguageCreation = (data) => {
    try {
        return exports.createLanguageSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateLanguageCreation = validateLanguageCreation;
const validateLanguageUpdate = (data) => {
    try {
        return exports.updateLanguageSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateLanguageUpdate = validateLanguageUpdate;
const validateLanguageFilters = (data) => {
    try {
        return exports.languageFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateLanguageFilters = validateLanguageFilters;
const validateLanguageGuid = (guid) => {
    try {
        return exports.languageGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(language_js_1.LANGUAGE_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateLanguageGuid = validateLanguageGuid;
// Schéma complet pour les réponses (avec métadonnées)
exports.language = baseLanguageSchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z
        .number()
        .int()
        .min(language_js_1.LANGUAGE_VALIDATION.GUID.MIN_VALUE)
        .max(language_js_1.LANGUAGE_VALIDATION.GUID.MAX_VALUE),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Schéma pour les paramètres d'URL
exports.languageParamsSchema = zod_1.z.object({
    guid: zod_1.z
        .string()
        .regex(/^\d{6}$/, language_js_1.LANGUAGE_ERRORS.GUID_INVALID)
        .transform((val) => parseInt(val)),
    code: zod_1.z
        .string()
        .length(2)
        .regex(/^[A-Z]{2}$/i, language_js_1.LANGUAGE_ERRORS.CODE_INVALID)
        .transform((val) => val.toUpperCase()),
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
exports.languageResponseSchema = (0, exports.apiResponseSchema)(exports.language);
exports.languageListResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.object({
    languages: zod_1.z.object({
        revision: zod_1.z.string().optional(),
        pagination: zod_1.z.object({
            offset: zod_1.z.number(),
            limit: zod_1.z.number(),
            count: zod_1.z.number(),
        }),
        items: zod_1.z.array(exports.language),
    }),
}));
// Export groupé pour faciliter l'import
exports.languageSchemas = {
    validateLanguageCreation: exports.validateLanguageCreation,
    validateLanguageUpdate: exports.validateLanguageUpdate,
    validateLanguageFilters: exports.validateLanguageFilters,
    validateLanguageGuid: exports.validateLanguageGuid,
    createLanguageSchema: exports.createLanguageSchema,
    updateLanguageSchema: exports.updateLanguageSchema,
    languageFiltersSchema: exports.languageFiltersSchema,
    languageGuidSchema: exports.languageGuidSchema,
};
