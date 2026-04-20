// utils/schedule_exceptions.validation.ts
import {
  SAFamily,
  SCHEDULE_ASSIGNMENTS_VALIDATION,
} from '../../constants/tenant/schedule.assignments.js';
import { TimezoneConfigUtils } from '../timezone.config.validation.js';

export class ScheduleAssignmentsValidationUtils {
  static validateFamily(family: any): family is SAFamily {
    return Object.values(SAFamily).includes(family);
  }

  static validateRelated(related: any): boolean {
    if (!related || typeof related !== 'string') return false;
    return related.length >= 1 && related.length <= 255;
  }

  /**
   * Validates session_template ID
   */
  static validateSessionTemplate(sessionTemplate: any): boolean {
    if (typeof sessionTemplate !== 'string') return false;
    return (
      sessionTemplate.length >= SCHEDULE_ASSIGNMENTS_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH &&
      sessionTemplate.length <= SCHEDULE_ASSIGNMENTS_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH
    );
  }

  /**
   * Validates start_date (YYYY-MM-DD format)
   */
  static validateStartDate(startDate: any): boolean {
    if (!startDate || typeof startDate !== 'string') return false;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) return false;

    const date = new Date(startDate);
    return !isNaN(date.getTime());
  }

  /**
   * Validates end_date (YYYY-MM-DD format)
   */
  static validateEndDate(endDate: any): boolean {
    if (!endDate || typeof endDate !== 'string') return false;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) return false;

    const date = new Date(endDate);
    return !isNaN(date.getTime());
  }

  /**
   * Validates that end_date is after or equal to start_date
   */
  static validateDateRange(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end >= start;
  }

  /**
   * Validates created_by
   */
  static validateCreatedBy(createdBy: any): boolean {
    if (createdBy === null || createdBy === undefined) return true;
    if (typeof createdBy !== 'string') return false;
    return (
      createdBy.length >= SCHEDULE_ASSIGNMENTS_VALIDATION.CREATED_BY.MIN_LENGTH &&
      createdBy.length <= SCHEDULE_ASSIGNMENTS_VALIDATION.CREATED_BY.MAX_LENGTH
    );
  }

  /**
   * Validates reason
   */
  static validateReason(reason: any): boolean {
    if (reason === null || reason === undefined) return true;
    if (typeof reason !== 'string') return false;
    const trimmed = reason.trim();
    return (
      trimmed.length >= SCHEDULE_ASSIGNMENTS_VALIDATION.REASON.MIN_LENGTH &&
      trimmed.length <= SCHEDULE_ASSIGNMENTS_VALIDATION.REASON.MAX_LENGTH
    );
  }

  /**
   * Validates active status
   */
  static validateActive(active: any): boolean {
    return typeof active === 'boolean';
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    return (
      guid.length >= SCHEDULE_ASSIGNMENTS_VALIDATION.GUID.MIN_LENGTH &&
      guid.length <= SCHEDULE_ASSIGNMENTS_VALIDATION.GUID.MAX_LENGTH
    );
  }

  /**
   * Cleans and normalizes schedule exception data
   */
  static cleanScheduleAssignmentsData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean string fields
    if (cleaned.tenant !== undefined && cleaned.tenant !== null) {
      cleaned.tenant = cleaned.tenant.toString().trim();
    }

    if (cleaned.family !== undefined) {
      cleaned.family = cleaned.family.toString().trim();
    }
    if (cleaned.related !== undefined && cleaned.related !== null) {
      cleaned.related = cleaned.related.toString().trim();
    }

    if (cleaned.created_by !== undefined && cleaned.created_by !== null) {
      cleaned.created_by = parseInt(cleaned.created_by, 10);
      if (isNaN(cleaned.created_by)) {
        throw new Error('Invalid created_by: must be a valid integer');
      }
    }

    // Clean date fields
    if (cleaned.start_date !== undefined && cleaned.start_date !== null) {
      if (cleaned.start_date instanceof Date) {
        cleaned.start_date = cleaned.start_date.toISOString().split('T')[0];
      } else {
        cleaned.start_date = cleaned.start_date.toString().trim();
      }
    }

    if (cleaned.end_date !== undefined && cleaned.end_date !== null) {
      if (cleaned.end_date instanceof Date) {
        cleaned.end_date = cleaned.end_date.toISOString().split('T')[0];
      } else {
        cleaned.end_date = cleaned.end_date.toString().trim();
      }
    }

    // Clean reason
    if (cleaned.reason !== undefined && cleaned.reason !== null) {
      cleaned.reason = cleaned.reason.toString().trim();
    }

    // Convert boolean fields
    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(cleaned.active);
    }

    return cleaned;
  }

  /**
   * Checks if a date is within an exception period
   */
  static isDateInException(targetDate: Date, startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return targetDate >= start && targetDate <= end;
  }

  /**
   * Checks if two exception periods overlap
   */
  static checkDateRangeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);

    return s1 <= e2 && s2 <= e1;
  }

  /**
   * Calculates the duration of an exception in days
   */
  static calculateExceptionDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  }

  /**
   * Gets all dates covered by an exception
   */
  static getExceptionDates(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0]!);
    }

    return dates;
  }

  /**
   * Checks if an exception is currently active
   */
  static isExceptionActive(
    startDate: string,
    endDate: string,
    currentDate: Date = TimezoneConfigUtils.getCurrentTime(),
  ): boolean {
    return this.isDateInException(currentDate, startDate, endDate);
  }

  /**
   * Formats date to YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }
}
