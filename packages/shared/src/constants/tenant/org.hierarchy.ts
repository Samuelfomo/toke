// constants/org_hierarchy.ts

export enum RelationshipType {
  DIRECT_REPORT = 'direct_report',
  MATRIX_REPORT = 'matrix_report',
  FUNCTIONAL_REPORT = 'functional_report',
  DOTTED_LINE = 'dotted_line',
}

export const ORG_HIERARCHY_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  SUBORDINATE: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  SUPERVISOR: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  RELATIONSHIP_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    REQUIRED: true,
  },
  DEPARTMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  COST_CENTER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  DELEGATION_LEVEL: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
} as const;

export const ORG_HIERARCHY_DEFAULTS = {
  RELATIONSHIP_TYPE: 'direct_report',
  DELEGATION_LEVEL: 1,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const ORG_HIERARCHY_CODES = {
  ORG_HIERARCHY_ALREADY_EXISTS: 'org_hierarchy_already_exists',
  ORG_HIERARCHY_NOT_FOUND: 'org_hierarchy_not_found',
  INVALID_GUID: 'invalid_guid',
  SUBORDINATE_REQUIRED: 'subordinate_required',
  SUBORDINATE_INVALID: 'subordinate_invalid',
  SUBORDINATE_NOT_FOUND: 'subordinate_not_found',
  SUPERVISOR_REQUIRED: 'supervisor_required',
  SUPERVISOR_INVALID: 'supervisor_invalid',
  SUPERVISOR_NOT_FOUND: 'supervisor_not_found',
  SELF_SUPERVISION_INVALID: 'self_supervision_invalid',
  RELATIONSHIP_TYPE_REQUIRED: 'relationship_type_required',
  RELATIONSHIP_TYPE_INVALID: 'relationship_type_invalid',
  EFFECTIVE_FROM_REQUIRED: 'effective_from_required',
  EFFECTIVE_FROM_INVALID: 'effective_from_invalid',
  EFFECTIVE_TO_INVALID: 'effective_to_invalid',
  EFFECTIVE_DATES_LOGIC_INVALID: 'effective_dates_logic_invalid',
  DEPARTMENT_INVALID: 'department_invalid',
  COST_CENTER_INVALID: 'cost_center_invalid',
  DELEGATION_LEVEL_REQUIRED: 'delegation_level_required',
  DELEGATION_LEVEL_INVALID: 'delegation_level_invalid',
  CIRCULAR_HIERARCHY_DETECTED: 'circular_hierarchy_detected',
  OVERLAPPING_RELATIONSHIP: 'overlapping_relationship',
  FUTURE_EFFECTIVE_DATE: 'future_effective_date',
  INVALID_HIERARCHY_DEPTH: 'invalid_hierarchy_depth',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
} as const;

const ORG_HIERARCHY_LABEL = 'Org Hierarchy';
export const ORG_HIERARCHY_ERRORS = {
  ORG_HIERARCHY: ORG_HIERARCHY_LABEL,

  SUBORDINATE_REQUIRED: `${ORG_HIERARCHY_LABEL} subordinate is required`,
  SUBORDINATE_INVALID: `Subordinate ID must be between ${ORG_HIERARCHY_VALIDATION.SUBORDINATE.MIN} and ${ORG_HIERARCHY_VALIDATION.SUBORDINATE.MAX}`,
  SUBORDINATE_NOT_FOUND: 'Subordinate user not found',

  SUPERVISOR_REQUIRED: `${ORG_HIERARCHY_LABEL} supervisor is required`,
  SUPERVISOR_INVALID: `Supervisor ID must be between ${ORG_HIERARCHY_VALIDATION.SUPERVISOR.MIN} and ${ORG_HIERARCHY_VALIDATION.SUPERVISOR.MAX}`,
  SUPERVISOR_NOT_FOUND: 'Supervisor user not found',

  SELF_SUPERVISION_INVALID: 'A user cannot be their own supervisor',
  CIRCULAR_HIERARCHY_DETECTED: 'Circular hierarchy relationship detected',

  RELATIONSHIP_TYPE_REQUIRED: `${ORG_HIERARCHY_LABEL} relationship type is required`,
  RELATIONSHIP_TYPE_INVALID: `Relationship type must be 1-${ORG_HIERARCHY_VALIDATION.RELATIONSHIP_TYPE.MAX_LENGTH} characters`,

  EFFECTIVE_FROM_REQUIRED: `${ORG_HIERARCHY_LABEL} effective from date is required`,
  EFFECTIVE_FROM_INVALID: 'Effective from date must be a valid date',
  EFFECTIVE_TO_INVALID: 'Effective to date must be a valid date',
  EFFECTIVE_DATES_LOGIC_INVALID: 'Effective to date must be after effective from date',
  FUTURE_EFFECTIVE_DATE: 'Effective from date cannot be in the future',

  DEPARTMENT_INVALID: `Department must be 1-${ORG_HIERARCHY_VALIDATION.DEPARTMENT.MAX_LENGTH} characters`,
  COST_CENTER_INVALID: `Cost center must be 1-${ORG_HIERARCHY_VALIDATION.COST_CENTER.MAX_LENGTH} characters`,

  DELEGATION_LEVEL_REQUIRED: `${ORG_HIERARCHY_LABEL} delegation level is required`,
  DELEGATION_LEVEL_INVALID: `Delegation level must be between ${ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MIN} and ${ORG_HIERARCHY_VALIDATION.DELEGATION_LEVEL.MAX}`,

  OVERLAPPING_RELATIONSHIP: 'Overlapping relationship exists for the same period',
  INVALID_HIERARCHY_DEPTH: 'Hierarchy depth exceeds maximum allowed levels',

  GUID_INVALID: `GUID must be 1-${ORG_HIERARCHY_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${ORG_HIERARCHY_LABEL} not found`,
  VALIDATION_FAILED: `${ORG_HIERARCHY_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${ORG_HIERARCHY_LABEL}`,
  UPDATE_FAILED: `Failed to update ${ORG_HIERARCHY_LABEL}`,
  DELETE_FAILED: `Failed to delete ${ORG_HIERARCHY_LABEL}`,

  DUPLICATE_HIERARCHY: `${ORG_HIERARCHY_LABEL} already exists for this subordinate-supervisor-date combination`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;

export type OrgHierarchyError = (typeof ORG_HIERARCHY_ERRORS)[keyof typeof ORG_HIERARCHY_ERRORS];
export type OrgHierarchyCode = (typeof ORG_HIERARCHY_CODES)[keyof typeof ORG_HIERARCHY_CODES];
export type OrgHierarchyValidation = typeof ORG_HIERARCHY_VALIDATION;
