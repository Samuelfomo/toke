// constants/fraud.detection.log.ts
export enum FraudDetection {
  SUSPICIOUS_LEAVE_PATTERN = 'SUSPICIOUS_LEAVE_PATTERN',
  MASS_DEACTIVATION = 'MASS_DEACTIVATION',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  PRE_RENEWAL_MANIPULATION = 'PRE_RENEWAL_MANIPULATION',
  EXCESSIVE_TECHNICAL_LEAVE = 'EXCESSIVE_TECHNICAL_LEAVE',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const FRAUD_DETECTION_VALIDATION = {
  ID: {
    MIN_VALUE: 1,
  },
  TENANT: {
    MIN_VALUE: 1,
  },
  EMPLOYEE_LICENSES_AFFECTED: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000, // Reasonable limit for array size
    EMPLOYEE_ID_PATTERN: /^[a-zA-Z0-9_]{1,128}$/,
  },
  DETECTION_CRITERIA: {
    MIN_KEYS: 1,
    MAX_JSON_SIZE: 10000, // 10KB limit for JSON
  },
  ACTION_TAKEN: {
    MAX_LENGTH: 2000,
  },
  NOTES: {
    MAX_LENGTH: 5000,
  },
  RESOLVED_BY: {
    MIN_VALUE: 1,
  },
} as const;

export const FRAUD_DETECTION_DEFAULTS = {
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const FRAUD_DETECTION_CODES = {
  FRAUD_LOG_ALREADY_EXISTS: 'fraud_log_already_exists',
  FRAUD_LOG_NOT_FOUND: 'fraud_log_not_found',
  INVALID_ID: 'invalid_id',
  TENANT_INVALID: 'tenant_invalid',
  DETECTION_TYPE_INVALID: 'detection_type_invalid',
  EMPLOYEE_LICENSES_AFFECTED_INVALID: 'employee_licenses_affected_invalid',
  EMPLOYEE_LICENSES_AFFECTED_EMPTY: 'employee_licenses_affected_empty',
  EMPLOYEE_ID_INVALID: 'employee_id_invalid',
  DETECTION_CRITERIA_INVALID: 'detection_criteria_invalid',
  DETECTION_CRITERIA_EMPTY: 'detection_criteria_empty',
  RISK_LEVEL_INVALID: 'risk_level_invalid',
  ACTION_TAKEN_INVALID: 'action_taken_invalid',
  NOTES_INVALID: 'notes_invalid',
  RESOLVED_AT_INVALID: 'resolved_at_invalid',
  RESOLVED_BY_INVALID: 'resolved_by_invalid',
  EMPLOYEE_INVALID: 'employee_invalid',
  RESOLUTION_CONSISTENCY_INVALID: 'resolution_consistency_invalid',
  CREATION_NOT_ALLOWED: 'creation_not_allowed',
  VALIDATION_FAILED: 'validation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  TENANT_REQUIRED: 'tenant_required',
  DETECTION_TYPE_REQUIRED: 'detection_type_required',
  EMPLOYEE_LICENSES_AFFECTED_REQUIRED: 'employee_licenses_affected_required',
  DETECTION_CRITERIA_REQUIRED: 'detection_criteria_required',
  RISK_LEVEL_REQUIRED: 'risk_level_required',
  RESOLVED_AFTER_CREATED_INVALID: 'resolved_after_created_invalid',
} as const;

const FRAUD_DETECTION_LABEL = 'Fraud Detection Log';
export const FRAUD_DETECTION_ERRORS = {
  FRAUD_DETECTION_LOG: FRAUD_DETECTION_LABEL,

  TENANT_REQUIRED: `${FRAUD_DETECTION_LABEL} tenant is required`,
  TENANT_INVALID: 'Tenant must be a positive integer',

  DETECTION_TYPE_REQUIRED: `${FRAUD_DETECTION_LABEL} detection type is required`,
  DETECTION_TYPE_INVALID: `Detection type must be one of: ${Object.values(FraudDetection).join(', ')}`,

  EMPLOYEE_LICENSES_AFFECTED_REQUIRED: `${FRAUD_DETECTION_LABEL} employee licenses affected is required`,
  EMPLOYEE_LICENSES_AFFECTED_INVALID:
    'Employee licenses affected must be a non-empty array of valid employee IDs',
  EMPLOYEE_LICENSES_AFFECTED_EMPTY: 'Employee licenses affected cannot be empty',
  EMPLOYEE_ID_INVALID: `Employee ID must be alphanumeric/underscore, 1-128 characters`,

  DETECTION_CRITERIA_REQUIRED: `${FRAUD_DETECTION_LABEL} detection criteria is required`,
  DETECTION_CRITERIA_INVALID:
    'Detection criteria must be a valid JSON object with at least one key',
  DETECTION_CRITERIA_EMPTY: 'Detection criteria cannot be empty',

  RISK_LEVEL_REQUIRED: `${FRAUD_DETECTION_LABEL} risk level is required`,
  RISK_LEVEL_INVALID: `Risk level must be one of: ${Object.values(RiskLevel).join(', ')}`,

  ACTION_TAKEN_INVALID: `Action taken must not exceed ${FRAUD_DETECTION_VALIDATION.ACTION_TAKEN.MAX_LENGTH} characters`,

  NOTES_INVALID: `Notes must not exceed ${FRAUD_DETECTION_VALIDATION.NOTES.MAX_LENGTH} characters`,

  RESOLVED_AT_INVALID: 'Resolved at must be a valid date',

  RESOLVED_BY_INVALID: 'Resolved by must be a positive integer',

  RESOLUTION_CONSISTENCY_INVALID:
    'Resolution fields must be consistent: both resolved_at and resolved_by must be provided together or both must be null',

  RESOLVED_AFTER_CREATED_INVALID: 'Resolved at date must be after creation date',

  CREATION_NOT_ALLOWED: `${FRAUD_DETECTION_LABEL} creation is managed by PostgreSQL triggers only`,

  INVALID_ID: 'Fraud Detection Log ID must be a positive integer',
  NOT_FOUND: `${FRAUD_DETECTION_LABEL} not found`,
  VALIDATION_FAILED: `${FRAUD_DETECTION_LABEL} requires valid entries`,

  UPDATE_FAILED: `Failed to update ${FRAUD_DETECTION_LABEL}`,
  DELETE_FAILED: `Failed to delete ${FRAUD_DETECTION_LABEL}`,
  EXPORT_FAILED: `Failed to export ${FRAUD_DETECTION_LABEL}s`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  FILTER_INVALID: 'Invalid filter parameters',
} as const;

export type FraudDetectionError =
  (typeof FRAUD_DETECTION_ERRORS)[keyof typeof FRAUD_DETECTION_ERRORS];
export type FraudDetectionCode = (typeof FRAUD_DETECTION_CODES)[keyof typeof FRAUD_DETECTION_CODES];
