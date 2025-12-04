// constants/tenant/poste.ts

export enum Level {
  JUNIOR = 'JUNIOR',
  MEDIUM = 'MEDIUM',
  SENIOR = 'SENIOR',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
  HEAD = 'HEAD',
  CEO = 'CEO',
  CTO = 'CTO',
  CFO = 'CFO',
  UNKNOWN = 'UNKNOWN',
}

export const POSTE_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
  TITLE: {
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
  DEPARTMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  SALARY_BASE: {
    MIN: 0,
    MAX: 9999999999.99,
    DECIMAL_PLACES: 2,
  },
} as const;

export const POSTE_DEFAULTS = {
  ACTIVE: true,
  LEVEL: Level.UNKNOWN,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const POSTE_CODES = {
  POSTE_ALREADY_EXISTS: 'poste_already_exists',
  POSTE_NOT_FOUND: 'poste_not_found',
  INVALID_GUID: 'invalid_guid',
  TITLE_REQUIRED: 'title_required',
  TITLE_INVALID: 'title_invalid',
  CODE_REQUIRED: 'code_required',
  CODE_INVALID: 'code_invalid',
  CODE_ALREADY_EXISTS: 'code_already_exists',
  DESCRIPTION_INVALID: 'description_invalid',
  DEPARTMENT_REQUIRED: 'department_required',
  DEPARTMENT_INVALID: 'department_invalid',
  DEPARTMENT_NOT_FOUND: 'department_not_found',
  SALARY_BASE_INVALID: 'salary_base_invalid',
  LEVEL_INVALID: 'level_invalid',
  ACTIVE_INVALID: 'active_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  CANNOT_DELETE_WITH_EMPLOYEES: 'cannot_delete_with_employees',
} as const;

const POSTE_LABEL = 'Poste';
export const POSTE_ERRORS = {
  POSTE: POSTE_LABEL,

  TITLE_REQUIRED: `${POSTE_LABEL} title is required`,
  TITLE_INVALID: `Title must be between ${POSTE_VALIDATION.TITLE.MIN_LENGTH} and ${POSTE_VALIDATION.TITLE.MAX_LENGTH} characters`,

  CODE_REQUIRED: `${POSTE_LABEL} code is required`,
  CODE_INVALID: `Code must be between ${POSTE_VALIDATION.CODE.MIN_LENGTH} and ${POSTE_VALIDATION.CODE.MAX_LENGTH} characters`,
  CODE_ALREADY_EXISTS: `${POSTE_LABEL} code already exists`,

  DESCRIPTION_INVALID: `Description must be between ${POSTE_VALIDATION.DESCRIPTION.MIN_LENGTH} and ${POSTE_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,

  DEPARTMENT_REQUIRED: `${POSTE_LABEL} department is required`,
  DEPARTMENT_INVALID: `Department GUID must be between ${POSTE_VALIDATION.DEPARTMENT.MIN_LENGTH} and ${POSTE_VALIDATION.DEPARTMENT.MAX_LENGTH}`,
  DEPARTMENT_NOT_FOUND: 'Department not found',

  SALARY_BASE_INVALID: `Salary base must be between ${POSTE_VALIDATION.SALARY_BASE.MIN} and ${POSTE_VALIDATION.SALARY_BASE.MAX} with max ${POSTE_VALIDATION.SALARY_BASE.DECIMAL_PLACES} decimal places`,

  LEVEL_INVALID: `Level must be one of: ${Object.values(Level).join(', ')}`,

  ACTIVE_INVALID: 'Active must be a boolean value (true or false)',

  GUID_INVALID: `GUID must be 1-${POSTE_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${POSTE_LABEL} not found`,
  VALIDATION_FAILED: `${POSTE_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${POSTE_LABEL}`,
  UPDATE_FAILED: `Failed to update ${POSTE_LABEL}`,
  DELETE_FAILED: `Failed to delete ${POSTE_LABEL}`,

  DUPLICATE_ENTRY: `${POSTE_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${POSTE_LABEL}`,
  ID_REQUIRED: `${POSTE_LABEL} id is required`,

  CANNOT_DELETE_WITH_EMPLOYEES: `Cannot delete ${POSTE_LABEL} with assigned employees`,
} as const;

export const POSTE_MESSAGES = {
  CREATED_SUCCESSFULLY: `${POSTE_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${POSTE_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${POSTE_LABEL} deleted successfully`,
} as const;

export type PosteError = (typeof POSTE_ERRORS)[keyof typeof POSTE_ERRORS];
export type PosteMessage = (typeof POSTE_MESSAGES)[keyof typeof POSTE_MESSAGES];
export type PosteCode = (typeof POSTE_CODES)[keyof typeof POSTE_CODES];
export type PosteValidation = typeof POSTE_VALIDATION;
