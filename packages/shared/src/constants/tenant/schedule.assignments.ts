export enum SAFamily {
  USER = 'user',
  GROUP = 'group',
}

export const SCHEDULE_ASSIGNMENTS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
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
    REQUIRED: true,
  },
  REASON: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 5000,
  },
  FAMILY: {
    VALUES: Object.values(SAFamily) as readonly string[],
  },
  RELATED: { MIN_LENGTH: 1, MAX_LENGTH: 255 },
} as const;

export const SCHEDULE_ASSIGNMENTS_DEFAULTS = {
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const SCHEDULE_ASSIGNMENTS_CODES = {
  SCHEDULE_ASSIGNMENTS_ALREADY_EXISTS: 'schedule_assignments_already_exists',
  SCHEDULE_ASSIGNMENTS_NOT_FOUND: 'schedule_assignments_not_found',
  INVALID_GUID: 'invalid_guid',
  TENANT_REQUIRED: 'tenant_required',
  TENANT_INVALID: 'tenant_invalid',
  FAMILY_INVALID: 'family_invalid',
  RELATED_INVALID: 'related_invalid',
  SESSION_TEMPLATE_REQUIRED: 'session_template_required',
  SESSION_TEMPLATE_INVALID: 'session_template_invalid',
  SESSION_TEMPLATE_NOT_FOUND: 'session_template_not_found',
  START_DATE_REQUIRED: 'start_date_required',
  START_DATE_INVALID: 'start_date_invalid',
  END_DATE_REQUIRED: 'end_date_required',
  END_DATE_INVALID: 'end_date_invalid',
  END_DATE_BEFORE_START: 'end_date_before_start',
  CREATED_BY_INVALID: 'created_by_invalid',
  CREATED_BY_REQUIRED: 'created_by_required',
  CREATED_BY_NOT_FOUND: 'created_by_not_found',
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
  RELATED_NOT_FOUND: 'related_not_found',
  FAMILY_REQUIRED: 'family_required',
  RELATED_REQUIRED: 'related_required',
  GROUPS_NOT_FOUND: 'groups_not_found',
} as const;

const SCHEDULE_ASSIGNMENTS_LABEL = 'Schedule Assignments';
export const SCHEDULE_ASSIGNMENTS_ERRORS = {
  SCHEDULE_ASSIGNMENTS: SCHEDULE_ASSIGNMENTS_LABEL,

  SESSION_TEMPLATE_REQUIRED: `${SCHEDULE_ASSIGNMENTS_LABEL} session_template is required`,
  SESSION_TEMPLATE_INVALID: `Session Template GUID must be between ${SCHEDULE_ASSIGNMENTS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH} and ${SCHEDULE_ASSIGNMENTS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH} characters`,
  SESSION_TEMPLATE_NOT_FOUND: 'Session Template not found',

  START_DATE_REQUIRED: `${SCHEDULE_ASSIGNMENTS_LABEL} start_date is required`,
  START_DATE_INVALID: 'start_date must be a valid date (YYYY-MM-DD)',

  END_DATE_REQUIRED: `${SCHEDULE_ASSIGNMENTS_LABEL} end_date is required`,
  END_DATE_INVALID: 'end_date must be a valid date (YYYY-MM-DD)',
  END_DATE_BEFORE_START: 'end_date must be after or equal to start_date',

  CREATED_BY_REQUIRED: `${SCHEDULE_ASSIGNMENTS_LABEL} created_by is required`,
  CREATED_BY_INVALID: `Created By GUID must be between ${SCHEDULE_ASSIGNMENTS_VALIDATION.CREATED_BY.MIN_LENGTH} and ${SCHEDULE_ASSIGNMENTS_VALIDATION.CREATED_BY.MAX_LENGTH} characters`,
  CREATED_BY_NOT_FOUND: 'Created By not found',

  REASON_INVALID: `Reason must be between ${SCHEDULE_ASSIGNMENTS_VALIDATION.REASON.MIN_LENGTH} and ${SCHEDULE_ASSIGNMENTS_VALIDATION.REASON.MAX_LENGTH} characters`,

  ACTIVE_INVALID: 'Active must be a boolean value (true or false)',

  GUID_INVALID: `GUID must be 1-${SCHEDULE_ASSIGNMENTS_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${SCHEDULE_ASSIGNMENTS_LABEL} not found`,
  VALIDATION_FAILED: `${SCHEDULE_ASSIGNMENTS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${SCHEDULE_ASSIGNMENTS_LABEL}`,
  UPDATE_FAILED: `Failed to update ${SCHEDULE_ASSIGNMENTS_LABEL}`,
  DELETE_FAILED: `Failed to delete ${SCHEDULE_ASSIGNMENTS_LABEL}`,

  DUPLICATE_ENTRY: `${SCHEDULE_ASSIGNMENTS_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${SCHEDULE_ASSIGNMENTS_LABEL}`,
  ID_REQUIRED: `${SCHEDULE_ASSIGNMENTS_LABEL} id is required`,

  DATE_RANGE_OVERLAP: 'Exception date range overlaps with existing exception',
  USER_EXCEPTION_ALREADY_ASSIGNED: "'User is already assigned to this session template",
  GROUPS_EXCEPTION_ALREADY_ASSIGNED: 'Groups is already assigned to this session template',
  USER_ALREADY_HAS_ACTIVE_EXCEPTION: 'User already has an active schedule exception',
  GROUPS_ALREADY_HAS_ACTIVE_EXCEPTION: 'Groups already has an active schedule exception',
  USER_TEMPLATE_VERSION_ALREADY_ASSIGNED: 'This template version is already assigned to this user',
  GROUPS_TEMPLATE_VERSION_ALREADY_ASSIGNED:
    'This template version is already assigned to this group',
  FAMILY_INVALID: 'Family must be either "user" or "group"',
  FAMILY_REQUIRED: 'Family is required',
  RELATED_REQUIRED: 'Related is required',
  RELATED_INVALID: 'Related must be a valid GUID',
  RELATED_NOT_FOUND: 'Related not found',
  RELATED_ALREADY_ASSIGNED: 'Related is already assigned to this session template',
  RELATED_ALREADY_ASSIGNED_TO_FAMILY: 'Related is already assigned to this family',
  RELATED_ALREADY_ASSIGNED_TO_FAMILY_AND_TEMPLATE:
    'Related is already assigned to this family and template',
  GROUPS_NOT_FOUND: 'Groups not found',
} as const;

export const SCHEDULE_ASSIGNMENTS_MESSAGES = {
  CREATED_SUCCESSFULLY: `${SCHEDULE_ASSIGNMENTS_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${SCHEDULE_ASSIGNMENTS_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${SCHEDULE_ASSIGNMENTS_LABEL} deleted successfully`,
  EXCEPTION_APPLIED: 'Schedule exception applied successfully',
  EXCEPTION_REMOVED: 'Schedule exception removed successfully',
} as const;

export type ScheduleExceptionError =
  (typeof SCHEDULE_ASSIGNMENTS_ERRORS)[keyof typeof SCHEDULE_ASSIGNMENTS_ERRORS];
export type ScheduleExceptionMessage =
  (typeof SCHEDULE_ASSIGNMENTS_MESSAGES)[keyof typeof SCHEDULE_ASSIGNMENTS_MESSAGES];
export type ScheduleAssignmentsCode =
  (typeof SCHEDULE_ASSIGNMENTS_CODES)[keyof typeof SCHEDULE_ASSIGNMENTS_CODES];
export type ScheduleExceptionValidation = typeof SCHEDULE_ASSIGNMENTS_VALIDATION;
