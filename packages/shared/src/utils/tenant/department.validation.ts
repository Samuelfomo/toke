import { DEPARTMENT_VALIDATION } from '../../constants/tenant/department.js';

export class DepartmentValidationUtils {
  /**
   * Validates name
   */
  static validateName(name: any): boolean {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return (
      trimmed.length >= DEPARTMENT_VALIDATION.NAME.MIN_LENGTH &&
      trimmed.length <= DEPARTMENT_VALIDATION.NAME.MAX_LENGTH
    );
  }

  /**
   * Validates code
   */
  static validateCode(code: any): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return (
      trimmed.length >= DEPARTMENT_VALIDATION.CODE.MIN_LENGTH &&
      trimmed.length <= DEPARTMENT_VALIDATION.CODE.MAX_LENGTH
    );
  }

  /**
   * Validates manager
   */
  static validateManager(manager: any): boolean {
    if (!manager || typeof manager !== 'string') return false;
    const trimmed = manager.trim();

    // Check length
    if (
      trimmed.length < DEPARTMENT_VALIDATION.MANAGER.MIN_LENGTH ||
      trimmed.length > DEPARTMENT_VALIDATION.MANAGER.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates description
   */
  static validateDescription(description: any): boolean {
    if (description === null || description === undefined) return true;
    if (typeof description !== 'string') return false;

    const trimmed = description.trim();
    return (
      trimmed.length >= DEPARTMENT_VALIDATION.DESCRIPTION.MIN_LENGTH &&
      trimmed.length <= DEPARTMENT_VALIDATION.DESCRIPTION.MAX_LENGTH
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

    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(guid);
  }

  /**
   * Cleans and normalizes user data
   */
  static cleanDepartmentData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean string fields
    if (cleaned.name !== undefined && cleaned.name !== null) {
      cleaned.name = cleaned.name.toString().trim();
    }

    // Clean and normalize code
    if (cleaned.code !== undefined && cleaned.code !== null) {
      cleaned.code = cleaned.code.toString().trim().toUpperCase();
    }

    // Clean optional string fields
    if (cleaned.description !== undefined && cleaned.description !== null) {
      cleaned.description = cleaned.description.toString().trim();
    }

    // Convert boolean fields
    if (cleaned.active !== undefined) {
      cleaned.active = Boolean(cleaned.active);
    }

    return cleaned;
  }
}
