// constants/tenant/department.ts

export const DEPARTMENT_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  CODE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  DESCRIPTION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: Infinity,
  },
  MANAGER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
} as const;

export const DEPARTMENT_DEFAULTS = {
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const DEPARTMENT_CODES = {
  DEPARTMENT_ALREADY_EXISTS: 'department_already_exists',
  DEPARTMENT_NOT_FOUND: 'department_not_found',
  INVALID_GUID: 'invalid_guid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  CODE_REQUIRED: 'code_required',
  CODE_INVALID: 'code_invalid',
  CODE_ALREADY_EXISTS: 'code_already_exists',
  DESCRIPTION_INVALID: 'description_invalid',
  MANAGER_INVALID: 'manager_invalid',
  MANAGER_NOT_FOUND: 'manager_not_found',
  ACTIVE_INVALID: 'active_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  CANNOT_DELETE_WITH_ACTIVE_POSTES: 'cannot_delete_with_active_postes',
  CANNOT_DELETE_WITH_EMPLOYEES: 'cannot_delete_with_employees',
} as const;

const DEPARTMENT_LABEL = 'Department';
export const DEPARTMENT_ERRORS = {
  DEPARTMENT: DEPARTMENT_LABEL,

  NAME_REQUIRED: `${DEPARTMENT_LABEL} name is required`,
  NAME_INVALID: `Name must be between ${DEPARTMENT_VALIDATION.NAME.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.NAME.MAX_LENGTH} characters`,

  CODE_REQUIRED: `${DEPARTMENT_LABEL} code is required`,
  CODE_INVALID: `Code must be between ${DEPARTMENT_VALIDATION.CODE.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.CODE.MAX_LENGTH} characters`,
  CODE_ALREADY_EXISTS: `${DEPARTMENT_LABEL} code already exists`,

  DESCRIPTION_INVALID: `Description must be between ${DEPARTMENT_VALIDATION.DESCRIPTION.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,

  MANAGER_INVALID: `Manager GUID must be between ${DEPARTMENT_VALIDATION.MANAGER.MIN_LENGTH} and ${DEPARTMENT_VALIDATION.MANAGER.MAX_LENGTH}`,
  MANAGER_NOT_FOUND: 'Manager not found',

  ACTIVE_INVALID: 'Active must be a boolean value (true or false)',

  GUID_INVALID: `GUID must be 1-${DEPARTMENT_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${DEPARTMENT_LABEL} not found`,
  VALIDATION_FAILED: `${DEPARTMENT_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${DEPARTMENT_LABEL}`,
  UPDATE_FAILED: `Failed to update ${DEPARTMENT_LABEL}`,
  DELETE_FAILED: `Failed to delete ${DEPARTMENT_LABEL}`,

  DUPLICATE_ENTRY: `${DEPARTMENT_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${DEPARTMENT_LABEL}`,
  ID_REQUIRED: `${DEPARTMENT_LABEL} id is required`,

  CANNOT_DELETE_WITH_ACTIVE_POSTES: `Cannot delete ${DEPARTMENT_LABEL} with active postes`,
  CANNOT_DELETE_WITH_EMPLOYEES: `Cannot delete ${DEPARTMENT_LABEL} with assigned employees`,
} as const;

export const DEPARTMENT_MESSAGES = {
  CREATED_SUCCESSFULLY: `${DEPARTMENT_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${DEPARTMENT_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${DEPARTMENT_LABEL} deleted successfully`,
} as const;

export type DepartmentError = (typeof DEPARTMENT_ERRORS)[keyof typeof DEPARTMENT_ERRORS];
export type DepartmentMessage = (typeof DEPARTMENT_MESSAGES)[keyof typeof DEPARTMENT_MESSAGES];
export type DepartmentCode = (typeof DEPARTMENT_CODES)[keyof typeof DEPARTMENT_CODES];
export type DepartmentValidation = typeof DEPARTMENT_VALIDATION;
