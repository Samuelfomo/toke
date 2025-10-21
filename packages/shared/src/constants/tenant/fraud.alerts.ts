// constants/fraud_alerts.ts

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertType {
  LOCATION_ANOMALY = 'location_anomaly',
  TIME_MANIPULATION = 'time_manipulation',
  DUPLICATE_ENTRY = 'duplicate_entry',
  GEOFENCE_VIOLATION = 'geofence_violation',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  DEVICE_ANOMALY = 'device_anomaly',
  VELOCITY_CHECK = 'velocity_check',
  SCHEDULE_VIOLATION = 'schedule_violation',
}

export const FRAUD_ALERTS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  USER: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  TIME_ENTRY: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  ALERT_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    REQUIRED: true,
  },
  ALERT_SEVERITY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    REQUIRED: true,
  },
  ALERT_DESCRIPTION: {
    MIN_LENGTH: 5,
    MAX_LENGTH: Infinity,
    REQUIRED: true,
  },
  INVESTIGATION_NOTES: {
    MIN_LENGTH: 1,
    MAX_LENGTH: Infinity,
  },
} as const;

export const FRAUD_ALERTS_DEFAULTS = {
  ALERT_SEVERITY: AlertSeverity.MEDIUM,
  INVESTIGATED: false,
  FALSE_POSITIVE: false,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const FRAUD_ALERTS_CODES = {
  FRAUD_ALERT_ALREADY_EXISTS: 'fraud_alert_already_exists',
  FRAUD_ALERT_NOT_FOUND: 'fraud_alert_not_found',
  INVALID_GUID: 'invalid_guid',
  USER_REQUIRED: 'user_required',
  USER_INVALID: 'user_invalid',
  USER_NOT_FOUND: 'user_not_found',
  TIME_ENTRY_REQUIRED: 'time_entry_required',
  TIME_ENTRY_INVALID: 'time_entry_invalid',
  TIME_ENTRY_NOT_FOUND: 'time_entry_not_found',
  ALERT_TYPE_REQUIRED: 'alert_type_required',
  ALERT_TYPE_INVALID: 'alert_type_invalid',
  ALERT_SEVERITY_INVALID: 'alert_severity_invalid',
  ALERT_DESCRIPTION_REQUIRED: 'alert_description_required',
  ALERT_DESCRIPTION_INVALID: 'alert_description_invalid',
  ALERT_DATA_INVALID: 'alert_data_invalid',
  INVESTIGATED_INVALID: 'investigated_invalid',
  INVESTIGATION_NOTES_INVALID: 'investigation_notes_invalid',
  INVESTIGATION_NOTES_REQUIRED: 'investigation_notes_required',
  FALSE_POSITIVE_INVALID: 'false_positive_invalid',
  INVESTIGATED_AT_INVALID: 'investigated_at_invalid',
  CANNOT_MODIFY_INVESTIGATED: 'cannot_modify_investigated',
  INVESTIGATION_INCOMPLETE: 'investigation_incomplete',
  ALERT_ALREADY_INVESTIGATED: 'alert_already_investigated',
  DUPLICATE_ALERT_FOR_ENTRY: 'duplicate_alert_for_entry',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
  ALERT_NOT_FOUND: 'alert_not_found',
  RETRIEVAL_FAILED: 'retrieval_failed',
  INVESTIGATOR_NOT_FOUND: 'investigator_not_found',
  INVESTIGATION_FAILED: 'investigation_failed',
  STATISTICS_FAILED: 'statistics_failed',
  ANALYSIS_FAILED: 'analysis_failed',
} as const;

const FRAUD_ALERTS_LABEL = 'Fraud Alert';
export const FRAUD_ALERTS_ERRORS = {
  FRAUD_ALERT: FRAUD_ALERTS_LABEL,

  USER_REQUIRED: `${FRAUD_ALERTS_LABEL} user is required`,
  USER_INVALID: `User ID must be between ${FRAUD_ALERTS_VALIDATION.USER.MIN} and ${FRAUD_ALERTS_VALIDATION.USER.MAX}`,
  USER_NOT_FOUND: 'User not found',

  TIME_ENTRY_REQUIRED: `${FRAUD_ALERTS_LABEL} time entry is required`,
  TIME_ENTRY_INVALID: `Time entry ID must be between ${FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MIN} and ${FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MAX}`,
  TIME_ENTRY_NOT_FOUND: 'Time entry not found',

  ALERT_TYPE_REQUIRED: `${FRAUD_ALERTS_LABEL} type is required`,
  ALERT_TYPE_INVALID: `Alert type must be 1-${FRAUD_ALERTS_VALIDATION.ALERT_TYPE.MAX_LENGTH} characters`,

  ALERT_SEVERITY_INVALID: `Alert severity must be one of: ${Object.values(AlertSeverity).join(', ')}`,

  ALERT_DESCRIPTION_REQUIRED: `${FRAUD_ALERTS_LABEL} description is required`,
  ALERT_DESCRIPTION_INVALID: `Alert description must be at least ${FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MIN_LENGTH} characters`,

  ALERT_DATA_INVALID: 'Alert data must be a valid JSON object',

  INVESTIGATED_INVALID: 'Investigated status must be a boolean value (true or false)',
  INVESTIGATION_NOTES_INVALID: 'Investigation notes must be a valid string',
  INVESTIGATION_NOTES_REQUIRED: 'Investigation notes are required when marking as investigated',

  FALSE_POSITIVE_INVALID: 'False positive status must be a boolean value (true or false)',

  INVESTIGATED_AT_INVALID: 'Investigated date must be a valid date',

  CANNOT_MODIFY_INVESTIGATED: 'Cannot modify investigated fraud alerts',
  INVESTIGATION_INCOMPLETE: 'Investigation notes required before marking as investigated',
  ALERT_ALREADY_INVESTIGATED: 'Fraud alert has already been investigated',
  DUPLICATE_ALERT_FOR_ENTRY: 'Fraud alert already exists for this time entry and alert type',

  GUID_INVALID: `GUID must be 1-${FRAUD_ALERTS_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${FRAUD_ALERTS_LABEL} not found`,
  VALIDATION_FAILED: `${FRAUD_ALERTS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${FRAUD_ALERTS_LABEL}`,
  UPDATE_FAILED: `Failed to update ${FRAUD_ALERTS_LABEL}`,
  DELETE_FAILED: `Failed to delete ${FRAUD_ALERTS_LABEL}`,

  DUPLICATE_ALERT: `${FRAUD_ALERTS_LABEL} already exists`,

  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: 'GUID generation failed',
  ID_REQUIRED: `${FRAUD_ALERTS_LABEL} id required`,
} as const;

export type FraudAlertError = (typeof FRAUD_ALERTS_ERRORS)[keyof typeof FRAUD_ALERTS_ERRORS];
export type FraudAlertCode = (typeof FRAUD_ALERTS_CODES)[keyof typeof FRAUD_ALERTS_CODES];
export type FraudAlertValidation = typeof FRAUD_ALERTS_VALIDATION;
