// shared/src/utils/country.validation.ts
import { COUNTRY_VALIDATION } from '../constants/country';

export class CountryValidationUtils {
  /**
   * Valide un code ISO 3166-1 alpha-2
   */
  static validateIsoCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return COUNTRY_VALIDATION.CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un nom de pays
   */
  static validateCountryName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= COUNTRY_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= COUNTRY_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Valide un code devise ISO 4217
   */
  static validateCurrencyCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return COUNTRY_VALIDATION.CURRENCY_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un code langue ISO 639-1
   */
  static validateLanguageCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toLowerCase();
    return COUNTRY_VALIDATION.LANGUAGE_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un fuseau horaire
   */
  static validateTimezone(timezone: string): boolean {
    if (!timezone || typeof timezone !== 'string') return false;
    const trimmed = timezone.trim();
    return COUNTRY_VALIDATION.TIMEZONE.PATTERN.test(trimmed);
  }

  /**
   * Valide un préfixe téléphonique
   */
  static validatePhonePrefix(prefix: string): boolean {
    if (!prefix || typeof prefix !== 'string') return false;
    const trimmed = prefix.trim();
    return COUNTRY_VALIDATION.PHONE_PREFIX.PATTERN.test(trimmed);
  }

  /**
   * Valide un GUID de pays (6 digits)
   */
  static validateCountryGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= COUNTRY_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= COUNTRY_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Nettoie et normalise les données de pays
   */
  static cleanCountryData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.code) {
      cleaned.code = cleaned.code.toString().trim().toUpperCase();
    }

    if (cleaned.name_en) {
      cleaned.name_en = cleaned.name_en.toString().trim();
    }

    if (cleaned.name_local) {
      cleaned.name_local = cleaned.name_local.toString().trim();
    }

    if (cleaned.default_currency_code) {
      cleaned.default_currency_code = cleaned.default_currency_code.toString().trim().toUpperCase();
    }

    if (cleaned.default_language_code) {
      cleaned.default_language_code = cleaned.default_language_code.toString().trim().toLowerCase();
    }

    if (cleaned.timezone_default) {
      cleaned.timezone_default = cleaned.timezone_default.toString().trim();
    }

    if (cleaned.phone_prefix) {
      cleaned.phone_prefix = cleaned.phone_prefix.toString().trim();
    }

    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(
        cleaned.active === 'true' || cleaned.active === true || cleaned.active === 1,
      );
    }

    return cleaned;
  }
}

export class GeneralValidationUtils {
  /**
   * Vérifie si une valeur est un entier positif
   */
  static isPositiveInteger(value: any): boolean {
    const num = parseInt(value);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  }

  /**
   * Vérifie si une chaîne est vide ou ne contient que des espaces
   */
  static isEmptyOrWhitespace(value: string): boolean {
    return !value || value.trim().length === 0;
  }

  /**
   * Valide une adresse email basique
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide qu'une valeur est dans une liste d'options
   */
  static isInAllowedValues(value: any, allowedValues: any[]): boolean {
    return allowedValues.includes(value);
  }

  /**
   * Valide une date ISO 8601
   */
  static isValidISODate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }

  /**
   * Valide qu'un objet a toutes les propriétés requises
   */
  static hasRequiredProperties(obj: any, requiredProps: string[]): boolean {
    if (!obj || typeof obj !== 'object') return false;
    return requiredProps.every(
      (prop) => prop in obj && obj[prop] !== undefined && obj[prop] !== null,
    );
  }

  /**
   * Sanitise une chaîne pour éviter les injections
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Retire les balises HTML basiques
      .replace(/['"]/g, '') // Retire les guillemets
      .trim();
  }
}
