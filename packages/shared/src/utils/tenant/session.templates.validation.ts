// utils/session_templates.validation.ts
import {
  SESSION_TEMPLATE_VALIDATION,
  VALID_DAYS,
} from '../../constants/tenant/session.templates.js';

export class SessionTemplateValidationUtils {
  // /**
  //  * Validates tenant
  //  */
  // static validateTenant(tenant: any): boolean {
  //   if (!tenant || typeof tenant !== 'string') return false;
  //   const trimmed = tenant.trim();
  //   return (
  //     trimmed.length >= SESSION_TEMPLATE_VALIDATION.TENANT.MIN_LENGTH &&
  //     trimmed.length <= SESSION_TEMPLATE_VALIDATION.TENANT.MAX_LENGTH
  //   );
  // }

  /**
   * Validates name
   */
  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= SESSION_TEMPLATE_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= SESSION_TEMPLATE_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates valid_from
   */
  static validateValidFrom(validFrom: any): boolean {
    if (!validFrom) return false;
    const date = new Date(validFrom);
    return !isNaN(date.getTime());
  }

  /**
   * Validates valid_to
   */
  static validateValidTo(validTo: any): boolean {
    if (validTo === null || validTo === undefined) return true;
    const date = new Date(validTo);
    return !isNaN(date.getTime());
  }

  /**
   * Validates time format (HH:MM)
   */
  static validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Converts time string to minutes
   */
  static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours! * 60 + minutes!;
  }

  /**
   * Validates work block
   */
  static validateWorkBlock(block: any): boolean {
    if (typeof block !== 'object' || block === null) return false;

    // Validate work field
    if (!block.work || !Array.isArray(block.work) || block.work.length !== 2) {
      return false;
    }

    if (!this.validateTimeFormat(block.work[0]) || !this.validateTimeFormat(block.work[1])) {
      return false;
    }

    // Check work start < end
    const workStart = this.timeToMinutes(block.work[0]);
    const workEnd = this.timeToMinutes(block.work[1]);
    if (workStart >= workEnd) return false;

    // Validate pause if present
    if (block.pause !== null && block.pause !== undefined) {
      if (!Array.isArray(block.pause) || block.pause.length !== 2) {
        return false;
      }

      if (!this.validateTimeFormat(block.pause[0]) || !this.validateTimeFormat(block.pause[1])) {
        return false;
      }

      const pauseStart = this.timeToMinutes(block.pause[0]);
      const pauseEnd = this.timeToMinutes(block.pause[1]);

      // Check pause start < end
      if (pauseStart >= pauseEnd) return false;

      // Check pause within work block
      if (pauseStart < workStart || pauseEnd > workEnd) return false;
    }

    // Validate tolerance
    if (
      typeof block.tolerance !== 'number' ||
      block.tolerance < SESSION_TEMPLATE_VALIDATION.TOLERANCE.MIN ||
      block.tolerance > SESSION_TEMPLATE_VALIDATION.TOLERANCE.MAX ||
      !Number.isInteger(block.tolerance)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validates definition object
   */
  static validateDefinition(definition: any): boolean {
    if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
      return false;
    }

    // Check for invalid day keys
    for (const day of Object.keys(definition)) {
      if (!VALID_DAYS.includes(day as any)) {
        return false;
      }
    }

    // Validate each day's blocks
    for (const [day, blocks] of Object.entries(definition)) {
      if (!Array.isArray(blocks)) return false;

      // Validate each block
      for (const block of blocks) {
        if (!this.validateWorkBlock(block)) return false;
      }

      // Check for overlapping blocks
      if (!this.validateNoOverlappingBlocks(blocks as any[])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if blocks overlap on the same day
   */
  static validateNoOverlappingBlocks(blocks: any[]): boolean {
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        const start1 = this.timeToMinutes(block1.work[0]);
        const end1 = this.timeToMinutes(block1.work[1]);
        const start2 = this.timeToMinutes(block2.work[0]);
        const end2 = this.timeToMinutes(block2.work[1]);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    return (
      guid.length >= SESSION_TEMPLATE_VALIDATION.GUID.MIN_LENGTH &&
      guid.length <= SESSION_TEMPLATE_VALIDATION.GUID.MAX_LENGTH
    );
  }

  /**
   * Cleans and normalizes session template data
   */
  static cleanSessionTemplateData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean string fields
    if (cleaned.tenant !== undefined && cleaned.tenant !== null) {
      cleaned.tenant = cleaned.tenant.toString().trim();
    }

    if (cleaned.name !== undefined && cleaned.name !== null) {
      cleaned.name = cleaned.name.toString().trim();
    }

    // Convert dates
    if (cleaned.valid_from !== undefined && cleaned.valid_from !== null) {
      cleaned.valid_from = new Date(cleaned.valid_from).toISOString();
    }

    if (cleaned.valid_to !== undefined && cleaned.valid_to !== null) {
      cleaned.valid_to = new Date(cleaned.valid_to).toISOString();
    }

    // Clean definition
    if (cleaned.definition !== undefined && cleaned.definition !== null) {
      cleaned.definition = this.cleanDefinition(cleaned.definition);
    }

    return cleaned;
  }

  /**
   * Cleans definition object
   */
  static cleanDefinition(definition: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [day, blocks] of Object.entries(definition)) {
      if (Array.isArray(blocks)) {
        cleaned[day] = blocks.map((block) => this.cleanWorkBlock(block));
      }
    }

    return cleaned;
  }

  /**
   * Cleans work block
   */
  static cleanWorkBlock(block: any): any {
    const cleaned: any = {
      work: block.work,
      tolerance: parseInt(block.tolerance, 10),
    };

    if (block.pause !== null && block.pause !== undefined) {
      cleaned.pause = block.pause;
    } else {
      cleaned.pause = null;
    }

    return cleaned;
  }

  /**
   * Calculates total work time for a day (in minutes)
   */
  static calculateDayWorkTime(blocks: any[]): number {
    let totalMinutes = 0;

    for (const block of blocks) {
      const workStart = this.timeToMinutes(block.work[0]);
      const workEnd = this.timeToMinutes(block.work[1]);
      let workTime = workEnd - workStart;

      // Subtract pause time if present
      if (block.pause) {
        const pauseStart = this.timeToMinutes(block.pause[0]);
        const pauseEnd = this.timeToMinutes(block.pause[1]);
        workTime -= pauseEnd - pauseStart;
      }

      totalMinutes += workTime;
    }

    return totalMinutes;
  }

  /**
   * Calculates total weekly work time (in minutes)
   */
  static calculateWeeklyWorkTime(definition: Record<string, any[]>): number {
    let totalMinutes = 0;

    for (const blocks of Object.values(definition)) {
      totalMinutes += this.calculateDayWorkTime(blocks);
    }

    return totalMinutes;
  }

  /**
   * Formats minutes to HH:MM
   */
  static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
