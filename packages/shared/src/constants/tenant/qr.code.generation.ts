// constants/qr_code_generation.ts

export const QR_CODE_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  SITE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
  MANAGER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
    REQUIRED: true,
  },
} as const;

export const QR_CODE_DEFAULTS = {
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const QR_CODE_CODES = {
  QR_CODE_ALREADY_EXISTS: 'qr_code_already_exists',
  QR_CODE_NOT_FOUND: 'qr_code_not_found',
  INVALID_GUID: 'invalid_guid',
  SITE_REQUIRED: 'site_required',
  SITE_INVALID: 'site_invalid',
  SITE_NOT_FOUND: 'site_not_found',
  MANAGER_REQUIRED: 'manager_required',
  MANAGER_INVALID: 'manager_invalid',
  MANAGER_NOT_FOUND: 'manager_not_found',
  VALID_FROM_INVALID: 'valid_from_invalid',
  VALID_TO_INVALID: 'valid_to_invalid',
  VALID_FROM_AFTER_VALID_TO: 'valid_from_after_valid_to',
  VALID_FROM_IN_PAST: 'valid_from_in_past',
  QR_CODE_EXPIRED: 'qr_code_expired',
  QR_CODE_NOT_YET_VALID: 'qr_code_not_yet_valid',
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
  GENERATION_FAILED: 'generation_failed',
} as const;

const QR_CODE_LABEL = 'QR Code';
export const QR_CODE_ERRORS = {
  QR_CODE: QR_CODE_LABEL,

  SITE_REQUIRED: `${QR_CODE_LABEL} site is required`,
  SITE_INVALID: `Site ID must be between ${QR_CODE_VALIDATION.SITE.MIN_LENGTH} and ${QR_CODE_VALIDATION.SITE.MAX_LENGTH}`,
  SITE_NOT_FOUND: 'Site not found',

  MANAGER_REQUIRED: `${QR_CODE_LABEL} manager is required`,
  MANAGER_INVALID: `Manager ID must be between ${QR_CODE_VALIDATION.MANAGER.MIN_LENGTH} and ${QR_CODE_VALIDATION.MANAGER.MAX_LENGTH}`,
  MANAGER_NOT_FOUND: 'Manager not found',

  VALID_FROM_INVALID: 'Valid from date must be a valid date',
  VALID_TO_INVALID: 'Valid to date must be a valid date',
  VALID_FROM_AFTER_VALID_TO: 'Valid from date must be before valid to date',
  VALID_FROM_IN_PAST: 'Valid from date cannot be in the past',
  QR_CODE_EXPIRED: 'QR Code has expired',
  QR_CODE_NOT_YET_VALID: 'QR Code is not yet valid',

  GUID_INVALID: `GUID must be 1-${QR_CODE_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${QR_CODE_LABEL} not found`,
  VALIDATION_FAILED: `${QR_CODE_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${QR_CODE_LABEL}`,
  UPDATE_FAILED: `Failed to update ${QR_CODE_LABEL}`,
  DELETE_FAILED: `Failed to delete ${QR_CODE_LABEL}`,

  DUPLICATE_QR_CODE: `${QR_CODE_LABEL} already exists`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',

  GUID_GENERATION_FAILED: `Failed to generate GUID for ${QR_CODE_LABEL}`,
  ID_REQUIRED: `${QR_CODE_LABEL} id is required`,
};

export const QR_CODE_MESSAGES = {
  CREATED_SUCCESSFULLY: `${QR_CODE_LABEL} generated successfully`,
  DELETED_SUCCESSFULLY: `${QR_CODE_LABEL} deleted successfully`,
  UPDATED_SUCCESSFULLY: `${QR_CODE_LABEL} updated successfully`,
};

export type QrCodeError = (typeof QR_CODE_ERRORS)[keyof typeof QR_CODE_ERRORS];
export type QrCodeCode = (typeof QR_CODE_CODES)[keyof typeof QR_CODE_CODES];
export type QrCodeValidation = typeof QR_CODE_VALIDATION;
