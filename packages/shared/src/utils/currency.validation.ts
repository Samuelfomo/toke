// À ajouter dans shared/src/utils/validation.ts

import { CURRENCY_VALIDATION } from '../constants/currency.js';

export class CurrencyValidationUtils {
  /**
   * Valide un code devise ISO 4217
   */
  static validateCurrencyCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return CURRENCY_VALIDATION.CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un nom de devise
   */
  static validateCurrencyName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= CURRENCY_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= CURRENCY_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Valide un symbole de devise
   */
  static validateCurrencySymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== 'string') return false;
    const trimmed = symbol.trim();
    return (
      trimmed.length >= CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH &&
      trimmed.length <= CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH
    );
  }

  /**
   * Valide les décimales d'une devise
   */
  static validateDecimalPlaces(decimalPlaces: number): boolean {
    return (
      Number.isInteger(decimalPlaces) &&
      decimalPlaces >= CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE &&
      decimalPlaces <= CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE
    );
  }

  /**
   * Valide un GUID de devise (6 digits)
   */
  static validateCurrencyGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= CURRENCY_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= CURRENCY_VALIDATION.GUID.MAX_VALUE
    );
  }

  static isBoolean(value: boolean): boolean {
    return typeof value === 'boolean';
  }

  /**
   * Nettoie et normalise les données de devise
   */
  static cleanCurrencyData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.code) {
      cleaned.code = cleaned.code.toString().trim().toUpperCase();
    }

    if (cleaned.name) {
      cleaned.name = cleaned.name.toString().trim();
    }

    if (cleaned.symbol) {
      cleaned.symbol = cleaned.symbol.toString().trim();
    }

    if (cleaned.decimal_places !== undefined) {
      const parsed = parseInt(cleaned.decimal_places);
      cleaned.decimal_places = isNaN(parsed) ? 2 : parsed;
    }

    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(
        cleaned.active === 'true' || cleaned.active === true || cleaned.active === 1,
      );
    }

    return cleaned;
  }

  /**
   * Valide qu'une devise est complète pour création
   */
  static isValidForCreation(data: any): boolean {
    return (
      this.validateCurrencyCode(data.code) &&
      this.validateCurrencyName(data.name) &&
      this.validateCurrencySymbol(data.symbol) &&
      this.validateDecimalPlaces(data.decimal_places)
    );
  }

  /**
   * Extrait les erreurs de validation pour une devise
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!this.validateCurrencyCode(data.code)) {
      errors.push('Invalid currency code: must be 3 uppercase letters (ISO 4217)');
    }

    if (!this.validateCurrencyName(data.name)) {
      errors.push(
        `Invalid currency name: must be between ${CURRENCY_VALIDATION.NAME.MIN_LENGTH} and ${CURRENCY_VALIDATION.NAME.MAX_LENGTH} characters`,
      );
    }

    if (!this.validateCurrencySymbol(data.symbol)) {
      errors.push(
        `Invalid currency symbol: must be between ${CURRENCY_VALIDATION.SYMBOL.MIN_LENGTH} and ${CURRENCY_VALIDATION.SYMBOL.MAX_LENGTH} characters`,
      );
    }

    if (data.decimal_places !== undefined && !this.validateDecimalPlaces(data.decimal_places)) {
      errors.push(
        `Invalid decimal places: must be between ${CURRENCY_VALIDATION.DECIMAL_PLACES.MIN_VALUE} and ${CURRENCY_VALIDATION.DECIMAL_PLACES.MAX_VALUE}`,
      );
    }

    return errors;
  }
}
