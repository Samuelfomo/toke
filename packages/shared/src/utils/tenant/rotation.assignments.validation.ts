import {
  RAFamily,
  ROTATION_ASSIGNMENT_VALIDATION,
} from '../../constants/tenant/rotation.assignments.js';
import { TimezoneConfigUtils } from '../timezone.config.validation.js';

export class RotationAssignmentValidationUtils {
  /**
   * Validates family
   */
  static validateFamily(family: any): family is RAFamily {
    return Object.values(RAFamily).includes(family);
  }

  /**
   * Validates related (GUID string)
   */
  static validateRelated(related: any): boolean {
    if (!related || typeof related !== 'string') return false;
    return (
      related.length >= ROTATION_ASSIGNMENT_VALIDATION.RELATED.MIN_LENGTH &&
      related.length <= ROTATION_ASSIGNMENT_VALIDATION.RELATED.MAX_LENGTH
    );
  }

  /**
   * Validates assigned_by
   */
  static validateAssignedBy(assignedBy: any): boolean {
    if (assignedBy === null || assignedBy === undefined) return false;
    if (typeof assignedBy !== 'string') return false;
    return (
      assignedBy.length >= ROTATION_ASSIGNMENT_VALIDATION.ASSIGNED_BY.MIN_LENGTH &&
      assignedBy.length <= ROTATION_ASSIGNMENT_VALIDATION.ASSIGNED_BY.MAX_LENGTH
    );
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

    // Trim string fields
    if (cleaned.family !== undefined && cleaned.family !== null) {
      cleaned.family = cleaned.family.toString().trim();
    }

    if (cleaned.related !== undefined && cleaned.related !== null) {
      cleaned.related = cleaned.related.toString().trim();
    }

    if (cleaned.assigned_by !== undefined && cleaned.assigned_by !== null) {
      cleaned.assigned_by = parseInt(cleaned.assigned_by, 10);
      if (isNaN(cleaned.assigned_by)) {
        throw new Error('Invalid assigned_by: must be a valid integer');
      }
    }

    if (cleaned.rotation_group !== undefined && cleaned.rotation_group !== null) {
      cleaned.rotation_group = parseInt(cleaned.rotation_group, 10);
      if (isNaN(cleaned.rotation_group)) {
        throw new Error('Invalid rotation_group: must be a valid integer');
      }
    }

    if (cleaned.offset !== undefined && cleaned.offset !== null) {
      cleaned.offset = parseInt(cleaned.offset, 10);
      if (isNaN(cleaned.offset)) {
        throw new Error('Invalid offset: must be a valid integer');
      }
    }

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
   * Calculates which template a related entity should follow on a specific date
   */
  static getRelatedTemplateForDate(
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
      diffUnits = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    }

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
   * Generates a schedule preview for a related entity
   */
  static generateSchedulePreview(
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

      const templateId = this.getRelatedTemplateForDate(
        rotationStartDate,
        offset,
        cycleLength,
        cycleUnit,
        cycleTemplates,
        currentDate,
      );

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
   * Checks if two assignments conflict (same related + same rotation_group)
   */
  static checkAssignmentConflict(
    assignment1: { family: RAFamily; related: string; rotation_group: number },
    assignment2: { family: RAFamily; related: string; rotation_group: number },
  ): boolean {
    return (
      assignment1.family === assignment2.family &&
      assignment1.related === assignment2.related &&
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
   * Groups assignments by rotation_group
   */
  static groupAssignmentsByRotationGroup(
    assignments: Array<{
      family: RAFamily;
      related: string;
      rotation_group: number;
      offset: number;
    }>,
  ): Map<number, Array<{ family: RAFamily; related: string; offset: number }>> {
    const grouped = new Map<number, Array<{ family: RAFamily; related: string; offset: number }>>();

    for (const assignment of assignments) {
      const group = grouped.get(assignment.rotation_group) || [];
      group.push({
        family: assignment.family,
        related: assignment.related,
        offset: assignment.offset,
      });
      grouped.set(assignment.rotation_group, group);
    }

    return grouped;
  }

  /**
   * Gets all rotation groups for a related entity (by family + related)
   */
  static getRotationGroupsForRelated(
    assignments: Array<{
      family: RAFamily;
      related: string;
      rotation_group: number;
      offset: number;
    }>,
    family: RAFamily,
    related: string,
  ): Array<{ rotation_group: number; offset: number }> {
    return assignments
      .filter((a) => a.family === family && a.related === related)
      .map((a) => ({ rotation_group: a.rotation_group, offset: a.offset }));
  }

  /**
   * Calculates optimal offset distribution for multiple entities
   */
  static calculateOptimalOffsets(numberOfEntities: number, cycleLength: number): number[] {
    const offsets: number[] = [];
    const step = Math.floor(cycleLength / numberOfEntities);

    for (let i = 0; i < numberOfEntities; i++) {
      offsets.push((i * step) % cycleLength);
    }

    return offsets;
  }
}
