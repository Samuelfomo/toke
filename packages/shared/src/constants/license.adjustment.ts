// constants/license.adjustment.ts

export const LICENSE_ADJUSTMENT_VALIDATION = {
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
  GLOBAL_LICENSE: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647,
  },
  EMPLOYEES_ADDED_COUNT: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647,
  },
  MONTHS_REMAINING: {
    MIN_VALUE: 0,
    MAX_VALUE: 99.99,
    DECIMAL_PLACES: 2,
  },
  PRICE_PER_EMPLOYEE_USD: {
    MIN_VALUE: 0,
    MAX_VALUE: 99999999.99,
    DECIMAL_PLACES: 2,
  },
  SUBTOTAL_USD: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  TAX_AMOUNT_USD: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  TOTAL_AMOUNT_USD: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  BILLING_CURRENCY_CODE: {
    LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
  EXCHANGE_RATE_USED: {
    MIN_VALUE: 0,
    MAX_VALUE: 999999.999999,
    DECIMAL_PLACES: 6,
  },
  SUBTOTAL_LOCAL: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  TAX_AMOUNT_LOCAL: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  TOTAL_AMOUNT_LOCAL: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  TAX_RATE: {
    MIN_VALUE: 0,
    MAX_VALUE: 100,
    DECIMAL_PLACES: 4,
  },
} as const;

export const LICENSE_ADJUSTMENT_DEFAULTS = {
  TAX_AMOUNT_USD: 0,
  TAX_AMOUNT_LOCAL: 0,
  PAYMENT_DUE_IMMEDIATELY: true,
  TAX_RULES_APPLIED: [] as any[],
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export const LICENSE_ADJUSTMENT_CODES = {
  LICENSE_ADJUSTMENT_ALREADY_EXISTS: 'license_adjustment_already_exists',
  LICENSE_ADJUSTMENT_NOT_FOUND: 'license_adjustment_not_found',
  INVALID_GUID: 'invalid_guid',
  INVALID_GLOBAL_LICENSE: 'invalid_global_license',
  INVALID_ADJUSTMENT_DATE: 'invalid_adjustment_date',
  INVALID_EMPLOYEES_ADDED_COUNT: 'invalid_employees_added_count',
  INVALID_MONTHS_REMAINING: 'invalid_months_remaining',
  INVALID_PRICE_PER_EMPLOYEE_USD: 'invalid_price_per_employee_usd',
  INVALID_SUBTOTAL_USD: 'invalid_subtotal_usd',
  INVALID_TAX_AMOUNT_USD: 'invalid_tax_amount_usd',
  INVALID_TOTAL_AMOUNT_USD: 'invalid_total_amount_usd',
  INVALID_BILLING_CURRENCY_CODE: 'invalid_billing_currency_code',
  INVALID_EXCHANGE_RATE_USED: 'invalid_exchange_rate_used',
  INVALID_SUBTOTAL_LOCAL: 'invalid_subtotal_local',
  INVALID_TAX_AMOUNT_LOCAL: 'invalid_tax_amount_local',
  INVALID_TOTAL_AMOUNT_LOCAL: 'invalid_total_amount_local',
  INVALID_TAX_RULES_APPLIED: 'invalid_tax_rules_applied',
  INVALID_PAYMENT_STATUS: 'invalid_payment_status',
  INVALID_PAYMENT_DUE_IMMEDIATELY: 'invalid_payment_due_immediately',
  INVALID_INVOICE_SENT_AT: 'invalid_invoice_sent_at',
  INVALID_PAYMENT_COMPLETED_AT: 'invalid_payment_completed_at',
  AMOUNT_CALCULATION_ERROR: 'amount_calculation_error',
  TOTAL_CALCULATION_ERROR: 'total_calculation_error',
  LOCAL_AMOUNTS_INCONSISTENCY: 'local_amounts_inconsistency',
  PAYMENT_COMPLETED_BEFORE_ADJUSTMENT: 'payment_completed_before_adjustment',
  PAYMENT_COMPLETED_BEFORE_INVOICE: 'payment_completed_before_invoice',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  GLOBAL_LICENSE_REQUIRED: 'global_license_required',
  ADJUSTMENT_DATE_REQUIRED: 'adjustment_date_required',
  EMPLOYEES_ADDED_COUNT_REQUIRED: 'employees_added_count_required',
  MONTHS_REMAINING_REQUIRED: 'months_remaining_required',
  PRICE_PER_EMPLOYEE_USD_REQUIRED: 'price_per_employee_usd_required',
  SUBTOTAL_USD_REQUIRED: 'subtotal_usd_required',
  TOTAL_AMOUNT_USD_REQUIRED: 'total_amount_usd_required',
  BILLING_CURRENCY_CODE_REQUIRED: 'billing_currency_code_required',
  EXCHANGE_RATE_USED_REQUIRED: 'exchange_rate_used_required',
  SUBTOTAL_LOCAL_REQUIRED: 'subtotal_local_required',
  TOTAL_AMOUNT_LOCAL_REQUIRED: 'total_amount_local_required',
  TAX_RULES_APPLIED_REQUIRED: 'tax_rules_applied_required',
  PAYMENT_STATUS_REQUIRED: 'payment_status_required',
} as const;

const LICENSE_ADJUSTMENT_LABEL = 'License Adjustment';
export const LICENSE_ADJUSTMENT_ERRORS = {
  LICENSE_ADJUSTMENT: LICENSE_ADJUSTMENT_LABEL,

  GLOBAL_LICENSE_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} global license is required`,
  INVALID_GLOBAL_LICENSE: `Global license must be a positive integer between ${LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MAX_VALUE}`,

  ADJUSTMENT_DATE_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} adjustment date is required`,
  INVALID_ADJUSTMENT_DATE: 'Adjustment date must be a valid date',

  EMPLOYEES_ADDED_COUNT_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} employees added count is required`,
  INVALID_EMPLOYEES_ADDED_COUNT: `Employees added count must be a positive integer between ${LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MAX_VALUE}`,

  MONTHS_REMAINING_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} months remaining is required`,
  INVALID_MONTHS_REMAINING: `Months remaining must be between ${LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MAX_VALUE}`,

  PRICE_PER_EMPLOYEE_USD_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} price per employee USD is required`,
  INVALID_PRICE_PER_EMPLOYEE_USD: `Price per employee USD must be between ${LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MAX_VALUE}`,

  SUBTOTAL_USD_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} subtotal USD is required`,
  INVALID_SUBTOTAL_USD: `Subtotal USD must be between ${LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MAX_VALUE}`,

  INVALID_TAX_AMOUNT_USD: `Tax amount USD must be between ${LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MAX_VALUE}`,

  TOTAL_AMOUNT_USD_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} total amount USD is required`,
  INVALID_TOTAL_AMOUNT_USD: `Total amount USD must be between ${LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MAX_VALUE}`,

  BILLING_CURRENCY_CODE_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} billing currency code is required`,
  INVALID_BILLING_CURRENCY_CODE:
    'Billing currency code must be a valid 3-letter ISO 4217 currency code (e.g., USD, EUR, XAF)',

  EXCHANGE_RATE_USED_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} exchange rate is required`,
  INVALID_EXCHANGE_RATE_USED: `Exchange rate must be between ${LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MAX_VALUE}`,

  SUBTOTAL_LOCAL_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} local subtotal is required`,
  INVALID_SUBTOTAL_LOCAL: `Local subtotal must be between ${LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_LOCAL.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_LOCAL.MAX_VALUE}`,

  INVALID_TAX_AMOUNT_LOCAL: `Local tax amount must be between ${LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_LOCAL.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_LOCAL.MAX_VALUE}`,

  TOTAL_AMOUNT_LOCAL_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} local total amount is required`,
  INVALID_TOTAL_AMOUNT_LOCAL: `Local total amount must be between ${LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_LOCAL.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_LOCAL.MAX_VALUE}`,

  TAX_RULES_APPLIED_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} tax rules are required`,
  INVALID_TAX_RULES_APPLIED: 'Tax rules must be a valid array with proper rate structures',

  PAYMENT_STATUS_REQUIRED: `${LICENSE_ADJUSTMENT_LABEL} payment status is required`,
  INVALID_PAYMENT_STATUS: `Payment status must be one of: ${Object.values(PAYMENT_STATUS).join(', ')}`,

  INVALID_PAYMENT_DUE_IMMEDIATELY: 'Payment due immediately must be a boolean value',

  INVALID_INVOICE_SENT_AT: 'Invoice sent date must be a valid date',
  INVALID_PAYMENT_COMPLETED_AT: 'Payment completed date must be a valid date',

  GUID_INVALID: 'GUID must be a 6-digit number between 100000 and 999999',
  NOT_FOUND: `${LICENSE_ADJUSTMENT_LABEL} not found`,
  VALIDATION_FAILED: `${LICENSE_ADJUSTMENT_LABEL} requires valid entries`,

  CREATION_FAILED: `Failed to create ${LICENSE_ADJUSTMENT_LABEL}`,
  UPDATE_FAILED: `Failed to update ${LICENSE_ADJUSTMENT_LABEL}`,
  DELETE_FAILED: `Failed to delete ${LICENSE_ADJUSTMENT_LABEL}`,
  EXPORT_FAILED: `Failed to export ${LICENSE_ADJUSTMENT_LABEL}s`,

  DUPLICATE_LICENSE_ADJUSTMENT: `${LICENSE_ADJUSTMENT_LABEL} already exists with this GUID`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',

  // Business logic errors
  AMOUNT_CALCULATION_ERROR:
    'Subtotal calculation error: employees_added_count * months_remaining * price_per_employee_usd must equal subtotal_usd (±0.01)',
  TOTAL_CALCULATION_ERROR:
    'Total calculation error: subtotal_usd + tax_amount_usd must equal total_amount_usd (±0.01)',
  LOCAL_AMOUNTS_INCONSISTENCY:
    'Local amounts inconsistency: USD amounts * exchange_rate must equal local amounts (±0.01)',
  PAYMENT_COMPLETED_BEFORE_ADJUSTMENT: 'Payment completed date must be after adjustment date',
  PAYMENT_COMPLETED_BEFORE_INVOICE: 'Payment completed date must be after invoice sent date',
  GLOBAL_LICENSE_NOT_FOUND: 'Referenced global license does not exist',
  CURRENCY_NOT_SUPPORTED: 'Billing currency is not supported',
  INVALID_TAX_RULE_STRUCTURE: 'Tax rules must contain valid rate objects',
  PAYMENT_ALREADY_COMPLETED: 'Cannot modify a license adjustment with completed payment',
} as const;

export type LicenseAdjustmentError =
  (typeof LICENSE_ADJUSTMENT_ERRORS)[keyof typeof LICENSE_ADJUSTMENT_ERRORS];
export type LicenseAdjustmentCode =
  (typeof LICENSE_ADJUSTMENT_CODES)[keyof typeof LICENSE_ADJUSTMENT_CODES];
export type PaymentStatusType = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
