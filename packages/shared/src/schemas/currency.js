"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePagination = exports.currencyListResponseSchema = exports.currencyResponseSchema = exports.apiResponseSchema = exports.apiErrorSchema = exports.currencyParamsSchema = exports.currency = exports.currencySchemas = exports.validateCurrencyGuid = exports.validateCurrencyFilters = exports.validateCurrencyUpdate = exports.validateCurrencyCreation = exports.currencyGuidSchema = exports.paginationSchema = exports.currencyFiltersSchema = exports.updateCurrencySchema = exports.createCurrencySchema = void 0;
const zod_1 = require("zod");
const currency_js_1 = require("../constants/currency.js");
// Schéma de base pour les validations communes
const baseCurrencySchema = zod_1.z.object({
    code: zod_1.z
        .string({
        required_error: currency_js_1.CURRENCY_ERRORS.CODE_REQUIRED,
        invalid_type_error: currency_js_1.CURRENCY_ERRORS.CODE_INVALID,
    })
        .min(currency_js_1.CURRENCY_VALIDATION.CODE.MIN_LENGTH, currency_js_1.CURRENCY_ERRORS.CODE_INVALID)
        .max(currency_js_1.CURRENCY_VALIDATION.CODE.MAX_LENGTH, currency_js_1.CURRENCY_ERRORS.CODE_INVALID)
        .regex(currency_js_1.CURRENCY_VALIDATION.CODE.PATTERN, currency_js_1.CURRENCY_ERRORS.CODE_INVALID)
        .transform((val) => val.trim().toUpperCase()),
    name: zod_1.z
        .string({
        required_error: currency_js_1.CURRENCY_ERRORS.NAME_REQUIRED,
        invalid_type_error: currency_js_1.CURRENCY_ERRORS.NAME_INVALID,
    })
        .min(currency_js_1.CURRENCY_VALIDATION.NAME.MIN_LENGTH, currency_js_1.CURRENCY_ERRORS.NAME_INVALID)
        .max(currency_js_1.CURRENCY_VALIDATION.NAME.MAX_LENGTH, currency_js_1.CURRENCY_ERRORS.NAME_INVALID)
        .transform((val) => val.trim()),
    symbol: zod_1.z
        .string({
        required_error: currency_js_1.CURRENCY_ERRORS.SYMBOL_REQUIRED,
        invalid_type_error: currency_js_1.CURRENCY_ERRORS.SYMBOL_INVALID,
    })
        .min(currency_js_1.CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH, currency_js_1.CURRENCY_ERRORS.SYMBOL_INVALID)
        .max(currency_js_1.CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH, currency_js_1.CURRENCY_ERRORS.SYMBOL_INVALID)
        .transform((val) => val.trim()),
    decimal_places: zod_1.z.coerce
        .number({
        required_error: currency_js_1.CURRENCY_ERRORS.DECIMAL_PLACES_REQUIRED,
        invalid_type_error: currency_js_1.CURRENCY_ERRORS.DECIMAL_PLACES_INVALID,
    })
        .int(currency_js_1.CURRENCY_ERRORS.DECIMAL_PLACES_INVALID)
        .min(currency_js_1.CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE, currency_js_1.CURRENCY_ERRORS.DECIMAL_PLACES_INVALID)
        .max(currency_js_1.CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE, currency_js_1.CURRENCY_ERRORS.DECIMAL_PLACES_INVALID)
        .default(currency_js_1.CURRENCY_DEFAULTS.DECIMAL_PLACES),
    active: zod_1.z.coerce
        .boolean()
        .default(currency_js_1.CURRENCY_DEFAULTS.ACTIVE)
        .transform((val) => {
        if (typeof val === 'string') {
            return val === 'true' || val === '1';
        }
        return Boolean(val);
    }),
});
// Schéma pour création - tous les champs requis
exports.createCurrencySchema = baseCurrencySchema;
// Schéma pour mise à jour - tous les champs optionnels
exports.updateCurrencySchema = baseCurrencySchema.partial();
// Schéma pour les filtres de recherche
exports.currencyFiltersSchema = zod_1.z
    .object({
    is_active: zod_1.z.coerce.boolean().optional(),
})
    .strict();
// Schéma pour pagination (réutilisable)
exports.paginationSchema = zod_1.z
    .object({
    offset: zod_1.z.coerce.number().int().min(0).default(currency_js_1.CURRENCY_DEFAULTS.PAGINATION.OFFSET),
    limit: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(currency_js_1.CURRENCY_DEFAULTS.PAGINATION.MAX_LIMIT)
        .default(currency_js_1.CURRENCY_DEFAULTS.PAGINATION.LIMIT),
})
    .partial();
// Schéma pour validation du GUID
exports.currencyGuidSchema = zod_1.z
    .string()
    .regex(/^\d{6}$/, currency_js_1.CURRENCY_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val))
    .refine((val) => val >= currency_js_1.CURRENCY_VALIDATION.GUID.MIN_VALUE && val <= currency_js_1.CURRENCY_VALIDATION.GUID.MAX_VALUE, currency_js_1.CURRENCY_ERRORS.GUID_INVALID);
// Fonctions de validation avec gestion d'erreurs
const validateCurrencyCreation = (data) => {
    try {
        return exports.createCurrencySchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateCurrencyCreation = validateCurrencyCreation;
const validateCurrencyUpdate = (data) => {
    try {
        return exports.updateCurrencySchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateCurrencyUpdate = validateCurrencyUpdate;
const validateCurrencyFilters = (data) => {
    try {
        return exports.currencyFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateCurrencyFilters = validateCurrencyFilters;
const validateCurrencyGuid = (guid) => {
    try {
        return exports.currencyGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(currency_js_1.CURRENCY_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateCurrencyGuid = validateCurrencyGuid;
// Export groupé pour faciliter l'import
exports.currencySchemas = {
    validateCurrencyCreation: exports.validateCurrencyCreation,
    validateCurrencyUpdate: exports.validateCurrencyUpdate,
    validateCurrencyFilters: exports.validateCurrencyFilters,
    validateCurrencyGuid: exports.validateCurrencyGuid,
    createCurrencySchema: exports.createCurrencySchema,
    updateCurrencySchema: exports.updateCurrencySchema,
    currencyFiltersSchema: exports.currencyFiltersSchema,
    paginationSchema: exports.paginationSchema,
    currencyGuidSchema: exports.currencyGuidSchema,
};
// // Schéma pour les réponses complètes (avec métadonnées)
exports.currency = baseCurrencySchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z
        .number()
        .int()
        .min(currency_js_1.CURRENCY_VALIDATION.GUID.MIN_VALUE)
        .max(currency_js_1.CURRENCY_VALIDATION.GUID.MAX_VALUE),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
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
exports.currencyParamsSchema = zod_1.z.object({
    guid: zod_1.z
        .string()
        .regex(/^\d{6}$/, currency_js_1.CURRENCY_ERRORS.GUID_INVALID)
        .transform((val) => parseInt(val)),
    code: zod_1.z
        .string()
        .length(3)
        .regex(/^[A-Z]{3}$/i, currency_js_1.CURRENCY_ERRORS.CODE_INVALID)
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
exports.currencyResponseSchema = (0, exports.apiResponseSchema)(exports.currency);
exports.currencyListResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.object({
    countries: zod_1.z.object({
        revision: zod_1.z.string().optional(),
        pagination: zod_1.z.object({
            offset: zod_1.z.number(),
            limit: zod_1.z.number(),
            count: zod_1.z.number(),
        }),
        items: zod_1.z.array(exports.currency),
    }),
}));
// Fonctions utilitaires de validation
// export const validateCurrencyCreation = (data: unknown) => createCurrencySchema.parse(data);
// export const validateCurrencyUpdate = (data: unknown) => updateCurrencySchema.parse(data);
const validatePagination = (data) => exports.paginationSchema.parse(data);
exports.validatePagination = validatePagination;
// export const validateCurrencyFilters = (data: unknown) => currencyFiltersSchema.parse(data);
