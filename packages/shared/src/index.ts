// shared/src/index.ts

// Export des types
export * from './types/country.js';
export * from './types/common.js';
export * from './types/currency.js';
export * from './types/exchange.rate.js';
export * from './types/language.js';
export * from './types/tax.rule.js';

// Export des constantes
export * from './constants/api.js';
export * from './constants/http.status.js';
export * from './constants/country.js';
export * from './constants/currency.js';
export * from './constants/exchange.rate.js';
export * from './constants/language.js';
export * from './constants/tax.rule.js';
export * from './constants/tenant.js';
export * from './constants/global.license.js';
export * from './constants/lexicon.js';
export * from './constants/employee.license.js';
export * from './constants/billing.cycle.js';

// Export des schémas
export * from './schemas/country.js';
export * as currencySchemas from './schemas/currency.js';
export * as ER from './schemas/exchange.rate.js';
export * as LS from './schemas/language.js';
export * as TR from './schemas/tax.rule.js';
export * as TN from './schemas/tenant.js';
export * as GL from './schemas/global.license.js';
export * as LX from './schemas/lexicon.js';
export * as EL from './schemas/employee.license.js';
export * as BC from './schemas/billing.cycle.js';

// Export des utilitaires
export * from './utils/country.validation.js';
export * from './utils/country.formatting.js';
export * from './utils/currency.validation.js';
export * from './utils/exchange.rate.validation.js';
export * from './utils/language.validation.js';
export * from './utils/tax.rule.validation.js';
export * from './utils/tenant.validation.js';
export * from './utils/global.license.validation.js';
export * from './utils/lexicon.validation.js';
export * from './utils/employee.license.validation.js';
export * from './utils/billing.cycle.validation.js';
