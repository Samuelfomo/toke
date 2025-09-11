// constants/payment.transaction.ts

export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export const PAYMENT_TRANSACTION_VALIDATION = {
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
  BILLING_CYCLE: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647,
  },
  ADJUSTMENT: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647,
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
  CURRENCY_CODE: {
    LENGTH: 3,
    PATTERN: /^[A-Z]{3}$/,
  },
  EXCHANGE_RATE: {
    MIN_VALUE: 0.0,
    MAX_VALUE: 999999.999999,
    DECIMAL_PLACES: 6,
  },
  PAYMENT_METHOD: {
    MIN_VALUE: 1,
    MAX_VALUE: 2147483647,
  },
  PAYMENT_REFERENCE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  FAILURE_REASON: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  AMOUNT_CONSISTENCY_TOLERANCE: 0.01,
} as const;

export const PAYMENT_TRANSACTION_DEFAULTS = {
  TRANSACTION_STATUS: 'PENDING',
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const PAYMENT_TRANSACTION_CODES = {
  PAYMENT_TRANSACTION_ALREADY_EXISTS: 'payment_transaction_already_exists',
  PAYMENT_TRANSACTION_NOT_FOUND: 'payment_transaction_not_found',
  INVALID_GUID: 'invalid_guid',
  BILLING_CYCLE_INVALID: 'billing_cycle_invalid',
  BILLING_CYCLE_NOT_FOUND: 'billing_cycle_not_found',
  ADJUSTMENT_INVALID: 'adjustment_invalid',
  ADJUSTMENT_NOT_FOUND: 'adjustment_not_found',
  AMOUNT_USD_INVALID: 'amount_usd_invalid',
  AMOUNT_LOCAL_INVALID: 'amount_local_invalid',
  AMOUNT_CONSISTENCY_INVALID: 'amount_consistency_invalid',
  CURRENCY_CODE_INVALID: 'currency_code_invalid',
  CURRENCY_NOT_FOUND: 'currency_not_found',
  EXCHANGE_RATE_INVALID: 'exchange_rate_invalid',
  PAYMENT_METHOD_INVALID: 'payment_method_invalid',
  PAYMENT_METHOD_NOT_FOUND: 'payment_method_not_found',
  PAYMENT_REFERENCE_INVALID: 'payment_reference_invalid',
  PAYMENT_REFERENCE_DUPLICATE: 'payment_reference_duplicate',
  TRANSACTION_STATUS_INVALID: 'transaction_status_invalid',
  INVALID_STATUS_TRANSITION: 'invalid_status_transition',
  INITIATED_AT_INVALID: 'initiated_at_invalid',
  COMPLETED_AT_INVALID: 'completed_at_invalid',
  FAILED_AT_INVALID: 'failed_at_invalid',
  FAILURE_REASON_INVALID: 'failure_reason_invalid',
  FAILURE_REASON_REQUIRED: 'failure_reason_required',
  DATE_SEQUENCE_INVALID: 'date_sequence_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  BILLING_CYCLE_REQUIRED: 'billing_cycle_required',
  ADJUSTMENT_REQUIRED: 'adjustment_required',
  AMOUNT_USD_REQUIRED: 'amount_usd_required',
  AMOUNT_LOCAL_REQUIRED: 'amount_local_required',
  CURRENCY_CODE_REQUIRED: 'currency_code_required',
  EXCHANGE_RATE_REQUIRED: 'exchange_rate_required',
  PAYMENT_METHOD_REQUIRED: 'payment_method_required',
  PAYMENT_REFERENCE_REQUIRED: 'payment_reference_required',
  TRANSACTION_STATUS_REQUIRED: 'transaction_status_required',
  INITIATED_AT_REQUIRED: 'initiated_at_required',
} as const;

const PAYMENT_TRANSACTION_LABEL = 'Payment Transaction';
export const PAYMENT_TRANSACTION_ERRORS = {
  PAYMENT_TRANSACTION: PAYMENT_TRANSACTION_LABEL,

  BILLING_CYCLE_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} billing cycle is required`,
  BILLING_CYCLE_INVALID: `Billing cycle must be a positive integer between ${PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MIN_VALUE} and ${PAYMENT_TRANSACTION_VALIDATION.BILLING_CYCLE.MAX_VALUE}`,
  BILLING_CYCLE_NOT_FOUND: 'Referenced billing cycle does not exist',

  ADJUSTMENT_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} adjustment is required`,
  ADJUSTMENT_INVALID: `Adjustment must be a positive integer between ${PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MIN_VALUE} and ${PAYMENT_TRANSACTION_VALIDATION.ADJUSTMENT.MAX_VALUE}`,
  ADJUSTMENT_NOT_FOUND: 'Referenced adjustment does not exist',

  AMOUNT_USD_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} amount in USD is required`,
  AMOUNT_USD_INVALID: `Amount USD must be between ${PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${PAYMENT_TRANSACTION_VALIDATION.AMOUNT_USD.MAX_VALUE}`,

  AMOUNT_LOCAL_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} amount in local currency is required`,
  AMOUNT_LOCAL_INVALID: `Amount local must be between ${PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MIN_VALUE} and ${PAYMENT_TRANSACTION_VALIDATION.AMOUNT_LOCAL.MAX_VALUE}`,

  AMOUNT_CONSISTENCY_INVALID: `Amount consistency error: amount_usd * exchange_rate_used must equal amount_local (tolerance: ±${PAYMENT_TRANSACTION_VALIDATION.AMOUNT_CONSISTENCY_TOLERANCE})`,

  CURRENCY_CODE_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} currency code is required`,
  CURRENCY_CODE_INVALID:
    'Currency code must be a valid 3-letter ISO 4217 code (e.g., USD, EUR, XAF)',
  CURRENCY_NOT_FOUND: 'Referenced currency does not exist',

  EXCHANGE_RATE_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} exchange rate is required`,
  EXCHANGE_RATE_INVALID: `Exchange rate must be between ${PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MIN_VALUE} and ${PAYMENT_TRANSACTION_VALIDATION.EXCHANGE_RATE.MAX_VALUE}`,

  PAYMENT_METHOD_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} payment method is required`,
  PAYMENT_METHOD_INVALID: `Payment method must be a positive integer between ${PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MIN_VALUE} and ${PAYMENT_TRANSACTION_VALIDATION.PAYMENT_METHOD.MAX_VALUE}`,
  PAYMENT_METHOD_NOT_FOUND: 'Referenced payment method does not exist',

  PAYMENT_REFERENCE_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} payment reference is required`,
  PAYMENT_REFERENCE_INVALID: `Payment reference must be between ${PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MIN_LENGTH} and ${PAYMENT_TRANSACTION_VALIDATION.PAYMENT_REFERENCE.MAX_LENGTH} characters`,
  PAYMENT_REFERENCE_DUPLICATE: `${PAYMENT_TRANSACTION_LABEL} with this payment reference already exists`,

  TRANSACTION_STATUS_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} status is required`,
  TRANSACTION_STATUS_INVALID:
    'Transaction status must be one of: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED',
  INVALID_STATUS_TRANSITION: 'Invalid status transition for this transaction',

  INITIATED_AT_REQUIRED: `${PAYMENT_TRANSACTION_LABEL} initiation date is required`,
  INITIATED_AT_INVALID: 'Invalid initiation date format',

  COMPLETED_AT_INVALID: 'Invalid completion date format',
  FAILED_AT_INVALID: 'Invalid failure date format',

  FAILURE_REASON_REQUIRED: 'Failure reason is required when transaction status is FAILED',
  FAILURE_REASON_INVALID: `Failure reason must be between ${PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MIN_LENGTH} and ${PAYMENT_TRANSACTION_VALIDATION.FAILURE_REASON.MAX_LENGTH} characters`,

  DATE_SEQUENCE_INVALID: 'Completion or failure date must be after initiation date',

  GUID_INVALID: 'GUID must be a 6-digit number between 100000 and 999999',
  NOT_FOUND: `${PAYMENT_TRANSACTION_LABEL} not found`,
  VALIDATION_FAILED: `${PAYMENT_TRANSACTION_LABEL} requires valid entries`,

  CREATION_FAILED: `Failed to create ${PAYMENT_TRANSACTION_LABEL}`,
  UPDATE_FAILED: `Failed to update ${PAYMENT_TRANSACTION_LABEL}`,
  DELETE_FAILED: `Failed to delete ${PAYMENT_TRANSACTION_LABEL}`,
  EXPORT_FAILED: `Failed to export ${PAYMENT_TRANSACTION_LABEL}s`,

  DUPLICATE_PAYMENT_TRANSACTION: `${PAYMENT_TRANSACTION_LABEL} already exists with this payment reference`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',

  // Business logic errors
  CANNOT_PROCESS_COMPLETED: 'Cannot process an already completed transaction',
  CANNOT_CANCEL_COMPLETED: 'Cannot cancel a completed transaction',
  CANNOT_REFUND_NON_COMPLETED: 'Can only refund completed transactions',
  TRANSACTION_ALREADY_FINAL: 'Transaction is in a final state and cannot be modified',
  PAYMENT_METHOD_NOT_ACTIVE: 'Payment method is not active',
  AMOUNT_BELOW_PAYMENT_METHOD_LIMIT: 'Amount is below payment method minimum limit',
  AMOUNT_ABOVE_PAYMENT_METHOD_LIMIT: 'Amount exceeds payment method maximum limit',
  CURRENCY_NOT_SUPPORTED_BY_PAYMENT_METHOD: 'Currency not supported by the selected payment method',
  INCONSISTENT_BILLING_CYCLE: 'Transaction billing cycle does not match adjustment billing cycle',
  PROCESSING_TIMEOUT: 'Transaction processing has timed out',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction',
  EXTERNAL_PROVIDER_ERROR: 'Error from external payment provider',
} as const;

export const PAYMENT_TRANSACTION_STATUS_TRANSITIONS: Record<
  PaymentTransactionStatus,
  readonly PaymentTransactionStatus[]
> = {
  [PaymentTransactionStatus.PENDING]: [
    PaymentTransactionStatus.PROCESSING,
    PaymentTransactionStatus.CANCELLED,
    PaymentTransactionStatus.FAILED,
  ],
  [PaymentTransactionStatus.PROCESSING]: [
    PaymentTransactionStatus.COMPLETED,
    PaymentTransactionStatus.FAILED,
    PaymentTransactionStatus.CANCELLED,
  ],
  [PaymentTransactionStatus.COMPLETED]: [PaymentTransactionStatus.REFUNDED],
  [PaymentTransactionStatus.FAILED]: [],
  [PaymentTransactionStatus.CANCELLED]: [],
  [PaymentTransactionStatus.REFUNDED]: [],
};

// Transaction status categories
export const PAYMENT_TRANSACTION_STATUS_CATEGORIES = {
  ACTIVE: ['PENDING', 'PROCESSING'],
  FINAL: ['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'],
  SUCCESS: ['COMPLETED'],
  FAILURE: ['FAILED', 'CANCELLED'],
  REVERSIBLE: ['COMPLETED'], // Can be refunded
} as const;

export type PaymentTransactionError =
  (typeof PAYMENT_TRANSACTION_ERRORS)[keyof typeof PAYMENT_TRANSACTION_ERRORS];
export type PaymentTransactionCode =
  (typeof PAYMENT_TRANSACTION_CODES)[keyof typeof PAYMENT_TRANSACTION_CODES];
export type PaymentTransactionStatusTransitions = typeof PAYMENT_TRANSACTION_STATUS_TRANSITIONS;
