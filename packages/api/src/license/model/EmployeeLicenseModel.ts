import { Op } from 'sequelize';
import { BillingStatusComputed, ContractualStatus, LeaveType } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { EmployeeLicenseDbStructure } from '../database/data/employee.license.db.js';

export default class EmployeeLicenseModel extends BaseModel {
  public readonly db = {
    tableName: tableName.EMPLOYEE_LICENSE,
    id: 'id',
    guid: 'guid',
    global_license: 'global_license',
    employee: 'employee',
    employee_code: 'employee_code',
    activation_date: 'activation_date',
    deactivation_date: 'deactivation_date',
    last_activity_date: 'last_activity_date',
    contractual_status: 'contractual_status',
    declared_long_leave: 'declared_long_leave',
    long_leave_declared_by: 'long_leave_declared_by',
    long_leave_declared_at: 'long_leave_declared_at',
    long_leave_type: 'long_leave_type',
    long_leave_reason: 'long_leave_reason',
    computed_billing_status: 'computed_billing_status',
    grace_period_start: 'grace_period_start',
    grace_period_end: 'grace_period_end',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected global_license?: number;
  protected employee?: string;
  protected employee_code?: string;
  protected activation_date?: Date;
  protected deactivation_date?: Date;
  protected last_activity_date?: Date;
  protected contractual_status?: ContractualStatus;
  protected declared_long_leave?: boolean;
  protected long_leave_declared_by?: string;
  protected long_leave_declared_at?: Date;
  protected long_leave_type?: LeaveType;
  protected long_leave_reason?: string;
  protected computed_billing_status?: BillingStatusComputed;
  protected grace_period_start?: Date;
  protected grace_period_end?: Date;

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
   * Trouve un enregistrement par son GUID
   */
  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  /**
   * Trouve un enregistrement par employee ID
   */
  protected async findByEmployee(employee: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.employee]: employee, [this.db.contractual_status]: ContractualStatus.ACTIVE });
  }

  /**
   * Trouve un enregistrement par employee code
   */
  protected async findByEmployeeCode(employee_code: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.employee_code]: employee_code });
  }

  /**
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  /**
   * Récupère toutes les licences employés par licence globale
   */
  protected async listAllByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.global_license]: global_license },
      paginationOptions,
    );
  }

  /**
   * Récupère toutes les licences employés par statut contractuel
   */
  protected async listAllByContractualStatus(
    contractual_status: ContractualStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.contractual_status]: contractual_status },
      paginationOptions,
    );
  }

  /**
   * Récupère toutes les licences employés par statut de facturation
   */
  protected async listAllByBillingStatus(
    billing_status: BillingStatusComputed,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.computed_billing_status]: billing_status },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés en congé long
   */
  protected async listAllOnLongLeave(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.declared_long_leave]: true },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés par type de congé
   */
  protected async listAllByLeaveType(
    leave_type: LeaveType,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      {
        [this.db.declared_long_leave]: true,
        [this.db.long_leave_type]: leave_type
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés avec activité récente
   */
  protected async listAllWithRecentActivity(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.last_activity_date]: {
          [Op.gte]: pastDate,
        },
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés sans activité récente
   */
  protected async listAllWithoutRecentActivity(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    return await this.findAll(
      this.db.tableName,
      {
        [Op.or]: [
          { [this.db.last_activity_date]: null },
          { [this.db.last_activity_date]: { [Op.lt]: pastDate } }
        ]
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés en période de grâce
   */
  protected async listAllInGracePeriod(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = new Date();
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.grace_period_start]: { [Op.lte]: now },
        [this.db.grace_period_end]: { [Op.gte]: now },
        [this.db.computed_billing_status]: BillingStatusComputed.GRACE_PERIOD
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés dont la période de grâce expire bientôt
   */
  protected async listAllGracePeriodExpiringSoon(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.grace_period_end]: {
          [Op.between]: [now, futureDate]
        },
        [this.db.computed_billing_status]: BillingStatusComputed.GRACE_PERIOD
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés activés dans une période
   */
  protected async listAllActivatedBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.activation_date]: {
          [Op.between]: [startDate, endDate]
        }
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les employés désactivés dans une période
   */
  protected async listAllDeactivatedBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.deactivation_date]: {
          [Op.between]: [startDate, endDate]
        }
      },
      paginationOptions,
    );
  }

  /**
   * Récupère le nombre d'employés par statut de facturation pour une licence globale
   */
  protected async getBillingStatusCountByGlobalLicense(global_license: number): Promise<Record<string, number>> {
    const results = await this.findAll(this.db.tableName, { [this.db.global_license]: global_license });

    const counts: Record<string, number> = {};
    Object.values(BillingStatusComputed).forEach(status => {
      counts[status] = 0;
    });

    results.forEach((result: any) => {
      if (result[this.db.computed_billing_status]) {
        counts[result[this.db.computed_billing_status]]++;
      }
    });

    return counts;
  }

  /**
   * Met à jour la date d'activité d'un employé
   */
  protected async updateLastActivity(employee: string, activity_date?: Date): Promise<boolean> {
    const updateData = {
      [this.db.last_activity_date]: activity_date || new Date()
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.employee]: employee }
    );

    return !!affected;
  }

  /**
   * Déclare un employé en congé long
   */
  protected async declareLongLeave(
    employee: string,
    declared_by: string,
    leave_type: LeaveType,
    reason?: string
  ): Promise<boolean> {
    const updateData = {
      [this.db.declared_long_leave]: true,
      [this.db.long_leave_declared_by]: declared_by,
      [this.db.long_leave_declared_at]: new Date(),
      [this.db.long_leave_type]: leave_type,
      [this.db.long_leave_reason]: reason || null
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.employee]: employee }
    );

    return !!affected;
  }

  /**
   * Annule la déclaration de congé long
   */
  protected async cancelLongLeave(employee: string): Promise<boolean> {
    const updateData = {
      [this.db.declared_long_leave]: false,
      [this.db.long_leave_declared_by]: null,
      [this.db.long_leave_declared_at]: null,
      [this.db.long_leave_type]: null,
      [this.db.long_leave_reason]: null
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.employee]: employee }
    );

    return !!affected;
  }

  /**
   * Désactive un employé
   */
  protected async deactivateEmployee(employee: string): Promise<boolean> {
    const updateData = {
      [this.db.deactivation_date]: new Date(),
      [this.db.contractual_status]: ContractualStatus.TERMINATED
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.employee]: employee }
    );

    return !!affected;
  }

  /**
   * Réactive un employé
   */
  protected async reactivateEmployee(employee: string): Promise<boolean> {
    const updateData = {
      [this.db.deactivation_date]: null,
      [this.db.contractual_status]: ContractualStatus.ACTIVE,
      [this.db.last_activity_date]: new Date()
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.employee]: employee }
    );

    return !!affected;
  }

  /**
   * Crée une nouvelle licence employé
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for employee license entry');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.global_license]: this.global_license,
      [this.db.employee]: this.employee,
      [this.db.employee_code]: this.employee_code,
      [this.db.activation_date]: this.activation_date || new Date(),
      [this.db.deactivation_date]: this.deactivation_date || null,
      [this.db.last_activity_date]: this.last_activity_date || null,
      [this.db.contractual_status]: this.contractual_status || ContractualStatus.ACTIVE,
      [this.db.declared_long_leave]: this.declared_long_leave || false,
      [this.db.long_leave_declared_by]: this.long_leave_declared_by || null,
      [this.db.long_leave_declared_at]: this.long_leave_declared_at || null,
      [this.db.long_leave_type]: this.long_leave_type || null,
      [this.db.long_leave_reason]: this.long_leave_reason || null,
      // computed_billing_status sera calculé automatiquement par PostgreSQL
      [this.db.grace_period_start]: this.grace_period_start || null,
      [this.db.grace_period_end]: this.grace_period_end || null,
    });

    console.log(`🟢 Licence employé créée - Employee: ${this.employee} | Code: ${this.employee_code} | GUID: ${guid}`);

    if (!lastID) {
      throw new Error('Failed to create employee license entry');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Licence employé créée avec ID:', this.id);
  }

  /**
   * Met à jour une licence employé existante
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Employee License ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.global_license !== undefined) updateData[this.db.global_license] = this.global_license;
    if (this.employee !== undefined) updateData[this.db.employee] = this.employee;
    if (this.employee_code !== undefined) updateData[this.db.employee_code] = this.employee_code;
    if (this.activation_date !== undefined) updateData[this.db.activation_date] = this.activation_date;
    if (this.deactivation_date !== undefined) updateData[this.db.deactivation_date] = this.deactivation_date;
    if (this.last_activity_date !== undefined) updateData[this.db.last_activity_date] = this.last_activity_date;
    if (this.contractual_status !== undefined) updateData[this.db.contractual_status] = this.contractual_status;
    if (this.declared_long_leave !== undefined) updateData[this.db.declared_long_leave] = this.declared_long_leave;
    if (this.long_leave_declared_by !== undefined) updateData[this.db.long_leave_declared_by] = this.long_leave_declared_by;
    if (this.long_leave_declared_at !== undefined) updateData[this.db.long_leave_declared_at] = this.long_leave_declared_at;
    if (this.long_leave_type !== undefined) updateData[this.db.long_leave_type] = this.long_leave_type;
    if (this.long_leave_reason !== undefined) updateData[this.db.long_leave_reason] = this.long_leave_reason;
    if (this.grace_period_start !== undefined) updateData[this.db.grace_period_start] = this.grace_period_start;
    if (this.grace_period_end !== undefined) updateData[this.db.grace_period_end] = this.grace_period_end;

    // Ne pas mettre à jour computed_billing_status car c'est une colonne générée

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update employee license entry');
    }
  }

  /**
   * Supprime une licence employé
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // try {
      // Nettoyer les données en utilisant la structure de validation
      EmployeeLicenseDbStructure.validation.cleanData(this);

      // Validations personnalisées supplémentaires
      if (!this.global_license) {
        throw new Error('Global license is required');
      }

      if (!this.employee) {
        throw new Error('Employee is required');
      }

      if (!this.employee_code) {
        throw new Error('Employee code is required');
      }

      // Validation des regex
      if (!EmployeeLicenseDbStructure.validation.validateEmployee(this.employee)) {
        throw new Error('Invalid employee ID format');
      }

      if (!EmployeeLicenseDbStructure.validation.validateEmployeeCode(this.employee_code)) {
        throw new Error('Invalid employee code format');
      }

      // Validation des dates
      if (this.activation_date && !EmployeeLicenseDbStructure.validation.validateActivationDate(this.activation_date)) {
        throw new Error('Invalid activation date');
      }

      if (this.deactivation_date && !EmployeeLicenseDbStructure.validation.validateDeactivationDate(this.deactivation_date)) {
        throw new Error('Invalid deactivation date');
      }

      if (this.last_activity_date && !EmployeeLicenseDbStructure.validation.validateLastActivityDate(this.last_activity_date)) {
        throw new Error('Invalid last activity date');
      }

      // Validation des statuts
      if (this.contractual_status && !EmployeeLicenseDbStructure.validation.validateContractualStatus(this.contractual_status)) {
        throw new Error('Invalid contractual status');
      }

      if (this.long_leave_type && !EmployeeLicenseDbStructure.validation.validateLongLeaveType(this.long_leave_type)) {
        throw new Error('Invalid long leave type');
      }

      // Validation de cohérence des dates
      if (this.activation_date && this.deactivation_date && this.deactivation_date <= this.activation_date) {
        throw new Error('Deactivation date must be after activation date');
      }

      // Validation des données de congé long
      if (this.declared_long_leave) {
        if (!this.long_leave_declared_by || !this.long_leave_declared_at) {
          throw new Error('Long leave requires declared_by and declared_at fields');
        }

        // Validation anti-fraude : pas de congé déclaré avec activité récente
        if (this.last_activity_date) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (this.last_activity_date >= sevenDaysAgo) {
            throw new Error('Cannot declare long leave with recent activity (within 7 days)');
          }
        }
      }

      // Validation de la période de grâce
      if (this.grace_period_start && this.grace_period_end) {
        if (this.grace_period_end <= this.grace_period_start) {
          throw new Error('Grace period end must be after start date');
        }
      }

      // Validation de la longueur de la raison de congé
      if (this.long_leave_reason && !EmployeeLicenseDbStructure.validation.validateLongLeaveReason(this.long_leave_reason)) {
        throw new Error('Long leave reason is too long (max 500 characters)');
      }

    // } catch (error: any) {
    //   console.error('⚠️ Erreur validation licence employé:', error.message);
    //   throw error;
    // }
  }
}