// constants/employee.master.ts
export enum ContractualStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum LeaveType {
  PARENTAL = 'PARENTAL',
  MEDICAL = 'MEDICAL',
  TECHNICAL = 'TECHNICAL',
  SABBATICAL = 'SABBATICAL',
  OTHER = 'OTHER',
}

export enum BillingStatusComputed {
  BILLABLE = 'BILLABLE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  NON_BILLABLE = 'NON_BILLABLE',
  TERMINATED = 'TERMINATED',
}

export const EMPLOYEE_LICENSE_VALIDATION = {
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
  EMPLOYEE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    PATTERN: /^[a-zA-Z0-9_]{1,128}$/,
  },
  EMPLOYEE_CODE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]{1,50}$/,
  },
  LONG_LEAVE_DECLARED_BY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    PATTERN: /^[a-zA-Z0-9_]{1,255}$/,
  },
  LONG_LEAVE_REASON: {
    MAX_LENGTH: 500,
  },
  GRACE_PERIOD: {
    DAYS_AFTER_LAST_ACTIVITY: 7,
  },
} as const;

export const EMPLOYEE_LICENSE_DEFAULTS = {
  CONTRACTUAL_STATUS: ContractualStatus.ACTIVE as const,
  DECLARED_LONG_LEAVE: false,
  BILLING_STATUS_COMPUTED: BillingStatusComputed.BILLABLE as const,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const EMPLOYEE_LICENSE_CODES = {
  EMPLOYEE_LICENSE_ALREADY_EXISTS: 'employee_license_already_exists',
  EMPLOYEE_LICENSE_NOT_FOUND: 'employee_license_not_found',
  INVALID_GUID: 'invalid_guid',
  GLOBAL_LICENSE_INVALID: 'global_license_invalid',
  EMPLOYEE_INVALID: 'employee_invalid',
  EMPLOYEE_CODE_INVALID: 'employee_code_invalid',
  ACTIVATION_DATE_INVALID: 'activation_date_invalid',
  DEACTIVATION_DATE_INVALID: 'deactivation_date_invalid',
  LAST_ACTIVITY_DATE_INVALID: 'last_activity_date_invalid',
  CONTRACTUAL_STATUS_INVALID: 'contractual_status_invalid',
  LONG_LEAVE_DATA_INVALID: 'long_leave_data_invalid',
  LONG_LEAVE_TYPE_INVALID: 'long_leave_type_invalid',
  LONG_LEAVE_REASON_INVALID: 'long_leave_reason_invalid',
  LONG_LEAVE_DECLARED_BY_INVALID: 'long_leave_declared_by_invalid',
  LONG_LEAVE_DECLARED_AT_INVALID: 'long_leave_declared_at_invalid',
  BILLING_STATUS_COMPUTED_READONLY: 'billing_status_computed_readonly',
  GRACE_PERIOD_INVALID: 'grace_period_invalid',
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
  EMPLOYEE_REQUIRED: 'employee_required',
  EMPLOYEE_CODE_REQUIRED: 'employee_code_required',
  ACTIVATION_DATE_REQUIRED: 'activation_date_required',
  DATE_LOGIC_INVALID: 'date_logic_invalid',
  LONG_LEAVE_WITH_RECENT_ACTIVITY: 'long_leave_with_recent_activity',
  LONG_LEAVE_INCOMPLETE_DATA: 'long_leave_incomplete_data',
} as const;

const EMPLOYEE_LICENSE_LABEL = 'Employee License';
export const EMPLOYEE_LICENSE_ERRORS = {
  EMPLOYEE_LICENSE: EMPLOYEE_LICENSE_LABEL,

  GLOBAL_LICENSE_REQUIRED: `${EMPLOYEE_LICENSE_LABEL} global license is required`,
  GLOBAL_LICENSE_INVALID: 'Global master must be a positive integer',

  EMPLOYEE_REQUIRED: `${EMPLOYEE_LICENSE_LABEL} employee ID is required`,
  EMPLOYEE_INVALID: `Employee ID must be alphanumeric/underscore, 1-${EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MAX_LENGTH} characters`,

  EMPLOYEE_CODE_REQUIRED: `${EMPLOYEE_LICENSE_LABEL} employee code is required`,
  EMPLOYEE_CODE_INVALID: `Employee code must be alphanumeric/underscore, 1-${EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH} characters`,

  ACTIVATION_DATE_REQUIRED: `${EMPLOYEE_LICENSE_LABEL} activation date is required`,
  ACTIVATION_DATE_INVALID: 'Activation date must be a valid date',

  DEACTIVATION_DATE_INVALID: 'Deactivation date must be a valid date and after activation date',

  LAST_ACTIVITY_DATE_INVALID: 'Last activity date must be a valid date',

  CONTRACTUAL_STATUS_INVALID: `Contractual status must be one of: ${Object.values(ContractualStatus).join(', ')}`,

  LONG_LEAVE_TYPE_INVALID: `Long leave type must be one of: ${Object.values(LeaveType).join(', ')}`,

  LONG_LEAVE_REASON_INVALID: `Long leave reason must not exceed ${EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_REASON.MAX_LENGTH} characters`,

  LONG_LEAVE_DECLARED_BY_INVALID: `Long leave declared by must be alphanumeric/underscore, 1-${EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MAX_LENGTH} characters`,

  LONG_LEAVE_DECLARED_AT_INVALID: 'Long leave declared at must be a valid date',

  BILLING_STATUS_COMPUTED_READONLY:
    'Computed billing status is read-only and managed by PostgreSQL',

  GRACE_PERIOD_INVALID: 'Grace period dates must be valid',

  GUID_INVALID: 'GUID must be a 6-digit number between 100000 and 999999',
  NOT_FOUND: `${EMPLOYEE_LICENSE_LABEL} not found`,
  VALIDATION_FAILED: `${EMPLOYEE_LICENSE_LABEL} requires valid entries`,

  CREATION_FAILED: `Failed to create ${EMPLOYEE_LICENSE_LABEL}`,
  UPDATE_FAILED: `Failed to update ${EMPLOYEE_LICENSE_LABEL}`,
  DELETE_FAILED: `Failed to delete ${EMPLOYEE_LICENSE_LABEL}`,
  EXPORT_FAILED: `Failed to export ${EMPLOYEE_LICENSE_LABEL}s`,

  DUPLICATE_LICENSE: `${EMPLOYEE_LICENSE_LABEL} already exists for this employee and global license`,

  DEACTIVATION_BEFORE_ACTIVATION: 'Deactivation date must be after activation date',
  LONG_LEAVE_WITH_RECENT_ACTIVITY: `Cannot declare long leave with recent activity (within ${EMPLOYEE_LICENSE_VALIDATION.GRACE_PERIOD.DAYS_AFTER_LAST_ACTIVITY} days)`,
  LONG_LEAVE_INCOMPLETE_DATA:
    'Long leave requires declared_by and declared_at fields when declared_long_leave is true',

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  FUTURE_ACTIVATION_DATE: 'Activation date cannot be in the future',
} as const;

export type EmployeeLicenseError =
  (typeof EMPLOYEE_LICENSE_ERRORS)[keyof typeof EMPLOYEE_LICENSE_ERRORS];
export type EmployeeLicenseCode =
  (typeof EMPLOYEE_LICENSE_CODES)[keyof typeof EMPLOYEE_LICENSE_CODES];
