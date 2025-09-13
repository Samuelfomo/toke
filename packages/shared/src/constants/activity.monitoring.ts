// constants/activity.monitoring.ts
export enum ActivityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPICIOUS = 'SUSPICIOUS',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const ACTIVITY_MONITORING_VALIDATION = {
  EMPLOYEE_LICENSE: {
    MIN_VALUE: 1,
  },
  PUNCH_COUNT: {
    MIN_VALUE: 0,
    MAX_VALUE: 999,
  },
  CONSECUTIVE_ABSENT_DAYS: {
    MIN_VALUE: 0,
    MAX_VALUE: 9999,
  },
  DATE: {
    MIN_DATE: new Date('2020-01-01'),
    MAX_DATE: new Date('2099-12-31'),
  },
  THRESHOLDS: {
    LOW_ACTIVITY_MAX_PUNCH_COUNT: 2,
    LONG_ABSENCE_MIN_DAYS: 7,
    SUSPICIOUS_ABSENCE_MIN_DAYS: 3,
    CRITICAL_ABSENCE_MIN_DAYS: 30,
    ACTIVE_MIN_PUNCH_COUNT_7_DAYS: 1,
    HIGHLY_ACTIVE_MIN_PUNCH_COUNT_7_DAYS: 5,
  },
} as const;

export const ACTIVITY_MONITORING_DEFAULTS = {
  STATUS: ActivityStatus.INACTIVE,
  PUNCH_COUNT_7_DAYS: 0,
  PUNCH_COUNT_30_DAYS: 0,
  CONSECUTIVE_ABSENT_DAYS: 0,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
  RISK_LEVEL: RiskLevel.LOW,
} as const;

export const ACTIVITY_MONITORING_CODES = {
  ACTIVITY_MONITORING_NOT_FOUND: 'activity_monitoring_not_found',
  INVALID_ID: 'invalid_id',
  INVALID_EMPLOYEE_LICENSE: 'invalid_employee_license',
  INVALID_DATE: 'invalid_date',
  INVALID_STATUS: 'invalid_status',
  INVALID_PUNCH_COUNT: 'invalid_punch_count',
  INVALID_ABSENT_DAYS: 'invalid_absent_days',
  INVALID_FILTERS: 'invalid_filters',
  PAGINATION_INVALID: 'pagination_invalid',
  DATE_RANGE_INVALID: 'date_range_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  STATISTICS_FAILED: 'statistics_failed',
  EMPLOYEE_LICENSE_REQUIRED: 'employee_license_required',
  MONITORING_DATE_REQUIRED: 'monitoring_date_required',
  STATUS_REQUIRED: 'status_required',
  READONLY_FIELD_MODIFICATION: 'readonly_field_modification',
  ARCHITECTURE_VIOLATION: 'architecture_violation',
} as const;

const ACTIVITY_MONITORING_LABEL = 'Activity Monitoring';

export const ACTIVITY_MONITORING_ERRORS = {
  ACTIVITY_MONITORING: ACTIVITY_MONITORING_LABEL,

  NOT_FOUND: `${ACTIVITY_MONITORING_LABEL} record not found`,

  INVALID_ID: 'Activity monitoring ID must be a positive integer',

  EMPLOYEE_LICENSE_REQUIRED: 'Employee license ID is required',
  INVALID_EMPLOYEE_LICENSE: 'Employee license must be a positive integer',

  MONITORING_DATE_REQUIRED: 'Monitoring date is required',
  INVALID_DATE: 'Date must be a valid date in YYYY-MM-DD format',
  DATE_RANGE_INVALID: 'Start date must be before or equal to end date',

  STATUS_REQUIRED: 'Activity status is required',
  INVALID_STATUS: `Activity status must be one of: ${Object.values(ActivityStatus).join(', ')}`,

  INVALID_PUNCH_COUNT: `Punch count must be between ${ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MIN_VALUE} and ${ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE}`,

  INVALID_ABSENT_DAYS: `Consecutive absent days must be between ${ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MIN_VALUE} and ${ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MAX_VALUE}`,

  PUNCH_COUNT_LOGIC_ERROR: 'Punch count for 7 days cannot exceed punch count for 30 days',

  VALIDATION_FAILED: `${ACTIVITY_MONITORING_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${ACTIVITY_MONITORING_LABEL}`,
  UPDATE_FAILED: `Failed to update ${ACTIVITY_MONITORING_LABEL}`,
  DELETE_FAILED: `Failed to delete ${ACTIVITY_MONITORING_LABEL}`,
  EXPORT_FAILED: `Failed to export ${ACTIVITY_MONITORING_LABEL} data`,
  SEARCH_FAILED: `Failed to search ${ACTIVITY_MONITORING_LABEL} records`,
  LISTING_FAILED: `Failed to list ${ACTIVITY_MONITORING_LABEL} records`,
  STATISTICS_FAILED: `Failed to generate ${ACTIVITY_MONITORING_LABEL} statistics`,

  PAGINATION_INVALID:
    'Invalid pagination parameters - offset and limit must be non-negative integers',

  READONLY_FIELD_MODIFICATION: 'Cannot modify read-only computed fields',

  ARCHITECTURE_VIOLATION:
    'Activity monitoring records are managed automatically by PostgreSQL triggers',

  INVALID_FILTERS: 'Invalid filter parameters provided',

  FUTURE_DATE_NOT_ALLOWED: 'Monitoring date cannot be in the future',

  INVALID_DATE_FORMAT: 'Invalid date format - use YYYY-MM-DD',

  MAX_PUNCH_COUNT_INVALID: 'Maximum punch count must be a non-negative integer',

  MIN_ABSENT_DAYS_INVALID: 'Minimum absent days must be a non-negative integer',

  RISK_LEVEL_INVALID: `Risk level must be one of: ${Object.values(RiskLevel).join(', ')}`,
} as const;

export const ACTIVITY_MONITORING_RISK_THRESHOLDS = {
  [RiskLevel.LOW]: {
    max_absent_days: 2,
    min_punch_count_7_days: 3,
    description: 'Normal activity pattern',
  },
  [RiskLevel.MEDIUM]: {
    max_absent_days: 7,
    min_punch_count_7_days: 1,
    description: 'Reduced activity requiring monitoring',
  },
  [RiskLevel.HIGH]: {
    max_absent_days: 14,
    min_punch_count_7_days: 0,
    description: 'Concerning pattern requiring attention',
  },
  [RiskLevel.CRITICAL]: {
    max_absent_days: Infinity,
    min_punch_count_7_days: 0,
    description: 'Critical situation requiring immediate action',
  },
} as const;

export const ACTIVITY_MONITORING_ACTION_RECOMMENDATIONS = {
  [ActivityStatus.ACTIVE]: ['Monitor regularly', 'Maintain current status'],
  [ActivityStatus.INACTIVE]: [
    'Verify leave status',
    'Check contractual information',
    'Confirm deactivation if intended',
  ],
  [ActivityStatus.SUSPICIOUS]: [
    'Contact employee immediately',
    'Investigate absence reasons',
    'Review recent activity patterns',
    'Consider HR intervention',
    'Update leave declarations if needed',
  ],
} as const;

export const ACTIVITY_MONITORING_PRIORITY_LEVELS = {
  [RiskLevel.CRITICAL]: 1,
  [RiskLevel.HIGH]: 2,
  [RiskLevel.MEDIUM]: 3,
  [RiskLevel.LOW]: 4,
} as const;

// Export types
export type ActivityMonitoringError =
  (typeof ACTIVITY_MONITORING_ERRORS)[keyof typeof ACTIVITY_MONITORING_ERRORS];
export type ActivityMonitoringCode =
  (typeof ACTIVITY_MONITORING_CODES)[keyof typeof ACTIVITY_MONITORING_CODES];
export type ActivityMonitoringRiskThreshold =
  (typeof ACTIVITY_MONITORING_RISK_THRESHOLDS)[keyof typeof ACTIVITY_MONITORING_RISK_THRESHOLDS];
export type ActivityMonitoringActionRecommendations =
  (typeof ACTIVITY_MONITORING_ACTION_RECOMMENDATIONS)[keyof typeof ACTIVITY_MONITORING_ACTION_RECOMMENDATIONS];
