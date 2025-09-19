import { Op } from 'sequelize';
import { BillingStatus } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { BillingCycleDbStructure } from '../database/data/billing.cycle.db.js';

export default class BillingCycleModel extends BaseModel {
  public readonly db = {
    tableName: tableName.BILLING_CYCLE,
    id: 'id',
    guid: 'guid',
    global_license: 'global_license',
    period_start: 'period_start',
    period_end: 'period_end',
    base_employee_count: 'base_employee_count',
    final_employee_count: 'final_employee_count',
    base_amount_usd: 'base_amount_usd',
    adjustments_amount_usd: 'adjustments_amount_usd',
    subtotal_usd: 'subtotal_usd',
    tax_amount_usd: 'tax_amount_usd',
    total_amount_usd: 'total_amount_usd',
    billing_currency_code: 'billing_currency_code',
    exchange_rate_used: 'exchange_rate_used',
    base_amount_local: 'base_amount_local',
    adjustments_amount_local: 'adjustments_amount_local',
    subtotal_local: 'subtotal_local',
    tax_amount_local: 'tax_amount_local',
    total_amount_local: 'total_amount_local',
    tax_rules_applied: 'tax_rules_applied',
    billing_status: 'billing_status',
    invoice_generated_at: 'invoice_generated_at',
    payment_due_date: 'payment_due_date',
    payment_completed_at: 'payment_completed_at',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected global_license?: number;
  protected period_start?: Date;
  protected period_end?: Date;
  protected base_employee_count?: number;
  protected final_employee_count?: number;
  protected base_amount_usd?: number;
  protected adjustments_amount_usd?: number;
  protected subtotal_usd?: number;
  protected tax_amount_usd?: number;
  protected total_amount_usd?: number;
  protected billing_currency_code?: string;
  protected exchange_rate_used?: number;
  protected base_amount_local?: number;
  protected adjustments_amount_local?: number;
  protected subtotal_local?: number;
  protected tax_amount_local?: number;
  protected total_amount_local?: number;
  protected tax_rules_applied?: any[];
  protected billing_status?: BillingStatus;
  protected invoice_generated_at?: Date;
  protected payment_due_date?: Date;
  protected payment_completed_at?: Date;

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
   * Liste tous les enregistrements selon les conditions
   */
  protected async listAll(
    conditions: Record<string, any> = {},
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  /**
   * Récupère tous les cycles de facturation par licence globale
   */
  protected async listAllByGlobalLicense(
    global_license: number,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.global_license]: global_license }, paginationOptions);
  }

  /**
   * Récupère tous les cycles de facturation par statut
   */
  protected async listAllByStatus(
    billing_status: BillingStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll({ [this.db.billing_status]: billing_status }, paginationOptions);
  }

  /**
   * Récupère tous les cycles de facturation par code de devise
   */
  protected async listAllByCurrency(
    billing_currency_code: string,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.billing_currency_code]: billing_currency_code },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les cycles de facturation par période
   */
  protected async listAllByPeriod(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.period_start]: {
          [Op.gte]: startDate,
        },
        [this.db.period_end]: {
          [Op.lte]: endDate,
        },
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les cycles de facturation en retard
   */
  protected async listAllOverdue(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.billing_status]: BillingStatus.OVERDUE,
        [this.db.payment_due_date]: {
          [Op.lt]: new Date(),
        },
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les cycles de facturation avec échéance proche
   */
  protected async listAllDueSoon(
    days: number = 7,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.findAll(
      this.db.tableName,
      {
        [this.db.payment_due_date]: {
          [Op.lte]: futureDate,
          [Op.gte]: new Date(),
        },
        [this.db.billing_status]: {
          [Op.in]: [BillingStatus.PENDING, BillingStatus.PROCESSING],
        },
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les cycles de facturation en attente de facture
   */
  protected async listAllPendingInvoice(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.billing_status]: {
          [Op.in]: [BillingStatus.PENDING, BillingStatus.PROCESSING],
        },
        [this.db.invoice_generated_at]: {
          [Op.is]: null,
        },
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les cycles de facturation terminés
   */
  protected async listAllCompleted(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.billing_status]: BillingStatus.COMPLETED,
        [this.db.payment_completed_at]: {
          [Op.not]: null,
        },
      },
      paginationOptions,
    );
  }

  /**
   * Crée un nouveau cycle de facturation
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Calculer les montants automatiquement
    this.calculateAmounts();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for billing cycle entry');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.global_license]: this.global_license,
      [this.db.period_start]: this.period_start,
      [this.db.period_end]: this.period_end,
      [this.db.base_employee_count]: this.base_employee_count,
      [this.db.final_employee_count]: this.final_employee_count,
      [this.db.base_amount_usd]: this.base_amount_usd,
      [this.db.adjustments_amount_usd]: this.adjustments_amount_usd || 0,
      [this.db.subtotal_usd]: this.subtotal_usd,
      [this.db.tax_amount_usd]: this.tax_amount_usd || 0,
      [this.db.total_amount_usd]: this.total_amount_usd,
      [this.db.billing_currency_code]: this.billing_currency_code,
      [this.db.exchange_rate_used]: this.exchange_rate_used,
      [this.db.base_amount_local]: this.base_amount_local,
      [this.db.adjustments_amount_local]: this.adjustments_amount_local || 0,
      [this.db.subtotal_local]: this.subtotal_local,
      [this.db.tax_amount_local]: this.tax_amount_local || 0,
      [this.db.total_amount_local]: this.total_amount_local,
      [this.db.tax_rules_applied]: this.tax_rules_applied || [],
      [this.db.billing_status]: this.billing_status || BillingStatus.PENDING,
      [this.db.payment_due_date]: this.payment_due_date,
      [this.db.invoice_generated_at]: this.invoice_generated_at,
      [this.db.payment_completed_at]: this.payment_completed_at,
    });

    console.log(
      `🟢 Cycle de facturation créé - Licence: ${this.global_license} | Période: ${this.period_start?.toISOString().split('T')[0]} - ${this.period_end?.toISOString().split('T')[0]} | GUID: ${guid}`,
    );

    if (!lastID) {
      throw new Error('Failed to create billing cycle entry');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Cycle de facturation créé avec ID:', this.id);
  }

  /**
   * Met à jour un cycle de facturation existant
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('Billing Cycle ID is required for update');
    }

    // Recalculer les montants si nécessaire
    this.calculateAmounts();

    const updateData: Record<string, any> = {};
    if (this.global_license !== undefined) updateData[this.db.global_license] = this.global_license;
    if (this.period_start !== undefined) updateData[this.db.period_start] = this.period_start;
    if (this.period_end !== undefined) updateData[this.db.period_end] = this.period_end;
    if (this.base_employee_count !== undefined)
      updateData[this.db.base_employee_count] = this.base_employee_count;
    if (this.final_employee_count !== undefined)
      updateData[this.db.final_employee_count] = this.final_employee_count;
    if (this.base_amount_usd !== undefined)
      updateData[this.db.base_amount_usd] = this.base_amount_usd;
    if (this.adjustments_amount_usd !== undefined)
      updateData[this.db.adjustments_amount_usd] = this.adjustments_amount_usd;
    if (this.subtotal_usd !== undefined) updateData[this.db.subtotal_usd] = this.subtotal_usd;
    if (this.tax_amount_usd !== undefined) updateData[this.db.tax_amount_usd] = this.tax_amount_usd;
    if (this.total_amount_usd !== undefined)
      updateData[this.db.total_amount_usd] = this.total_amount_usd;
    if (this.billing_currency_code !== undefined)
      updateData[this.db.billing_currency_code] = this.billing_currency_code;
    if (this.exchange_rate_used !== undefined)
      updateData[this.db.exchange_rate_used] = this.exchange_rate_used;
    if (this.base_amount_local !== undefined)
      updateData[this.db.base_amount_local] = this.base_amount_local;
    if (this.adjustments_amount_local !== undefined)
      updateData[this.db.adjustments_amount_local] = this.adjustments_amount_local;
    if (this.subtotal_local !== undefined) updateData[this.db.subtotal_local] = this.subtotal_local;
    if (this.tax_amount_local !== undefined)
      updateData[this.db.tax_amount_local] = this.tax_amount_local;
    if (this.total_amount_local !== undefined)
      updateData[this.db.total_amount_local] = this.total_amount_local;
    if (this.tax_rules_applied !== undefined)
      updateData[this.db.tax_rules_applied] = this.tax_rules_applied;
    if (this.billing_status !== undefined) updateData[this.db.billing_status] = this.billing_status;
    if (this.invoice_generated_at !== undefined)
      updateData[this.db.invoice_generated_at] = this.invoice_generated_at;
    if (this.payment_due_date !== undefined)
      updateData[this.db.payment_due_date] = this.payment_due_date;
    if (this.payment_completed_at !== undefined)
      updateData[this.db.payment_completed_at] = this.payment_completed_at;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update billing cycle entry');
    }
  }

  /**
   * Supprime un cycle de facturation
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Marque le cycle comme facturé
   */
  protected async markAsInvoiced(): Promise<void> {
    if (!this.id) {
      throw new Error('Billing Cycle ID is required');
    }

    this.invoice_generated_at = new Date();
    this.billing_status = BillingStatus.PROCESSING;

    await this.update();
  }

  /**
   * Marque le cycle comme payé
   */
  protected async markAsPaid(): Promise<void> {
    if (!this.id) {
      throw new Error('Billing Cycle ID is required');
    }

    this.payment_completed_at = new Date();
    this.billing_status = BillingStatus.COMPLETED;

    await this.update();
  }

  /**
   * Marque le cycle comme en retard
   */
  protected async markAsOverdue(): Promise<void> {
    if (!this.id) {
      throw new Error('Billing Cycle ID is required');
    }

    if (!this.payment_due_date || this.payment_due_date >= new Date()) {
      throw new Error('Cannot mark as overdue - payment due date has not passed');
    }

    this.billing_status = BillingStatus.OVERDUE;
    await this.update();
  }

  /**
   * Annule le cycle de facturation
   */
  protected async cancel(): Promise<void> {
    if (!this.id) {
      throw new Error('Billing Cycle ID is required');
    }

    if (this.billing_status === BillingStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed billing cycle');
    }

    this.billing_status = BillingStatus.CANCELLED;
    await this.update();
  }

  /**
   * Calcule automatiquement les montants
   */
  private calculateAmounts(): void {
    if (!this.base_amount_usd || !this.exchange_rate_used) {
      return;
    }

    // Calcul USD
    const adjustmentsUsd = this.adjustments_amount_usd || 0;
    this.subtotal_usd = this.base_amount_usd + adjustmentsUsd;

    const taxUsd = this.tax_amount_usd || 0;
    this.total_amount_usd = this.subtotal_usd + taxUsd;

    // Calcul local
    this.base_amount_local = Math.round(this.base_amount_usd * this.exchange_rate_used * 100) / 100;

    const adjustmentsLocal =
      this.adjustments_amount_local ||
      Math.round(adjustmentsUsd * this.exchange_rate_used * 100) / 100;
    this.adjustments_amount_local = adjustmentsLocal;

    this.subtotal_local = this.base_amount_local + adjustmentsLocal;

    const taxLocal =
      this.tax_amount_local || Math.round(taxUsd * this.exchange_rate_used * 100) / 100;
    this.tax_amount_local = taxLocal;

    this.total_amount_local = this.subtotal_local + taxLocal;
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // Nettoyer les données en utilisant la structure de validation
    BillingCycleDbStructure.validation.cleanData(this);

    // Validations personnalisées supplémentaires
    if (!this.global_license) {
      throw new Error('Global master is required');
    }

    if (!this.period_start) {
      throw new Error('Period start is required');
    }

    if (!this.period_end) {
      throw new Error('Period end is required');
    }

    if (!this.payment_due_date) {
      throw new Error('Payment due date is required');
    }

    if (!this.base_employee_count) {
      throw new Error('Base employee count is required');
    }

    if (!this.final_employee_count) {
      throw new Error('Final employee count is required');
    }

    if (!this.base_amount_usd) {
      throw new Error('Base amount USD is required');
    }

    if (!this.billing_currency_code) {
      throw new Error('Billing currency code is required');
    }

    if (!this.exchange_rate_used) {
      throw new Error('Exchange rate is required');
    }

    // Validation des dates
    const startDate = new Date(this.period_start);
    const endDate = new Date(this.period_end);
    const dueDate = new Date(this.payment_due_date);

    if (endDate <= startDate) {
      throw new Error('Period end must be after period start');
    }

    if (dueDate <= endDate) {
      throw new Error('Payment due date must be after period end');
    }

    // Validation des montants
    if (this.final_employee_count < this.base_employee_count) {
      throw new Error('Final employee count cannot be less than base employee count');
    }

    if (this.base_amount_usd < 0) {
      throw new Error('Base amount USD must be positive');
    }

    if (this.exchange_rate_used <= 0) {
      throw new Error('Exchange rate must be positive');
    }

    // Validation du statut et des champs dépendants
    if (this.billing_status === BillingStatus.COMPLETED) {
      if (!this.invoice_generated_at) {
        throw new Error('Invoice generated date is required for completed billing cycles');
      }
      if (!this.payment_completed_at) {
        throw new Error('Payment completed date is required for completed billing cycles');
      }
    }

    if (this.billing_status === BillingStatus.OVERDUE) {
      const now = new Date();
      if (!this.payment_due_date || this.payment_due_date >= now) {
        throw new Error('Billing cycle can only be OVERDUE if payment due date has passed');
      }
    }

    // Validation de la cohérence des devises
    if (this.billing_currency_code === 'USD' && this.exchange_rate_used !== 1) {
      throw new Error('Exchange rate must be 1 when billing currency is USD');
    }
  }
}
