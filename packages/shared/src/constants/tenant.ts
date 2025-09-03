// constants/tenant.ts
export const TENANT_VALIDATION = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
  },
  REGISTRATION_NUMBER: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  SHORT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  KEY: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-z0-9_-]{2,100}$/,
  },
  COUNTRY_CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[A-Z]{2}$/,
  },
  PRIMARY_CURRENCY_CODE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
  PREFERRED_LANGUAGE_CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[a-z]{2}$/,
  },
  TIMEZONE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 64,
    PATTERN: /^([A-Z][a-z]+\/[A-Za-z_]+|UTC[+-]\d{1,2}(:\d{2})?|UTC)$/,
  },
  TAX_NUMBER: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[A-Za-z0-9-_]{2,50}$/,
  },
  BILLING_EMAIL: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 255,
  },
  BILLING_PHONE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[0-9+\-\s()]+$/,
  },
  SUBDOMAIN: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    PATTERN: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  DATABASE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    PATTERN: /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/,
  },
  DATABASE_USERNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    PATTERN: /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/,
  },
  DATABASE_PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 255,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,255}$/,
  },
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
} as const;

export const TENANT_DEFAULTS = {
  PREFERRED_LANGUAGE_CODE: 'en',
  TIMEZONE: 'UTC',
  TAX_EXEMPT: false,
  STATUS: 'ACTIVE' as const,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const TENANT_CODES = {
  TENANT_ALREADY_EXISTS: 'tenant_already_exists',
  TENANT_NOT_FOUND: 'tenant_not_found',
  INVALID_GUID: 'invalid_guid',
  NAME_INVALID: 'name_invalid',
  REGISTRATION_NUMBER_INVALID: 'registration_number_invalid',
  SHORT_NAME_INVALID: 'short_name_invalid',
  KEY_INVALID: 'key_invalid',
  COUNTRY_CODE_INVALID: 'country_code_invalid',
  PRIMARY_CURRENCY_CODE_INVALID: 'primary_currency_code_invalid',
  PREFERRED_LANGUAGE_CODE_INVALID: 'preferred_language_code_invalid',
  TIMEZONE_INVALID: 'timezone_invalid',
  TAX_NUMBER_INVALID: 'tax_number_invalid',
  BILLING_EMAIL_INVALID: 'billing_email_invalid',
  BILLING_ADDRESS_INVALID: 'billing_address_invalid',
  BILLING_PHONE_INVALID: 'billing_phone_invalid',
  STATUS_INVALID: 'status_invalid',
  SUBDOMAIN_INVALID: 'subdomain_invalid',
  DATABASE_NAME_INVALID: 'database_name_invalid',
  DATABASE_USERNAME_INVALID: 'database_username_invalid',
  DATABASE_PASSWORD_INVALID: 'database_password_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  NAME_REQUIRED: 'name_required',
  REGISTRATION_NUMBER_REQUIRED: 'registration_number_required',
  KEY_REQUIRED: 'key_required',
  COUNTRY_CODE_REQUIRED: 'country_code_required',
  PRIMARY_CURRENCY_CODE_REQUIRED: 'primary_currency_code_required',
  BILLING_EMAIL_REQUIRED: 'billing_email_required',
} as const;

const TENANT_LABEL = 'Tenant';
export const TENANT_ERRORS = {
  TENANT: TENANT_LABEL,

  NAME_REQUIRED: `${TENANT_LABEL} name is required`,
  NAME_INVALID: `Name must be between ${TENANT_VALIDATION.NAME.MIN_LENGTH} and ${TENANT_VALIDATION.NAME.MAX_LENGTH} characters`,

  REGISTRATION_NUMBER_REQUIRED: `${TENANT_LABEL} registration number is required`,
  REGISTRATION_NUMBER_INVALID: `Registration number must be between ${TENANT_VALIDATION.REGISTRATION_NUMBER.MIN_LENGTH} and ${TENANT_VALIDATION.REGISTRATION_NUMBER.MAX_LENGTH} characters`,

  SHORT_NAME_INVALID: `Short name must be between ${TENANT_VALIDATION.SHORT_NAME.MIN_LENGTH} and ${TENANT_VALIDATION.SHORT_NAME.MAX_LENGTH} characters`,

  KEY_REQUIRED: `${TENANT_LABEL} key is required`,
  KEY_INVALID: `Key must be between ${TENANT_VALIDATION.KEY.MIN_LENGTH} and ${TENANT_VALIDATION.KEY.MAX_LENGTH} lowercase alphanumeric characters with underscores or hyphens`,

  COUNTRY_CODE_REQUIRED: `${TENANT_LABEL} country code is required`,
  COUNTRY_CODE_INVALID: 'Country code must be 2 uppercase letters (ISO 3166-1)',

  PRIMARY_CURRENCY_CODE_REQUIRED: `${TENANT_LABEL} primary currency code is required`,
  PRIMARY_CURRENCY_CODE_INVALID: 'Primary currency code must be 3 uppercase letters (ISO 4217)',

  PREFERRED_LANGUAGE_CODE_INVALID:
    'Preferred language code must be 2 lowercase letters (ISO 639-1)',

  TIMEZONE_INVALID: 'Invalid timezone format',

  TAX_NUMBER_INVALID: `Tax number must be between ${TENANT_VALIDATION.TAX_NUMBER.MIN_LENGTH} and ${TENANT_VALIDATION.TAX_NUMBER.MAX_LENGTH} alphanumeric characters with hyphens or underscores`,

  BILLING_EMAIL_REQUIRED: `${TENANT_LABEL} billing email is required`,
  BILLING_EMAIL_INVALID: `Billing email must be a valid email address between ${TENANT_VALIDATION.BILLING_EMAIL.MIN_LENGTH} and ${TENANT_VALIDATION.BILLING_EMAIL.MAX_LENGTH} characters`,

  BILLING_ADDRESS_INVALID: 'Invalid billing address format',
  BILLING_ADDRESS_REQUIRED: `${TENANT_LABEL} billing address is required`,

  BILLING_PHONE_INVALID: `Billing phone must be between ${TENANT_VALIDATION.BILLING_PHONE.MIN_LENGTH} and ${TENANT_VALIDATION.BILLING_PHONE.MAX_LENGTH} characters with valid phone format`,

  STATUS_INVALID: 'Status must be one of: ACTIVE, SUSPENDED, TERMINATED',

  SUBDOMAIN_INVALID: `Subdomain must be between ${TENANT_VALIDATION.SUBDOMAIN.MIN_LENGTH} and ${TENANT_VALIDATION.SUBDOMAIN.MAX_LENGTH} lowercase alphanumeric characters with hyphens`,

  DATABASE_NAME_INVALID: `Database name must be between ${TENANT_VALIDATION.DATABASE_NAME.MIN_LENGTH} and ${TENANT_VALIDATION.DATABASE_NAME.MAX_LENGTH} lowercase alphanumeric characters with underscores or hyphens`,

  DATABASE_USERNAME_INVALID: `Database username must be between ${TENANT_VALIDATION.DATABASE_USERNAME.MIN_LENGTH} and ${TENANT_VALIDATION.DATABASE_USERNAME.MAX_LENGTH} lowercase alphanumeric characters with underscores or hyphens`,

  DATABASE_PASSWORD_INVALID: `Database password must be between ${TENANT_VALIDATION.DATABASE_PASSWORD.MIN_LENGTH} and ${TENANT_VALIDATION.DATABASE_PASSWORD.MAX_LENGTH} characters with at least one uppercase, one lowercase, and one digit`,

  INVALID_BOOLEAN: 'Invalid boolean format.',

  GUID_INVALID: 'GUID must be a 6-digit number',
  NOT_FOUND: 'Tenant not found',

  CREATION_FAILED: 'Failed to create tenant',
  UPDATE_FAILED: 'Failed to update tenant',
  DELETE_FAILED: 'Failed to delete tenant',
  EXPORT_FAILED: 'Failed to export tenants',

  DUPLICATE_TENANT: 'Tenant with this key already exists',
} as const;

export enum Status {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export type TenantError = (typeof TENANT_ERRORS)[keyof typeof TENANT_ERRORS];
export type TenantCode = (typeof TENANT_CODES)[keyof typeof TENANT_CODES];
