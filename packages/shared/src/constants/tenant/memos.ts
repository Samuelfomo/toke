// constants/memos.ts

export enum MemoType {
  DELAY_JUSTIFICATION = 'delay_justification',
  ABSENCE_JUSTIFICATION = 'absence_justification',
  CORRECTION_REQUEST = 'correction_request',
  SESSION_CLOSURE = 'session_closure',
  AUTO_GENERATED = 'auto_generated',
  OTHER = 'other',
}

export enum MemoStatus {
  SUBMITTED = 'submitted',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum MessageType {
  LINK = 'link',
  TEXT = 'text',
}

export type ViewMessage = (typeof MessageType)[keyof typeof MessageType];

export const MEMOS_VALIDATION = {
  GUID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  AUTHOR_USER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  TARGET_USER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  VALIDATOR_USER: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
    REQUIRED: true,
  },
  DETAILS: {
    MIN_LENGTH: 10,
    MAX_LENGTH: Infinity,
  },
  AFFECTED_SESSION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  AFFECTED_ENTRIES: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  VALIDATOR_COMMENTS: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 65535,
  },
} as const;

export const MEMOS_DEFAULTS = {
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
  TARGET_USER_REQUIRED: 'target_user_required',
  TARGET_USER_INVALID: 'target_user_invalid',
  TARGET_USER_NOT_FOUND: 'target_user_not_found',
  VALIDATOR_USER_INVALID: 'validator_user_invalid',
  VALIDATOR_USER_NOT_FOUND: 'validator_user_not_found',
  MEMO_TYPE_REQUIRED: 'memo_type_required',
  MEMO_TYPE_INVALID: 'memo_type_invalid',
  MEMO_STATUS_INVALID: 'memo_status_invalid',
  TITLE_REQUIRED: 'title_required',
  TITLE_INVALID: 'title_invalid',
  MEMO_CONTENT_REQUIRED: 'memo_content_required',
  MEMO_CONTENT_INVALID: 'memo_content_invalid',
  DETAILS_INVALID: 'details_invalid',
  INCIDENT_DATETIME_INVALID: 'incident_datetime_invalid',
  AFFECTED_SESSION_INVALID: 'affected_session_invalid',
  AFFECTED_SESSION_NOT_FOUND: 'affected_session_not_found',
  AFFECTED_ENTRIES_INVALID: 'affected_entries_invalid',
  AFFECTED_ENTRIES_NOT_FOUND: 'affected_entries_not_found',
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
  SUBMISSION_FAILED: 'submission_failed',
  APPROVAL_FAILED: 'approval_failed',
  REJECTION_FAILED: 'rejection_failed',
  ESCALATION_FAILED: 'escalation_failed',
  ADD_CONTENT_FAILED: 'add_content_failed',
  ANALYSIS_FAILED: 'analysis_failed',
  STATISTICS_FAILED: 'statistics_failed',
  RESPONSE_FAILED: 'response_failed',
  CANNOT_RESPOND_TO_OWN_MEMO: 'cannot_respond_to_own_memo',
  ALREADY_RESPONDED: 'already_responded',
  ACTION_NOT_ALLOWED: 'action_not_allowed',
} as const;

const MEMOS_LABEL = 'Memo';
export const MEMOS_ERRORS = {
  MEMO: MEMOS_LABEL,

  AUTHOR_USER_REQUIRED: `${MEMOS_LABEL} author user is required`,
  AUTHOR_USER_INVALID: `Author user ID must be between ${MEMOS_VALIDATION.AUTHOR_USER.MIN_LENGTH} and ${MEMOS_VALIDATION.AUTHOR_USER.MAX_LENGTH}`,
  AUTHOR_USER_NOT_FOUND: 'Author user not found',

  TARGET_USER_REQUIRED: `${MEMOS_LABEL} target user is required`,
  TARGET_USER_INVALID: `Target user ID must be between ${MEMOS_VALIDATION.TARGET_USER.MIN_LENGTH} and ${MEMOS_VALIDATION.TARGET_USER.MAX_LENGTH}`,
  TARGET_USER_NOT_FOUND: 'Target user not found',

  VALIDATOR_USER_INVALID: `Validator user ID must be between ${MEMOS_VALIDATION.VALIDATOR_USER.MIN_LENGTH} and ${MEMOS_VALIDATION.VALIDATOR_USER.MAX_LENGTH}`,
  VALIDATOR_USER_NOT_FOUND: 'Validator user not found',
  VALIDATOR_USER_REQUIRED: 'Validator user is required',

  MEMO_TYPE_REQUIRED: `${MEMOS_LABEL} type is required`,
  MEMO_TYPE_INVALID: `Memo type must be one of: ${Object.values(MemoType).join(', ')}`,

  MEMO_STATUS_INVALID: `Memo status must be one of: ${Object.values(MemoStatus).join(', ')}`,

  TITLE_REQUIRED: `${MEMOS_LABEL} title is required`,
  TITLE_INVALID: `Memo title must be 1-${MEMOS_VALIDATION.TITLE.MAX_LENGTH} characters`,

  MEMO_CONTENT_REQUIRED: `${MEMOS_LABEL} content is required`,
  MEMO_CONTENT_INVALID: `${MEMOS_LABEL} each content item must have: user, message`,

  DETAILS_INVALID: `System details must be at least ${MEMOS_VALIDATION.DETAILS.MIN_LENGTH} characters`,

  INCIDENT_DATETIME_INVALID: 'Incident date and time must be a valid date',
  FUTURE_INCIDENT_DATE: 'Incident date cannot be in the future',

  AFFECTED_SESSION_INVALID: `Affected session ID must be between ${MEMOS_VALIDATION.AFFECTED_SESSION.MIN_LENGTH} and ${MEMOS_VALIDATION.AFFECTED_SESSION.MAX_LENGTH}`,
  AFFECTED_SESSION_NOT_FOUND: 'Affected work session not found',

  AFFECTED_ENTRIES_INVALID: `Affected entries must be an array of valid IDs between ${MEMOS_VALIDATION.AFFECTED_ENTRIES.MIN_LENGTH} and ${MEMOS_VALIDATION.AFFECTED_ENTRIES.MAX_LENGTH}`,
  AFFECTED_ENTRIES_NOT_FOUND: 'One or more affected entries not found',

  PROCESSED_AT_INVALID: 'Processed date must be a valid date',

  SELF_VALIDATION_NOT_ALLOWED: 'Users cannot validate their own memos',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
  VALIDATION_REQUIRED_FOR_APPROVAL: 'Validator user is required for validation or rejection',
  CANNOT_MODIFY_PROCESSED_MEMO: 'Cannot modify processed (validated/rejected/closed) memos',

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

  CANNOT_RESPOND_TO_OWN_MEMO: 'Cannot respond to your own employee request memo',
  ALREADY_RESPONDED: 'This memo has already been responded to',
  RESPONSE_FAILED: 'Failed to submit response',
  ACTION_NOT_ALLOWED: 'Action not allowed on approved or rejected memo',
  MESSAGE_TYPE_REQUIRED: 'Message type is required',
  MESSAGE_TYPE_INVALID: 'Message type must be TEXT or LINK',
  NOT_EMPTY_CONTENT: 'Content cannot be empty',
  INVALID_ATTACTMENT_LINK: 'Each link must be a valid URL',
  NOT_ALLOWED: 'This action is not permitted',
};

export const MEMOS_MESSAGES = {
  DELETED_SUCCESSFULLY: `${MEMOS_LABEL} deleted successfully`,
  APPROVED_SUCCESSFULLY: `${MEMOS_LABEL} approved successfully`,
  REJECTED_SUCCESSFULLY: `${MEMOS_LABEL} rejected successfully`,
  RESPONDED_SUCCESSFULLY: `${MEMOS_LABEL} response submitted successfully`,
  SUBMITTED_SUCCESSFULLY: `${MEMOS_LABEL} submitted successfully`,
};

export type MemoError = (typeof MEMOS_ERRORS)[keyof typeof MEMOS_ERRORS];
export type MemoCode = (typeof MEMOS_CODES)[keyof typeof MEMOS_CODES];
export type MemoValidation = typeof MEMOS_VALIDATION;
