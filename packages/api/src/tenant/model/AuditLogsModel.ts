import { AUDIT_LOGS_ERRORS, AuditLogsValidationUtils } from '@toke/shared';
import sequelize, { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class AuditLogsModel extends BaseModel {
  public readonly db = {
    tableName: tableName.AUDIT_LOGS,
    id: 'id',
    guid: 'guid',
    table_name: 'table_name',
    record: 'record',
    record_guid: 'record_guid',
    operation: 'operation',
    old_values: 'old_values',
    new_values: 'new_values',
    changed_by_user: 'changed_by_user',
    changed_by_type: 'changed_by_type',
    change_reason: 'change_reason',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected table_name?: string;
  protected record?: number;
  protected record_guid?: string;
  protected operation?: string;
  protected old_values?: any;
  protected new_values?: any;
  protected changed_by_user?: number;
  protected changed_by_type?: string;
  protected change_reason?: string;
  protected ip_address?: string;
  protected user_agent?: string;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  // === RECHERCHES DE BASE ===

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async findByRecordGuid(record_guid: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.record_guid]: record_guid,
    });
  }

  // === RECHERCHES PAR CRITÈRES ===

  protected async listByTable(table_name: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.table_name]: table_name,
    });
  }

  protected async listByUser(user_id: number): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.changed_by_user]: user_id,
    });
  }

  protected async listByOperation(operation: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.operation]: operation,
    });
  }

  protected async listByDateRange(start_date: Date, end_date: Date): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.created_at]: {
        [Op.between]: [start_date, end_date],
      },
    });
  }

  protected async listByChangedByType(type: string): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.changed_by_type]: type,
    });
  }

  // === RECHERCHES COMPLEXES ===

  protected async searchLogs(filters: {
    table_name?: string;
    user_id?: number;
    operation?: string;
    changed_by_type?: string;
    start_date?: Date;
    end_date?: Date;
    record_guid?: string;
    search_values?: string;
  }): Promise<any[]> {
    const conditions: any = {};

    if (filters.table_name) {
      conditions[this.db.table_name] = filters.table_name;
    }

    if (filters.user_id) {
      conditions[this.db.changed_by_user] = filters.user_id;
    }

    if (filters.operation) {
      conditions[this.db.operation] = filters.operation;
    }

    if (filters.changed_by_type) {
      conditions[this.db.changed_by_type] = filters.changed_by_type;
    }

    if (filters.record_guid) {
      conditions[this.db.record_guid] = filters.record_guid;
    }

    if (filters.start_date && filters.end_date) {
      conditions[this.db.created_at] = {
        [Op.between]: [filters.start_date, filters.end_date],
      };
    }

    if (filters.search_values) {
      conditions[Op.or] = [
        {
          [this.db.old_values]: {
            [Op.contains]: filters.search_values,
          },
        },
        {
          [this.db.new_values]: {
            [Op.contains]: filters.search_values,
          },
        },
      ];
    }

    return await this.findAll(this.db.tableName, conditions);
  }

  protected async findSensitiveDataAccess(
    user_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<any[]> {
    const sensitiveOperations = ['SELECT_SENSITIVE', 'UPDATE'];
    const sensitiveTables = ['users', 'time_entries', 'memos'];

    return await this.findAll(this.db.tableName, {
      [this.db.changed_by_user]: user_id,
      [this.db.table_name]: {
        [Op.in]: sensitiveTables,
      },
      [this.db.operation]: {
        [Op.in]: sensitiveOperations,
      },
      [this.db.created_at]: {
        [Op.between]: [start_date, end_date],
      },
    });
  }

  protected async findModificationsByRecord(table_name: string, record_id: number): Promise<any[]> {
    return await this.listAll({
      [this.db.table_name]: table_name,
      [this.db.record]: record_id,
    });
  }

  // === ANALYSES & DÉTECTIONS ===

  protected async detectSuspiciousPatterns(analysis_days: number = 30): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - analysis_days);

    // Détection corrections excessives (même utilisateur, même table)
    const suspiciousCorrections = await this.sequelize.query(
      `
      SELECT 
        changed_by_user,
        table_name,
        COUNT(*) as correction_count,
        'excessive_corrections' as pattern_type
      FROM ${this.db.tableName}
      WHERE operation = 'UPDATE'
      AND created_at >= :cutoffDate
      AND change_reason ILIKE '%correction%'
      GROUP BY changed_by_user, table_name
      HAVING COUNT(*) > 20
      ORDER BY correction_count DESC
    `,
      {
        replacements: { cutoffDate },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    // Détection modifications hors heures (22h-6h)
    const afterHoursModifications = await this.sequelize.query(
      `
      SELECT 
        changed_by_user,
        COUNT(*) as after_hours_count,
        'after_hours_modifications' as pattern_type
      FROM ${this.db.tableName}
      WHERE created_at >= :cutoffDate
      AND EXTRACT(HOUR FROM created_at) NOT BETWEEN 6 AND 22
      AND changed_by_type = 'user'
      GROUP BY changed_by_user
      HAVING COUNT(*) > 5
      ORDER BY after_hours_count DESC
    `,
      {
        replacements: { cutoffDate },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return [...suspiciousCorrections, ...afterHoursModifications];
  }

  protected async getUserActivitySummary(
    user_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    const summary = await this.sequelize.query(
      `
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT table_name) as tables_affected,
        COUNT(CASE WHEN operation = 'INSERT' THEN 1 END) as inserts,
        COUNT(CASE WHEN operation = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as deletes,
        MIN(created_at) as first_action,
        MAX(created_at) as last_action
      FROM ${this.db.tableName}
      WHERE changed_by_user = :user_id
      AND created_at BETWEEN :start_date AND :end_date
    `,
      {
        replacements: { user_id, start_date, end_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return summary[0];
  }

  protected async getTableModificationStats(
    table_name: string,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    const stats = await this.sequelize.query(
      `
      SELECT 
        operation,
        COUNT(*) as count,
        COUNT(DISTINCT changed_by_user) as unique_users,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
      FROM ${this.db.tableName}
      WHERE table_name = :table_name
      AND created_at BETWEEN :start_date AND :end_date
      GROUP BY operation
      ORDER BY count DESC
    `,
      {
        replacements: { table_name, start_date, end_date },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return stats;
  }

  // === GESTION RÉTENTION & PERFORMANCE ===

  protected async findOldLogs(retention_months: number = 36): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retention_months);

    return await this.findAll(this.db.tableName, {
      [this.db.created_at]: {
        [Op.lt]: cutoffDate,
      },
    });
  }

  protected async countLogsByPeriod(
    table_name: string,
    start_date: Date,
    end_date: Date,
  ): Promise<number> {
    return await this.count(this.db.tableName, {
      [this.db.table_name]: table_name,
      [this.db.created_at]: {
        [Op.between]: [start_date, end_date],
      },
    });
  }

  protected async findLogsForArchiving(cutoff_date: Date): Promise<any[]> {
    return await this.findAll(this.db.tableName, {
      [this.db.created_at]: {
        [Op.lt]: cutoff_date,
      },
    });
  }

  // === CRUD OPERATIONS ===

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(AUDIT_LOGS_ERRORS.GUID_GENERATION_FAILED);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.table_name]: this.table_name,
      [this.db.record]: this.record,
      [this.db.record_guid]: this.record_guid,
      [this.db.operation]: this.operation,
      [this.db.old_values]: this.old_values,
      [this.db.new_values]: this.new_values,
      [this.db.changed_by_user]: this.changed_by_user,
      [this.db.changed_by_type]: this.changed_by_type,
      [this.db.change_reason]: this.change_reason,
      [this.db.ip_address]: this.ip_address,
      [this.db.user_agent]: this.user_agent,
    });

    if (!lastID) {
      throw new Error(AUDIT_LOGS_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const defaultConditions = {
      ...conditions,
      order: [[this.db.created_at, 'DESC']],
    };
    return await this.findAll(this.db.tableName, defaultConditions, paginationOptions);
  }

  // === MÉTHODES INTERDITES (IMMUTABILITÉ) ===

  // protected async update(): Promise<void> {
  //   throw new Error(AUDIT_LOGS_ERRORS.UPDATE_FORBIDDEN);
  // }

  // protected async trash(id: number): Promise<boolean> {
  //   throw new Error(AUDIT_LOGS_ERRORS.DELETE_FORBIDDEN);
  // }

  // === VALIDATION ===

  private async validate(): Promise<void> {
    if (!this.table_name) {
      throw new Error(AUDIT_LOGS_ERRORS.TABLE_NAME_REQUIRED);
    }
    if (!AuditLogsValidationUtils.validateTableName(this.table_name)) {
      throw new Error(AUDIT_LOGS_ERRORS.TABLE_NAME_INVALID);
    }

    if (!this.record) {
      throw new Error(AUDIT_LOGS_ERRORS.RECORD_REQUIRED);
    }
    if (!AuditLogsValidationUtils.validateRecord(this.record)) {
      throw new Error(AUDIT_LOGS_ERRORS.RECORD_INVALID);
    }

    if (!this.operation) {
      throw new Error(AUDIT_LOGS_ERRORS.OPERATION_REQUIRED);
    }
    if (!AuditLogsValidationUtils.validateOperation(this.operation)) {
      throw new Error(AUDIT_LOGS_ERRORS.OPERATION_INVALID);
    }

    if (!this.old_values && !this.new_values) {
      throw new Error(AUDIT_LOGS_ERRORS.VALUES_REQUIRED_FOR_OPERATION);
    }

    if (
      this.changed_by_type &&
      !AuditLogsValidationUtils.validateChangedByType(this.changed_by_type)
    ) {
      throw new Error(AUDIT_LOGS_ERRORS.CHANGED_BY_TYPE_INVALID);
    }

    if (this.ip_address && !AuditLogsValidationUtils.validateIpAddress(this.ip_address)) {
      throw new Error(AUDIT_LOGS_ERRORS.IP_ADDRESS_INVALID);
    }

    const cleaned = AuditLogsValidationUtils.cleanAuditLogData(this);
    Object.assign(this, cleaned);
  }
}
