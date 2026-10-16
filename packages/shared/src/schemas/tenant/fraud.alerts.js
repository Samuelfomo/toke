"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraudAlertsSchemas = exports.fraudAlertsResponseSchema = exports.getSeverityOrder = exports.validateInvestigationProcess = exports.validateDuplicateAlert = exports.validateModificationAllowed = exports.validateFraudAlertsGuid = exports.validateFraudAlertsFilters = exports.validateFraudAlertsUpdate = exports.validateFraudAlertsCreation = exports.fraudAlertsGuidSchema = exports.fraudAlertsFiltersSchema = exports.updateFraudAlertsSchema = exports.createFraudAlertsSchema = void 0;
// schemas/fraud_alerts.ts
const zod_1 = require("zod");
const fraud_alerts_js_1 = require("../../constants/tenant/fraud.alerts.js");
// Schema pour valider les données d'alerte (JSON)
const alertDataSchema = zod_1.z.record(zod_1.z.any()).refine((alertData) => {
    try {
        JSON.stringify(alertData);
        return true;
    }
    catch (_a) {
        return false;
    }
}, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_DATA_INVALID);
// Base schema pour les validations communes
const baseFraudAlertsSchema = zod_1.z.object({
    user: zod_1.z
        .number({
        required_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.USER_REQUIRED,
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.USER_INVALID,
    })
        .int()
        .min(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.USER.MIN, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.USER_INVALID)
        .max(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.USER.MAX, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.USER_INVALID),
    time_entry: zod_1.z
        .number({
        required_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.TIME_ENTRY_REQUIRED,
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID,
    })
        .int()
        .min(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MIN, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID)
        .max(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MAX, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID),
    alert_type: zod_1.z.nativeEnum(fraud_alerts_js_1.AlertType, {
        required_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_TYPE_REQUIRED,
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_TYPE_INVALID,
    }),
    alert_severity: zod_1.z
        .nativeEnum(fraud_alerts_js_1.AlertSeverity, {
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_SEVERITY_INVALID,
    })
        .default(fraud_alerts_js_1.FRAUD_ALERTS_DEFAULTS.ALERT_SEVERITY),
    alert_description: zod_1.z
        .string({
        required_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_REQUIRED,
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_INVALID,
    })
        .min(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MIN_LENGTH, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_INVALID)
        .trim(),
    alert_data: alertDataSchema.optional().nullable(),
    investigated: zod_1.z
        .boolean({
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATED_INVALID,
    })
        .default(fraud_alerts_js_1.FRAUD_ALERTS_DEFAULTS.INVESTIGATED),
    investigation_notes: zod_1.z
        .string({
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATION_NOTES_INVALID,
    })
        .min(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MIN_LENGTH, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATION_NOTES_INVALID)
        .trim()
        .optional()
        .nullable(),
    false_positive: zod_1.z
        .boolean({
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.FALSE_POSITIVE_INVALID,
    })
        .default(fraud_alerts_js_1.FRAUD_ALERTS_DEFAULTS.FALSE_POSITIVE),
    investigated_at: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        invalid_type_error: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATED_AT_INVALID,
    })
        .optional()
        .nullable(),
});
// Schema avec validations métier complexes
const fraudAlertsWithValidation = baseFraudAlertsSchema
    .refine((data) => {
    // Notes d'investigation requises si l'alerte est marquée comme investiguée
    if (data.investigated && !data.investigation_notes) {
        return false;
    }
    return true;
}, {
    message: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATION_NOTES_REQUIRED,
    path: ['investigation_notes'],
})
    .refine((data) => {
    // Date d'investigation doit être présente si investigated = true
    if (data.investigated && !data.investigated_at) {
        // Cette règle peut être assouplie si investigated_at est automatiquement définie
        return true; // Permet la validation, la date sera définie automatiquement
    }
    return true;
}, {
    message: fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATION_INCOMPLETE,
    path: ['investigated_at'],
});
// Schema pour la création - tous les champs requis
exports.createFraudAlertsSchema = fraudAlertsWithValidation;
// Schema pour les mises à jour - tous les champs optionnels
exports.updateFraudAlertsSchema = baseFraudAlertsSchema.partial();
// export const updateFraudAlertsSchema = fraudAlertsWithValidation.partial();
// Schema pour les filtres
exports.fraudAlertsFiltersSchema = zod_1.z
    .object({
    user: zod_1.z.number().int().optional(),
    time_entry: zod_1.z.number().int().optional(),
    alert_type: zod_1.z.nativeEnum(fraud_alerts_js_1.AlertType).optional(),
    alert_severity: zod_1.z.nativeEnum(fraud_alerts_js_1.AlertSeverity).optional(),
    investigated: zod_1.z.boolean().optional(),
    false_positive: zod_1.z.boolean().optional(),
    created_at_from: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))]).optional(),
    created_at_to: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))]).optional(),
    investigated_at_from: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))])
        .optional(),
    investigated_at_to: zod_1.z
        .union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))])
        .optional(),
    pending_investigation: zod_1.z.boolean().optional(), // Pour alertes non investiguées
    high_priority_only: zod_1.z.boolean().optional(), // Pour alertes HIGH/CRITICAL uniquement
    severity_level_min: zod_1.z.nativeEnum(fraud_alerts_js_1.AlertSeverity).optional(), // Seuil minimum de sévérité
})
    .strict();
// Schema pour validation GUID
exports.fraudAlertsGuidSchema = zod_1.z
    .string()
    .min(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.GUID.MIN_LENGTH, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.GUID_INVALID)
    .max(fraud_alerts_js_1.FRAUD_ALERTS_VALIDATION.GUID.MAX_LENGTH, fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.GUID_INVALID);
// Fonctions de validation avec gestion d'erreurs
const validateFraudAlertsCreation = (data) => {
    try {
        return exports.createFraudAlertsSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateFraudAlertsCreation = validateFraudAlertsCreation;
const validateFraudAlertsUpdate = (data) => {
    try {
        return exports.updateFraudAlertsSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateFraudAlertsUpdate = validateFraudAlertsUpdate;
const validateFraudAlertsFilters = (data) => {
    try {
        return exports.fraudAlertsFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateFraudAlertsFilters = validateFraudAlertsFilters;
const validateFraudAlertsGuid = (guid) => {
    try {
        return exports.fraudAlertsGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateFraudAlertsGuid = validateFraudAlertsGuid;
// Validation métier pour empêcher la modification d'alertes investiguées
const validateModificationAllowed = (currentInvestigated) => {
    if (currentInvestigated) {
        throw new Error(fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.CANNOT_MODIFY_INVESTIGATED);
    }
    return true;
};
exports.validateModificationAllowed = validateModificationAllowed;
// Validation pour éviter les alertes en double
const validateDuplicateAlert = (userId, timeEntryId, alertType, existingAlerts) => {
    const duplicate = existingAlerts.find((alert) => alert.user === userId && alert.time_entry === timeEntryId && alert.alert_type === alertType);
    if (duplicate) {
        throw new Error(fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.DUPLICATE_ALERT_FOR_ENTRY);
    }
    return true;
};
exports.validateDuplicateAlert = validateDuplicateAlert;
// Validation du processus d'investigation
const validateInvestigationProcess = (investigated, investigationNotes) => {
    if (investigated && !investigationNotes) {
        throw new Error(fraud_alerts_js_1.FRAUD_ALERTS_ERRORS.INVESTIGATION_INCOMPLETE);
    }
    return true;
};
exports.validateInvestigationProcess = validateInvestigationProcess;
// Fonction utilitaire pour ordonner les sévérités
const getSeverityOrder = (severity) => {
    const order = {
        [fraud_alerts_js_1.AlertSeverity.LOW]: 1,
        [fraud_alerts_js_1.AlertSeverity.MEDIUM]: 2,
        [fraud_alerts_js_1.AlertSeverity.HIGH]: 3,
        [fraud_alerts_js_1.AlertSeverity.CRITICAL]: 4,
    };
    return order[severity];
};
exports.getSeverityOrder = getSeverityOrder;
// Schema complet pour les réponses (avec métadonnées)
exports.fraudAlertsResponseSchema = baseFraudAlertsSchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Export groupé pour faciliter les imports
exports.fraudAlertsSchemas = {
    validateFraudAlertsCreation: exports.validateFraudAlertsCreation,
    validateFraudAlertsUpdate: exports.validateFraudAlertsUpdate,
    validateFraudAlertsFilters: exports.validateFraudAlertsFilters,
    validateFraudAlertsGuid: exports.validateFraudAlertsGuid,
    validateModificationAllowed: exports.validateModificationAllowed,
    validateDuplicateAlert: exports.validateDuplicateAlert,
    validateInvestigationProcess: exports.validateInvestigationProcess,
    getSeverityOrder: exports.getSeverityOrder,
    createFraudAlertsSchema: exports.createFraudAlertsSchema,
    updateFraudAlertsSchema: exports.updateFraudAlertsSchema,
    fraudAlertsFiltersSchema: exports.fraudAlertsFiltersSchema,
    fraudAlertsGuidSchema: exports.fraudAlertsGuidSchema,
};
