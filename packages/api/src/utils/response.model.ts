import G from '../tools/glossary.js';

export const responseModel = ['min', 'full'] as const;

export type ViewMode = (typeof responseModel)[number];

export const responseValue = {
  MINIMAL: 'min',
  FULL: 'full',
} as const;

export const responseStructure = {
  ID: 'id',
  GUID: 'guid',
  CODE: 'code',
  NAME_EN: 'name_en',
  NAME_LOCAL: 'name_local',
  DEFAULT_CURRENCY_CODE: 'default_currency_code',
  DEFAULT_LANGUAGE_CODE: 'default_language_code',
  IS_ACTIVE: 'is_active',
  ACTIVE: 'active',
  TIMEZONE_DEFAULT: 'timezone_default',
  PHONE_PREFIX: 'phone_prefix',

  NAME: 'name',
  SYMBOL: 'symbol',
  DECIMAL_PLACES: 'decimal_places',

  FROM_CURRENCY_CODE: 'from_currency_code',
  TO_CURRENCY_CODE: 'to_currency_code',
  EXCHANGE_RATE: 'exchange_rate',
  IS_CURRENT: 'is_current',
  CREATED_BY: 'created_by',

  COUNTRY_CODE: 'country_code',
  TAX_TYPE: 'tax_type',
  TAX_NAME: 'tax_name',
  TAX_RATE: 'tax_rate',
  APPLIES_TO: 'applies_to',
  REQUIRED_TAX_NUMBER: 'required_tax_number',
  EFFECTIVE_DATE: 'effective_date',
  EXPIRY_DATE: 'expiry_date',

  KEY: 'key',
  PRIMARY_CURRENCY_CODE: 'primary_currency_code',
  PREFERRED_LANGUAGE_CODE: 'preferred_language_code',
  TIMEZONE: 'timezone',
  TAX_NUMBER: 'tax_number',
  TAX_EXEMPT: 'tax_exempt',
  BILLING_EMAIL: 'billing_email',
  BILLING_ADDRESS: 'billing_address',
  BILLING_PHONE: 'billing_phone',
  STATUS: 'status',
  SUBDOMAIN: 'subdomain',
  DATABASE_NAME: 'database_name',
  DATABASE_USERNAME: 'database_username',
  SHORT_NAME: 'short_name',
  REGISTRATION_NUMBER: 'registration_number',
  EMPLOYEE_COUNT: 'employee_count',

  TENANT: 'tenant',
  LICENSE_TYPE: 'license_type',
  BILLING_CYCLE_MONTHS: 'billing_cycle_months',
  BASE_PRICE_USD: 'base_price_usd',
  MINIMUM_SEATS: 'minimum_seats',
  CURRENT_PERIOD_START: 'current_period_start',
  CURRENT_PERIOD_END: 'current_period_end',
  NEXT_RENEWAL_DATE: 'next_renewal_date',
  TOTAL_SEATS_PURCHASED: 'total_seats_purchased',
  LICENSE_STATUS: 'license_status',

  GLOBAL_LICENSE: 'global_license',

  PORTABLE: 'portable',
  REFERENCE: 'reference',
  TRANSLATION: 'transcription',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',

  EMPLOYEE: 'employee',
  EMPLOYEE_CODE: 'employee_code',
  ACTIVATION_DATE: 'activation_date',
  DEACTIVATION_DATE: 'deactivation_date',
  LAST_ACTIVITY_DATE: 'last_activity_date',
  CONTRACTUAL_STATUS: 'contractual_status',
  DECLARED_LONG_LEAVE: 'declared_long_leave',
  LONG_LEAVE_DECLARED_BY: 'long_leave_declared_by',
  LONG_LEAVE_DECLARED_AT: 'long_leave_declared_at',
  LONG_LEAVE_TYPE: 'long_leave_type',
  LONG_LEAVE_REASON: 'long_leave_reason',
  COMPUTED_BILLING_STATUS: 'computed_billing_status',
  GRACE_PERIOD_START: 'grace_period_start',
  GRACE_PERIOD_END: 'grace_period_end',
} as const;

export const tableName = {
  COUNTRY: `${G.tableConf}_country`,
  CURRENCY: `${G.tableConf}_currency`,
  EXCHANGE_RATE: `${G.tableConf}_exchange_rate`,
  LANGUAGE: `${G.tableConf}_language`,
  TAX_RULE: `${G.tableConf}_tax_rule`,
  LEXICON: `${G.tableConf}_lexicon`,

  TENANT: `${G.tableAp}_tenant`,
  GLOBAL_LICENSE: `${G.tableAp}_global_license`,
  EMPLOYEE_LICENSE: `${G.tableAp}_employee_license`,
} as const;

export const EntityRoute = {
  MASTER: 'l',
  TENANT: 'p',
} as const;
