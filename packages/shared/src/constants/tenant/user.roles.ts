// constants/user_roles.ts

export const USER_ROLES_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  USER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
  ROLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
  ASSIGNED_BY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
} as const;

export const USER_ROLES_DEFAULTS = {
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const USER_ROLES_CODES = {
  USER_ROLE_ALREADY_EXISTS: 'user_role_already_exists',
  USER_ROLE_NOT_FOUND: 'user_role_not_found',
  INVALID_GUID: 'invalid_guid',
  USER_REQUIRED: 'user_required',
  USER_INVALID: 'user_invalid',
  USER_NOT_FOUND: 'user_not_found',
  ROLE_REQUIRED: 'role_required',
  ROLE_INVALID: 'role_invalid',
  ROLE_NOT_FOUND: 'role_not_found',
  ASSIGNED_BY_REQUIRED: 'assigned_by_required',
  ASSIGNED_BY_INVALID: 'assigned_by_invalid',
  ASSIGNED_BY_NOT_FOUND: 'assigned_by_not_found',
  ASSIGNED_AT_INVALID: 'assigned_at_invalid',
  DUPLICATE_ASSIGNMENT: 'duplicate_assignment',
  SELF_ASSIGNMENT_RESTRICTED: 'self_assignment_restricted',
  SYSTEM_ROLE_ASSIGNMENT_RESTRICTED: 'system_role_assignment_restricted',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
  ROLE_ASSIGNMENT_CONFLICT: 'role_assignment_conflict',
  REVISION_FAILED: 'revision_failed',
  BULK_ASSIGNMENT_FAILED: 'bulk_assignment_failed',
} as const;

const USER_ROLES_LABEL = 'User Role';
export const USER_ROLES_ERRORS = {
  USER_ROLE: USER_ROLES_LABEL,

  USER_REQUIRED: `${USER_ROLES_LABEL} user is required`,
  USER_INVALID: `User ID must be between ${USER_ROLES_VALIDATION.USER.MIN_LENGTH} and ${USER_ROLES_VALIDATION.USER.MAX_LENGTH}`,
  USER_NOT_FOUND: 'User not found',

  ROLE_REQUIRED: `${USER_ROLES_LABEL} role is required`,
  ROLE_INVALID: `Role ID must be between ${USER_ROLES_VALIDATION.ROLE.MIN_LENGTH} and ${USER_ROLES_VALIDATION.ROLE.MAX_LENGTH}`,
  ROLE_NOT_FOUND: 'Role not found',

  ASSIGNED_BY_REQUIRED: `${USER_ROLES_LABEL} assigned by is required`,
  ASSIGNED_BY_INVALID: `Assigned by must be between ${USER_ROLES_VALIDATION.ASSIGNED_BY.MIN_LENGTH} and ${USER_ROLES_VALIDATION.ASSIGNED_BY.MAX_LENGTH}`,
  ASSIGNED_BY_NOT_FOUND: 'Assigning user not found',

  ASSIGNED_AT_INVALID: 'Assignment date must be a valid date',

  DUPLICATE_ASSIGNMENT: 'User already has this role assigned',
  SELF_ASSIGNMENT_RESTRICTED: 'Users cannot assign roles to themselves',
  SYSTEM_ROLE_ASSIGNMENT_RESTRICTED: 'System roles can only be assigned by administrators',
  ROLE_ASSIGNMENT_CONFLICT: 'Role assignment conflicts with existing permissions',

  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to assign this role',

  GUID_INVALID: `GUID must be 1-${USER_ROLES_VALIDATION.GUID.MAX_LENGTH} characters`,
  GUID_GENERATION_FAILED: 'Failed to generate GUID',
  NOT_FOUND: `${USER_ROLES_LABEL} not found`,
  VALIDATION_FAILED: `${USER_ROLES_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${USER_ROLES_LABEL}`,
  UPDATE_FAILED: `Failed to update ${USER_ROLES_LABEL}`,
  DELETE_FAILED: `Failed to delete ${USER_ROLES_LABEL}`,

  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;

export type UserRoleError = (typeof USER_ROLES_ERRORS)[keyof typeof USER_ROLES_ERRORS];
export type UserRoleCode = (typeof USER_ROLES_CODES)[keyof typeof USER_ROLES_CODES];
export type UserRoleValidation = typeof USER_ROLES_VALIDATION;
