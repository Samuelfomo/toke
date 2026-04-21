// constants/tenant/session.model.ts

export const VALID_WORKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type WorkDay = (typeof VALID_WORKDAYS)[number];

export const SESSION_MODEL_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  WORKDAY: {
    MIN_COUNT: 1,
    MAX_COUNT: 7,
  },
  WORKING_TIME: {
    MIN: 0,
    MAX: 1440, // 24 hours in minutes
  },
  TOLERANCE: {
    MIN: 0,
    MAX: 120, // 2 hours max
  },
  PAUSE_DURATION: {
    MIN: 1,
    MAX: 120, // 2 hours max per pause
  },
  PAUSE_COUNT: {
    MIN: 1,
    MAX: 10, // Max 10 pauses per session
  },
  EXTRA_MAX: {
    MIN: 1,
    MAX: 480, // 8 hours max extra time
  },
  LEAVE_ELIGIBILITY: {
    MIN: 0,
    MAX: 1440, // 24 hours
  },
} as const;

export const SESSION_MODEL_DEFAULTS = {
  ACTIVE: true,
  PAUSE_ALLOWED: false,
  ROTATION_ALLOWED: false,
  EXTRA_ALLOWED: false,
  EARLY_LEAVE_ALLOWED: false,
  LEAVE_IS_OPTIONAL: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const SESSION_MODEL_CODES = {
  SESSION_MODEL_ALREADY_EXISTS: 'session_model_already_exists',
  SESSION_MODEL_NOT_FOUND: 'session_model_not_found',
  INVALID_GUID: 'invalid_guid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  MAX_WORKING_TIME_REQUIRED: 'max_working_time_required',
  MAX_WORKING_TIME_INVALID: 'max_working_time_invalid',
  MIN_WORKING_TIME_REQUIRED: 'min_working_time_required',
  MIN_WORKING_TIME_INVALID: 'min_working_time_invalid',
  NORMAL_SESSION_TIME_REQUIRED: 'normal_session_time_required',
  NORMAL_SESSION_TIME_INVALID: 'normal_session_time_invalid',
  WORKING_TIME_INCONSISTENT: 'working_time_inconsistent',
  TOLERANCE_REQUIRED: 'tolerance_required',
  TOLERANCE_INVALID: 'tolerance_invalid',
  PAUSE_DURATION_REQUIRED: 'pause_duration_required',
  PAUSE_DURATION_INVALID: 'pause_duration_invalid',
  PAUSE_COUNT_REQUIRED: 'pause_count_required',
  PAUSE_COUNT_INVALID: 'pause_count_invalid',
  PAUSE_CONFIG_INCOMPLETE: 'pause_config_incomplete',
  EXTRA_MAX_REQUIRED: 'extra_max_required',
  EXTRA_MAX_INVALID: 'extra_max_invalid',
  EXTRA_CONFIG_INCOMPLETE: 'extra_config_incomplete',
  LEAVE_ELIGIBILITY_INVALID: 'leave_eligibility_invalid',
  CREATED_BY_REQUIRED: 'created_by_required',
  CREATED_BY_INVALID: 'created_by_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  RESTORE_FAILED: 'restore_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
  STATISTICS_FAILED: 'statistics_failed',
  CLONE_FAILED: 'clone_failed',
  CREATED_BY_NOT_FOUND: 'created_by_not_found',

  WORKDAY_REQUIRED: 'workday_required',
  WORKDAY_INVALID: 'workday_invalid',
  LEAVE_ELIGIBILITY_REQUIRED: 'leave_eligibility_required',
} as const;

const LABEL = 'Session Model';

export const SESSION_MODEL_ERRORS = {
  NAME_REQUIRED: `${LABEL} name is required`,
  NAME_INVALID: `Name must be between ${SESSION_MODEL_VALIDATION.NAME.MIN_LENGTH} and ${SESSION_MODEL_VALIDATION.NAME.MAX_LENGTH} characters`,
  MAX_WORKING_TIME_REQUIRED: 'Maximum working time is required',
  MAX_WORKING_TIME_INVALID: `Maximum working time must be between ${SESSION_MODEL_VALIDATION.WORKING_TIME.MIN} and ${SESSION_MODEL_VALIDATION.WORKING_TIME.MAX} minutes`,
  MIN_WORKING_TIME_REQUIRED: 'Minimum working time is required',
  MIN_WORKING_TIME_INVALID: `Minimum working time must be between ${SESSION_MODEL_VALIDATION.WORKING_TIME.MIN} and ${SESSION_MODEL_VALIDATION.WORKING_TIME.MAX} minutes`,
  NORMAL_SESSION_TIME_REQUIRED: 'Normal session time is required',
  NORMAL_SESSION_TIME_INVALID: `Normal session time must be between ${SESSION_MODEL_VALIDATION.WORKING_TIME.MIN} and ${SESSION_MODEL_VALIDATION.WORKING_TIME.MAX} minutes`,
  WORKING_TIME_INCONSISTENT:
    'Minimum working time must be ≤ normal session time ≤ maximum working time',
  TOLERANCE_REQUIRED: 'Tolerance is required',
  TOLERANCE_INVALID: `Tolerance must be between ${SESSION_MODEL_VALIDATION.TOLERANCE.MIN} and ${SESSION_MODEL_VALIDATION.TOLERANCE.MAX} minutes`,
  PAUSE_DURATION_REQUIRED: 'Pause duration is required when pause is allowed',
  PAUSE_DURATION_INVALID: `Pause duration must be between ${SESSION_MODEL_VALIDATION.PAUSE_DURATION.MIN} and ${SESSION_MODEL_VALIDATION.PAUSE_DURATION.MAX} minutes`,
  PAUSE_COUNT_REQUIRED: 'Pause count is required when pause is allowed',
  PAUSE_COUNT_INVALID: `Pause count must be between ${SESSION_MODEL_VALIDATION.PAUSE_COUNT.MIN} and ${SESSION_MODEL_VALIDATION.PAUSE_COUNT.MAX}`,
  PAUSE_CONFIG_INCOMPLETE:
    'When pause is allowed, both pause_duration and pause_count must be provided',
  EXTRA_MAX_REQUIRED: 'Extra max is required when extra hours are allowed',
  EXTRA_MAX_INVALID: `Extra max must be between ${SESSION_MODEL_VALIDATION.EXTRA_MAX.MIN} and ${SESSION_MODEL_VALIDATION.EXTRA_MAX.MAX} minutes`,
  EXTRA_CONFIG_INCOMPLETE: 'When extra hours are allowed, extra_max must be provided',
  LEAVE_ELIGIBILITY_INVALID: `Leave eligibility must be between ${SESSION_MODEL_VALIDATION.LEAVE_ELIGIBILITY.MIN} and ${SESSION_MODEL_VALIDATION.LEAVE_ELIGIBILITY.MAX} minutes`,
  CREATED_BY_REQUIRED: 'Created by is required',
  CREATED_BY_INVALID: 'Created by must be a positive integer',
  GUID_INVALID: `GUID must be between ${SESSION_MODEL_VALIDATION.GUID.MIN_LENGTH} and ${SESSION_MODEL_VALIDATION.GUID.MAX_LENGTH} characters`,
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${LABEL}`,
  NOT_FOUND: `${LABEL} not found`,
  VALIDATION_FAILED: `${LABEL} validation failed`,
  CREATION_FAILED: `Failed to create ${LABEL}`,
  UPDATE_FAILED: `Failed to update ${LABEL}`,
  DELETE_FAILED: `Failed to delete ${LABEL}`,
  RESTORE_FAILED: `Failed to restore ${LABEL}`,
  DUPLICATE_ENTRY: `${LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  ID_REQUIRED: `${LABEL} id is required`,
  CLONE_FAILED: `Failed to clone ${LABEL}`,
  LEAVE_ELIGIBILITY_REQUIRED: 'Leave eligibility is required',
  CREATED_BY_NOT_FOUND: `${LABEL} created by not found`,
  WORKDAY_INVALID: `Work days must be a non-empty array of valid days ( ${VALID_WORKDAYS.join(', ')}) with no duplicates`,
  WORKDAY_REQUIRED: 'Work days are required',
  WORKDAY_CONFLICT: 'Workday conflicts with existing session model',
} as const;

export const SESSION_MODEL_MESSAGES = {
  CREATED_SUCCESSFULLY: `${LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${LABEL} deleted successfully`,
  RESTORED_SUCCESSFULLY: `${LABEL} restored successfully`,
  ACTIVATED_SUCCESSFULLY: `${LABEL} activated successfully`,
  DEACTIVATED_SUCCESSFULLY: `${LABEL} deactivated successfully`,
  CLONED_SUCCESSFULLY: `${LABEL} cloned successfully`,
} as const;

export type SessionModelCode = (typeof SESSION_MODEL_CODES)[keyof typeof SESSION_MODEL_CODES];
