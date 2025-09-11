// utils/license.adjustment.validation.ts
import { LICENSE_ADJUSTMENT_VALIDATION, PAYMENT_STATUS } from '../constants/license.adjustment.js';

export class LicenseAdjustmentValidationUtils {
  private static readonly TOLERANCE = 0.01;

  /**
   * Validates global license ID
   */
  static validateGlobalLicense(globalLicense: any): boolean {
    const numValue = typeof globalLicense === 'string' ? parseInt(globalLicense) : globalLicense;
    return (
      Number.isInteger(numValue) &&
      numValue >= LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MIN_VALUE &&
      numValue <= LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MAX_VALUE
    );
  }

  /**
   * Validates adjustment date
   */
  static validateAdjustmentDate(date: any): boolean {
    if (!date) return false;
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  /**
   * Validates employees added count
   */
  static validateEmployeesAddedCount(count: any): boolean {
    const numCount = typeof count === 'string' ? parseInt(count) : count;
    return (
      Number.isInteger(numCount) &&
      numCount >= LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MIN_VALUE &&
      numCount <= LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MAX_VALUE
    );
  }

  /**
   * Validates months remaining
   */
  static validateMonthsRemaining(months: any): boolean {
    const numMonths = typeof months === 'string' ? parseFloat(months) : months;
    return (
      !isNaN(numMonths) &&
      numMonths >= LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MIN_VALUE &&
      numMonths <= LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MAX_VALUE
    );
  }

  /**
   * Validates price per employee USD
   */
  static validatePricePerEmployeeUsd(price: any): boolean {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return (
      !isNaN(numPrice) &&
      numPrice >= LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MIN_VALUE &&
      numPrice <= LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MAX_VALUE
    );
  }

  /**
   * Validates subtotal USD
   */
  static validateSubtotalUsd(amount: any): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MIN_VALUE &&
      numAmount <= LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MAX_VALUE
    );
  }

  /**
   * Validates tax amount USD
   */
  static validateTaxAmountUsd(amount: any): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MIN_VALUE &&
      numAmount <= LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MAX_VALUE
    );
  }

  /**
   * Validates total amount USD
   */
  static validateTotalAmountUsd(amount: any): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MIN_VALUE &&
      numAmount <= LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MAX_VALUE
    );
  }

  /**
   * Validates billing currency code
   */
  static validateBillingCurrencyCode(code: any): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmedCode = code.trim().toUpperCase();
    return (
      trimmedCode.length === LICENSE_ADJUSTMENT_VALIDATION.BILLING_CURRENCY_CODE.LENGTH &&
      LICENSE_ADJUSTMENT_VALIDATION.BILLING_CURRENCY_CODE.PATTERN.test(trimmedCode)
    );
  }

  /**
   * Validates exchange rate
   */
  static validateExchangeRate(rate: any): boolean {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    return (
      !isNaN(numRate) &&
      numRate >= LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MIN_VALUE &&
      numRate <= LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MAX_VALUE
    );
  }

  /**
   * Validates local currency amounts
   */
  static validateLocalAmount(amount: any): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_LOCAL.MIN_VALUE &&
      numAmount <= LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_LOCAL.MAX_VALUE
    );
  }

  /**
   * Validates tax rules applied array
   */
  static validateTaxRulesApplied(taxRules: any): boolean {
    if (!Array.isArray(taxRules)) return false;
    if (taxRules.length === 0) return false;

    return taxRules.every((rule: any) => {
      if (typeof rule !== 'object' || rule === null) return false;
      if (!rule.hasOwnProperty('rate') || typeof rule.rate !== 'number') return false;
      return (
        rule.rate >= LICENSE_ADJUSTMENT_VALIDATION.TAX_RATE.MIN_VALUE &&
        rule.rate <= LICENSE_ADJUSTMENT_VALIDATION.TAX_RATE.MAX_VALUE
      );
    });
  }

  /**
   * Validates payment status
   */
  static validatePaymentStatus(status: any): boolean {
    return Object.values(PAYMENT_STATUS).includes(status);
  }

  /**
   * Validates payment due immediately boolean
   */
  static validatePaymentDueImmediately(value: any): boolean {
    return typeof value === 'boolean';
  }

  /**
   * Validates optional date fields
   */
  static validateOptionalDate(date: any): boolean {
    if (date === null || date === undefined) return true;
    return this.validateAdjustmentDate(date);
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      Number.isInteger(numGuid) &&
      numGuid >= LICENSE_ADJUSTMENT_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= LICENSE_ADJUSTMENT_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Business logic validation: Amount calculation
   */
  static validateAmountCalculation(data: {
    employees_added_count: number;
    months_remaining: number;
    price_per_employee_usd: number;
    subtotal_usd: number;
  }): boolean {
    const calculatedSubtotal =
      data.employees_added_count * data.months_remaining * data.price_per_employee_usd;
    return Math.abs(calculatedSubtotal - data.subtotal_usd) <= this.TOLERANCE;
  }

  /**
   * Business logic validation: Total calculation
   */
  static validateTotalCalculation(data: {
    subtotal_usd: number;
    tax_amount_usd: number;
    total_amount_usd: number;
  }): boolean {
    const calculatedTotal = data.subtotal_usd + data.tax_amount_usd;
    return Math.abs(calculatedTotal - data.total_amount_usd) <= this.TOLERANCE;
  }

  /**
   * Business logic validation: Local amounts consistency
   */
  static validateLocalAmountsConsistency(data: {
    subtotal_usd: number;
    tax_amount_usd: number;
    total_amount_usd: number;
    exchange_rate_used: number;
    subtotal_local: number;
    tax_amount_local: number;
    total_amount_local: number;
  }): boolean {
    const calculatedSubtotalLocal = data.subtotal_usd * data.exchange_rate_used;
    const calculatedTaxLocal = data.tax_amount_usd * data.exchange_rate_used;
    const calculatedTotalLocal = data.total_amount_usd * data.exchange_rate_used;

    return (
      Math.abs(calculatedSubtotalLocal - data.subtotal_local) <= this.TOLERANCE &&
      Math.abs(calculatedTaxLocal - data.tax_amount_local) <= this.TOLERANCE &&
      Math.abs(calculatedTotalLocal - data.total_amount_local) <= this.TOLERANCE
    );
  }

  /**
   * Validates date logic: payment completed after adjustment
   */
  static validatePaymentCompletedAfterAdjustment(
    adjustmentDate: Date,
    paymentCompletedAt: Date | null,
  ): boolean {
    if (!paymentCompletedAt) return true;
    return new Date(paymentCompletedAt).getTime() >= new Date(adjustmentDate).getTime();
  }

  /**
   * Validates date logic: payment completed after invoice
   */
  static validatePaymentCompletedAfterInvoice(
    invoiceSentAt: Date | null,
    paymentCompletedAt: Date | null,
  ): boolean {
    if (!invoiceSentAt || !paymentCompletedAt) return true;
    return new Date(paymentCompletedAt).getTime() >= new Date(invoiceSentAt).getTime();
  }

  /**
   * Calculates expected subtotal
   */
  static calculateSubtotal(
    employeesCount: number,
    monthsRemaining: number,
    pricePerEmployee: number,
  ): number {
    return Math.round(employeesCount * monthsRemaining * pricePerEmployee * 100) / 100;
  }

  /**
   * Calculates expected total
   */
  static calculateTotal(subtotal: number, taxAmount: number): number {
    return Math.round((subtotal + taxAmount) * 100) / 100;
  }

  /**
   * Calculates local amount from USD
   */
  static calculateLocalAmount(usdAmount: number, exchangeRate: number): number {
    return Math.round(usdAmount * exchangeRate * 100) / 100;
  }

  /**
   * Calculates tax amount from tax rules
   */
  static calculateTaxFromRules(
    subtotal: number,
    taxRules: Array<{ rate: number; [key: string]: any }>,
  ): number {
    const totalTaxRate = taxRules.reduce((sum, rule) => sum + rule.rate, 0);
    return Math.round(subtotal * totalTaxRate * 100) / 100;
  }

  /**
   * Validates payment status transition
   */
  static validatePaymentStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED],
      [PAYMENT_STATUS.PROCESSING]: [
        PAYMENT_STATUS.COMPLETED,
        PAYMENT_STATUS.FAILED,
        PAYMENT_STATUS.CANCELLED,
      ],
      [PAYMENT_STATUS.COMPLETED]: [PAYMENT_STATUS.REFUNDED],
      [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED],
      [PAYMENT_STATUS.CANCELLED]: [PAYMENT_STATUS.PENDING],
      [PAYMENT_STATUS.REFUNDED]: [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Cleans and normalizes license adjustment data
   */
  static cleanLicenseAdjustmentData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean numeric fields
    if (cleaned.guid !== undefined) {
      cleaned.guid = parseInt(cleaned.guid.toString().trim());
    }
    if (cleaned.global_license !== undefined) {
      cleaned.global_license = parseInt(cleaned.global_license.toString().trim());
    }
    if (cleaned.employees_added_count !== undefined) {
      cleaned.employees_added_count = parseInt(cleaned.employees_added_count.toString().trim());
    }

    // Clean decimal fields
    const decimalFields = [
      'months_remaining',
      'price_per_employee_usd',
      'subtotal_usd',
      'tax_amount_usd',
      'total_amount_usd',
      'subtotal_local',
      'tax_amount_local',
      'total_amount_local',
    ];

    decimalFields.forEach((field) => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = parseFloat(cleaned[field].toString());
        if (
          field.includes('usd') ||
          field.includes('local') ||
          field === 'months_remaining' ||
          field === 'price_per_employee_usd'
        ) {
          cleaned[field] = Math.round(cleaned[field] * 100) / 100;
        }
      }
    });

    // Clean exchange rate (6 decimal places)
    if (cleaned.exchange_rate_used !== undefined) {
      cleaned.exchange_rate_used = parseFloat(cleaned.exchange_rate_used.toString());
      cleaned.exchange_rate_used = Math.round(cleaned.exchange_rate_used * 1000000) / 1000000;
    }

    // Clean currency code
    if (cleaned.billing_currency_code !== undefined) {
      cleaned.billing_currency_code = cleaned.billing_currency_code.toString().trim().toUpperCase();
    }

    // Clean payment status
    if (cleaned.payment_status !== undefined) {
      cleaned.payment_status = cleaned.payment_status.toString().trim().toUpperCase();
    }

    // Clean boolean
    if (cleaned.payment_due_immediately !== undefined) {
      if (typeof cleaned.payment_due_immediately === 'string') {
        cleaned.payment_due_immediately = cleaned.payment_due_immediately.toLowerCase() === 'true';
      }
    }

    // Clean dates
    const dateFields = ['adjustment_date', 'invoice_sent_at', 'payment_completed_at'];
    dateFields.forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = new Date(cleaned[field]);
      }
    });

    return cleaned;
  }

  /**
   * Validates complete license adjustment data for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = [
      'global_license',
      'adjustment_date',
      'employees_added_count',
      'months_remaining',
      'price_per_employee_usd',
      'subtotal_usd',
      'total_amount_usd',
      'billing_currency_code',
      'exchange_rate_used',
      'subtotal_local',
      'total_amount_local',
      'tax_rules_applied',
      'payment_status',
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    // Validate individual fields
    return (
      this.validateGlobalLicense(data.global_license) &&
      this.validateAdjustmentDate(data.adjustment_date) &&
      this.validateEmployeesAddedCount(data.employees_added_count) &&
      this.validateMonthsRemaining(data.months_remaining) &&
      this.validatePricePerEmployeeUsd(data.price_per_employee_usd) &&
      this.validateSubtotalUsd(data.subtotal_usd) &&
      this.validateTotalAmountUsd(data.total_amount_usd) &&
      this.validateBillingCurrencyCode(data.billing_currency_code) &&
      this.validateExchangeRate(data.exchange_rate_used) &&
      this.validateLocalAmount(data.subtotal_local) &&
      this.validateLocalAmount(data.total_amount_local) &&
      this.validateTaxRulesApplied(data.tax_rules_applied) &&
      this.validatePaymentStatus(data.payment_status) &&
      (data.tax_amount_usd === undefined || this.validateTaxAmountUsd(data.tax_amount_usd)) &&
      (data.tax_amount_local === undefined || this.validateLocalAmount(data.tax_amount_local)) &&
      this.validateAmountCalculation(data) &&
      this.validateTotalCalculation(data) &&
      this.validateLocalAmountsConsistency(data)
    );
  }

  /**
   * Gets all validation errors for license adjustment data
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!data.global_license || !this.validateGlobalLicense(data.global_license)) {
      errors.push(
        `Invalid global_license: must be an integer between ${LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.GLOBAL_LICENSE.MAX_VALUE}`,
      );
    }

    if (!data.adjustment_date || !this.validateAdjustmentDate(data.adjustment_date)) {
      errors.push('Invalid adjustment_date: must be a valid date');
    }

    if (
      !data.employees_added_count ||
      !this.validateEmployeesAddedCount(data.employees_added_count)
    ) {
      errors.push(
        `Invalid employees_added_count: must be an integer between ${LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.EMPLOYEES_ADDED_COUNT.MAX_VALUE}`,
      );
    }

    if (
      data.months_remaining === undefined ||
      !this.validateMonthsRemaining(data.months_remaining)
    ) {
      errors.push(
        `Invalid months_remaining: must be between ${LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.MONTHS_REMAINING.MAX_VALUE}`,
      );
    }

    if (
      data.price_per_employee_usd === undefined ||
      !this.validatePricePerEmployeeUsd(data.price_per_employee_usd)
    ) {
      errors.push(
        `Invalid price_per_employee_usd: must be between ${LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.PRICE_PER_EMPLOYEE_USD.MAX_VALUE}`,
      );
    }

    if (data.subtotal_usd === undefined || !this.validateSubtotalUsd(data.subtotal_usd)) {
      errors.push(
        `Invalid subtotal_usd: must be between ${LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.SUBTOTAL_USD.MAX_VALUE}`,
      );
    }

    if (data.tax_amount_usd !== undefined && !this.validateTaxAmountUsd(data.tax_amount_usd)) {
      errors.push(
        `Invalid tax_amount_usd: must be between ${LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.TAX_AMOUNT_USD.MAX_VALUE}`,
      );
    }

    if (
      data.total_amount_usd === undefined ||
      !this.validateTotalAmountUsd(data.total_amount_usd)
    ) {
      errors.push(
        `Invalid total_amount_usd: must be between ${LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.TOTAL_AMOUNT_USD.MAX_VALUE}`,
      );
    }

    if (
      !data.billing_currency_code ||
      !this.validateBillingCurrencyCode(data.billing_currency_code)
    ) {
      errors.push('Invalid billing_currency_code: must be a valid 3-letter ISO 4217 currency code');
    }

    if (
      data.exchange_rate_used === undefined ||
      !this.validateExchangeRate(data.exchange_rate_used)
    ) {
      errors.push(
        `Invalid exchange_rate_used: must be between ${LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MIN_VALUE} and ${LICENSE_ADJUSTMENT_VALIDATION.EXCHANGE_RATE_USED.MAX_VALUE}`,
      );
    }

    if (!data.tax_rules_applied || !this.validateTaxRulesApplied(data.tax_rules_applied)) {
      errors.push('Invalid tax_rules_applied: must be a non-empty array with valid rate objects');
    }

    if (!data.payment_status || !this.validatePaymentStatus(data.payment_status)) {
      errors.push(
        `Invalid payment_status: must be one of ${Object.values(PAYMENT_STATUS).join(', ')}`,
      );
    }

    // Business logic validations
    if (
      data.employees_added_count &&
      data.months_remaining &&
      data.price_per_employee_usd &&
      data.subtotal_usd
    ) {
      if (!this.validateAmountCalculation(data)) {
        errors.push(
          'Amount calculation error: employees_added_count * months_remaining * price_per_employee_usd must equal subtotal_usd (±0.01)',
        );
      }
    }

    if (data.subtotal_usd && data.tax_amount_usd !== undefined && data.total_amount_usd) {
      if (!this.validateTotalCalculation(data)) {
        errors.push(
          'Total calculation error: subtotal_usd + tax_amount_usd must equal total_amount_usd (±0.01)',
        );
      }
    }

    // Date logic validations
    if (data.adjustment_date && data.payment_completed_at) {
      if (
        !this.validatePaymentCompletedAfterAdjustment(
          data.adjustment_date,
          data.payment_completed_at,
        )
      ) {
        errors.push('payment_completed_at must be after adjustment_date');
      }
    }

    if (data.invoice_sent_at && data.payment_completed_at) {
      if (
        !this.validatePaymentCompletedAfterInvoice(data.invoice_sent_at, data.payment_completed_at)
      ) {
        errors.push('payment_completed_at must be after invoice_sent_at');
      }
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(filters: any): boolean {
    if (!filters || typeof filters !== 'object') return false;

    // At least one filter must be provided
    const validFilters = [
      'global_license',
      'adjustment_date_from',
      'adjustment_date_to',
      'employees_added_count_min',
      'employees_added_count_max',
      'months_remaining_min',
      'months_remaining_max',
      'price_per_employee_usd_min',
      'price_per_employee_usd_max',
      'subtotal_usd_min',
      'subtotal_usd_max',
      'total_amount_usd_min',
      'total_amount_usd_max',
      'billing_currency_code',
      'payment_status',
      'payment_due_immediately',
      'invoice_sent',
      'payment_completed',
    ];

    return validFilters.some((filter) => filters[filter] !== undefined);
  }
}

  /**
   * Auto-corrects common license adjustment data issues
   */
  // static autoCorrectData(data: Record<string, any>): {
  //   correctedData: Record<string, any>;
  //   corrections: string[];
  // } {
  //   const corrected = { ...data };
  //   const corrections: string[] = [];
  //
  //   // Auto-calculate subtotal if missing but other values present
  //   if (!corrected.subtotal_usd && corrected.employees_added_count && corrected.months_remaining && corrected.price_per