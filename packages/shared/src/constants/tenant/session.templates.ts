export const SESSION_TEMPLATE_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  // TENANT: {
  //   MIN_LENGTH: 1,
  //   MAX_LENGTH: 128,
  // },
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
  // VALID_FROM: TimezoneConfigUtils.getCurrentTime(),
  IS_DEFAULT: false,
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
  TENANT_REQUIRED: 'tenant_required',
  TENANT_INVALID: 'tenant_invalid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  VALID_FROM_REQUIRED: 'valid_from_required',
  VALID_FROM_INVALID: 'valid_from_invalid',
  VALID_TO_INVALID: 'valid_to_invalid',
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
} as const;

const SESSION_TEMPLATE_LABEL = 'Session Template';
export const SESSION_TEMPLATE_ERRORS = {
  SESSION_TEMPLATE: SESSION_TEMPLATE_LABEL,

  // TENANT_REQUIRED: `${SESSION_TEMPLATE_LABEL} tenant is required`,
  // TENANT_INVALID: `Tenant must be between ${SESSION_TEMPLATE_VALIDATION.TENANT.MIN_LENGTH} and ${SESSION_TEMPLATE_VALIDATION.TENANT.MAX_LENGTH} characters`,

  NAME_REQUIRED: `${SESSION_TEMPLATE_LABEL} name is required`,
  NAME_INVALID: `Name must be between ${SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH} and ${SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH} characters`,

  // VALID_FROM_REQUIRED: `${SESSION_TEMPLATE_LABEL} valid_from is required`,
  // VALID_FROM_INVALID: 'valid_from must be a valid date',
  // VALID_TO_INVALID: 'valid_to must be a valid date',

  DEFINITION_REQUIRED: `${SESSION_TEMPLATE_LABEL} definition is required`,
  DEFINITION_INVALID: 'Definition must be a valid object',

  INVALID_DAY_KEY: `Invalid day key. Must be one of: ${VALID_DAYS.join(', ')}`,
  BLOCKS_MUST_BE_ARRAY: 'Each day must have an array of work blocks',

  WORK_REQUIRED: 'work field is required for each block',
  WORK_INVALID_FORMAT: 'work must be an array of 2 time strings [start, end]',
  WORK_TIME_INVALID: 'work times must be in HH:MM format (e.g., "08:00", "18:00")',
  WORK_START_AFTER_END: 'work start time must be before end time',

  PAUSE_INVALID_FORMAT: 'pause must be null or an array of 2 time strings [start, end]',
  PAUSE_TIME_INVALID: 'pause times must be in HH:MM format',
  PAUSE_START_AFTER_END: 'pause start time must be before end time',
  PAUSE_OUTSIDE_WORK: 'pause must be within work block time range',

  TOLERANCE_REQUIRED: 'tolerance is required for each block',
  TOLERANCE_INVALID: `Tolerance must be a positive integer between ${SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN} and ${SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX} minutes`,

  OVERLAPPING_BLOCKS: 'Work blocks cannot overlap on the same day',

  GUID_INVALID: `GUID must be 1-${SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${SESSION_TEMPLATE_LABEL} not found`,
  VALIDATION_FAILED: `${SESSION_TEMPLATE_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${SESSION_TEMPLATE_LABEL}`,
  UPDATE_FAILED: `Failed to update ${SESSION_TEMPLATE_LABEL}`,
  DELETE_FAILED: `Failed to delete ${SESSION_TEMPLATE_LABEL}`,

  DUPLICATE_ENTRY: `${SESSION_TEMPLATE_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${SESSION_TEMPLATE_LABEL}`,
  ID_REQUIRED: `${SESSION_TEMPLATE_LABEL} id is required`,
  ACTIVE_DEFAULT_TEMPLATE_ALREADY_EXISTS: `Active default ${SESSION_TEMPLATE_LABEL} already exists`,
} as const;

export const SESSION_TEMPLATE_MESSAGES = {
  CREATED_SUCCESSFULLY: `${SESSION_TEMPLATE_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${SESSION_TEMPLATE_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${SESSION_TEMPLATE_LABEL} deleted successfully`,
} as const;

export type SessionTemplateError =
  (typeof SESSION_TEMPLATE_ERRORS)[keyof typeof SESSION_TEMPLATE_ERRORS];
export type SessionTemplateMessage =
  (typeof SESSION_TEMPLATE_MESSAGES)[keyof typeof SESSION_TEMPLATE_MESSAGES];
export type SessionTemplateCode =
  (typeof SESSION_TEMPLATE_CODES)[keyof typeof SESSION_TEMPLATE_CODES];
export type SessionTemplateValidation = typeof SESSION_TEMPLATE_VALIDATION;
