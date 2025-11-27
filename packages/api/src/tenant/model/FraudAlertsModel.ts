// src/api/model/FraudAlertsModel.ts

import { FRAUD_ALERTS_ERRORS, FraudAlertsValidationUtils } from '@toke/shared';
import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

export default class FraudAlertsModel extends BaseModel {
  public readonly db = {
    tableName: tableName.FRAUD_ALERTS,
    id: 'id',
    guid: 'guid',
    user: 'user',
    time_entry: 'time_entry',
    alert_type: 'alert_type',
    alert_severity: 'alert_severity',
    alert_description: 'alert_description',
    alert_data: 'alert_data',
    investigated: 'investigated',
    investigation_notes: 'investigation_notes',
    false_positive: 'false_positive',
    investigated_at: 'investigated_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected guid?: string;
  protected user?: number;
  protected time_entry?: number;
  protected alert_type?: string;
  protected alert_severity?: string;
  protected alert_description?: string;
  protected alert_data?: any;
  protected investigated?: boolean;
  protected investigation_notes?: string;
  protected false_positive?: boolean;
  protected investigated_at?: Date;
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

  protected async listAllByUser(
    user: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, { [this.db.user]: user }, paginationOptions);
  }

  protected async listAllByTimeEntry(
    time_entry: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      { [this.db.time_entry]: time_entry },
      paginationOptions,
    );
  }

  // === RECHERCHES PAR CRITÈRES ===

  protected async listAllByType(
    alert_type: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      { [this.db.alert_type]: alert_type },
      paginationOptions,
    );
  }

  protected async listAllBySeverity(
    alert_severity: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      { [this.db.alert_severity]: alert_severity },
      paginationOptions,
    );
  }

  protected async listAllPending(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.investigated]: false,
        [this.db.false_positive]: false,
      },
      paginationOptions,
    );
  }

  protected async listAllInvestigated(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.investigated]: true,
      },
      paginationOptions,
    );
  }

  protected async listAllFalsePositives(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.false_positive]: true,
      },
      paginationOptions,
    );
  }

  // === STATISTIQUES & ANALYSES ===

  protected async countAlertsByUser(
    user: number,
    start_date?: Date,
    end_date?: Date,
  ): Promise<number> {
    const conditions: any = { [this.db.user]: user };

    if (start_date && end_date) {
      conditions[this.db.created_at] = {
        [Op.between]: [start_date, end_date],
      };
    }

    return await this.count(this.db.tableName, conditions);
  }

  protected async countAlertsByType(alert_type: string): Promise<number> {
    return await this.count(this.db.tableName, {
      [this.db.alert_type]: alert_type,
    });
  }

  protected async getAlertStatistics(
    start_date?: Date,
    end_date?: Date,
  ): Promise<{
    total_alerts: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    pending_count: number;
    investigated_count: number;
    false_positive_count: number;
  }> {
    const conditions: any = {};

    if (start_date && end_date) {
      conditions[this.db.created_at] = {
        [Op.between]: [start_date, end_date],
      };
    }

    const [totalAlerts, bySeverity, byType, pendingCount, investigatedCount, falsePositiveCount] =
      await Promise.all([
        this.count(this.db.tableName, conditions),
        this.countByGroup(this.db.tableName, this.db.alert_severity, conditions),
        this.countByGroup(this.db.tableName, this.db.alert_type, conditions),
        this.count(this.db.tableName, {
          ...conditions,
          [this.db.investigated]: false,
          [this.db.false_positive]: false,
        }),
        this.count(this.db.tableName, {
          ...conditions,
          [this.db.investigated]: true,
        }),
        this.count(this.db.tableName, {
          ...conditions,
          [this.db.false_positive]: true,
        }),
      ]);

    return {
      total_alerts: totalAlerts,
      by_severity: bySeverity,
      by_type: byType,
      pending_count: pendingCount,
      investigated_count: investigatedCount,
      false_positive_count: falsePositiveCount,
    };
  }

  // === DÉTECTION PATTERNS SUSPECTS ===

  /**
   * ✅ CORRECTION : Utilisation ORM Sequelize uniquement
   * Trouve les utilisateurs suspects avec beaucoup d'alertes
   */
  protected async findSuspiciousUsers(
    min_alerts: number = 5,
    days: number = 30,
  ): Promise<
    Array<{
      user_id: number;
      alert_count: number;
      high_severity_count: number;
      critical_count: number;
    }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 1. Récupérer toutes les alertes non-false-positive depuis cutoffDate
    const alerts = await this.findAll(this.db.tableName, {
      [this.db.created_at]: {
        [Op.gte]: cutoffDate,
      },
      [this.db.false_positive]: false,
    });

    // 2. Grouper et compter manuellement
    const userStats = new Map<
      number,
      {
        user_id: number;
        alert_count: number;
        high_severity_count: number;
        critical_count: number;
      }
    >();

    alerts.forEach((alert: any) => {
      const userId = alert.user;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user_id: userId,
          alert_count: 0,
          high_severity_count: 0,
          critical_count: 0,
        });
      }

      const stats = userStats.get(userId)!;
      stats.alert_count++;

      if (alert.alert_severity === 'high') {
        stats.high_severity_count++;
      } else if (alert.alert_severity === 'critical') {
        stats.critical_count++;
      }
    });

    // 3. Filtrer selon min_alerts et trier
    const result = Array.from(userStats.values())
      .filter((stat) => stat.alert_count >= min_alerts)
      .sort((a, b) => {
        // Tri par nombre d'alertes décroissant, puis par critiques
        if (a.alert_count !== b.alert_count) {
          return b.alert_count - a.alert_count;
        }
        return b.critical_count - a.critical_count;
      });

    return result;
  }

  /**
   * ✅ CORRECTION : Patterns récurrents via ORM Sequelize
   * Analyse les types d'alertes répétés pour un utilisateur
   */
  protected async findRepeatingPatterns(
    user: number,
    days: number = 30,
  ): Promise<
    Array<{
      alert_type: string;
      occurrence_count: number;
      avg_distance?: number;
      affected_sites: string[];
    }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 1. Récupérer toutes les alertes de l'utilisateur
    const alerts = await this.findAll(this.db.tableName, {
      [this.db.user]: user,
      [this.db.created_at]: {
        [Op.gte]: cutoffDate,
      },
      [this.db.false_positive]: false,
    });

    // 2. Grouper par type d'alerte
    const patterns = new Map<
      string,
      {
        alert_type: string;
        occurrence_count: number;
        distances: number[];
        sites: Set<string>;
      }
    >();

    alerts.forEach((alert: any) => {
      const type = alert.alert_type;

      if (!patterns.has(type)) {
        patterns.set(type, {
          alert_type: type,
          occurrence_count: 0,
          distances: [],
          sites: new Set<string>(),
        });
      }

      const pattern = patterns.get(type)!;
      pattern.occurrence_count++;

      // Extraire distance si disponible
      if (alert.alert_data?.distance_from_center) {
        pattern.distances.push(parseFloat(alert.alert_data.distance_from_center));
      }

      // Extraire site_id si disponible
      if (alert.alert_data?.site_id) {
        pattern.sites.add(String(alert.alert_data.site_id));
      }
    });

    // 3. Calculer moyennes et formater résultats
    const result = Array.from(patterns.values())
      .filter((p) => p.occurrence_count > 2) // Seulement patterns répétés >2 fois
      .map((p) => ({
        alert_type: p.alert_type,
        occurrence_count: p.occurrence_count,
        avg_distance:
          p.distances.length > 0
            ? p.distances.reduce((sum, d) => sum + d, 0) / p.distances.length
            : undefined,
        affected_sites: Array.from(p.sites),
      }))
      .sort((a, b) => b.occurrence_count - a.occurrence_count);

    return result;
  }

  // === TRAITEMENT INVESTIGATION ===

  protected async markAsInvestigated(
    alert_id: number,
    investigator_id: number,
    notes: string,
  ): Promise<boolean> {
    const updates = {
      [this.db.investigated]: true,
      [this.db.investigation_notes]: notes,
      [this.db.investigated_at]: new Date(),
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: alert_id,
    });

    return affectedRows > 0;
  }

  protected async markAsFalsePositive(
    alert_id: number,
    investigator_id: number,
    reason: string,
  ): Promise<boolean> {
    const updates = {
      [this.db.false_positive]: true,
      [this.db.investigated]: true,
      [this.db.investigation_notes]: `False positive: ${reason}`,
      [this.db.investigated_at]: new Date(),
    };

    const affectedRows = await this.updateOne(this.db.tableName, updates, {
      [this.db.id]: alert_id,
    });

    return affectedRows > 0;
  }

  // === ALERTES URGENTES ===

  protected async findCriticalAlerts(
    hours: number = 24,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.alert_severity]: 'critical',
        [this.db.investigated]: false,
        [this.db.created_at]: {
          [Op.gte]: cutoffDate,
        },
      },
      paginationOptions,
    );
  }

  protected async findHighSeverityPending(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.alert_severity]: {
          [Op.in]: ['high', 'critical'],
        },
        [this.db.investigated]: false,
        [this.db.false_positive]: false,
      },
      paginationOptions,
    );
  }

  // === CRUD OPERATIONS ===

  protected async create(): Promise<void> {
    await this.validate();

    const guid = await this.randomGuidGenerator(this.db.tableName);
    if (!guid) {
      throw new Error(FRAUD_ALERTS_ERRORS.GUID_GENERATION_FAILED);
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.user]: this.user,
      [this.db.time_entry]: this.time_entry,
      [this.db.alert_type]: this.alert_type,
      [this.db.alert_severity]: this.alert_severity || 'medium',
      [this.db.alert_description]: this.alert_description,
      [this.db.alert_data]: this.alert_data,
      [this.db.investigated]: this.investigated || false,
      [this.db.investigation_notes]: this.investigation_notes,
      [this.db.false_positive]: this.false_positive || false,
      [this.db.investigated_at]: this.investigated_at,
    });

    if (!lastID) {
      throw new Error(FRAUD_ALERTS_ERRORS.CREATION_FAILED);
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error(FRAUD_ALERTS_ERRORS.ID_REQUIRED);
    }

    const updateData: Record<string, any> = {};

    if (this.investigated !== undefined) updateData[this.db.investigated] = this.investigated;
    if (this.investigation_notes !== undefined)
      updateData[this.db.investigation_notes] = this.investigation_notes;
    if (this.false_positive !== undefined) updateData[this.db.false_positive] = this.false_positive;
    if (this.investigated_at !== undefined)
      updateData[this.db.investigated_at] = this.investigated_at;

    const updated = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });

    if (!updated) {
      throw new Error(FRAUD_ALERTS_ERRORS.UPDATE_FAILED);
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  // === VALIDATION ===

  private async validate(): Promise<void> {
    if (!this.user) {
      throw new Error(FRAUD_ALERTS_ERRORS.USER_REQUIRED);
    }
    if (!FraudAlertsValidationUtils.validateUser(this.user)) {
      throw new Error(FRAUD_ALERTS_ERRORS.USER_INVALID);
    }

    if (!this.time_entry) {
      throw new Error(FRAUD_ALERTS_ERRORS.TIME_ENTRY_REQUIRED);
    }
    if (!FraudAlertsValidationUtils.validateTimeEntry(this.time_entry)) {
      throw new Error(FRAUD_ALERTS_ERRORS.TIME_ENTRY_INVALID);
    }

    if (!this.alert_type) {
      throw new Error(FRAUD_ALERTS_ERRORS.ALERT_TYPE_REQUIRED);
    }
    if (!FraudAlertsValidationUtils.validateAlertType(this.alert_type)) {
      throw new Error(FRAUD_ALERTS_ERRORS.ALERT_TYPE_INVALID);
    }

    if (
      this.alert_severity &&
      !FraudAlertsValidationUtils.validateAlertSeverity(this.alert_severity)
    ) {
      throw new Error(FRAUD_ALERTS_ERRORS.ALERT_SEVERITY_INVALID);
    }

    if (!this.alert_description) {
      throw new Error(FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_REQUIRED);
    }
    if (!FraudAlertsValidationUtils.validateAlertDescription(this.alert_description)) {
      throw new Error(FRAUD_ALERTS_ERRORS.ALERT_DESCRIPTION_INVALID);
    }

    const cleaned = FraudAlertsValidationUtils.cleanFraudAlertData(this);
    Object.assign(this, cleaned);
  }
}
