"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalLicenseSchemas = exports.globalLicense = exports.validateGlobalLicenseGuid = exports.validateGlobalLicenseFilters = exports.validateGlobalLicenseUpdate = exports.validateGlobalLicenseCreation = exports.globalLicenseGuidSchema = exports.globalLicenseFiltersSchema = exports.updateGlobalLicenseSchema = exports.createGlobalLicenseSchema = void 0;
// schemas/global-master.ts
const zod_1 = require("zod");
const global_license_js_1 = require("../constants/global.license.js");
const timezone_config_validation_js_1 = require("../utils/timezone.config.validation.js");
// Base schema for common validations
const baseGlobalLicenseSchema = zod_1.z.object({
    tenant: zod_1.z
        .number({
        required_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.TENANT_REQUIRED,
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.TENANT_INVALID,
    })
        .int(global_license_js_1.GLOBAL_LICENSE_ERRORS.TENANT_INVALID)
        .positive(global_license_js_1.GLOBAL_LICENSE_ERRORS.TENANT_INVALID),
    // license_type: z
    //   .enum(Object.values(Type) as [string, ...string[]], {
    //     required_error: GLOBAL_LICENSE_ERRORS.LICENSE_TYPE_REQUIRED,
    //     invalid_type_error: GLOBAL_LICENSE_ERRORS.LICENSE_TYPE_INVALID,
    //   })
    //   .default(GLOBAL_LICENSE_DEFAULTS.LICENSE_TYPE)
    //   .transform((val) => val.toUpperCase()),
    // billing_cycle_months: z
    //   .number({
    //     required_error: GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_REQUIRED,
    //     invalid_type_error: GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID,
    //   })
    //   .int(GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID)
    //   .refine(
    //     (val) => GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.includes(val as any),
    //     GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID,
    //   ),
    base_price_usd: zod_1.z
        .number({
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.BASE_PRICE_INVALID,
    })
        .min(global_license_js_1.GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MIN_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.BASE_PRICE_INVALID)
        .max(global_license_js_1.GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MAX_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.BASE_PRICE_INVALID)
        .default(global_license_js_1.GLOBAL_LICENSE_DEFAULTS.BASE_PRICE_USD)
        .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places
    minimum_seats: zod_1.z
        .number({
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID,
    })
        .int(global_license_js_1.GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID)
        .min(global_license_js_1.GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MIN_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID)
        .max(global_license_js_1.GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MAX_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID)
        .default(global_license_js_1.GLOBAL_LICENSE_DEFAULTS.MINIMUM_SEATS),
    // current_period_start: z
    //   .date({
    //     required_error: GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_START_REQUIRED,
    //     invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    //   })
    //   .transform((val) => new Date(val))
    //   .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT)
    //   .refine((date) => date <= TimezoneConfigUtils.getCurrentTime(), GLOBAL_LICENSE_ERRORS.FUTURE_START_DATE),
    //
    // current_period_end: z
    //   .date({
    //     required_error: GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_END_REQUIRED,
    //     invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    //   })
    //   .transform((val) => new Date(val))
    //   .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT),
    //
    // next_renewal_date: z
    //   .date({
    //     required_error: GLOBAL_LICENSE_ERRORS.NEXT_RENEWAL_DATE_REQUIRED,
    //     invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    //   })
    //   .transform((val) => new Date(val))
    //   .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT),
    current_period_start: zod_1.z
        .union([zod_1.z.string(), zod_1.z.date()], {
        required_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_START_REQUIRED,
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), global_license_js_1.GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT)
        .refine((date) => date <= timezone_config_validation_js_1.TimezoneConfigUtils.getCurrentTime(), global_license_js_1.GLOBAL_LICENSE_ERRORS.FUTURE_START_DATE),
    current_period_end: zod_1.z
        .union([zod_1.z.string(), zod_1.z.date()], {
        required_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_END_REQUIRED,
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), global_license_js_1.GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT),
    next_renewal_date: zod_1.z
        .union([zod_1.z.string(), zod_1.z.date()], {
        required_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.NEXT_RENEWAL_DATE_REQUIRED,
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
        .transform((val) => new Date(val))
        .refine((date) => !isNaN(date.getTime()), global_license_js_1.GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT),
    total_seats_purchased: zod_1.z
        .number({
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID,
    })
        .int(global_license_js_1.GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID)
        .min(global_license_js_1.GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MIN_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID)
        .max(global_license_js_1.GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MAX_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID)
        .default(global_license_js_1.GLOBAL_LICENSE_DEFAULTS.TOTAL_SEATS_PURCHASED)
        .optional(),
    //
    // license_status: z
    //   .enum(Object.values(LicenseStatus) as [string, ...string[]], {
    //     invalid_type_error: GLOBAL_LICENSE_ERRORS.LICENSE_STATUS_INVALID,
    //   })
    //   .default(GLOBAL_LICENSE_DEFAULTS.LICENSE_STATUS)
    //   .transform((val) => val.toUpperCase()),
    license_type: zod_1.z
        .nativeEnum(global_license_js_1.Type, {
        required_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.LICENSE_TYPE_REQUIRED,
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.LICENSE_TYPE_INVALID,
    })
        .default(global_license_js_1.GLOBAL_LICENSE_DEFAULTS.LICENSE_TYPE),
    license_status: zod_1.z
        .nativeEnum(global_license_js_1.LicenseStatus, {
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.LICENSE_STATUS_INVALID,
    })
        .default(global_license_js_1.GLOBAL_LICENSE_DEFAULTS.LICENSE_STATUS),
    billing_cycle_months: zod_1.z
        .number({
        required_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_REQUIRED,
        invalid_type_error: global_license_js_1.GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID,
    })
        .int(global_license_js_1.GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID)
        .refine((val) => global_license_js_1.GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.includes(val), global_license_js_1.GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID),
});
// .refine(
//   (data) => data.current_period_end > data.current_period_start,
//   {
//     message: GLOBAL_LICENSE_ERRORS.PERIOD_DATES_CONFLICT,
//     path: ['current_period_end'],
//   }
// )
// .refine(
//   (data) => data.next_renewal_date >= data.current_period_end,
//   {
//     message: GLOBAL_LICENSE_ERRORS.RENEWAL_DATE_CONFLICT,
//     path: ['next_renewal_date'],
//   }
// )
// .refine(
//   (data) => !data.total_seats_purchased || data.total_seats_purchased >= data.minimum_seats,
//   {
//     message: GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_NOT_MET,
//     path: ['total_seats_purchased'],
//   }
// );
// Schema for creation - all required fields
exports.createGlobalLicenseSchema = baseGlobalLicenseSchema;
// Schema for updates - all fields optional
exports.updateGlobalLicenseSchema = baseGlobalLicenseSchema
    .partial()
    .refine((data) => !data.current_period_start ||
    !data.current_period_end ||
    data.current_period_end > data.current_period_start, {
    message: global_license_js_1.GLOBAL_LICENSE_ERRORS.PERIOD_DATES_CONFLICT,
    path: ['current_period_end'],
})
    .refine((data) => !data.current_period_end ||
    !data.next_renewal_date ||
    data.next_renewal_date >= data.current_period_end, {
    message: global_license_js_1.GLOBAL_LICENSE_ERRORS.RENEWAL_DATE_CONFLICT,
    path: ['next_renewal_date'],
})
    .refine((data) => !data.total_seats_purchased ||
    !data.minimum_seats ||
    data.total_seats_purchased >= data.minimum_seats, {
    message: global_license_js_1.GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_NOT_MET,
    path: ['total_seats_purchased'],
});
// Schema for filters
exports.globalLicenseFiltersSchema = zod_1.z
    .object({
    tenant: zod_1.z.number().int().positive().optional(),
    license_type: zod_1.z.nativeEnum(global_license_js_1.Type).optional(),
    license_status: zod_1.z.nativeEnum(global_license_js_1.LicenseStatus).optional(),
    billing_cycle_months: zod_1.z
        .number()
        .int()
        .refine((val) => global_license_js_1.GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.includes(val))
        .optional(),
    minimum_seats: zod_1.z.number().int().positive().optional(),
    base_price_usd: zod_1.z.number().positive().optional(), // Remplace min_base_price_usd
})
    .strict();
//   license_type: z.enum(Object.values(Type) as [string, ...string[]]).optional(),
//   license_status: z.enum(Object.values(LicenseStatus) as [string, ...string[]]).optional(),
//   billing_cycle_months: z
//     .enum(
//       GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.map(String) as [string, ...string[]], // z.enum veut des strings
//     )
//     .transform(Number)
//     .optional(),
//   minimum_seats: z.number().int().positive().optional(),
// })
// .strict();
// Schéma pour validation du GUID
exports.globalLicenseGuidSchema = zod_1.z
    .string()
    .regex(/^\d{6}$/, global_license_js_1.GLOBAL_LICENSE_ERRORS.GUID_INVALID)
    .transform((val) => parseInt(val))
    .refine((val) => val >= global_license_js_1.GLOBAL_LICENSE_VALIDATION.GUID.MIN_VALUE &&
    val <= global_license_js_1.GLOBAL_LICENSE_VALIDATION.GUID.MAX_VALUE, global_license_js_1.GLOBAL_LICENSE_ERRORS.GUID_INVALID);
// Fonctions de validation avec gestion d'erreurs
const validateGlobalLicenseCreation = (data) => {
    try {
        return exports.createGlobalLicenseSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateGlobalLicenseCreation = validateGlobalLicenseCreation;
const validateGlobalLicenseUpdate = (data) => {
    try {
        return exports.updateGlobalLicenseSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateGlobalLicenseUpdate = validateGlobalLicenseUpdate;
const validateGlobalLicenseFilters = (data) => {
    try {
        return exports.globalLicenseFiltersSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
        }
        throw error;
    }
};
exports.validateGlobalLicenseFilters = validateGlobalLicenseFilters;
const validateGlobalLicenseGuid = (guid) => {
    try {
        return exports.globalLicenseGuidSchema.parse(guid);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new Error(global_license_js_1.GLOBAL_LICENSE_ERRORS.GUID_INVALID);
        }
        throw error;
    }
};
exports.validateGlobalLicenseGuid = validateGlobalLicenseGuid;
// Schéma complet pour les réponses (avec métadonnées)
exports.globalLicense = baseGlobalLicenseSchema
    .extend({
    id: zod_1.z.number().int().positive(),
    guid: zod_1.z
        .number()
        .int()
        .min(global_license_js_1.GLOBAL_LICENSE_VALIDATION.GUID.MIN_VALUE)
        .max(global_license_js_1.GLOBAL_LICENSE_VALIDATION.GUID.MAX_VALUE),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
})
    .refine((data) => data.current_period_end > data.current_period_start, {
    message: global_license_js_1.GLOBAL_LICENSE_ERRORS.PERIOD_DATES_CONFLICT,
    path: ['current_period_end'],
})
    .refine((data) => data.next_renewal_date >= data.current_period_end, {
    message: global_license_js_1.GLOBAL_LICENSE_ERRORS.RENEWAL_DATE_CONFLICT,
    path: ['next_renewal_date'],
})
    .refine((data) => !data.total_seats_purchased || data.total_seats_purchased >= data.minimum_seats, {
    message: global_license_js_1.GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_NOT_MET,
    path: ['total_seats_purchased'],
});
// Export groupé pour faciliter l'import
exports.globalLicenseSchemas = {
    validateGlobalLicenseCreation: exports.validateGlobalLicenseCreation,
    validateGlobalLicenseUpdate: exports.validateGlobalLicenseUpdate,
    validateGlobalLicenseFilters: exports.validateGlobalLicenseFilters,
    validateGlobalLicenseGuid: exports.validateGlobalLicenseGuid,
    createGlobalLicenseSchema: exports.createGlobalLicenseSchema,
    updateGlobalLicenseSchema: exports.updateGlobalLicenseSchema,
    globalLicenseFiltersSchema: exports.globalLicenseFiltersSchema,
    globalLicenseGuidSchema: exports.globalLicenseGuidSchema,
};
