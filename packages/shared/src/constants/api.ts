// shared/src/constants/api.constants.ts

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

export const API_ROUTES = {
  COUNTRIES: '/api/countries',
  COUNTRIES_BY_ID: (id: string | number) => `/api/countries/${id}`,
  COUNTRIES_BY_GUID: (guid: string | number) => `/api/countries/${guid}`,
  COUNTRIES_BY_CODE: (code: string) => `/api/countries/search/code/${code}`,
  COUNTRIES_BY_TIMEZONE: (timezone: string) =>
    `/api/countries/timezone/${encodeURIComponent(timezone)}`,
  COUNTRIES_BY_CURRENCY: (currency: string) => `/api/countries/currency/${currency}`,
  COUNTRIES_BY_LANGUAGE: (language: string) => `/api/countries/language/${language}`,
  COUNTRIES_BY_STATUS: (status: boolean) => `/api/countries/active/${status}`,
  COUNTRIES_LIST: '/api/countries/list',
  COUNTRIES_REVISION: '/api/countries/revision',
} as const;

export const ERROR_CODES = {
  // Erreurs générales de validation
  VALIDATION_FAILED: 'validation_failed',
  INVALID_FORMAT: 'invalid_format',
  INVALID_GUID: 'invalid_guid',
  // REQUIRED_FIELD: 'required_field',
  REQUIRED_FIELD_MISSING: 'required_field_missing',

  // Erreurs CRUD génériques
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  LISTING_FAILED: 'listing_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',

  // Erreurs de ressources non trouvées
  NOT_FOUND: 'not_found',
  COUNTRY_NOT_FOUND: 'country_not_found',
  CURRENCY_NOT_FOUND: 'currency_not_found',

  // Erreurs de conflits/doublons
  ALREADY_EXISTS: 'already_exists',
  COUNTRY_ALREADY_EXISTS: 'country_already_exists',
  CURRENCY_ALREADY_EXISTS: 'currency_already_exists',

  // Erreurs spécifiques aux pays
  INVALID_COUNTRY_CODE: 'invalid_country_code',
  INVALID_CURRENCY_CODE: 'invalid_currency_code',
  INVALID_LANGUAGE_CODE: 'invalid_language_code',
  INVALID_PHONE_PREFIX: 'invalid_phone_prefix',
  INVALID_TIMEZONE: 'invalid_timezone',

  // Erreurs spécifiques aux devises
  CURRENCY_CODE_INVALID: 'currency_code_invalid',
  CURRENCY_NAME_INVALID: 'currency_name_invalid',
  CURRENCY_SYMBOL_INVALID: 'currency_symbol_invalid',
  DECIMAL_PLACES_INVALID: 'decimal_places_invalid',

  // Erreurs de pagination
  PAGINATION_INVALID: 'pagination_invalid',
  OFFSET_INVALID: 'offset_invalid',
  LIMIT_INVALID: 'limit_invalid',
  LIMIT_EXCEEDED: 'limit_exceeded',

  // Erreurs de filtres
  FILTER_INVALID: 'filter_invalid',
  FILTER_VALUE_INVALID: 'filter_value_invalid',

  // Erreurs système
  DATABASE_ERROR: 'database_error',
  INTERNAL_ERROR: 'internal_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network_error',

  // Erreurs d'authentification/autorisation
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  TOKEN_INVALID: 'token_invalid',
  TOKEN_EXPIRED: 'token_expired',

  // Erreurs de données corrompues
  DATA_CORRUPTION: 'data_corruption',
  REVISION_MISMATCH: 'revision_mismatch',
  SYNC_ERROR: 'sync_error',
} as const;

export const ERROR_MESSAGES = {
  ID_REQUIRED: 'ID is required',
  GUID_GENERATOR_FAILED: 'Failed to generate GUID for',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain',
} as const;

export const REQUEST_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  USER_AGENT: 'User-Agent',
  ACCEPT: 'Accept',
  ACCEPT_LANGUAGE: 'Accept-Language',
  X_REQUESTED_WITH: 'X-Requested-With',
  X_REQUEST_ID: 'X-Request-ID',
} as const;

export const CACHE_KEYS = {
  COUNTRIES_ALL: 'countries:all',
  COUNTRIES_ACTIVE: 'countries:active',
  COUNTRY_BY_CODE: (code: string) => `country:code:${code}`,
  COUNTRY_BY_GUID: (guid: number) => `country:guid:${guid}`,
  COUNTRIES_BY_CURRENCY: (currency: string) => `countries:currency:${currency}`,
  COUNTRIES_BY_TIMEZONE: (timezone: string) => `countries:timezone:${timezone}`,
  COUNTRIES_REVISION: 'countries:revision',
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
} as const;

export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  STRICT: {
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
  LOOSE: {
    windowMs: 15 * 60 * 1000,
    max: 1000,
  },
} as const;
