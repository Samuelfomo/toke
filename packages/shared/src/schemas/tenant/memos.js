"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memosSchemas = exports.memosResponseSchema = exports.validateMemoModificationAllowed = exports.validateSelfValidation = exports.validateMemoStatusTransition = exports.validateMemosGuid = exports.validateMemosFilters = exports.validateMemosUpdate = exports.validateMemosCreation = exports.memosGuidSchema = exports.memosFiltersSchema = exports.updateMemosSchema = exports.createMemosSchema = void 0;
// schemas/memos.ts
const zod_1 = require("zod");
const memos_js_1 = require("../../constants/tenant/memos.js");
// Schema pour valider les URLs d'attachments (HTTPS uniquement)
const httpsUrlSchema = zod_1.z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), memos_js_1.MEMOS_ERRORS.ATTACHMENTS_URL_INVALID);
// Schema pour valider les IDs d'entrées affectées
const affectedEntriesSchema = zod_1.z
    .array(zod_1.z
    .number()
    .int()
    .min(memos_js_1.MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_ID)
    .max(memos_js_1.MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_ID))
    .refine((entries) => entries.length > 0 && new Set(entries).size === entries.length, memos_js_1.MEMOS_ERRORS.AFFECTED_ENTRIES_INVALID);
// Base schema pour les validations communes
const baseMemosSchema = zod_1.z.object({
    author_user: zod_1.z
        .number({
        required_error: memos_js_1.MEMOS_ERRORS.AUTHOR_USER_REQUIRED,
        invalid_type_error: memos_js_1.MEMOS_ERRORS.AUTHOR_USER_INVALID,
    })
        .int()
        .min(memos_js_1.MEMOS_VALIDATION.AUTHOR_USER.MIN, memos_js_1.MEMOS_ERRORS.AUTHOR_USER_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.AUTHOR_USER.MAX, memos_js_1.MEMOS_ERRORS.AUTHOR_USER_INVALID),
    target_user: zod_1.z
        .number({
        invalid_type_error: memos_js_1.MEMOS_ERRORS.TARGET_USER_INVALID,
    })
        .int()
        .min(memos_js_1.MEMOS_VALIDATION.TARGET_USER.MIN, memos_js_1.MEMOS_ERRORS.TARGET_USER_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.TARGET_USER.MAX, memos_js_1.MEMOS_ERRORS.TARGET_USER_INVALID)
        .optional()
        .nullable(),
    validator_user: zod_1.z
        .number({
        invalid_type_error: memos_js_1.MEMOS_ERRORS.VALIDATOR_USER_INVALID,
    })
        .int()
        .min(memos_js_1.MEMOS_VALIDATION.VALIDATOR_USER.MIN, memos_js_1.MEMOS_ERRORS.VALIDATOR_USER_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.VALIDATOR_USER.MAX, memos_js_1.MEMOS_ERRORS.VALIDATOR_USER_INVALID)
        .optional()
        .nullable(),
    memo_type: zod_1.z.nativeEnum(memos_js_1.MemoType, {
        required_error: memos_js_1.MEMOS_ERRORS.MEMO_TYPE_REQUIRED,
        invalid_type_error: memos_js_1.MEMOS_ERRORS.MEMO_TYPE_INVALID,
    }),
    memo_status: zod_1.z
        .nativeEnum(memos_js_1.MemoStatus, {
        invalid_type_error: memos_js_1.MEMOS_ERRORS.MEMO_STATUS_INVALID,
    })
        .default(memos_js_1.MEMOS_DEFAULTS.MEMO_STATUS),
    title: zod_1.z
        .string({
        required_error: memos_js_1.MEMOS_ERRORS.TITLE_REQUIRED,
        invalid_type_error: memos_js_1.MEMOS_ERRORS.TITLE_INVALID,
    })
        .min(memos_js_1.MEMOS_VALIDATION.TITLE.MIN_LENGTH, memos_js_1.MEMOS_ERRORS.TITLE_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.TITLE.MAX_LENGTH, memos_js_1.MEMOS_ERRORS.TITLE_INVALID)
        .trim(),
    description: zod_1.z
        .string({
        required_error: memos_js_1.MEMOS_ERRORS.DESCRIPTION_REQUIRED,
        invalid_type_error: memos_js_1.MEMOS_ERRORS.DESCRIPTION_INVALID,
    })
        .min(memos_js_1.MEMOS_VALIDATION.DESCRIPTION.MIN_LENGTH, memos_js_1.MEMOS_ERRORS.DESCRIPTION_INVALID)
        .trim(),
    incident_datetime: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        invalid_type_error: memos_js_1.MEMOS_ERRORS.INCIDENT_DATETIME_INVALID,
    })
        .refine((date) => date <= new Date(), memos_js_1.MEMOS_ERRORS.FUTURE_INCIDENT_DATE)
        .optional()
        .nullable(),
    affected_session: zod_1.z
        .number({
        invalid_type_error: memos_js_1.MEMOS_ERRORS.AFFECTED_SESSION_INVALID,
    })
        .int()
        .min(memos_js_1.MEMOS_VALIDATION.AFFECTED_SESSION.MIN, memos_js_1.MEMOS_ERRORS.AFFECTED_SESSION_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.AFFECTED_SESSION.MAX, memos_js_1.MEMOS_ERRORS.AFFECTED_SESSION_INVALID)
        .optional()
        .nullable(),
    affected_entries: affectedEntriesSchema.optional().nullable(),
    attachments: zod_1.z
        .array(httpsUrlSchema)
        .refine((attachments) => attachments.every((url) => typeof url === 'string'), memos_js_1.MEMOS_ERRORS.ATTACHMENTS_INVALID)
        .optional()
        .nullable(),
    validator_comments: zod_1.z
        .string({
        invalid_type_error: memos_js_1.MEMOS_ERRORS.VALIDATOR_COMMENTS_INVALID,
    })
        .min(memos_js_1.MEMOS_VALIDATION.VALIDATOR_COMMENTS.MIN_LENGTH, memos_js_1.MEMOS_ERRORS.VALIDATOR_COMMENTS_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.VALIDATOR_COMMENTS.MAX_LENGTH, memos_js_1.MEMOS_ERRORS.VALIDATOR_COMMENTS_INVALID)
        .trim()
        .optional()
        .nullable(),
    processed_at: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        invalid_type_error: memos_js_1.MEMOS_ERRORS.PROCESSED_AT_INVALID,
    })
        .optional()
        .nullable(),
    auto_generated: zod_1.z
        .boolean({
        invalid_type_error: memos_js_1.MEMOS_ERRORS.AUTO_GENERATED_INVALID,
    })
        .default(memos_js_1.MEMOS_DEFAULTS.AUTO_GENERATED),
    auto_reason: zod_1.z
        .string({
        invalid_type_error: memos_js_1.MEMOS_ERRORS.AUTO_REASON_INVALID,
    })
        .min(memos_js_1.MEMOS_VALIDATION.AUTO_REASON.MIN_LENGTH, memos_js_1.MEMOS_ERRORS.AUTO_REASON_INVALID)
        .max(memos_js_1.MEMOS_VALIDATION.AUTO_REASON.MAX_LENGTH, memos_js_1.MEMOS_ERRORS.AUTO_REASON_INVALID)
        .trim()
        .optional()
        .nullable(),
});
// Schema avec validations métier complexes
const memosWithValidation = baseMemosSchema
    .refine((data) => {
    // Auto-reason requis pour les mémos auto-générés
    if (data.auto_generated && !data.auto_reason) {
        return false;
    }
    return true;
}, {
    message: memos_js_1.MEMOS_ERRORS.AUTO_REASON_REQUIRED,
    path: ['auto_reason'],
})
    .refine((data) => {
    // Commentaires validateur requis pour approbation/rejet
    const requiresComments = [memos_js_1.MemoStatus.APPROVED, memos_js_1.MemoStatus.REJECTED];
    if (requiresComments.includes(data.memo_status) && !data.validator_comments) {
        return false;
    }
    return true;
}, {
    message: memos_js_1.MEMOS_ERRORS.VALIDATOR_COMMENTS_REQUIRED,
    path: ['validator_comments'],
})
    .refine((data) => {
    // Validateur requis pour approbation/rejet
    const requiresValidator = [memos_js_1.MemoStatus.APPROVED, memos_js_1.MemoStatus.REJECTED];
    if (requiresValidator.includes(data.memo_status) && !data.validator_user) {
        return false;
    }
    return true;
}, {
    message: memos_js_1.MEMOS_ERRORS.VALIDATION_REQUIRED_FOR_APPROVAL,
    path: ['validator_user'],
});
// Schema pour la création - tous les champs requis
exports.createMemosSchema = memosWithValidation;
// Schema pour les mises à jour - tous les champs optionnels
exports.updateMemosSchema = baseMemosSchema.partial();
// export const updateMemosSchema = memosWithValidation.partial();
// Schema pour les filtres
exports.memosFiltersSchema = zod_1.z
    .object({
    author_user: zod_1.z.number().int().optional(),
    target_user: zod_1.z.number().int().optional(),
    validator_user: zod_1.z.number().int().optional(),
    memo_type: zod_1.z.nativeEnum(memos_js_1.MemoType).optional(),
    memo_status: zod_1.z.nativeEnum(memos_js_1.MemoStatus).optional(),
    auto_generated: zod_1.z.boolean().optional(),
    has_attachments: zod_1.z.boolean().optional(),
    incident_date_from: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))])
        .optional(),
    incident_date_to: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))]).optional(),
    processed_date_from: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))])
        .optional(),
    processed_date_to: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))]).optional(),
    pending_validation: zod_1.z.boolean().optional(), // Pour mémos en attente de validation
    my_memos_only: zod_1.z.boolean().optional(), // Pour filtrer les mémos de l'utilisateur
})
    .strict();
// Schema pour validation GUID
exports.memosGuidSchema = zod_1.z
    .string()
    .min(memos_js_1.MEMOS_VALIDATION.GUID.MIN_LENGTH, memos_js_1.MEMOS_ERRORS.GUID_INVALID)
    .max(memos_js_1.MEMOS_VALIDATION.GUID.MAX_LENGTH, memos_js_1.MEMOS_ERRORS.GUID_INVALID);
// Fonctions de validation avec gestion d'erreurs
const validateMemosCreation = (data) => {
    try {
        return exports.createMemosSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateMemosCreation = validateMemosCreation;
const validateMemosUpdate = (data) => {
    try {
        return exports.updateMemosSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateMemosUpdate = validateMemosUpdate;
const validateMemosFilters = (data) => {
    try {
        return exports.memosFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateMemosFilters = validateMemosFilters;
const validateMemosGuid = (guid) => {
    try {
        return exports.memosGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(memos_js_1.MEMOS_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateMemosGuid = validateMemosGuid;
// Validation métier pour les transitions de statut
const validateMemoStatusTransition = (currentStatus, newStatus) => {
    const validTransitions = {
        [memos_js_1.MemoStatus.DRAFT]: [memos_js_1.MemoStatus.SUBMITTED],
        [memos_js_1.MemoStatus.SUBMITTED]: [memos_js_1.MemoStatus.PENDING, memos_js_1.MemoStatus.DRAFT],
        [memos_js_1.MemoStatus.PENDING]: [memos_js_1.MemoStatus.APPROVED, memos_js_1.MemoStatus.REJECTED],
        [memos_js_1.MemoStatus.APPROVED]: [], // Terminal state
        [memos_js_1.MemoStatus.REJECTED]: [memos_js_1.MemoStatus.DRAFT, memos_js_1.MemoStatus.SUBMITTED], // Peut être refait
    };
    if (!validTransitions[currentStatus].includes(newStatus)) {
        throw new Error(memos_js_1.MEMOS_ERRORS.INVALID_STATUS_TRANSITION);
    }
    return true;
};
exports.validateMemoStatusTransition = validateMemoStatusTransition;
// Validation pour éviter l'auto-validation
const validateSelfValidation = (authorId, validatorId) => {
    if (validatorId && authorId === validatorId) {
        throw new Error(memos_js_1.MEMOS_ERRORS.SELF_VALIDATION_NOT_ALLOWED);
    }
    return true;
};
exports.validateSelfValidation = validateSelfValidation;
// Validation de modification des mémos traités
const validateMemoModificationAllowed = (currentStatus) => {
    const processedStatuses = [memos_js_1.MemoStatus.APPROVED, memos_js_1.MemoStatus.REJECTED];
    if (processedStatuses.includes(currentStatus)) {
        throw new Error(memos_js_1.MEMOS_ERRORS.CANNOT_MODIFY_PROCESSED_MEMO);
    }
    return true;
};
exports.validateMemoModificationAllowed = validateMemoModificationAllowed;
// Schema complet pour les réponses (avec métadonnées)
exports.memosResponseSchema = baseMemosSchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Export groupé pour faciliter les imports
exports.memosSchemas = {
    validateMemosCreation: exports.validateMemosCreation,
    validateMemosUpdate: exports.validateMemosUpdate,
    validateMemosFilters: exports.validateMemosFilters,
    validateMemosGuid: exports.validateMemosGuid,
    validateMemoStatusTransition: exports.validateMemoStatusTransition,
    validateSelfValidation: exports.validateSelfValidation,
    validateMemoModificationAllowed: exports.validateMemoModificationAllowed,
    createMemosSchema: exports.createMemosSchema,
    updateMemosSchema: exports.updateMemosSchema,
    memosFiltersSchema: exports.memosFiltersSchema,
    memosGuidSchema: exports.memosGuidSchema,
};
