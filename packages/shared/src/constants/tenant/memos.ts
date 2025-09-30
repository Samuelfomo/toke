// constants/memos.ts

export enum MemoType {
  DELAY_JUSTIFICATION = 'delay_justification',
  ABSENCE_JUSTIFICATION = 'absence_justification',
  CORRECTION_REQUEST = 'correction_request',
  SESSION_CLOSURE = 'session_closure',
  AUTO_GENERATED = 'auto_generated',
}

export enum MemoStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const MEMOS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  AUTHOR_USER: {
    MIN: 1,
    MAX: 2147483647,
    REQUIRED: true,
  },
  TARGET_USER: {
    MIN: 1,
    MAX: 2147483647,
  },
  VALIDATOR_USER: {
    MIN: 1,
    MAX: 2147483647,
  },
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
    REQUIRED: true,
  },
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: Infinity,
    REQUIRED: true,
  },
  AFFECTED_SESSION: {
    MIN: 1,
    MAX: 2147483647,
  },
  AFFECTED_ENTRIES: {
    MIN_ID: 1,
    MAX_ID: 2147483647,
  },
  VALIDATOR_COMMENTS: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 65535,
  },
  AUTO_REASON: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  },
} as const;

export const MEMOS_DEFAULTS = {
  MEMO_STATUS: MemoStatus.DRAFT,
  AUTO_GENERATED: false,
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const MEMOS_CODES = {
  MEMO_ALREADY_EXISTS: 'memo_already_exists',
  MEMO_NOT_FOUND: 'memo_not_found',
  INVALID_GUID: 'invalid_guid',
  AUTHOR_USER_REQUIRED: 'author_user_required',
  AUTHOR_USER_INVALID: 'author_user_invalid',
  AUTHOR_USER_NOT_FOUND: 'author_user_not_found',
  TARGET_USER_INVALID: 'target_user_invalid',
  TARGET_USER_NOT_FOUND: 'target_user_not_found',
  VALIDATOR_USER_INVALID: 'validator_user_invalid',
  VALIDATOR_USER_NOT_FOUND: 'validator_user_not_found',
  MEMO_TYPE_REQUIRED: 'memo_type_required',
  MEMO_TYPE_INVALID: 'memo_type_invalid',
  MEMO_STATUS_INVALID: 'memo_status_invalid',
  TITLE_REQUIRED: 'title_required',
  TITLE_INVALID: 'title_invalid',
  DESCRIPTION_REQUIRED: 'description_required',
  DESCRIPTION_INVALID: 'description_invalid',
  INCIDENT_DATETIME_INVALID: 'incident_datetime_invalid',
  AFFECTED_SESSION_INVALID: 'affected_session_invalid',
  AFFECTED_SESSION_NOT_FOUND: 'affected_session_not_found',
  AFFECTED_ENTRIES_INVALID: 'affected_entries_invalid',
  AFFECTED_ENTRIES_NOT_FOUND: 'affected_entries_not_found',
  ATTACHMENTS_INVALID: 'attachments_invalid',
  ATTACHMENTS_URL_INVALID: 'attachments_url_invalid',
  VALIDATOR_COMMENTS_INVALID: 'validator_comments_invalid',
  VALIDATOR_COMMENTS_REQUIRED: 'validator_comments_required',
  PROCESSED_AT_INVALID: 'processed_at_invalid',
  AUTO_GENERATED_INVALID: 'auto_generated_invalid',
  AUTO_REASON_INVALID: 'auto_reason_invalid',
  AUTO_REASON_REQUIRED: 'auto_reason_required',
  SELF_VALIDATION_NOT_ALLOWED: 'self_validation_not_allowed',
  INVALID_STATUS_TRANSITION: 'invalid_status_transition',
  VALIDATION_REQUIRED_FOR_APPROVAL: 'validation_required_for_approval',
  CANNOT_MODIFY_PROCESSED_MEMO: 'cannot_modify_processed_memo',
  FUTURE_INCIDENT_DATE: 'future_incident_date',
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
} as const;

const MEMOS_LABEL = 'Memo';
export const MEMOS_ERRORS = {
  MEMO: MEMOS_LABEL,

  AUTHOR_USER_REQUIRED: `${MEMOS_LABEL} author user is required`,
  AUTHOR_USER_INVALID: `Author user ID must be between ${MEMOS_VALIDATION.AUTHOR_USER.MIN} and ${MEMOS_VALIDATION.AUTHOR_USER.MAX}`,
  AUTHOR_USER_NOT_FOUND: 'Author user not found',

  TARGET_USER_INVALID: `Target user ID must be between ${MEMOS_VALIDATION.TARGET_USER.MIN} and ${MEMOS_VALIDATION.TARGET_USER.MAX}`,
  TARGET_USER_NOT_FOUND: 'Target user not found',

  VALIDATOR_USER_INVALID: `Validator user ID must be between ${MEMOS_VALIDATION.VALIDATOR_USER.MIN} and ${MEMOS_VALIDATION.VALIDATOR_USER.MAX}`,
  VALIDATOR_USER_NOT_FOUND: 'Validator user not found',

  MEMO_TYPE_REQUIRED: `${MEMOS_LABEL} type is required`,
  MEMO_TYPE_INVALID: `Memo type must be one of: ${Object.values(MemoType).join(', ')}`,

  MEMO_STATUS_INVALID: `Memo status must be one of: ${Object.values(MemoStatus).join(', ')}`,

  TITLE_REQUIRED: `${MEMOS_LABEL} title is required`,
  TITLE_INVALID: `Memo title must be 1-${MEMOS_VALIDATION.TITLE.MAX_LENGTH} characters`,

  DESCRIPTION_REQUIRED: `${MEMOS_LABEL} description is required`,
  DESCRIPTION_INVALID: `Memo description must be at least ${MEMOS_VALIDATION.DESCRIPTION.MIN_LENGTH} characters`,

  INCIDENT_DATETIME_INVALID: 'Incident date and time must be a valid date',
  FUTURE_INCIDENT_DATE: 'Incident date cannot be in the future',

  AFFECTED_SESSION_INVALID: `Affected session ID must be between ${MEMOS_VALIDATION.AFFECTED_SESSION.MIN} and ${MEMOS_VALIDATION.AFFECTED_SESSION.MAX}`,
  AFFECTED_SESSION_NOT_FOUND: 'Affected work session not found',

  AFFECTED_ENTRIES_INVALID: `Affected entries must be an array of valid IDs between ${MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_ID} and ${MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_ID}`,
  AFFECTED_ENTRIES_NOT_FOUND: 'One or more affected entries not found',

  ATTACHMENTS_INVALID: 'Attachments must be an array of valid URLs',
  ATTACHMENTS_URL_INVALID: 'All attachments must be valid HTTPS URLs',

  VALIDATOR_COMMENTS_INVALID: `Validator comments must be between ${MEMOS_VALIDATION.VALIDATOR_COMMENTS.MIN_LENGTH} and ${MEMOS_VALIDATION.VALIDATOR_COMMENTS.MAX_LENGTH} characters`,
  VALIDATOR_COMMENTS_REQUIRED: 'Validator comments are required when approving or rejecting',

  PROCESSED_AT_INVALID: 'Processed date must be a valid date',

  AUTO_GENERATED_INVALID: 'Auto generated must be a boolean value (true or false)',
  AUTO_REASON_INVALID: `Auto reason must be 1-${MEMOS_VALIDATION.AUTO_REASON.MAX_LENGTH} characters`,
  AUTO_REASON_REQUIRED: 'Auto reason is required for auto-generated memos',

  SELF_VALIDATION_NOT_ALLOWED: 'Users cannot validate their own memos',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
  VALIDATION_REQUIRED_FOR_APPROVAL: 'Validator user is required for approval or rejection',
  CANNOT_MODIFY_PROCESSED_MEMO: 'Cannot modify processed (approved/rejected) memos',

  GUID_INVALID: `GUID must be 1-${MEMOS_VALIDATION.GUID.MAX_LENGTH} characters`,
  NOT_FOUND: `${MEMOS_LABEL} not found`,
  VALIDATION_FAILED: `${MEMOS_LABEL} validation failed`,

  CREATION_FAILED: `Failed to create ${MEMOS_LABEL}`,
  UPDATE_FAILED: `Failed to update ${MEMOS_LABEL}`,
  DELETE_FAILED: `Failed to delete ${MEMOS_LABEL}`,

  DUPLICATE_MEMO: `${MEMOS_LABEL} already exists`,

  INVALID_DATE_FORMAT: 'Invalid date format provided',
  PAGINATION_INVALID: 'Invalid pagination parameters',

  GUID_GENERATION_FAILED: `Failed to generate GUID for ${MEMOS_LABEL}`,
  ID_REQUIRED: `${MEMOS_LABEL} id is required`,
} as const;

export type MemoError = (typeof MEMOS_ERRORS)[keyof typeof MEMOS_ERRORS];
export type MemoCode = (typeof MEMOS_CODES)[keyof typeof MEMOS_CODES];
export type MemoValidation = typeof MEMOS_VALIDATION;
