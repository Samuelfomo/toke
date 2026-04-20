export const SESSION_TEMPLATE_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  TOLERANCE: {
    MIN: 0,
    MAX: 120, // 2 hours max
  },
} as const;

export const SESSION_TEMPLATE_DEFAULTS = {
  IS_DEFAULT: false,
  FOR_ROTATION: false,
  IS_CURRENT: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type DayOfWeek = (typeof VALID_DAYS)[number];

export const SESSION_TEMPLATE_CODES = {
  SESSION_TEMPLATE_ALREADY_EXISTS: 'session_template_already_exists',
  SESSION_TEMPLATE_NOT_FOUND: 'session_template_not_found',
  INVALID_GUID: 'invalid_guid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  DEFINITION_REQUIRED: 'definition_required',
  DEFINITION_INVALID: 'definition_invalid',
  INVALID_DAY_KEY: 'invalid_day_key',
  BLOCKS_MUST_BE_ARRAY: 'blocks_must_be_array',
  WORK_REQUIRED: 'work_required',
  WORK_INVALID_FORMAT: 'work_invalid_format',
  WORK_TIME_INVALID: 'work_time_invalid',
  WORK_START_AFTER_END: 'work_start_after_end',
  PAUSE_INVALID_FORMAT: 'pause_invalid_format',
  PAUSE_TIME_INVALID: 'pause_time_invalid',
  PAUSE_START_AFTER_END: 'pause_start_after_end',
  PAUSE_OUTSIDE_WORK: 'pause_outside_work',
  TOLERANCE_REQUIRED: 'tolerance_required',
  TOLERANCE_INVALID: 'tolerance_invalid',
  OVERLAPPING_BLOCKS: 'overlapping_blocks',
  SESSION_MODEL_REQUIRED: 'session_model_required',
  SESSION_MODEL_INVALID: 'session_model_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
  STATISTICS_FAILED: 'statistics_failed',
  SESSION_MODEL_NOT_FOUND: 'session_model_not_found',
  SESSION_MODEL_CONFLICT: 'session_model_conflict',
} as const;

const LABEL = 'Session Template';

export const SESSION_TEMPLATE_ERRORS = {
  NAME_REQUIRED: `${LABEL} name is required`,
  NAME_INVALID: `Name must be between ${SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH} and ${SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH} characters`,
  DEFINITION_REQUIRED: `${LABEL} definition is required`,
  DEFINITION_INVALID: 'Definition must be a valid object',
  INVALID_DAY_KEY: `Invalid day key. Must be one of: ${VALID_DAYS.join(', ')}`,
  BLOCKS_MUST_BE_ARRAY: 'Each day must be null or an array of work blocks',
  WORK_REQUIRED: 'work field is required for each block',
  WORK_INVALID_FORMAT: 'work must be an array of 2 time strings [start, end]',
  WORK_TIME_INVALID: 'work times must be in HH:MM format',
  WORK_START_AFTER_END: 'work start time must be before end time',
  PAUSE_INVALID_FORMAT: 'pause must be null or an array of 2 time strings [start, end]',
  PAUSE_TIME_INVALID: 'pause times must be in HH:MM format',
  PAUSE_START_AFTER_END: 'pause start time must be before end time',
  PAUSE_OUTSIDE_WORK: 'pause must be within work block time range',
  TOLERANCE_REQUIRED: 'tolerance is required for each block',
  TOLERANCE_INVALID: `Tolerance must be an integer between ${SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN} and ${SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX} minutes`,
  OVERLAPPING_BLOCKS: 'Work blocks cannot overlap on the same day',
  SESSION_MODEL_REQUIRED: 'session_model is required',
  SESSION_MODEL_INVALID: 'session_model must be a positive integer',
  GUID_INVALID: `GUID must be 1-${SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH} characters`,
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${LABEL}`,
  NOT_FOUND: `${LABEL} not found`,
  VALIDATION_FAILED: `${LABEL} validation failed`,
  CREATION_FAILED: `Failed to create ${LABEL}`,
  UPDATE_FAILED: `Failed to update ${LABEL}`,
  DELETE_FAILED: `Failed to delete ${LABEL}`,
  DUPLICATE_ENTRY: `${LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  ACTIVE_DEFAULT_TEMPLATE_ALREADY_EXISTS: `Active default ${LABEL} already exists`,
  ID_REQUIRED: `${LABEL} id is required`,
  SESSION_MODEL_NOT_FOUND: `Session model not found for ${LABEL}`,
  SESSION_MODEL_ROTATION_NOT_ALLOWED: `Session model does not allow rotation`,
} as const;

export const SESSION_TEMPLATE_MESSAGES = {
  CREATED_SUCCESSFULLY: `${LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${LABEL} deleted successfully`,
} as const;

export type SessionTemplateCode =
  (typeof SESSION_TEMPLATE_CODES)[keyof typeof SESSION_TEMPLATE_CODES];
