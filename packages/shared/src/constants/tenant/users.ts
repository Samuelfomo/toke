// constants/users.ts

export const USERS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  TENANT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
  EMAIL: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  FIRST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    REQUIRED: true,
  },
  LAST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    REQUIRED: true,
  },
  PHONE_NUMBER: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 20,
  },
  EMPLOYEE_CODE: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_\-]{5,20}$/,
  },
  PIN: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 6,
    PATTERN: /^\d{4,6}$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 255,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,255}$/,
  },
  OTP_TOKEN: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 10,
    // EXPIRATION_MINUTES: 15,
  },
  QR_CODE_TOKEN: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    // EXPIRATION_HOURS: 24,
  },
  AVATAR_URL: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
    PATTERN: /^https?:\/\/.+$/,
  },
  DEPARTMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  JOB_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
} as const;

export const USERS_DEFAULTS = {
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
  OTP_EXPIRATION_MINUTES: 15,
  QR_CODE_EXPIRATION_HOURS: 24,
  PIN_HASH_SALT_ROUNDS: 12,
  PASSWORD_HASH_SALT_ROUNDS: 12,
} as const;

export const USERS_CODES = {
  USER_ALREADY_EXISTS: 'user_already_exists',
  USER_NOT_FOUND: 'user_not_found',
  INVALID_GUID: 'invalid_guid',
  TENANT_REQUIRED: 'tenant_required',
  TENANT_INVALID: 'tenant_invalid',
  EMAIL_INVALID: 'email_invalid',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  FIRST_NAME_REQUIRED: 'first_name_required',
  FIRST_NAME_INVALID: 'first_name_invalid',
  LAST_NAME_REQUIRED: 'last_name_required',
  LAST_NAME_INVALID: 'last_name_invalid',
  PHONE_NUMBER_INVALID: 'phone_number_invalid',
  PHONE_NUMBER_ALREADY_EXISTS: 'phone_number_already_exists',
  EMPLOYEE_CODE_INVALID: 'employee_code_invalid',
  EMPLOYEE_CODE_ALREADY_EXISTS: 'employee_code_already_exists',
  PIN_INVALID: 'pin_invalid',
  PASSWORD_INVALID: 'password_invalid',
  PASSWORD_TOO_WEAK: 'password_too_weak',
  OTP_TOKEN_INVALID: 'otp_token_invalid',
  OTP_TOKEN_EXPIRED: 'otp_token_expired',
  QR_CODE_TOKEN_INVALID: 'qr_code_token_invalid',
  QR_CODE_TOKEN_EXPIRED: 'qr_code_token_expired',
  QR_CODE_TOKEN_ALREADY_EXISTS: 'qr_code_token_already_exists',
  AVATAR_URL_INVALID: 'avatar_url_invalid',
  HIRE_DATE_INVALID: 'hire_date_invalid',
  DEPARTMENT_INVALID: 'department_invalid',
  JOB_TITLE_INVALID: 'job_title_invalid',
  ACTIVE_STATUS_INVALID: 'active_status_invalid',
  LAST_LOGIN_DATE_INVALID: 'last_login_date_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  AUTHENTICATION_FAILED: 'authentication_failed',
  AUTHORIZATION_FAILED: 'authorization_failed',
  ACCOUNT_INACTIVE: 'account_inactive',
  ACCOUNT_SUSPENDED: 'account_suspended',
} as const;

const USERS_LABEL = 'User';
export const USERS_ERRORS = {
  USER: USERS_LABEL,

  TENANT_REQUIRED: `${USERS_LABEL} tenant is required`,
  TENANT_INVALID: `Tenant must be 1-${USERS_VALIDATION.TENANT.MAX_LENGTH} characters`,

  EMAIL_INVALID: `Email must be valid and between ${USERS_VALIDATION.EMAIL.MIN_LENGTH}-${USERS_VALIDATION.EMAIL.MAX_LENGTH} characters`,
  EMAIL_ALREADY_EXISTS: 'Email address is already registered',

  FIRST_NAME_REQUIRED: `${USERS_LABEL} first name is required`,
  FIRST_NAME_INVALID: `First name must be 1-${USERS_VALIDATION.FIRST_NAME.MAX_LENGTH} characters`,

  LAST_NAME_REQUIRED: `${USERS_LABEL} last name is required`,
  LAST_NAME_INVALID: `Last name must be 1-${USERS_VALIDATION.LAST_NAME.MAX_LENGTH} characters`,

  PHONE_NUMBER_INVALID: `Phone number must be valid and between ${USERS_VALIDATION.PHONE_NUMBER.MIN_LENGTH}-${USERS_VALIDATION.PHONE_NUMBER.MAX_LENGTH} characters`,
  PHONE_NUMBER_ALREADY_EXISTS: 'Phone number is already registered',

  EMPLOYEE_CODE_INVALID: `Employee code must be alphanumeric/underscore/dash, ${USERS_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH}-${USERS_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH} characters`,
  EMPLOYEE_CODE_ALREADY_EXISTS: 'Employee code is already in use',

  PIN_INVALID: `PIN must be ${USERS_VALIDATION.PIN.MIN_LENGTH} to ${USERS_VALIDATION.PIN.MAX_LENGTH} digits`,

  PASSWORD_INVALID: `Password must be ${USERS_VALIDATION.PASSWORD.MIN_LENGTH}-${USERS_VALIDATION.PASSWORD.MAX_LENGTH} characters`,
  PASSWORD_TOO_WEAK:
    'Password must contain at least one uppercase, one lowercase, one digit, and one special character (@$!%*?&)',

  OTP_TOKEN_INVALID: `OTP token must be 1-${USERS_VALIDATION.OTP_TOKEN.MAX_LENGTH} characters`,
  OTP_TOKEN_EXPIRED: 'OTP token has expired',

  QR_CODE_TOKEN_INVALID: `QR code token must be 1-${USERS_VALIDATION.QR_CODE_TOKEN.MAX_LENGTH} characters`,
  QR_CODE_TOKEN_EXPIRED: 'QR code token has expired',
  QR_CODE_TOKEN_ALREADY_EXISTS: 'QR code token already exists',

  AVATAR_URL_INVALID: `Avatar URL must be valid and not exceed ${USERS_VALIDATION.AVATAR_URL.MAX_LENGTH} characters`,

  HIRE_DATE_INVALID: 'Hire date must be a valid date',

  DEPARTMENT_INVALID: `Department must be 1-${USERS_VALIDATION.DEPARTMENT.MAX_LENGTH} characters`,

  JOB_TITLE_INVALID: `Job title must be 1-${USERS_VALIDATION.JOB_TITLE.MAX_LENGTH} characters`,

  ACTIVE_STATUS_INVALID: 'Active status must be a boolean value (true or false)',

  LAST_LOGIN_DATE_INVALID: 'Last login date must be a valid date',

  GUID_INVALID: 'GUID must be a valid UUID format',
  NOT_FOUND: `${USERS_LABEL} not found`,
  VALIDATION_FAILED: `${USERS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${USERS_LABEL}`,
  UPDATE_FAILED: `Failed to update ${USERS_LABEL}`,
  DELETE_FAILED: `Failed to delete ${USERS_LABEL}`,

  DUPLICATE_USER: `${USERS_LABEL} already exists`,

  AUTHENTICATION_FAILED: 'Invalid credentials provided',
  AUTHORIZATION_FAILED: 'Insufficient permissions to perform this action',
  ACCOUNT_INACTIVE: 'User account is inactive',
  ACCOUNT_SUSPENDED: 'User account is suspended',

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  HIRE_DATE_FUTURE: 'Hire date cannot be in the future',
} as const;

export type UserError = (typeof USERS_ERRORS)[keyof typeof USERS_ERRORS];
export type UserCode = (typeof USERS_CODES)[keyof typeof USERS_CODES];
export type UserValidation = typeof USERS_VALIDATION;
