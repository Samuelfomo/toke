// constants/payment.method.ts

export const PAYMENT_METHOD_VALIDATION = {
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
  CODE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]{1,20}$/,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  METHOD_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]{1,20}$/,
  },
  SUPPORTED_CURRENCIES: {
    ITEM_LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
    MAX_CURRENCIES: 50,
  },
  PROCESSING_FEE_RATE: {
    MIN_VALUE: 0.0,
    MAX_VALUE: 99.9999,
    DECIMAL_PLACES: 4,
  },
  MIN_AMOUNT_USD: {
    MIN_VALUE: 0.0,
    MAX_VALUE: 99999999.99,
    DECIMAL_PLACES: 2,
  },
  MAX_AMOUNT_USD: {
    MIN_VALUE: 0.0,
    MAX_VALUE: 99999999.99,
    DECIMAL_PLACES: 2,
  },
} as const;

export const PAYMENT_METHOD_DEFAULTS = {
  ACTIVE: true,
  PROCESSING_FEE_RATE: 0.0,
  MIN_AMOUNT_USD: 1.0,
  SUPPORTED_CURRENCIES: [] as string[],
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const PAYMENT_METHOD_CODES = {
  PAYMENT_METHOD_ALREADY_EXISTS: 'payment_method_already_exists',
  PAYMENT_METHOD_NOT_FOUND: 'payment_method_not_found',
  INVALID_GUID: 'invalid_guid',
  CODE_INVALID: 'code_invalid',
  CODE_DUPLICATE: 'code_duplicate',
  NAME_INVALID: 'name_invalid',
  METHOD_TYPE_INVALID: 'method_type_invalid',
  SUPPORTED_CURRENCIES_INVALID: 'supported_currencies_invalid',
  PROCESSING_FEE_RATE_INVALID: 'processing_fee_rate_invalid',
  MIN_AMOUNT_USD_INVALID: 'min_amount_usd_invalid',
  MAX_AMOUNT_USD_INVALID: 'max_amount_usd_invalid',
  AMOUNT_RANGE_INVALID: 'amount_range_invalid',
  ACTIVE_INVALID: 'active_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  CODE_REQUIRED: 'code_required',
  NAME_REQUIRED: 'name_required',
  METHOD_TYPE_REQUIRED: 'method_type_required',
  PROCESSING_FEE_RATE_REQUIRED: 'processing_fee_rate_required',
  MIN_AMOUNT_USD_REQUIRED: 'min_amount_usd_required',
  MAX_AMOUNT_USD_REQUIRED: 'max_amount_usd_required',
  CURRENCY_CODE_INVALID: 'currency_code_invalid',
  DUPLICATE_CURRENCY_CODE: 'duplicate_currency_code',
} as const;

const PAYMENT_METHOD_LABEL = 'Payment Method';
export const PAYMENT_METHOD_ERRORS = {
  PAYMENT_METHOD: PAYMENT_METHOD_LABEL,

  CODE_REQUIRED: `${PAYMENT_METHOD_LABEL} code is required`,
  CODE_INVALID: `Code must be between ${PAYMENT_METHOD_VALIDATION.CODE.MIN_LENGTH} and ${PAYMENT_METHOD_VALIDATION.CODE.MAX_LENGTH} alphanumeric characters with underscores`,
  CODE_DUPLICATE: `${PAYMENT_METHOD_LABEL} with this code already exists`,

  NAME_REQUIRED: `${PAYMENT_METHOD_LABEL} name is required`,
  NAME_INVALID: `Name must be between ${PAYMENT_METHOD_VALIDATION.NAME.MIN_LENGTH} and ${PAYMENT_METHOD_VALIDATION.NAME.MAX_LENGTH} characters`,

  METHOD_TYPE_REQUIRED: `${PAYMENT_METHOD_LABEL} method type is required`,
  METHOD_TYPE_INVALID: `Method type must be between ${PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MIN_LENGTH} and ${PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MAX_LENGTH} alphanumeric characters with underscores`,

  SUPPORTED_CURRENCIES_INVALID:
    'Supported currencies must be an array of valid 3-letter ISO 4217 currency codes',
  CURRENCY_CODE_INVALID:
    'Currency code must be a valid 3-letter ISO 4217 code (e.g., USD, EUR, XAF)',
  DUPLICATE_CURRENCY_CODE: 'Duplicate currency codes are not allowed',

  PROCESSING_FEE_RATE_REQUIRED: `${PAYMENT_METHOD_LABEL} processing fee rate is required`,
  PROCESSING_FEE_RATE_INVALID: `Processing fee rate must be between ${PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MIN_VALUE} and ${PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MAX_VALUE}`,

  MIN_AMOUNT_USD_REQUIRED: `${PAYMENT_METHOD_LABEL} minimum amount in USD is required`,
  MIN_AMOUNT_USD_INVALID: `Minimum amount USD must be between ${PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MIN_VALUE} and ${PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MAX_VALUE}`,

  MAX_AMOUNT_USD_REQUIRED: `${PAYMENT_METHOD_LABEL} maximum amount in USD is required`,
  MAX_AMOUNT_USD_INVALID: `Maximum amount USD must be between ${PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MIN_VALUE} and ${PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MAX_VALUE}`,

  AMOUNT_RANGE_INVALID: 'Maximum amount must be greater than or equal to minimum amount',

  ACTIVE_INVALID: 'Active status must be a boolean value',

  GUID_INVALID: 'GUID must be a 6-digit number between 100000 and 999999',
  NOT_FOUND: `${PAYMENT_METHOD_LABEL} not found`,
  VALIDATION_FAILED: `${PAYMENT_METHOD_LABEL} requires valid entries`,

  CREATION_FAILED: `Failed to create ${PAYMENT_METHOD_LABEL}`,
  UPDATE_FAILED: `Failed to update ${PAYMENT_METHOD_LABEL}`,
  DELETE_FAILED: `Failed to delete ${PAYMENT_METHOD_LABEL}`,
  EXPORT_FAILED: `Failed to export ${PAYMENT_METHOD_LABEL}s`,

  DUPLICATE_PAYMENT_METHOD: `${PAYMENT_METHOD_LABEL} already exists with this code`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',

  // Business logic errors
  CANNOT_DEACTIVATE_IN_USE: `Cannot deactivate ${PAYMENT_METHOD_LABEL} that is currently in use`,
  CURRENCY_NOT_SUPPORTED: 'Currency not supported by this payment method',
  AMOUNT_BELOW_MINIMUM: 'Amount is below the minimum limit for this payment method',
  AMOUNT_ABOVE_MAXIMUM: 'Amount exceeds the maximum limit for this payment method',
} as const;

export type PaymentMethodError = (typeof PAYMENT_METHOD_ERRORS)[keyof typeof PAYMENT_METHOD_ERRORS];
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[keyof typeof PAYMENT_METHOD_CODES];
