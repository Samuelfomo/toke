// utils/fraud.detection.log.validation.ts
import {
  FRAUD_DETECTION_VALIDATION,
  FraudDetection,
  RiskLevel,
} from '../constants/fraud.detection.log.js';

export class FraudDetectionValidationUtils {
  /**
   * Validates fraud detection log ID
   */
  static validateFraudDetectionLogId(id: number | string): boolean {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return Number.isInteger(numId) && numId >= FRAUD_DETECTION_VALIDATION.ID.MIN_VALUE;
  }

  /**
   * Validates tenant ID
   */
  static validateTenantId(tenantId: number): boolean {
    return Number.isInteger(tenantId) && tenantId >= FRAUD_DETECTION_VALIDATION.TENANT.MIN_VALUE;
  }

  /**
   * Validates detection type
   */
  static validateDetectionType(detectionType: string): boolean {
    if (!detectionType || typeof detectionType !== 'string') return false;
    return Object.values(FraudDetection).includes(detectionType as FraudDetection);
  }

  /**
   * Validates employee licenses affected array
   */
  static validateEmployeeLicensesAffected(employeeLicenses: string[]): boolean {
    if (!Array.isArray(employeeLicenses)) return false;
    if (employeeLicenses.length < FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.MIN_LENGTH)
      return false;
    if (employeeLicenses.length > FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.MAX_LENGTH)
      return false;

    return employeeLicenses.every(
      (employeeId) =>
        typeof employeeId === 'string' &&
        FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.EMPLOYEE_ID_PATTERN.test(
          employeeId.trim(),
        ),
    );
  }

  /**
   * Validates a single employee ID
   */
  static validateEmployee(employeeId: string): boolean {
    if (!employeeId || typeof employeeId !== 'string') return false;
    return FRAUD_DETECTION_VALIDATION.EMPLOYEE_LICENSES_AFFECTED.EMPLOYEE_ID_PATTERN.test(
      employeeId.trim(),
    );
  }

  /**
   * Validates detection criteria JSON object
   */
  static validateDetectionCriteria(criteria: any): boolean {
    if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) return false;

    const keys = Object.keys(criteria);
    if (keys.length < FRAUD_DETECTION_VALIDATION.DETECTION_CRITERIA.MIN_KEYS) return false;

    try {
      const jsonString = JSON.stringify(criteria);
      return jsonString.length <= FRAUD_DETECTION_VALIDATION.DETECTION_CRITERIA.MAX_JSON_SIZE;
    } catch {
      return false;
    }
  }

  /**
   * Validates risk level
   */
  static validateRiskLevel(riskLevel: string): boolean {
    if (!riskLevel || typeof riskLevel !== 'string') return false;
    return Object.values(RiskLevel).includes(riskLevel as RiskLevel);
  }

  /**
   * Validates action taken field
   */
  static validateActionTaken(actionTaken: string): boolean {
    if (actionTaken === null || actionTaken === undefined) return true;
    if (typeof actionTaken !== 'string') return false;
    return actionTaken.trim().length <= FRAUD_DETECTION_VALIDATION.ACTION_TAKEN.MAX_LENGTH;
  }

  /**
   * Validates notes field
   */
  static validateNotes(notes: string): boolean {
    if (notes === null || notes === undefined) return true;
    if (typeof notes !== 'string') return false;
    return notes.trim().length <= FRAUD_DETECTION_VALIDATION.NOTES.MAX_LENGTH;
  }

  /**
   * Validates resolved_at date
   */
  static validateResolvedAt(resolvedAt: Date | string | null): boolean {
    if (resolvedAt === null || resolvedAt === undefined) return true;
    const date = new Date(resolvedAt);
    return !isNaN(date.getTime());
  }

  /**
   * Validates resolved_by user ID
   */
  static validateResolvedBy(resolvedBy: number | string | null): boolean {
    if (resolvedBy === null || resolvedBy === undefined) return true;
    const numId = typeof resolvedBy === 'string' ? parseInt(resolvedBy, 10) : resolvedBy;
    return Number.isInteger(numId) && numId >= FRAUD_DETECTION_VALIDATION.RESOLVED_BY.MIN_VALUE;
  }

  /**
   * Validates resolution consistency (both resolved_at and resolved_by must be provided together)
   */
  static validateResolutionConsistency(
    resolvedAt: Date | string | null,
    resolvedBy: number | string | null,
    actionTaken?: string | null,
  ): boolean {
    const hasResolvedAt = resolvedAt !== null && resolvedAt !== undefined;
    const hasResolvedBy = resolvedBy !== null && resolvedBy !== undefined;

    // Both must be provided together or both must be null
    if (hasResolvedAt !== hasResolvedBy) return false;

    // If resolved, action_taken is recommended but not required
    return true;
  }

  /**
   * Validates that resolved_at is after created_at
   */
  static validateResolvedAfterCreated(
    resolvedAt: Date | string | null,
    createdAt: Date | string,
  ): boolean {
    if (!resolvedAt) return true;

    const resolved = new Date(resolvedAt);
    const created = new Date(createdAt);

    if (isNaN(resolved.getTime()) || isNaN(created.getTime())) return false;

    return resolved >= created;
  }

  /**
   * Checks if fraud detection log is resolved
   */
  static isResolved(resolvedAt: Date | string | null): boolean {
    return resolvedAt !== null && resolvedAt !== undefined;
  }

  /**
   * Checks if fraud detection log is critical
   */
  static isCritical(riskLevel: string): boolean {
    return riskLevel === RiskLevel.CRITICAL;
  }

  /**
   * Calculates age of fraud detection log in hours
   */
  static calculateAgeInHours(createdAt: Date | string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - created.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60));
  }

  /**
   * Calculates age of fraud detection log in days
   */
  static calculateAgeInDays(createdAt: Date | string): number {
    return Math.floor(this.calculateAgeInHours(createdAt) / 24);
  }

  /**
   * Gets count of affected employees
   */
  static getAffectedEmployeeCount(employeeLicenses: string[]): number {
    return Array.isArray(employeeLicenses) ? employeeLicenses.length : 0;
  }

  /**
   * Cleans and normalizes fraud detection log data
   */
  static cleanFraudDetectionLogData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert ID
    if (cleaned.id !== undefined) {
      cleaned.id = parseInt(cleaned.id);
      if (isNaN(cleaned.id)) {
        throw new Error('Invalid ID: must be a valid integer');
      }
    }

    // Convert tenant
    if (cleaned.tenant !== undefined) {
      cleaned.tenant = parseInt(cleaned.tenant);
      if (isNaN(cleaned.tenant)) {
        throw new Error('Invalid tenant: must be a valid integer');
      }
    }

    // Clean detection type
    if (cleaned.detection_type !== undefined) {
      cleaned.detection_type = cleaned.detection_type.toString().trim();
    }

    // Clean employee licenses affected
    if (cleaned.employee_licenses_affected !== undefined) {
      if (Array.isArray(cleaned.employee_licenses_affected)) {
        cleaned.employee_licenses_affected = cleaned.employee_licenses_affected.map((id: any) =>
          id.toString().trim(),
        );
      } else {
        throw new Error('Invalid employee_licenses_affected: must be an array');
      }
    }

    // Validate and clean detection criteria
    if (cleaned.detection_criteria !== undefined) {
      if (typeof cleaned.detection_criteria === 'string') {
        try {
          cleaned.detection_criteria = JSON.parse(cleaned.detection_criteria);
        } catch {
          throw new Error('Invalid detection_criteria: must be valid JSON');
        }
      }
      if (
        typeof cleaned.detection_criteria !== 'object' ||
        Array.isArray(cleaned.detection_criteria)
      ) {
        throw new Error('Invalid detection_criteria: must be an object');
      }
    }

    // Clean risk level
    if (cleaned.risk_level !== undefined) {
      cleaned.risk_level = cleaned.risk_level.toString().trim();
    }

    // Clean string fields
    ['action_taken', 'notes'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Convert date fields
    ['resolved_at', 'created_at', 'updated_at'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Convert resolved_by
    if (cleaned.resolved_by !== undefined && cleaned.resolved_by !== null) {
      cleaned.resolved_by = parseInt(cleaned.resolved_by);
      if (isNaN(cleaned.resolved_by)) {
        throw new Error('Invalid resolved_by: must be a valid integer');
      }
    }

    return cleaned;
  }

  /**
   * Cleans administrative data only (for updates)
   */
  static cleanFraudDetectionAdminData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    // Only allow administrative fields
    const allowedFields = ['action_taken', 'notes', 'resolved_at', 'resolved_by'];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        cleaned[field] = data[field];
      }
    });

    return this.cleanFraudDetectionLogData(cleaned);
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(filters: any): boolean {
    if (!filters || typeof filters !== 'object') return false;

    const validFilters = [
      'tenant',
      'detection_type',
      'risk_level',
      'resolved',
      'employee_id',
      'created_from',
      'created_to',
      'resolved_from',
      'resolved_to',
      'resolved_by',
    ];

    return Object.keys(filters).some((key) => validFilters.includes(key));
  }

  /**
   * Validates complete fraud detection log for creation (NOT ALLOWED)
   */
  static isValidForCreation(data: any): boolean {
    // Creation is never allowed - managed by PostgreSQL triggers only
    return false;
  }

  /**
   * Validates fraud detection log data for administrative updates
   */
  static isValidForAdminUpdate(data: any): boolean {
    // At least one administrative field should be provided
    const adminFields = ['action_taken', 'notes', 'resolved_at', 'resolved_by'];
    const hasAdminField = adminFields.some((field) => data[field] !== undefined);

    if (!hasAdminField) return false;

    // Validate each provided field
    if (data.action_taken !== undefined && !this.validateActionTaken(data.action_taken)) {
      return false;
    }

    if (data.notes !== undefined && !this.validateNotes(data.notes)) {
      return false;
    }

    if (data.resolved_at !== undefined && !this.validateResolvedAt(data.resolved_at)) {
      return false;
    }

    if (data.resolved_by !== undefined && !this.validateResolvedBy(data.resolved_by)) {
      return false;
    }

    // Validate resolution consistency
    return this.validateResolutionConsistency(
      data.resolved_at,
      data.resolved_by,
      data.action_taken,
    );
  }

  /**
   * Extracts validation errors for fraud detection log
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.tenant || !this.validateTenantId(data.tenant)) {
      errors.push('Invalid tenant: must be a positive integer');
    }

    if (!data.detection_type || !this.validateDetectionType(data.detection_type)) {
      errors.push(
        `Invalid detection_type: must be one of ${Object.values(FraudDetection).join(', ')}`,
      );
    }

    if (
      !data.employee_licenses_affected ||
      !this.validateEmployeeLicensesAffected(data.employee_licenses_affected)
    ) {
      errors.push(
        'Invalid employee_licenses_affected: must be a non-empty array of valid employee IDs',
      );
    }

    if (!data.detection_criteria || !this.validateDetectionCriteria(data.detection_criteria)) {
      errors.push('Invalid detection_criteria: must be a valid JSON object with at least one key');
    }

    if (!data.risk_level || !this.validateRiskLevel(data.risk_level)) {
      errors.push(`Invalid risk_level: must be one of ${Object.values(RiskLevel).join(', ')}`);
    }

    if (data.action_taken !== undefined && !this.validateActionTaken(data.action_taken)) {
      errors.push(
        `Invalid action_taken: must not exceed ${FRAUD_DETECTION_VALIDATION.ACTION_TAKEN.MAX_LENGTH} characters`,
      );
    }

    if (data.notes !== undefined && !this.validateNotes(data.notes)) {
      errors.push(
        `Invalid notes: must not exceed ${FRAUD_DETECTION_VALIDATION.NOTES.MAX_LENGTH} characters`,
      );
    }

    if (data.resolved_at !== undefined && !this.validateResolvedAt(data.resolved_at)) {
      errors.push('Invalid resolved_at: must be a valid date');
    }

    if (data.resolved_by !== undefined && !this.validateResolvedBy(data.resolved_by)) {
      errors.push('Invalid resolved_by: must be a positive integer');
    }

    if (
      !this.validateResolutionConsistency(data.resolved_at, data.resolved_by, data.action_taken)
    ) {
      errors.push(
        'Resolution fields are inconsistent: both resolved_at and resolved_by must be provided together or both must be null',
      );
    }

    if (
      data.resolved_at &&
      data.created_at &&
      !this.validateResolvedAfterCreated(data.resolved_at, data.created_at)
    ) {
      errors.push('Resolved at date must be after creation date');
    }

    return errors;
  }

  /**
   * Gets priority level based on risk level
   */
  static getPriorityLevel(riskLevel: string): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 4;
      case RiskLevel.HIGH:
        return 3;
      case RiskLevel.MEDIUM:
        return 2;
      case RiskLevel.LOW:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Gets human-readable risk level description
   */
  static getRiskLevelDescription(riskLevel: string): string {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 'Critical - Immediate action required';
      case RiskLevel.HIGH:
        return 'High - Urgent attention needed';
      case RiskLevel.MEDIUM:
        return 'Medium - Should be reviewed soon';
      case RiskLevel.LOW:
        return 'Low - Monitor for patterns';
      default:
        return 'Unknown risk level';
    }
  }

  /**
   * Gets human-readable detection type description
   */
  static getDetectionTypeDescription(detectionType: string): string {
    switch (detectionType) {
      case FraudDetection.SUSPICIOUS_LEAVE_PATTERN:
        return 'Suspicious Leave Pattern - Unusual leave declarations detected';
      case FraudDetection.MASS_DEACTIVATION:
        return 'Mass Deactivation - Multiple licenses deactivated simultaneously';
      case FraudDetection.UNUSUAL_ACTIVITY:
        return 'Unusual Activity - Abnormal usage patterns detected';
      case FraudDetection.PRE_RENEWAL_MANIPULATION:
        return 'Pre-Renewal Manipulation - Suspicious activity before renewal';
      case FraudDetection.EXCESSIVE_TECHNICAL_LEAVE:
        return 'Excessive Technical Leave - Too many technical leave declarations';
      default:
        return 'Unknown detection type';
    }
  }

  /**
   * Determines if an alert requires immediate attention
   */
  static requiresImmediateAttention(riskLevel: string, ageInHours: number): boolean {
    if (riskLevel === RiskLevel.CRITICAL) return true;
    if (riskLevel === RiskLevel.HIGH && ageInHours > 24) return true;
    if (riskLevel === RiskLevel.MEDIUM && ageInHours > 72) return true;
    return false;
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationOptions(options: { offset?: number; limit?: number }): boolean {
    if (options.offset !== undefined && (options.offset < 0 || !Number.isInteger(options.offset))) {
      return false;
    }

    if (options.limit !== undefined && (options.limit <= 0 || !Number.isInteger(options.limit))) {
      return false;
    }

    return true;
  }

  /**
   * Normalizes detection type for comparison
   */
  static normalizeDetectionType(detectionType: string): string {
    if (!this.validateDetectionType(detectionType)) {
      throw new Error('Invalid detection type for normalization');
    }
    return detectionType.trim().toUpperCase();
  }

  /**
   * Normalizes risk level for comparison
   */
  static normalizeRiskLevel(riskLevel: string): string {
    if (!this.validateRiskLevel(riskLevel)) {
      throw new Error('Invalid risk level for normalization');
    }
    return riskLevel.trim().toUpperCase();
  }

  /**
   * Checks if employee is affected by fraud detection
   */
  static isEmployeeAffected(employeeId: string, employeeLicensesAffected: string[]): boolean {
    if (!this.validateEmployee(employeeId) || !Array.isArray(employeeLicensesAffected)) {
      return false;
    }
    return employeeLicensesAffected.includes(employeeId.trim());
  }

  /**
   * Gets unique detection types from array of fraud logs
   */
  static getUniqueDetectionTypes(fraudLogs: any[]): string[] {
    if (!Array.isArray(fraudLogs)) return [];

    const types = new Set<string>();
    fraudLogs.forEach((log) => {
      if (log.detection_type && this.validateDetectionType(log.detection_type)) {
        types.add(log.detection_type);
      }
    });

    return Array.from(types).sort();
  }

  /**
   * Gets unique risk levels from array of fraud logs
   */
  static getUniqueRiskLevels(fraudLogs: any[]): string[] {
    if (!Array.isArray(fraudLogs)) return [];

    const levels = new Set<string>();
    fraudLogs.forEach((log) => {
      if (log.risk_level && this.validateRiskLevel(log.risk_level)) {
        levels.add(log.risk_level);
      }
    });

    return Array.from(levels).sort((a, b) => this.getPriorityLevel(b) - this.getPriorityLevel(a));
  }

  /**
   * Calculates resolution time in hours
   */
  static calculateResolutionTimeInHours(
    createdAt: Date | string,
    resolvedAt: Date | string,
  ): number {
    const created = new Date(createdAt);
    const resolved = new Date(resolvedAt);

    if (isNaN(created.getTime()) || isNaN(resolved.getTime())) return 0;
    if (resolved < created) return 0;

    const diffTime = resolved.getTime() - created.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60));
  }

  /**
   * Groups fraud logs by detection type
   */
  static groupByDetectionType(fraudLogs: any[]): Record<string, any[]> {
    if (!Array.isArray(fraudLogs)) return {};

    const grouped: Record<string, any[]> = {};

    fraudLogs.forEach((log) => {
      if (log.detection_type) {
        if (!grouped[log.detection_type]) {
          grouped[log.detection_type] = [];
        }
        grouped[log.detection_type]!.push(log);
      }
    });

    return grouped;
  }

  /**
   * Groups fraud logs by risk level
   */
  static groupByRiskLevel(fraudLogs: any[]): Record<string, any[]> {
    if (!Array.isArray(fraudLogs)) return {};

    const grouped: Record<string, any[]> = {};

    fraudLogs.forEach((log) => {
      if (log.risk_level) {
        if (!grouped[log.risk_level]) {
          grouped[log.risk_level] = [];
        }
        grouped[log.risk_level]!.push(log);
      }
    });

    return grouped;
  }
}
