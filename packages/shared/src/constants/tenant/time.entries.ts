// constants/time_entries.ts

export enum PointageType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  PAUSE_START = 'pause_start',
  PAUSE_END = 'pause_end',
  EXTERNAL_MISSION = 'external_mission',
}

export enum PointageStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CORRECTED = 'corrected',
  ACCOUNTED = 'accounted',
  REJECTED = 'rejected',
}

export const TIME_ENTRIES_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  SESSION: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  USER: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  SITE: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  LATITUDE: {
    MIN: -90,
    MAX: 90,
    DECIMAL_PLACES: 8,
    REQUIRED: true,
  },
  LONGITUDE: {
    MIN: -180,
    MAX: 180,
    DECIMAL_PLACES: 8,
    REQUIRED: true,
  },
  GPS_ACCURACY: {
    MIN: 1,
    MAX: 2147483647,
  },
  LOCAL_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  SYNC_ATTEMPTS: {
    MIN: 0,
    MAX: 2147483647,
  },
  MEMO: {
    MIN: 1,
    MAX: 2147483647,
  },
  CORRECTION_REASON: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 500,
  },
} as const;

export const TIME_ENTRIES_DEFAULTS = {
  POINTAGE_STATUS: PointageStatus.PENDING,
  CREATED_OFFLINE: false,
  SYNC_ATTEMPTS: 0,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const TIME_ENTRIES_CODES = {
  TIME_ENTRY_ALREADY_EXISTS: 'time_entry_already_exists',
  TIME_ENTRY_NOT_FOUND: 'time_entry_not_found',
  INVALID_GUID: 'invalid_guid',
  SESSION_REQUIRED: 'session_required',
  SESSION_INVALID: 'session_invalid',
  SESSION_NOT_FOUND: 'session_not_found',
  USER_REQUIRED: 'user_required',
  USER_INVALID: 'user_invalid',
  USER_NOT_FOUND: 'user_not_found',
  SITE_REQUIRED: 'site_required',
  SITE_INVALID: 'site_invalid',
  SITE_NOT_FOUND: 'site_not_found',
  POINTAGE_TYPE_REQUIRED: 'pointage_type_required',
  POINTAGE_TYPE_INVALID: 'pointage_type_invalid',
  POINTAGE_STATUS_INVALID: 'pointage_status_invalid',
  CLOCKED_AT_REQUIRED: 'clocked_at_required',
  CLOCKED_AT_INVALID: 'clocked_at_invalid',
  REAL_CLOCKED_AT_INVALID: 'real_clocked_at_invalid',
  LATITUDE_REQUIRED: 'latitude_required',
  LATITUDE_INVALID: 'latitude_invalid',
  LONGITUDE_REQUIRED: 'longitude_required',
  LONGITUDE_INVALID: 'longitude_invalid',
  GPS_ACCURACY_INVALID: 'gps_accuracy_invalid',
  DEVICE_INFO_INVALID: 'device_info_invalid',
  IP_ADDRESS_INVALID: 'ip_address_invalid',
  CREATED_OFFLINE_INVALID: 'created_offline_invalid',
  LOCAL_ID_INVALID: 'local_id_invalid',
  SYNC_ATTEMPTS_INVALID: 'sync_attempts_invalid',
  LAST_SYNC_ATTEMPT_INVALID: 'last_sync_attempt_invalid',
  MEMO_INVALID: 'memo_invalid',
  MEMO_NOT_FOUND: 'memo_not_found',
  CORRECTION_REASON_INVALID: 'correction_reason_invalid',
  CORRECTION_REASON_REQUIRED: 'correction_reason_required',
  DUPLICATE_POINTAGE: 'duplicate_pointage',
  INVALID_POINTAGE_SEQUENCE: 'invalid_pointage_sequence',
  CLOCK_IN_WITHOUT_CLOCK_OUT: 'clock_in_without_clock_out',
  CLOCK_OUT_WITHOUT_CLOCK_IN: 'clock_out_without_clock_in',
  PAUSE_WITHOUT_CLOCK_IN: 'pause_without_clock_in',
  GEOFENCE_VIOLATION: 'geofence_violation',
  FUTURE_POINTAGE: 'future_pointage',
  POINTAGE_TOO_OLD: 'pointage_too_old',
  STATUS_TRANSITION_INVALID: 'status_transition_invalid',
  OFFLINE_SYNC_CONFLICT: 'offline_sync_conflict',
  GPS_ACCURACY_TOO_LOW: 'gps_accuracy_too_low',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
  RETRIEVAL_FAILED: 'retry_failed',
  APPROVAL_FAILED: 'approval_failed',
  REJECTION_FAILED: 'rejection_failed',
  CORRECTION_FAILED: 'correction_failed',
  ANOMALY_DETECTION_FAILED: 'anomaly_detection_failed',
  STATISTICS_FAILED: 'statistics_failed',
  CANNOT_CLOCK_OUT: 'cannot_clock_out',
  INVALID_POINTAGE_TYPE: 'invalid_pointage_type',
} as const;

const TIME_ENTRIES_LABEL = 'Time Entry';
export const TIME_ENTRIES_ERRORS = {
  TIME_ENTRY: TIME_ENTRIES_LABEL,

  SESSION_REQUIRED: `${TIME_ENTRIES_LABEL} session is required`,
  SESSION_INVALID: `Session ID must be between ${TIME_ENTRIES_VALIDATION.SESSION.MIN} and ${TIME_ENTRIES_VALIDATION.SESSION.MAX}`,
  SESSION_NOT_FOUND: 'Work session not found',

  USER_REQUIRED: `${TIME_ENTRIES_LABEL} user is required`,
  USER_INVALID: `User ID must be between ${TIME_ENTRIES_VALIDATION.USER.MIN} and ${TIME_ENTRIES_VALIDATION.USER.MAX}`,
  USER_NOT_FOUND: 'User not found',

  SITE_REQUIRED: `${TIME_ENTRIES_LABEL} site is required`,
  SITE_INVALID: `Site ID must be between ${TIME_ENTRIES_VALIDATION.SITE.MIN} and ${TIME_ENTRIES_VALIDATION.SITE.MAX}`,
  SITE_NOT_FOUND: 'Site not found',

  POINTAGE_TYPE_REQUIRED: `${TIME_ENTRIES_LABEL} pointage type is required`,
  POINTAGE_TYPE_INVALID: `Pointage type must be one of: ${Object.values(PointageType).join(', ')}`,

  POINTAGE_STATUS_INVALID: `Pointage status must be one of: ${Object.values(PointageStatus).join(', ')}`,

  CLOCKED_AT_REQUIRED: `${TIME_ENTRIES_LABEL} clocked at date is required`,
  CLOCKED_AT_INVALID: 'Clocked at date must be a valid date',
  REAL_CLOCKED_AT_INVALID: 'Real clocked at date must be a valid date',
  FUTURE_POINTAGE: 'Pointage cannot be in the future',
  POINTAGE_TOO_OLD: 'Pointage is too old to be accepted',

  LATITUDE_REQUIRED: `${TIME_ENTRIES_LABEL} latitude is required`,
  LATITUDE_INVALID: `Latitude must be between ${TIME_ENTRIES_VALIDATION.LATITUDE.MIN} and ${TIME_ENTRIES_VALIDATION.LATITUDE.MAX}`,
  LONGITUDE_REQUIRED: `${TIME_ENTRIES_LABEL} longitude is required`,
  LONGITUDE_INVALID: `Longitude must be between ${TIME_ENTRIES_VALIDATION.LONGITUDE.MIN} and ${TIME_ENTRIES_VALIDATION.LONGITUDE.MAX}`,
  GEOFENCE_VIOLATION: 'Pointage coordinates are outside the allowed site geofence',

  GPS_ACCURACY_INVALID: `GPS accuracy must be between ${TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MIN} and ${TIME_ENTRIES_VALIDATION.GPS_ACCURACY.MAX}`,
  GPS_ACCURACY_TOO_LOW: 'GPS accuracy is too low for reliable time tracking',

  DEVICE_INFO_INVALID: 'Device information must be a valid JSON object',
  IP_ADDRESS_INVALID: 'IP address must be a valid IPv4 or IPv6 address',

  CREATED_OFFLINE_INVALID: 'Created offline must be a boolean value (true or false)',

  LOCAL_ID_INVALID: `Local ID must be 1-${TIME_ENTRIES_VALIDATION.LOCAL_ID.MAX_LENGTH} characters`,

  SYNC_ATTEMPTS_INVALID: `Sync attempts must be between ${TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MIN} and ${TIME_ENTRIES_VALIDATION.SYNC_ATTEMPTS.MAX}`,
  LAST_SYNC_ATTEMPT_INVALID: 'Last sync attempt must be a valid date',
  OFFLINE_SYNC_CONFLICT: 'Conflict detected during offline synchronization',

  MEMO_INVALID: `Memo ID must be between ${TIME_ENTRIES_VALIDATION.MEMO.MIN} and ${TIME_ENTRIES_VALIDATION.MEMO.MAX}`,
  MEMO_NOT_FOUND: 'Memo not found',

  CORRECTION_REASON_REQUIRED: 'Correction reason is required for corrected entries',
  CORRECTION_REASON_INVALID: `Correction reason must be between ${TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MIN_LENGTH} and ${TIME_ENTRIES_VALIDATION.CORRECTION_REASON.MAX_LENGTH} characters`,

  DUPLICATE_POINTAGE: 'Duplicate pointage detected for the same time period',
  INVALID_POINTAGE_SEQUENCE: 'Invalid pointage sequence - check clock in/out order',
  CLOCK_IN_WITHOUT_CLOCK_OUT: 'Previous clock in must be closed before new clock in',
  CLOCK_OUT_WITHOUT_CLOCK_IN: 'Clock out requires an active clock in',
  PAUSE_WITHOUT_CLOCK_IN: 'Pause requires an active work session',

  STATUS_TRANSITION_INVALID: 'Invalid status transition',

  GUID_INVALID: `GUID must be 1-${TIME_ENTRIES_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${TIME_ENTRIES_LABEL} not found`,
  VALIDATION_FAILED: `${TIME_ENTRIES_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${TIME_ENTRIES_LABEL}`,
  UPDATE_FAILED: `Failed to update ${TIME_ENTRIES_LABEL}`,
  DELETE_FAILED: `Failed to delete ${TIME_ENTRIES_LABEL}`,

  DUPLICATE_ENTRY: `${TIME_ENTRIES_LABEL} already exists`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
  GUID_GENERATION_FAILED: `Failed to generate GUID for ${TIME_ENTRIES_LABEL}`,
  ID_REQUIRED: `${TIME_ENTRIES_LABEL} id is required`,
} as const;

export const TIME_ENTRIES_MESSAGES = {
  CREATED_SUCCESSFULLY: `${TIME_ENTRIES_LABEL} created successfully`,
  DELETED_SUCCESSFULLY: `${TIME_ENTRIES_LABEL} deleted successfully`,
  CLOCK_IN_SUCCESS: `${TIME_ENTRIES_LABEL} clock-in successful`,
};

export type TimeEntryError = (typeof TIME_ENTRIES_ERRORS)[keyof typeof TIME_ENTRIES_ERRORS];
export type TimeEntryMessage = (typeof TIME_ENTRIES_MESSAGES)[keyof typeof TIME_ENTRIES_MESSAGES];
export type TimeEntryCode = (typeof TIME_ENTRIES_CODES)[keyof typeof TIME_ENTRIES_CODES];
export type TimeEntryValidation = typeof TIME_ENTRIES_VALIDATION;
