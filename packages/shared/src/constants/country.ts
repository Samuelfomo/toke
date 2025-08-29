// shared/src/constants/country.ts

export const COUNTRY_VALIDATION = {
  CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[A-Z]{2}$/,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 128,
  },
  CURRENCY_CODE: {
    LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
  LANGUAGE_CODE: {
    LENGTH: 2,
    PATTERN: /^[a-z]{2}$/,
  },
  PHONE_PREFIX: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 6,
    PATTERN: /^\+\d{1,5}$/,
  },
  TIMEZONE: {
    MAX_LENGTH: 64,
    PATTERN: /^([A-Z][a-z]+\/[A-Za-z_]+|UTC[+-]\d{1,2}(:\d{2})?|UTC)$/,
  },
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
} as const;

export const COUNTRY_DEFAULTS = {
  ACTIVE: true,
  TIMEZONE: 'UTC',
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

// Codes de devises populaires
export const POPULAR_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'CAD',
  'AUD',
  'CHF',
  'XAF',
  'XOF',
  'MAD',
  'EGP',
  'ZAR',
  'NGN',
  'KES',
  'GHS',
] as const;

// Fuseaux horaires populaires
export const POPULAR_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Africa/Douala',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
] as const;

// Messages d'erreur standardisés
export const COUNTRY_ERRORS = {
  CODE_REQUIRED: 'Country code (ISO) is required',
  CODE_INVALID: 'Country code must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)',
  CODE_EXISTS: 'Country code already exists',

  NAME_EN_REQUIRED: 'Country name (English) is required',
  NAME_INVALID: 'Country name must be between 2 and 128 characters',

  CURRENCY_REQUIRED: 'Default currency code is required',
  CURRENCY_INVALID: 'Currency code must be a valid ISO 4217 code (3 uppercase letters)',

  LANGUAGE_REQUIRED: 'Default language code is required',
  LANGUAGE_INVALID: 'Language code must be a valid ISO 639-1 code (2 lowercase letters)',

  PHONE_PREFIX_REQUIRED: 'Phone prefix is required',
  PHONE_PREFIX_INVALID: 'Phone prefix must follow the format +XXX (1-5 digits after +)',

  TIMEZONE_INVALID: 'Invalid timezone format. Use Continent/City or UTC±offset format',

  GUID_INVALID: 'GUID must be a 6-digit number',
  NOT_FOUND: 'Country not found',

  CREATION_FAILED: 'Failed to create country',
  UPDATE_FAILED: 'Failed to update country',
  DELETE_FAILED: 'Failed to delete country',
  EXPORT_FAILED: 'Failed to export countries',
} as const;

export type CountryError = (typeof COUNTRY_ERRORS)[keyof typeof COUNTRY_ERRORS];
