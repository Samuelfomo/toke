export const EXCHANGE_RATE_VALIDATION = {
  FROM_CURRENCY_CODE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
  TO_CURRENCY_CODE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
  EXCHANGE_RATE: {
    MIN_VALUE: 0.000001, // Pour éviter les divisions par zéro
    MAX_VALUE: 999999.999999,
    DECIMAL_PLACES: 6,
  },
  CREATED_BY: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647, // Max INT
  },
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
} as const;

export const EXCHANGE_RATE_DEFAULTS = {
  CURRENT: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

const EXCHANGE_RATE_LABEL = 'Exchange Rate';
export const EXCHANGE_RATE_ERRORS = {
  EXCHANGE_RATE: EXCHANGE_RATE_LABEL,

  FROM_CURRENCY_CODE_REQUIRED: `${EXCHANGE_RATE_LABEL} from currency code (ISO) is required`,
  FROM_CURRENCY_CODE_INVALID: 'From currency code must be exactly 3 uppercase letters (ISO 4217)',

  TO_CURRENCY_CODE_REQUIRED: `${EXCHANGE_RATE_LABEL} to currency code (ISO) is required`,
  TO_CURRENCY_CODE_INVALID: 'To currency code must be exactly 3 uppercase letters (ISO 4217)',

  SAME_CURRENCY_PAIR: 'From and to currency codes cannot be the same',
  CURRENCY_PAIR_EXISTS: 'Exchange rate for this currency pair already exists',

  EXCHANGE_RATE_REQUIRED: 'Exchange rate value is required',
  EXCHANGE_RATE_INVALID: `Exchange rate must be between ${EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MIN_VALUE} and ${EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MAX_VALUE}`,
  EXCHANGE_RATE_ZERO: 'Exchange rate cannot be zero',

  CREATED_BY_REQUIRED: 'Created by user ID is required',
  CREATED_BY_INVALID: 'Created by must be a valid user ID (positive integer)',

  INVALID_BOOLEAN: 'Invalid boolean value for current status',

  GUID_INVALID: 'GUID must be a 6-digit number',
  NOT_FOUND: 'Exchange rate not found',

  CREATION_FAILED: 'Failed to create exchange rate',
  UPDATE_FAILED: 'Failed to update exchange rate',
  DELETE_FAILED: 'Failed to delete exchange rate',
  EXPORT_FAILED: 'Failed to export exchange rates',

  CONVERSION_FAILED: 'Currency conversion failed',
  INVALID_AMOUNT: 'Amount must be a positive number',
  RATE_NOT_AVAILABLE: 'Exchange rate not available for the requested currency pair',
} as const;

export type ExchangeRateError = (typeof EXCHANGE_RATE_ERRORS)[keyof typeof EXCHANGE_RATE_ERRORS];
