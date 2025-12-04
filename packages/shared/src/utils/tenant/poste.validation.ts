import { Level, POSTE_VALIDATION } from '../../constants/tenant/poste.js';

export class PosteValidationUtils {
  /**
   * Validates title
   */
  static validateTitle(title: any): boolean {
    if (!title || typeof title !== 'string') return false;
    const trimmed = title.trim();
    return (
      trimmed.length >= POSTE_VALIDATION.TITLE.MIN_LENGTH &&
      trimmed.length <= POSTE_VALIDATION.TITLE.MAX_LENGTH
    );
  }

  /**
   * Validates code
   */
  static validateCode(code: any): boolean {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return (
      trimmed.length >= POSTE_VALIDATION.CODE.MIN_LENGTH &&
      trimmed.length <= POSTE_VALIDATION.CODE.MAX_LENGTH
    );
  }

  /**
   * Validates department
   */
  static validateDepartment(department: any): boolean {
    if (!department || typeof department !== 'string') return false;
    const trimmed = department.trim();

    // Check length
    if (
      trimmed.length < POSTE_VALIDATION.DEPARTMENT.MIN_LENGTH ||
      trimmed.length > POSTE_VALIDATION.DEPARTMENT.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    return uuidRegex.test(trimmed);
  }
  /**
   * Validates base SalaryBase
   */
  static validateSalaryBase(price: number | string): boolean {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return (
      !isNaN(numPrice) &&
      numPrice >= POSTE_VALIDATION.SALARY_BASE.MIN &&
      numPrice <= POSTE_VALIDATION.SALARY_BASE.MAX
    );
  }

  /**
   * Validates description
   */
  static validateDescription(description: any): boolean {
    if (description === null || description === undefined) return true;
    if (typeof description !== 'string') return false;

    const trimmed = description.trim();
    return (
      trimmed.length >= POSTE_VALIDATION.DESCRIPTION.MIN_LENGTH &&
      trimmed.length <= POSTE_VALIDATION.DESCRIPTION.MAX_LENGTH
    );
  }

  /**
   * Validates level
   */
  static validateLevel(level: any): boolean {
    if (!level || typeof level !== 'string') return false;
    return Object.values(Level).includes(level as Level);
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
  static cleanPosteData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Clean string fields
    if (cleaned.title !== undefined && cleaned.title !== null) {
      cleaned.title = cleaned.title.toString().trim();
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

    // Convert salary_base
    if (cleaned.salary_base !== undefined) {
      cleaned.salary_base = parseFloat(cleaned.salary_base);
      if (isNaN(cleaned.salary_base)) {
        throw new Error('Invalid salary_base: must be a valid number');
      }
      // Round to 2 decimal places
      cleaned.salary_base = Math.round(cleaned.salary_base * 100) / 100;
    }

    // Clean level
    if (cleaned.level !== undefined) {
      cleaned.level = cleaned.level.toString().trim().toUpperCase();
    }

    return cleaned;
  }
}
