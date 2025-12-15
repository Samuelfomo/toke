import { FraudDetection, RiskLevel, TimezoneConfigUtils } from '@toke/shared';

import FraudDetectionLogModel from '../model/FraudDetectionLogModel.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import Tenant from './Tenant.js';

export default class FraudDetectionLog extends FraudDetectionLogModel {
  private tenantObj?: Tenant;

  constructor() {
    super();
  }

  /**
   * Exports fraud detection alerts with revision information.
   */
  static async exportable(
    tenant?: number,
    filters: {
      risk_level?: RiskLevel;
      resolved?: boolean;
      detection_type?: FraudDetection;
    } = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    summary: {
      total: number;
      unresolved: number;
      resolved: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    items: any[];
  }> {
    const revision = await Revision.getRevision(tableName.FRAUD_DETECTION_LOG);
    let data: any[] = [];
    let summary = {
      total: 0,
      unresolved: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Construire les conditions de filtre
    const conditions: Record<string, any> = {};
    if (tenant) conditions.tenant = tenant;
    if (filters.risk_level) conditions.risk_level = filters.risk_level;
    if (filters.detection_type) conditions.detection_type = filters.detection_type;

    if (filters.resolved === true) {
      conditions.resolved_at = { [Symbol.for('not')]: null };
    } else if (filters.resolved === false) {
      conditions.resolved_at = null;
    }

    const allAlerts = await this._list(conditions, paginationOptions);
    if (allAlerts) {
      data = await Promise.all(allAlerts.map(async (alert) => await alert.toJSON()));

      // Calculer le summary si on a un tenant spécifique
      if (tenant) {
        summary = await this._getAlertSummary(tenant);
      }
    }

    return {
      revision,
      pagination: {
        offset: paginationOptions.offset || 0,
        limit: paginationOptions.limit || data.length,
        count: data.length,
      },
      summary,
      items: data,
    };
  }

  /**
   * Charge une alerte par ID ou GUID
   */
  static _load(identifier: any, byGuid: boolean = false): Promise<FraudDetectionLog | null> {
    return new FraudDetectionLog().load(identifier, byGuid);
  }

  /**
   * Liste les alertes selon conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().list(conditions, paginationOptions);
  }

  /**
   * Liste les alertes par tenant
   */
  static _listByTenant(
    tenant: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().listByTenant(tenant, paginationOptions);
  }

  /**
   * Liste les alertes par type de détection
   */
  static _listByDetectionType(
    detection_type: FraudDetection,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().listByDetectionType(detection_type, paginationOptions);
  }

  /**
   * Liste les alertes par niveau de risque
   */
  static _listByRiskLevel(
    risk_level: RiskLevel,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().listByRiskLevel(risk_level, paginationOptions);
  }

  /**
   * Liste les alertes non résolues
   */
  static _listUnresolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().listUnresolved(tenant, paginationOptions);
  }

  /**
   * Liste les alertes critiques non résolues
   */
  static _listCriticalUnresolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().listCriticalUnresolved(tenant, paginationOptions);
  }

  /**
   * Liste les alertes concernant un employé
   */
  static _listByEmployee(
    employeeId: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    return new FraudDetectionLog().listByEmployee(employeeId, paginationOptions);
  }

  /**
   * Récupère les statistiques d'alertes pour un tenant
   */
  static async _getAlertSummary(tenant: number): Promise<{
    total: number;
    unresolved: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    return new FraudDetectionLog().getAlertSummary(tenant);
  }

  /**
   * Convertit des données en objet FraudDetectionLog
   */
  static _toObject(data: any): FraudDetectionLog {
    return new FraudDetectionLog().hydrate(data);
  }

  /**
   * Résout une alerte par ID
   */
  static async _resolveAlert(
    id: number,
    resolved_by: number,
    action_taken?: string,
  ): Promise<boolean> {
    return new FraudDetectionLog().resolveAlertById(id, resolved_by, action_taken);
  }

  /**
   * Ajoute une action à une alerte
   */
  static async _updateAction(id: number, action_taken: string): Promise<boolean> {
    return new FraudDetectionLog().updateActionById(id, action_taken);
  }

  /**
   * Ajoute des notes à une alerte
   */
  static async _updateNotes(id: number, notes: string): Promise<boolean> {
    return new FraudDetectionLog().updateNotesById(id, notes);
  }

  // === SETTERS FLUENT (uniquement pour champs administratifs) ===
  setActionTaken(action_taken: string): FraudDetectionLog {
    this.action_taken = action_taken;
    return this;
  }

  setNotes(notes: string): FraudDetectionLog {
    this.notes = notes;
    return this;
  }

  setResolvedAt(resolved_at: Date): FraudDetectionLog {
    this.resolved_at = resolved_at;
    return this;
  }

  setResolvedBy(resolved_by: number): FraudDetectionLog {
    this.resolved_by = resolved_by;
    return this;
  }

  // === GETTERS ===
  getId(): number | undefined {
    return this.id;
  }

  getTenant(): number | undefined {
    return this.tenant;
  }

  async getTenantObj(): Promise<Tenant | null> {
    if (!this.tenant) return null;
    if (!this.tenantObj) {
      this.tenantObj = (await Tenant._load(this.tenant)) || undefined;
    }
    return this.tenantObj || null;
  }

  getDetectionType(): FraudDetection | undefined {
    return this.detection_type;
  }

  getEmployeeLicensesAffected(): string[] | undefined {
    return this.employee_licenses_affected;
  }

  getDetectionCriteria(): any {
    return this.detection_criteria;
  }

  getRiskLevel(): RiskLevel | undefined {
    return this.risk_level;
  }

  getActionTaken(): string | undefined {
    return this.action_taken;
  }

  getNotes(): string | undefined {
    return this.notes;
  }

  getResolvedAt(): Date | undefined {
    return this.resolved_at;
  }

  getResolvedBy(): number | undefined {
    return this.resolved_by;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  // === MÉTHODES MÉTIER ===

  /**
   * Vérifie si l'alerte est résolue
   */
  isResolved(): boolean {
    return super.isResolved();
  }

  /**
   * Vérifie si l'alerte est critique
   */
  isCritical(): boolean {
    return super.isCritical();
  }

  /**
   * Calcule l'âge de l'alerte en heures
   */
  getAgeInHours(): number {
    return super.getAgeInHours();
  }

  /**
   * Obtient le nombre d'employés affectés
   */
  getAffectedEmployeeCount(): number {
    return super.getAffectedEmployeeCount();
  }

  /**
   * Vérifie si l'alerte nécessite une attention urgente
   */
  requiresUrgentAttention(): boolean {
    return (this.isCritical() && !this.isResolved()) || this.getAgeInHours() > 24;
  }

  /**
   * Obtient la priorité d'affichage (1 = plus urgent)
   */
  getDisplayPriority(): number {
    if (this.isCritical() && !this.isResolved()) return 1;
    if (this.risk_level === RiskLevel.HIGH && !this.isResolved()) return 2;
    if (this.risk_level === RiskLevel.MEDIUM && !this.isResolved()) return 3;
    if (this.isResolved()) return 5;
    return 4;
  }

  /**
   * Format le message d'alerte pour affichage
   */
  getDisplayMessage(): string {
    const criteria = this.detection_criteria;
    if (!criteria) return 'Alerte de fraude détectée';

    switch (this.detection_type) {
      case FraudDetection.SUSPICIOUS_LEAVE_PATTERN:
        return `${criteria.long_leave_employees} employés en congé (${criteria.percentage_long_leave?.toFixed(1)}%) - Pattern suspect détecté`;

      case FraudDetection.EXCESSIVE_TECHNICAL_LEAVE:
        return `${criteria.technical_leave_employees} employés en congé technique (${criteria.percentage_technical?.toFixed(1)}%) - Seuil dépassé`;

      case FraudDetection.MASS_DEACTIVATION:
        return `${criteria.deactivations_24h} désactivations en 24h (${criteria.percentage_deactivated?.toFixed(1)}%) - Désactivation massive`;

      case FraudDetection.PRE_RENEWAL_MANIPULATION:
        return `${criteria.recent_leave_declarations} congés déclarés à ${criteria.days_until_renewal} jours du renouvellement`;

      case FraudDetection.UNUSUAL_ACTIVITY:
        return `Activité inhabituelle détectée - ${criteria.activity_type || 'Pattern non standard'}`;

      default:
        return 'Alerte de fraude détectée';
    }
  }

  /**
   * Résout cette alerte
   */
  async resolveThis(resolved_by: number, action_taken?: string): Promise<boolean> {
    if (!this.id) return false;
    const result = await this.resolveAlert(this.id, resolved_by, action_taken);
    if (result) {
      // Mettre à jour l'instance locale
      this.resolved_at = TimezoneConfigUtils.getCurrentTime();
      this.resolved_by = resolved_by;
      if (action_taken) {
        this.action_taken = action_taken;
      }
    }
    return result;
  }

  /**
   * Rouvre cette alerte
   */
  async reopenThis(): Promise<boolean> {
    if (!this.id) return false;
    const result = await this.reopenAlert(this.id);
    if (result) {
      // Mettre à jour l'instance locale
      this.resolved_at = undefined;
      this.resolved_by = undefined;
    }
    return result;
  }

  /**
   * Met à jour les notes de cette alerte
   */
  async updateNotesForThis(notes: string): Promise<boolean> {
    if (!this.id) return false;
    const result = await this.updateNotes(this.id, notes);
    if (result) {
      this.notes = notes;
    }
    return result;
  }

  /**
   * Met à jour l'action prise pour cette alerte
   */
  async updateActionForThis(action_taken: string): Promise<boolean> {
    if (!this.id) return false;
    const result = await this.updateActionTaken(this.id, action_taken);
    if (result) {
      this.action_taken = action_taken;
    }
    return result;
  }

  async load(identifier: any, byGuid: boolean = false): Promise<FraudDetectionLog | null> {
    let data;

    data = byGuid ? await this.findByGuid(identifier) : await this.find(Number(identifier));

    if (!data) return null;
    return this.hydrate(data);
  }

  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const tenant = await this.getTenantObj();
    const baseData = {
      [RS.DETECTION_TYPE]: this.detection_type,
      [RS.EMPLOYEE_LICENSES_AFFECTED]: this.employee_licenses_affected,
      [RS.RISK_LEVEL]: this.risk_level,
      [RS.ACTION_TAKEN]: this.action_taken,
      [RS.NOTES]: this.notes,
      [RS.RESOLVED_AT]: this.resolved_at,
      [RS.RESOLVED_BY]: this.resolved_by,
      [RS.CREATED_AT]: this.created_at,
    };
    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.TENANT]: tenant?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.TENANT]: tenant?.toJSON(),
    };
  }

  /**
   * Liste les alertes selon conditions
   */
  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  // Ajoutez ces méthodes à votre classe FraudDetectionLog

  // === MÉTHODES MANQUANTES DANS LA CLASSE FRAUDDETECTIONLOG ===

  /**
   * Implémentations des méthodes d'instance manquantes
   */

  /**
   * Liste les alertes par tenant
   */
  async listByTenant(
    tenant: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAllByTenant(tenant, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  /**
   * Liste les alertes par type de détection
   */
  async listByDetectionType(
    detection_type: FraudDetection,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAllByDetectionType(detection_type, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  /**
   * Liste les alertes par niveau de risque
   */
  async listByRiskLevel(
    risk_level: RiskLevel,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAllByRiskLevel(risk_level, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  /**
   * Liste les alertes non résolues
   */
  async listUnresolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAllUnresolved(tenant, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  /**
   * Liste les alertes critiques non résolues
   */
  async listCriticalUnresolved(
    tenant?: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAllCriticalUnresolved(tenant, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  /**
   * Liste les alertes concernant un employé
   */
  async listByEmployee(
    employeeId: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<FraudDetectionLog[] | null> {
    const dataset = await this.listAllByEmployee(employeeId, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new FraudDetectionLog().hydrate(data));
  }

  /**
   * Récupère les statistiques d'alertes pour un tenant
   */
  async getAlertSummary(tenant: number): Promise<{
    total: number;
    unresolved: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    return await this.getAlertCountsByStatus(tenant);
  }

  /**
   * Résout une alerte par ID
   */
  async resolveAlertById(id: number, resolved_by: number, action_taken?: string): Promise<boolean> {
    return await this.resolveAlert(id, resolved_by, action_taken);
  }

  /**
   * Met à jour l'action d'une alerte par ID
   */
  async updateActionById(id: number, action_taken: string): Promise<boolean> {
    return await this.updateActionTaken(id, action_taken);
  }

  /**
   * Met à jour les notes d'une alerte par ID
   */
  async updateNotesById(id: number, notes: string): Promise<boolean> {
    return await this.updateNotes(id, notes);
  }

  /**
   * Vérifie si l'alerte est nouvelle (pas encore sauvée)
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Sauvegarde l'alerte (mise à jour uniquement - pas de création)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        throw new Error(
          "ARCHITECTURE VIOLATION: La création d'alertes est réservée aux triggers PostgreSQL",
        );
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde alerte fraude:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime l'alerte (usage administrateur uniquement)
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      console.warn(`⚠️ SUPPRESSION ALERTE FRAUDE: ID ${this.id} - Action administrative`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Représentation string de l'objet
   */
  toString(): string {
    return `FraudDetectionLog { ${RS.ID}: ${this.id}, ${RS.DETECTION_TYPE}: "${this.detection_type}", ${RS.RISK_LEVEL}: "${this.risk_level}", resolved: ${this.isResolved()} }`;
  }

  /**
   * Vérifie si l'alerte nécessite une escalade
   */
  requiresEscalation(): boolean {
    // Escalade si critique et ancienne de plus de 2h, ou haute priorité et ancienne de plus de 8h
    if (this.isCritical() && !this.isResolved() && this.getAgeInHours() > 2) {
      return true;
    }
    return this.risk_level === RiskLevel.HIGH && !this.isResolved() && this.getAgeInHours() > 8;
  }

  /**
   * === MÉTHODES MÉTIER SUPPLÉMENTAIRES ===
   */

  /**
   * Obtient la couleur d'affichage selon le niveau de risque
   */
  getDisplayColor(): string {
    if (!this.isResolved()) {
      switch (this.risk_level) {
        case RiskLevel.CRITICAL:
          return '#dc2626'; // rouge
        case RiskLevel.HIGH:
          return '#ea580c'; // orange
        case RiskLevel.MEDIUM:
          return '#d97706'; // ambre
        case RiskLevel.LOW:
          return '#65a30d'; // vert foncé
        default:
          return '#6b7280'; // gris
      }
    }
    return '#22c55e'; // vert clair pour résolu
  }

  /**
   * Obtient l'icône d'affichage selon le type de détection
   */
  getDisplayIcon(): string {
    switch (this.detection_type) {
      case FraudDetection.SUSPICIOUS_LEAVE_PATTERN:
        return '🏖️';
      case FraudDetection.EXCESSIVE_TECHNICAL_LEAVE:
        return '🔧';
      case FraudDetection.MASS_DEACTIVATION:
        return '🚫';
      case FraudDetection.PRE_RENEWAL_MANIPULATION:
        return '📅';
      case FraudDetection.UNUSUAL_ACTIVITY:
        return '⚠️';
      default:
        return '🚨';
    }
  }

  /**
   * Format la date de création en format relatif
   */
  getRelativeCreatedDate(): string {
    if (!this.created_at) return 'Date inconnue';

    const now = TimezoneConfigUtils.getCurrentTime();
    const created = new Date(this.created_at);
    const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return "Il y a moins d'1 heure";
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

    return created.toLocaleDateString('fr-FR');
  }

  /**
   * Calcule le score de sévérité (pour tri/priorité)
   */
  getSeverityScore(): number {
    let score = 0;

    // Points par niveau de risque
    switch (this.risk_level) {
      case RiskLevel.CRITICAL:
        score += 100;
        break;
      case RiskLevel.HIGH:
        score += 75;
        break;
      case RiskLevel.MEDIUM:
        score += 50;
        break;
      case RiskLevel.LOW:
        score += 25;
        break;
    }

    // Points par âge (plus c'est ancien, plus c'est urgent)
    const ageHours = this.getAgeInHours();
    if (ageHours > 48) score += 50;
    else if (ageHours > 24) score += 30;
    else if (ageHours > 12) score += 15;
    else if (ageHours > 6) score += 5;

    // Points par nombre d'employés affectés
    const affected = this.getAffectedEmployeeCount();
    if (affected > 100) score += 30;
    else if (affected > 50) score += 20;
    else if (affected > 10) score += 10;
    else if (affected > 5) score += 5;

    // Malus si résolu
    if (this.isResolved()) score = Math.floor(score * 0.1);

    return score;
  }

  /**
   * Vérifie si l'alerte peut être résolue automatiquement
   */
  canAutoResolve(): boolean {
    // Seules certaines alertes de faible priorité peuvent être auto-résolues
    return this.risk_level === RiskLevel.LOW && this.getAgeInHours() > 72 && !this.isResolved();
  }

  /**
   * Génère un résumé exécutif de l'alerte
   */
  getExecutiveSummary(): string {
    const employeeCount = this.getAffectedEmployeeCount();
    const ageText = this.getRelativeCreatedDate().toLowerCase();
    const riskText = this.risk_level?.toLowerCase() || 'inconnu';

    return `Alerte ${riskText} détectée ${ageText} concernant ${employeeCount} employé${employeeCount > 1 ? 's' : ''} - ${this.getDisplayMessage()}`;
  }

  private hydrate(data: any): FraudDetectionLog {
    this.id = data.id;
    this.tenant = data.tenant;
    this.detection_type = data.detection_type;
    this.employee_licenses_affected = data.employee_licenses_affected;
    this.detection_criteria = data.detection_criteria;
    this.risk_level = data.risk_level;
    this.action_taken = data.action_taken;
    this.notes = data.notes;
    this.resolved_at = data.resolved_at;
    this.resolved_by = data.resolved_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
