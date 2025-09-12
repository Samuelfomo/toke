import { Op } from 'sequelize';

// import { FraudDetection, RiskLevel } from '@toke/shared';
import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { FraudDetection, FraudDetectionLogDbStructure, RiskLevel } from '../database/data/fraud.detection.log.db.js';

export default class FraudDetectionLogModel extends BaseModel {
  public readonly db = {
    tableName: tableName.FRAUD_DETECTION_LOG,
    id: 'id',
    tenant: 'tenant',
    detection_type: 'detection_type',
    employee_licenses_affected: 'employee_licenses_affected',
    detection_criteria: 'detection_criteria',
    risk_level: 'risk_level',
    action_taken: 'action_taken',
    notes: 'notes',
    resolved_at: 'resolved_at',
    resolved_by: 'resolved_by',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected tenant?: number;
  protected detection_type?: FraudDetection;
  protected employee_licenses_affected?: string[];
  protected detection_criteria?: any;
  protected risk_level?: RiskLevel;
  protected action_taken?: string;
  protected notes?: string;
  protected resolved_at?: Date;
  protected resolved_by?: number;
  protected created_at?: Date;
  protected updated_at?: Date;

  protected constructor() {
    super();
  }

  /**
   * Trouve un enregistrement par son ID
   */
  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Liste toutes les alertes selon les conditions
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
    // orderBy: { field: string; direction: 'ASC' | 'DESC' }[] = [
    //   { field: this.db.created_at, direction: 'DESC' }
    // ]
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      conditions, paginationOptions,
      // orderBy
    );
  }

  /**
   * Récupère toutes les alertes par tenant
   */
  protected async listAllByTenant(
    tenant: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.tenant]: tenant },
      paginationOptions,
    );
  }

  /**
   * Récupère toutes les alertes par type de détection
   */
  protected async listAllByDetectionType(
    detection_type: FraudDetection,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.detection_type]: detection_type },
      paginationOptions,
    );
  }

  /**
   * Récupère toutes les alertes par niveau de risque
   */
  protected async listAllByRiskLevel(
    risk_level: RiskLevel,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.risk_level]: risk_level },
      paginationOptions,
    );
  }

  /**
   * Récupère toutes les alertes non résolues
   */
  protected async listAllUnresolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions: Record<string, any> = {
      [this.db.resolved_at]: null
    };

    if (tenant) {
      conditions[this.db.tenant] = tenant;
    }

    return await this.listAll(conditions, paginationOptions);
  }

  /**
   * Récupère toutes les alertes résolues
   */
  protected async listAllResolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions: Record<string, any> = {
      [this.db.resolved_at]: { [Op.not]: null }
    };

    if (tenant) {
      conditions[this.db.tenant] = tenant;
    }

    return await this.listAll(conditions, paginationOptions);
  }

  /**
   * Récupère les alertes critiques non résolues
   */
  protected async listAllCriticalUnresolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions: Record<string, any> = {
      [this.db.risk_level]: RiskLevel.CRITICAL,
      [this.db.resolved_at]: null
    };

    if (tenant) {
      conditions[this.db.tenant] = tenant;
    }

    return await this.listAll(conditions, paginationOptions);
  }

  /**
   * Récupère les alertes dans une période
   */
  protected async listAllBetweenDates(
    startDate: Date,
    endDate: Date,
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const conditions: Record<string, any> = {
      [this.db.created_at]: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (tenant) {
      conditions[this.db.tenant] = tenant;
    }

    return await this.listAll(conditions, paginationOptions);
  }

  /**
   * Recherche les alertes concernant un employé spécifique
   */
  protected async listAllByEmployee(
    employeeId: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.employee_licenses_affected]: {
          [Op.contains]: [employeeId]
        }
      },
      paginationOptions,
      // [{ field: this.db.created_at, direction: 'DESC' }]
    );
  }

  /**
   * Compte les alertes par statut pour un tenant
   */
  protected async getAlertCountsByStatus(tenant: number): Promise<{
    total: number;
    unresolved: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const allAlerts = await this.listAllByTenant(tenant);

    const counts = {
      total: allAlerts.length,
      unresolved: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    allAlerts.forEach((alert: any) => {
      // Statut résolution
      if (alert[this.db.resolved_at]) {
        counts.resolved++;
      } else {
        counts.unresolved++;
      }

      // Niveau de risque
      switch (alert[this.db.risk_level]) {
        case RiskLevel.CRITICAL:
          counts.critical++;
          break;
        case RiskLevel.HIGH:
          counts.high++;
          break;
        case RiskLevel.MEDIUM:
          counts.medium++;
          break;
        case RiskLevel.LOW:
          counts.low++;
          break;
      }
    });

    return counts;
  }

  /**
   * Met à jour une action prise sur une alerte
   */
  protected async updateActionTaken(id: number, action_taken: string): Promise<boolean> {
    const updateData = {
      [this.db.action_taken]: action_taken
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Ajoute des notes à une alerte
   */
  protected async updateNotes(id: number, notes: string): Promise<boolean> {
    const updateData = {
      [this.db.notes]: notes
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Marque une alerte comme résolue
   */
  protected async resolveAlert(
    id: number,
    resolved_by: number,
    action_taken?: string
  ): Promise<boolean> {
    const updateData: Record<string, any> = {
      [this.db.resolved_at]: new Date(),
      [this.db.resolved_by]: resolved_by
    };

    if (action_taken) {
      updateData[this.db.action_taken] = action_taken;
    }

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Rouvre une alerte précédemment résolue
   */
  protected async reopenAlert(id: number): Promise<boolean> {
    const updateData = {
      [this.db.resolved_at]: null,
      [this.db.resolved_by]: null
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Met à jour plusieurs champs administratifs d'une alerte
   */
  protected async updateAdministrativeFields(
    id: number,
    fields: {
      action_taken?: string;
      notes?: string;
      resolved_by?: number;
      resolved_at?: Date;
    }
  ): Promise<boolean> {
    const updateData: Record<string, any> = {};

    if (fields.action_taken !== undefined) {
      updateData[this.db.action_taken] = fields.action_taken;
    }
    if (fields.notes !== undefined) {
      updateData[this.db.notes] = fields.notes;
    }
    if (fields.resolved_by !== undefined) {
      updateData[this.db.resolved_by] = fields.resolved_by;
    }
    if (fields.resolved_at !== undefined) {
      updateData[this.db.resolved_at] = fields.resolved_at;
    }

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Met à jour une alerte existante (champs administratifs uniquement)
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Fraud Detection Log ID is required for update');
    }

    const updateData: Record<string, any> = {};

    // Seuls les champs administratifs peuvent être mis à jour
    if (this.action_taken !== undefined) updateData[this.db.action_taken] = this.action_taken;
    if (this.notes !== undefined) updateData[this.db.notes] = this.notes;
    if (this.resolved_at !== undefined) updateData[this.db.resolved_at] = this.resolved_at;
    if (this.resolved_by !== undefined) updateData[this.db.resolved_by] = this.resolved_by;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update fraud detection log entry');
    }
  }

  /**
   * IMPORTANT: Pas de méthode create() - Les INSERT sont gérés uniquement par PostgreSQL
   * Cette méthode lèvera toujours une exception pour respecter l'architecture
   */
  protected async create(): Promise<void> {
    throw new Error(
      'ARCHITECTURE VIOLATION: INSERT dans fraud_detection_log est réservé à PostgreSQL. ' +
      'Les alertes sont générées automatiquement par les triggers PostgreSQL.'
    );
  }

  /**
   * Supprime une alerte (usage administrateur uniquement)
   */
  protected async trash(id: number): Promise<boolean> {
    // Log de sécurité - suppression d'alerte est sensible
    console.warn(`⚠️ SUPPRESSION ALERTE FRAUDE: ID ${id} - Action administrative`);
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Vérifie si l'alerte est résolue
   */
  protected isResolved(): boolean {
    return this.resolved_at !== null && this.resolved_at !== undefined;
  }

  /**
   * Vérifie si l'alerte est critique
   */
  protected isCritical(): boolean {
    return this.risk_level === RiskLevel.CRITICAL;
  }

  /**
   * Calcule l'âge de l'alerte en heures
   */
  protected getAgeInHours(): number {
    if (!this.created_at) return 0;
    const now = new Date();
    const created = new Date(this.created_at);
    const diffTime = now.getTime() - created.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60));
  }

  /**
   * Obtient le nombre d'employés affectés
   */
  protected getAffectedEmployeeCount(): number {
    return this.employee_licenses_affected?.length || 0;
  }

  /**
   * Valide les données avant mise à jour
   */
  private async validate(): Promise<void> {
    try {
      // Nettoyer les données
      FraudDetectionLogDbStructure.validation.cleanData(this);

      // Validation globale du modèle
      const validation = FraudDetectionLogDbStructure.validation.validateFraudDetectionModel(this);

      if (!validation.isValid) {
        throw new Error(`Validation errors: ${validation.errors.join(', ')}`);
      }

      // Validations spécifiques des champs modifiables
      if (this.action_taken !== undefined &&
        !FraudDetectionLogDbStructure.validation.validateActionTaken(this.action_taken)) {
        throw new Error('Invalid action_taken format or length');
      }

      if (this.notes !== undefined &&
        !FraudDetectionLogDbStructure.validation.validateNotes(this.notes)) {
        throw new Error('Invalid notes format or length');
      }

      if (this.resolved_by !== undefined &&
        !FraudDetectionLogDbStructure.validation.validateResolvedBy(this.resolved_by)) {
        throw new Error('Invalid resolved_by format');
      }

      if (this.resolved_at !== undefined &&
        !FraudDetectionLogDbStructure.validation.validateResolvedAt(this.resolved_at)) {
        throw new Error('Invalid resolved_at date');
      }

      // Validation de cohérence résolution
      if (!FraudDetectionLogDbStructure.validation.validateResolutionConsistency(
        this.resolved_at || null,
        this.resolved_by || null,
        this.action_taken || null
      )) {
        throw new Error('Resolution fields are inconsistent');
      }

    } catch (error: any) {
      console.error('⚠️ Erreur validation fraud detection log:', error.message);
      throw error;
    }
  }
}