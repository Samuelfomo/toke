// schemas/global-license.ts
import { z } from 'zod';

import {
  GLOBAL_LICENSE_DEFAULTS,
  GLOBAL_LICENSE_ERRORS,
  GLOBAL_LICENSE_VALIDATION,
  LicenseStatus,
  Type,
} from '../constants/global.license.js';

// Base schema for common validations
const baseGlobalLicenseSchema = z.object({
  tenant: z
    .number({
      required_error: GLOBAL_LICENSE_ERRORS.TENANT_REQUIRED,
      invalid_type_error: GLOBAL_LICENSE_ERRORS.TENANT_INVALID,
    })
    .int(GLOBAL_LICENSE_ERRORS.TENANT_INVALID)
    .positive(GLOBAL_LICENSE_ERRORS.TENANT_INVALID),

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

  base_price_usd: z
    .number({
      invalid_type_error: GLOBAL_LICENSE_ERRORS.BASE_PRICE_INVALID,
    })
    .min(
      GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MIN_VALUE,
      GLOBAL_LICENSE_ERRORS.BASE_PRICE_INVALID,
    )
    .max(
      GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MAX_VALUE,
      GLOBAL_LICENSE_ERRORS.BASE_PRICE_INVALID,
    )
    .default(GLOBAL_LICENSE_DEFAULTS.BASE_PRICE_USD)
    .transform((val) => Math.round(val * 100) / 100), // Round to 2 decimal places

  minimum_seats: z
    .number({
      invalid_type_error: GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID,
    })
    .int(GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID)
    .min(
      GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MIN_VALUE,
      GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID,
    )
    .max(
      GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MAX_VALUE,
      GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_INVALID,
    )
    .default(GLOBAL_LICENSE_DEFAULTS.MINIMUM_SEATS),

  // current_period_start: z
  //   .date({
  //     required_error: GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_START_REQUIRED,
  //     invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
  //   })
  //   .transform((val) => new Date(val))
  //   .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT)
  //   .refine((date) => date <= new Date(), GLOBAL_LICENSE_ERRORS.FUTURE_START_DATE),
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
  current_period_start: z
    .union([z.string(), z.date()], {
      required_error: GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_START_REQUIRED,
      invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT)
    .refine((date) => date <= new Date(), GLOBAL_LICENSE_ERRORS.FUTURE_START_DATE),

  current_period_end: z
    .union([z.string(), z.date()], {
      required_error: GLOBAL_LICENSE_ERRORS.CURRENT_PERIOD_END_REQUIRED,
      invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT),

  next_renewal_date: z
    .union([z.string(), z.date()], {
      required_error: GLOBAL_LICENSE_ERRORS.NEXT_RENEWAL_DATE_REQUIRED,
      invalid_type_error: GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), GLOBAL_LICENSE_ERRORS.INVALID_DATE_FORMAT),

  total_seats_purchased: z
    .number({
      invalid_type_error: GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID,
    })
    .int(GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID)
    .min(GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MIN_VALUE, GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID)
    .max(GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MAX_VALUE, GLOBAL_LICENSE_ERRORS.TOTAL_SEATS_INVALID)
    .default(GLOBAL_LICENSE_DEFAULTS.TOTAL_SEATS_PURCHASED)
    .optional(),
  //
  // license_status: z
  //   .enum(Object.values(LicenseStatus) as [string, ...string[]], {
  //     invalid_type_error: GLOBAL_LICENSE_ERRORS.LICENSE_STATUS_INVALID,
  //   })
  //   .default(GLOBAL_LICENSE_DEFAULTS.LICENSE_STATUS)
  //   .transform((val) => val.toUpperCase()),

  license_type: z
    .nativeEnum(Type, {
      required_error: GLOBAL_LICENSE_ERRORS.LICENSE_TYPE_REQUIRED,
      invalid_type_error: GLOBAL_LICENSE_ERRORS.LICENSE_TYPE_INVALID,
    })
    .default(GLOBAL_LICENSE_DEFAULTS.LICENSE_TYPE),

  license_status: z
    .nativeEnum(LicenseStatus, {
      invalid_type_error: GLOBAL_LICENSE_ERRORS.LICENSE_STATUS_INVALID,
    })
    .default(GLOBAL_LICENSE_DEFAULTS.LICENSE_STATUS),

  billing_cycle_months: z
    .number({
      required_error: GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_REQUIRED,
      invalid_type_error: GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID,
    })
    .int(GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID)
    .refine(
      (val) => GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.includes(val as any),
      GLOBAL_LICENSE_ERRORS.BILLING_CYCLE_INVALID,
    ),
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
export const createGlobalLicenseSchema = baseGlobalLicenseSchema;

// Schema for updates - all fields optional
export const updateGlobalLicenseSchema = baseGlobalLicenseSchema
  .partial()
  .refine(
    (data) =>
      !data.current_period_start ||
      !data.current_period_end ||
      data.current_period_end > data.current_period_start,
    {
      message: GLOBAL_LICENSE_ERRORS.PERIOD_DATES_CONFLICT,
      path: ['current_period_end'],
    },
  )
  .refine(
    (data) =>
      !data.current_period_end ||
      !data.next_renewal_date ||
      data.next_renewal_date >= data.current_period_end,
    {
      message: GLOBAL_LICENSE_ERRORS.RENEWAL_DATE_CONFLICT,
      path: ['next_renewal_date'],
    },
  )
  .refine(
    (data) =>
      !data.total_seats_purchased ||
      !data.minimum_seats ||
      data.total_seats_purchased >= data.minimum_seats,
    {
      message: GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_NOT_MET,
      path: ['total_seats_purchased'],
    },
  );

// Schema for filters
export const globalLicenseFiltersSchema = z
  .object({
    tenant: z.number().int().positive().optional(),
    license_type: z.nativeEnum(Type).optional(),
    license_status: z.nativeEnum(LicenseStatus).optional(),
    billing_cycle_months: z
      .number()
      .int()
      .refine((val) => GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.includes(val as any))
      .optional(),
    minimum_seats: z.number().int().positive().optional(),
    base_price_usd: z.number().positive().optional(), // Remplace min_base_price_usd
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
export const globalLicenseGuidSchema = z
  .string()
  .regex(/^\d{6}$/, GLOBAL_LICENSE_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) =>
      val >= GLOBAL_LICENSE_VALIDATION.GUID.MIN_VALUE &&
      val <= GLOBAL_LICENSE_VALIDATION.GUID.MAX_VALUE,
    GLOBAL_LICENSE_ERRORS.GUID_INVALID,
  );

// Fonctions de validation avec gestion d'erreurs
export const validateGlobalLicenseCreation = (data: any) => {
  try {
    return createGlobalLicenseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateGlobalLicenseUpdate = (data: any) => {
  try {
    return updateGlobalLicenseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateGlobalLicenseFilters = (data: any) => {
  try {
    return globalLicenseFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateGlobalLicenseGuid = (guid: any) => {
  try {
    return globalLicenseGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(GLOBAL_LICENSE_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Schéma complet pour les réponses (avec métadonnées)
export const globalLicense = baseGlobalLicenseSchema
  .extend({
    id: z.number().int().positive(),
    guid: z
      .number()
      .int()
      .min(GLOBAL_LICENSE_VALIDATION.GUID.MIN_VALUE)
      .max(GLOBAL_LICENSE_VALIDATION.GUID.MAX_VALUE),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .refine((data) => data.current_period_end > data.current_period_start, {
    message: GLOBAL_LICENSE_ERRORS.PERIOD_DATES_CONFLICT,
    path: ['current_period_end'],
  })
  .refine((data) => data.next_renewal_date >= data.current_period_end, {
    message: GLOBAL_LICENSE_ERRORS.RENEWAL_DATE_CONFLICT,
    path: ['next_renewal_date'],
  })
  .refine(
    (data) => !data.total_seats_purchased || data.total_seats_purchased >= data.minimum_seats,
    {
      message: GLOBAL_LICENSE_ERRORS.MINIMUM_SEATS_NOT_MET,
      path: ['total_seats_purchased'],
    },
  );

// Export groupé pour faciliter l'import
export const globalLicenseSchemas = {
  validateGlobalLicenseCreation,
  validateGlobalLicenseUpdate,
  validateGlobalLicenseFilters,
  validateGlobalLicenseGuid,
  createGlobalLicenseSchema,
  updateGlobalLicenseSchema,
  globalLicenseFiltersSchema,
  globalLicenseGuidSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateGlobalLicenseInput = z.infer<typeof createGlobalLicenseSchema>;
export type UpdateGlobalLicenseInput = z.infer<typeof updateGlobalLicenseSchema>;
export type GlobalLicenseData = z.infer<typeof globalLicense>;
export type GlobalLicenseFilters = z.infer<typeof globalLicenseFiltersSchema>;
