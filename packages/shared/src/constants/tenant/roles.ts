// constants/roles.ts

export const ROLES_VALIDATION = {
  CODE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    REQUIRED: true,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    REQUIRED: true,
  },
  DESCRIPTION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  PERMISSIONS: {
    REQUIRED: true,
  },
} as const;

export const ROLES_DEFAULTS = {
  SYSTEM_ROLE: true,
  DEFAULT_ROLE: false,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const ROLES_CODES = {
  ROLE_ALREADY_EXISTS: 'role_already_exists',
  ROLE_NOT_FOUND: 'role_not_found',
  INVALID_GUID: 'invalid_guid',
  CODE_REQUIRED: 'code_required',
  CODE_INVALID: 'code_invalid',
  CODE_ALREADY_EXISTS: 'code_already_exists',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  DESCRIPTION_INVALID: 'description_invalid',
  PERMISSIONS_REQUIRED: 'permissions_required',
  PERMISSIONS_INVALID: 'permissions_invalid',
  SYSTEM_ROLE_INVALID: 'system_role_invalid',
  SYSTEM_ROLE_CANNOT_DELETE: 'system_role_cannot_delete',
  SYSTEM_ROLE_CANNOT_MODIFY: 'system_role_cannot_modify',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  PERMISSION_STRUCTURE_INVALID: 'permission_structure_invalid',
  ROLE_IN_USE: 'role_in_use',
  DEFAULT_ROLE_ALREADY_EXISTS: 'default_role_already_exists',
  DEFAULT_ROLE_NOT_FOUND: 'default_role_not_found',
} as const;

const ROLES_LABEL = 'Role';
export const ROLES_ERRORS = {
  ROLE: ROLES_LABEL,

  ID_REQUIRED: `${ROLES_LABEL} ID is required`,

  CODE_REQUIRED: `${ROLES_LABEL} code is required`,
  CODE_INVALID: `Role code must be 1-${ROLES_VALIDATION.CODE.MAX_LENGTH} characters`,
  CODE_ALREADY_EXISTS: 'Role code already exists',

  DEFAULT_ROLE_ALREADY_EXISTS: 'Default role already exists',
  DEFAULT_ROLE_INVALID: 'Default role must be a boolean value (true or false)',
  DEFAULT_ROLE_NOT_FOUND: `${ROLES_LABEL} default role not found`,

  GUID_GENERATED_FAILED: 'Failed to generate GUID for role',
  GUID_INVALID: `${ROLES_LABEL} GUID format invalid`,
  GUID_REQUIRED: `${ROLES_LABEL} GUID is required`,

  NAME_REQUIRED: `${ROLES_LABEL} name is required`,
  NAME_INVALID: `Role name must be 1-${ROLES_VALIDATION.NAME.MAX_LENGTH} characters`,

  DESCRIPTION_INVALID: `Role description must not exceed ${ROLES_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,

  PERMISSIONS_REQUIRED: `${ROLES_LABEL} permissions are required`,
  PERMISSIONS_INVALID: 'Role permissions must be a valid JSON object',
  PERMISSION_STRUCTURE_INVALID: 'Role permissions must follow the expected structure',

  SYSTEM_ROLE_INVALID: 'System role must be a boolean value (true or false)',
  SYSTEM_ROLE_CANNOT_DELETE: 'System roles cannot be deleted',
  SYSTEM_ROLE_CANNOT_MODIFY: 'System roles cannot be modified',

  NOT_FOUND: `${ROLES_LABEL} not found`,
  VALIDATION_FAILED: `${ROLES_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${ROLES_LABEL}`,
  UPDATE_FAILED: `Failed to update ${ROLES_LABEL}`,
  DELETE_FAILED: `Failed to delete ${ROLES_LABEL}`,

  DUPLICATE_ROLE: `${ROLES_LABEL} already exists`,
  ROLE_IN_USE: `${ROLES_LABEL} is currently assigned to users and cannot be deleted`,

  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;

export type RoleError = (typeof ROLES_ERRORS)[keyof typeof ROLES_ERRORS];
export type RoleCode = (typeof ROLES_CODES)[keyof typeof ROLES_CODES];
export type RoleValidation = typeof ROLES_VALIDATION;
