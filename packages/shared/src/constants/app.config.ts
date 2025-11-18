// constants/app_config.ts

export const APP_CONFIG_VALIDATION = {
  KEY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9_\-\.]+$/,
    REQUIRED: true,
  },
  LINK: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
    PATTERN: /^[a-z0-9_\-\.]+$/,
    // PATTERN: /^[a-zA-Z0-9_\-\.]+$/,
    // PATTERN: /^https?:\/\/.+$/,
    REQUIRED: true,
  },
} as const;

export const APP_CONFIG_DEFAULTS = {
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const APP_CONFIG_CODES = {
  CONFIG_ALREADY_EXISTS: 'app_config_already_exists',
  CONFIG_NOT_FOUND: 'app_config_not_found',
  INVALID_ID: 'invalid_id',
  KEY_REQUIRED: 'key_required',
  KEY_INVALID: 'key_invalid',
  KEY_ALREADY_EXISTS: 'key_already_exists',
  LINK_REQUIRED: 'link_required',
  LINK_INVALID: 'link_invalid',
  ACTIVE_STATUS_INVALID: 'active_status_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  RETRIEVAL_FAILED: 'retrieval_failed',
  PATCH_STATUS_FAILED: 'patch_status_failed',
} as const;

const APP_CONFIG_LABEL = 'AppConfig';
export const APP_CONFIG_ERRORS = {
  APP_CONFIG: APP_CONFIG_LABEL,

  ID_REQUIRED: `${APP_CONFIG_LABEL} ID is required`,
  ID_INVALID: `${APP_CONFIG_LABEL} ID must be a positive integer`,

  KEY_REQUIRED: `${APP_CONFIG_LABEL} key is required`,
  KEY_INVALID: `Key must be alphanumeric with underscores, dashes, or dots, ${APP_CONFIG_VALIDATION.KEY.MIN_LENGTH}-${APP_CONFIG_VALIDATION.KEY.MAX_LENGTH} characters`,
  KEY_ALREADY_EXISTS: 'Configuration key already exists',

  LINK_REQUIRED: `${APP_CONFIG_LABEL} link is required`,
  LINK_INVALID: `Link must be a valid URL (http/https) and not exceed ${APP_CONFIG_VALIDATION.LINK.MAX_LENGTH} characters`,

  ACTIVE_STATUS_INVALID: 'Active status must be a boolean value (true or false)',

  NOT_FOUND: `${APP_CONFIG_LABEL} not found`,
  VALIDATION_FAILED: `${APP_CONFIG_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${APP_CONFIG_LABEL}`,
  UPDATE_FAILED: `Failed to update ${APP_CONFIG_LABEL}`,
  DELETE_FAILED: `Failed to delete ${APP_CONFIG_LABEL}`,

  DUPLICATE_CONFIG: `${APP_CONFIG_LABEL} already exists`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  FILTER_INVALID: 'Invalid filter parameters',

  PATCH_STATUS_FAILED: `Failed to update ${APP_CONFIG_LABEL} status`,
  RETRIEVAL_FAILED: `Failed to retrieve ${APP_CONFIG_LABEL}`,
} as const;

export type AppConfigError = (typeof APP_CONFIG_ERRORS)[keyof typeof APP_CONFIG_ERRORS];
export type AppConfigCode = (typeof APP_CONFIG_CODES)[keyof typeof APP_CONFIG_CODES];
export type AppConfigValidation = typeof APP_CONFIG_VALIDATION;
