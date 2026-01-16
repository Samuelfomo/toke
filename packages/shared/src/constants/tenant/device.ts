// constants/devices.ts

export enum DeviceType {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  OTHER = 'OTHER',
}

export const DEVICES_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    REQUIRED: true,
  },
  GPS_ACCURACY: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  GEOFENCE_RADIUS: {
    MIN: 1,
    MAX: 10000, // 10 km
    REQUIRED: true,
  },
} as const;

export const DEVICES_DEFAULTS = {
  DEVICE_TYPE: DeviceType.OTHER,
  GPS_ACCURACY: 10,
  GEOFENCE_RADIUS: 100,
  ACTIVE: true,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const DEVICES_CODES = {
  DEVICE_ALREADY_EXISTS: 'device_already_exists',
  DEVICE_NOT_FOUND: 'device_not_found',
  INVALID_GUID: 'invalid_guid',
  NAME_REQUIRED: 'name_required',
  NAME_INVALID: 'name_invalid',
  DEVICE_TYPE_REQUIRED: 'device_type_required',
  DEVICE_TYPE_INVALID: 'device_type_invalid',
  ASSIGNED_TO_REQUIRED: 'assigned_to_required',
  ASSIGNED_TO_INVALID: 'assigned_to_invalid',
  ASSIGNED_TO_NOT_FOUND: 'assigned_to_not_found',
  GPS_ACCURACY_REQUIRED: 'gps_accuracy_required',
  GPS_ACCURACY_INVALID: 'gps_accuracy_invalid',
  GEOFENCE_RADIUS_REQUIRED: 'geofence_radius_required',
  GEOFENCE_RADIUS_INVALID: 'geofence_radius_invalid',
  LAST_SEEN_AT_INVALID: 'last_seen_at_invalid',
  ACTIVE_STATUS_INVALID: 'active_status_invalid',
  CREATED_BY_REQUIRED: 'manager_required',
  CREATED_BY_INVALID: 'manager_invalid',
  CREATED_BY_NOT_FOUND: 'manager_not_found',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  CONFIG_FAILED: 'config_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
  RETRIEVAL_FAILED: 'retrieval_failed',
  REASSIGNMENT_FAILED: 'reassignment_failed',
  MAINTENANCE_FAILED: 'maintenance_failed',
  STATISTICS_FAILED: 'statistics_failed',
} as const;

const DEVICES_LABEL = 'Device';
export const DEVICES_ERRORS = {
  DEVICE: DEVICES_LABEL,

  ID_REQUIRED: `${DEVICES_LABEL} ID is required`,

  NAME_REQUIRED: `${DEVICES_LABEL} name is required`,
  NAME_INVALID: `Device name must be 1-${DEVICES_VALIDATION.NAME.MAX_LENGTH} characters and not empty`,

  DEVICE_TYPE_REQUIRED: `${DEVICES_LABEL} type is required`,
  DEVICE_TYPE_INVALID: `Device type must be one of: ${Object.values(DeviceType).join(', ')}`,

  ASSIGNED_TO_REQUIRED: `${DEVICES_LABEL} must be assigned to a user`,
  ASSIGNED_TO_INVALID: 'Assigned user ID is invalid',
  ASSIGNED_TO_NOT_FOUND: 'Assigned user not found',

  GPS_ACCURACY_REQUIRED: `${DEVICES_LABEL} GPS accuracy is required`,
  GPS_ACCURACY_INVALID: `GPS accuracy must be between ${DEVICES_VALIDATION.GPS_ACCURACY.MIN} and ${DEVICES_VALIDATION.GPS_ACCURACY.MAX}`,

  GEOFENCE_RADIUS_REQUIRED: `${DEVICES_LABEL} geofence radius is required`,
  GEOFENCE_RADIUS_INVALID: `Geofence radius must be between ${DEVICES_VALIDATION.GEOFENCE_RADIUS.MIN} and ${DEVICES_VALIDATION.GEOFENCE_RADIUS.MAX} meters`,

  LAST_SEEN_AT_INVALID: 'Last seen date must be a valid date',

  ACTIVE_STATUS_INVALID: 'Active status must be a boolean value (true or false)',

  CREATED_BY_REQUIRED: `${DEVICES_LABEL} manager is required`,
  CREATED_BY_INVALID: 'Manager user ID is invalid',
  CREATED_BY_NOT_FOUND: 'Manager user not found',

  GUID_INVALID: `GUID must be 1-${DEVICES_VALIDATION.GUID.MAX_LENGTH} characters`,
  GUID_GENERATION_FAILED: 'Failed to generate GUID',

  NOT_FOUND: `${DEVICES_LABEL} not found`,
  VALIDATION_FAILED: `${DEVICES_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${DEVICES_LABEL}`,
  UPDATE_FAILED: `Failed to update ${DEVICES_LABEL}`,
  DELETE_FAILED: `Failed to delete ${DEVICES_LABEL}`,

  DUPLICATE_DEVICE: `${DEVICES_LABEL} already exists`,

  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;

export const DEVICES_MESSAGES = {
  DELETED_SUCCESSFULLY: `${DEVICES_LABEL} deleted successfully`,
  REASSIGNED_SUCCESSFULLY: `${DEVICES_LABEL} reassigned successfully`,
  CONFIG_SUCCESSFULLY: `${DEVICES_LABEL} user configuration successfully`,
  LAST_SEEN_UPDATED: `${DEVICES_LABEL} last seen updated successfully`,
} as const;

export type DeviceError = (typeof DEVICES_ERRORS)[keyof typeof DEVICES_ERRORS];
export type DeviceCode = (typeof DEVICES_CODES)[keyof typeof DEVICES_CODES];
export type DeviceMessage = (typeof DEVICES_MESSAGES)[keyof typeof DEVICES_MESSAGES];
export type DeviceValidation = typeof DEVICES_VALIDATION;
