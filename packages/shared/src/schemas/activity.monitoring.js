"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityMonitoringSchemas = exports.activityMonitoring = exports.validateActivityMonitoringRiskLevel = exports.validateActivityMonitoringPagination = exports.validateActivityMonitoringStatus = exports.validateActivityMonitoringDate = exports.validateActivityMonitoringEmployeeLicense = exports.validateActivityMonitoringId = exports.validateActivityMonitoringFilters = exports.validateActivityMonitoringUpdate = exports.activityMonitoringRiskLevelSchema = exports.activityMonitoringPaginationSchema = exports.activityMonitoringStatusSchema = exports.activityMonitoringDateSchema = exports.activityMonitoringEmployeeLicenseSchema = exports.activityMonitoringIdSchema = exports.activityMonitoringFiltersSchema = exports.updateActivityMonitoringSchema = void 0;
// schemas/activity.monitoring.ts
const zod_1 = require("zod");
const fraud_detection_log_js_1 = require("../constants/fraud.detection.log.js");
const activity_monitoring_js_1 = require("../constants/activity.monitoring.js");
// Base schema for activity monitoring (read-only fields)
const baseActivityMonitoringSchema = zod_1.z.object({
    employee_license: zod_1.z
        .number({
        required_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.EMPLOYEE_LICENSE_REQUIRED,
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE,
    })
        .int(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE)
        .min(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.EMPLOYEE_LICENSE.MIN_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE),
    monitoring_date: zod_1.z
        .date({
        required_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.MONITORING_DATE_REQUIRED,
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
        .min(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.DATE.MIN_DATE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE)
        .max(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.DATE.MAX_DATE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE)
        .refine((date) => date <= new Date(), activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.FUTURE_DATE_NOT_ALLOWED),
    last_punch_date: zod_1.z
        .date({
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
        .optional()
        .nullable(),
    punch_count_7_days: zod_1.z
        .number({
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    })
        .int(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
        .min(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MIN_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
        .max(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
        .default(activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PUNCH_COUNT_7_DAYS),
    punch_count_30_days: zod_1.z
        .number({
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT,
    })
        .int(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
        .min(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MIN_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
        .max(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_PUNCH_COUNT)
        .default(activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PUNCH_COUNT_30_DAYS),
    consecutive_absent_days: zod_1.z
        .number({
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS,
    })
        .int(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS)
        .min(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MIN_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS)
        .max(activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MAX_VALUE, activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_ABSENT_DAYS)
        .default(activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.CONSECUTIVE_ABSENT_DAYS),
    status_at_date: zod_1.z
        .nativeEnum(activity_monitoring_js_1.ActivityStatus, {
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_STATUS,
    })
        .default(activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.STATUS),
    created_at: zod_1.z
        .date({
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
        .optional(),
    updated_at: zod_1.z
        .date({
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT,
    })
        .optional(),
});
// .refine(
//   (data) => {
//     // Validate punch count logic: 7 days should not exceed 30 days
//     return data.punch_count_7_days <= data.punch_count_30_days;
//   },
//   {
//     message: ACTIVITY_MONITORING_ERRORS.PUNCH_COUNT_LOGIC_ERROR,
//     path: ['punch_count_7_days'],
//   },
// );
// Schema for updates - only status can be manually updated (limited)
exports.updateActivityMonitoringSchema = zod_1.z
    .object({
    status_at_date: zod_1.z
        .nativeEnum(activity_monitoring_js_1.ActivityStatus, {
        invalid_type_error: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_STATUS,
    })
        .optional(),
})
    .strict()
    .refine((data) => {
    // Prevent modification of computed fields
    const readonlyFields = [
        'employee_license',
        'monitoring_date',
        'last_punch_date',
        'punch_count_7_days',
        'punch_count_30_days',
        'consecutive_absent_days',
        'created_at',
        'updated_at',
    ];
    const providedFields = Object.keys(data);
    const hasReadonlyField = providedFields.some((field) => readonlyFields.includes(field));
    if (hasReadonlyField) {
        throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.READONLY_FIELD_MODIFICATION);
    }
    return true;
});
// Schema for filters
exports.activityMonitoringFiltersSchema = zod_1.z
    .object({
    employee_license: zod_1.z.number().int().positive().optional(),
    monitoring_date: zod_1.z.date().optional(),
    monitoring_date_from: zod_1.z.date().optional(),
    monitoring_date_to: zod_1.z.date().optional(),
    last_punch_date: zod_1.z.date().optional(),
    last_punch_date_from: zod_1.z.date().optional(),
    last_punch_date_to: zod_1.z.date().optional(),
    status_at_date: zod_1.z.nativeEnum(activity_monitoring_js_1.ActivityStatus).optional(),
    punch_count_7_days: zod_1.z.number().int().min(0).optional(),
    punch_count_7_days_min: zod_1.z.number().int().min(0).optional(),
    punch_count_7_days_max: zod_1.z.number().int().min(0).optional(),
    punch_count_30_days: zod_1.z.number().int().min(0).optional(),
    punch_count_30_days_min: zod_1.z.number().int().min(0).optional(),
    punch_count_30_days_max: zod_1.z.number().int().min(0).optional(),
    consecutive_absent_days: zod_1.z.number().int().min(0).optional(),
    consecutive_absent_days_min: zod_1.z.number().int().min(0).optional(),
    consecutive_absent_days_max: zod_1.z.number().int().min(0).optional(),
    created_at_from: zod_1.z.date().optional(),
    created_at_to: zod_1.z.date().optional(),
    updated_at_from: zod_1.z.date().optional(),
    updated_at_to: zod_1.z.date().optional(),
})
    .strict()
    .refine((data) => {
    // Validate date ranges
    if (data.monitoring_date_from && data.monitoring_date_to) {
        if (data.monitoring_date_from > data.monitoring_date_to) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
        }
    }
    if (data.last_punch_date_from && data.last_punch_date_to) {
        if (data.last_punch_date_from > data.last_punch_date_to) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
        }
    }
    if (data.created_at_from && data.created_at_to) {
        if (data.created_at_from > data.created_at_to) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
        }
    }
    if (data.updated_at_from && data.updated_at_to) {
        if (data.updated_at_from > data.updated_at_to) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.DATE_RANGE_INVALID);
        }
    }
    // Validate numeric ranges
    if (data.punch_count_7_days_min !== undefined && data.punch_count_7_days_max !== undefined) {
        if (data.punch_count_7_days_min > data.punch_count_7_days_max) {
            throw new Error('Minimum punch count 7 days cannot exceed maximum');
        }
    }
    if (data.punch_count_30_days_min !== undefined && data.punch_count_30_days_max !== undefined) {
        if (data.punch_count_30_days_min > data.punch_count_30_days_max) {
            throw new Error('Minimum punch count 30 days cannot exceed maximum');
        }
    }
    if (data.consecutive_absent_days_min !== undefined &&
        data.consecutive_absent_days_max !== undefined) {
        if (data.consecutive_absent_days_min > data.consecutive_absent_days_max) {
            throw new Error('Minimum absent days cannot exceed maximum');
        }
    }
    return true;
});
// Schema for ID validation
exports.activityMonitoringIdSchema = zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) || !Number.isInteger(num) || num < 1) {
        throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_ID);
    }
    return num;
});
// Schema for employee master validation
exports.activityMonitoringEmployeeLicenseSchema = zod_1.z
    .union([zod_1.z.string(), zod_1.z.number()])
    .transform((val) => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) ||
        !Number.isInteger(num) ||
        num < activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.EMPLOYEE_LICENSE.MIN_VALUE) {
        throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE);
    }
    return num;
});
// Schema for date validation
exports.activityMonitoringDateSchema = zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).transform((val) => {
    const date = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(date.getTime())) {
        throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT);
    }
    if (date < activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.DATE.MIN_DATE ||
        date > activity_monitoring_js_1.ACTIVITY_MONITORING_VALIDATION.DATE.MAX_DATE) {
        throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE);
    }
    if (date > new Date()) {
        throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.FUTURE_DATE_NOT_ALLOWED);
    }
    return date;
});
// Schema for activity status validation
exports.activityMonitoringStatusSchema = zod_1.z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => Object.values(activity_monitoring_js_1.ActivityStatus).includes(val), {
    message: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_STATUS,
})
    .transform((val) => val);
// Schema for pagination validation
exports.activityMonitoringPaginationSchema = zod_1.z.object({
    offset: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => {
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num) || num < 0)
            return activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PAGINATION.OFFSET;
        return num;
    })
        .default(activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PAGINATION.OFFSET),
    limit: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => {
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num) || num < 1)
            return activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PAGINATION.LIMIT;
        if (num > activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PAGINATION.MAX_LIMIT) {
            return activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PAGINATION.MAX_LIMIT;
        }
        return num;
    })
        .default(activity_monitoring_js_1.ACTIVITY_MONITORING_DEFAULTS.PAGINATION.LIMIT),
});
// Schema for risk level validation
exports.activityMonitoringRiskLevelSchema = zod_1.z
    .string()
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => Object.values(fraud_detection_log_js_1.RiskLevel).includes(val), {
    message: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.RISK_LEVEL_INVALID,
})
    .transform((val) => val);
// Validation functions with error handling
const validateActivityMonitoringUpdate = (data) => {
    try {
        return exports.updateActivityMonitoringSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateActivityMonitoringUpdate = validateActivityMonitoringUpdate;
const validateActivityMonitoringFilters = (data) => {
    try {
        return exports.activityMonitoringFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateActivityMonitoringFilters = validateActivityMonitoringFilters;
const validateActivityMonitoringId = (id) => {
    try {
        return exports.activityMonitoringIdSchema.parse(id);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_ID);
        }
        throw error;
    }
};
exports.validateActivityMonitoringId = validateActivityMonitoringId;
const validateActivityMonitoringEmployeeLicense = (employeeLicense) => {
    try {
        return exports.activityMonitoringEmployeeLicenseSchema.parse(employeeLicense);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_EMPLOYEE_LICENSE);
        }
        throw error;
    }
};
exports.validateActivityMonitoringEmployeeLicense = validateActivityMonitoringEmployeeLicense;
const validateActivityMonitoringDate = (date) => {
    try {
        return exports.activityMonitoringDateSchema.parse(date);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_DATE_FORMAT);
        }
        throw error;
    }
};
exports.validateActivityMonitoringDate = validateActivityMonitoringDate;
const validateActivityMonitoringStatus = (status) => {
    try {
        return exports.activityMonitoringStatusSchema.parse(status);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.INVALID_STATUS);
        }
        throw error;
    }
};
exports.validateActivityMonitoringStatus = validateActivityMonitoringStatus;
const validateActivityMonitoringPagination = (offset, limit) => {
    try {
        return exports.activityMonitoringPaginationSchema.parse({ offset, limit });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.PAGINATION_INVALID);
        }
        throw error;
    }
};
exports.validateActivityMonitoringPagination = validateActivityMonitoringPagination;
const validateActivityMonitoringRiskLevel = (riskLevel) => {
    try {
        return exports.activityMonitoringRiskLevelSchema.parse(riskLevel);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.RISK_LEVEL_INVALID);
        }
        throw error;
    }
};
exports.validateActivityMonitoringRiskLevel = validateActivityMonitoringRiskLevel;
// Schema complet pour les réponses (avec métadonnées)
exports.activityMonitoring = baseActivityMonitoringSchema
    .extend({
    id: zod_1.z.number().int().positive(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
})
    .refine((data) => {
    // Validate punch count logic: 7 days should not exceed 30 days
    return data.punch_count_7_days <= data.punch_count_30_days;
}, {
    message: activity_monitoring_js_1.ACTIVITY_MONITORING_ERRORS.PUNCH_COUNT_LOGIC_ERROR,
    path: ['punch_count_7_days'],
});
// Export groupé pour faciliter l'import
exports.activityMonitoringSchemas = {
    validateActivityMonitoringUpdate: exports.validateActivityMonitoringUpdate,
    validateActivityMonitoringFilters: exports.validateActivityMonitoringFilters,
    validateActivityMonitoringId: exports.validateActivityMonitoringId,
    validateActivityMonitoringEmployeeLicense: exports.validateActivityMonitoringEmployeeLicense,
    validateActivityMonitoringDate: exports.validateActivityMonitoringDate,
    validateActivityMonitoringStatus: exports.validateActivityMonitoringStatus,
    validateActivityMonitoringPagination: exports.validateActivityMonitoringPagination,
    validateActivityMonitoringRiskLevel: exports.validateActivityMonitoringRiskLevel,
    updateActivityMonitoringSchema: exports.updateActivityMonitoringSchema,
    activityMonitoringFiltersSchema: exports.activityMonitoringFiltersSchema,
    activityMonitoringIdSchema: exports.activityMonitoringIdSchema,
    activityMonitoringEmployeeLicenseSchema: exports.activityMonitoringEmployeeLicenseSchema,
    activityMonitoringDateSchema: exports.activityMonitoringDateSchema,
    activityMonitoringStatusSchema: exports.activityMonitoringStatusSchema,
    activityMonitoringPaginationSchema: exports.activityMonitoringPaginationSchema,
    activityMonitoringRiskLevelSchema: exports.activityMonitoringRiskLevelSchema,
};
