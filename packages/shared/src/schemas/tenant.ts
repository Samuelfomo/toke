// schemas/tenant.ts
import { z } from 'zod';

import { TENANT_DEFAULTS, TENANT_ERRORS, TENANT_VALIDATION } from '../constants/tenant.js';

// Interface pour l'adresse de facturation
const billingAddressSchema = z.object({
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  location: z.string().min(1, 'Location is required').max(255, 'Location too long'),
  place_name: z.string().min(1, 'Place name is required').max(100, 'Place name too long'),
});

// Schéma de base pour les validations communes
const baseTenantSchema = z.object({
  name: z
    .string({
      required_error: TENANT_ERRORS.NAME_REQUIRED,
      invalid_type_error: TENANT_ERRORS.NAME_INVALID,
    })
    .min(TENANT_VALIDATION.NAME.MIN_LENGTH, TENANT_ERRORS.NAME_INVALID)
    .max(TENANT_VALIDATION.NAME.MAX_LENGTH, TENANT_ERRORS.NAME_INVALID)
    .transform((val) => val.trim()),

  registration_number: z
    .string({
      required_error: TENANT_ERRORS.REGISTRATION_NUMBER_REQUIRED,
      invalid_type_error: TENANT_ERRORS.REGISTRATION_NUMBER_INVALID,
    })
    .min(
      TENANT_VALIDATION.REGISTRATION_NUMBER.MIN_LENGTH,
      TENANT_ERRORS.REGISTRATION_NUMBER_INVALID,
    )
    .max(
      TENANT_VALIDATION.REGISTRATION_NUMBER.MAX_LENGTH,
      TENANT_ERRORS.REGISTRATION_NUMBER_INVALID,
    )
    .transform((val) => val.trim()),

  short_name: z
    .string({
      invalid_type_error: TENANT_ERRORS.SHORT_NAME_INVALID,
    })
    .min(TENANT_VALIDATION.SHORT_NAME.MIN_LENGTH, TENANT_ERRORS.SHORT_NAME_INVALID)
    .max(TENANT_VALIDATION.SHORT_NAME.MAX_LENGTH, TENANT_ERRORS.SHORT_NAME_INVALID)
    .transform((val) => val.trim())
    .optional(),

  key: z
    .string({
      required_error: TENANT_ERRORS.KEY_REQUIRED,
      invalid_type_error: TENANT_ERRORS.KEY_INVALID,
    })
    .min(TENANT_VALIDATION.KEY.MIN_LENGTH, TENANT_ERRORS.KEY_INVALID)
    .max(TENANT_VALIDATION.KEY.MAX_LENGTH, TENANT_ERRORS.KEY_INVALID)
    .regex(TENANT_VALIDATION.KEY.PATTERN, TENANT_ERRORS.KEY_INVALID)
    .transform((val) => val.trim().toLowerCase())
    .optional(),

  country_code: z
    .string({
      required_error: TENANT_ERRORS.COUNTRY_CODE_REQUIRED,
      invalid_type_error: TENANT_ERRORS.COUNTRY_CODE_INVALID,
    })
    .min(TENANT_VALIDATION.COUNTRY_CODE.MIN_LENGTH, TENANT_ERRORS.COUNTRY_CODE_INVALID)
    .max(TENANT_VALIDATION.COUNTRY_CODE.MAX_LENGTH, TENANT_ERRORS.COUNTRY_CODE_INVALID)
    .regex(TENANT_VALIDATION.COUNTRY_CODE.PATTERN, TENANT_ERRORS.COUNTRY_CODE_INVALID)
    .transform((val) => val.trim().toUpperCase()),

  primary_currency_code: z
    .string({
      required_error: TENANT_ERRORS.PRIMARY_CURRENCY_CODE_REQUIRED,
      invalid_type_error: TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
    })
    .min(
      TENANT_VALIDATION.PRIMARY_CURRENCY_CODE.MIN_LENGTH,
      TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
    )
    .max(
      TENANT_VALIDATION.PRIMARY_CURRENCY_CODE.MAX_LENGTH,
      TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
    )
    .regex(
      TENANT_VALIDATION.PRIMARY_CURRENCY_CODE.PATTERN,
      TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
    )
    .transform((val) => val.trim().toUpperCase()),

  preferred_language_code: z
    .string({
      invalid_type_error: TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
    })
    .min(
      TENANT_VALIDATION.PREFERRED_LANGUAGE_CODE.MIN_LENGTH,
      TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
    )
    .max(
      TENANT_VALIDATION.PREFERRED_LANGUAGE_CODE.MAX_LENGTH,
      TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
    )
    .regex(
      TENANT_VALIDATION.PREFERRED_LANGUAGE_CODE.PATTERN,
      TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
    )
    .default(TENANT_DEFAULTS.PREFERRED_LANGUAGE_CODE)
    .transform((val) => val.trim().toLowerCase()),

  timezone: z
    .string({
      invalid_type_error: TENANT_ERRORS.TIMEZONE_INVALID,
    })
    .min(TENANT_VALIDATION.TIMEZONE.MIN_LENGTH, TENANT_ERRORS.TIMEZONE_INVALID)
    .max(TENANT_VALIDATION.TIMEZONE.MAX_LENGTH, TENANT_ERRORS.TIMEZONE_INVALID)
    .regex(TENANT_VALIDATION.TIMEZONE.PATTERN, TENANT_ERRORS.TIMEZONE_INVALID)
    .default(TENANT_DEFAULTS.TIMEZONE)
    .transform((val) => val.trim()),

  tax_number: z
    .string({
      invalid_type_error: TENANT_ERRORS.TAX_NUMBER_INVALID,
    })
    .min(TENANT_VALIDATION.TAX_NUMBER.MIN_LENGTH, TENANT_ERRORS.TAX_NUMBER_INVALID)
    .max(TENANT_VALIDATION.TAX_NUMBER.MAX_LENGTH, TENANT_ERRORS.TAX_NUMBER_INVALID)
    .regex(TENANT_VALIDATION.TAX_NUMBER.PATTERN, TENANT_ERRORS.TAX_NUMBER_INVALID)
    .transform((val) => val.trim().toUpperCase())
    .optional(),

  tax_exempt: z.coerce
    .boolean()
    .default(TENANT_DEFAULTS.TAX_EXEMPT)
    .transform((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }),

  billing_email: z
    .string({
      required_error: TENANT_ERRORS.BILLING_EMAIL_REQUIRED,
      invalid_type_error: TENANT_ERRORS.BILLING_EMAIL_INVALID,
    })
    .email(TENANT_ERRORS.BILLING_EMAIL_INVALID)
    .min(TENANT_VALIDATION.BILLING_EMAIL.MIN_LENGTH, TENANT_ERRORS.BILLING_EMAIL_INVALID)
    .max(TENANT_VALIDATION.BILLING_EMAIL.MAX_LENGTH, TENANT_ERRORS.BILLING_EMAIL_INVALID)
    .transform((val) => val.trim().toLowerCase()),

  billing_address: billingAddressSchema,
  // billing_address: billingAddressSchema.optional(),

  billing_phone: z
    .string({
      invalid_type_error: TENANT_ERRORS.BILLING_PHONE_INVALID,
    })
    .min(TENANT_VALIDATION.BILLING_PHONE.MIN_LENGTH, TENANT_ERRORS.BILLING_PHONE_INVALID)
    .max(TENANT_VALIDATION.BILLING_PHONE.MAX_LENGTH, TENANT_ERRORS.BILLING_PHONE_INVALID)
    .regex(TENANT_VALIDATION.BILLING_PHONE.PATTERN, TENANT_ERRORS.BILLING_PHONE_INVALID)
    .transform((val) => val.trim())
    .optional(),

  status: z
    .enum(['ACTIVE', 'SUSPENDED', 'TERMINATED'], {
      invalid_type_error: TENANT_ERRORS.STATUS_INVALID,
    })
    .default(TENANT_DEFAULTS.STATUS)
    .transform((val) => val.toUpperCase()),

  subdomain: z
    .string({
      invalid_type_error: TENANT_ERRORS.SUBDOMAIN_INVALID,
    })
    .min(TENANT_VALIDATION.SUBDOMAIN.MIN_LENGTH, TENANT_ERRORS.SUBDOMAIN_INVALID)
    .max(TENANT_VALIDATION.SUBDOMAIN.MAX_LENGTH, TENANT_ERRORS.SUBDOMAIN_INVALID)
    .regex(TENANT_VALIDATION.SUBDOMAIN.PATTERN, TENANT_ERRORS.SUBDOMAIN_INVALID)
    .transform((val) => val.trim().toLowerCase())
    .optional(),

  database_name: z
    .string({
      invalid_type_error: TENANT_ERRORS.DATABASE_NAME_INVALID,
    })
    .min(TENANT_VALIDATION.DATABASE_NAME.MIN_LENGTH, TENANT_ERRORS.DATABASE_NAME_INVALID)
    .max(TENANT_VALIDATION.DATABASE_NAME.MAX_LENGTH, TENANT_ERRORS.DATABASE_NAME_INVALID)
    .regex(TENANT_VALIDATION.DATABASE_NAME.PATTERN, TENANT_ERRORS.DATABASE_NAME_INVALID)
    .transform((val) => val.trim().toLowerCase())
    .optional(),

  database_username: z
    .string({
      invalid_type_error: TENANT_ERRORS.DATABASE_USERNAME_INVALID,
    })
    .min(TENANT_VALIDATION.DATABASE_USERNAME.MIN_LENGTH, TENANT_ERRORS.DATABASE_USERNAME_INVALID)
    .max(TENANT_VALIDATION.DATABASE_USERNAME.MAX_LENGTH, TENANT_ERRORS.DATABASE_USERNAME_INVALID)
    .regex(TENANT_VALIDATION.DATABASE_USERNAME.PATTERN, TENANT_ERRORS.DATABASE_USERNAME_INVALID)
    .transform((val) => val.trim().toLowerCase())
    .optional(),

  database_password: z
    .string({
      invalid_type_error: TENANT_ERRORS.DATABASE_PASSWORD_INVALID,
    })
    .min(TENANT_VALIDATION.DATABASE_PASSWORD.MIN_LENGTH, TENANT_ERRORS.DATABASE_PASSWORD_INVALID)
    .max(TENANT_VALIDATION.DATABASE_PASSWORD.MAX_LENGTH, TENANT_ERRORS.DATABASE_PASSWORD_INVALID)
    .regex(TENANT_VALIDATION.DATABASE_PASSWORD.PATTERN, TENANT_ERRORS.DATABASE_PASSWORD_INVALID)
    .optional(),
});

// Schéma pour création - tous les champs requis sauf optionnels
export const createTenantSchema = baseTenantSchema;

// Schéma pour mise à jour - tous les champs optionnels (utiliser le schéma de base, pas celui avec refine)
export const updateTenantSchema = baseTenantSchema.partial();

// Schéma pour les filtres de recherche
export const tenantFiltersSchema = z
  .object({
    country_code: z
      .string()
      .regex(TENANT_VALIDATION.COUNTRY_CODE.PATTERN, TENANT_ERRORS.COUNTRY_CODE_INVALID)
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    primary_currency_code: z
      .string()
      .regex(
        TENANT_VALIDATION.PRIMARY_CURRENCY_CODE.PATTERN,
        TENANT_ERRORS.PRIMARY_CURRENCY_CODE_INVALID,
      )
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    preferred_language_code: z
      .string()
      .regex(
        TENANT_VALIDATION.PREFERRED_LANGUAGE_CODE.PATTERN,
        TENANT_ERRORS.PREFERRED_LANGUAGE_CODE_INVALID,
      )
      .transform((val) => val.trim().toLowerCase())
      .optional(),
    timezone: z
      .string()
      .transform((val) => val.trim())
      .optional(),
    tax_exempt: z.coerce.boolean().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
  })
  .strict();

// Schéma pour validation du GUID
export const tenantGuidSchema = z
  .string()
  .regex(/^\d{6}$/, TENANT_ERRORS.GUID_INVALID)
  .transform((val) => parseInt(val))
  .refine(
    (val) => val >= TENANT_VALIDATION.GUID.MIN_VALUE && val <= TENANT_VALIDATION.GUID.MAX_VALUE,
    TENANT_ERRORS.GUID_INVALID,
  );

// Fonctions de validation avec gestion d'erreurs
export const validateTenantCreation = (data: any) => {
  try {
    return createTenantSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTenantUpdate = (data: any) => {
  try {
    return updateTenantSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTenantFilters = (data: any) => {
  try {
    return tenantFiltersSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid filters: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const validateTenantGuid = (guid: any) => {
  try {
    return tenantGuidSchema.parse(guid);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(TENANT_ERRORS.GUID_INVALID);
    }
    throw error;
  }
};

// Schéma complet pour les réponses (avec métadonnées)
export const tenant = baseTenantSchema.extend({
  id: z.number().int().positive(),
  guid: z
    .number()
    .int()
    .min(TENANT_VALIDATION.GUID.MIN_VALUE)
    .max(TENANT_VALIDATION.GUID.MAX_VALUE),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Export groupé pour faciliter l'import
export const tenantSchemas = {
  validateTenantCreation,
  validateTenantUpdate,
  validateTenantFilters,
  validateTenantGuid,
  createTenantSchema,
  updateTenantSchema,
  tenantFiltersSchema,
  tenantGuidSchema,
};

// Types TypeScript générés à partir des schémas
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type TenantData = z.infer<typeof tenant>;
export type TenantFiltersInput = z.infer<typeof tenantFiltersSchema>;
export type BillingAddressData = z.infer<typeof billingAddressSchema>;
