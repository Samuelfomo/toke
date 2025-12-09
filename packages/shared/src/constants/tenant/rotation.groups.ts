export enum CycleUnit {
  DAY = 'day',
  WEEK = 'week',
}

export const ROTATION_GROUP_VALIDATION = {
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
    MAX_LENGTH: 255,
  },
  CYCLE_LENGTH: {
    MIN: 1,
    MAX: 365,
  },
  CYCLE_TEMPLATES: {
    MIN_ITEMS: 1,
    MAX_ITEMS: 100,
  },
} as const;

export const ROTATION_GROUP_DEFAULTS = {
  ACTIVE: true,
  CYCLE_UNIT: CycleUnit.DAY,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const ROTATION_GROUP_CODES = {
  ROTATION_GROUP_ALREADY_EXISTS: 'rotation_group_already_exists',
  ROTATION_GROUP_NOT_FOUND: 'rotation_group_not_found',
  INVALID_GUID: 'invalid_guid',
  TENANT_REQUIRED: 'tenant_required',
  TENANT_INVALID: 'tenant_invalid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  CYCLE_LENGTH_REQUIRED: 'cycle_length_required',
  CYCLE_LENGTH_INVALID: 'cycle_length_invalid',
  CYCLE_UNIT_REQUIRED: 'cycle_unit_required',
  CYCLE_UNIT_INVALID: 'cycle_unit_invalid',
  CYCLE_TEMPLATES_REQUIRED: 'cycle_templates_required',
  CYCLE_TEMPLATES_INVALID: 'cycle_templates_invalid',
  CYCLE_TEMPLATES_EMPTY: 'cycle_templates_empty',
  CYCLE_TEMPLATES_TOO_MANY: 'cycle_templates_too_many',
  CYCLE_TEMPLATES_DUPLICATE: 'cycle_templates_duplicate',
  START_DATE_REQUIRED: 'start_date_required',
  START_DATE_INVALID: 'start_date_invalid',
  ACTIVE_INVALID: 'active_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  CANNOT_DELETE_WITH_ASSIGNMENTS: 'cannot_delete_with_assignments',
  MEMBERS_LISTING_FAILED: 'members_listing_failed',
  PREVIEW_FAILED: 'preview_failed',
  STATISTICS_FAILED: 'statistics_failed',
  TEMPLATE_NOT_FOUND: 'template_not_found',
  RETRIEVAL_FAILED: 'retrieval_failed',
  REVISION_FAILED: 'revision_failed',
} as const;

const ROTATION_GROUP_LABEL = 'Rotation Group';
export const ROTATION_GROUP_ERRORS = {
  ROTATION_GROUP: ROTATION_GROUP_LABEL,

  // TENANT_REQUIRED: `${ROTATION_GROUP_LABEL} tenant is required`,
  // TENANT_INVALID: `Tenant must be between ${ROTATION_GROUP_VALIDATION.TENANT.MIN_LENGTH} and ${ROTATION_GROUP_VALIDATION.TENANT.MAX_LENGTH} characters`,

  NAME_REQUIRED: `${ROTATION_GROUP_LABEL} name is required`,
  NAME_INVALID: `Name must be between ${ROTATION_GROUP_VALIDATION.NAME.MIN_LENGTH} and ${ROTATION_GROUP_VALIDATION.NAME.MAX_LENGTH} characters`,

  CYCLE_LENGTH_REQUIRED: `${ROTATION_GROUP_LABEL} cycle_length is required`,
  CYCLE_LENGTH_INVALID: `Cycle length must be between ${ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MIN} and ${ROTATION_GROUP_VALIDATION.CYCLE_LENGTH.MAX}`,

  CYCLE_UNIT_REQUIRED: `${ROTATION_GROUP_LABEL} cycle_unit is required`,
  CYCLE_UNIT_INVALID: `Cycle unit must be one of: ${Object.values(CycleUnit).join(', ')}`,

  CYCLE_TEMPLATES_REQUIRED: `${ROTATION_GROUP_LABEL} cycle_templates is required`,
  CYCLE_TEMPLATES_INVALID:
    'Cycle templates must be an array of positive integers (session template IDs)',
  CYCLE_TEMPLATES_EMPTY: `Cycle templates must contain at least ${ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MIN_ITEMS} item`,
  CYCLE_TEMPLATES_TOO_MANY: `Cycle templates cannot contain more than ${ROTATION_GROUP_VALIDATION.CYCLE_TEMPLATES.MAX_ITEMS} items`,
  CYCLE_TEMPLATES_DUPLICATE: 'Cycle templates cannot contain duplicate IDs',

  START_DATE_REQUIRED: `${ROTATION_GROUP_LABEL} start_date is required`,
  START_DATE_INVALID: 'start_date must be a valid date (YYYY-MM-DD)',

  ACTIVE_INVALID: 'Active must be a boolean value (true or false)',

  GUID_INVALID: `GUID must be 1-${ROTATION_GROUP_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${ROTATION_GROUP_LABEL} not found`,
  VALIDATION_FAILED: `${ROTATION_GROUP_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${ROTATION_GROUP_LABEL}`,
  UPDATE_FAILED: `Failed to update ${ROTATION_GROUP_LABEL}`,
  DELETE_FAILED: `Failed to delete ${ROTATION_GROUP_LABEL}`,

  DUPLICATE_ENTRY: `${ROTATION_GROUP_LABEL} already exists`,
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${ROTATION_GROUP_LABEL}`,
  ID_REQUIRED: `${ROTATION_GROUP_LABEL} id is required`,

  CANNOT_DELETE_WITH_ASSIGNMENTS: `Cannot delete ${ROTATION_GROUP_LABEL} with assigned users`,
} as const;

export const ROTATION_GROUP_MESSAGES = {
  CREATED_SUCCESSFULLY: `${ROTATION_GROUP_LABEL} created successfully`,
  UPDATED_SUCCESSFULLY: `${ROTATION_GROUP_LABEL} updated successfully`,
  DELETED_SUCCESSFULLY: `${ROTATION_GROUP_LABEL} deleted successfully`,
} as const;

export type RotationGroupError = (typeof ROTATION_GROUP_ERRORS)[keyof typeof ROTATION_GROUP_ERRORS];
export type RotationGroupMessage =
  (typeof ROTATION_GROUP_MESSAGES)[keyof typeof ROTATION_GROUP_MESSAGES];
export type RotationGroupCode = (typeof ROTATION_GROUP_CODES)[keyof typeof ROTATION_GROUP_CODES];
export type RotationGroupValidation = typeof ROTATION_GROUP_VALIDATION;
