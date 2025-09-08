export const LEXICON_VALIDATION = {
  REFERENCE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-z][a-zA-Z0-9]*$/, // camelCase pattern
  },
  TRANSLATION: {
    MIN_LANGUAGES: 1, // Au minimum français requis
    REQUIRED_DEFAULT_LANG: 'fr', // Français obligatoire
  },
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
} as const;

export const LEXICON_DEFAULTS = {
  PORTABLE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const LEXICON_CODES = {
  LEXICON_ALREADY_EXISTS: 'lexicon_already_exists',
  LEXICON_NOT_FOUND: 'lexicon_not_found',
  INVALID_GUID: 'invalid_guid',
  REFERENCE_INVALID: 'reference_invalid',
  TRANSLATION_INVALID: 'translation_invalid',
  LANGUAGE_CODE_INVALID: 'language_code_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  TRANSLATION_UPDATE_FAILED: 'translation_update_failed',
  DEFAULT_LANGUAGE_MISSING: 'default_language_missing',
} as const;

const LEXICON_LABEL = 'Lexicon';
export const LEXICON_ERRORS = {
  LEXICON: LEXICON_LABEL,

  REFERENCE_REQUIRED: `${LEXICON_LABEL} reference is required`,
  REFERENCE_INVALID: `Reference must be camelCase format (1-${LEXICON_VALIDATION.REFERENCE.MAX_LENGTH} characters, start with lowercase)`,

  TRANSLATION_REQUIRED: `${LEXICON_LABEL} translation is required`,
  TRANSLATION_INVALID: 'Translation must be a valid object with language codes as keys',
  DEFAULT_LANGUAGE_REQUIRED: `Translation must include French (${LEXICON_VALIDATION.TRANSLATION.REQUIRED_DEFAULT_LANG}) as default language`,

  LANGUAGE_CODE_INVALID: 'Invalid language code - must be a valid active language from the system',

  INVALID_BOOLEAN: 'Invalid boolean value for portable status',

  GUID_INVALID: 'GUID must be a 6-digit number',
  NOT_FOUND: 'Lexicon entry not found',

  CREATION_FAILED: 'Failed to create lexicon entry',
  UPDATE_FAILED: 'Failed to update lexicon entry',
  DELETE_FAILED: 'Failed to delete lexicon entry',
  EXPORT_FAILED: 'Failed to export lexicon',

  REFERENCE_ALREADY_EXISTS: 'Lexicon entry with this reference already exists',
  TRANSLATION_UPDATE_FAILED: 'Failed to update translations',
} as const;

export type LexiconError = (typeof LEXICON_ERRORS)[keyof typeof LEXICON_ERRORS];
export type LexiconCode = (typeof LEXICON_CODES)[keyof typeof LEXICON_CODES];
