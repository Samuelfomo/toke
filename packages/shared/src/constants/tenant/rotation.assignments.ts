import { TimezoneConfigUtils } from '../../utils/timezone.config.validation.js';

export const ROTATION_ASSIGNMENT_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  USER: {
    // MIN: 1,
    // MAX: 2147483647,
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    REQUIRED: true,
  },
  ROTATION_GROUP: {
    // MIN: 1,
    // MAX: 2147483647,
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    REQUIRED: true,
  },
  OFFSET: {
    MIN: 0,
    MAX: 365,
  },
} as const;

export const ROTATION_ASSIGNMENT_DEFAULTS = {
  OFFSET: 0,
  ASSIGNED_AT: TimezoneConfigUtils.getCurrentTime(),
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const ROTATION_ASSIGNMENT_CODES = {
  ROTATION_ASSIGNMENT_ALREADY_EXISTS: 'rotation_assignment_already_exists',
  ROTATION_ASSIGNMENT_NOT_FOUND: 'rotation_assignment_not_found',
  INVALID_GUID: 'invalid_guid',
  USER_REQUIRED: 'user_required',
  USER_INVALID: 'user_invalid',
  USER_NOT_FOUND: 'user_not_found',
  ROTATION_GROUP_REQUIRED: 'rotation_group_required',
  ROTATION_GROUP_INVALID: 'rotation_group_invalid',
  ROTATION_GROUP_NOT_FOUND: 'rotation_group_not_found',
  OFFSET_INVALID: 'offset_invalid',
  ASSIGNED_AT_INVALID: 'assigned_at_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  DUPLICATE_ASSIGNMENT: 'duplicate_assignment',
  REVISION_FAILED: 'revision_failed',
  ALREADY_ASSIGNED: 'already_assigned',
  RETRIEVAL_FAILED: 'retrieval_failed',
  SCHEDULE_RETRIEVAL_FAILED: 'schedule_retrieval_failed',
  STATISTICS_FAILED: 'statistics_failed',
} as const;

const ROTATION_ASSIGNMENT_LABEL = 'Rotation Assignment';
export const ROTATION_ASSIGNMENT_ERRORS = {
  ROTATION_ASSIGNMENT: ROTATION_ASSIGNMENT_LABEL,

  USER_REQUIRED: `${ROTATION_ASSIGNMENT_LABEL} user is required`,
  USER_INVALID: `User GUID must be between ${ROTATION_ASSIGNMENT_VALIDATION.USER.MIN_LENGTH} and ${ROTATION_ASSIGNMENT_VALIDATION.USER.MAX_LENGTH} letters or numbers`,
  USER_NOT_FOUND: 'User not found',

  ROTATION_GROUP_REQUIRED: `${ROTATION_ASSIGNMENT_LABEL} rotation_group is required`,
  ROTATION_GROUP_INVALID: `Rotation Group GUID must be between ${ROTATION_ASSIGNMENT_VALIDATION.ROTATION_GROUP.MIN_LENGTH} and ${ROTATION_ASSIGNMENT_VALIDATION.ROTATION_GROUP.MAX_LENGTH} letters or numbers`,
  ROTATION_GROUP_NOT_FOUND: 'Rotation Group not found',

  OFFSET_INVALID: `Offset must be between ${ROTATION_ASSIGNMENT_VALIDATION.OFFSET.MIN} and ${ROTATION_ASSIGNMENT_VALIDATION.OFFSET.MAX}`,

  ASSIGNED_AT_INVALID: 'assigned_at must be a valid date',

  GUID_INVALID: `GUID must be 1-${ROTATION_ASSIGNMENT_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${ROTATION_ASSIGNMENT_LABEL} not found`,
  VALIDATION_FAILED: `${ROTATION_ASSIGNMENT_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${ROTATION_ASSIGNMENT_LABEL}`,
  UPDATE_FAILED: `Failed to update ${ROTATION_ASSIGNMENT_LABEL}`,
  DELETE_FAILED: `Failed to delete ${ROTATION_ASSIGNMENT_LABEL}`,

  DUPLICATE_ENTRY: `${ROTATION_ASSIGNMENT_LABEL} already exists`,
  DUPLICATE_ASSIGNMENT: 'User is already assigned to this rotation group',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${ROTATION_ASSIGNMENT_LABEL}`,
  ID_REQUIRED: `${ROTATION_ASSIGNMENT_LABEL} id is required`,
  USER_ALREADY_ASSIGNED: 'User is already assigned to this rotation group',
} as const;

export const ROTATION_ASSIGNMENT_MESSAGES = {
  CREATED_SUCCESSFULLY: `${ROTATION_ASSIGNMENT_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${ROTATION_ASSIGNMENT_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${ROTATION_ASSIGNMENT_LABEL} deleted successfully`,
  ASSIGNED_SUCCESSFULLY: 'User assigned to rotation group successfully',
  UNASSIGNED_SUCCESSFULLY: 'User unassigned from rotation group successfully',
} as const;

export type RotationAssignmentError =
  (typeof ROTATION_ASSIGNMENT_ERRORS)[keyof typeof ROTATION_ASSIGNMENT_ERRORS];
export type RotationAssignmentMessage =
  (typeof ROTATION_ASSIGNMENT_MESSAGES)[keyof typeof ROTATION_ASSIGNMENT_MESSAGES];
export type RotationAssignmentCode =
  (typeof ROTATION_ASSIGNMENT_CODES)[keyof typeof ROTATION_ASSIGNMENT_CODES];
export type RotationAssignmentValidation = typeof ROTATION_ASSIGNMENT_VALIDATION;
