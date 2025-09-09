// utils/employee.license.validation.ts
import {
  BillingStatusComputed,
  ContractualStatus,
  EMPLOYEE_LICENSE_VALIDATION,
  LeaveType,
} from '../constants/employee.license.js';

export class EmployeeLicenseValidationUtils {
  /**
   * Validates global license ID
   */
  static validateGlobalLicenseId(globalLicenseId: number): boolean {
    return Number.isInteger(globalLicenseId) && globalLicenseId >= 1;
  }

  /**
   * Validates employee ID
   */
  static validateEmployee(employee: string): boolean {
    if (!employee || typeof employee !== 'string') return false;
    const trimmed = employee.trim();
    return (
      trimmed.length >= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MIN_LENGTH &&
      trimmed.length <= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MAX_LENGTH &&
      EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.PATTERN.test(trimmed)
    );
  }

  /**
   * Validates employee code
   */
  static validateEmployeeCode(employeeCode: string): boolean {
    if (!employeeCode || typeof employeeCode !== 'string') return false;
    const trimmed = employeeCode.trim();
    return (
      trimmed.length >= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH &&
      trimmed.length <= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH &&
      EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.PATTERN.test(trimmed)
    );
  }

  /**
   * Validates activation date
   */
  static validateActivationDate(date: Date | string): boolean {
    const activationDate = new Date(date);
    return !isNaN(activationDate.getTime()) && activationDate <= new Date();
  }

  /**
   * Validates deactivation date
   */
  static validateDeactivationDate(
    deactivationDate: Date | string | null,
    activationDate?: Date | string,
  ): boolean {
    if (deactivationDate === null || deactivationDate === undefined) return true;

    const deactivation = new Date(deactivationDate);
    if (isNaN(deactivation.getTime())) return false;

    if (activationDate) {
      const activation = new Date(activationDate);
      return !isNaN(activation.getTime()) && deactivation > activation;
    }

    return true;
  }

  /**
   * Validates last activity date
   */
  static validateLastActivityDate(date: Date | string | null): boolean {
    if (date === null || date === undefined) return true;
    const activityDate = new Date(date);
    return !isNaN(activityDate.getTime());
  }

  /**
   * Validates contractual status
   */
  static validateContractualStatus(status: string): boolean {
    if (!status || typeof status !== 'string') return false;
    return Object.values(ContractualStatus).includes(
      status.trim().toUpperCase() as ContractualStatus,
    );
  }

  /**
   * Validates long leave type
   */
  static validateLongLeaveType(type: string | null): boolean {
    if (type === null || type === undefined) return true;
    if (typeof type !== 'string') return false;
    return Object.values(LeaveType).includes(type.trim().toUpperCase() as LeaveType);
  }

  /**
   * Validates long leave declared by
   */
  static validateLongLeaveDeclaredBy(declaredBy: string | null): boolean {
    if (declaredBy === null || declaredBy === undefined) return true;
    if (typeof declaredBy !== 'string') return false;
    const trimmed = declaredBy.trim();
    return (
      trimmed.length >= EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MIN_LENGTH &&
      trimmed.length <= EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MAX_LENGTH &&
      EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.PATTERN.test(trimmed)
    );
  }

  /**
   * Validates long leave declared at date
   */
  static validateLongLeaveDeclaredAt(date: Date | string | null): boolean {
    if (date === null || date === undefined) return true;
    const declaredDate = new Date(date);
    return !isNaN(declaredDate.getTime());
  }

  /**
   * Validates long leave reason
   */
  static validateLongLeaveReason(reason: string | null): boolean {
    if (reason === null || reason === undefined) return true;
    if (typeof reason !== 'string') return false;
    return reason.trim().length <= EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_REASON.MAX_LENGTH;
  }

  /**
   * Validates computed billing status (read-only)
   */
  static validateComputedBillingStatus(status: string): boolean {
    if (!status || typeof status !== 'string') return false;
    return Object.values(BillingStatusComputed).includes(
      status.trim().toUpperCase() as BillingStatusComputed,
    );
  }

  /**
   * Validates grace period dates
   */
  static validateGracePeriodDates(
    startDate: Date | string | null,
    endDate: Date | string | null,
  ): boolean {
    if (!startDate || !endDate) return true;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

    return end > start;
  }

  /**
   * Validates GUID
   */
  static validateGuid(guid: number | string): boolean {
    const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
    return (
      Number.isInteger(numGuid) &&
      numGuid >= EMPLOYEE_LICENSE_VALIDATION.GUID.MIN_VALUE &&
      numGuid <= EMPLOYEE_LICENSE_VALIDATION.GUID.MAX_VALUE
    );
  }

  /**
   * Validates long leave consistency
   */
  static validateLongLeaveConsistency(
    declaredLongLeave: boolean,
    declaredBy: string | null,
    declaredAt: Date | string | null,
  ): boolean {
    if (declaredLongLeave) {
      return !!(declaredBy && declaredAt);
    }
    return true;
  }

  /**
   * Validates anti-fraud constraint: no long leave with recent activity
   */
  static validateLongLeaveActivityConstraint(
    declaredLongLeave: boolean,
    lastActivityDate: Date | string | null,
  ): boolean {
    if (!declaredLongLeave || !lastActivityDate) return true;

    const activity = new Date(lastActivityDate);
    const gracePeriodAgo = new Date();
    gracePeriodAgo.setDate(
      gracePeriodAgo.getDate() - EMPLOYEE_LICENSE_VALIDATION.GRACE_PERIOD.DAYS_AFTER_LAST_ACTIVITY,
    );

    return activity < gracePeriodAgo;
  }

  /**
   * Validates date relationships
   */
  static validateDateLogic(
    activationDate: Date | string,
    deactivationDate?: Date | string | null,
    lastActivityDate?: Date | string | null,
  ): boolean {
    const activation = new Date(activationDate);
    if (isNaN(activation.getTime())) return false;

    if (deactivationDate) {
      const deactivation = new Date(deactivationDate);
      if (isNaN(deactivation.getTime()) || deactivation <= activation) return false;
    }

    if (lastActivityDate) {
      const activity = new Date(lastActivityDate);
      if (isNaN(activity.getTime())) return false;

      // Activity should generally be after activation
      if (activity < activation) return false;

      // If deactivated, activity should typically be before deactivation
      if (deactivationDate) {
        const deactivation = new Date(deactivationDate);
        if (activity > deactivation) return false;
      }
    }

    return true;
  }

  /**
   * Checks if employee license is currently active
   */
  static isActive(contractualStatus: string, deactivationDate: Date | string | null): boolean {
    if (contractualStatus !== ContractualStatus.ACTIVE) return false;
    if (!deactivationDate) return true;

    return new Date(deactivationDate) > new Date();
  }

  /**
   * Checks if employee is billable
   */
  static isBillable(contractualStatus: string, computedBillingStatus: string): boolean {
    return (
      contractualStatus === ContractualStatus.ACTIVE &&
      computedBillingStatus === BillingStatusComputed.BILLABLE
    );
  }

  /**
   * Cleans and normalizes employee license data
   */
  static cleanEmployeeLicenseData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert global_license
    if (cleaned.global_license !== undefined) {
      cleaned.global_license = parseInt(cleaned.global_license);
      if (isNaN(cleaned.global_license)) {
        throw new Error('Invalid global_license: must be a valid integer');
      }
    }

    // Clean employee ID
    if (cleaned.employee !== undefined) {
      cleaned.employee = cleaned.employee.toString().trim();
    }

    // Clean employee code
    if (cleaned.employee_code !== undefined) {
      cleaned.employee_code = cleaned.employee_code.toString().trim();
    }

    // Convert dates
    [
      'activation_date',
      'deactivation_date',
      'last_activity_date',
      'long_leave_declared_at',
      'grace_period_start',
      'grace_period_end',
    ].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Clean contractual status
    if (cleaned.contractual_status !== undefined) {
      cleaned.contractual_status = cleaned.contractual_status.toString().trim().toUpperCase();
    }

    // Convert boolean fields
    if (cleaned.declared_long_leave !== undefined) {
      cleaned.declared_long_leave = Boolean(cleaned.declared_long_leave);
    }

    // Clean string fields
    ['long_leave_declared_by', 'long_leave_reason'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean long leave type
    if (cleaned.long_leave_type !== undefined && cleaned.long_leave_type !== null) {
      cleaned.long_leave_type = cleaned.long_leave_type.toString().trim().toUpperCase();
    }

    // Convert GUID
    if (cleaned.guid !== undefined) {
      cleaned.guid = parseInt(cleaned.guid);
      if (isNaN(cleaned.guid)) {
        throw new Error('Invalid GUID: must be a valid 6-digit number');
      }
    }

    return cleaned;
  }

  /**
   * Validates that an employee license is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['global_license', 'employee', 'employee_code', 'activation_date'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateGlobalLicenseId(data.global_license) &&
      this.validateEmployee(data.employee) &&
      this.validateEmployeeCode(data.employee_code) &&
      this.validateActivationDate(data.activation_date) &&
      this.validateDeactivationDate(data.deactivation_date, data.activation_date) &&
      this.validateLastActivityDate(data.last_activity_date) &&
      this.validateContractualStatus(data.contractual_status || ContractualStatus.ACTIVE) &&
      this.validateLongLeaveType(data.long_leave_type) &&
      this.validateLongLeaveDeclaredBy(data.long_leave_declared_by) &&
      this.validateLongLeaveDeclaredAt(data.long_leave_declared_at) &&
      this.validateLongLeaveReason(data.long_leave_reason) &&
      this.validateGracePeriodDates(data.grace_period_start, data.grace_period_end) &&
      this.validateLongLeaveConsistency(
        data.declared_long_leave || false,
        data.long_leave_declared_by,
        data.long_leave_declared_at,
      ) &&
      this.validateLongLeaveActivityConstraint(
        data.declared_long_leave || false,
        data.last_activity_date,
      ) &&
      this.validateDateLogic(data.activation_date, data.deactivation_date, data.last_activity_date)
    );
  }

  /**
   * Extracts validation errors for an employee license
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (!data.global_license || !this.validateGlobalLicenseId(data.global_license)) {
      errors.push('Invalid global_license: must be a positive integer');
    }

    if (!data.employee || !this.validateEmployee(data.employee)) {
      errors.push(
        `Invalid employee: must be alphanumeric/underscore, 1-${EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MAX_LENGTH} characters`,
      );
    }

    if (!data.employee_code || !this.validateEmployeeCode(data.employee_code)) {
      errors.push(
        `Invalid employee_code: must be alphanumeric/underscore, 1-${EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH} characters`,
      );
    }

    if (!data.activation_date || !this.validateActivationDate(data.activation_date)) {
      errors.push('Invalid activation_date: must be a valid date not in the future');
    }

    if (
      data.deactivation_date !== undefined &&
      !this.validateDeactivationDate(data.deactivation_date, data.activation_date)
    ) {
      errors.push('Invalid deactivation_date: must be a valid date after activation_date');
    }

    if (
      data.last_activity_date !== undefined &&
      !this.validateLastActivityDate(data.last_activity_date)
    ) {
      errors.push('Invalid last_activity_date: must be a valid date');
    }

    if (
      data.contractual_status !== undefined &&
      !this.validateContractualStatus(data.contractual_status)
    ) {
      errors.push(
        `Invalid contractual_status: must be one of ${Object.values(ContractualStatus).join(', ')}`,
      );
    }

    if (data.long_leave_type !== undefined && !this.validateLongLeaveType(data.long_leave_type)) {
      errors.push(`Invalid long_leave_type: must be one of ${Object.values(LeaveType).join(', ')}`);
    }

    if (
      data.long_leave_declared_by !== undefined &&
      !this.validateLongLeaveDeclaredBy(data.long_leave_declared_by)
    ) {
      errors.push(
        `Invalid long_leave_declared_by: must be alphanumeric/underscore, 1-${EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MAX_LENGTH} characters`,
      );
    }

    if (
      data.long_leave_declared_at !== undefined &&
      !this.validateLongLeaveDeclaredAt(data.long_leave_declared_at)
    ) {
      errors.push('Invalid long_leave_declared_at: must be a valid date');
    }

    if (
      data.long_leave_reason !== undefined &&
      !this.validateLongLeaveReason(data.long_leave_reason)
    ) {
      errors.push(
        `Invalid long_leave_reason: must not exceed ${EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_REASON.MAX_LENGTH} characters`,
      );
    }

    if (
      data.computed_billing_status !== undefined &&
      !this.validateComputedBillingStatus(data.computed_billing_status)
    ) {
      errors.push(
        `Invalid computed_billing_status: must be one of ${Object.values(BillingStatusComputed).join(', ')}`,
      );
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push('Invalid GUID: must be a 6-digit integer between 100000 and 999999');
    }

    if (!this.validateGracePeriodDates(data.grace_period_start, data.grace_period_end)) {
      errors.push('Invalid grace period: end date must be after start date');
    }

    if (
      !this.validateLongLeaveConsistency(
        data.declared_long_leave || false,
        data.long_leave_declared_by,
        data.long_leave_declared_at,
      )
    ) {
      errors.push(
        'Long leave data inconsistent: declared_by and declared_at are required when declared_long_leave is true',
      );
    }

    if (
      !this.validateLongLeaveActivityConstraint(
        data.declared_long_leave || false,
        data.last_activity_date,
      )
    ) {
      errors.push(
        `Cannot declare long leave with recent activity (within ${EMPLOYEE_LICENSE_VALIDATION.GRACE_PERIOD.DAYS_AFTER_LAST_ACTIVITY} days)`,
      );
    }

    if (
      data.activation_date &&
      !this.validateDateLogic(data.activation_date, data.deactivation_date, data.last_activity_date)
    ) {
      errors.push(
        'Invalid date logic: ensure activation_date <= last_activity_date <= deactivation_date',
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    return (
      (data.global_license && this.validateGlobalLicenseId(data.global_license)) ||
      (data.employee && this.validateEmployee(data.employee)) ||
      (data.employee_code && this.validateEmployeeCode(data.employee_code)) ||
      (data.contractual_status && this.validateContractualStatus(data.contractual_status)) ||
      (data.long_leave_type && this.validateLongLeaveType(data.long_leave_type)) ||
      (data.computed_billing_status &&
        this.validateComputedBillingStatus(data.computed_billing_status)) ||
      (data.declared_long_leave !== undefined && typeof data.declared_long_leave === 'boolean') ||
      (data.activation_date_from && !isNaN(new Date(data.activation_date_from).getTime())) ||
      (data.activation_date_to && !isNaN(new Date(data.activation_date_to).getTime())) ||
      (data.deactivation_date_from && !isNaN(new Date(data.deactivation_date_from).getTime())) ||
      (data.deactivation_date_to && !isNaN(new Date(data.deactivation_date_to).getTime())) ||
      (data.last_activity_date_from && !isNaN(new Date(data.last_activity_date_from).getTime())) ||
      (data.last_activity_date_to && !isNaN(new Date(data.last_activity_date_to).getTime()))
    );
  }

  /**
   * Normalizes contractual status for search
   */
  static normalizeContractualStatus(status: string): string {
    if (!this.validateContractualStatus(status)) {
      throw new Error('Invalid contractual status for normalization');
    }
    return status.trim().toUpperCase();
  }

  /**
   * Normalizes leave type for search
   */
  static normalizeLeaveType(type: string): string {
    if (!this.validateLongLeaveType(type)) {
      throw new Error('Invalid leave type for normalization');
    }
    return type.trim().toUpperCase();
  }

  /**
   * Normalizes billing status for search
   */
  static normalizeBillingStatus(status: string): string {
    if (!this.validateComputedBillingStatus(status)) {
      throw new Error('Invalid billing status for normalization');
    }
    return status.trim().toUpperCase();
  }

  /**
   * Calculates days since last activity
   */
  static calculateDaysSinceLastActivity(lastActivityDate: Date | string): number {
    if (!lastActivityDate) return -1;
    const activity = new Date(lastActivityDate);
    const now = new Date();
    const diffTime = now.getTime() - activity.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates grace period days remaining
   */
  static calculateGracePeriodDaysRemaining(gracePeriodEnd: Date | string): number {
    if (!gracePeriodEnd) return 0;
    const end = new Date(gracePeriodEnd);
    const now = new Date();
    if (end <= now) return 0;
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if employee is in grace period
   */
  static isInGracePeriod(
    gracePeriodStart: Date | string | null,
    gracePeriodEnd: Date | string | null,
  ): boolean {
    if (!gracePeriodStart || !gracePeriodEnd) return false;
    const now = new Date();
    const start = new Date(gracePeriodStart);
    const end = new Date(gracePeriodEnd);
    return now >= start && now <= end;
  }
}

// // utils/employee.license.validation.ts
// import {
//   BillingStatusComputed,
//   ContractualStatus,
//   EMPLOYEE_LICENSE_VALIDATION,
//   LeaveType,
// } from '../constants/employee.license.js';
//
// export class EmployeeLicenseValidationUtils {
//   /**
//    * Validates global license ID
//    */
//   static validateGlobalLicenseId(globalLicenseId: number): boolean {
//     return Number.isInteger(globalLicenseId) && globalLicenseId >= 1;
//   }
//
//   /**
//    * Validates employee ID
//    */
//   static validateEmployee(employeeId: string): boolean {
//     if (!employeeId || typeof employeeId !== 'string') return false;
//     const trimmed = employeeId.trim();
//     return (
//       trimmed.length >= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MIN_LENGTH &&
//       trimmed.length <= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.MAX_LENGTH &&
//       EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE.PATTERN.test(trimmed)
//     );
//   }
//
//   /**
//    * Validates employee code
//    */
//   static validateEmployeeCode(employeeCode: string): boolean {
//     if (!employeeCode || typeof employeeCode !== 'string') return false;
//     const trimmed = employeeCode.trim();
//     return (
//       trimmed.length >= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MIN_LENGTH &&
//       trimmed.length <= EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.MAX_LENGTH &&
//       EMPLOYEE_LICENSE_VALIDATION.EMPLOYEE_CODE.PATTERN.test(trimmed)
//     );
//   }
//
//   /**
//    * Validates activation date
//    */
//   static validateActivationDate(date: Date | string): boolean {
//     const activationDate = new Date(date);
//     return !isNaN(activationDate.getTime()) && activationDate <= new Date();
//   }
//
//   /**
//    * Validates deactivation date
//    */
//   static validateDeactivationDate(
//     deactivationDate: Date | string | null,
//     activationDate?: Date | string,
//   ): boolean {
//     if (deactivationDate === null || deactivationDate === undefined) return true;
//
//     const deactivation = new Date(deactivationDate);
//     if (isNaN(deactivation.getTime())) return false;
//
//     if (activationDate) {
//       const activation = new Date(activationDate);
//       return !isNaN(activation.getTime()) && deactivation > activation;
//     }
//
//     return true;
//   }
//
//   /**
//    * Validates last activity date
//    */
//   static validateLastActivityDate(date: Date | string | null): boolean {
//     if (date === null || date === undefined) return true;
//     const activityDate = new Date(date);
//     return !isNaN(activityDate.getTime());
//   }
//
//   /**
//    * Validates contractual status
//    */
//   static validateContractualStatus(status: string): boolean {
//     if (!status || typeof status !== 'string') return false;
//     return Object.values(ContractualStatus).includes(
//       status.trim().toUpperCase() as ContractualStatus,
//     );
//   }
//
//   /**
//    * Validates long leave type
//    */
//   static validateLongLeaveType(type: string | null): boolean {
//     if (type === null || type === undefined) return true;
//     if (typeof type !== 'string') return false;
//     return Object.values(LeaveType).includes(type.trim().toUpperCase() as LeaveType);
//   }
//
//   /**
//    * Validates long leave declared by
//    */
//   static validateLongLeaveDeclaredBy(declaredBy: string | null): boolean {
//     if (declaredBy === null || declaredBy === undefined) return true;
//     if (typeof declaredBy !== 'string') return false;
//     const trimmed = declaredBy.trim();
//     return (
//       trimmed.length >= EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MIN_LENGTH &&
//       trimmed.length <= EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.MAX_LENGTH &&
//       EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_DECLARED_BY.PATTERN.test(trimmed)
//     );
//   }
//
//   /**
//    * Validates long leave declared at date
//    */
//   static validateLongLeaveDeclaredAt(date: Date | string | null): boolean {
//     if (date === null || date === undefined) return true;
//     const declaredDate = new Date(date);
//     return !isNaN(declaredDate.getTime());
//   }
//
//   /**
//    * Validates long leave reason
//    */
//   static validateLongLeaveReason(reason: string | null): boolean {
//     if (reason === null || reason === undefined) return true;
//     if (typeof reason !== 'string') return false;
//     return reason.trim().length <= EMPLOYEE_LICENSE_VALIDATION.LONG_LEAVE_REASON.MAX_LENGTH;
//   }
//
//   /**
//    * Validates computed billing status (read-only)
//    */
//   static validateComputedBillingStatus(status: string): boolean {
//     if (!status || typeof status !== 'string') return false;
//     return Object.values(BillingStatusComputed).includes(
//       status.trim().toUpperCase() as BillingStatusComputed,
//     );
//   }
//
//   /**
//    * Validates grace period dates
//    */
//   static validateGracePeriodDates(
//     startDate: Date | string | null,
//     endDate: Date | string | null,
//   ): boolean {
//     if (!startDate || !endDate) return true;
//
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//
//     if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
//
//     return end > start;
//   }
//
//   /**
//    * Validates GUID
//    */
//   static validateGuid(guid: number | string): boolean {
//     const numGuid = typeof guid === 'string' ? parseInt(guid) : guid;
//     return (
//       Number.isInteger(numGuid) &&
//       numGuid >= EMPLOYEE_LICENSE_VALIDATION.GUID.MIN_VALUE &&
//       numGuid <= EMPLOYEE_LICENSE_VALIDATION.GUID.MAX_VALUE
//     );
//   }
//
//   /**
//    * Validates long leave consistency
//    */
//   static validateLongLeaveConsistency(
//     declaredLongLeave: boolean,
//     declaredBy: string | null,
//     declaredAt: Date | string | null,
//   ): boolean {
//     if (declaredLongLeave) {
//       return !!(declaredBy && declaredAt);
//     }
//     return true;
//   }
//
//   /**
//    * Validates anti-fraud constraint: no long leave with recent activity
//    */
//   static validateLongLeaveActivityConstraint(
//     declaredLongLeave: boolean,
//     lastActivityDate: Date | string | null,
//   ): boolean {
//     if (!declaredLongLeave || !lastActivityDate) return true;
//
//     const activity = new Date(lastActivityDate);
//     const gracePeriodAgo = new Date();
//     gracePeriodAgo.setDate(
//       gracePeriodAgo.getDate() - EMPLOYEE_LICENSE_VALIDATION.GRACE_PERIOD.DAYS_AFTER_LAST_ACTIVITY,
//     );
//
//     return activity < gracePeriodAgo;
//   }
//
//   /**
//    * Validates date relationships
//    */
//   static validateDateLogic(
//     activationDate: Date | string,
//     deactivationDate?: Date | string | null,
//     lastActivityDate?: Date | string | null,
//   ): boolean {
//     const activation = new Date(activationDate);
//     if (isNaN(activation.getTime())) return false;
//
//     if (deactivationDate) {
//       const deactivation = new Date(deactivationDate);
//       if (isNaN(deactivation.getTime()) || deactivation <= activation) return false;
//     }
//
//     if (lastActivityDate) {
//       const activity = new Date(lastActivityDate);
//       if (isNaN(activity.getTime())) return false;
//
//       // Activity should generally be after activation
//       if (activity < activation) return false;
//
//       // If deactivated, activity should typically be before deactivation
//       if (deactivationDate) {
//         const deactivation = new Date(deactivationDate);
//         if (activity > deactivation) return false;
//       }
//     }
//
//     return true;
//   }
//
//   /**
//    * Checks if employee license is currently active
//    */
//   static isActive(contractualStatus: string, deactivationDate: Date | string | null): boolean {
//     if (contractualStatus !== ContractualStatus.ACTIVE) return false;
//     if (!deactivationDate) return true;
//
//     return new Date(deactivationDate) > new Date();
//   }
//
//   /**
//    * Checks if employee is billable
//    */
//   static isBillable(contractualStatus: string, computedBillingStatus: string): boolean {
//     return (
//       contractualStatus === ContractualStatus.ACTIVE &&
//       computedBillingStatus === BillingStatusComputed.BILLABLE
//     );
//   }
//
//   /**
//    * Cleans
//    *
//    **/
// }
