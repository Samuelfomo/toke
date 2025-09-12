import { Op } from 'sequelize';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';

// Types basés sur la migration
export enum ActivityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPICIOUS = 'SUSPICIOUS'
}

export interface ActivityMonitoringDbStructure {
  id: number;
  employee_license: number;
  monitoring_date: Date;
  last_punch_date?: Date;
  punch_count_7_days: number;
  punch_count_30_days: number;
  consecutive_absent_days: number;
  status_at_date: ActivityStatus;
  created_at: Date;
  updated_at: Date;
}

export default class ActivityMonitoringModel extends BaseModel {
  public readonly db = {
    tableName: tableName.ACTIVITY_MONITORING || 'xa_activity_monitoring',
    id: 'id',
    employee_license: 'employee_license',
    monitoring_date: 'monitoring_date',
    last_punch_date: 'last_punch_date',
    punch_count_7_days: 'punch_count_7_days',
    punch_count_30_days: 'punch_count_30_days',
    consecutive_absent_days: 'consecutive_absent_days',
    status_at_date: 'status_at_date',
    created_at: 'created_at',
    updated_at: 'updated_at',
  } as const;

  protected id?: number;
  protected employee_license?: number;
  protected monitoring_date?: Date;
  protected last_punch_date?: Date;
  protected punch_count_7_days?: number;
  protected punch_count_30_days?: number;
  protected consecutive_absent_days?: number;
  protected status_at_date?: ActivityStatus;
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
   * Trouve un enregistrement par employee_license et date
   */
  protected async findByEmployeeLicenseAndDate(
    employee_license: number,
    monitoring_date: Date
  ): Promise<any> {
    return await this.findOne(this.db.tableName, {
      [this.db.employee_license]: employee_license,
      [this.db.monitoring_date]: monitoring_date
    });
  }

  /**
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      conditions,
      paginationOptions
    );
  }

  /**
   * Liste tous les enregistrements par employee_license
   */
  protected async listAllByEmployeeLicense(
    employee_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.employee_license]: employee_license },
      paginationOptions,
    );
  }

  /**
   * Liste tous les enregistrements par date de monitoring
   */
  protected async listAllByMonitoringDate(
    monitoring_date: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.monitoring_date]: monitoring_date },
      paginationOptions,
    );
  }

  /**
   * Liste tous les enregistrements par statut d'activité
   */
  protected async listAllByActivityStatus(
    status: ActivityStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.status_at_date]: status },
      paginationOptions,
    );
  }

  /**
   * Liste les employés suspects
   */
  protected async listAllSuspiciousEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAllByActivityStatus(ActivityStatus.SUSPICIOUS, paginationOptions);
  }

  /**
   * Liste les employés inactifs
   */
  protected async listAllInactiveEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAllByActivityStatus(ActivityStatus.INACTIVE, paginationOptions);
  }

  /**
   * Liste les employés actifs
   */
  protected async listAllActiveEmployees(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAllByActivityStatus(ActivityStatus.ACTIVE, paginationOptions);
  }

  /**
   * Liste les enregistrements avec peu d'activité (moins de X pointages en 7 jours)
   */
  protected async listAllLowActivity(
    maxPunchCount: number = 2,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      {
        [this.db.punch_count_7_days]: { [Op.lte]: maxPunchCount },
        [this.db.status_at_date]: { [Op.ne]: ActivityStatus.INACTIVE }
      },
      paginationOptions,
    );
  }

  /**
   * Liste les employés avec absences prolongées
   */
  protected async listAllLongAbsent(
    minAbsentDays: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.consecutive_absent_days]: { [Op.gte]: minAbsentDays } },
      paginationOptions,
    );
  }

  /**
   * Liste les enregistrements dans une période
   */
  protected async listAllBetweenDates(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      {
        [this.db.monitoring_date]: {
          [Op.between]: [startDate, endDate]
        }
      },
      paginationOptions,
    );
  }

  /**
   * Liste les derniers enregistrements pour chaque employé
   */
  protected async listAllLatestByEmployee(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    // Requête complexe pour récupérer le dernier enregistrement par employé
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.monitoring_date]: {
          [Op.in]: this.sequelize.literal(`(
            SELECT MAX(monitoring_date) 
            FROM ${this.db.tableName} sub 
            WHERE sub.employee_license = ${this.db.tableName}.employee_license
          )`)
        }
      },
      paginationOptions
    );
  }

  /**
   * Compte les enregistrements par statut pour une date
   */
  protected async getActivityCountsByStatus(date: Date): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspicious: number;
  }> {
    const allRecords = await this.listAllByMonitoringDate(date);

    const counts = {
      total: allRecords.length,
      active: 0,
      inactive: 0,
      suspicious: 0,
    };

    allRecords.forEach((record: any) => {
      switch (record[this.db.status_at_date]) {
        case ActivityStatus.ACTIVE:
          counts.active++;
          break;
        case ActivityStatus.INACTIVE:
          counts.inactive++;
          break;
        case ActivityStatus.SUSPICIOUS:
          counts.suspicious++;
          break;
      }
    });

    return counts;
  }

  /**
   * Calcule les statistiques de pointages pour une période
   */
  protected async getPunchStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    avgPunchCount7Days: number;
    avgPunchCount30Days: number;
    avgConsecutiveAbsentDays: number;
    totalEmployeesMonitored: number;
  }> {
    const records = await this.listAllBetweenDates(startDate, endDate);

    if (records.length === 0) {
      return {
        avgPunchCount7Days: 0,
        avgPunchCount30Days: 0,
        avgConsecutiveAbsentDays: 0,
        totalEmployeesMonitored: 0
      };
    }

    const totals = records.reduce((acc, record) => ({
      punch7Days: acc.punch7Days + (record[this.db.punch_count_7_days] || 0),
      punch30Days: acc.punch30Days + (record[this.db.punch_count_30_days] || 0),
      absentDays: acc.absentDays + (record[this.db.consecutive_absent_days] || 0)
    }), { punch7Days: 0, punch30Days: 0, absentDays: 0 });

    return {
      avgPunchCount7Days: Math.round((totals.punch7Days / records.length) * 100) / 100,
      avgPunchCount30Days: Math.round((totals.punch30Days / records.length) * 100) / 100,
      avgConsecutiveAbsentDays: Math.round((totals.absentDays / records.length) * 100) / 100,
      totalEmployeesMonitored: records.length
    };
  }

  /**
   * IMPORTANT: Pas de méthode create() - Les INSERT sont gérés uniquement par PostgreSQL
   * Cette méthode lèvera toujours une exception pour respecter l'architecture
   */
  protected async create(): Promise<void> {
    throw new Error(
      'ARCHITECTURE VIOLATION: INSERT dans xa_activity_monitoring est réservé aux triggers PostgreSQL. ' +
      'Les enregistrements sont générés automatiquement par les fonctions PostgreSQL.'
    );
  }

  /**
   * Met à jour un enregistrement existant (lecture seule - usage limité)
   */
  protected async update(): Promise<void> {
    console.warn('⚠️ ATTENTION: Mise à jour manuelle d\'activity_monitoring - Usage découragé');

    await this.validate();

    if (!this.id) {
      throw new Error('Activity Monitoring ID is required for update');
    }

    const updateData: Record<string, any> = {};

    // Mise à jour très limitée car les données sont calculées automatiquement
    if (this.status_at_date !== undefined) updateData[this.db.status_at_date] = this.status_at_date;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update activity monitoring entry');
    }
  }

  /**
   * Supprime un enregistrement (usage administrateur uniquement)
   */
  protected async trash(id: number): Promise<boolean> {
    console.warn(`⚠️ SUPPRESSION ACTIVITY MONITORING: ID ${id} - Action administrative`);
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Vérifie si l'employé est actif
   */
  protected isActive(): boolean {
    return this.status_at_date === ActivityStatus.ACTIVE;
  }

  /**
   * Vérifie si l'employé est suspect
   */
  protected isSuspicious(): boolean {
    return this.status_at_date === ActivityStatus.SUSPICIOUS;
  }

  /**
   * Vérifie si l'employé est inactif
   */
  protected isInactive(): boolean {
    return this.status_at_date === ActivityStatus.INACTIVE;
  }

  /**
   * Vérifie si l'activité est faible
   */
  protected hasLowActivity(): boolean {
    return (this.punch_count_7_days || 0) <= 2;
  }

  /**
   * Vérifie si l'absence est prolongée
   */
  protected hasLongAbsence(threshold: number = 7): boolean {
    return (this.consecutive_absent_days || 0) >= threshold;
  }

  /**
   * Calcule l'âge du monitoring en jours
   */
  protected getMonitoringAgeInDays(): number {
    if (!this.monitoring_date) return 0;
    const now = new Date();
    const monitoring = new Date(this.monitoring_date);
    const diffTime = now.getTime() - monitoring.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule le ratio d'activité sur 7 jours (pointages / jours)
   */
  protected getActivityRatio7Days(): number {
    return Math.round(((this.punch_count_7_days || 0) / 7) * 100) / 100;
  }

  /**
   * Calcule le ratio d'activité sur 30 jours
   */
  protected getActivityRatio30Days(): number {
    return Math.round(((this.punch_count_30_days || 0) / 30) * 100) / 100;
  }

  /**
   * Valide les données avant mise à jour
   */
  private async validate(): Promise<void> {
    try {
      // Validations de base
      if (this.punch_count_7_days !== undefined && this.punch_count_7_days < 0) {
        throw new Error('punch_count_7_days must be positive');
      }

      if (this.punch_count_30_days !== undefined && this.punch_count_30_days < 0) {
        throw new Error('punch_count_30_days must be positive');
      }

      if (this.consecutive_absent_days !== undefined && this.consecutive_absent_days < 0) {
        throw new Error('consecutive_absent_days must be positive');
      }

      if (this.punch_count_7_days !== undefined &&
        this.punch_count_30_days !== undefined &&
        this.punch_count_7_days > this.punch_count_30_days) {
        throw new Error('punch_count_7_days cannot be greater than punch_count_30_days');
      }

      if (this.status_at_date !== undefined &&
        !Object.values(ActivityStatus).includes(this.status_at_date)) {
        throw new Error('Invalid activity status');
      }

    } catch (error: any) {
      console.error('⚠️ Erreur validation activity monitoring:', error.message);
      throw error;
    }
  }
}