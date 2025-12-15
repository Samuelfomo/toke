import { ActivityStatus, TimezoneConfigUtils } from '@toke/shared';

import ActivityMonitoringModel from '../model/ActivityMonitoringModel.js';
import {
  responseStructure as RS,
  responseValue,
  tableName,
  ViewMode,
} from '../../utils/response.model.js';
import Revision from '../../tools/revision.js';

import EmployeeLicense from './EmployeeLicense.js';

export default class ActivityMonitoring extends ActivityMonitoringModel {
  private employeeLicenseObj?: EmployeeLicense;

  constructor() {
    super();
  }

  /**
   * Exports activity monitoring data with revision information.
   */
  static async exportable(
    employee_license?: number,
    filters: {
      status?: ActivityStatus;
      monitoring_date?: Date;
      minAbsentDays?: number;
      maxPunchCount?: number;
    } = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<{
    revision: string;
    pagination: { offset?: number; limit?: number; count?: number };
    summary: {
      total: number;
      active: number;
      inactive: number;
      suspicious: number;
      lowActivity: number;
      longAbsent: number;
    };
    items: any[];
  }> {
    const revision = await Revision.getRevision(
      tableName.ACTIVITY_MONITORING || 'xa_activity_monitoring',
    );
    let data: any[] = [];
    let summary = {
      total: 0,
      active: 0,
      inactive: 0,
      suspicious: 0,
      lowActivity: 0,
      longAbsent: 0,
    };

    // Construire les conditions de filtre
    const conditions: Record<string, any> = {};
    if (employee_license) conditions.employee_license = employee_license;
    if (filters.status) conditions.status_at_date = filters.status;
    if (filters.monitoring_date) conditions.monitoring_date = filters.monitoring_date;
    if (filters.minAbsentDays) {
      conditions.consecutive_absent_days = { [Symbol.for('gte')]: filters.minAbsentDays };
    }
    if (filters.maxPunchCount) {
      conditions.punch_count_7_days = { [Symbol.for('lte')]: filters.maxPunchCount };
    }

    const allRecords = await this._list(conditions, paginationOptions);
    if (allRecords) {
      data = await Promise.all(allRecords.map(async (record) => await record.toJSON()));

      // Calculer le summary
      summary = await this._getActivitySummary(filters.monitoring_date);
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
   * Charge un enregistrement par ID
   */
  static _load(identifier: any): Promise<ActivityMonitoring | null> {
    return new ActivityMonitoring().load(identifier);
  }

  /**
   * Charge un enregistrement par employee_license et date
   */
  static _loadByEmployeeLicenseAndDate(
    employee_license: number,
    monitoring_date: Date,
  ): Promise<ActivityMonitoring | null> {
    return new ActivityMonitoring().loadByEmployeeLicenseAndDate(employee_license, monitoring_date);
  }

  /**
   * Liste les enregistrements selon conditions
   */
  static _list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().list(conditions, paginationOptions);
  }

  /**
   * Liste par employee_license
   */
  static _listByEmployeeLicense(
    employee_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listByEmployeeLicense(employee_license, paginationOptions);
  }

  /**
   * Liste par date de monitoring
   */
  static _listByMonitoringDate(
    monitoring_date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listByMonitoringDate(monitoring_date, paginationOptions);
  }

  /**
   * Liste par statut d'activité
   */
  static _listByActivityStatus(
    status: ActivityStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listByActivityStatus(status, paginationOptions);
  }

  /**
   * Liste les employés suspects
   */
  static _listSuspiciousEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listSuspiciousEmployees(paginationOptions);
  }

  /**
   * Liste les employés inactifs
   */
  static _listInactiveEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listInactiveEmployees(paginationOptions);
  }

  /**
   * Liste les employés actifs
   */
  static _listActiveEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listActiveEmployees(paginationOptions);
  }

  /**
   * Liste les employés avec faible activité
   */
  static _listLowActivity(
    maxPunchCount: number = 2,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listLowActivity(maxPunchCount, paginationOptions);
  }

  /**
   * Liste les employés avec absences prolongées
   */
  static _listLongAbsent(
    minAbsentDays: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listLongAbsent(minAbsentDays, paginationOptions);
  }

  /**
   * Liste les derniers enregistrements par employé
   */
  static _listLatestByEmployee(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listLatestByEmployee(paginationOptions);
  }

  /**
   * Liste dans une période
   */
  static _listBetweenDates(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    return new ActivityMonitoring().listBetweenDates(startDate, endDate, paginationOptions);
  }

  /**
   * Récupère les statistiques d'activité
   */
  static async _getActivitySummary(date?: Date): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspicious: number;
    lowActivity: number;
    longAbsent: number;
  }> {
    return new ActivityMonitoring().getActivitySummary(date);
  }

  /**
   * Récupère les statistiques de pointages
   */
  static async _getPunchStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    avgPunchCount7Days: number;
    avgPunchCount30Days: number;
    avgConsecutiveAbsentDays: number;
    totalEmployeesMonitored: number;
  }> {
    return new ActivityMonitoring().getPunchStatistics(startDate, endDate);
  }

  /**
   * Convertit des données en objet ActivityMonitoring
   */
  static _toObject(data: any): ActivityMonitoring {
    return new ActivityMonitoring().hydrate(data);
  }

  // === SETTERS FLUENT (usage très limité car données calculées automatiquement) ===
  setEmployeeLicense(employee_license: number): ActivityMonitoring {
    console.warn("⚠️ ATTENTION: Modification manuelle d'employee_license dans activity_monitoring");
    this.employee_license = employee_license;
    return this;
  }

  setMonitoringDate(monitoring_date: Date): ActivityMonitoring {
    console.warn('⚠️ ATTENTION: Modification manuelle de monitoring_date dans activity_monitoring');
    this.monitoring_date = monitoring_date;
    return this;
  }

  setStatusAtDate(status_at_date: ActivityStatus): ActivityMonitoring {
    this.status_at_date = status_at_date;
    return this;
  }

  // === GETTERS ===
  getId(): number | undefined {
    return this.id;
  }

  getEmployeeLicense(): number | undefined {
    return this.employee_license;
  }

  async getEmployeeLicenseObject(): Promise<EmployeeLicense | null> {
    if (!this.employee_license) return null;
    if (!this.employeeLicenseObj) {
      this.employeeLicenseObj = (await EmployeeLicense._load(this.employee_license)) || undefined;
    }
    return this.employeeLicenseObj || null;
  }

  getMonitoringDate(): Date | undefined {
    return this.monitoring_date;
  }

  getLastPunchDate(): Date | undefined {
    return this.last_punch_date;
  }

  getPunchCount7Days(): number | undefined {
    return this.punch_count_7_days;
  }

  getPunchCount30Days(): number | undefined {
    return this.punch_count_30_days;
  }

  getConsecutiveAbsentDays(): number | undefined {
    return this.consecutive_absent_days;
  }

  getStatusAtDate(): ActivityStatus | undefined {
    return this.status_at_date;
  }

  getCreatedAt(): Date | undefined {
    return this.created_at;
  }

  getUpdatedAt(): Date | undefined {
    return this.updated_at;
  }

  /**
   * Obtient l'identifiant sous forme de chaîne
   */
  getIdentifier(): string {
    return this.id?.toString() || 'Unknown';
  }

  // === MÉTHODES MÉTIER ===

  /**
   * Vérifie si l'employé est actif
   */
  isActive(): boolean {
    return super.isActive();
  }

  /**
   * Vérifie si l'employé est suspect
   */
  isSuspicious(): boolean {
    return super.isSuspicious();
  }

  /**
   * Vérifie si l'employé est inactif
   */
  isInactive(): boolean {
    return super.isInactive();
  }

  /**
   * Vérifie si l'activité est faible
   */
  hasLowActivity(): boolean {
    return super.hasLowActivity();
  }

  /**
   * Vérifie si l'absence est prolongée
   */
  hasLongAbsence(threshold: number = 7): boolean {
    return super.hasLongAbsence(threshold);
  }

  /**
   * Calcule l'âge du monitoring en jours
   */
  getMonitoringAgeInDays(): number {
    return super.getMonitoringAgeInDays();
  }

  /**
   * Calcule le ratio d'activité sur 7 jours
   */
  getActivityRatio7Days(): number {
    return super.getActivityRatio7Days();
  }

  /**
   * Calcule le ratio d'activité sur 30 jours
   */
  getActivityRatio30Days(): number {
    return super.getActivityRatio30Days();
  }

  /**
   * Vérifie si l'employé nécessite une attention
   */
  requiresAttention(): boolean {
    return this.isSuspicious() || this.hasLowActivity() || this.hasLongAbsence(14);
  }

  /**
   * Obtient la priorité d'attention (1 = plus urgent)
   */
  getAttentionPriority(): number {
    if (this.isSuspicious() && this.hasLongAbsence(30)) return 1; // Très urgent
    if (this.isSuspicious() && this.hasLongAbsence(14)) return 2; // Urgent
    if (this.isSuspicious()) return 3; // Attention requise
    if (this.hasLowActivity() && !this.isInactive()) return 4; // Surveillance
    if (this.isActive()) return 6; // Normal
    return 5; // Inactif (normal)
  }

  /**
   * Obtient la couleur d'affichage selon le statut
   */
  getDisplayColor(): string {
    switch (this.status_at_date) {
      case ActivityStatus.ACTIVE:
        return '#22c55e'; // vert
      case ActivityStatus.SUSPICIOUS:
        return '#f59e0b'; // orange
      case ActivityStatus.INACTIVE:
        return '#6b7280'; // gris
      default:
        return '#dc2626'; // rouge par défaut
    }
  }

  /**
   * Obtient l'icône d'affichage selon le statut
   */
  getDisplayIcon(): string {
    switch (this.status_at_date) {
      case ActivityStatus.ACTIVE:
        return '✅';
      case ActivityStatus.SUSPICIOUS:
        return '⚠️';
      case ActivityStatus.INACTIVE:
        return '😴';
      default:
        return '❓';
    }
  }

  // === COMPLÉTION DE LA CLASSE ACTIVITYMONITORING ===
  // À ajouter après la méthode getActivityMessage()

  /**
   * Format le message d'activité pour affichage
   */
  getActivityMessage(): string {
    const punchCount = this.punch_count_7_days || 0;
    const absentDays = this.consecutive_absent_days || 0;

    switch (this.status_at_date) {
      case ActivityStatus.ACTIVE:
        return `Actif - ${punchCount} pointage${punchCount > 1 ? 's' : ''} sur 7 jours`;

      case ActivityStatus.SUSPICIOUS:
        return `Suspect - ${punchCount} pointage${punchCount > 1 ? 's' : ''} sur 7j, ${absentDays} jour${absentDays > 1 ? 's' : ''} d'absence`;

      case ActivityStatus.INACTIVE:
        return absentDays > 0
          ? `Inactif - ${absentDays} jour${absentDays > 1 ? 's' : ''} d'absence`
          : 'Inactif - Aucune activité récente';

      default:
        return 'Statut inconnu';
    }
  }

  /**
   * Format la date de monitoring en format relatif
   */
  getRelativeMonitoringDate(): string {
    if (!this.monitoring_date) return 'Date inconnue';

    const now = TimezoneConfigUtils.getCurrentTime();
    const monitoring = new Date(this.monitoring_date);
    const diffDays = Math.floor((now.getTime() - monitoring.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30)
      return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;

    return monitoring.toLocaleDateString('fr-FR');
  }

  /**
   * Calcule le score d'activité (0-100)
   */
  getActivityScore(): number {
    let score = 0;

    // Points pour les pointages sur 7 jours (max 50 points)
    const punch7Days = this.punch_count_7_days || 0;
    score += Math.min(punch7Days * 7, 50);

    // Points pour l'activité régulière (max 30 points)
    const ratio7Days = this.getActivityRatio7Days();
    if (ratio7Days >= 0.8) score += 30;
    else if (ratio7Days >= 0.6) score += 20;
    else if (ratio7Days >= 0.4) score += 10;
    else if (ratio7Days >= 0.2) score += 5;

    // Malus pour les absences (max -20 points)
    const absentDays = this.consecutive_absent_days || 0;
    if (absentDays > 30) score -= 20;
    else if (absentDays > 14) score -= 15;
    else if (absentDays > 7) score -= 10;
    else if (absentDays > 3) score -= 5;

    // Bonus pour la régularité sur 30 jours (max 20 points)
    const punch30Days = this.punch_count_30_days || 0;
    const ratio30Days = this.getActivityRatio30Days();
    if (ratio30Days >= 0.7 && punch30Days >= 15) score += 20;
    else if (ratio30Days >= 0.5 && punch30Days >= 10) score += 15;
    else if (ratio30Days >= 0.3 && punch30Days >= 5) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Obtient le niveau de risque basé sur l'activité
   */
  getRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.isInactive()) return 'LOW'; // Inactif normal

    const score = this.getActivityScore();
    const absentDays = this.consecutive_absent_days || 0;

    if (this.isSuspicious() && absentDays > 30) return 'CRITICAL';
    if (this.isSuspicious() && absentDays > 14) return 'HIGH';
    if (this.isSuspicious() || score < 30) return 'MEDIUM';

    return 'LOW';
  }

  /**
   * Génère des recommandations d'action
   */
  getActionRecommendations(): string[] {
    const recommendations: string[] = [];
    const absentDays = this.consecutive_absent_days || 0;
    const punchCount = this.punch_count_7_days || 0;

    if (this.isSuspicious()) {
      if (absentDays > 30) {
        recommendations.push("Contacter l'employé immédiatement");
        recommendations.push('Vérifier les congés déclarés');
        recommendations.push('Évaluer la continuité du contrat');
      } else if (absentDays > 14) {
        recommendations.push("Prendre contact avec l'employé");
        recommendations.push('Vérifier les déclarations de congés');
      } else if (punchCount === 0) {
        recommendations.push("Vérifier l'activité récente");
        recommendations.push('Contacter le superviseur');
      }
    }

    if (this.hasLowActivity() && this.isActive()) {
      recommendations.push("Surveiller l'évolution de l'activité");
      recommendations.push('Vérifier la charge de travail');
    }

    if (recommendations.length === 0 && this.isActive()) {
      recommendations.push('Activité normale - Aucune action requise');
    }

    return recommendations;
  }

  /**
   * Génère un résumé exécutif
   */
  getExecutiveSummary(): string {
    const employeeLicenseId = this.employee_license || 'N/A';
    const dateText = this.getRelativeMonitoringDate().toLowerCase();
    const statusText = this.getActivityMessage();
    const score = this.getActivityScore();

    return `Employé ${employeeLicenseId} - ${statusText} (${dateText}) - Score d'activité: ${score}/100`;
  }

  // === MÉTHODES D'INSTANCE CORRESPONDANT AUX MÉTHODES STATIQUES ===

  async load(identifier: any): Promise<ActivityMonitoring | null> {
    const data = await this.find(Number(identifier));
    if (!data) return null;
    return this.hydrate(data);
  }

  async loadByEmployeeLicenseAndDate(
    employee_license: number,
    monitoring_date: Date,
  ): Promise<ActivityMonitoring | null> {
    const data = await this.findByEmployeeLicenseAndDate(employee_license, monitoring_date);
    if (!data) return null;
    return this.hydrate(data);
  }

  async list(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAll(conditions, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listByEmployeeLicense(
    employee_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllByEmployeeLicense(employee_license, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listByMonitoringDate(
    monitoring_date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllByMonitoringDate(monitoring_date, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listByActivityStatus(
    status: ActivityStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllByActivityStatus(status, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listSuspiciousEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllSuspiciousEmployees(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listInactiveEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllInactiveEmployees(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listActiveEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllActiveEmployees(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listLowActivity(
    maxPunchCount: number = 2,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllLowActivity(maxPunchCount, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listLongAbsent(
    minAbsentDays: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllLongAbsent(minAbsentDays, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listLatestByEmployee(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllLatestByEmployee(paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async listBetweenDates(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<ActivityMonitoring[] | null> {
    const dataset = await this.listAllBetweenDates(startDate, endDate, paginationOptions);
    if (!dataset) return null;
    return dataset.map((data) => new ActivityMonitoring().hydrate(data));
  }

  async getActivitySummary(date?: Date): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspicious: number;
    lowActivity: number;
    longAbsent: number;
  }> {
    const targetDate = date || TimezoneConfigUtils.getCurrentTime();
    const baseStats = await this.getActivityCountsByStatus(targetDate);

    // Statistiques supplémentaires
    const lowActivityRecords = await this.listAllLowActivity(2);
    const longAbsentRecords = await this.listAllLongAbsent(7);

    return {
      ...baseStats,
      lowActivity: lowActivityRecords?.length || 0,
      longAbsent: longAbsentRecords?.length || 0,
    };
  }

  /**
   * Vérifie si l'enregistrement est nouveau
   */
  isNew(): boolean {
    return this.id === undefined;
  }

  /**
   * Sauvegarde l'enregistrement (mise à jour uniquement)
   */
  async save(): Promise<void> {
    try {
      if (this.isNew()) {
        throw new Error(
          "ARCHITECTURE VIOLATION: La création d'activity_monitoring est réservée aux triggers PostgreSQL",
        );
      } else {
        await this.update();
      }
    } catch (error: any) {
      console.error('⚠️ Erreur sauvegarde activity monitoring:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Supprime l'enregistrement (usage administrateur uniquement)
   */
  async delete(): Promise<boolean> {
    if (this.id !== undefined) {
      console.warn(`⚠️ SUPPRESSION ACTIVITY MONITORING: ID ${this.id} - Action administrative`);
      return await this.trash(this.id);
    }
    return false;
  }

  /**
   * Conversion JSON pour API
   */
  async toJSON(view: ViewMode = responseValue.FULL): Promise<object> {
    const employeeLicense = await this.getEmployeeLicenseObject();

    const baseData = {
      [RS.MONITORING_DATE]: this.monitoring_date,
      [RS.LAST_PUNCH_DATE]: this.last_punch_date,
      [RS.PUNCH_COUNT_7_DAYS]: this.punch_count_7_days,
      [RS.PUNCH_COUNT_30_DAYS]: this.punch_count_30_days,
      [RS.CONSECUTIVE_ABSENT_DAYS]: this.consecutive_absent_days,
      [RS.STATUS_AT_DATE]: this.status_at_date,
      [RS.CREATED_AT]: this.created_at,
      [RS.UPDATED_AT]: this.updated_at,
      // Champs calculés
      activity_score: this.getActivityScore(),
      risk_level: this.getRiskLevel(),
      activity_message: this.getActivityMessage(),
      relative_date: this.getRelativeMonitoringDate(),
    };

    if (view === responseValue.MINIMAL) {
      return {
        ...baseData,
        [RS.EMPLOYEE_LICENSE]: employeeLicense?.getGuid(),
      };
    }

    return {
      ...baseData,
      [RS.EMPLOYEE_LICENSE]: employeeLicense?.toJSON(responseValue.MINIMAL),
      action_recommendations: this.getActionRecommendations(),
      executive_summary: this.getExecutiveSummary(),
    };
  }

  /**
   * Représentation string
   */
  toString(): string {
    return `ActivityMonitoring { ${RS.ID}: ${this.id}, ${RS.EMPLOYEE_LICENSE}: ${this.employee_license}, ${RS.STATUS_AT_DATE}: "${this.status_at_date}", score: ${this.getActivityScore()}/100 }`;
  }

  /**
   * Hydrate l'instance avec les données
   */
  private hydrate(data: any): ActivityMonitoring {
    this.id = data.id;
    this.employee_license = data.employee_license;
    this.monitoring_date = data.monitoring_date;
    this.last_punch_date = data.last_punch_date;
    this.punch_count_7_days = data.punch_count_7_days;
    this.punch_count_30_days = data.punch_count_30_days;
    this.consecutive_absent_days = data.consecutive_absent_days;
    this.status_at_date = data.status_at_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    return this;
  }
}
