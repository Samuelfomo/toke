// utils/roles.validation.ts
import { ROLES_DEFAULTS, ROLES_VALIDATION } from '../../constants/tenant/roles.js';

export class RolesValidationUtils {
  /**
   * Validates role code
   */
  static validateCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return (
      trimmed.length >= ROLES_VALIDATION.CODE.MIN_LENGTH &&
      trimmed.length <= ROLES_VALIDATION.CODE.MAX_LENGTH
    );
  }

  /**
   * Validates role name
   */
  static validateName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= ROLES_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= ROLES_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates role description
   */
  static validateDescription(description: string | null): boolean {
    if (description === null || description === undefined) return true;
    if (typeof description !== 'string') return false;

    const trimmed = description.trim();
    return (
      trimmed.length >= ROLES_VALIDATION.DESCRIPTION.MIN_LENGTH &&
      trimmed.length <= ROLES_VALIDATION.DESCRIPTION.MAX_LENGTH
    );
  }

  /**
   * Validates permissions object
   */
  static validatePermissions(permissions: any): boolean {
    if (!permissions) return false;
    if (typeof permissions !== 'object' || Array.isArray(permissions)) return false;

    try {
      // Check if it's valid JSON object
      JSON.stringify(permissions);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates permissions structure
   */
  static validatePermissionsStructure(permissions: any): boolean {
    if (!this.validatePermissions(permissions)) return false;

    // Basic structure validation - permissions should be an object with module keys
    // Each module should have actions as boolean values
    for (const module in permissions) {
      if (typeof permissions[module] !== 'object' || Array.isArray(permissions[module])) {
        return false;
      }

      for (const action in permissions[module]) {
        if (typeof permissions[module][action] !== 'boolean') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validates system role flag
   */
  static validateSystemRole(systemRole: boolean): boolean {
    return typeof systemRole === 'boolean';
  }

  /**
   * Validates defauld role flag
   */
  static validateDefaultRole(defaultRole: boolean): boolean {
    return typeof defaultRole === 'boolean';
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;

    // UUID v4 regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(guid);
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
      limit <= ROLES_DEFAULTS.PAGINATION?.MAX_LIMIT
    );
  }

  /**
   * Cleans and normalizes role data
   */
  static cleanRoleData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean string fields
    ['code', 'name'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean optional string fields
    if (cleaned.description !== undefined && cleaned.description !== null) {
      cleaned.description = cleaned.description.toString().trim();
    }

    // Convert boolean fields
    if (cleaned.system_role !== undefined) {
      cleaned.system_role = Boolean(cleaned.system_role);
    }
    if (cleaned.default_role !== undefined) {
      cleaned.default_role = Boolean(cleaned.default_role);
    }

    // Validate and clean permissions
    if (cleaned.permissions !== undefined) {
      if (typeof cleaned.permissions === 'string') {
        try {
          cleaned.permissions = JSON.parse(cleaned.permissions);
        } catch {
          throw new Error('Invalid permissions: must be valid JSON');
        }
      }
    }

    return cleaned;
  }

  /**
   * Validates that a role is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['code', 'name', 'permissions'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateCode(data.code) &&
      this.validateName(data.name) &&
      this.validateDescription(data.description) &&
      this.validatePermissionsStructure(data.permissions) &&
      (data.system_role === undefined || this.validateSystemRole(data.system_role)) &&
      (data.default_role === undefined || this.validateDefaultRole(data.default_role))
    );
  }

  /**
   * Validates that a role is valid for update
   */
  static isValidForUpdate(data: any): boolean {
    // For updates, we don't require all fields, but validate those present
    const validations = [
      data.code === undefined || this.validateCode(data.code),
      data.name === undefined || this.validateName(data.name),
      data.description === undefined || this.validateDescription(data.description),
      data.permissions === undefined || this.validatePermissionsStructure(data.permissions),
      data.system_role === undefined || this.validateSystemRole(data.system_role),
      data.default_role === undefined || this.validateDefaultRole(data.default_role),
    ];

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a role
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.code || !this.validateCode(data.code)) {
      errors.push(
        `Invalid code: must be ${ROLES_VALIDATION.CODE.MIN_LENGTH}-${ROLES_VALIDATION.CODE.MAX_LENGTH} characters`,
      );
    }

    if (!data.name || !this.validateName(data.name)) {
      errors.push(
        `Invalid name: must be ${ROLES_VALIDATION.NAME.MIN_LENGTH}-${ROLES_VALIDATION.NAME.MAX_LENGTH} characters`,
      );
    }

    if (data.description !== undefined && !this.validateDescription(data.description)) {
      errors.push(
        `Invalid description: must not exceed ${ROLES_VALIDATION.DESCRIPTION.MAX_LENGTH} characters`,
      );
    }

    if (!data.permissions || !this.validatePermissions(data.permissions)) {
      errors.push('Invalid permissions: must be a valid JSON object');
    } else if (!this.validatePermissionsStructure(data.permissions)) {
      errors.push('Invalid permissions structure: must follow expected format');
    }

    if (data.system_role !== undefined && !this.validateSystemRole(data.system_role)) {
      errors.push('Invalid system_role: must be a boolean value');
    }

    if (data.default_role !== undefined && !this.validateDefaultRole(data.default_role)) {
      errors.push('Invalid default_role: must be a boolean value');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push('Invalid GUID: must be a valid UUID v4');
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.code && this.validateCode(data.code)) ||
      (data.name && this.validateName(data.name)) ||
      (data.description && this.validateDescription(data.description)) ||
      (data.system_role !== undefined && this.validateSystemRole(data.system_role)) ||
      (data.default_role !== undefined && this.validateDefaultRole(data.default_role)) ||
      (data.permissions && this.validatePermissions(data.permissions))
    );
  }

  /**
   * Checks if role can be deleted
   */
  static canBeDeleted(role: any): boolean {
    // System roles cannot be deleted
    if (role.system_role === true) {
      return false;
    }
    return true;
  }

  /**
   * Checks if role can be modified
   */
  static canBeModified(role: any): boolean {
    // System roles cannot be modified
    if (role.system_role === true) {
      return false;
    }
    return true;
  }

  /**
   * Checks if role has specific permission
   */
  static hasPermission(permissions: any, module: string, action: string): boolean {
    if (!permissions || typeof permissions !== 'object') return false;
    return permissions[module]?.[action] === true;
  }

  /**
   * Counts total permissions in role
   */
  static countPermissions(permissions: any): number {
    if (!permissions || typeof permissions !== 'object') return 0;

    let count = 0;
    for (const module in permissions) {
      if (typeof permissions[module] === 'object') {
        for (const action in permissions[module]) {
          if (permissions[module][action] === true) {
            count++;
          }
        }
      }
    }
    return count;
  }

  /**
   * Gets all modules from permissions
   */
  static getPermissionModules(permissions: any): string[] {
    if (!permissions || typeof permissions !== 'object') return [];
    return Object.keys(permissions);
  }

  /**
   * Gets all actions for a specific module
   */
  static getModuleActions(permissions: any, module: string): string[] {
    if (!permissions || typeof permissions !== 'object' || !permissions[module]) return [];
    return Object.keys(permissions[module]);
  }

  /**
   * Merges two permission objects
   */
  static mergePermissions(basePermissions: any, additionalPermissions: any): any {
    if (!basePermissions) return additionalPermissions || {};
    if (!additionalPermissions) return basePermissions;

    const merged = JSON.parse(JSON.stringify(basePermissions));

    for (const module in additionalPermissions) {
      if (!merged[module]) {
        merged[module] = {};
      }

      for (const action in additionalPermissions[module]) {
        merged[module][action] = additionalPermissions[module][action];
      }
    }

    return merged;
  }

  /**
   * Removes specific permissions from role
   */
  static removePermissions(permissions: any, module: string, actions?: string[]): any {
    if (!permissions || !permissions[module]) return permissions;

    const updated = JSON.parse(JSON.stringify(permissions));

    if (!actions) {
      // Remove entire module
      delete updated[module];
    } else {
      // Remove specific actions
      actions.forEach((action) => {
        delete updated[module][action];
      });

      // Remove module if no actions left
      if (Object.keys(updated[module]).length === 0) {
        delete updated[module];
      }
    }

    return updated;
  }

  /**
   * Generates role display name with permission count
   */
  static generateDisplayInfo(role: any): { displayName: string; permissionCount: number } {
    const displayName = role.name || role.code || 'Unknown Role';
    const permissionCount = this.countPermissions(role.permissions);

    return {
      displayName: `${displayName}${role.system_role ? ' (System)' : ''}`,
      permissionCount,
    };
  }
}
