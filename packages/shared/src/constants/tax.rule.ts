// constants/tax.rule.ts
export const TAX_RULE_VALIDATION = {
  COUNTRY_CODE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 3,
    PATTERN_2: /^[A-Z]{2}$/,
    PATTERN_3: /^[A-Z]{3}$/,
  },
  TAX_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]{1,20}$/,
  },
  TAX_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  TAX_RATE: {
    MIN_VALUE: 0,
    MAX_VALUE: 1,
    DECIMAL_PLACES: 4,
  },
  APPLIES_TO: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]{1,20}$/,
    DEFAULT: 'license_fee',
  },
  GUID: {
    LENGTH: 6,
    MIN_VALUE: 100000,
    MAX_VALUE: 999999,
  },
} as const;

export const TAX_RULE_DEFAULTS = {
  ACTIVE: true,
  REQUIRED_TAX_NUMBER: true,
  APPLIES_TO: 'license_fee',
  PAGINATION: {
    OFFSET: 0,
    LIMIT: 50,
    MAX_LIMIT: 500,
  },
} as const;

export const TAX_RULE_CODES = {
  TAX_RULE_ALREADY_EXISTS: 'tax_rule_already_exists',
  TAX_RULE_NOT_FOUND: 'tax_rule_not_found',
  INVALID_GUID: 'invalid_guid',
  COUNTRY_CODE_INVALID: 'country_code_invalid',
  TAX_TYPE_INVALID: 'tax_type_invalid',
  TAX_NAME_INVALID: 'tax_name_invalid',
  TAX_RATE_INVALID: 'tax_rate_invalid',
  APPLIES_TO_INVALID: 'applies_to_invalid',
  DATE_INVALID: 'date_invalid',
  VALIDATION_FAILED: 'validation_failed',
  CREATION_FAILED: 'creation_failed',
  UPDATE_FAILED: 'update_failed',
  DELETE_FAILED: 'delete_failed',
  EXPORT_FAILED: 'export_failed',
  SEARCH_FAILED: 'search_failed',
  LISTING_FAILED: 'listing_failed',
  FILTER_INVALID: 'filter_invalid',
  PAGINATION_INVALID: 'pagination_invalid',
  STATUS_SEARCH_FAILED: 'status_search_failed',
  COUNTRY_CODE_REQUIRED: 'country_code_required',
  TAX_TYPE_REQUIRED: 'tax_type_required',
  TAX_NAME_REQUIRED: 'tax_name_required',
  TAX_RATE_REQUIRED: 'tax_rate_required',
  APPLIES_TO_REQUIRED: 'applies_to_required',
} as const;

const TAX_RULE_LABEL = 'Tax Rule';
export const TAX_RULE_ERRORS = {
  TAX_RULE: TAX_RULE_LABEL,

  COUNTRY_CODE_REQUIRED: `${TAX_RULE_LABEL} country code is required`,
  COUNTRY_CODE_INVALID: 'Country code must be 2 or 3 uppercase letters (ISO 3166-1)',

  TAX_TYPE_REQUIRED: `${TAX_RULE_LABEL} tax type is required`,
  TAX_TYPE_INVALID: `Tax type must be between ${TAX_RULE_VALIDATION.TAX_TYPE.MIN_LENGTH} and ${TAX_RULE_VALIDATION.TAX_TYPE.MAX_LENGTH} alphanumeric characters with underscores`,

  TAX_NAME_REQUIRED: `${TAX_RULE_LABEL} tax name is required`,
  TAX_NAME_INVALID: `Tax name must be between ${TAX_RULE_VALIDATION.TAX_NAME.MIN_LENGTH} and ${TAX_RULE_VALIDATION.TAX_NAME.MAX_LENGTH} characters`,

  TAX_RATE_REQUIRED: `${TAX_RULE_LABEL} tax rate is required`,
  TAX_RATE_INVALID: `Tax rate must be a decimal between ${TAX_RULE_VALIDATION.TAX_RATE.MIN_VALUE} and ${TAX_RULE_VALIDATION.TAX_RATE.MAX_VALUE}`,

  APPLIES_TO_REQUIRED: `${TAX_RULE_LABEL} applies_to field is required`,
  APPLIES_TO_INVALID: `Applies_to must be between ${TAX_RULE_VALIDATION.APPLIES_TO.MIN_LENGTH} and ${TAX_RULE_VALIDATION.APPLIES_TO.MAX_LENGTH} alphanumeric characters with underscores`,

  EFFECTIVE_DATE_INVALID: 'Effective date must be a valid date',
  EXPIRY_DATE_INVALID: 'Expiry date must be a valid date',
  DATE_RANGE_INVALID: 'Expiry date must be after effective date',

  INVALID_BOOLEAN: 'Invalid boolean value',

  GUID_INVALID: 'GUID must be a 6-digit number',
  NOT_FOUND: 'Tax rule not found',

  CREATION_FAILED: 'Failed to create tax rule',
  UPDATE_FAILED: 'Failed to update tax rule',
  DELETE_FAILED: 'Failed to delete tax rule',
  EXPORT_FAILED: 'Failed to export tax rules',

  DUPLICATE_RULE: 'Tax rule with this combination already exists',
  CONFLICTING_DATES: 'Tax rule dates conflict with existing rules',
} as const;

export type TaxRuleError = (typeof TAX_RULE_ERRORS)[keyof typeof TAX_RULE_ERRORS];
export type TaxRuleCode = (typeof TAX_RULE_CODES)[keyof typeof TAX_RULE_CODES];
