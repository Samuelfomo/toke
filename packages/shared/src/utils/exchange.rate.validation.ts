import { EXCHANGE_RATE_VALIDATION } from '../constants/exchange.rate.js';

export class ExchangeRateValidationUtils {
  /**
   * Valide un code devise ISO 4217 pour from_currency_code
   */
  static validateFromCurrencyCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return EXCHANGE_RATE_VALIDATION.FROM_CURRENCY_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide un code devise ISO 4217 pour to_currency_code
   */
  static validateToCurrencyCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim().toUpperCase();
    return EXCHANGE_RATE_VALIDATION.TO_CURRENCY_CODE.PATTERN.test(trimmed);
  }

  /**
   * Valide qu'une paire de devises est différente
   */
  static validateCurrencyPair(fromCode: string, toCode: string): boolean {
    if (!this.validateFromCurrencyCode(fromCode) || !this.validateToCurrencyCode(toCode)) {
      return false;
    }
    return fromCode.trim().toUpperCase() !== toCode.trim().toUpperCase();
  }

  /**
   * Valide un taux de change
   */
  static validateExchangeRate(rate: number): boolean {
    return (
      typeof rate === 'number' &&
      !isNaN(rate) &&
      isFinite(rate) &&
      rate > 0 &&
      rate >= EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MIN_VALUE &&
      rate <= EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MAX_VALUE
    );
  }

  /**
   * Valide un ID utilisateur créateur
   */
  static validateCreatedBy(userId: number): boolean {
    return (
      Number.isInteger(userId) &&
      userId >= EXCHANGE_RATE_VALIDATION.CREATED_BY.MIN_VALUE &&
      userId <= EXCHANGE_RATE_VALIDATION.CREATED_BY.MAX_VALUE
    );
  }

  /**
   * Valide un statut courant (boolean)
   */
  static validateCurrent(current: boolean): boolean {
    return typeof current === 'boolean';
  }

  /**
   * Valide un GUID de taux de change (6 digits)
   */
  static validateExchangeRateGuid(guid: string | number): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      !isNaN(numGuid) &&
      numGuid >= EXCHANGE_RATE_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= EXCHANGE_RATE_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Valide un montant pour conversion
   */
  static validateConversionAmount(amount: number): boolean {
    return typeof amount === 'number' && !isNaN(amount) && isFinite(amount) && amount > 0;
  }

  /**
   * Nettoie et normalise les données de taux de change
   */
  static cleanExchangeRateData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    if (cleaned.from_currency_code) {
      cleaned.from_currency_code = cleaned.from_currency_code.toString().trim().toUpperCase();
    }

    if (cleaned.to_currency_code) {
      cleaned.to_currency_code = cleaned.to_currency_code.toString().trim().toUpperCase();
    }

    if (cleaned.exchange_rate !== undefined) {
      const parsed = parseFloat(cleaned.exchange_rate);
      cleaned.exchange_rate = isNaN(parsed) ? 0 : parsed;
    }

    if (cleaned.created_by !== undefined) {
      const parsed = parseInt(cleaned.created_by);
      cleaned.created_by = isNaN(parsed) ? 1 : parsed;
    }

    if (cleaned.current !== undefined) {
      cleaned.current = Boolean(
        cleaned.current === 'true' || cleaned.current === true || cleaned.current === 1,
      );
    }

    return cleaned;
  }

  /**
   * Valide qu'un taux de change est complet pour création
   */
  static isValidForCreation(data: any): boolean {
    return (
      this.validateFromCurrencyCode(data.from_currency_code) &&
      this.validateToCurrencyCode(data.to_currency_code) &&
      this.validateCurrencyPair(data.from_currency_code, data.to_currency_code) &&
      this.validateExchangeRate(data.exchange_rate) &&
      this.validateCreatedBy(data.created_by)
    );
  }

  /**
   * Extrait les erreurs de validation pour un taux de change
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!this.validateFromCurrencyCode(data.from_currency_code)) {
      errors.push('Invalid from currency code: must be 3 uppercase letters (ISO 4217)');
    }

    if (!this.validateToCurrencyCode(data.to_currency_code)) {
      errors.push('Invalid to currency code: must be 3 uppercase letters (ISO 4217)');
    }

    if (
      data.from_currency_code &&
      data.to_currency_code &&
      !this.validateCurrencyPair(data.from_currency_code, data.to_currency_code)
    ) {
      errors.push('From and to currency codes cannot be the same');
    }

    if (data.exchange_rate !== undefined && !this.validateExchangeRate(data.exchange_rate)) {
      errors.push(
        `Invalid exchange rate: must be between ${EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MIN_VALUE} and ${EXCHANGE_RATE_VALIDATION.EXCHANGE_RATE.MAX_VALUE}`,
      );
    }

    if (data.created_by !== undefined && !this.validateCreatedBy(data.created_by)) {
      errors.push(
        `Invalid created by: must be between ${EXCHANGE_RATE_VALIDATION.CREATED_BY.MIN_VALUE} and ${EXCHANGE_RATE_VALIDATION.CREATED_BY.MAX_VALUE}`,
      );
    }

    return errors;
  }

  /**
   * Génère une chaîne de paire de devises
   */
  static formatCurrencyPair(fromCode: string, toCode: string): string {
    if (!this.validateFromCurrencyCode(fromCode) || !this.validateToCurrencyCode(toCode)) {
      throw new Error('Invalid currency codes for pair formatting');
    }
    return `${fromCode.trim().toUpperCase()}/${toCode.trim().toUpperCase()}`;
  }

  /**
   * Parse une chaîne de paire de devises
   */
  static parseCurrencyPair(pairString: string): { from: string; to: string } | null {
    if (!pairString || typeof pairString !== 'string') {
      return null;
    }

    const parts = pairString.trim().split('/');
    if (parts.length !== 2) {
      return null;
    }

    const [from, to] = parts;
    if (this.validateFromCurrencyCode(from!) && this.validateToCurrencyCode(to!)) {
      return {
        from: from ? from.toUpperCase() : '',
        to: to ? to.toUpperCase() : '',
      };
    }

    return null;
  }

  /**
   * Valide les données de conversion de devises
   */
  static validateConversionData(data: any): boolean {
    return (
      this.validateConversionAmount(data.amount) &&
      this.validateFromCurrencyCode(data.from_currency) &&
      this.validateToCurrencyCode(data.to_currency) &&
      this.validateCurrencyPair(data.from_currency, data.to_currency)
    );
  }

  /**
   * Arrondit un montant converti selon les décimales appropriées
   */
  static roundConvertedAmount(amount: number, decimalPlaces: number = 4): number {
    if (!this.validateConversionAmount(amount)) {
      return 0;
    }
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(amount * factor) / factor;
  }
}
