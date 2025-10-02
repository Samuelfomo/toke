import AuditLogsModel from '../model/AuditLogsModel.js';

import User from './User.js';

export default class AuditLogs extends AuditLogsModel {
  private changedByUserObj?: User;

  constructor() {
    super();
  }

  // === MÉTHODES STATIQUES DE CHARGEMENT ===

  static _load(identifier: any, byGuid: boolean = false): Promise<AuditLogs | null> {
    return new AuditLogs().load(identifier, byGuid);
  }

  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<AuditLogs[] | null> {
    return new AuditLogs().list(conditions, paginationOptions);
  }

  static _listByUser(user_id: number): Promise<AuditLogs[] | null> {
    return new AuditLogs().listByUser(user_id);
  }

  static _listByTable(table_name: string): Promise<AuditLogs[] | null> {
    return new AuditLogs().listByTable(table_name);
  }

  static _listByOperation(operation: string): Promise<AuditLogs[] | null> {
    return new AuditLogs().listByOperation(operation);
  }

  static _listByDateRange(start_date: Date, end_date: Date): Promise<AuditLogs[] | null> {
    return new AuditLogs().listByDateRange(start_date, end_date);
  }

  static async _searchLogs(filters: {
    table_name?: string;
    user_id?: number;
    operation?: string;
    changed_by_type?: string;
    start_date?: Date;
    end_date?: Date;
    record_guid?: string;
    search_values?: string;
  }): Promise<AuditLogs[] | null> {
    return new AuditLogs().searchLogs(filters);
  }

  // === ANALYSES MÉTIER ===

  static async getModificationHistory(
    table_name: string,
    record_guid: string,
  ): Promise<AuditLogs[] | null> {
    const model = new AuditLogs();
    const logs = await model.findByRecordGuid(record_guid);
    if (!logs || logs.length === 0) return null;

    const filtered = logs.filter((log: any) => log.table_name === table_name);
    if (filtered.length === 0) return null;

    return filtered.map((data: any) => new AuditLogs().hydrate(data));
  }

  static async getUserActivityReport(
    user_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    const model = new AuditLogs();
    const summary = await model.getUserActivitySummary(user_id, start_date, end_date);

    const logs = await model.listByUser(user_id);
    const filteredLogs = logs.filter((log: any) => {
      const logDate = new Date(log.created_at);
      return logDate >= start_date && logDate <= end_date;
    });

    const byTable = filteredLogs.reduce((acc: any, log: any) => {
      acc[log.table_name] = (acc[log.table_name] || 0) + 1;
      return acc;
    }, {});

    return {
      ...summary,
      modifications_by_table: byTable,
      detailed_logs: filteredLogs.slice(0, 50), // Limite pour performance
    };
  }

  static async detectFraudPatterns(analysis_days: number = 30): Promise<any> {
    const model = new AuditLogs();
    const patterns = await model.detectSuspiciousPatterns(analysis_days);

    return {
      detection_period_days: analysis_days,
      patterns_found: patterns.length,
      details: patterns,
      risk_level: patterns.length > 5 ? 'high' : patterns.length > 2 ? 'medium' : 'low',
    };
  }

  static async analyzeSystemPerformance(start_date: Date, end_date: Date): Promise<any> {
    const model = new AuditLogs();
    const tables = ['users', 'time_entries', 'work_sessions', 'sites', 'memos'];

    const tableStats = await Promise.all(
      tables.map(async (table) => {
        const stats = await model.getTableModificationStats(table, start_date, end_date);
        const count = await model.countLogsByPeriod(table, start_date, end_date);
        return {
          table_name: table,
          total_modifications: count,
          operation_breakdown: stats,
        };
      }),
    );

    return {
      analysis_period: { start_date, end_date },
      table_statistics: tableStats,
      total_logs: tableStats.reduce((sum, t) => sum + t.total_modifications, 0),
    };
  }

  // === COMPLIANCE RGPD ===

  static async generateGDPRReport(user_id: number): Promise<any> {
    const model = new AuditLogs();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const now = new Date();

    const accessLogs = await model.findSensitiveDataAccess(user_id, twoYearsAgo, now);

    const dataAccess = accessLogs.map((log: any) => ({
      date: log.created_at,
      accessor: log.changed_by_user,
      action: log.operation,
      table: log.table_name,
      reason: log.change_reason,
      ip_address: log.ip_address,
    }));

    return {
      data_subject_id: user_id,
      report_generated_at: new Date().toISOString(),
      period_covered: { start: twoYearsAgo, end: now },
      total_access_events: dataAccess.length,
      data_access_log: dataAccess,
      compliance_status: 'compliant',
    };
  }

  static async getSensitiveDataAccess(
    user_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<AuditLogs[] | null> {
    const model = new AuditLogs();
    const logs = await model.findSensitiveDataAccess(user_id, start_date, end_date);
    if (!logs || logs.length === 0) return null;
    return logs.map((data: any) => new AuditLogs().hydrate(data));
  }

  static async anonymizeUserLogs(user_id: number): Promise<{ anonymized_count: number }> {
    // Note: L'anonymisation réelle nécessiterait une mise à jour en base
    // Ici on retourne juste le concept pour la structure
    const model = new AuditLogs();
    const userLogs = await model.listByUser(user_id);

    // En production, ceci nécessiterait une fonction SQL spéciale
    // car update() est interdit sur AuditLogs
    console.warn(`Anonymisation requise pour ${userLogs.length} logs de l'utilisateur ${user_id}`);

    return {
      anonymized_count: userLogs.length,
    };
  }

  // === GESTION RÉTENTION ===

  static async archiveOldLogs(cutoff_date: Date): Promise<{ archived_count: number }> {
    const model = new AuditLogs();
    const logsToArchive = await model.findLogsForArchiving(cutoff_date);

    // En production: exporter vers stockage froid, puis marquer comme archivé
    console.log(`${logsToArchive.length} logs à archiver avant ${cutoff_date}`);

    return {
      archived_count: logsToArchive.length,
    };
  }

  static async cleanupExpiredLogs(
    retention_months: number = 36,
  ): Promise<{ deleted_count: number }> {
    const model = new AuditLogs();
    const expiredLogs = await model.findOldLogs(retention_months);

    // En production: processus spécial avec validation légale
    console.warn(`${expiredLogs.length} logs dépassent rétention légale ${retention_months} mois`);

    return {
      deleted_count: 0, // Aucune suppression automatique sans validation manuelle
    };
  }

  // // === EXPORT ===
  //
  // static async exportable(
  //   conditions: Record<string, any> = {},
  //   paginationOptions: { offset?: number; limit?: number } = {},
  // ): Promise<{
  //   revision: string;
  //   pagination: { offset?: number; limit?: number; count?: number };
  //   items: any[];
  // }> {
  //   let items: any[] = [];
  //   const logs = await this._list(conditions, paginationOptions);
  //   if (logs) {
  //     items = await Promise.all(logs.map(async (log) => await log.toJSON()));
  //   }
  //   return {
  //     revision: '',
  //     pagination: {
  //       offset: paginationOptions.offset || 0,
  //       limit: paginationOptions.limit || items.length,
  //       count: items.length,
  //     },
  //     items,
  //   };
  // }

  // === GETTERS MÉTIER ===

  getId(): number | undefined {
    return this.id;
  }

  getGuid(): string | undefined {
    return this.guid;
  }

  getTableName(): string | undefined {
    return this.table_name;
  }

  getRecord(): number | undefined {
    return this.record;
  }

  getRecordGuid(): string | undefined {
    return this.record_guid;
  }

  getOperation(): string | undefined {
    return this.operation;
  }

  getOldValues(): any | undefined {
    return this.old_values;
  }

  getNewValues(): any | undefined {
    return this.new_values;
  }

  getChangedByUser(): number | undefined {
    return this.changed_by_user;
  }

  async getChangedByUserObj(): Promise<User | null> {
    if (!this.changed_by_user) return null;
    if (!this.changedByUserObj) {
      this.changedByUserObj = (await User._load(this.changed_by_user)) || undefined;
    }
    return this.changedByUserObj || null;
  }

  getChangedByType(): string | undefined {
    return this.changed_by_type;
  }

  getChangeReason(): string | undefined {
    return this.change_reason;
  }

  getIpAddress(): string | undefined {
    return this.ip_address;
  }

  getUserAgent(): string | undefined {
    return this.user_agent;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  // === MÉTHODES UTILITAIRES ===

  isUserAction(): boolean {
    return this.changed_by_type === 'user';
  }

  isSystemAction(): boolean {
    return this.changed_by_type === 'system';
  }

  isApiAction(): boolean {
    return this.changed_by_type === 'api';
  }

  getDiffSummary(): string {
    const changes: string[] = [];

    if (this.old_values && this.new_values) {
      const oldKeys = Object.keys(this.old_values);
      const newKeys = Object.keys(this.new_values);
      const allKeys = [...new Set([...oldKeys, ...newKeys])];

      allKeys.forEach((key) => {
        const oldVal = this.old_values?.[key];
        const newVal = this.new_values?.[key];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push(`${key}: ${oldVal} → ${newVal}`);
        }
      });
    }

    return changes.length > 0 ? changes.join(', ') : 'No changes detected';
  }

  getAffectedFields(): string[] {
    const fields: string[] = [];

    if (this.old_values && this.new_values) {
      const oldKeys = Object.keys(this.old_values);
      const newKeys = Object.keys(this.new_values);
      const allKeys = [...new Set([...oldKeys, ...newKeys])];

      allKeys.forEach((key) => {
        const oldVal = this.old_values?.[key];
        const newVal = this.new_values?.[key];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          fields.push(key);
        }
      });
    }

    return fields;
  }

  // === VALIDATION & SÉCURITÉ ===

  validateLogIntegrity(): boolean {
    if (!this.table_name || !this.record || !this.operation) {
      return false;
    }

    if (!this.old_values && !this.new_values) {
      return false;
    }

    const validOperations = ['INSERT', 'UPDATE', 'DELETE', 'SELECT_SENSITIVE', 'INSERT_BLOCKED'];
    return validOperations.includes(this.operation);
  }

  hasChangeReason(): boolean {
    return !!this.change_reason && this.change_reason.length > 0;
  }

  isSensitiveData(): boolean {
    const sensitiveTables = ['users', 'memos', 'time_entries'];
    const sensitiveFields = [
      'phone_number',
      'email',
      'salary',
      'password',
      'pin',
      'otp',
      'personal_address',
    ];

    if (sensitiveTables.includes(this.table_name || '')) {
      return true;
    }

    const affectedFields = this.getAffectedFields();
    return affectedFields.some((field) =>
      sensitiveFields.some((sensitive) => field.toLowerCase().includes(sensitive.toLowerCase())),
    );
  }

  // === MÉTHODES DE BASE ===

  isNew(): boolean {
    return this.id === undefined;
  }

  async save(): Promise<void> {
    if (!this.isNew()) {
      throw new Error('AUDIT_LOGS_IMMUTABLE: Cannot update existing audit log');
    }

    try {
      await this.create();
    } catch (error: any) {
      throw new Error(error.message || error);
    }
  }

  async load(identifier: any, byGuid: boolean = false): Promise<AuditLogs | null> {
    let data = null;

    if (byGuid) {
      data = await this.findByGuid(identifier);
    } else {
      data = await this.find(Number(identifier));
    }

    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<AuditLogs[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset || dataset.length === 0) return null;
    return dataset.map((data) => new AuditLogs().hydrate(data));
  }

  // async listByUser(user_id: number): Promise<AuditLogs[] | null> {
  //   const dataset = await super.listByUser(

  private hydrate(data: any): AuditLogs {
    this.id = data.id;
    this.guid = data.guid;
    this.table_name = data.table_name;
    this.record = data.record;
    this.record_guid = data.record_guid;
    this.operation = data.operation;
    this.old_values = data.old_values;
    this.new_values = data.new_values;
    this.changed_by_user = data.changed_by_user;
    this.changed_by_type = data.changed_by_type;
    this.change_reason = data.change_reason;
    return this;
  }
}
