// constants/sites.ts

export enum SiteType {
  MANAGER = 'manager_site',
  GLOBAL = 'global_site',
  TEMPORARY = 'temporary_site',
  PUBLIC = 'public_site',
}

export const SITES_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  TENANT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
  CREATED_BY: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    REQUIRED: true,
  },
  ADDRESS: {
    REQUIRED_FIELDS: ['city', 'location', 'place_name'],
  },
  GEOFENCE_RADIUS: {
    MIN: 1,
    MAX: 10000, // 10 km
    REQUIRED: true,
  },
  QR_REFERENCE: {
    MIN: 1,
    MAX: 2147483647,
  },
} as const;

export const SITES_DEFAULTS = {
  SITE_TYPE: SiteType.MANAGER,
  GEOFENCE_RADIUS: 100,
  ACTIVE: true,
  PUBLIC: false,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const SITES_CODES = {
  SITE_ALREADY_EXISTS: 'site_already_exists',
  SITE_NOT_FOUND: 'site_not_found',
  INVALID_GUID: 'invalid_guid',
  TENANT_REQUIRED: 'tenant_required',
  TENANT_INVALID: 'tenant_invalid',
  CREATED_BY_REQUIRED: 'created_by_required',
  CREATED_BY_INVALID: 'created_by_invalid',
  CREATED_BY_NOT_FOUND: 'created_by_not_found',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  SITE_TYPE_INVALID: 'site_type_invalid',
  ADDRESS_INVALID: 'address_invalid',
  ADDRESS_MISSING_FIELDS: 'address_missing_fields',
  GEOFENCE_POLYGON_REQUIRED: 'geofence_polygon_required',
  GEOFENCE_POLYGON_INVALID: 'geofence_polygon_invalid',
  GEOFENCE_RADIUS_REQUIRED: 'geofence_radius_required',
  GEOFENCE_RADIUS_INVALID: 'geofence_radius_invalid',
  QR_REFERENCE_INVALID: 'qr_reference_invalid',
  QR_REFERENCE_NOT_FOUND: 'qr_reference_not_found',
  QR_CODE_DATA_REQUIRED: 'qr_code_data_required',
  QR_CODE_DATA_INVALID: 'qr_code_data_invalid',
  QR_REGENERATION_FAILED: 'qr_regeneration_failed',
  ACTIVE_STATUS_INVALID: 'active_status_invalid',
  PUBLIC_STATUS_INVALID: 'public_status_invalid',
  ALLOWED_ROLES_INVALID: 'allowed_roles_invalid',
  SITE_TYPE_PERMISSION_DENIED: 'site_type_permission_denied',
  GEOFENCE_OVERLAP_DETECTED: 'geofence_overlap_detected',
  INVALID_COORDINATES: 'invalid_coordinates',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
  RETRIEVAL_FAILED: 'retrieval_failed',
  TEAM_MANAGEMENT_FAILED: 'team_management_failed',
  VALIDITY_EXTENSION_FAILED: 'validity_extension_failed',
  MAINTENANCE_FAILED: 'maintenance_failed',
  STATISTICS_FAILED: 'statistics_failed',
} as const;

const SITES_LABEL = 'Site';
export const SITES_ERRORS = {
  SITE: SITES_LABEL,

  TENANT_REQUIRED: `${SITES_LABEL} tenant is required`,
  TENANT_INVALID: `Tenant must be 1-${SITES_VALIDATION.TENANT.MAX_LENGTH} characters`,

  ID_REQUIRED: `${SITES_LABEL} ID is required`,

  CREATED_BY_REQUIRED: `${SITES_LABEL} created by is required`,
  CREATED_BY_INVALID: `Created by must be between ${SITES_VALIDATION.CREATED_BY.MIN} and ${SITES_VALIDATION.CREATED_BY.MAX}`,
  CREATED_BY_NOT_FOUND: 'Creating user not found',
  UNABLE_EXPAND_SITE: `Only temporary sites can have their validity extended`,

  NAME_REQUIRED: `${SITES_LABEL} name is required`,
  NAME_INVALID: `Site name must be 1-${SITES_VALIDATION.NAME.MAX_LENGTH} characters and not empty`,

  SITE_TYPE_INVALID: `Site type must be one of: ${Object.values(SiteType).join(', ')}`,
  SITE_TYPE_PERMISSION_DENIED: 'Insufficient permissions to create this site type',

  ADDRESS_INVALID: 'Address must be a valid JSON object',
  ADDRESS_MISSING_FIELDS: `Address must contain: ${SITES_VALIDATION.ADDRESS.REQUIRED_FIELDS.join(', ')}`,

  GEOFENCE_POLYGON_REQUIRED: `${SITES_LABEL} geofence polygon is required`,
  GEOFENCE_POLYGON_INVALID: 'Geofence polygon must be a valid polygon geometry',
  INVALID_COORDINATES: 'Invalid coordinates provided for geofence polygon',

  GEOFENCE_RADIUS_REQUIRED: `${SITES_LABEL} geofence radius is required`,
  GEOFENCE_RADIUS_INVALID: `Geofence radius must be between ${SITES_VALIDATION.GEOFENCE_RADIUS.MIN} and ${SITES_VALIDATION.GEOFENCE_RADIUS.MAX} meters`,

  QR_REFERENCE_INVALID: `QR reference must be between ${SITES_VALIDATION.QR_REFERENCE.MIN} and ${SITES_VALIDATION.QR_REFERENCE.MAX}`,
  QR_REFERENCE_NOT_FOUND: 'QR reference user not found',

  QR_CODE_DATA_REQUIRED: `${SITES_LABEL} QR code data is required`,
  QR_CODE_DATA_INVALID: 'QR code data must be a valid JSON object',

  ACTIVE_STATUS_INVALID: 'Active status must be a boolean value (true or false)',
  PUBLIC_STATUS_INVALID: 'Public status must be a boolean value (true or false)',

  ALLOWED_ROLES_INVALID: 'Allowed roles must be a valid JSON object',

  GEOFENCE_OVERLAP_DETECTED: 'Geofence overlaps with existing site',

  GUID_INVALID: `GUID must be 1-${SITES_VALIDATION.GUID.MAX_LENGTH} characters`,
  GUID_GENERATION_FAILED: 'Failed to generate GUID',

  NOT_FOUND: `${SITES_LABEL} not found`,
  VALIDATION_FAILED: `${SITES_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${SITES_LABEL}`,
  UPDATE_FAILED: `Failed to update ${SITES_LABEL}`,
  DELETE_FAILED: `Failed to delete ${SITES_LABEL}`,

  DUPLICATE_SITE: `${SITES_LABEL} already exists`,

  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;
export const SITES_MESSAGES = {
  DELETED_SUCCESSFULLY: `${SITES_LABEL} deleted successfully`,
} as const;

export type SiteError = (typeof SITES_ERRORS)[keyof typeof SITES_ERRORS];
export type SiteCode = (typeof SITES_CODES)[keyof typeof SITES_CODES];
export type SiteMessage = (typeof SITES_MESSAGES)[keyof typeof SITES_MESSAGES];
export type SiteValidation = typeof SITES_VALIDATION;
