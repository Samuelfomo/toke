export const SCHEDULE_EXCEPTION_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  // TENANT: {
  //   MIN_LENGTH: 1,
  //   MAX_LENGTH: 128,
  // },
  USER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  GROUPS: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  SESSION_TEMPLATE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    REQUIRED: true,
  },
  CREATED_BY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  REASON: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 5000,
  },
} as const;

export const SCHEDULE_EXCEPTION_DEFAULTS = {
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const SCHEDULE_EXCEPTION_CODES = {
  SCHEDULE_EXCEPTION_ALREADY_EXISTS: 'schedule_exception_already_exists',
  SCHEDULE_EXCEPTION_NOT_FOUND: 'schedule_exception_not_found',
  INVALID_GUID: 'invalid_guid',
  TENANT_REQUIRED: 'tenant_required',
  TENANT_INVALID: 'tenant_invalid',
  USER_INVALID: 'user_invalid',
  USER_NOT_FOUND: 'user_not_found',
  GROUPS_INVALID: 'groups_invalid',
  GROUPS_NOT_FOUND: 'groups_not_found',
  USER_OR_GROUPS_REQUIRED: 'user_or_groups_required',
  BOTH_USER_AND_GROUPS: 'both_user_and_groups',
  SESSION_TEMPLATE_REQUIRED: 'session_template_required',
  SESSION_TEMPLATE_INVALID: 'session_template_invalid',
  SESSION_TEMPLATE_NOT_FOUND: 'session_template_not_found',
  START_DATE_REQUIRED: 'start_date_required',
  START_DATE_INVALID: 'start_date_invalid',
  END_DATE_REQUIRED: 'end_date_required',
  END_DATE_INVALID: 'end_date_invalid',
  END_DATE_BEFORE_START: 'end_date_before_start',
  CREATED_BY_INVALID: 'created_by_invalid',
  REASON_INVALID: 'reason_invalid',
  ACTIVE_INVALID: 'active_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  DATE_RANGE_OVERLAP: 'date_range_overlap',
  REVISION_FAILED: 'revision_failed',
  STATISTICS_FAILED: 'statistics_failed',
  RETRIEVAL_FAILED: 'retrieval_failed',
} as const;

const SCHEDULE_EXCEPTION_LABEL = 'Schedule Exception';
export const SCHEDULE_EXCEPTION_ERRORS = {
  SCHEDULE_EXCEPTION: SCHEDULE_EXCEPTION_LABEL,

  // TENANT_REQUIRED: `${SCHEDULE_EXCEPTION_LABEL} tenant is required`,
  // TENANT_INVALID: `Tenant must be between ${SCHEDULE_EXCEPTION_VALIDATION.TENANT.MIN_LENGTH} and ${SCHEDULE_EXCEPTION_VALIDATION.TENANT.MAX_LENGTH} characters`,

  USER_INVALID: `User GUID must be between ${SCHEDULE_EXCEPTION_VALIDATION.USER.MIN_LENGTH} and ${SCHEDULE_EXCEPTION_VALIDATION.USER.MAX_LENGTH} characters`,
  USER_NOT_FOUND: 'User not found',

  GROUPS_INVALID: `Groups GUID must be between ${SCHEDULE_EXCEPTION_VALIDATION.GROUPS.MIN_LENGTH} and ${SCHEDULE_EXCEPTION_VALIDATION.GROUPS.MAX_LENGTH} characters`,
  GROUPS_NOT_FOUND: 'Rotation Groups not found',

  USER_OR_GROUPS_REQUIRED: 'Either user or groups must be specified',
  BOTH_USER_AND_GROUPS: 'Cannot specify both user and groups',

  SESSION_TEMPLATE_REQUIRED: `${SCHEDULE_EXCEPTION_LABEL} session_template is required`,
  SESSION_TEMPLATE_INVALID: `Session Template GUID must be between ${SCHEDULE_EXCEPTION_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH} and ${SCHEDULE_EXCEPTION_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH} characters`,
  SESSION_TEMPLATE_NOT_FOUND: 'Session Template not found',

  START_DATE_REQUIRED: `${SCHEDULE_EXCEPTION_LABEL} start_date is required`,
  START_DATE_INVALID: 'start_date must be a valid date (YYYY-MM-DD)',

  END_DATE_REQUIRED: `${SCHEDULE_EXCEPTION_LABEL} end_date is required`,
  END_DATE_INVALID: 'end_date must be a valid date (YYYY-MM-DD)',
  END_DATE_BEFORE_START: 'end_date must be after or equal to start_date',

  CREATED_BY_INVALID: `Created By GUID must be between ${SCHEDULE_EXCEPTION_VALIDATION.CREATED_BY.MIN_LENGTH} and ${SCHEDULE_EXCEPTION_VALIDATION.CREATED_BY.MAX_LENGTH} characters`,

  REASON_INVALID: `Reason must be between ${SCHEDULE_EXCEPTION_VALIDATION.REASON.MIN_LENGTH} and ${SCHEDULE_EXCEPTION_VALIDATION.REASON.MAX_LENGTH} characters`,

  ACTIVE_INVALID: 'Active must be a boolean value (true or false)',

  GUID_INVALID: `GUID must be 1-${SCHEDULE_EXCEPTION_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${SCHEDULE_EXCEPTION_LABEL} not found`,
  VALIDATION_FAILED: `${SCHEDULE_EXCEPTION_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${SCHEDULE_EXCEPTION_LABEL}`,
  UPDATE_FAILED: `Failed to update ${SCHEDULE_EXCEPTION_LABEL}`,
  DELETE_FAILED: `Failed to delete ${SCHEDULE_EXCEPTION_LABEL}`,

  DUPLICATE_ENTRY: `${SCHEDULE_EXCEPTION_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${SCHEDULE_EXCEPTION_LABEL}`,
  ID_REQUIRED: `${SCHEDULE_EXCEPTION_LABEL} id is required`,

  DATE_RANGE_OVERLAP: 'Exception date range overlaps with existing exception',
  USER_EXCEPTION_ALREADY_ASSIGNED: "'User is already assigned to this session template",
  GROUPS_EXCEPTION_ALREADY_ASSIGNED: 'Groups is already assigned to this session template',
  USER_ALREADY_HAS_ACTIVE_EXCEPTION: 'User already has an active schedule exception',
  GROUPS_ALREADY_HAS_ACTIVE_EXCEPTION: 'Groups already has an active schedule exception',
} as const;

export const SCHEDULE_EXCEPTION_MESSAGES = {
  CREATED_SUCCESSFULLY: `${SCHEDULE_EXCEPTION_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${SCHEDULE_EXCEPTION_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${SCHEDULE_EXCEPTION_LABEL} deleted successfully`,
  EXCEPTION_APPLIED: 'Schedule exception applied successfully',
  EXCEPTION_REMOVED: 'Schedule exception removed successfully',
} as const;

export type ScheduleExceptionError =
  (typeof SCHEDULE_EXCEPTION_ERRORS)[keyof typeof SCHEDULE_EXCEPTION_ERRORS];
export type ScheduleExceptionMessage =
  (typeof SCHEDULE_EXCEPTION_MESSAGES)[keyof typeof SCHEDULE_EXCEPTION_MESSAGES];
export type ScheduleExceptionCode =
  (typeof SCHEDULE_EXCEPTION_CODES)[keyof typeof SCHEDULE_EXCEPTION_CODES];
export type ScheduleExceptionValidation = typeof SCHEDULE_EXCEPTION_VALIDATION;
