// utils/schedule_exceptions.validation.ts
import { SCHEDULE_EXCEPTION_VALIDATION } from '../../constants/tenant/schedule.exceptions.js';
import { TimezoneConfigUtils } from '../timezone.config.validation.js';

export class ScheduleExceptionValidationUtils {
  // /**
  //  * Validates tenant
  //  */
  // static validateTenant(tenant: any): boolean {
  //   if (!tenant || typeof tenant !== 'string') return false;
  //   const trimmed = tenant.trim();
  //   return (
  //     trimmed.length >= SCHEDULE_EXCEPTION_VALIDATION.TENANT.MIN_LENGTH &&
  //     trimmed.length <= SCHEDULE_EXCEPTION_VALIDATION.TENANT.MAX_LENGTH
  //   );
  // }

  /**
   * Validates user
   */
  static validateUser(user: any): boolean {
    if (user === null || user === undefined) return true;
    if (typeof user !== 'string') return false;
    return (
      user.length >= SCHEDULE_EXCEPTION_VALIDATION.USER.MIN_LENGTH &&
      user.length <= SCHEDULE_EXCEPTION_VALIDATION.USER.MAX_LENGTH
    );
  }

  /**
   * Validates team
   */
  static validateTeam(team: any): boolean {
    if (team === null || team === undefined) return true;
    if (typeof team !== 'string') return false;
    return (
      team.length >= SCHEDULE_EXCEPTION_VALIDATION.TEAM.MIN_LENGTH &&
      team.length <= SCHEDULE_EXCEPTION_VALIDATION.TEAM.MAX_LENGTH
    );
  }

  /**
   * Validates that either user or team is specified (XOR)
   */
  static validateUserOrTeam(user: any, team: any): boolean {
    const hasUser = user !== null && user !== undefined;
    const hasTeam = team !== null && team !== undefined;
    return hasUser !== hasTeam; // XOR: exactly one must be true
  }

  /**
   * Validates session_template ID
   */
  static validateSessionTemplate(sessionTemplate: any): boolean {
    if (typeof sessionTemplate !== 'string') return false;
    return (
      sessionTemplate.length >= SCHEDULE_EXCEPTION_VALIDATION.SESSION_TEMPLATE.MIN_LENGTH &&
      sessionTemplate.length <= SCHEDULE_EXCEPTION_VALIDATION.SESSION_TEMPLATE.MAX_LENGTH
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
      createdBy.length >= SCHEDULE_EXCEPTION_VALIDATION.CREATED_BY.MIN_LENGTH &&
      createdBy.length <= SCHEDULE_EXCEPTION_VALIDATION.CREATED_BY.MAX_LENGTH
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
      trimmed.length >= SCHEDULE_EXCEPTION_VALIDATION.REASON.MIN_LENGTH &&
      trimmed.length <= SCHEDULE_EXCEPTION_VALIDATION.REASON.MAX_LENGTH
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
      guid.length >= SCHEDULE_EXCEPTION_VALIDATION.GUID.MIN_LENGTH &&
      guid.length <= SCHEDULE_EXCEPTION_VALIDATION.GUID.MAX_LENGTH
    );
  }

  /**
   * Cleans and normalizes schedule exception data
   */
  static cleanScheduleExceptionData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean string fields
    if (cleaned.tenant !== undefined && cleaned.tenant !== null) {
      cleaned.tenant = cleaned.tenant.toString().trim();
    }

    // Convert numeric fields
    if (cleaned.user !== undefined && cleaned.user !== null) {
      cleaned.user = parseInt(cleaned.user, 10);
      if (isNaN(cleaned.user)) {
        throw new Error('Invalid user: must be a valid integer');
      }
    }

    if (cleaned.team !== undefined && cleaned.team !== null) {
      cleaned.team = parseInt(cleaned.team, 10);
      if (isNaN(cleaned.team)) {
        throw new Error('Invalid team: must be a valid integer');
      }
    }

    if (cleaned.session_template !== undefined) {
      cleaned.session_template = parseInt(cleaned.session_template, 10);
      if (isNaN(cleaned.session_template)) {
        throw new Error('Invalid session_template: must be a valid integer');
      }
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
   * Gets exceptions that apply to a specific date
   */
  static getExceptionsForDate(
    exceptions: Array<{
      start_date: string;
      end_date: string;
      active: boolean;
      user?: number | null;
      team?: number | null;
      session_template: number;
    }>,
    targetDate: Date,
    userId?: number,
    teamId?: number,
  ): Array<{
    start_date: string;
    end_date: string;
    session_template: number;
  }> {
    return exceptions
      .filter((ex) => {
        // Must be active
        if (!ex.active) return false;

        // Must be within date range
        if (!this.isDateInException(targetDate, ex.start_date, ex.end_date)) return false;

        // Filter by user or team if specified
        if (userId !== undefined && ex.user !== userId) return false;
        if (teamId !== undefined && ex.team !== teamId) return false;

        return true;
      })
      .map((ex) => ({
        start_date: ex.start_date,
        end_date: ex.end_date,
        session_template: ex.session_template,
      }));
  }

  /**
   * Formats date to YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }

  /**
   * Teams exceptions by user or team
   */
  static teamExceptions(
    exceptions: Array<{
      user?: number | null;
      team?: number | null;
      start_date: string;
      end_date: string;
      session_template: number;
    }>,
  ): {
    byUser: Map<number, Array<{ start_date: string; end_date: string; session_template: number }>>;
    byTeam: Map<number, Array<{ start_date: string; end_date: string; session_template: number }>>;
  } {
    const byUser = new Map<
      number,
      Array<{ start_date: string; end_date: string; session_template: number }>
    >();
    const byTeam = new Map<
      number,
      Array<{ start_date: string; end_date: string; session_template: number }>
    >();

    for (const exception of exceptions) {
      const exData = {
        start_date: exception.start_date,
        end_date: exception.end_date,
        session_template: exception.session_template,
      };

      if (exception.user) {
        const userExceptions = byUser.get(exception.user) || [];
        userExceptions.push(exData);
        byUser.set(exception.user, userExceptions);
      }

      if (exception.team) {
        const teamExceptions = byTeam.get(exception.team) || [];
        teamExceptions.push(exData);
        byTeam.set(exception.team, teamExceptions);
      }
    }

    return { byUser, byTeam };
  }

  /**
   * Validates that an exception doesn't conflict with existing exceptions
   */
  static validateNoConflict(
    newException: {
      start_date: string;
      end_date: string;
      user?: number | null;
      team?: number | null;
    },
    existingExceptions: Array<{
      start_date: string;
      end_date: string;
      user?: number | null;
      team?: number | null;
    }>,
  ): boolean {
    for (const existing of existingExceptions) {
      // Check if they apply to the same user or team
      const sameTarget =
        (newException.user && existing.user && newException.user === existing.user) ||
        (newException.team && existing.team && newException.team === existing.team);

      if (sameTarget) {
        // Check if date ranges overlap
        if (
          this.checkDateRangeOverlap(
            newException.start_date,
            newException.end_date,
            existing.start_date,
            existing.end_date,
          )
        ) {
          return false;
        }
      }
    }

    return true;
  }
}
