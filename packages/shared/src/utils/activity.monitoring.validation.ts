// utils/activity.monitoring.validation.ts

import { RiskLevel } from '../constants/fraud.detection.log.js';
import {
  ACTIVITY_MONITORING_PRIORITY_LEVELS,
  ACTIVITY_MONITORING_VALIDATION,
  ActivityStatus,
} from '../constants/activity.monitoring.js';

export class ActivityMonitoringValidationUtils {
  /**
   * Validates activity monitoring ID
   */
  static validateId(id: number | string): number {
    const numId = typeof id === 'string' ? parseInt(id) : id;
    if (isNaN(numId) || !Number.isInteger(numId) || numId < 1) {
      throw new Error('ID must be a positive integer');
    }
    return numId;
  }

  /**
   * Validates employee license ID
   */
  static validateEmployeeLicense(employeeLicense: number | string): number {
    const numEmployeeLicense =
      typeof employeeLicense === 'string' ? parseInt(employeeLicense) : employeeLicense;
    if (
      isNaN(numEmployeeLicense) ||
      !Number.isInteger(numEmployeeLicense) ||
      numEmployeeLicense < ACTIVITY_MONITORING_VALIDATION.EMPLOYEE_LICENSE.MIN_VALUE
    ) {
      throw new Error('Employee license must be a positive integer');
    }
    return numEmployeeLicense;
  }

  /**
   * Validates date format and range
   */
  static validateDate(date: Date | string): Date {
    const validDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(validDate.getTime())) {
      throw new Error('Date must be a valid date');
    }
    if (
      validDate < ACTIVITY_MONITORING_VALIDATION.DATE.MIN_DATE ||
      validDate > ACTIVITY_MONITORING_VALIDATION.DATE.MAX_DATE
    ) {
      throw new Error('Date is out of valid range');
    }
    if (validDate > new Date()) {
      throw new Error('Date cannot be in the future');
    }
    return validDate;
  }

  /**
   * Validates activity status
   */
  static validateActivityStatus(status: string): ActivityStatus {
    if (!status || typeof status !== 'string') {
      throw new Error('Activity status is required');
    }
    const normalizedStatus = status.trim().toUpperCase() as ActivityStatus;
    if (!Object.values(ActivityStatus).includes(normalizedStatus)) {
      throw new Error(
        `Activity status must be one of: ${Object.values(ActivityStatus).join(', ')}`,
      );
    }
    return normalizedStatus;
  }

  /**
   * Validates punch count
   */
  static validatePunchCount(count: number, fieldName: string = 'Punch count'): boolean {
    return (
      Number.isInteger(count) &&
      count >= ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MIN_VALUE &&
      count <= ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE
    );
  }

  /**
   * Validates consecutive absent days
   */
  static validateConsecutiveAbsentDays(days: number): boolean {
    return (
      Number.isInteger(days) &&
      days >= ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MIN_VALUE &&
      days <= ACTIVITY_MONITORING_VALIDATION.CONSECUTIVE_ABSENT_DAYS.MAX_VALUE
    );
  }

  /**
   * Validates punch count logic (7 days <= 30 days)
   */
  static validatePunchCountLogic(punchCount7Days: number, punchCount30Days: number): boolean {
    return punchCount7Days <= punchCount30Days;
  }

  /**
   * Validates risk level
   */
  static validateRiskLevel(riskLevel: string): RiskLevel {
    if (!riskLevel || typeof riskLevel !== 'string') {
      throw new Error('Risk level is required');
    }
    const normalizedRiskLevel = riskLevel.trim().toUpperCase() as RiskLevel;
    if (!Object.values(RiskLevel).includes(normalizedRiskLevel)) {
      throw new Error(`Risk level must be one of: ${Object.values(RiskLevel).join(', ')}`);
    }
    return normalizedRiskLevel;
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(
    offset?: string | number,
    limit?: string | number,
  ): { offset: number; limit: number } {
    let validOffset = 0;
    let validLimit = 50;

    if (offset !== undefined && offset !== null) {
      const numOffset = typeof offset === 'string' ? parseInt(offset) : offset;
      if (isNaN(numOffset) || numOffset < 0) {
        throw new Error('Offset must be a non-negative integer');
      }
      validOffset = numOffset;
    }

    if (limit !== undefined && limit !== null) {
      const numLimit = typeof limit === 'string' ? parseInt(limit) : limit;
      if (isNaN(numLimit) || numLimit < 1) {
        throw new Error('Limit must be a positive integer');
      }
      if (numLimit > ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE) {
        validLimit = ACTIVITY_MONITORING_VALIDATION.PUNCH_COUNT.MAX_VALUE;
      } else {
        validLimit = numLimit;
      }
    }

    return { offset: validOffset, limit: validLimit };
  }

  /**
   * Validates date range
   */
  static validateDateRange(
    startDate: Date | string,
    endDate: Date | string,
  ): { start: Date; end: Date } {
    const start = this.validateDate(startDate);
    const end = this.validateDate(endDate);

    if (start > end) {
      throw new Error('Start date must be before or equal to end date');
    }

    return { start, end };
  }

  /**
   * Validates filters object
   */
  static validateFilters(filters: Record<string, any>): Record<string, any> {
    const validatedFilters: Record<string, any> = {};

    // Validate employee_license filter
    if (filters.employee_license !== undefined) {
      try {
        validatedFilters.employee_license = this.validateEmployeeLicense(filters.employee_license);
      } catch (error: any) {
        throw new Error(`Invalid employee_license filter: ${error.message}`);
      }
    }

    // Validate status filter
    if (filters.status_at_date !== undefined) {
      try {
        validatedFilters.status_at_date = this.validateActivityStatus(filters.status_at_date);
      } catch (error: any) {
        throw new Error(`Invalid status filter: ${error.message}`);
      }
    }

    // Validate date filters
    const dateFields = [
      'monitoring_date',
      'monitoring_date_from',
      'monitoring_date_to',
      'last_punch_date',
      'last_punch_date_from',
      'last_punch_date_to',
    ];

    dateFields.forEach((field) => {
      if (filters[field] !== undefined) {
        try {
          validatedFilters[field] = this.validateDate(filters[field]);
        } catch (error: any) {
          throw new Error(`Invalid ${field} filter: ${error.message}`);
        }
      }
    });

    // Validate numeric filters
    const numericFields = [
      'punch_count_7_days',
      'punch_count_7_days_min',
      'punch_count_7_days_max',
      'punch_count_30_days',
      'punch_count_30_days_min',
      'punch_count_30_days_max',
      'consecutive_absent_days',
      'consecutive_absent_days_min',
      'consecutive_absent_days_max',
    ];

    numericFields.forEach((field) => {
      if (filters[field] !== undefined) {
        const value = parseInt(filters[field]);
        if (isNaN(value) || value < 0) {
          throw new Error(`${field} must be a non-negative integer`);
        }
        validatedFilters[field] = value;
      }
    });

    // Validate date ranges
    if (validatedFilters.monitoring_date_from && validatedFilters.monitoring_date_to) {
      this.validateDateRange(
        validatedFilters.monitoring_date_from,
        validatedFilters.monitoring_date_to,
      );
    }

    if (validatedFilters.last_punch_date_from && validatedFilters.last_punch_date_to) {
      this.validateDateRange(
        validatedFilters.last_punch_date_from,
        validatedFilters.last_punch_date_to,
      );
    }

    return validatedFilters;
  }

  /**
   * Calculates risk level based on activity data
   */
  static calculateRiskLevel(
    consecutiveAbsentDays: number,
    punchCount7Days: number,
    statusAtDate: ActivityStatus,
  ): RiskLevel {
    if (statusAtDate === ActivityStatus.INACTIVE) {
      return RiskLevel.LOW; // Inactive is expected, not risky
    }

    if (statusAtDate === ActivityStatus.SUSPICIOUS) {
      if (
        consecutiveAbsentDays >= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.CRITICAL_ABSENCE_MIN_DAYS
      ) {
        return RiskLevel.CRITICAL;
      }
      if (
        consecutiveAbsentDays >= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.LONG_ABSENCE_MIN_DAYS
      ) {
        return RiskLevel.HIGH;
      }
      return RiskLevel.MEDIUM;
    }

    // For ACTIVE status
    if (
      punchCount7Days >=
      ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.HIGHLY_ACTIVE_MIN_PUNCH_COUNT_7_DAYS
    ) {
      return RiskLevel.LOW;
    }

    if (
      punchCount7Days >= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.ACTIVE_MIN_PUNCH_COUNT_7_DAYS
    ) {
      return RiskLevel.LOW;
    }

    return RiskLevel.MEDIUM;
  }

  /**
   * Determines attention priority level
   */
  static getAttentionPriority(riskLevel: RiskLevel): number {
    return ACTIVITY_MONITORING_PRIORITY_LEVELS[riskLevel];
  }

  /**
   * Checks if employee requires attention
   */
  static requiresAttention(
    statusAtDate: ActivityStatus,
    consecutiveAbsentDays: number,
    punchCount7Days: number,
  ): boolean {
    if (statusAtDate === ActivityStatus.SUSPICIOUS) {
      return true;
    }

    if (statusAtDate === ActivityStatus.ACTIVE && punchCount7Days === 0) {
      return true;
    }

    if (
      consecutiveAbsentDays >= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.SUSPICIOUS_ABSENCE_MIN_DAYS
    ) {
      return true;
    }

    return false;
  }

  /**
   * Gets action recommendations based on status and risk level
   */
  static getActionRecommendations(
    statusAtDate: ActivityStatus,
    riskLevel: RiskLevel,
    consecutiveAbsentDays: number,
    punchCount7Days: number,
  ): string[] {
    const baseRecommendations: string[] = [];

    switch (statusAtDate) {
      case ActivityStatus.ACTIVE:
        if (riskLevel === RiskLevel.LOW) {
          baseRecommendations.push('Continue monitoring regular activity');
        } else {
          baseRecommendations.push('Monitor for activity consistency');
          if (
            punchCount7Days <=
            ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.LOW_ACTIVITY_MAX_PUNCH_COUNT
          ) {
            baseRecommendations.push('Check for temporary absence or technical issues');
          }
        }
        break;

      case ActivityStatus.INACTIVE:
        baseRecommendations.push('Verify employee status and leave declarations');
        baseRecommendations.push('Confirm deactivation is intentional');
        break;

      case ActivityStatus.SUSPICIOUS:
        baseRecommendations.push('Contact employee immediately');
        baseRecommendations.push('Investigate reason for absence');
        if (
          consecutiveAbsentDays >= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.LONG_ABSENCE_MIN_DAYS
        ) {
          baseRecommendations.push('Escalate to HR department');
        }
        if (riskLevel === RiskLevel.CRITICAL) {
          baseRecommendations.push('URGENT: Immediate management attention required');
        }
        break;
    }

    // Add risk-specific recommendations
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      baseRecommendations.push('Document all findings and actions taken');
      baseRecommendations.push('Consider contractual implications');
    }

    return baseRecommendations;
  }

  /**
   * Calculates activity ratio for a given period
   */
  static calculateActivityRatio(punchCount: number, days: number): number {
    if (days <= 0) return 0;
    return Math.round((punchCount / days) * 100) / 100;
  }

  /**
   * Calculates days since last activity
   */
  static calculateDaysSinceLastActivity(lastPunchDate: Date | null): number {
    if (!lastPunchDate) return -1;
    const now = new Date();
    const diffTime = now.getTime() - lastPunchDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determines if activity pattern is concerning
   */
  static isConcerningPattern(
    consecutiveAbsentDays: number,
    punchCount7Days: number,
    punchCount30Days: number,
  ): boolean {
    // Long absence without justification
    if (consecutiveAbsentDays >= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.LONG_ABSENCE_MIN_DAYS) {
      return true;
    }

    // Very low activity over recent period
    if (
      punchCount7Days === 0 &&
      punchCount30Days <= ACTIVITY_MONITORING_VALIDATION.THRESHOLDS.LOW_ACTIVITY_MAX_PUNCH_COUNT
    ) {
      return true;
    }

    // Dramatic drop in activity (30-day vs 7-day comparison)
    if (punchCount30Days >= 10 && punchCount7Days === 0) {
      return true;
    }

    return false;
  }

  /**
   * Validates activity monitoring data consistency
   */
  static validateDataConsistency(
    punchCount7Days: number,
    punchCount30Days: number,
    consecutiveAbsentDays: number,
    lastPunchDate: Date | null,
    monitoringDate: Date,
  ): string[] {
    const errors: string[] = [];

    // Punch count logic validation
    if (!this.validatePunchCountLogic(punchCount7Days, punchCount30Days)) {
      errors.push('7-day punch count cannot exceed 30-day punch count');
    }

    // Validate punch counts
    if (!this.validatePunchCount(punchCount7Days)) {
      errors.push('Invalid 7-day punch count');
    }

    if (!this.validatePunchCount(punchCount30Days)) {
      errors.push('Invalid 30-day punch count');
    }

    // Validate absent days
    if (!this.validateConsecutiveAbsentDays(consecutiveAbsentDays)) {
      errors.push('Invalid consecutive absent days');
    }

    // Logic validation: if there are recent punches, absent days should be low
    if (punchCount7Days > 0 && consecutiveAbsentDays > 7) {
      errors.push('Inconsistent data: recent punches but high consecutive absent days');
    }

    // Last punch date consistency
    if (lastPunchDate && consecutiveAbsentDays === 0) {
      const daysSinceLastPunch = this.calculateDaysSinceLastActivity(lastPunchDate);
      if (daysSinceLastPunch > 1) {
        errors.push('Inconsistent data: last punch date does not align with zero absent days');
      }
    }

    return errors;
  }

  /**
   * Cleans and normalizes activity monitoring data
   */
  static cleanActivityMonitoringData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    [
      'id',
      'employee_license',
      'punch_count_7_days',
      'punch_count_30_days',
      'consecutive_absent_days',
    ].forEach((field) => {
      if (cleaned[field] !== undefined) {
        const num = parseInt(cleaned[field]);
        if (isNaN(num)) {
          throw new Error(`Invalid ${field}: must be a valid integer`);
        }
        cleaned[field] = num;
      }
    });

    // Convert date fields
    ['monitoring_date', 'last_punch_date', 'created_at', 'updated_at'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Normalize status
    if (cleaned.status_at_date !== undefined) {
      cleaned.status_at_date = cleaned.status_at_date.toString().trim().toUpperCase();
    }

    return cleaned;
  }

  /**
   * Checks if data is valid for a specific operation
   */
  static isValidForOperation(data: any, operation: 'create' | 'update' | 'filter'): boolean {
    switch (operation) {
      case 'create':
        // Creation is handled by PostgreSQL triggers only
        return false;

      case 'update':
        // Only status updates are allowed
        return (
          data.status_at_date !== undefined &&
          Object.values(ActivityStatus).includes(data.status_at_date)
        );

      case 'filter':
        // Basic filter validation
        return Object.keys(data).length > 0;

      default:
        return false;
    }
  }

  /**
   * Gets validation errors for activity monitoring data
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (data.id !== undefined && !this.validateId(data.id)) {
      errors.push('Invalid ID: must be a positive integer');
    }

    if (data.employee_license !== undefined) {
      try {
        this.validateEmployeeLicense(data.employee_license);
      } catch (error: any) {
        errors.push(`Invalid employee license: ${error.message}`);
      }
    }

    if (data.monitoring_date !== undefined) {
      try {
        this.validateDate(data.monitoring_date);
      } catch (error: any) {
        errors.push(`Invalid monitoring date: ${error.message}`);
      }
    }

    if (data.status_at_date !== undefined) {
      try {
        this.validateActivityStatus(data.status_at_date);
      } catch (error: any) {
        errors.push(`Invalid activity status: ${error.message}`);
      }
    }

    if (
      data.punch_count_7_days !== undefined &&
      !this.validatePunchCount(data.punch_count_7_days)
    ) {
      errors.push('Invalid 7-day punch count: must be between 0 and 999');
    }

    if (
      data.punch_count_30_days !== undefined &&
      !this.validatePunchCount(data.punch_count_30_days)
    ) {
      errors.push('Invalid 30-day punch count: must be between 0 and 999');
    }

    if (
      data.consecutive_absent_days !== undefined &&
      !this.validateConsecutiveAbsentDays(data.consecutive_absent_days)
    ) {
      errors.push('Invalid consecutive absent days: must be between 0 and 9999');
    }

    // Cross-field validation
    if (data.punch_count_7_days !== undefined && data.punch_count_30_days !== undefined) {
      if (!this.validatePunchCountLogic(data.punch_count_7_days, data.punch_count_30_days)) {
        errors.push('7-day punch count cannot exceed 30-day punch count');
      }
    }

    return errors;
  }
}
