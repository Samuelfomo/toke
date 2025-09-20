// constants/audit_logs.ts

export enum AuditOperation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum ChangedByType {
  USER = 'user',
  SYSTEM = 'system',
  API = 'api',
  TRIGGER = 'trigger',
  MIGRATION = 'migration',
}

export const AUDIT_LOGS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  TABLE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    REQUIRED: true,
  },
  RECORD: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  RECORD_GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  OPERATION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 10,
    REQUIRED: true,
  },
  CHANGED_BY_USER: {
    MIN: 1,
    MAX: 2147483647,
  },
  CHANGED_BY_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
  },
  CHANGE_REASON: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
} as const;

export const AUDIT_LOGS_DEFAULTS = {
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 1000,
  },
} as const;

export const AUDIT_LOGS_CODES = {
  AUDIT_LOG_NOT_FOUND: 'audit_log_not_found',
  INVALID_GUID: 'invalid_guid',
  TABLE_NAME_REQUIRED: 'table_name_required',
  TABLE_NAME_INVALID: 'table_name_invalid',
  RECORD_REQUIRED: 'record_required',
  RECORD_INVALID: 'record_invalid',
  RECORD_GUID_INVALID: 'record_guid_invalid',
  OPERATION_REQUIRED: 'operation_required',
  OPERATION_INVALID: 'operation_invalid',
  OLD_VALUES_INVALID: 'old_values_invalid',
  NEW_VALUES_INVALID: 'new_values_invalid',
  VALUES_REQUIRED_FOR_OPERATION: 'values_required_for_operation',
  CHANGED_BY_USER_INVALID: 'changed_by_user_invalid',
  CHANGED_BY_TYPE_INVALID: 'changed_by_type_invalid',
  CHANGE_REASON_INVALID: 'change_reason_invalid',
  IP_ADDRESS_INVALID: 'ip_address_invalid',
  USER_AGENT_INVALID: 'user_agent_invalid',
  AUDIT_LOG_IMMUTABLE: 'audit_log_immutable',
  BULK_DELETE_NOT_ALLOWED: 'bulk_delete_not_allowed',
  INVALID_DATE_RANGE: 'invalid_date_range',
  RETENTION_VIOLATION: 'retention_violation',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
} as const;

const AUDIT_LOGS_LABEL = 'Audit Log';
export const AUDIT_LOGS_ERRORS = {
  AUDIT_LOG: AUDIT_LOGS_LABEL,

  TABLE_NAME_REQUIRED: `${AUDIT_LOGS_LABEL} table name is required`,
  TABLE_NAME_INVALID: `Table name must be 1-${AUDIT_LOGS_VALIDATION.TABLE_NAME.MAX_LENGTH} characters`,

  RECORD_REQUIRED: `${AUDIT_LOGS_LABEL} record ID is required`,
  RECORD_INVALID: `Record ID must be between ${AUDIT_LOGS_VALIDATION.RECORD.MIN} and ${AUDIT_LOGS_VALIDATION.RECORD.MAX}`,

  RECORD_GUID_INVALID: `Record GUID must be 1-${AUDIT_LOGS_VALIDATION.RECORD_GUID.MAX_LENGTH} characters`,

  OPERATION_REQUIRED: `${AUDIT_LOGS_LABEL} operation is required`,
  OPERATION_INVALID: `Operation must be one of: ${Object.values(AuditOperation).join(', ')}`,

  OLD_VALUES_INVALID: 'Old values must be a valid JSON object',
  NEW_VALUES_INVALID: 'New values must be a valid JSON object',
  VALUES_REQUIRED_FOR_OPERATION:
    'Old values required for UPDATE/DELETE, new values required for INSERT/UPDATE',

  CHANGED_BY_USER_INVALID: `Changed by user must be between ${AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MIN} and ${AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MAX}`,
  CHANGED_BY_TYPE_INVALID: `Changed by type must be 1-${AUDIT_LOGS_VALIDATION.CHANGED_BY_TYPE.MAX_LENGTH} characters`,

  CHANGE_REASON_INVALID: `Change reason must be 1-${AUDIT_LOGS_VALIDATION.CHANGE_REASON.MAX_LENGTH} characters`,

  IP_ADDRESS_INVALID: 'IP address must be a valid IPv4 or IPv6 address',
  USER_AGENT_INVALID: 'User agent must be a valid string',

  AUDIT_LOG_IMMUTABLE: 'Audit logs cannot be modified once created',
  BULK_DELETE_NOT_ALLOWED: 'Bulk deletion of audit logs is not permitted',
  INVALID_DATE_RANGE: 'Invalid date range for audit log query',
  RETENTION_VIOLATION: 'Audit log retention policy violation',

  GUID_INVALID: `GUID must be 1-${AUDIT_LOGS_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${AUDIT_LOGS_LABEL} not found`,
  VALIDATION_FAILED: `${AUDIT_LOGS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${AUDIT_LOGS_LABEL}`,
  UPDATE_NOT_ALLOWED: `${AUDIT_LOGS_LABEL} cannot be updated`,
  DELETE_NOT_ALLOWED: `${AUDIT_LOGS_LABEL} cannot be deleted`,

  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;

export type AuditLogError = (typeof AUDIT_LOGS_ERRORS)[keyof typeof AUDIT_LOGS_ERRORS];
export type AuditLogCode = (typeof AUDIT_LOGS_CODES)[keyof typeof AUDIT_LOGS_CODES];
export type AuditLogValidation = typeof AUDIT_LOGS_VALIDATION;
