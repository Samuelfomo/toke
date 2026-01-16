// constants/groups.ts

import { TimezoneConfigUtils } from '../../utils/timezone.config.validation.js';

export const GROUPS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
  MANAGER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    REQUIRED: true,
  },
  MEMBER: {
    USER: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 255,
    },
  },
  // SESSION_TEMPLATE: {
  //   MIN_LENGTH: 1,
  //   MAX_LENGTH: 255,
  // },
} as const;

export const GROUPS_DEFAULTS = {
  MEMBERS: [],
  ASSIGNED_SESSIONS: [],
  MEMBER_ACTIVE: true,
  MEMBER_JOINED_AT: () => TimezoneConfigUtils.getCurrentTime(),
  SESSION_ACTIVE: true,
  SESSION_ASSIGN_AT: () => TimezoneConfigUtils.getCurrentTime(),
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const GROUPS_CODES = {
  GROUPS_ALREADY_EXISTS: 'groups_already_exists',
  GROUPS_NOT_FOUND: 'groups_not_found',
  INVALID_GUID: 'invalid_guid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  MANAGER_REQUIRED: 'manager_required',
  MANAGER_INVALID: 'manager_invalid',
  MANAGER_NOT_FOUND: 'manager_not_found',
  MEMBERS_INVALID: 'members_invalid',
  MEMBER_USER_REQUIRED: 'member_user_required',
  MEMBER_USER_INVALID: 'member_user_invalid',
  MEMBER_USER_NOT_FOUND: 'member_user_not_found',
  MEMBER_JOINED_AT_INVALID: 'member_joined_at_invalid',
  MEMBER_ACTIVE_INVALID: 'member_active_invalid',
  MEMBER_DUPLICATE: 'member_duplicate',
  // ASSIGNED_SESSIONS_INVALID: 'assigned_sessions_invalid',
  // SESSION_TEMPLATE_REQUIRED: 'session_template_required',
  // SESSION_TEMPLATE_INVALID: 'session_template_invalid',
  // SESSION_TEMPLATE_NOT_FOUND: 'session_template_not_found',
  // SESSION_ASSIGN_AT_INVALID: 'session_assign_at_invalid',
  // SESSION_ACTIVE_INVALID: 'session_active_invalid',
  // MULTIPLE_ACTIVE_SESSIONS: 'multiple_active_sessions',
  // NO_ACTIVE_SESSION: 'no_active_session',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  MEMBER_ALREADY_ACTIVE_IN_ANOTHER_GROUPS: 'member_already_active_in_another_groups',
} as const;

const GROUPS_LABEL = 'Groups';
export const GROUPS_ERRORS = {
  GROUPS: GROUPS_LABEL,

  NAME_REQUIRED: `${GROUPS_LABEL} name is required`,
  NAME_INVALID: `Groups name must be between ${GROUPS_VALIDATION.NAME.MIN_LENGTH} and ${GROUPS_VALIDATION.NAME.MAX_LENGTH} characters`,

  MANAGER_REQUIRED: `${GROUPS_LABEL} manager is required`,
  MANAGER_INVALID: `Manager GUID must be between ${GROUPS_VALIDATION.MANAGER.MIN_LENGTH} and ${GROUPS_VALIDATION.MANAGER.MAX_LENGTH} characters`,
  MANAGER_NOT_FOUND: 'Manager not found',

  MEMBERS_INVALID: 'Members must be an array',
  MEMBER_USER_REQUIRED: 'Member user is required',
  MEMBER_USER_INVALID: `Member user Guid must be between ${GROUPS_VALIDATION.MEMBER.USER.MIN_LENGTH} and ${GROUPS_VALIDATION.MEMBER.USER.MAX_LENGTH} characters`,
  MEMBER_USER_NOT_FOUND: 'Member user not found',
  MEMBER_JOINED_AT_INVALID: 'Member joined_at must be a valid date',
  MEMBER_ACTIVE_INVALID: 'Member active must be a boolean value',
  MEMBER_DUPLICATE: 'Duplicate member user ID detected',

  // ASSIGNED_SESSIONS_INVALID: 'Assigned sessions must be an array',
  // SESSION_TEMPLATE_REQUIRED: 'Session template is required',
  // SESSION_TEMPLATE_INVALID: `Session template GUID must be between ${GROUPS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH} and ${GROUPS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH} characters`,
  // SESSION_TEMPLATE_NOT_FOUND: 'Session template not found',
  // SESSION_ASSIGN_AT_INVALID: 'Session assign_at must be a valid date',
  // SESSION_ACTIVE_INVALID: 'Session active must be a boolean value',
  // MULTIPLE_ACTIVE_SESSIONS: 'Only one session template can be active at a time',
  // NO_ACTIVE_SESSION: 'At least one session template must be active',

  GUID_INVALID: `GUID must be 1-${GROUPS_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${GROUPS_LABEL} not found`,
  VALIDATION_FAILED: `${GROUPS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${GROUPS_LABEL}`,
  UPDATE_FAILED: `Failed to update ${GROUPS_LABEL}`,
  DELETE_FAILED: `Failed to delete ${GROUPS_LABEL}`,

  DUPLICATE_ENTRY: `${GROUPS_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${GROUPS_LABEL}`,
  ID_REQUIRED: `${GROUPS_LABEL} id is required`,

  MEMBER_ALREADY_ACTIVE_IN_ANOTHER_GROUPS: 'User is already an active member of another groups',
} as const;

export const GROUPS_MESSAGES = {
  CREATED_SUCCESSFULLY: `${GROUPS_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${GROUPS_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${GROUPS_LABEL} deleted successfully`,
  MEMBER_ADDED: 'Member added successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  SESSION_ASSIGNED: 'Session template assigned successfully',
} as const;

export type groupsError = (typeof GROUPS_ERRORS)[keyof typeof GROUPS_ERRORS];
export type groupsMessage = (typeof GROUPS_MESSAGES)[keyof typeof GROUPS_MESSAGES];
export type groupsCode = (typeof GROUPS_CODES)[keyof typeof GROUPS_CODES];
export type groupsValidation = typeof GROUPS_VALIDATION;
