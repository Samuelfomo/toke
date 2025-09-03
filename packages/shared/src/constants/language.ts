export const LANGUAGE_VALIDATION = {
  CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[A-Z]{2}$/,
  },
  NAME_EN: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  NAME_LOCAL: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
} as const;

export const LANGUAGE_DEFAULTS = {
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const LANGUAGE_CODES = {
  LANGUAGE_ALREADY_EXISTS: 'language_already_exists',
  LANGUAGE_NOT_FOUND: 'language_not_found',
  INVALID_GUID: 'invalid_guid',
  CODE_INVALID: 'code_invalid',
  NAME_INVALID: 'name_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  STATUS_SEARCH_FAILED: 'status_search_failed',
} as const;

const LANGUAGE_LABEL = 'Language';
export const LANGUAGE_ERRORS = {
  LANGUAGE: LANGUAGE_LABEL,

  CODE_REQUIRED: `${LANGUAGE_LABEL} code (ISO 639-1) is required`,
  CODE_INVALID: 'Language code must be exactly 2 uppercase letters (ISO 639-1)',

  NAME_EN_REQUIRED: `${LANGUAGE_LABEL} English name is required`,
  NAME_EN_INVALID: `English name must be between ${LANGUAGE_VALIDATION.NAME_EN.MIN_LENGTH} and ${LANGUAGE_VALIDATION.NAME_EN.MAX_LENGTH} characters`,

  NAME_LOCAL_REQUIRED: `${LANGUAGE_LABEL} local name is required`,
  NAME_LOCAL_INVALID: `Local name must be between ${LANGUAGE_VALIDATION.NAME_LOCAL.MIN_LENGTH} and ${LANGUAGE_VALIDATION.NAME_LOCAL.MAX_LENGTH} characters`,

  INVALID_BOOLEAN: 'Invalid boolean value for active status',

  GUID_INVALID: 'GUID must be a 6-digit number',
  NOT_FOUND: 'Language not found',

  CREATION_FAILED: 'Failed to create language',
  UPDATE_FAILED: 'Failed to update language',
  DELETE_FAILED: 'Failed to delete language',
  EXPORT_FAILED: 'Failed to export languages',

  CODE_ALREADY_EXISTS: 'Language with this code already exists',
  NAME_ALREADY_EXISTS: 'Language with this name already exists',
} as const;

export type LanguageError = (typeof LANGUAGE_ERRORS)[keyof typeof LANGUAGE_ERRORS];
export type LanguageCode = (typeof LANGUAGE_CODES)[keyof typeof LANGUAGE_CODES];
