// utils/tenant.validation.ts
import { Status, TENANT_VALIDATION } from '../constants/tenant.js';

export class TenantValidationUtils {
  /**
   * Valide un nom de tenant
   */
  static validateName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Valide un nom d'enregistrement de tenant
   */
  static validateRegistrationNumber(registrationNumber: string): boolean {
    if (!registrationNumber || typeof registrationNumber !== 'string') return false;
    const trimmed = registrationNumber.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.REGISTRATION_NUMBER.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.REGISTRATION_NUMBER.MAX_LENGTH
    );
  }

  static validateEmployeeCount(employeeCount: any): boolean {
    if (!Array.isArray(employeeCount) || employeeCount.length !== 2) return false;

    const [min, max] = employeeCount;

    return typeof min === 'number' && typeof max === 'number' && min > 0 && min < max;
  }

  /**
   * Valide un nom court de tenant
   */
  static validateShortName(shortName: string | null): boolean {
    if (!shortName) return true; // Optionnel
    if (typeof shortName !== 'string') return false;
    const trimmed = shortName.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.SHORT_NAME.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.SHORT_NAME.MAX_LENGTH
    );
  }

  /**
   * Valide une clé de tenant
   */
  static validateKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.KEY.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.KEY.MAX_LENGTH &&
      TENANT_VALIDATION.KEY.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un code pays ISO 3166-1 (2 lettres)
   */
  static validateCountryCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return TENANT_VALIDATION.COUNTRY_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un code de devise ISO 4217 (3 lettres)
   */
  static validatePrimaryCurrencyCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return TENANT_VALIDATION.PRIMARY_CURRENCY_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un code de langue ISO 639-1 (2 lettres)
   */
  static validatePreferredLanguageCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toLowerCase();
    return TENANT_VALIDATION.PREFERRED_LANGUAGE_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un fuseau horaire
   */
  static validateTimezone(timezone: string): boolean {
    if (!timezone || typeof timezone !== 'string') return false;
    const trimmed = timezone.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.TIMEZONE.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.TIMEZONE.MAX_LENGTH &&
      TENANT_VALIDATION.TIMEZONE.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un numéro de taxe
   */
  static validateTaxNumber(taxNumber: string | null): boolean {
    if (!taxNumber) return true; // Optionnel
    if (typeof taxNumber !== 'string') return false;
    const trimmed = taxNumber.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.TAX_NUMBER.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.TAX_NUMBER.MAX_LENGTH &&
      TENANT_VALIDATION.TAX_NUMBER.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un email de facturation
   */
  static validateBillingEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.BILLING_EMAIL.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.BILLING_EMAIL.MAX_LENGTH &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    );
  }

  /**
   * Valide une adresse de facturation
   */
  static validateBillingAddress(address: any): boolean {
    if (!address) return true; // Optionnel
    if (typeof address !== 'object' || address === null) return false;

    const requiredFields = ['city', 'location', 'place_name'];
    return requiredFields.every(
      (field) =>
        address[field] && typeof address[field] === 'string' && address[field].trim().length > 0,
    );
  }

  /**
   * Valide un téléphone de facturation
   */
  static validateBillingPhone(phone: string | null): boolean {
    if (!phone) return true; // Optionnel
    if (typeof phone !== 'string') return false;
    const trimmed = phone.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.BILLING_PHONE.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.BILLING_PHONE.MAX_LENGTH &&
      TENANT_VALIDATION.BILLING_PHONE.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un statut
   */
  static validateStatus(status: string): boolean {
    // if (!status || typeof status !== 'string') return false;
    const upperStatus = status.trim().toUpperCase();
    return Object.values(Status).includes(upperStatus as Status);
    // const upperStatus = status.trim().toUpperCase();
    // return ['ACTIVE', 'SUSPENDED', 'TERMINATED'].includes(upperStatus);
  }

  /**
   * Valide un sous-domaine
   */
  static validateSubdomain(subdomain: string | null): boolean {
    if (!subdomain) return true; // Optionnel
    if (typeof subdomain !== 'string') return false;
    const trimmed = subdomain.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.SUBDOMAIN.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.SUBDOMAIN.MAX_LENGTH &&
      TENANT_VALIDATION.SUBDOMAIN.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un nom de base de données
   */
  static validateDatabaseName(dbName: string | null): boolean {
    if (!dbName) return true; // Optionnel
    if (typeof dbName !== 'string') return false;
    const trimmed = dbName.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.DATABASE_NAME.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.DATABASE_NAME.MAX_LENGTH &&
      TENANT_VALIDATION.DATABASE_NAME.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un nom d'utilisateur de base de données
   */
  static validateDatabaseUsername(dbUser: string | null): boolean {
    if (!dbUser) return true; // Optionnel
    if (typeof dbUser !== 'string') return false;
    const trimmed = dbUser.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.DATABASE_USERNAME.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.DATABASE_USERNAME.MAX_LENGTH &&
      TENANT_VALIDATION.DATABASE_USERNAME.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un mot de passe de base de données
   */
  static validateDatabasePassword(dbPass: string | null): boolean {
    if (!dbPass) return true; // Optionnel
    if (typeof dbPass !== 'string') return false;
    // Si déjà haché, c'est valide
    if (dbPass.startsWith('$2b$')) return true;
    const trimmed = dbPass.trim();
    return (
      trimmed.length >= TENANT_VALIDATION.DATABASE_PASSWORD.MIN_LENGTH &&
      trimmed.length <= TENANT_VALIDATION.DATABASE_PASSWORD.MAX_LENGTH &&
      TENANT_VALIDATION.DATABASE_PASSWORD.PATTERN.test(trimmed)
    );
  }

  /**
   * Valide un statut boolean
   */
  static validateBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  /**
   * Valide un GUID de tenant (6 chiffres)
   */
  static validateTenantGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= TENANT_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= TENANT_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Nettoie et normalise les données de tenant
   */
  static cleanTenantData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.name) {
      cleaned.name = cleaned.name.toString().trim();
    }

    if (cleaned.registration_number) {
      cleaned.registration_number = cleaned.registration_number.toString().trim();
    }

    if (cleaned.short_name) {
      cleaned.short_name = cleaned.short_name.toString().trim();
    }

    if (cleaned.employee_count) {
      cleaned.employee_count = cleaned.employee_count.map((n: any) => Number(n));
    }
    // if (cleaned.key) {
    //   cleaned.key = cleaned.key.toString().trim().toLowerCase();
    // }

    if (cleaned.country_code) {
      cleaned.country_code = cleaned.country_code.toString().trim().toUpperCase();
    }

    if (cleaned.primary_currency_code) {
      cleaned.primary_currency_code = cleaned.primary_currency_code.toString().trim().toUpperCase();
    }

    if (cleaned.preferred_language_code) {
      cleaned.preferred_language_code = cleaned.preferred_language_code
        .toString()
        .trim()
        .toLowerCase();
    }

    if (cleaned.timezone) {
      cleaned.timezone = cleaned.timezone.toString().trim();
    }

    if (cleaned.tax_number) {
      cleaned.tax_number = cleaned.tax_number.toString().trim().toUpperCase();
    }

    if (cleaned.tax_exempt !== undefined) {
      cleaned.tax_exempt = Boolean(
        cleaned.tax_exempt === 'true' || cleaned.tax_exempt === true || cleaned.tax_exempt === 1,
      );
    }

    if (cleaned.billing_email) {
      cleaned.billing_email = cleaned.billing_email.toString().trim().toLowerCase();
    }

    if (cleaned.billing_address && typeof cleaned.billing_address === 'object') {
      // Nettoyer les champs de l'adresse
      if (cleaned.billing_address.city) {
        cleaned.billing_address.city = cleaned.billing_address.city.toString().trim();
      }
      if (cleaned.billing_address.location) {
        cleaned.billing_address.location = cleaned.billing_address.location.toString().trim();
      }
      if (cleaned.billing_address.place_name) {
        cleaned.billing_address.place_name = cleaned.billing_address.place_name.toString().trim();
      }
    }

    if (cleaned.billing_phone) {
      cleaned.billing_phone = cleaned.billing_phone.toString().trim();
    }

    if (cleaned.status) {
      cleaned.status = cleaned.status.toString().trim().toUpperCase();
    }

    if (cleaned.subdomain) {
      cleaned.subdomain = cleaned.subdomain.toString().trim().toLowerCase();
    }

    if (cleaned.database_name) {
      cleaned.database_name = cleaned.database_name.toString().trim().toLowerCase();
    }

    if (cleaned.database_username) {
      cleaned.database_username = cleaned.database_username.toString().trim().toLowerCase();
    }

    return cleaned;
  }

  /**
   * Valide qu'un tenant est complet pour création
   */
  static isValidForCreation(data: any): boolean {
    return (
      this.validateName(data.name) &&
      this.validateRegistrationNumber(data.registration_number) &&
      this.validateKey(data.key) &&
      this.validateCountryCode(data.country_code) &&
      this.validatePrimaryCurrencyCode(data.primary_currency_code) &&
      this.validateBillingEmail(data.billing_email) &&
      this.validateEmployeeCount(data.employee_count)
    );
  }

  /**
   * Extrait les erreurs de validation pour un tenant
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!this.validateName(data.name)) {
      errors.push(
        `Invalid name: must be between ${TENANT_VALIDATION.NAME.MIN_LENGTH} and ${TENANT_VALIDATION.NAME.MAX_LENGTH} characters`,
      );
    }

    if (!this.validateRegistrationNumber(data.registration_number)) {
      errors.push(
        `Invalid registration number: must be between ${TENANT_VALIDATION.REGISTRATION_NUMBER.MIN_LENGTH} and ${TENANT_VALIDATION.REGISTRATION_NUMBER.MAX_LENGTH} characters`,
      );
    }

    if (data.short_name && !this.validateShortName(data.short_name)) {
      errors.push(
        `Invalid short name: must be between ${TENANT_VALIDATION.SHORT_NAME.MIN_LENGTH} and ${TENANT_VALIDATION.SHORT_NAME.MAX_LENGTH} characters`,
      );
    }

    // if (!this.validateKey(data.key)) {
    //   errors.push(
    //     `Invalid key: must be between ${TENANT_VALIDATION.KEY.MIN_LENGTH} and ${TENANT_VALIDATION.KEY.MAX_LENGTH} lowercase alphanumeric characters with underscores or hyphens`,
    //   );
    // }

    if (!this.validateCountryCode(data.country_code)) {
      errors.push('Invalid country code: must be 2 uppercase letters (ISO 3166-1)');
    }

    if (!this.validatePrimaryCurrencyCode(data.primary_currency_code)) {
      errors.push('Invalid primary currency code: must be 3 uppercase letters (ISO 4217)');
    }

    if (
      data.preferred_language_code &&
      !this.validatePreferredLanguageCode(data.preferred_language_code)
    ) {
      errors.push('Invalid preferred language code: must be 2 lowercase letters (ISO 639-1)');
    }
    if (!this.validateTimezone(data.timezone)) {
      errors.push(
        `Invalid timezone: must be between ${TENANT_VALIDATION.TIMEZONE.MIN_LENGTH} and ${TENANT_VALIDATION.TIMEZONE.MAX_LENGTH} characters`,
      );
    }
    if (data.tax_number && !this.validateTaxNumber(data.tx_number)) {
      errors.push('Invalid TAX number');
    }
    if (data.tax_exempt && !this.validateBoolean(data.tax_exempt)) {
      errors.push('Invalid TAX exempt: must be valid boolean');
    }
    if (!this.validateBillingEmail(data.billing_email)) {
      errors.push(
        `Invalid Billing Email: must be ${TENANT_VALIDATION.BILLING_EMAIL.MIN_LENGTH} and ${TENANT_VALIDATION.BILLING_EMAIL.MAX_LENGTH} characters`,
      );
    }
    if (!this.validateBillingPhone(data.billing_phone)) {
      errors.push(
        `Invalid Billing Phone Number: must be ${TENANT_VALIDATION.BILLING_PHONE.MIN_LENGTH} and ${TENANT_VALIDATION.BILLING_PHONE.MAX_LENGTH} characters`,
      );
    }
    if (!this.validateBillingAddress(data.billing_address)) {
      errors.push(`Invalid Address: must be valid object`);
    }
    if (data.status && !this.validateStatus(data.status)) {
      errors.push(`Invalid status`);
    }
    if (data.subdomain && !this.validateSubdomain(data.subdomain)) {
      errors.push(
        `Invalid subdomain: must be valid subdomain address between ${TENANT_VALIDATION.SUBDOMAIN.MIN_LENGTH} and ${TENANT_VALIDATION.SUBDOMAIN.MAX_LENGTH} characters`,
      );
    }
    if (data.database_name && !this.validateDatabaseName(data.database_name)) {
      errors.push(
        `Invalid database name: must be between ${TENANT_VALIDATION.DATABASE_NAME.MIN_LENGTH} and ${TENANT_VALIDATION.DATABASE_NAME.MAX_LENGTH} characters`,
      );
    }
    if (data.database_username && !this.validateDatabaseUsername(data.database_username)) {
      errors.push(
        `Invalid database user: must be between ${TENANT_VALIDATION.DATABASE_USERNAME.MIN_LENGTH} and ${TENANT_VALIDATION.DATABASE_USERNAME.MAX_LENGTH} characters`,
      );
    }
    if (data.database_password && !this.validateDatabasePassword(data.database_password)) {
      errors.push(
        `Invalid database password: must be between ${TENANT_VALIDATION.DATABASE_PASSWORD.MIN_LENGTH} and ${TENANT_VALIDATION.DATABASE_PASSWORD.MAX_LENGTH} characters`,
      );
    }
    return errors;
  }

  /**
   * Valide les données de filtre de recherche
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.country_code && this.validateCountryCode(data.country_code)) ||
      (data.primary_currency_code &&
        this.validatePrimaryCurrencyCode(data.primary_currency_code)) ||
      (data.preferred_language_code &&
        this.validatePreferredLanguageCode(data.preferred_language_code)) ||
      (data.timezone && this.validateTimezone(data.timezone)) ||
      (data.tax_exempt !== undefined && this.validateTimezone(data.tax_exempt)) ||
      (data.status !== undefined && this.validateStatus(data.status))
    );
  }

  /**
   * Normalise un code pays pour recherche
   */
  static normalizeCountryCode(code: string): string {
    if (!this.validateCountryCode(code)) {
      throw new Error('Invalid country code for normalization');
    }
    return code.trim().toUpperCase();
  }

  /**
   * Normalise un code devise pour recherche
   */
  static normalizeCurrencyCode(code: string): string {
    if (!this.validatePrimaryCurrencyCode(code)) {
      throw new Error('Invalid currency code for normalization');
    }
    return code.trim().toUpperCase();
  }

  /**
   * Normalise language_code pour recherche
   */
  static normalizeLanguageCode(code: string): string {
    if (!this.validatePreferredLanguageCode(code)) {
      throw new Error('Invalid language code for normalization');
    }
    return code.trim().toLowerCase();
  }
}
