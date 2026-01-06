import { ROTATION_ASSIGNMENT_VALIDATION } from '../../constants/tenant/rotation.assignments.js';
import { TimezoneConfigUtils } from '../timezone.config.validation.js';

export class RotationAssignmentValidationUtils {
  /**
   * Validates user
   */
  static validateUser(user: any): boolean {
    if (typeof user !== 'string') return false;
    return (
      user.length >= ROTATION_ASSIGNMENT_VALIDATION.USER.MIN_LENGTH &&
      user.length <= ROTATION_ASSIGNMENT_VALIDATION.USER.MAX_LENGTH
    );
  }

  /**
   * Validates team
   */
  static validateTeam(team: any): boolean {
    if (team === null || team === undefined) return true;
    if (typeof team !== 'string') return false;
    return (
      team.length >= ROTATION_ASSIGNMENT_VALIDATION.TEAM.MIN_LENGTH &&
      team.length <= ROTATION_ASSIGNMENT_VALIDATION.TEAM.MAX_LENGTH
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
   * Validates rotation_group
   */
  static validateRotationGroup(rotationGroup: any): boolean {
    if (typeof rotationGroup !== 'string') return false;
    return (
      rotationGroup.length >= ROTATION_ASSIGNMENT_VALIDATION.ROTATION_GROUP.MIN_LENGTH &&
      rotationGroup.length <= ROTATION_ASSIGNMENT_VALIDATION.ROTATION_GROUP.MAX_LENGTH
    );
  }

  /**
   * Validates offset
   */
  static validateOffset(offset: any): boolean {
    if (typeof offset !== 'number') return false;
    return (
      Number.isInteger(offset) &&
      offset >= ROTATION_ASSIGNMENT_VALIDATION.OFFSET.MIN &&
      offset <= ROTATION_ASSIGNMENT_VALIDATION.OFFSET.MAX
    );
  }

  /**
   * Validates assigned_at
   */
  static validateAssignedAt(assignedAt: any): boolean {
    if (assignedAt === null || assignedAt === undefined) return true;
    const date = new Date(assignedAt);
    return !isNaN(date.getTime());
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: any): boolean {
    if (!guid || typeof guid !== 'string') return false;
    return (
      guid.length >= ROTATION_ASSIGNMENT_VALIDATION.GUID.MIN_LENGTH &&
      guid.length <= ROTATION_ASSIGNMENT_VALIDATION.GUID.MAX_LENGTH
    );
  }

  /**
   * Cleans and normalizes rotation assignment data
   */
  static cleanRotationAssignmentData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert user to number
    if (cleaned.user !== undefined) {
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

    // Convert rotation_group to number
    if (cleaned.rotation_group !== undefined) {
      cleaned.rotation_group = parseInt(cleaned.rotation_group, 10);
      if (isNaN(cleaned.rotation_group)) {
        throw new Error('Invalid rotation_group: must be a valid integer');
      }
    }

    // Convert offset to number
    if (cleaned.offset !== undefined) {
      cleaned.offset = parseInt(cleaned.offset, 10);
      if (isNaN(cleaned.offset)) {
        throw new Error('Invalid offset: must be a valid integer');
      }
    }

    // Convert assigned_at to ISO string
    if (cleaned.assigned_at !== undefined && cleaned.assigned_at !== null) {
      if (cleaned.assigned_at instanceof Date) {
        cleaned.assigned_at = cleaned.assigned_at.toISOString();
      } else {
        const date = new Date(cleaned.assigned_at);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid assigned_at: must be a valid date');
        }
        cleaned.assigned_at = date.toISOString();
      }
    }

    return cleaned;
  }

  /**
   * Calculates the effective start date for a user based on offset
   */
  static calculateEffectiveStartDate(
    rotationStartDate: string,
    offset: number,
    cycleUnit: 'day' | 'week',
  ): Date {
    const startDate = new Date(rotationStartDate);

    if (cycleUnit === 'day') {
      startDate.setDate(startDate.getDate() + offset);
    } else {
      // week
      startDate.setDate(startDate.getDate() + offset * 7);
    }

    return startDate;
  }

  /**
   * Calculates which template a user should follow on a specific date
   */
  static getUserTemplateForDate(
    rotationStartDate: string,
    offset: number,
    cycleLength: number,
    cycleUnit: 'day' | 'week',
    cycleTemplates: number[],
    targetDate: Date = TimezoneConfigUtils.getCurrentTime(),
  ): number {
    const effectiveStartDate = this.calculateEffectiveStartDate(
      rotationStartDate,
      offset,
      cycleUnit,
    );
    const diffTime = targetDate.getTime() - effectiveStartDate.getTime();

    let diffUnits: number;
    if (cycleUnit === 'day') {
      diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // week
      diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    }

    // Handle negative offset (before effective start date)
    if (diffUnits < 0) {
      return cycleTemplates[0]!;
    }

    const cycleDay = diffUnits % cycleLength;
    return cycleTemplates[cycleDay] || cycleTemplates[0]!;
  }

  /**
   * Validates that offset is less than cycle_length
   */
  static validateOffsetWithinCycle(offset: number, cycleLength: number): boolean {
    return offset < cycleLength;
  }

  /**
   * Generates a schedule preview for a user
   */
  static generateUserSchedulePreview(
    rotationStartDate: string,
    offset: number,
    cycleLength: number,
    cycleUnit: 'day' | 'week',
    cycleTemplates: number[],
    daysToPreview: number = 7,
  ): Array<{ date: string; cycleDay: number; templateId: number }> {
    const preview: Array<{ date: string; cycleDay: number; templateId: number }> = [];
    const effectiveStart = this.calculateEffectiveStartDate(rotationStartDate, offset, cycleUnit);

    for (let i = 0; i < daysToPreview; i++) {
      const currentDate = new Date(effectiveStart);
      currentDate.setDate(currentDate.getDate() + i);

      const templateId = this.getUserTemplateForDate(
        rotationStartDate,
        offset,
        cycleLength,
        cycleUnit,
        cycleTemplates,
        currentDate,
      );

      // Calculate cycle day
      const diffTime = currentDate.getTime() - effectiveStart.getTime();
      let diffUnits: number;
      if (cycleUnit === 'day') {
        diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      }
      const cycleDay = diffUnits % cycleLength;

      preview.push({
        date: currentDate.toISOString().split('T')[0]!,
        cycleDay,
        templateId,
      });
    }

    return preview;
  }

  /**
   * Checks if a user assignment conflicts with another
   */
  static checkAssignmentConflict(
    assignment1: { user: number; rotation_group: number },
    assignment2: { user: number; rotation_group: number },
  ): boolean {
    return (
      assignment1.user === assignment2.user &&
      assignment1.rotation_group === assignment2.rotation_group
    );
  }

  /**
   * Formats date to YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }

  /**
   * Gets all users assigned to a rotation group
   */
  static groupAssignmentsByRotationGroup(
    assignments: Array<{ user: number; rotation_group: number; offset: number }>,
  ): Map<number, Array<{ user: number; offset: number }>> {
    const grouped = new Map<number, Array<{ user: number; offset: number }>>();

    for (const assignment of assignments) {
      const group = grouped.get(assignment.rotation_group) || [];
      group.push({ user: assignment.user, offset: assignment.offset });
      grouped.set(assignment.rotation_group, group);
    }

    return grouped;
  }

  /**
   * Gets all rotation groups for a user
   */
  static getRotationGroupsForUser(
    assignments: Array<{ user: number; rotation_group: number; offset: number }>,
    userId: number,
  ): Array<{ rotation_group: number; offset: number }> {
    return assignments
      .filter((a) => a.user === userId)
      .map((a) => ({ rotation_group: a.rotation_group, offset: a.offset }));
  }

  /**
   * Calculates optimal offset distribution for multiple users
   */
  static calculateOptimalOffsets(numberOfUsers: number, cycleLength: number): number[] {
    const offsets: number[] = [];
    const step = Math.floor(cycleLength / numberOfUsers);

    for (let i = 0; i < numberOfUsers; i++) {
      offsets.push((i * step) % cycleLength);
    }

    return offsets;
  }
}
