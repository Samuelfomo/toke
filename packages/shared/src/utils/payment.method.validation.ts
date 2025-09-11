// utils/payment.method.validation.ts
import { PAYMENT_METHOD_VALIDATION } from '../constants/payment.method.js';

export class PaymentMethodValidationUtils {
  /**
   * Validates payment method code
   */
  static validateCode(code: any): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return (
      trimmed.length >= PAYMENT_METHOD_VALIDATION.CODE.MIN_LENGTH &&
      trimmed.length <= PAYMENT_METHOD_VALIDATION.CODE.MAX_LENGTH &&
      PAYMENT_METHOD_VALIDATION.CODE.PATTERN.test(trimmed)
    );
  }

  /**
   * Validates payment method name
   */
  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= PAYMENT_METHOD_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= PAYMENT_METHOD_VALIDATION.NAME.MAX_LENGTH &&
      trimmed !== ''
    );
  }

  /**
   * Validates method type
   */
  static validateMethodType(methodType: any): boolean {
    if (!methodType || typeof methodType !== 'string') return false;
    const trimmed = methodType.trim();
    return (
      trimmed.length >= PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MIN_LENGTH &&
      trimmed.length <= PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MAX_LENGTH &&
      PAYMENT_METHOD_VALIDATION.METHOD_TYPE.PATTERN.test(trimmed)
    );
  }

  /**
   * Validates currency code
   */
  static validateCurrencyCode(code: any): boolean {
    if (!code || typeof code !== 'string') return false;
    const upperCode = code.trim().toUpperCase();
    return (
      upperCode.length === PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.ITEM_LENGTH &&
      PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.PATTERN.test(upperCode)
    );
  }

  /**
   * Validates supported currencies array
   */
  static validateSupportedCurrencies(currencies: any): boolean {
    if (!Array.isArray(currencies)) return false;

    // Check max number of currencies
    if (currencies.length > PAYMENT_METHOD_VALIDATION.SUPPORTED_CURRENCIES.MAX_CURRENCIES) {
      return false;
    }

    // Check each currency code
    for (const currency of currencies) {
      if (!this.validateCurrencyCode(currency)) {
        return false;
      }
    }

    // Check for duplicates
    const uniqueCurrencies = new Set(currencies.map((c) => c.toUpperCase()));
    return uniqueCurrencies.size === currencies.length;
  }

  /**
   * Validates processing fee rate
   */
  static validateProcessingFeeRate(rate: number | string): boolean {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    return (
      !isNaN(numRate) &&
      numRate >= PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MIN_VALUE &&
      numRate <= PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MAX_VALUE
    );
  }

  /**
   * Validates minimum amount USD
   */
  static validateMinAmountUsd(amount: number | string): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MIN_VALUE &&
      numAmount <= PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MAX_VALUE
    );
  }

  /**
   * Validates maximum amount USD
   */
  static validateMaxAmountUsd(amount: number | string): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MIN_VALUE &&
      numAmount <= PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MAX_VALUE
    );
  }

  /**
   * Validates amount range logic (max >= min)
   */
  static validateAmountRange(minAmount: number, maxAmount: number): boolean {
    return maxAmount >= minAmount;
  }

  /**
   * Validates active boolean value
   */
  static validateActive(active: any): boolean {
    return typeof active === 'boolean';
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: number | string): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      Number.isInteger(numGuid) &&
      numGuid >= PAYMENT_METHOD_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= PAYMENT_METHOD_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Checks if a currency is supported by the payment method
   */
  static isCurrencySupported(supportedCurrencies: string[], currencyCode: string): boolean {
    if (!Array.isArray(supportedCurrencies) || !currencyCode) return false;
    return supportedCurrencies.map((c) => c.toUpperCase()).includes(currencyCode.toUpperCase());
  }

  /**
   * Checks if amount is within payment method limits
   */
  static isAmountWithinLimits(amount: number, minAmount: number, maxAmount: number): boolean {
    return amount >= minAmount && amount <= maxAmount;
  }

  /**
   * Validates payment method for specific transaction
   */
  static validateForTransaction(
    paymentMethod: any,
    amount: number,
    currencyCode: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if payment method is active
    if (!paymentMethod.active) {
      errors.push('Payment method is not active');
    }

    // Check currency support
    if (!this.isCurrencySupported(paymentMethod.supported_currencies, currencyCode)) {
      errors.push(`Currency ${currencyCode} is not supported by this payment method`);
    }

    // Check amount limits (assuming amount is in USD or converted to USD)
    if (
      !this.isAmountWithinLimits(amount, paymentMethod.min_amount_usd, paymentMethod.max_amount_usd)
    ) {
      errors.push(
        `Amount must be between ${paymentMethod.min_amount_usd} and ${paymentMethod.max_amount_usd} USD`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculates processing fee for a transaction
   */
  static calculateProcessingFee(amount: number, feeRate: number): number {
    if (!this.validateProcessingFeeRate(feeRate)) {
      throw new Error('Invalid processing fee rate');
    }
    return Math.round(amount * (feeRate / 100) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Gets effective processing fee rate as percentage
   */
  static getEffectiveFeeRate(processingFee: number, amount: number): number {
    if (amount === 0) return 0;
    return Math.round((processingFee / amount) * 10000) / 100; // Round to 2 decimal places
  }

  /**
   * Cleans and normalizes payment method data
   */
  static cleanPaymentMethodData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean code
    if (cleaned.code !== undefined) {
      cleaned.code = cleaned.code.toString().trim().toUpperCase();
    }

    // Clean name
    if (cleaned.name !== undefined) {
      cleaned.name = cleaned.name.toString().trim();
    }

    // Clean method type
    if (cleaned.method_type !== undefined) {
      cleaned.method_type = cleaned.method_type.toString().trim().toUpperCase();
    }

    // Clean and validate supported currencies
    if (cleaned.supported_currencies !== undefined) {
      if (Array.isArray(cleaned.supported_currencies)) {
        cleaned.supported_currencies = cleaned.supported_currencies.map((curr: any) =>
          curr.toString().trim().toUpperCase(),
        );
        // Remove duplicates
        cleaned.supported_currencies = [...new Set(cleaned.supported_currencies)];
      } else {
        throw new Error('supported_currencies must be an array');
      }
    }

    // Clean active boolean
    if (cleaned.active !== undefined) {
      if (typeof cleaned.active === 'string') {
        cleaned.active = cleaned.active.toLowerCase() === 'true';
      } else if (typeof cleaned.active !== 'boolean') {
        throw new Error('active must be a boolean value');
      }
    }

    // Convert processing fee rate
    if (cleaned.processing_fee_rate !== undefined) {
      cleaned.processing_fee_rate = parseFloat(cleaned.processing_fee_rate);
      if (isNaN(cleaned.processing_fee_rate)) {
        throw new Error('Invalid processing_fee_rate: must be a valid number');
      }
      // Round to 4 decimal places
      cleaned.processing_fee_rate = Math.round(cleaned.processing_fee_rate * 10000) / 10000;
    }

    // Convert min amount USD
    if (cleaned.min_amount_usd !== undefined) {
      cleaned.min_amount_usd = parseFloat(cleaned.min_amount_usd);
      if (isNaN(cleaned.min_amount_usd)) {
        throw new Error('Invalid min_amount_usd: must be a valid number');
      }
      // Round to 2 decimal places
      cleaned.min_amount_usd = Math.round(cleaned.min_amount_usd * 100) / 100;
    }

    // Convert max amount USD
    if (cleaned.max_amount_usd !== undefined) {
      cleaned.max_amount_usd = parseFloat(cleaned.max_amount_usd);
      if (isNaN(cleaned.max_amount_usd)) {
        throw new Error('Invalid max_amount_usd: must be a valid number');
      }
      // Round to 2 decimal places
      cleaned.max_amount_usd = Math.round(cleaned.max_amount_usd * 100) / 100;
    }

    // Convert GUID
    if (cleaned.guid !== undefined) {
      cleaned.guid = parseInt(cleaned.guid);
      if (isNaN(cleaned.guid)) {
        throw new Error('Invalid GUID: must be a valid 6-digit number');
      }
    }

    return cleaned;
  }

  /**
   * Validates that a payment method is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = [
      'code',
      'name',
      'method_type',
      'processing_fee_rate',
      'min_amount_usd',
      'max_amount_usd',
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateCode(data.code) &&
      this.validateName(data.name) &&
      this.validateMethodType(data.method_type) &&
      this.validateProcessingFeeRate(data.processing_fee_rate) &&
      this.validateMinAmountUsd(data.min_amount_usd) &&
      this.validateMaxAmountUsd(data.max_amount_usd) &&
      this.validateAmountRange(data.min_amount_usd, data.max_amount_usd) &&
      (data.supported_currencies === undefined ||
        this.validateSupportedCurrencies(data.supported_currencies)) &&
      (data.active === undefined || this.validateActive(data.active))
    );
  }

  /**
   * Extracts validation errors for a payment method
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.code || !this.validateCode(data.code)) {
      errors.push(
        `Invalid code: must be ${PAYMENT_METHOD_VALIDATION.CODE.MIN_LENGTH}-${PAYMENT_METHOD_VALIDATION.CODE.MAX_LENGTH} alphanumeric characters with underscores`,
      );
    }

    if (!data.name || !this.validateName(data.name)) {
      errors.push(
        `Invalid name: must be ${PAYMENT_METHOD_VALIDATION.NAME.MIN_LENGTH}-${PAYMENT_METHOD_VALIDATION.NAME.MAX_LENGTH} characters`,
      );
    }

    if (!data.method_type || !this.validateMethodType(data.method_type)) {
      errors.push(
        `Invalid method_type: must be ${PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MIN_LENGTH}-${PAYMENT_METHOD_VALIDATION.METHOD_TYPE.MAX_LENGTH} alphanumeric characters with underscores`,
      );
    }

    if (
      data.supported_currencies !== undefined &&
      !this.validateSupportedCurrencies(data.supported_currencies)
    ) {
      errors.push(
        'Invalid supported_currencies: must be an array of valid 3-letter ISO 4217 currency codes without duplicates',
      );
    }

    if (data.active !== undefined && !this.validateActive(data.active)) {
      errors.push('Invalid active: must be a boolean value');
    }

    if (
      data.processing_fee_rate !== undefined &&
      !this.validateProcessingFeeRate(data.processing_fee_rate)
    ) {
      errors.push(
        `Invalid processing_fee_rate: must be between ${PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MIN_VALUE} and ${PAYMENT_METHOD_VALIDATION.PROCESSING_FEE_RATE.MAX_VALUE}`,
      );
    }

    if (data.min_amount_usd !== undefined && !this.validateMinAmountUsd(data.min_amount_usd)) {
      errors.push(
        `Invalid min_amount_usd: must be between ${PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MIN_VALUE} and ${PAYMENT_METHOD_VALIDATION.MIN_AMOUNT_USD.MAX_VALUE}`,
      );
    }

    if (data.max_amount_usd !== undefined && !this.validateMaxAmountUsd(data.max_amount_usd)) {
      errors.push(
        `Invalid max_amount_usd: must be between ${PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MIN_VALUE} and ${PAYMENT_METHOD_VALIDATION.MAX_AMOUNT_USD.MAX_VALUE}`,
      );
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push('Invalid GUID: must be a 6-digit integer between 100000 and 999999');
    }

    // Validate amount range if both amounts are present
    if (data.min_amount_usd !== undefined && data.max_amount_usd !== undefined) {
      if (!this.validateAmountRange(data.min_amount_usd, data.max_amount_usd)) {
        errors.push(
          'Invalid amount range: maximum amount must be greater than or equal to minimum amount',
        );
      }
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.code && this.validateCode(data.code)) ||
      (data.name && this.validateName(data.name)) ||
      (data.method_type && this.validateMethodType(data.method_type)) ||
      (data.active !== undefined && this.validateActive(data.active)) ||
      (data.supported_currency && this.validateCurrencyCode(data.supported_currency)) ||
      (data.min_processing_fee_rate !== undefined &&
        this.validateProcessingFeeRate(data.min_processing_fee_rate)) ||
      (data.max_processing_fee_rate !== undefined &&
        this.validateProcessingFeeRate(data.max_processing_fee_rate))
    );
  }

  /**
   * Normalizes payment method code for search
   */
  static normalizeCode(code: string): string {
    if (!this.validateCode(code)) {
      throw new Error('Invalid payment method code for normalization');
    }
    return code.trim().toUpperCase();
  }

  /**
   * Normalizes method type for search
   */
  static normalizeMethodType(methodType: string): string {
    if (!this.validateMethodType(methodType)) {
      throw new Error('Invalid method type for normalization');
    }
    return methodType.trim().toUpperCase();
  }

  /**
   * Normalizes currency code for search
   */
  static normalizeCurrencyCode(code: string): string {
    if (!this.validateCurrencyCode(code)) {
      throw new Error('Invalid currency code for normalization');
    }
    return code.trim().toUpperCase();
  }

  /**
   * Checks if payment method supports a specific amount range
   */
  static supportsAmountRange(paymentMethod: any, minAmount: number, maxAmount: number): boolean {
    return paymentMethod.min_amount_usd <= minAmount && paymentMethod.max_amount_usd >= maxAmount;
  }

  /**
   * Gets recommended payment methods for a transaction
   */
  static getRecommendedPaymentMethods(
    paymentMethods: any[],
    amount: number,
    currencyCode: string,
    sortByFee: boolean = true,
  ): any[] {
    const validMethods = paymentMethods.filter((method) => {
      const validation = this.validateForTransaction(method, amount, currencyCode);
      return validation.valid;
    });

    if (sortByFee) {
      return validMethods.sort((a, b) => a.processing_fee_rate - b.processing_fee_rate);
    }

    return validMethods;
  }

  /**
   * Calculates total transaction cost including fees
   */
  static calculateTotalTransactionCost(
    amount: number,
    feeRate: number,
  ): {
    originalAmount: number;
    processingFee: number;
    totalCost: number;
  } {
    const processingFee = this.calculateProcessingFee(amount, feeRate);
    return {
      originalAmount: Math.round(amount * 100) / 100,
      processingFee,
      totalCost: Math.round((amount + processingFee) * 100) / 100,
    };
  }

  /**
   * Validates payment method business rules
   */
  static validateBusinessRules(data: any, existingPaymentMethods?: any[]): string[] {
    const errors: string[] = [];

    // Check for duplicate codes if existing payment methods are provided
    if (existingPaymentMethods && data.code) {
      const duplicateCode = existingPaymentMethods.find(
        (pm) => pm.code.toUpperCase() === data.code.toUpperCase() && pm.id !== data.id,
      );
      if (duplicateCode) {
        errors.push('Payment method with this code already exists');
      }
    }

    // Business rule: Mobile money methods should support XAF
    if (data.method_type && data.method_type.includes('MOMO') && data.supported_currencies) {
      if (!data.supported_currencies.includes('XAF')) {
        errors.push('Mobile money payment methods should support XAF currency');
      }
    }

    // Business rule: Card methods should have reasonable fee rates
    if (data.method_type === 'CARD' && data.processing_fee_rate > 5) {
      errors.push('Card payment method fee rate seems unusually high (>5%)');
    }

    // Business rule: Cash methods should have zero processing fees
    if (data.method_type === 'CASH' && data.processing_fee_rate > 0) {
      errors.push('Cash payment methods should not have processing fees');
    }

    return errors;
  }

  /**
   * Generates payment method summary statistics
   */
  static generateSummaryStats(paymentMethods: any[]): {
    total: number;
    active: number;
    inactive: number;
    averageFeeRate: number;
    supportedCurrencies: string[];
    methodTypes: { [key: string]: number };
  } {
    const active = paymentMethods.filter((pm) => pm.active);
    const inactive = paymentMethods.filter((pm) => !pm.active);

    const totalFeeRate = paymentMethods.reduce((sum, pm) => sum + pm.processing_fee_rate, 0);
    const averageFeeRate = paymentMethods.length > 0 ? totalFeeRate / paymentMethods.length : 0;

    const allCurrencies = new Set<string>();
    paymentMethods.forEach((pm) => {
      if (pm.supported_currencies) {
        pm.supported_currencies.forEach((curr: string) => allCurrencies.add(curr));
      }
    });

    const methodTypes: { [key: string]: number } = {};
    paymentMethods.forEach((pm) => {
      methodTypes[pm.method_type] = (methodTypes[pm.method_type] || 0) + 1;
    });

    return {
      total: paymentMethods.length,
      active: active.length,
      inactive: inactive.length,
      averageFeeRate: Math.round(averageFeeRate * 10000) / 10000,
      supportedCurrencies: Array.from(allCurrencies).sort(),
      methodTypes,
    };
  }
}
