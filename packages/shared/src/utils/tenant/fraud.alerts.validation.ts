// utils/fraud.alerts.validation.ts
import {
  AlertSeverity,
  AlertType,
  FRAUD_ALERTS_DEFAULTS,
  FRAUD_ALERTS_VALIDATION,
} from '../../constants/tenant/fraud.alerts.js';

export class FraudAlertsValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < FRAUD_ALERTS_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > FRAUD_ALERTS_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    // UUID v4 regex
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }

  /**
   * Validates user ID
   */
  static validateUser(userId: number): boolean {
    if (typeof userId !== 'number' || !Number.isInteger(userId)) return false;
    return userId >= FRAUD_ALERTS_VALIDATION.USER.MIN && userId <= FRAUD_ALERTS_VALIDATION.USER.MAX;
  }

  /**
   * Validates time entry ID
   */
  static validateTimeEntry(timeEntryId: number): boolean {
    if (typeof timeEntryId !== 'number' || !Number.isInteger(timeEntryId)) return false;
    return (
      timeEntryId >= FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MIN &&
      timeEntryId <= FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MAX
    );
  }

  /**
   * Validates alert type
   */
  static validateAlertType(alertType: string): boolean {
    if (!alertType || typeof alertType !== 'string') return false;
    const trimmed = alertType.trim();

    const isValidLength =
      trimmed.length >= FRAUD_ALERTS_VALIDATION.ALERT_TYPE.MIN_LENGTH &&
      trimmed.length <= FRAUD_ALERTS_VALIDATION.ALERT_TYPE.MAX_LENGTH;

    const isValidType = Object.values(AlertType).includes(trimmed as AlertType);

    return isValidLength && isValidType;
  }

  /**
   * Validates alert severity
   */
  static validateAlertSeverity(severity: string): boolean {
    if (!severity || typeof severity !== 'string') return false;
    const trimmed = severity.trim();

    const isValidLength =
      trimmed.length >= FRAUD_ALERTS_VALIDATION.ALERT_SEVERITY.MIN_LENGTH &&
      trimmed.length <= FRAUD_ALERTS_VALIDATION.ALERT_SEVERITY.MAX_LENGTH;

    const isValidSeverity = Object.values(AlertSeverity).includes(trimmed as AlertSeverity);

    return isValidLength && isValidSeverity;
  }

  /**
   * Validates alert description
   */
  static validateAlertDescription(description: string): boolean {
    if (!description || typeof description !== 'string') return false;
    const trimmed = description.trim();
    return (
      trimmed.length >= FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MIN_LENGTH &&
      (FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MAX_LENGTH === Infinity ||
        trimmed.length <= FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MAX_LENGTH)
    );
  }

  /**
   * Validates alert data JSON
   */
  static validateAlertData(alertData: any): boolean {
    if (alertData === null || alertData === undefined) return true;

    // If it's already an object, it's valid
    if (typeof alertData === 'object') return true;

    // If it's a string, try to parse it as JSON
    if (typeof alertData === 'string') {
      try {
        JSON.parse(alertData);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Validates investigated status
   */
  static validateInvestigated(investigated: boolean): boolean {
    return typeof investigated === 'boolean';
  }

  /**
   * Validates investigation notes
   */
  static validateInvestigationNotes(notes: string | null, investigated?: boolean): boolean {
    // Required when marking as investigated
    if (investigated === true) {
      if (!notes || typeof notes !== 'string') return false;
      const trimmed = notes.trim();
      return (
        trimmed.length >= FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MIN_LENGTH &&
        (FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MAX_LENGTH === Infinity ||
          trimmed.length <= FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MAX_LENGTH)
      );
    }

    // Optional for non-investigated alerts
    if (notes === null || notes === undefined) return true;
    if (typeof notes !== 'string') return false;

    const trimmed = notes.trim();
    return (
      trimmed.length >= FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MIN_LENGTH &&
      (FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MAX_LENGTH === Infinity ||
        trimmed.length <= FRAUD_ALERTS_VALIDATION.INVESTIGATION_NOTES.MAX_LENGTH)
    );
  }

  /**
   * Validates false positive status
   */
  static validateFalsePositive(falsePositive: boolean): boolean {
    return typeof falsePositive === 'boolean';
  }

  /**
   * Validates investigated at date
   */
  static validateInvestigatedAt(investigatedAt: Date | string | null): boolean {
    if (investigatedAt === null || investigatedAt === undefined) return true;
    const date = new Date(investigatedAt);
    if (isNaN(date.getTime())) return false;

    // Investigation date cannot be in the future
    const now = new Date();
    return date <= now;
  }

  /**
   * Validates created at date
   */
  static validateCreatedAt(createdAt: Date | string | null): boolean {
    if (createdAt === null || createdAt === undefined) return true;
    const date = new Date(createdAt);
    return !isNaN(date.getTime());
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
      limit <= FRAUD_ALERTS_DEFAULTS.PAGINATION.MAX_LIMIT
    );
  }

  /**
   * Validates date range
   */
  static validateDateRange(startDate: Date | string, endDate: Date | string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

    return start <= end;
  }

  /**
   * Validates that alert can be modified
   */
  static canModifyAlert(investigated: boolean): boolean {
    // Cannot modify investigated alerts
    return !investigated;
  }

  /**
   * Validates that investigation is complete
   */
  static isInvestigationComplete(investigated: boolean, notes: string | null): boolean {
    if (!investigated) return true;
    return !!(notes && notes.trim().length > 0);
  }

  /**
   * Validates alert severity level ordering
   */
  static validateSeverityEscalation(currentSeverity: string, newSeverity: string): boolean {
    const severityOrder = {
      [AlertSeverity.LOW]: 1,
      [AlertSeverity.MEDIUM]: 2,
      [AlertSeverity.HIGH]: 3,
      [AlertSeverity.CRITICAL]: 4,
    };

    const current = severityOrder[currentSeverity as AlertSeverity] || 0;
    const newLevel = severityOrder[newSeverity as AlertSeverity] || 0;

    // Allow escalation or same level, but validate de-escalation
    return newLevel >= current;
  }

  /**
   * Cleans and normalizes fraud alert data
   */
  static cleanFraudAlertData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    ['user_id', 'time_entry_id'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = Number(cleaned[field]);
      }
    });

    // Clean string fields
    ['alert_type', 'alert_severity', 'alert_description', 'investigation_notes'].forEach(
      (field) => {
        if (cleaned[field] !== undefined && cleaned[field] !== null) {
          cleaned[field] = cleaned[field].toString().trim();
        }
      },
    );

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert boolean fields
    ['investigated', 'false_positive'].forEach((field) => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = Boolean(cleaned[field]);
      }
    });

    // Convert dates
    ['investigated_at', 'created_at'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Parse JSON alert data if it comes as string
    if (
      cleaned.alert_data !== undefined &&
      cleaned.alert_data !== null &&
      typeof cleaned.alert_data === 'string'
    ) {
      try {
        cleaned.alert_data = JSON.parse(cleaned.alert_data);
      } catch {
        throw new Error('Invalid alert_data: must be valid JSON');
      }
    }

    return cleaned;
  }

  /**
   * Validates that a fraud alert is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['user_id', 'time_entry_id', 'alert_type', 'alert_description'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateUser(data.user_id) &&
      this.validateTimeEntry(data.time_entry_id) &&
      this.validateAlertType(data.alert_type) &&
      (data.alert_severity === undefined || this.validateAlertSeverity(data.alert_severity)) &&
      this.validateAlertDescription(data.alert_description) &&
      this.validateAlertData(data.alert_data) &&
      (data.investigated === undefined || this.validateInvestigated(data.investigated)) &&
      this.validateInvestigationNotes(data.investigation_notes, data.investigated) &&
      (data.false_positive === undefined || this.validateFalsePositive(data.false_positive)) &&
      this.validateInvestigatedAt(data.investigated_at) &&
      this.validateCreatedAt(data.created_at) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Validates that a fraud alert is valid for update
   */
  static isValidForUpdate(data: any, currentAlert?: any): boolean {
    // Cannot modify investigated alerts
    if (
      currentAlert &&
      currentAlert.investigated &&
      !this.canModifyAlert(currentAlert.investigated)
    ) {
      return false;
    }

    // For updates, validate only fields that are present
    const validations = [
      data.user_id === undefined || this.validateUser(data.user_id),
      data.time_entry_id === undefined || this.validateTimeEntry(data.time_entry_id),
      data.alert_type === undefined || this.validateAlertType(data.alert_type),
      data.alert_severity === undefined || this.validateAlertSeverity(data.alert_severity),
      data.alert_description === undefined || this.validateAlertDescription(data.alert_description),
      data.alert_data === undefined || this.validateAlertData(data.alert_data),
      data.investigated === undefined || this.validateInvestigated(data.investigated),
      data.investigation_notes === undefined ||
        this.validateInvestigationNotes(data.investigation_notes, data.investigated),
      data.false_positive === undefined || this.validateFalsePositive(data.false_positive),
      data.investigated_at === undefined || this.validateInvestigatedAt(data.investigated_at),
      data.created_at === undefined || this.validateCreatedAt(data.created_at),
      data.guid === undefined || this.validateGuid(data.guid),
    ];

    // Additional validation for severity escalation
    if (currentAlert && data.alert_severity) {
      validations.push(
        this.validateSeverityEscalation(currentAlert.alert_severity, data.alert_severity),
      );
    }

    return validations.every((validation) => validation === true);
  }

  /**
   * Extracts validation errors for a fraud alert
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (data.user_id === undefined || data.user_id === null || !this.validateUser(data.user_id)) {
      errors.push(
        `Invalid user_id: must be between ${FRAUD_ALERTS_VALIDATION.USER.MIN} and ${FRAUD_ALERTS_VALIDATION.USER.MAX}`,
      );
    }

    if (
      data.time_entry_id === undefined ||
      data.time_entry_id === null ||
      !this.validateTimeEntry(data.time_entry_id)
    ) {
      errors.push(
        `Invalid time_entry_id: must be between ${FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MIN} and ${FRAUD_ALERTS_VALIDATION.TIME_ENTRY.MAX}`,
      );
    }

    if (
      data.alert_type === undefined ||
      data.alert_type === null ||
      !this.validateAlertType(data.alert_type)
    ) {
      errors.push(`Invalid alert_type: must be one of ${Object.values(AlertType).join(', ')}`);
    }

    if (data.alert_severity !== undefined && !this.validateAlertSeverity(data.alert_severity)) {
      errors.push(
        `Invalid alert_severity: must be one of ${Object.values(AlertSeverity).join(', ')}`,
      );
    }

    if (!data.alert_description || !this.validateAlertDescription(data.alert_description)) {
      errors.push(
        `Invalid alert_description: must be at least ${FRAUD_ALERTS_VALIDATION.ALERT_DESCRIPTION.MIN_LENGTH} characters`,
      );
    }

    if (data.alert_data !== undefined && !this.validateAlertData(data.alert_data)) {
      errors.push('Invalid alert_data: must be valid JSON');
    }

    if (data.investigated !== undefined && !this.validateInvestigated(data.investigated)) {
      errors.push('Invalid investigated: must be a boolean value');
    }

    if (!this.validateInvestigationNotes(data.investigation_notes, data.investigated)) {
      if (data.investigated === true) {
        errors.push('Investigation notes are required when marking as investigated');
      } else {
        errors.push('Invalid investigation_notes: must be a valid string');
      }
    }

    if (data.false_positive !== undefined && !this.validateFalsePositive(data.false_positive)) {
      errors.push('Invalid false_positive: must be a boolean value');
    }

    if (data.investigated_at !== undefined && !this.validateInvestigatedAt(data.investigated_at)) {
      errors.push('Invalid investigated_at: must be a valid date not in the future');
    }

    if (data.created_at !== undefined && !this.validateCreatedAt(data.created_at)) {
      errors.push('Invalid created_at: must be a valid date');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be 1-${FRAUD_ALERTS_VALIDATION.GUID.MAX_LENGTH} characters and valid UUID v4 format`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    const hasValidFilter =
      (data.user_id && this.validateUser(data.user_id)) ||
      (data.time_entry_id && this.validateTimeEntry(data.time_entry_id)) ||
      (data.alert_type && this.validateAlertType(data.alert_type)) ||
      (data.alert_severity && this.validateAlertSeverity(data.alert_severity)) ||
      (data.investigated !== undefined && this.validateInvestigated(data.investigated)) ||
      (data.false_positive !== undefined && this.validateFalsePositive(data.false_positive)) ||
      (data.created_at_from && !isNaN(new Date(data.created_at_from).getTime())) ||
      (data.created_at_to && !isNaN(new Date(data.created_at_to).getTime())) ||
      (data.investigated_at_from && !isNaN(new Date(data.investigated_at_from).getTime())) ||
      (data.investigated_at_to && !isNaN(new Date(data.investigated_at_to).getTime())) ||
      (data.guid && this.validateGuid(data.guid));

    // Validate date ranges if both dates are provided
    let validDateRanges = true;
    if (data.created_at_from && data.created_at_to) {
      validDateRanges =
        validDateRanges && this.validateDateRange(data.created_at_from, data.created_at_to);
    }
    if (data.investigated_at_from && data.investigated_at_to) {
      validDateRanges =
        validDateRanges &&
        this.validateDateRange(data.investigated_at_from, data.investigated_at_to);
    }

    return hasValidFilter && validDateRanges;
  }
}
