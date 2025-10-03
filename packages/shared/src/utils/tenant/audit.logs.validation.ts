// utils/audit.logs.validation.ts
import {
  AUDIT_LOGS_DEFAULTS,
  AUDIT_LOGS_VALIDATION,
  AuditOperation,
  ChangedByType,
} from '../../constants/tenant/audit.logs.js';

export class AuditLogsValidationUtils {
  /**
   * Validates GUID
   */
  static validateGuid(guid: string): boolean {
    if (!guid || typeof guid !== 'string') return false;
    const trimmed = guid.trim();

    // Check length
    if (
      trimmed.length < AUDIT_LOGS_VALIDATION.GUID.MIN_LENGTH ||
      trimmed.length > AUDIT_LOGS_VALIDATION.GUID.MAX_LENGTH
    ) {
      return false;
    }

    const uuidRegex = /^[0-9]+$/;
    // UUID v4 regex (optional - can be any GUID format)
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed) || trimmed.length > 0; // Allow other GUID formats
  }

  /**
   * Validates table name
   */
  static validateTableName(tableName: string): boolean {
    if (!tableName || typeof tableName !== 'string') return false;
    const trimmed = tableName.trim();
    return (
      trimmed.length >= AUDIT_LOGS_VALIDATION.TABLE_NAME.MIN_LENGTH &&
      trimmed.length <= AUDIT_LOGS_VALIDATION.TABLE_NAME.MAX_LENGTH
    );
  }

  /**
   * Validates record ID
   */
  static validateRecord(record: number): boolean {
    if (typeof record !== 'number' || !Number.isInteger(record)) return false;
    return record >= AUDIT_LOGS_VALIDATION.RECORD.MIN && record <= AUDIT_LOGS_VALIDATION.RECORD.MAX;
  }

  /**
   * Validates record GUID
   */
  static validateRecordGuid(recordGuid: string | null): boolean {
    if (recordGuid === null || recordGuid === undefined) return true;
    if (typeof recordGuid !== 'string') return false;
    const trimmed = recordGuid.trim();
    return (
      trimmed.length >= AUDIT_LOGS_VALIDATION.RECORD_GUID.MIN_LENGTH &&
      trimmed.length <= AUDIT_LOGS_VALIDATION.RECORD_GUID.MAX_LENGTH
    );
  }

  /**
   * Validates audit operation
   */
  static validateOperation(operation: string): boolean {
    if (!operation || typeof operation !== 'string') return false;
    return Object.values(AuditOperation).includes(operation as AuditOperation);
  }

  /**
   * Validates old values JSON
   */
  static validateOldValues(oldValues: any): boolean {
    if (oldValues === null || oldValues === undefined) return true;

    // If it's already an object, it's valid
    if (typeof oldValues === 'object') return true;

    // If it's a string, try to parse it as JSON
    if (typeof oldValues === 'string') {
      try {
        JSON.parse(oldValues);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Validates new values JSON
   */
  static validateNewValues(newValues: any): boolean {
    if (newValues === null || newValues === undefined) return true;

    // If it's already an object, it's valid
    if (typeof newValues === 'object') return true;

    // If it's a string, try to parse it as JSON
    if (typeof newValues === 'string') {
      try {
        JSON.parse(newValues);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Validates that required values are present based on operation
   */
  static validateValuesForOperation(operation: string, oldValues: any, newValues: any): boolean {
    switch (operation) {
      case AuditOperation.INSERT:
        return newValues !== null && newValues !== undefined;
      case AuditOperation.UPDATE:
        return (
          oldValues !== null &&
          oldValues !== undefined &&
          newValues !== null &&
          newValues !== undefined
        );
      case AuditOperation.DELETE:
        return oldValues !== null && oldValues !== undefined;
      default:
        return false;
    }
  }

  /**
   * Validates changed by user ID
   */
  static validateChangedByUser(changedByUser: number | null): boolean {
    if (changedByUser === null || changedByUser === undefined) return true;
    if (typeof changedByUser !== 'number' || !Number.isInteger(changedByUser)) return false;
    return (
      changedByUser >= AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MIN &&
      changedByUser <= AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MAX
    );
  }

  /**
   * Validates changed by type
   */
  static validateChangedByType(changedByType: string | null): boolean {
    if (changedByType === null || changedByType === undefined) return true;
    if (typeof changedByType !== 'string') return false;

    const trimmed = changedByType.trim();
    const isValidLength =
      trimmed.length >= AUDIT_LOGS_VALIDATION.CHANGED_BY_TYPE.MIN_LENGTH &&
      trimmed.length <= AUDIT_LOGS_VALIDATION.CHANGED_BY_TYPE.MAX_LENGTH;

    const isValidType = Object.values(ChangedByType).includes(trimmed as ChangedByType);

    return isValidLength && isValidType;
  }

  /**
   * Validates change reason
   */
  static validateChangeReason(changeReason: string | null): boolean {
    if (changeReason === null || changeReason === undefined) return true;
    if (typeof changeReason !== 'string') return false;
    const trimmed = changeReason.trim();
    return (
      trimmed.length >= AUDIT_LOGS_VALIDATION.CHANGE_REASON.MIN_LENGTH &&
      trimmed.length <= AUDIT_LOGS_VALIDATION.CHANGE_REASON.MAX_LENGTH
    );
  }

  /**
   * Validates IP address
   */
  static validateIpAddress(ipAddress: string | null): boolean {
    if (ipAddress === null || ipAddress === undefined) return true;
    if (typeof ipAddress !== 'string') return false;

    const trimmed = ipAddress.trim();

    // IPv4 regex
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

    return ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed);
  }

  /**
   * Validates user agent string
   */
  static validateUserAgent(userAgent: string | null): boolean {
    if (userAgent === null || userAgent === undefined) return true;
    if (typeof userAgent !== 'string') return false;

    const trimmed = userAgent.trim();
    return trimmed.length > 0 && trimmed.length <= 1000; // Reasonable user agent length
  }

  /**
   * Validates datetime
   */
  static validateDatetime(datetime: Date | string | null): boolean {
    if (datetime === null || datetime === undefined) return true;
    const date = new Date(datetime);
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
      limit <= AUDIT_LOGS_DEFAULTS.PAGINATION.MAX_LIMIT
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
   * Cleans and normalizes audit log data
   */
  static cleanAuditLogData(data: Record<string, any>): Record<string, any> {
    const cleaned = { ...data };

    // Convert numeric fields
    ['record', 'changed_by_user'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = Number(cleaned[field]);
      }
    });

    // Clean string fields
    [
      'table_name',
      'record_guid',
      'operation',
      'changed_by_type',
      'change_reason',
      'ip_address',
      'user_agent',
    ].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        cleaned[field] = cleaned[field].toString().trim();
      }
    });

    // Clean GUID
    if (cleaned.guid !== undefined && cleaned.guid !== null) {
      cleaned.guid = cleaned.guid.toString().trim();
    }

    // Convert dates
    ['changed_at'].forEach((field) => {
      if (cleaned[field] !== undefined && cleaned[field] !== null) {
        const date = new Date(cleaned[field]);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${field}: must be a valid date`);
        }
        cleaned[field] = date;
      }
    });

    // Parse JSON fields if they come as strings
    ['old_values', 'new_values'].forEach((field) => {
      if (
        cleaned[field] !== undefined &&
        cleaned[field] !== null &&
        typeof cleaned[field] === 'string'
      ) {
        try {
          cleaned[field] = JSON.parse(cleaned[field]);
        } catch {
          throw new Error(`Invalid ${field}: must be valid JSON`);
        }
      }
    });

    return cleaned;
  }

  /**
   * Validates that an audit log is complete for creation
   */
  static isValidForCreation(data: any): boolean {
    const requiredFields = ['table_name', 'record', 'operation'];

    // Check required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return false;
      }
    }

    return (
      this.validateTableName(data.table_name) &&
      this.validateRecord(data.record) &&
      this.validateRecordGuid(data.record_guid) &&
      this.validateOperation(data.operation) &&
      this.validateOldValues(data.old_values) &&
      this.validateNewValues(data.new_values) &&
      this.validateValuesForOperation(data.operation, data.old_values, data.new_values) &&
      this.validateChangedByUser(data.changed_by_user) &&
      this.validateChangedByType(data.changed_by_type) &&
      this.validateChangeReason(data.change_reason) &&
      this.validateIpAddress(data.ip_address) &&
      this.validateUserAgent(data.user_agent) &&
      this.validateDatetime(data.changed_at) &&
      (data.guid === undefined || this.validateGuid(data.guid))
    );
  }

  /**
   * Extracts validation errors for an audit log
   */
  static getValidationErrors(data: any): string[] {
    const errors: string[] = [];

    if (
      data.table_name === undefined ||
      data.table_name === null ||
      !this.validateTableName(data.table_name)
    ) {
      errors.push(
        `Invalid table_name: must be ${AUDIT_LOGS_VALIDATION.TABLE_NAME.MIN_LENGTH}-${AUDIT_LOGS_VALIDATION.TABLE_NAME.MAX_LENGTH} characters`,
      );
    }

    if (data.record === undefined || data.record === null || !this.validateRecord(data.record)) {
      errors.push(
        `Invalid record: must be between ${AUDIT_LOGS_VALIDATION.RECORD.MIN} and ${AUDIT_LOGS_VALIDATION.RECORD.MAX}`,
      );
    }

    if (data.record_guid !== undefined && !this.validateRecordGuid(data.record_guid)) {
      errors.push(
        `Invalid record_guid: must be ${AUDIT_LOGS_VALIDATION.RECORD_GUID.MIN_LENGTH}-${AUDIT_LOGS_VALIDATION.RECORD_GUID.MAX_LENGTH} characters`,
      );
    }

    if (
      data.operation === undefined ||
      data.operation === null ||
      !this.validateOperation(data.operation)
    ) {
      errors.push(`Invalid operation: must be one of ${Object.values(AuditOperation).join(', ')}`);
    }

    if (data.old_values !== undefined && !this.validateOldValues(data.old_values)) {
      errors.push('Invalid old_values: must be valid JSON');
    }

    if (data.new_values !== undefined && !this.validateNewValues(data.new_values)) {
      errors.push('Invalid new_values: must be valid JSON');
    }

    if (
      data.operation &&
      !this.validateValuesForOperation(data.operation, data.old_values, data.new_values)
    ) {
      errors.push('Invalid values for operation: required values missing');
    }

    if (data.changed_by_user !== undefined && !this.validateChangedByUser(data.changed_by_user)) {
      errors.push(
        `Invalid changed_by_user: must be between ${AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MIN} and ${AUDIT_LOGS_VALIDATION.CHANGED_BY_USER.MAX}`,
      );
    }

    if (data.changed_by_type !== undefined && !this.validateChangedByType(data.changed_by_type)) {
      errors.push(
        `Invalid changed_by_type: must be one of ${Object.values(ChangedByType).join(', ')}`,
      );
    }

    if (data.change_reason !== undefined && !this.validateChangeReason(data.change_reason)) {
      errors.push(
        `Invalid change_reason: must be ${AUDIT_LOGS_VALIDATION.CHANGE_REASON.MIN_LENGTH}-${AUDIT_LOGS_VALIDATION.CHANGE_REASON.MAX_LENGTH} characters`,
      );
    }

    if (data.ip_address !== undefined && !this.validateIpAddress(data.ip_address)) {
      errors.push('Invalid ip_address: must be a valid IPv4 or IPv6 address');
    }

    if (data.user_agent !== undefined && !this.validateUserAgent(data.user_agent)) {
      errors.push('Invalid user_agent: must be a valid string');
    }

    if (data.changed_at !== undefined && !this.validateDatetime(data.changed_at)) {
      errors.push('Invalid changed_at: must be a valid date');
    }

    if (data.guid !== undefined && !this.validateGuid(data.guid)) {
      errors.push(
        `Invalid GUID: must be ${AUDIT_LOGS_VALIDATION.GUID.MIN_LENGTH}-${AUDIT_LOGS_VALIDATION.GUID.MAX_LENGTH} characters`,
      );
    }

    return errors;
  }

  /**
   * Validates filter data for searches
   */
  static validateFilterData(data: any): boolean {
    const hasValidFilter =
      (data.table_name && this.validateTableName(data.table_name)) ||
      (data.record && this.validateRecord(data.record)) ||
      (data.record_guid && this.validateRecordGuid(data.record_guid)) ||
      (data.operation && this.validateOperation(data.operation)) ||
      (data.changed_by_user && this.validateChangedByUser(data.changed_by_user)) ||
      (data.changed_by_type && this.validateChangedByType(data.changed_by_type)) ||
      (data.change_reason && this.validateChangeReason(data.change_reason)) ||
      (data.ip_address && this.validateIpAddress(data.ip_address)) ||
      (data.changed_at_from && !isNaN(new Date(data.changed_at_from).getTime())) ||
      (data.changed_at_to && !isNaN(new Date(data.changed_at_to).getTime())) ||
      (data.guid && this.validateGuid(data.guid));

    // Validate date range if both dates are provided
    if (data.changed_at_from && data.changed_at_to) {
      return hasValidFilter && this.validateDateRange(data.changed_at_from, data.changed_at_to);
    }

    return hasValidFilter;
  }

  /**
   * Gets audit log summary statistics
   */
  static getAuditLogSummary(
    auditLogs: any[],
    options: {
      groupBy?: 'table' | 'operation' | 'user' | 'type';
      period?: { start: Date; end: Date };
    } = {},
  ): {
    totalLogs: number;
    operationCounts: Record<string, number>;
    tableCounts: Record<string, number>;
    userCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    timeRange: { earliest: string | null; latest: string | null };
  } {
    let filteredLogs = auditLogs;

    // Filter by period if provided
    if (options.period) {
      filteredLogs = auditLogs.filter((log) => {
        const logDate = new Date(log.changed_at);
        return logDate >= options.period!.start && logDate <= options.period!.end;
      });
    }

    const summary = {
      totalLogs: filteredLogs.length,
      operationCounts: {} as Record<string, number>,
      tableCounts: {} as Record<string, number>,
      userCounts: {} as Record<string, number>,
      typeCounts: {} as Record<string, number>,
      timeRange: { earliest: null as string | null, latest: null as string | null },
    };

    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    filteredLogs.forEach((log) => {
      // Count operations
      const operation = log.operation;
      summary.operationCounts[operation] = (summary.operationCounts[operation] || 0) + 1;

      // Count tables
      const table = log.table_name;
      summary.tableCounts[table] = (summary.tableCounts[table] || 0) + 1;

      // Count users
      if (log.changed_by_user) {
        const user = log.changed_by_user.toString();
        summary.userCounts[user] = (summary.userCounts[user] || 0) + 1;
      }

      // Count types
      if (log.changed_by_type) {
        const type = log.changed_by_type;
        summary.typeCounts[type] = (summary.typeCounts[type] || 0) + 1;
      }

      // Track time range
      const logDate = new Date(log.changed_at);
      if (!earliestDate || logDate < earliestDate) {
        earliestDate = logDate;
      }
      if (!latestDate || logDate > latestDate) {
        latestDate = logDate;
      }
    });

    summary.timeRange.earliest = (earliestDate as Date | null)?.toISOString() || null;
    summary.timeRange.latest = (latestDate as Date | null)?.toISOString() || null;

    return summary;
  }

  /**
   * Validates business rules for audit log creation
   */
  static validateBusinessRules(
    data: any,
    options: {
      allowSystemChanges?: boolean;
      requireChangeReason?: boolean;
      retentionDays?: number;
    } = {},
  ): string[] {
    const errors: string[] = [];
    const { allowSystemChanges = true, requireChangeReason = false, retentionDays = 365 } = options;

    // Check if system changes are allowed
    if (!allowSystemChanges && data.changed_by_type === ChangedByType.SYSTEM) {
      errors.push('System-generated changes are not allowed');
    }

    // Check if change reason is required
    if (requireChangeReason && !data.change_reason) {
      errors.push('Change reason is required');
    }

    // Check retention policy
    if (data.changed_at) {
      const changeDate = new Date(data.changed_at);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      if (changeDate < cutoffDate) {
        errors.push(`Audit log exceeds retention period of ${retentionDays} days`);
      }
    }

    // Validate operation-specific rules
    switch (data.operation) {
      case AuditOperation.INSERT:
        if (!data.new_values) {
          errors.push('INSERT operations require new_values');
        }
        if (data.old_values) {
          errors.push('INSERT operations should not have old_values');
        }
        break;

      case AuditOperation.UPDATE:
        if (!data.old_values || !data.new_values) {
          errors.push('UPDATE operations require both old_values and new_values');
        }
        break;

      case AuditOperation.DELETE:
        if (!data.old_values) {
          errors.push('DELETE operations require old_values');
        }
        if (data.new_values) {
          errors.push('DELETE operations should not have new_values');
        }
        break;
    }

    return errors;
  }

  /**
   * Generates audit trail report
   */
  static generateAuditTrailReport(
    auditLogs: any[],
    options: {
      tableName?: string;
      recordId?: number;
      period?: { start: Date; end: Date };
      includeMetrics?: boolean;
    } = {},
  ) {
    let filteredLogs = auditLogs;

    // Apply filters
    if (options.tableName) {
      filteredLogs = filteredLogs.filter((log) => log.table_name === options.tableName);
    }

    if (options.recordId) {
      filteredLogs = filteredLogs.filter((log) => log.record === options.recordId);
    }

    if (options.period) {
      filteredLogs = filteredLogs.filter((log) => {
        const logDate = new Date(log.changed_at);
        return logDate >= options.period!.start && logDate <= options.period!.end;
      });
    }

    const summary = this.getAuditLogSummary(filteredLogs, { period: options.period! });

    const report = {
      filters: {
        tableName: options.tableName || 'All tables',
        recordId: options.recordId || 'All records',
        period: options.period
          ? {
              start: options.period.start.toISOString(),
              end: options.period.end.toISOString(),
            }
          : 'All time',
      },
      summary,
      timeline: filteredLogs
        .map((log) => ({
          timestamp: log.changed_at,
          operation: log.operation,
          table: log.table_name,
          record: log.record,
          changedBy: log.changed_by_user || 'System',
          changedByType: log.changed_by_type,
          reason: log.change_reason,
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    };

    if (options.includeMetrics) {
      return {
        ...report,
        metrics: this.calculateAuditMetrics(filteredLogs),
      };
    }

    return report;
  }

  /**
   * Calculates audit metrics
   */
  private static calculateAuditMetrics(auditLogs: any[]) {
    const totalChanges = auditLogs.length;
    const uniqueTables = new Set(auditLogs.map((log) => log.table_name)).size;
    const uniqueUsers = new Set(auditLogs.map((log) => log.changed_by_user).filter(Boolean)).size;

    // Calculate change frequency (changes per day)
    if (auditLogs.length === 0) {
      return {
        totalChanges: 0,
        uniqueTables: 0,
        uniqueUsers: 0,
        changesPerDay: 0,
        mostActiveTable: null,
        mostActiveUser: null,
      };
    }

    const dates = auditLogs.map((log) => new Date(log.changed_at));
    const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const daysDiff = Math.max(
      1,
      Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const changesPerDay = totalChanges / daysDiff;

    // Find most active table and user
    const tableCounts = auditLogs.reduce(
      (acc, log) => {
        acc[log.table_name] = (acc[log.table_name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const userCounts = auditLogs.reduce(
      (acc, log) => {
        if (log.changed_by_user) {
          acc[log.changed_by_user] = (acc[log.changed_by_user] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostActiveTable =
      (Object.entries(tableCounts) as [string, number][]).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      null;
    const mostActiveUser =
      (Object.entries(userCounts) as [string, number][]).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      null;

    return {
      totalChanges,
      uniqueTables,
      uniqueUsers,
      changesPerDay: Number(changesPerDay.toFixed(2)),
      mostActiveTable,
      mostActiveUser: mostActiveUser ? Number(mostActiveUser) : null,
    };
  }
}
