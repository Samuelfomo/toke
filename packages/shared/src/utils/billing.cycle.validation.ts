// utils/billing.cycle.validation.ts
import { BILLING_CYCLE_VALIDATION, BillingStatus } from '../constants/billing.cycle.js';

export class BillingCycleValidationUtils {
  /**
   * Validates global master ID
   */
  static validateGlobalLicense(globalLicense: number): boolean {
    return Number.isInteger(globalLicense) && globalLicense >= 1;
  }

  /**
   * Validates period start date
   */
  static validatePeriodStart(date: Date | string): boolean {
    const startDate = new Date(date);
    return !isNaN(startDate.getTime()) && startDate <= new Date();
  }

  /**
   * Validates period end date
   */
  static validatePeriodEnd(endDate: Date | string, startDate?: Date | string): boolean {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return false;

    if (startDate) {
      const start = new Date(startDate);
      return !isNaN(start.getTime()) && end > start;
    }

    return true;
  }

  /**
   * Validates employee count
   */
  static validateEmployeeCount(count: number): boolean {
    return (
      Number.isInteger(count) &&
      count >= BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE &&
      count <= BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE
    );
  }

  /**
   * Validates USD amount
   */
  static validateAmountUsd(amount: number | string): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE &&
      numAmount <= BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE
    );
  }

  /**
   * Validates local currency amount
   */
  static validateAmountLocal(amount: number | string): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
      !isNaN(numAmount) &&
      numAmount >= BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MIN_VALUE &&
      numAmount <= BILLING_CYCLE_VALIDATION.AMOUNT_LOCAL.MAX_VALUE
    );
  }

  /**
   * Validates currency code
   */
  static validateCurrencyCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const upperCode = code.trim().toUpperCase();
    return (
      upperCode.length === BILLING_CYCLE_VALIDATION.CURRENCY_CODE.LENGTH &&
      BILLING_CYCLE_VALIDATION.CURRENCY_CODE.PATTERN.test(upperCode)
    );
  }

  /**
   * Validates exchange rate
   */
  static validateExchangeRate(rate: number | string): boolean {
    const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
    return (
      !isNaN(numRate) &&
      numRate >= BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MIN_VALUE &&
      numRate <= BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MAX_VALUE
    );
  }

  /**
   * Validates billing status
   */
  static validateBillingStatus(status: string): boolean {
    if (!status || typeof status !== 'string') return false;
    return Object.values(BillingStatus).includes(status.trim().toUpperCase() as BillingStatus);
  }

  /**
   * Validates payment due date
   */
  static validatePaymentDueDate(dueDate: Date | string, periodEnd?: Date | string): boolean {
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return false;

    if (periodEnd) {
      const end = new Date(periodEnd);
      return !isNaN(end.getTime()) && due >= end;
    }

    return due >= new Date();
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: number | string): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      Number.isInteger(numGuid) &&
      numGuid >= BILLING_CYCLE_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= BILLING_CYCLE_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Validates tax rules array
   */
  static validateTaxRules(taxRules: any[]): boolean {
    if (!Array.isArray(taxRules)) return false;

    return taxRules.every((rule) => {
      return (
        typeof rule === 'object' &&
        rule !== null &&
        typeof rule.rate === 'number' &&
        rule.rate >= 0 &&
        rule.rate <= 100
      );
    });
  }

  /**
   * Validates date relationships
   */
  static validateDateLogic(
    periodStart: Date | string,
    periodEnd: Date | string,
    paymentDue: Date | string,
  ): boolean {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const due = new Date(paymentDue);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(due.getTime())) {
      return false;
    }

    return start < end && due >= end;
  }

  /**
   * Validates amount calculations
   */
  static validateAmountCalculations(
    baseAmount: number,
    adjustments: number = 0,
    taxAmount: number = 0,
    subtotal: number,
    totalAmount: number,
  ): boolean {
    const calculatedSubtotal = baseAmount + adjustments;
    const calculatedTotal = calculatedSubtotal + taxAmount;

    // Allow small floating point differences
    const tolerance = 0.01;

    return (
      Math.abs(subtotal - calculatedSubtotal) <= tolerance &&
      Math.abs(totalAmount - calculatedTotal) <= tolerance
    );
  }

  /**
   * Validates currency conversion consistency
   */
  static validateCurrencyConversion(
    usdAmount: number,
    localAmount: number,
    exchangeRate: number,
  ): boolean {
    const expectedLocalAmount = usdAmount * exchangeRate;
    const tolerance = 0.01;

    return Math.abs(localAmount - expectedLocalAmount) <= tolerance;
  }

  /**
   * Checks if billing cycle is overdue
   */
  static isOverdue(paymentDueDate: Date | string, billingStatus?: string): boolean {
    const due = new Date(paymentDueDate);
    if (isNaN(due.getTime())) return false;

    const now = new Date();
    return now > due && billingStatus !== BillingStatus.COMPLETED;
  }

  /**
   * Checks if billing cycle is due soon
   */
  static isDueSoon(paymentDueDate: Date | string, days: number = 7): boolean {
    const due = new Date(paymentDueDate);
    if (isNaN(due.getTime())) return false;

    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);

    return due <= warningDate && due >= now;
  }

  /**
   * Cleans and normalizes billing cycle data
   */
  static cleanBillingCycleData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert global_license
    if (cleaned.global_license !== undefined) {
      cleaned.global_license = parseInt(cleaned.global_license);
      if (isNaN(cleaned.global_license)) {
        throw new Error('Invalid global_license: must be a valid integer');
      }
    }

    // Convert dates
    [
      'period_start',
      'period_end',
      'payment_due_date',
      'invoice_generated_at',
      'payment_completed_at',
    ].forEach((field) => {
      if (cleaned[field] !== undefined) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Convert employee counts
    ['base_employee_count', 'final_employee_count'].forEach((field) => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = parseInt(cleaned[field]);
        if (isNaN(cleaned[field])) {
          throw new Error(`Invalid ${field}: must be a valid integer`);
        }
      }
    });

    // Convert amounts
    [
      'base_amount_usd',
      'adjustments_amount_usd',
      'subtotal_usd',
      'tax_amount_usd',
      'total_amount_usd',
      'base_amount_local',
      'adjustments_amount_local',
      'subtotal_local',
      'tax_amount_local',
      'total_amount_local',
    ].forEach((field) => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = parseFloat(cleaned[field]);
        if (isNaN(cleaned[field])) {
          throw new Error(`Invalid ${field}: must be a valid number`);
        }
        // Round to 2 decimal places
        cleaned[field] = Math.round(cleaned[field] * 100) / 100;
      }
    });

    // Convert exchange rate
    if (cleaned.exchange_rate_used !== undefined) {
      cleaned.exchange_rate_used = parseFloat(cleaned.exchange_rate_used);
      if (isNaN(cleaned.exchange_rate_used)) {
        throw new Error('Invalid exchange_rate_used: must be a valid number');
      }
      // Round to 6 decimal places
      cleaned.exchange_rate_used = Math.round(cleaned.exchange_rate_used * 1000000) / 1000000;
    }

    // Clean billing currency code
    if (cleaned.billing_currency_code !== undefined) {
      cleaned.billing_currency_code = cleaned.billing_currency_code.toString().trim().toUpperCase();
    }

    // Clean billing status
    if (cleaned.billing_status !== undefined) {
      cleaned.billing_status = cleaned.billing_status.toString().trim().toUpperCase();
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
   * Validates that a billing cycle is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = [
      'global_license',
      'period_start',
      'period_end',
      'base_employee_count',
      'final_employee_count',
      'base_amount_usd',
      'subtotal_usd',
      'total_amount_usd',
      'billing_currency_code',
      'exchange_rate_used',
      'base_amount_local',
      'subtotal_local',
      'total_amount_local',
      'payment_due_date',
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateGlobalLicense(data.global_license) &&
      this.validatePeriodStart(data.period_start) &&
      this.validatePeriodEnd(data.period_end, data.period_start) &&
      this.validateEmployeeCount(data.base_employee_count) &&
      this.validateEmployeeCount(data.final_employee_count) &&
      this.validateAmountUsd(data.base_amount_usd) &&
      this.validateAmountUsd(data.subtotal_usd) &&
      this.validateAmountUsd(data.total_amount_usd) &&
      this.validateCurrencyCode(data.billing_currency_code) &&
      this.validateExchangeRate(data.exchange_rate_used) &&
      this.validateAmountLocal(data.base_amount_local) &&
      this.validateAmountLocal(data.subtotal_local) &&
      this.validateAmountLocal(data.total_amount_local) &&
      this.validatePaymentDueDate(data.payment_due_date, data.period_end) &&
      this.validateDateLogic(data.period_start, data.period_end, data.payment_due_date)
    );
  }

  /**
   * Extracts validation errors for a billing cycle
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.global_license || !this.validateGlobalLicense(data.global_license)) {
      errors.push('Invalid global_license: must be a positive integer');
    }

    if (!data.period_start || !this.validatePeriodStart(data.period_start)) {
      errors.push('Invalid period_start: must be a valid date not in the future');
    }

    if (!data.period_end || !this.validatePeriodEnd(data.period_end, data.period_start)) {
      errors.push('Invalid period_end: must be a valid date after period_start');
    }

    if (!data.base_employee_count || !this.validateEmployeeCount(data.base_employee_count)) {
      errors.push(
        `Invalid base_employee_count: must be between ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE}`,
      );
    }

    if (!data.final_employee_count || !this.validateEmployeeCount(data.final_employee_count)) {
      errors.push(
        `Invalid final_employee_count: must be between ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.EMPLOYEE_COUNT.MAX_VALUE}`,
      );
    }

    if (data.base_amount_usd !== undefined && !this.validateAmountUsd(data.base_amount_usd)) {
      errors.push(
        `Invalid base_amount_usd: must be between ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.AMOUNT_USD.MAX_VALUE}`,
      );
    }

    if (data.billing_currency_code && !this.validateCurrencyCode(data.billing_currency_code)) {
      errors.push('Invalid billing_currency_code: must be a valid 3-letter ISO 4217 code');
    }

    if (
      data.exchange_rate_used !== undefined &&
      !this.validateExchangeRate(data.exchange_rate_used)
    ) {
      errors.push(
        `Invalid exchange_rate_used: must be between ${BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MIN_VALUE} and ${BILLING_CYCLE_VALIDATION.EXCHANGE_RATE.MAX_VALUE}`,
      );
    }

    if (data.billing_status !== undefined && !this.validateBillingStatus(data.billing_status)) {
      errors.push(
        `Invalid billing_status: must be one of ${Object.values(BillingStatus).join(', ')}`,
      );
    }

    if (
      data.payment_due_date &&
      !this.validatePaymentDueDate(data.payment_due_date, data.period_end)
    ) {
      errors.push('Invalid payment_due_date: must be a valid date on or after period_end');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push('Invalid GUID: must be a 6-digit integer between 100000 and 999999');
    }

    // Validate date logic if all dates are present
    if (data.period_start && data.period_end && data.payment_due_date) {
      if (!this.validateDateLogic(data.period_start, data.period_end, data.payment_due_date)) {
        errors.push('Invalid date logic: ensure period_start < period_end <= payment_due_date');
      }
    }

    // Validate amount calculations if all amounts are present
    if (data.base_amount_usd && data.subtotal_usd && data.total_amount_usd) {
      const adjustments = data.adjustments_amount_usd || 0;
      const tax = data.tax_amount_usd || 0;
      if (
        !this.validateAmountCalculations(
          data.base_amount_usd,
          adjustments,
          tax,
          data.subtotal_usd,
          data.total_amount_usd,
        )
      ) {
        errors.push(
          'Invalid amount calculations: subtotal must equal base + adjustments, total must equal subtotal + tax',
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
      (data.billing_status && this.validateBillingStatus(data.billing_status)) ||
      (data.billing_currency_code && this.validateCurrencyCode(data.billing_currency_code)) ||
      (data.global_license && this.validateGlobalLicense(data.global_license)) ||
      (data.min_total_amount_usd !== undefined &&
        this.validateAmountUsd(data.min_total_amount_usd)) ||
      (data.max_total_amount_usd !== undefined && this.validateAmountUsd(data.max_total_amount_usd))
    );
  }

  /**
   * Normalizes billing status for search
   */
  static normalizeBillingStatus(status: string): string {
    if (!this.validateBillingStatus(status)) {
      throw new Error('Invalid billing status for normalization');
    }
    return status.trim().toUpperCase();
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
   * Calculates period duration in days
   */
  static calculatePeriodDuration(startDate: Date | string, endDate: Date | string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates effective tax rate
   */
  static calculateEffectiveTaxRate(taxAmount: number, subtotal: number): number {
    if (!subtotal || subtotal === 0) return 0;
    return Math.round((taxAmount / subtotal) * 10000) / 100; // Round to 2 decimal places
  }

  /**
   * Converts USD amounts to local currency
   */
  static convertToLocalCurrency(usdAmount: number, exchangeRate: number): number {
    return Math.round(usdAmount * exchangeRate * 100) / 100;
  }
}
