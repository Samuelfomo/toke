// constants/billing.cycle.ts
export enum BillingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

export const BILLING_CYCLE_VALIDATION = {
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
  EMPLOYEE_COUNT: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647, // INTEGER max
  },
  AMOUNT_USD: {
    MIN_VALUE: 0.0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  AMOUNT_LOCAL: {
    MIN_VALUE: 0.0,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  EXCHANGE_RATE: {
    MIN_VALUE: 0.000001,
    MAX_VALUE: 999999.999999,
    DECIMAL_PLACES: 6,
  },
  CURRENCY_CODE: {
    LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
} as const;

export const BILLING_CYCLE_DEFAULTS = {
  BILLING_STATUS: BillingStatus.PENDING as const,
  ADJUSTMENTS_AMOUNT_USD: 0.0,
  ADJUSTMENTS_AMOUNT_LOCAL: 0.0,
  TAX_AMOUNT_USD: 0.0,
  TAX_AMOUNT_LOCAL: 0.0,
  TAX_RULES_APPLIED: [] as {
    rate: number;
    name?: string;
    type?: string;
    amount_usd?: number;
    amount_local?: number;
  }[],
  // TAX_RULES_APPLIED: [],
  EXCHANGE_RATE_USD: 1.0,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const BILLING_CYCLE_CODES = {
  BILLING_CYCLE_ALREADY_EXISTS: 'billing_cycle_already_exists',
  BILLING_CYCLE_NOT_FOUND: 'billing_cycle_not_found',
  INVALID_GUID: 'invalid_guid',
  GLOBAL_LICENSE_INVALID: 'global_license_invalid',
  PERIOD_START_INVALID: 'period_start_invalid',
  PERIOD_END_INVALID: 'period_end_invalid',
  INVALID_DATE_FORMAT: 'invalid_date_format',
  EMPLOYEE_COUNT_INVALID: 'employee_count_invalid',
  AMOUNT_INVALID: 'amount_invalid',
  CURRENCY_CODE_INVALID: 'currency_code_invalid',
  EXCHANGE_RATE_INVALID: 'exchange_rate_invalid',
  BILLING_STATUS_INVALID: 'billing_status_invalid',
  TAX_RULES_INVALID: 'tax_rules_invalid',
  PAYMENT_DUE_DATE_INVALID: 'payment_due_date_invalid',
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
  PERIOD_DATES_REQUIRED: 'period_dates_required',
  DATE_LOGIC_INVALID: 'date_logic_invalid',
  AMOUNT_CALCULATION_ERROR: 'amount_calculation_error',
  CURRENCY_MISMATCH: 'currency_mismatch',
  INVOICE_REQUIRED: 'invoice_required',
  PAYMENT_REQUIRED: 'payment_required',
} as const;

const BILLING_CYCLE_LABEL = 'Billing Cycle';
export const BILLING_CYCLE_ERRORS = {
  BILLING_CYCLE: BILLING_CYCLE_LABEL,

  GLOBAL_LICENSE_REQUIRED: `${BILLING_CYCLE_LABEL} global license is required`,
  GLOBAL_LICENSE_INVALID: 'Global license must be a positive integer',

  PERIOD_START_REQUIRED: `${BILLING_CYCLE_LABEL} period start date is required`,
  PERIOD_START_INVALID: 'Period start date must be a valid date',

  PERIOD_END_REQUIRED: `${BILLING_CYCLE_LABEL} period end date is required`,
  PERIOD_END_INVALID: 'Period end date must be after the start date',

  BASE_EMPLOYEE_COUNT_REQUIRED: `${BILLING_CYCLE_LABEL} base employee count is required`,
  BASE_EMPLOYEE_COUNT_INVALID: `Base employee count must be between ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE}`,

  FINAL_EMPLOYEE_COUNT_REQUIRED: `${BILLING_CYCLE_LABEL} final employee count is required`,
  FINAL_EMPLOYEE_COUNT_INVALID: `Final employee count must be between ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE}`,

  BASE_AMOUNT_USD_REQUIRED: `${BILLING_CYCLE_LABEL} base amount in USD is required`,
  BASE_AMOUNT_USD_INVALID: `Base amount USD must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE}`,

  ADJUSTMENTS_AMOUNT_USD_INVALID: `Adjustments amount USD must be between -${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE}`,

  SUBTOTAL_USD_REQUIRED: `${BILLING_CYCLE_LABEL} subtotal in USD is required`,
  SUBTOTAL_USD_INVALID: `Subtotal USD must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE}`,

  TAX_AMOUNT_USD_INVALID: `Tax amount USD must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE}`,

  TOTAL_AMOUNT_USD_REQUIRED: `${BILLING_CYCLE_LABEL} total amount in USD is required`,
  TOTAL_AMOUNT_USD_INVALID: `Total amount USD must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE}`,

  BILLING_CURRENCY_CODE_REQUIRED: `${BILLING_CYCLE_LABEL} billing currency code is required`,
  BILLING_CURRENCY_CODE_INVALID:
    'Billing currency code must be a valid 3-letter ISO 4217 code (e.g., USD, EUR, XAF)',

  EXCHANGE_RATE_REQUIRED: `${BILLING_CYCLE_LABEL} exchange rate is required`,
  EXCHANGE_RATE_INVALID: `Exchange rate must be between ${BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MAX_VALUE}`,

  BASE_AMOUNT_LOCAL_REQUIRED: `${BILLING_CYCLE_LABEL} base amount in local currency is required`,
  BASE_AMOUNT_LOCAL_INVALID: `Base amount local currency must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`,

  ADJUSTMENTS_AMOUNT_LOCAL_INVALID: `Adjustments amount local currency must be between -${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`,

  SUBTOTAL_LOCAL_REQUIRED: `${BILLING_CYCLE_LABEL} subtotal in local currency is required`,
  SUBTOTAL_LOCAL_INVALID: `Subtotal local currency must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`,

  TAX_AMOUNT_LOCAL_INVALID: `Tax amount local currency must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`,

  TOTAL_AMOUNT_LOCAL_REQUIRED: `${BILLING_CYCLE_LABEL} total amount in local currency is required`,
  TOTAL_AMOUNT_LOCAL_INVALID: `Total amount local currency must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`,

  TAX_RULES_APPLIED_INVALID: 'Tax rules applied must be a valid JSON array',

  BILLING_STATUS_INVALID:
    'Billing status must be one of: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, OVERDUE',

  PAYMENT_DUE_DATE_REQUIRED: `${BILLING_CYCLE_LABEL} payment due date is required`,
  PAYMENT_DUE_DATE_INVALID: 'Payment due date must be after the period end date',

  INVOICE_GENERATED_AT_INVALID: 'Invoice generated date must be a valid date',
  PAYMENT_COMPLETED_AT_INVALID: 'Payment completed date must be a valid date',

  GUID_INVALID: 'GUID must be a 6-digit number between 100000 and 999999',
  NOT_FOUND: `${BILLING_CYCLE_LABEL} not found`,
  VALIDATION_FAILED: `${BILLING_CYCLE_LABEL} requires valid entries`,

  CREATION_FAILED: `Failed to create ${BILLING_CYCLE_LABEL}`,
  UPDATE_FAILED: `Failed to update ${BILLING_CYCLE_LABEL}`,
  DELETE_FAILED: `Failed to delete ${BILLING_CYCLE_LABEL}`,
  EXPORT_FAILED: `Failed to export ${BILLING_CYCLE_LABEL}s`,

  DUPLICATE_BILLING_CYCLE: `${BILLING_CYCLE_LABEL} already exists for this period`,

  PERIOD_DATES_CONFLICT: 'Period end must be after period start',
  PAYMENT_DUE_CONFLICT: 'Payment due date must be after period end',
  AMOUNT_CALCULATION_CONFLICT: 'Total amount must equal subtotal + tax amount',
  CURRENCY_EXCHANGE_CONFLICT: 'Local currency amounts must match USD amounts using exchange rate',

  INVOICE_REQUIRED_FOR_COMPLETED:
    'Invoice generated date is required when billing status is COMPLETED',
  PAYMENT_REQUIRED_FOR_COMPLETED:
    'Payment completed date is required when billing status is COMPLETED',
  OVERDUE_DATE_CONFLICT: 'Billing cycle can only be OVERDUE if payment due date has passed',

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  FUTURE_PERIOD_START: 'Period start cannot be in the future',
} as const;

export type BillingCycleError = (typeof BILLING_CYCLE_ERRORS)[keyof typeof BILLING_CYCLE_ERRORS];
export type BillingCycleCode = (typeof BILLING_CYCLE_CODES)[keyof typeof BILLING_CYCLE_CODES];
