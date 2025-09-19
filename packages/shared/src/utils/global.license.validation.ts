// utils/global-master.validation.ts
import { GLOBAL_LICENSE_VALIDATION, LicenseStatus, Type } from '../constants/global.license.js';

export class GlobalLicenseValidationUtils {
  /**
   * Validates tenant ID
   */
  static validateTenantId(tenantId: number): boolean {
    return Number.isInteger(tenantId) && tenantId >= 1;
  }

  /**
   * Validates master type
   */
  static validateLicenseType(licenseType: string): boolean {
    if (!licenseType || typeof licenseType !== 'string') return false;
    return Object.values(Type).includes(licenseType.trim().toUpperCase() as Type);
  }

  /**
   * Validates billing cycle months
   */
  static validateBillingCycleMonths(months: number): boolean {
    return (
      Number.isInteger(months) && GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.includes(months as any)
    );
  }

  /**
   * Validates base price in USD
   */
  static validateBasePriceUsd(price: number | string): boolean {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return (
      !isNaN(numPrice) &&
      numPrice >= GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MIN_VALUE &&
      numPrice <= GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MAX_VALUE
    );
  }

  /**
   * Validates minimum seats
   */
  static validateMinimumSeats(seats: number): boolean {
    return (
      Number.isInteger(seats) &&
      seats >= GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MIN_VALUE &&
      seats <= GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MAX_VALUE
    );
  }

  /**
   * Validates current period start date
   */
  static validateCurrentPeriodStart(date: Date | string): boolean {
    const startDate = new Date(date);
    return !isNaN(startDate.getTime()) && startDate <= new Date();
  }

  /**
   * Validates current period end date
   */
  static validateCurrentPeriodEnd(endDate: Date | string, startDate?: Date | string): boolean {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return false;

    if (startDate) {
      const start = new Date(startDate);
      return !isNaN(start.getTime()) && end > start;
    }

    return end >= new Date();
  }

  /**
   * Validates next renewal date
   */
  static validateNextRenewalDate(renewalDate: Date | string, endDate?: Date | string): boolean {
    const renewal = new Date(renewalDate);
    if (isNaN(renewal.getTime())) return false;

    if (endDate) {
      const end = new Date(endDate);
      return !isNaN(end.getTime()) && renewal >= end;
    }

    return renewal >= new Date();
  }

  /**
   * Validates total seats purchased
   */
  static validateTotalSeatsPurchased(seats: number | null): boolean {
    if (seats === null || seats === undefined) return true;
    return (
      Number.isInteger(seats) &&
      seats >= GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MIN_VALUE &&
      seats <= GLOBAL_LICENSE_VALIDATION.TOTAL_SEATS.MAX_VALUE
    );
  }

  /**
   * Validates master status
   */
  static validateLicenseStatus(status: string): boolean {
    if (!status || typeof status !== 'string') return false;
    return Object.values(LicenseStatus).includes(status.trim().toUpperCase() as LicenseStatus);
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: number | string): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      Number.isInteger(numGuid) &&
      numGuid >= GLOBAL_LICENSE_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= GLOBAL_LICENSE_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Validates that total seats meets minimum requirements
   */
  static validateSeatsRequirement(totalSeats: number, minimumSeats: number): boolean {
    return totalSeats >= minimumSeats;
  }

  /**
   * Validates date relationships
   */
  static validateDateLogic(
    startDate: Date | string,
    endDate: Date | string,
    renewalDate: Date | string,
  ): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const renewal = new Date(renewalDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(renewal.getTime())) {
      return false;
    }

    return start < end && renewal >= end;
  }

  /**
   * Checks if master is expired
   */
  static isExpired(endDate: Date | string): boolean {
    return new Date(endDate) < new Date();
  }

  /**
   * Checks if master is active
   */
  static isActive(status: string, endDate: Date | string): boolean {
    return status === LicenseStatus.ACTIVE && !this.isExpired(endDate);
  }

  /**
   * Cleans and normalizes global master data
   */
  static cleanGlobalLicenseData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert tenant
    if (cleaned.tenant !== undefined) {
      cleaned.tenant = parseInt(cleaned.tenant);
      if (isNaN(cleaned.tenant)) {
        throw new Error('Invalid tenant: must be a valid integer');
      }
    }

    // Clean license_type
    if (cleaned.license_type !== undefined) {
      cleaned.license_type = cleaned.license_type.toString().trim().toUpperCase();
    }

    // Convert billing_cycle_months
    if (cleaned.billing_cycle_months !== undefined) {
      cleaned.billing_cycle_months = parseInt(cleaned.billing_cycle_months);
      if (isNaN(cleaned.billing_cycle_months)) {
        throw new Error('Invalid billing_cycle_months: must be a valid integer');
      }
    }

    // Convert base_price_usd
    if (cleaned.base_price_usd !== undefined) {
      cleaned.base_price_usd = parseFloat(cleaned.base_price_usd);
      if (isNaN(cleaned.base_price_usd)) {
        throw new Error('Invalid base_price_usd: must be a valid number');
      }
      // Round to 2 decimal places
      cleaned.base_price_usd = Math.round(cleaned.base_price_usd * 100) / 100;
    }

    // Convert minimum_seats
    if (cleaned.minimum_seats !== undefined) {
      cleaned.minimum_seats = parseInt(cleaned.minimum_seats);
      if (isNaN(cleaned.minimum_seats)) {
        throw new Error('Invalid minimum_seats: must be a valid integer');
      }
    }

    // Convert dates
    ['current_period_start', 'current_period_end', 'next_renewal_date'].forEach((field) => {
      if (cleaned[field] !== undefined) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Convert total_seats_purchased
    if (cleaned.total_seats_purchased !== undefined && cleaned.total_seats_purchased !== null) {
      cleaned.total_seats_purchased = parseInt(cleaned.total_seats_purchased);
      if (isNaN(cleaned.total_seats_purchased)) {
        throw new Error('Invalid total_seats_purchased: must be a valid integer');
      }
    }

    // Clean license_status
    if (cleaned.license_status !== undefined) {
      cleaned.license_status = cleaned.license_status.toString().trim().toUpperCase();
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
   * Validates that a global master is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = [
      'tenant',
      'license_type',
      'billing_cycle_months',
      'current_period_start',
      'current_period_end',
      'next_renewal_date',
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateTenantId(data.tenant) &&
      this.validateLicenseType(data.license_type) &&
      this.validateBillingCycleMonths(data.billing_cycle_months) &&
      this.validateCurrentPeriodStart(data.current_period_start) &&
      this.validateCurrentPeriodEnd(data.current_period_end, data.current_period_start) &&
      this.validateNextRenewalDate(data.next_renewal_date, data.current_period_end) &&
      this.validateDateLogic(
        data.current_period_start,
        data.current_period_end,
        data.next_renewal_date,
      )
    );
  }

  /**
   * Extracts validation errors for a global master
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.tenant || !this.validateTenantId(data.tenant)) {
      errors.push('Invalid tenant: must be a positive integer');
    }

    if (!data.license_type || !this.validateLicenseType(data.license_type)) {
      errors.push(`Invalid license_type: must be one of ${Object.values(Type).join(', ')}`);
    }

    if (!data.billing_cycle_months || !this.validateBillingCycleMonths(data.billing_cycle_months)) {
      errors.push(
        `Invalid billing_cycle_months: must be one of ${GLOBAL_LICENSE_VALIDATION.BILLING_CYCLES.join(', ')}`,
      );
    }

    if (data.base_price_usd !== undefined && !this.validateBasePriceUsd(data.base_price_usd)) {
      errors.push(
        `Invalid base_price_usd: must be between ${GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MIN_VALUE} and ${GLOBAL_LICENSE_VALIDATION.BASE_PRICE_USD.MAX_VALUE}`,
      );
    }

    if (data.minimum_seats !== undefined && !this.validateMinimumSeats(data.minimum_seats)) {
      errors.push(
        `Invalid minimum_seats: must be between ${GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MIN_VALUE} and ${GLOBAL_LICENSE_VALIDATION.MINIMUM_SEATS.MAX_VALUE}`,
      );
    }

    if (!data.current_period_start || !this.validateCurrentPeriodStart(data.current_period_start)) {
      errors.push('Invalid current_period_start: must be a valid date not in the future');
    }

    if (
      !data.current_period_end ||
      !this.validateCurrentPeriodEnd(data.current_period_end, data.current_period_start)
    ) {
      errors.push('Invalid current_period_end: must be a valid date after current_period_start');
    }

    if (
      !data.next_renewal_date ||
      !this.validateNextRenewalDate(data.next_renewal_date, data.current_period_end)
    ) {
      errors.push('Invalid next_renewal_date: must be a valid date on or after current_period_end');
    }

    if (
      data.total_seats_purchased !== undefined &&
      !this.validateTotalSeatsPurchased(data.total_seats_purchased)
    ) {
      errors.push('Invalid total_seats_purchased: must be a non-negative integer');
    }

    if (data.license_status !== undefined && !this.validateLicenseStatus(data.license_status)) {
      errors.push(
        `Invalid license_status: must be one of ${Object.values(LicenseStatus).join(', ')}`,
      );
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push('Invalid GUID: must be a 6-digit integer between 100000 and 999999');
    }

    // Validate date logic if all dates are present
    if (data.current_period_start && data.current_period_end && data.next_renewal_date) {
      if (
        !this.validateDateLogic(
          data.current_period_start,
          data.current_period_end,
          data.next_renewal_date,
        )
      ) {
        errors.push(
          'Invalid date logic: ensure current_period_start < current_period_end <= next_renewal_date',
        );
      }
    }

    // Validate seats requirement if both values are present
    if (data.total_seats_purchased && data.minimum_seats) {
      if (!this.validateSeatsRequirement(data.total_seats_purchased, data.minimum_seats)) {
        errors.push(
          `Total seats purchased (${data.total_seats_purchased}) must meet minimum requirement (${data.minimum_seats})`,
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
      (data.license_type && this.validateLicenseType(data.license_type)) ||
      (data.license_status && this.validateLicenseStatus(data.license_status)) ||
      (data.billing_cycle_months && this.validateBillingCycleMonths(data.billing_cycle_months)) ||
      (data.tenant && this.validateTenantId(data.tenant)) ||
      (data.minimum_seats !== undefined && this.validateMinimumSeats(data.minimum_seats)) ||
      (data.base_price_usd !== undefined && this.validateBasePriceUsd(data.base_price_usd))
    );
  }

  /**
   * Normalizes master type for search
   */
  static normalizeLicenseType(type: string): string {
    if (!this.validateLicenseType(type)) {
      throw new Error('Invalid master type for normalization');
    }
    return type.trim().toUpperCase();
  }

  /**
   * Normalizes master status for search
   */
  static normalizeLicenseStatus(status: string): string {
    if (!this.validateLicenseStatus(status)) {
      throw new Error('Invalid master status for normalization');
    }
    return status.trim().toUpperCase();
  }

  /**
   * Calculates monthly price based on seats and base price
   */
  static calculateMonthlyPrice(basePrice: number, seats: number, minimumSeats: number): number {
    const effectiveSeats = Math.max(seats, minimumSeats);
    return Math.round(basePrice * effectiveSeats * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculates total period price
   */
  static calculatePeriodPrice(
    basePrice: number,
    seats: number,
    minimumSeats: number,
    billingCycleMonths: number,
  ): number {
    const monthlyPrice = this.calculateMonthlyPrice(basePrice, seats, minimumSeats);
    return Math.round(monthlyPrice * billingCycleMonths * 100) / 100;
  }

  /**
   * Generates next renewal date based on current period end and billing cycle
   */
  static calculateNextRenewalDate(
    currentPeriodEnd: Date | string,
    billingCycleMonths: number,
  ): Date {
    const endDate = new Date(currentPeriodEnd);
    endDate.setMonth(endDate.getMonth() + billingCycleMonths);
    return endDate;
  }
}
