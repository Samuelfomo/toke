// constants/global-license.ts
export enum Type {
  CLOUD_FLEX = 'CLOUD_FLEX',
}

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
}

export const BILLING_CYCLES = [1, 3, 6, 12] as const;

export const GLOBAL_LICENSE_VALIDATION = {
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
  BASE_PRICE_USD: {
    MIN_VALUE: 0.01,
    MAX_VALUE: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
  MINIMUM_SEATS: {
    MIN_VALUE: 1,
    MAX_VALUE: 65535,
    DEFAULT: 5,
  },
  TOTAL_SEATS: {
    MIN_VALUE: 0,
    MAX_VALUE: 2147483647, // INTEGER max
  },
  BILLING_CYCLES: BILLING_CYCLES,
} as const;

export const GLOBAL_LICENSE_DEFAULTS = {
  LICENSE_TYPE: Type.CLOUD_FLEX as const,
  BASE_PRICE_USD: 3.0,
  MINIMUM_SEATS: 5,
  TOTAL_SEATS_PURCHASED: 0,
  LICENSE_STATUS: LicenseStatus.ACTIVE as const,
  // BILLING_CYCLE_MONTHS: 12,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const GLOBAL_LICENSE_CODES = {
  GLOBAL_LICENSE_ALREADY_EXISTS: 'global_license_already_exists',
  GLOBAL_LICENSE_NOT_FOUND: 'global_license_not_found',
  INVALID_GUID: 'invalid_guid',
  TENANT_INVALID: 'tenant_invalid',
  LICENSE_TYPE_INVALID: 'license_type_invalid',
  BILLING_CYCLE_INVALID: 'billing_cycle_invalid',
  BASE_PRICE_INVALID: 'base_price_invalid',
  MINIMUM_SEATS_INVALID: 'minimum_seats_invalid',
  CURRENT_PERIOD_START_INVALID: 'current_period_start_invalid',
  CURRENT_PERIOD_END_INVALID: 'current_period_end_invalid',
  NEXT_RENEWAL_DATE_INVALID: 'next_renewal_date_invalid',
  TOTAL_SEATS_INVALID: 'total_seats_invalid',
  LICENSE_STATUS_INVALID: 'license_status_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  TENANT_REQUIRED: 'tenant_required',
  LICENSE_TYPE_REQUIRED: 'license_type_required',
  BILLING_CYCLE_REQUIRED: 'billing_cycle_required',
  PERIOD_DATES_REQUIRED: 'period_dates_required',
  DATE_LOGIC_INVALID: 'date_logic_invalid',
  EXPIRED_LICENSE: 'expired_license',
  SUSPENDED_LICENSE: 'suspended_license',
  INSUFFICIENT_SEATS: 'insufficient_seats',
} as const;

const GLOBAL_LICENSE_LABEL = 'Global License';
export const GLOBAL_LICENSE_ERRORS = {
  GLOBAL_LICENSE: GLOBAL_LICENSE_LABEL,

  TENANT_REQUIRED: `${GLOBAL_LICENSE_LABEL} tenant is required`,
  TENANT_INVALID: 'Tenant must be a positive integer',

  LICENSE_TYPE_REQUIRED: `${GLOBAL_LICENSE_LABEL} type is required`,
  LICENSE_TYPE_INVALID: 'License type must be a valid type (CLOUD_FLEX)',

  BILLING_CYCLE_REQUIRED: `${GLOBAL_LICENSE_LABEL} billing cycle is required`,
  BILLING_CYCLE_INVALID: `Billing cycle must be one of: ${GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.join(', ')} months`,

  BASE_PRICE_REQUIRED: `${GLOBAL_LICENSE_LABEL} base price is required`,
  BASE_PRICE_INVALID: `Base price must be between ${GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MIN_VALUE} and ${GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MAX_VALUE} USD`,

  MINIMUM_SEATS_INVALID: `Minimum seats must be between ${GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MIN_VALUE} and ${GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MAX_VALUE}`,

  CURRENT_PERIOD_START_REQUIRED: `${GLOBAL_LICENSE_LABEL} current period start date is required`,
  CURRENT_PERIOD_START_INVALID: 'Current period start date must be a valid date not in the future',

  CURRENT_PERIOD_END_REQUIRED: `${GLOBAL_LICENSE_LABEL} current period end date is required`,
  CURRENT_PERIOD_END_INVALID: 'Current period end date must be after the start date',

  NEXT_RENEWAL_DATE_REQUIRED: `${GLOBAL_LICENSE_LABEL} next renewal date is required`,
  NEXT_RENEWAL_DATE_INVALID: 'Next renewal date must be on or after the current period end date',

  TOTAL_SEATS_INVALID: `Total seats purchased must be a non-negative integer not exceeding ${GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MAX_VALUE}`,

  LICENSE_STATUS_INVALID:
    'License status must be one of: ACTIVE, EXPIRED, SUSPENDED, PENDING_PAYMENT',

  GUID_INVALID: 'GUID must be a 6-digit number between 100000 and 999999',
  NOT_FOUND: `${GLOBAL_LICENSE_LABEL} not found`,
  VALIDATION_FAILED: `${GLOBAL_LICENSE_LABEL} requires valid entries`,

  CREATION_FAILED: `Failed to create ${GLOBAL_LICENSE_LABEL}`,
  UPDATE_FAILED: `Failed to update ${GLOBAL_LICENSE_LABEL}`,
  DELETE_FAILED: `Failed to delete ${GLOBAL_LICENSE_LABEL}`,
  EXPORT_FAILED: `Failed to export ${GLOBAL_LICENSE_LABEL}s`,

  DUPLICATE_LICENSE: `${GLOBAL_LICENSE_LABEL} already exists for this tenant`,

  PERIOD_DATES_CONFLICT: 'Current period end must be after current period start',
  RENEWAL_DATE_CONFLICT: 'Next renewal date must be on or after current period end',
  MINIMUM_SEATS_NOT_MET: 'Total seats purchased is below the minimum required seats',

  EXPIRED_LICENSE: `${GLOBAL_LICENSE_LABEL} has expired`,
  SUSPENDED_LICENSE: `${GLOBAL_LICENSE_LABEL} is suspended`,
  PENDING_PAYMENT_LICENSE: `${GLOBAL_LICENSE_LABEL} has pending payment`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  FUTURE_START_DATE: 'Start date cannot be in the future',
} as const;

export type GlobalLicenseError = (typeof GLOBAL_LICENSE_ERRORS)[keyof typeof GLOBAL_LICENSE_ERRORS];
export type GlobalLicenseCode = (typeof GLOBAL_LICENSE_CODES)[keyof typeof GLOBAL_LICENSE_CODES];
// export type BillingCycle = (typeof GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES)[number];
export type BillingCycle = (typeof BILLING_CYCLES)[number];
