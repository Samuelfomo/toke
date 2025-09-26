// utils/user.roles.validation.ts
import { USER_ROLES_DEFAULTS, USER_ROLES_VALIDATION } from '../../constants/tenant/user.roles.js';

export class UserRolesValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < USER_ROLES_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > USER_ROLES_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }
  /**
   * Validates user GUID
   */
  static validateUserId(user: string): boolean {
    if (!user || typeof user !== 'string') return false;
    const trimmed = user.trim();

    // Check length
    if (
      trimmed.length < USER_ROLES_VALIDATION.USER.MIN_LENGTH ||
      trimmed.length > USER_ROLES_VALIDATION.USER.MAX_LENGTH
    ) {
      return false;
    }

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates role GUID
   */
  static validateRoleId(role: string): boolean {
    if (!role || typeof role !== 'string') return false;
    const trimmed = role.trim();

    // Check length
    if (
      trimmed.length < USER_ROLES_VALIDATION.ROLE.MIN_LENGTH ||
      trimmed.length > USER_ROLES_VALIDATION.ROLE.MAX_LENGTH
    ) {
      return false;
    }

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates assigned by user GUID
   */
  static validateAssignedBy(assignedBy: string): boolean {
    if (!assignedBy || typeof assignedBy !== 'string') return false;
    const trimmed = assignedBy.trim();

    // Check length
    if (
      trimmed.length < USER_ROLES_VALIDATION.ASSIGNED_BY.MIN_LENGTH ||
      trimmed.length > USER_ROLES_VALIDATION.ASSIGNED_BY.MAX_LENGTH
    ) {
      return false;
    }

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates assignment date
   */
  static validateAssignedAt(assignedAt: Date | string | null): boolean {
    if (assignedAt === null || assignedAt === undefined) return true;
    const date = new Date(assignedAt);
    if (isNaN(date.getTime())) return false;

    // Assignment date cannot be in the future
    return date <= new Date();
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(offset: number, limit: number): boolean {
    return (
      Number.isInteger(offset) &&
      Number.isInteger(limit) &&
      offset >= 0 &&
      limit > 0 &&
      limit <= USER_ROLES_DEFAULTS.PAGINATION?.MAX_LIMIT
    );
  }

  /**
   * Validates that assignment is not self-assignment
   */
  static validateNotSelfAssignment(userId: string, assignedBy: string): boolean {
    return userId !== assignedBy;
  }

  /**
   * Validates that user can assign specific role type
   */
  static validateRoleAssignmentPermission(assignerRole: any, targetRole: any): boolean {
    // System roles can only be assigned by administrators/system users
    if (targetRole.system_role === true && assignerRole.system_role !== true) {
      return false;
    }
    return true;
  }

  /**
   * Cleans and normalizes user role data
   */
  static cleanUserRoleData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    if (cleaned.user !== undefined && cleaned.user !== null) {
      cleaned.user = Number(cleaned.user);
    }

    if (cleaned.role !== undefined && cleaned.role !== null) {
      cleaned.role = Number(cleaned.role);
    }

    if (cleaned.assigned_by !== undefined && cleaned.assigned_by !== null) {
      cleaned.assigned_by = Number(cleaned.assigned_by);
    }

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert dates
    if (cleaned.assigned_at !== undefined && cleaned.assigned_at !== null) {
      const date = new Date(cleaned.assigned_at);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid assigned_at: must be a valid date');
      }
      cleaned.assigned_at = date;
    }

    return cleaned;
  }

  /**
   * Validates that a user role assignment is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['user', 'role', 'assigned_by'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateUserId(data.user) &&
      this.validateRoleId(data.role) &&
      this.validateAssignedBy(data.assigned_by) &&
      this.validateAssignedAt(data.assigned_at) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a user role assignment is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    // For updates, validate only fields that are present
    const validations = [
      data.user === undefined || this.validateUserId(data.user),
      data.role === undefined || this.validateRoleId(data.role),
      data.assigned_by === undefined || this.validateAssignedBy(data.assigned_by),
      data.assigned_at === undefined || this.validateAssignedAt(data.assigned_at),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a user role assignment
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (data.user === undefined || data.user === null || !this.validateUserId(data.user)) {
      errors.push(
        `Invalid user: must be between ${USER_ROLES_VALIDATION.USER.MIN_LENGTH} and ${USER_ROLES_VALIDATION.USER.MAX_LENGTH}`,
      );
    }

    if (data.role === undefined || data.role === null || !this.validateRoleId(data.role)) {
      errors.push(
        `Invalid role: must be between ${USER_ROLES_VALIDATION.ROLE.MIN_LENGTH} and ${USER_ROLES_VALIDATION.ROLE.MAX_LENGTH}`,
      );
    }

    if (
      data.assigned_by === undefined ||
      data.assigned_by === null ||
      !this.validateAssignedBy(data.assigned_by)
    ) {
      errors.push(
        `Invalid assigned_by: must be between ${USER_ROLES_VALIDATION.ASSIGNED_BY.MIN_LENGTH} and ${USER_ROLES_VALIDATION.ASSIGNED_BY.MAX_LENGTH}`,
      );
    }

    if (data.assigned_at !== undefined && !this.validateAssignedAt(data.assigned_at)) {
      errors.push('Invalid assigned_at: must be a valid date not in the future');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${USER_ROLES_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    // Business rule validations
    if (
      data.user &&
      data.assigned_by &&
      !this.validateNotSelfAssignment(data.user, data.assigned_by)
    ) {
      errors.push('Self-assignment is not allowed');
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.user && this.validateUserId(data.user)) ||
      (data.role && this.validateRoleId(data.role)) ||
      (data.assigned_by && this.validateAssignedBy(data.assigned_by)) ||
      (data.assigned_at_from && !isNaN(new Date(data.assigned_at_from).getTime())) ||
      (data.assigned_at_to && !isNaN(new Date(data.assigned_at_to).getTime())) ||
      (data.guid && this.validateGuid(data.guid))
    );
  }

  /**
   * Checks if role assignment already exists
   */
  static isDuplicateAssignment(
    existingAssignments: any[],
    userId: number,
    roleId: number,
  ): boolean {
    return existingAssignments.some(
      (assignment) => assignment.user === userId && assignment.role === roleId,
    );
  }

  /**
   * Validates role assignment permissions based on assigner's role
   */
  static validateAssignmentPermissions(assignerPermissions: any, targetRole: any): boolean {
    // Check if assigner has permission to manage roles
    if (!assignerPermissions?.roles?.assign) {
      return false;
    }

    // System roles require higher privileges
    if (targetRole.system_role && !assignerPermissions?.system?.manage_roles) {
      return false;
    }

    return true;
  }

  /**
   * Checks for role conflicts
   */
  static hasRoleConflicts(userRoles: any[], newRole: any): boolean {
    // Basic conflict detection - can be extended based on business rules
    // Example: User cannot have both 'admin' and 'guest' roles
    const conflictingRoles = ['admin', 'guest'];

    if (conflictingRoles.includes(newRole.code)) {
      return userRoles.some(
        (role) => conflictingRoles.includes(role.code) && role.code !== newRole.code,
      );
    }

    return false;
  }

  /**
   * Calculates days since role assignment
   */
  static calculateDaysSinceAssignment(assignedAt: Date | string): number {
    const assigned = new Date(assignedAt);
    const now = new Date();
    const diffTime = now.getTime() - assigned.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if role assignment is recent
   */
  static isRecentAssignment(assignedAt: Date | string, daysThreshold: number = 7): boolean {
    const daysSince = this.calculateDaysSinceAssignment(assignedAt);
    return daysSince <= daysThreshold;
  }

  /**
   * Gets user role summary
   */
  static getUserRoleSummary(userRoles: any[]): {
    totalRoles: number;
    systemRoles: number;
    regularRoles: number;
    recentAssignments: number;
  } {
    const summary = {
      totalRoles: userRoles.length,
      systemRoles: 0,
      regularRoles: 0,
      recentAssignments: 0,
    };

    userRoles.forEach((userRole) => {
      if (userRole.role?.system_role) {
        summary.systemRoles++;
      } else {
        summary.regularRoles++;
      }

      if (this.isRecentAssignment(userRole.assigned_at)) {
        summary.recentAssignments++;
      }
    });

    return summary;
  }

  /**
   * Validates batch role assignment
   */
  static validateBatchAssignment(assignments: any[]): { valid: any[]; invalid: any[] } {
    const valid: any[] = [];
    const invalid: any[] = [];

    assignments.forEach((assignment) => {
      if (this.isValidForCreation(assignment)) {
        valid.push(assignment);
      } else {
        invalid.push({
          ...assignment,
          errors: this.getValidationErrors(assignment),
        });
      }
    });

    return { valid, invalid };
  }

  /**
   * Checks if user has specific role
   */
  static userHasRole(userRoles: any[], roleCode: string): boolean {
    return userRoles.some((userRole) => userRole.role?.code === roleCode);
  }

  /**
   * Checks if user has any system role
   */
  static userHasSystemRole(userRoles: any[]): boolean {
    return userRoles.some((userRole) => userRole.role?.system_role === true);
  }

  /**
   * Gets highest priority role for user
   */
  static getHighestPriorityRole(
    userRoles: any[],
    rolePriorities: Record<string, number>,
  ): any | null {
    if (!userRoles.length) return null;

    return userRoles.reduce((highest, current) => {
      const currentPriority = rolePriorities[current.role?.code] || 0;
      const highestPriority = rolePriorities[highest.role?.code] || 0;

      return currentPriority > highestPriority ? current : highest;
    });
  }

  /**
   * Generates assignment audit trail
   */
  static generateAuditInfo(assignment: any): {
    assignmentId: string;
    summary: string;
    details: Record<string, any>;
  } {
    return {
      assignmentId: assignment.guid || `${assignment.user}-${assignment.role}`,
      summary: `User ${assignment.user} assigned role ${assignment.role} by user ${assignment.assigned_by}`,
      details: {
        user: assignment.user,
        role: assignment.role,
        assigned_by: assignment.assigned_by,
        assigned_at: assignment.assigned_at,
        role_name: assignment.role?.name,
        role_code: assignment.role?.code,
        is_system_role: assignment.role?.system_role || false,
      },
    };
  }
}
