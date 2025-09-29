// constants/work.sessions.ts

export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ABANDONED = 'abandoned',
  CORRECTED = 'corrected',
}

export const WORK_SESSIONS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
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
  },
  LONGITUDE: {
    MIN: -180,
    MAX: 180,
    DECIMAL_PLACES: 8,
  },
  // MEMO: {
  //   MIN: 1,
  //   MAX: 2147483647,
  // },
} as const;

export const WORK_SESSIONS_DEFAULTS = {
  SESSION_STATUS: SessionStatus.OPEN,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const WORK_SESSIONS_CODES = {
  WORK_SESSION_ALREADY_EXISTS: 'work_session_already_exists',
  WORK_SESSION_NOT_FOUND: 'work_session_not_found',
  INVALID_GUID: 'invalid_guid',
  USER_REQUIRED: 'user_required',
  USER_INVALID: 'user_invalid',
  USER_NOT_FOUND: 'user_not_found',
  SITE_REQUIRED: 'site_required',
  SITE_INVALID: 'site_invalid',
  SITE_NOT_FOUND: 'site_not_found',
  SESSION_STATUS_INVALID: 'session_status_invalid',
  SESSION_START_REQUIRED: 'session_start_required',
  SESSION_START_INVALID: 'session_start_invalid',
  SESSION_END_INVALID: 'session_end_invalid',
  SESSION_DATES_LOGIC_INVALID: 'session_dates_logic_invalid',
  TOTAL_WORK_DURATION_INVALID: 'total_work_duration_invalid',
  TOTAL_PAUSE_DURATION_INVALID: 'total_pause_duration_invalid',
  START_LATITUDE_INVALID: 'start_latitude_invalid',
  START_LONGITUDE_INVALID: 'start_longitude_invalid',
  END_LATITUDE_INVALID: 'end_latitude_invalid',
  END_LONGITUDE_INVALID: 'end_longitude_invalid',
  COORDINATES_INCOMPLETE: 'coordinates_incomplete',
  // MEMO_INVALID: 'memo_invalid',
  // MEMO_NOT_FOUND: 'memo_not_found',
  SESSION_ALREADY_OPEN: 'session_already_open',
  SESSION_ALREADY_CLOSED: 'session_already_closed',
  SESSION_CANNOT_CLOSE: 'session_cannot_close',
  SESSION_CANNOT_ABANDON: 'session_cannot_abandon',
  SESSION_CANNOT_CORRECT: 'session_cannot_correct',
  FUTURE_SESSION_START: 'future_session_start',
  OVERLAPPING_SESSION: 'overlapping_session',
  GEOFENCE_VIOLATION: 'geofence_violation',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  REVISION_FAILED: 'revision_failed',
} as const;

const WORK_SESSIONS_LABEL = 'Work Session';
export const WORK_SESSIONS_ERRORS = {
  WORK_SESSION: WORK_SESSIONS_LABEL,

  USER_REQUIRED: `${WORK_SESSIONS_LABEL} user is required`,
  USER_INVALID: `User ID must be between ${WORK_SESSIONS_VALIDATION.USER.MIN} and ${WORK_SESSIONS_VALIDATION.USER.MAX}`,
  USER_NOT_FOUND: 'User not found',

  ID_REQUIRED: `${WORK_SESSIONS_LABEL} ID is required`,

  SITE_REQUIRED: `${WORK_SESSIONS_LABEL} site is required`,
  SITE_INVALID: `Site ID must be between ${WORK_SESSIONS_VALIDATION.SITE.MIN} and ${WORK_SESSIONS_VALIDATION.SITE.MAX}`,
  SITE_NOT_FOUND: 'Site not found',

  SESSION_STATUS_INVALID: `Session status must be one of: ${Object.values(SessionStatus).join(', ')}`,

  SESSION_START_REQUIRED: `${WORK_SESSIONS_LABEL} start date is required`,
  SESSION_START_INVALID: 'Session start date must be a valid date',
  SESSION_END_INVALID: 'Session end date must be a valid date',
  SESSION_DATES_LOGIC_INVALID: 'Session end date must be after start date',
  FUTURE_SESSION_START: 'Session start date cannot be in the future',

  TOTAL_WORK_DURATION_INVALID: 'Total work duration must be a valid PostgreSQL interval string',
  TOTAL_PAUSE_DURATION_INVALID: 'Total pause duration must be a valid PostgreSQL interval string',

  START_LATITUDE_INVALID: `Start latitude must be between ${WORK_SESSIONS_VALIDATION.LATITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LATITUDE.MAX}`,
  START_LONGITUDE_INVALID: `Start longitude must be between ${WORK_SESSIONS_VALIDATION.LONGITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LONGITUDE.MAX}`,
  END_LATITUDE_INVALID: `End latitude must be between ${WORK_SESSIONS_VALIDATION.LATITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LATITUDE.MAX}`,
  END_LONGITUDE_INVALID: `End longitude must be between ${WORK_SESSIONS_VALIDATION.LONGITUDE.MIN} and ${WORK_SESSIONS_VALIDATION.LONGITUDE.MAX}`,
  COORDINATES_INCOMPLETE: 'Both latitude and longitude must be provided together',
  GEOFENCE_VIOLATION: 'Session coordinates are outside the allowed site geofence',

  // MEMO_INVALID: `Memo ID must be between ${WORK_SESSIONS_VALIDATION.MEMO.MIN} and ${WORK_SESSIONS_VALIDATION.MEMO.MAX}`,
  // MEMO_NOT_FOUND: 'Memo not found',

  SESSION_ALREADY_OPEN: 'User already has an open session',
  SESSION_ALREADY_CLOSED: 'Session is already closed',
  SESSION_CANNOT_CLOSE: 'Cannot close session - invalid status transition',
  SESSION_CANNOT_ABANDON: 'Cannot abandon session - invalid status transition',
  SESSION_CANNOT_CORRECT: 'Cannot correct session - invalid status transition',
  OVERLAPPING_SESSION: 'Session overlaps with existing session for this user',

  GUID_INVALID: `GUID must be 1-${WORK_SESSIONS_VALIDATION.GUID.MAX_LENGTH} characters`,
  GUID_GENERATION_FAILED: 'Failed to generate GUID',
  NOT_FOUND: `${WORK_SESSIONS_LABEL} not found`,
  VALIDATION_FAILED: `${WORK_SESSIONS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${WORK_SESSIONS_LABEL}`,
  UPDATE_FAILED: `Failed to update ${WORK_SESSIONS_LABEL}`,
  DELETE_FAILED: `Failed to delete ${WORK_SESSIONS_LABEL}`,

  DUPLICATE_SESSION: `${WORK_SESSIONS_LABEL} already exists`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',
} as const;

export type WorkSessionError = (typeof WORK_SESSIONS_ERRORS)[keyof typeof WORK_SESSIONS_ERRORS];
export type WorkSessionCode = (typeof WORK_SESSIONS_CODES)[keyof typeof WORK_SESSIONS_CODES];
export type WorkSessionValidation = typeof WORK_SESSIONS_VALIDATION;
