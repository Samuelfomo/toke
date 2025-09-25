"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraudDetectionLogSchemas = exports.fraudDetectionLogSchema = exports.validateFraudDetectionLogId = exports.validateFraudDetectionFilters = exports.validateFraudDetectionUpdate = exports.fraudDetectionLogIdSchema = exports.fraudDetectionFiltersSchema = exports.fraudDetectionAdminDataSchema = exports.updateFraudDetectionLogSchema = exports.createFraudDetectionLogSchema = void 0;
// schemas/fraud.detection.log.ts
const zod_1 = require("zod");
const fraud_detection_log_js_1 = require("../constants/fraud.detection.log.js");
// Base schema for common validations
const baseFraudDetectionLogSchema = zod_1.z.object({
    tenant: zod_1.z
        .number({
        required_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.TENANT_REQUIRED,
        invalid_type_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.TENANT_INVALID,
    })
        .int(fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.TENANT_INVALID)
        .positive(fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.TENANT_INVALID),
    detection_type: zod_1.z.nativeEnum(fraud_detection_log_js_1.FraudDetection, {
        required_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.DETECTION_TYPE_REQUIRED,
        invalid_type_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.DETECTION_TYPE_INVALID,
    }),
    employee_licenses_affected: zod_1.z
        .array(zod_1.z
        .string()
        .regex(fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.EMPLOYEE_ID_PATTERN, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.EMPLOYEE_ID_INVALID))
        .min(fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.MIN_LENGTH, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.EMPLOYEE_LICENSES_AFFECTED_EMPTY)
        .max(fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.MAX_LENGTH, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.EMPLOYEE_LICENSES_AFFECTED_INVALID),
    detection_criteria: zod_1.z
        .record(zod_1.z.any())
        .refine((obj) => Object.keys(obj).length >= fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.DETECTION_CRITERIA.MIN_KEYS, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.DETECTION_CRITERIA_EMPTY)
        .refine((obj) => JSON.stringify(obj).length <= fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.DETECTION_CRITERIA.MAX_JSON_SIZE, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.DETECTION_CRITERIA_INVALID),
    risk_level: zod_1.z.nativeEnum(fraud_detection_log_js_1.RiskLevel, {
        required_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.RISK_LEVEL_REQUIRED,
        invalid_type_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.RISK_LEVEL_INVALID,
    }),
    action_taken: zod_1.z
        .string()
        .max(fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.ACTION_TAKEN.MAX_LENGTH, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.ACTION_TAKEN_INVALID)
        .transform((val) => val.trim())
        .optional()
        .nullable(),
    notes: zod_1.z
        .string()
        .max(fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.NOTES.MAX_LENGTH, fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.NOTES_INVALID)
        .transform((val) => val.trim())
        .optional()
        .nullable(),
    resolved_at: zod_1.z
        .date({
        invalid_type_error: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.INVALID_DATE_FORMAT,
    })
        .optional()
        .nullable(),
    resolved_by: zod_1.z
        .number()
        .int(fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.RESOLVED_BY_INVALID)
        .positive(fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.RESOLVED_BY_INVALID)
        .optional()
        .nullable(),
});
// Schema for creation - NOT ALLOWED (managed by PostgreSQL)
exports.createFraudDetectionLogSchema = zod_1.z.object({}).refine(() => false, {
    message: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.CREATION_NOT_ALLOWED,
});
// Schema for updates - only administrative fields can be updated
exports.updateFraudDetectionLogSchema = zod_1.z
    .object({
    action_taken: baseFraudDetectionLogSchema.shape.action_taken,
    notes: baseFraudDetectionLogSchema.shape.notes,
    resolved_at: baseFraudDetectionLogSchema.shape.resolved_at,
    resolved_by: baseFraudDetectionLogSchema.shape.resolved_by,
})
    .partial()
    .refine((data) => {
    // Validate resolution consistency
    const hasResolvedAt = data.resolved_at !== undefined && data.resolved_at !== null;
    const hasResolvedBy = data.resolved_by !== undefined && data.resolved_by !== null;
    if (hasResolvedAt || hasResolvedBy) {
        return hasResolvedAt && hasResolvedBy;
    }
    return true;
}, {
    message: fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.RESOLUTION_CONSISTENCY_INVALID,
});
// Schema for administrative data cleaning
exports.fraudDetectionAdminDataSchema = zod_1.z
    .object({
    action_taken: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    resolved_at: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    resolved_by: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
})
    .strict();
// Schema for filters
exports.fraudDetectionFiltersSchema = zod_1.z
    .object({
    tenant: zod_1.z.number().int().positive().optional(),
    detection_type: zod_1.z.nativeEnum(fraud_detection_log_js_1.FraudDetection).optional(),
    risk_level: zod_1.z.nativeEnum(fraud_detection_log_js_1.RiskLevel).optional(),
    resolved: zod_1.z.boolean().optional(),
    employee_id: zod_1.z.string().optional(),
    created_from: zod_1.z.date().optional(),
    created_to: zod_1.z.date().optional(),
    resolved_from: zod_1.z.date().optional(),
    resolved_to: zod_1.z.date().optional(),
    resolved_by: zod_1.z.number().int().positive().optional(),
})
    .strict();
// Schema for ID validation
exports.fraudDetectionLogIdSchema = zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num) || num < fraud_detection_log_js_1.FRAUD_DETECTION_VALIDATION.ID.MIN_VALUE) {
        throw new Error(fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.INVALID_ID);
    }
    return num;
});
// Validation functions with error handling
const validateFraudDetectionUpdate = (data) => {
    try {
        return exports.updateFraudDetectionLogSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateFraudDetectionUpdate = validateFraudDetectionUpdate;
const validateFraudDetectionFilters = (data) => {
    try {
        return exports.fraudDetectionFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateFraudDetectionFilters = validateFraudDetectionFilters;
const validateFraudDetectionLogId = (id) => {
    try {
        return exports.fraudDetectionLogIdSchema.parse(id);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(fraud_detection_log_js_1.FRAUD_DETECTION_ERRORS.INVALID_ID);
        }
        throw error;
    }
};
exports.validateFraudDetectionLogId = validateFraudDetectionLogId;
// Complete schema for responses (with metadata)
exports.fraudDetectionLogSchema = baseFraudDetectionLogSchema.extend({
    id: zod_1.z.number().int().positive(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Export grouped for easier importing
exports.fraudDetectionLogSchemas = {
    validateFraudDetectionUpdate: exports.validateFraudDetectionUpdate,
    validateFraudDetectionFilters: exports.validateFraudDetectionFilters,
    validateFraudDetectionLogId: exports.validateFraudDetectionLogId,
    createFraudDetectionLogSchema: exports.createFraudDetectionLogSchema,
    updateFraudDetectionLogSchema: exports.updateFraudDetectionLogSchema,
    fraudDetectionFiltersSchema: exports.fraudDetectionFiltersSchema,
    fraudDetectionLogIdSchema: exports.fraudDetectionLogIdSchema,
    fraudDetectionAdminDataSchema: exports.fraudDetectionAdminDataSchema,
};
