"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingCycleSchemas = exports.billingCycle = exports.validateBillingCycleGuid = exports.validateBillingCycleFilters = exports.validateBillingCycleUpdate = exports.validateBillingCycleCreation = exports.billingCycleGuidSchema = exports.billingCycleFiltersSchema = exports.updateBillingCycleSchema = exports.createBillingCycleSchema = void 0;
// schemas/billing.cycle.ts
const zod_1 = require("zod");
const billing_cycle_js_1 = require("../constants/billing.cycle.js");
// Base schema for common validations
const baseBillingCycleSchema = zod_1.z.object({
    global_license: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_INVALID,
    })
        .int(billing_cycle_js_1.BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_INVALID)
        .positive(billing_cycle_js_1.BILLING_CYCLE_ERRORS.GLOBAL_LICENSE_INVALID),
    // period_start: z.date({
    //   required_error: BILLING_CYCLE_ERRORS.PERIOD_START_REQUIRED,
    //   invalid_type_error: BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
    // }),
    // period_end: z.date({
    //   required_error: BILLING_CYCLE_ERRORS.PERIOD_END_REQUIRED,
    //   invalid_type_error: BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
    // }),
    period_start: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.PERIOD_START_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
    }),
    period_end: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.PERIOD_END_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
    }),
    base_employee_count: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID,
    })
        .int(billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID)
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_EMPLOYEE_COUNT_INVALID),
    final_employee_count: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID,
    })
        .int(billing_cycle_js_1.BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID)
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.FINAL_EMPLOYEE_COUNT_INVALID),
    base_amount_usd: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_USD_INVALID)
        .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places
    adjustments_amount_usd: zod_1.z
        .number({
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_USD_INVALID,
    })
        .min(-billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_USD_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_USD_INVALID)
        .default(billing_cycle_js_1.BILLING_CYCLE_DEFAULTS.ADJUSTMENTS_AMOUNT_USD)
        .transform((val) => Math.round(val * 100) / 100),
    subtotal_usd: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_USD_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_USD_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_USD_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_USD_INVALID)
        .transform((val) => Math.round(val * 100) / 100),
    tax_amount_usd: zod_1.z
        .number({
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.TAX_AMOUNT_USD_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TAX_AMOUNT_USD_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TAX_AMOUNT_USD_INVALID)
        .default(billing_cycle_js_1.BILLING_CYCLE_DEFAULTS.TAX_AMOUNT_USD)
        .transform((val) => Math.round(val * 100) / 100),
    total_amount_usd: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_USD_INVALID)
        .transform((val) => Math.round(val * 100) / 100),
    billing_currency_code: zod_1.z
        .string({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID,
    })
        .length(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.CURRENCY_CODE.LENGTH, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID)
        .regex(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.CURRENCY_CODE.PATTERN, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BILLING_CURRENCY_CODE_INVALID)
        .transform((val) => val.toUpperCase()),
    exchange_rate_used: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.EXCHANGE_RATE_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.EXCHANGE_RATE_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.EXCHANGE_RATE_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.EXCHANGE_RATE_INVALID)
        .transform((val) => Math.round(val * 1000000) / 1000000), // Round to 6 decimal places
    base_amount_local: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.BASE_AMOUNT_LOCAL_INVALID)
        .transform((val) => Math.round(val * 100) / 100),
    adjustments_amount_local: zod_1.z
        .number({
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_LOCAL_INVALID,
    })
        .min(-billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_LOCAL_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.ADJUSTMENTS_AMOUNT_LOCAL_INVALID)
        .default(billing_cycle_js_1.BILLING_CYCLE_DEFAULTS.ADJUSTMENTS_AMOUNT_LOCAL)
        .transform((val) => Math.round(val * 100) / 100),
    subtotal_local: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.SUBTOTAL_LOCAL_INVALID)
        .transform((val) => Math.round(val * 100) / 100),
    tax_amount_local: zod_1.z
        .number({
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.TAX_AMOUNT_LOCAL_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TAX_AMOUNT_LOCAL_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TAX_AMOUNT_LOCAL_INVALID)
        .default(billing_cycle_js_1.BILLING_CYCLE_DEFAULTS.TAX_AMOUNT_LOCAL)
        .transform((val) => Math.round(val * 100) / 100),
    total_amount_local: zod_1.z
        .number({
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_INVALID,
    })
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_INVALID)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.TOTAL_AMOUNT_LOCAL_INVALID)
        .transform((val) => Math.round(val * 100) / 100),
    tax_rules_applied: zod_1.z
        .array(zod_1.z.object({
        rate: zod_1.z.number().min(0).max(100),
        name: zod_1.z.string().optional(),
        type: zod_1.z.string().optional(),
        amount_usd: zod_1.z.number().optional(),
        amount_local: zod_1.z.number().optional(),
    }))
        .default(billing_cycle_js_1.BILLING_CYCLE_DEFAULTS.TAX_RULES_APPLIED),
    billing_status: zod_1.z
        .nativeEnum(billing_cycle_js_1.BillingStatus, {
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.BILLING_STATUS_INVALID,
    })
        .default(billing_cycle_js_1.BILLING_CYCLE_DEFAULTS.BILLING_STATUS),
    invoice_generated_at: zod_1.z
        .date({
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.INVOICE_GENERATED_AT_INVALID,
    })
        .optional(),
    // payment_due_date: z.date({
    //   required_error: BILLING_CYCLE_ERRORS.PAYMENT_DUE_DATE_REQUIRED,
    //   invalid_type_error: BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
    // }),
    payment_due_date: zod_1.z.union([zod_1.z.date(), zod_1.z.string().transform((val) => new Date(val))], {
        required_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.PAYMENT_DUE_DATE_REQUIRED,
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.INVALID_DATE_FORMAT,
    }),
    payment_completed_at: zod_1.z
        .date({
        invalid_type_error: billing_cycle_js_1.BILLING_CYCLE_ERRORS.PAYMENT_COMPLETED_AT_INVALID,
    })
        .optional(),
});
// Schema for creation - all required fields
exports.createBillingCycleSchema = baseBillingCycleSchema;
// Schema for updates - all fields optional
exports.updateBillingCycleSchema = baseBillingCycleSchema.partial();
// Schema for filters
exports.billingCycleFiltersSchema = zod_1.z
    .object({
    global_license: zod_1.z.number().int().positive().optional(),
    billing_status: zod_1.z.nativeEnum(billing_cycle_js_1.BillingStatus).optional(),
    billing_currency_code: zod_1.z
        .string()
        .length(3)
        .regex(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.CURRENCY_CODE.PATTERN)
        .optional(),
    period_start_from: zod_1.z.date().optional(),
    period_start_to: zod_1.z.date().optional(),
    period_end_from: zod_1.z.date().optional(),
    period_end_to: zod_1.z.date().optional(),
    payment_due_from: zod_1.z.date().optional(),
    payment_due_to: zod_1.z.date().optional(),
    min_total_amount_usd: zod_1.z.number().min(0).optional(),
    max_total_amount_usd: zod_1.z.number().min(0).optional(),
    min_employee_count: zod_1.z.number().int().positive().optional(),
    max_employee_count: zod_1.z.number().int().positive().optional(),
})
    .strict();
// Schema for GUID validation
exports.billingCycleGuidSchema = zod_1.z
    .string()
    .regex(/^\d{6}$/, billing_cycle_js_1.BILLING_CYCLE_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val))
    .refine((val) => val >= billing_cycle_js_1.BILLING_CYCLE_VALIDATION.GUID.MIN_VALUE &&
    val <= billing_cycle_js_1.BILLING_CYCLE_VALIDATION.GUID.MAX_VALUE, billing_cycle_js_1.BILLING_CYCLE_ERRORS.GUID_INVALID);
// Validation functions with error handling
const validateBillingCycleCreation = (data) => {
    try {
        return exports.createBillingCycleSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateBillingCycleCreation = validateBillingCycleCreation;
const validateBillingCycleUpdate = (data) => {
    try {
        return exports.updateBillingCycleSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateBillingCycleUpdate = validateBillingCycleUpdate;
const validateBillingCycleFilters = (data) => {
    try {
        return exports.billingCycleFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateBillingCycleFilters = validateBillingCycleFilters;
const validateBillingCycleGuid = (guid) => {
    try {
        return exports.billingCycleGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(billing_cycle_js_1.BILLING_CYCLE_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateBillingCycleGuid = validateBillingCycleGuid;
// Complete schema for responses (with metadata)
exports.billingCycle = baseBillingCycleSchema.extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z
        .number()
        .int()
        .min(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.GUID.MIN_VALUE)
        .max(billing_cycle_js_1.BILLING_CYCLE_VALIDATION.GUID.MAX_VALUE),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Grouped export for easier imports
exports.billingCycleSchemas = {
    validateBillingCycleCreation: exports.validateBillingCycleCreation,
    validateBillingCycleUpdate: exports.validateBillingCycleUpdate,
    validateBillingCycleFilters: exports.validateBillingCycleFilters,
    validateBillingCycleGuid: exports.validateBillingCycleGuid,
    createBillingCycleSchema: exports.createBillingCycleSchema,
    updateBillingCycleSchema: exports.updateBillingCycleSchema,
    billingCycleFiltersSchema: exports.billingCycleFiltersSchema,
    billingCycleGuidSchema: exports.billingCycleGuidSchema,
};
