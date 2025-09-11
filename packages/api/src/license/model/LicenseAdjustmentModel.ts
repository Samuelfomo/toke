import { Op } from 'sequelize';

// import { PaymentStatus } from '@toke/shared';
import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { LicenseAdjustmentDbStructure, PaymentStatus } from '../database/data/license.adjustment.db.js';

export default class LicenseAdjustmentModel extends BaseModel {
  public readonly db = {
    tableName: tableName.LICENSE_ADJUSTMENT,
    id: 'id',
    guid: 'guid',
    global_license: 'global_license',
    adjustment_date: 'adjustment_date',
    employees_added_count: 'employees_added_count',
    months_remaining: 'months_remaining',
    price_per_employee_usd: 'price_per_employee_usd',
    subtotal_usd: 'subtotal_usd',
    tax_amount_usd: 'tax_amount_usd',
    total_amount_usd: 'total_amount_usd',
    billing_currency_code: 'billing_currency_code',
    exchange_rate_used: 'exchange_rate_used',
    subtotal_local: 'subtotal_local',
    tax_amount_local: 'tax_amount_local',
    total_amount_local: 'total_amount_local',
    tax_rules_applied: 'tax_rules_applied',
    payment_status: 'payment_status',
    payment_due_immediately: 'payment_due_immediately',
    invoice_sent_at: 'invoice_sent_at',
    payment_completed_at: 'payment_completed_at',
  } as const;

  protected id?: number;
  protected guid?: number;
  protected global_license?: number;
  protected adjustment_date?: Date;
  protected employees_added_count?: number;
  protected months_remaining?: number;
  protected price_per_employee_usd?: number;
  protected subtotal_usd?: number;
  protected tax_amount_usd?: number;
  protected total_amount_usd?: number;
  protected billing_currency_code?: string;
  protected exchange_rate_used?: number;
  protected subtotal_local?: number;
  protected tax_amount_local?: number;
  protected total_amount_local?: number;
  protected tax_rules_applied?: any[];
  protected payment_status?: PaymentStatus;
  protected payment_due_immediately?: boolean;
  protected invoice_sent_at?: Date;
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
   * Récupère tous les avenants par licence globale
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
   * Récupère tous les avenants par statut de paiement
   */
  protected async listAllByPaymentStatus(
    payment_status: PaymentStatus,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      { [this.db.payment_status]: payment_status },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les avenants par devise de facturation
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
   * Récupère tous les avenants créés dans une période
   */
  protected async listAllCreatedBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.adjustment_date]: {
          [Op.between]: [startDate, endDate]
        }
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les avenants avec paiement en attente
   */
  protected async listAllPendingPayment(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.listAll(
      {
        [this.db.payment_status]: {
          [Op.in]: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
        }
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les avenants avec facture envoyée mais non payés
   */
  protected async listAllInvoicedNotPaid(
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.invoice_sent_at]: { [Op.ne]: null },
        [this.db.payment_completed_at]: null,
        [this.db.payment_status]: {
          [Op.notIn]: [PaymentStatus.COMPLETED, PaymentStatus.CANCELLED, PaymentStatus.REFUNDED]
        }
      },
      paginationOptions,
    );
  }

  /**
   * Récupère tous les avenants payés dans une période
   */
  protected async listAllPaidBetween(
    startDate: Date,
    endDate: Date,
    paginationOptions: { offset?: number; limit?: number } = {},
  ): Promise<any[]> {
    return await this.findAll(
      this.db.tableName,
      {
        [this.db.payment_completed_at]: {
          [Op.between]: [startDate, endDate]
        },
        [this.db.payment_status]: PaymentStatus.COMPLETED
      },
      paginationOptions,
    );
  }

  /**
   * Récupère les statistiques financières par devise
   */
  protected async getFinancialStatsByCurrency(currency_code?: string): Promise<any[]> {
    const conditions: Record<string, any> = {};
    if (currency_code) {
      conditions[this.db.billing_currency_code] = currency_code;
    }

    const results = await this.findAll(this.db.tableName, conditions);

    // Grouper par devise et calculer les totaux
    const stats: Record<string, any> = {};

    results.forEach((adjustment: any) => {
      const currency = adjustment[this.db.billing_currency_code];
      if (!stats[currency]) {
        stats[currency] = {
          currency: currency,
          total_adjustments: 0,
          total_amount_local: 0,
          total_amount_usd: 0,
          pending_amount_local: 0,
          pending_amount_usd: 0,
          completed_amount_local: 0,
          completed_amount_usd: 0,
          average_exchange_rate: 0,
          total_employees_added: 0
        };
      }

      stats[currency].total_adjustments += 1;
      stats[currency].total_amount_local += parseFloat(adjustment[this.db.total_amount_local] || 0);
      stats[currency].total_amount_usd += parseFloat(adjustment[this.db.total_amount_usd] || 0);
      stats[currency].total_employees_added += adjustment[this.db.employees_added_count] || 0;

      if (adjustment[this.db.payment_status] === PaymentStatus.COMPLETED) {
        stats[currency].completed_amount_local += parseFloat(adjustment[this.db.total_amount_local] || 0);
        stats[currency].completed_amount_usd += parseFloat(adjustment[this.db.total_amount_usd] || 0);
      } else {
        stats[currency].pending_amount_local += parseFloat(adjustment[this.db.total_amount_local] || 0);
        stats[currency].pending_amount_usd += parseFloat(adjustment[this.db.total_amount_usd] || 0);
      }
    });

    // Calculer le taux de change moyen
    Object.keys(stats).forEach(currency => {
      const currencyAdjustments = results.filter((adj: any) => adj[this.db.billing_currency_code] === currency);
      const totalRate = currencyAdjustments.reduce((sum: number, adj: any) => sum + parseFloat(adj[this.db.exchange_rate_used] || 0), 0);
      stats[currency].average_exchange_rate = totalRate / currencyAdjustments.length;
    });

    return Object.values(stats);
  }

  /**
   * Met à jour le statut de paiement
   */
  protected async updatePaymentStatus(id: number, status: PaymentStatus, completed_at?: Date): Promise<boolean> {
    const updateData: Record<string, any> = {
      [this.db.payment_status]: status
    };

    if (status === PaymentStatus.COMPLETED && completed_at) {
      updateData[this.db.payment_completed_at] = completed_at;
    }

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Marque la facture comme envoyée
   */
  protected async markInvoiceSent(id: number, sent_at?: Date): Promise<boolean> {
    const updateData = {
      [this.db.invoice_sent_at]: sent_at || new Date()
    };

    const affected = await this.updateOne(
      this.db.tableName,
      updateData,
      { [this.db.id]: id }
    );

    return !!affected;
  }

  /**
   * Crée un nouvel avenant
   */
  protected async create(): Promise<void> {
    await this.validate();

    // Générer le GUID automatiquement
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for license adjustment');
    }

    const lastID = await this.insertOne(this.db.tableName, {
      [this.db.guid]: guid,
      [this.db.global_license]: this.global_license,
      [this.db.adjustment_date]: this.adjustment_date || new Date(),
      [this.db.employees_added_count]: this.employees_added_count,
      [this.db.months_remaining]: this.months_remaining,
      [this.db.price_per_employee_usd]: this.price_per_employee_usd,
      [this.db.subtotal_usd]: this.subtotal_usd,
      [this.db.tax_amount_usd]: this.tax_amount_usd || 0,
      [this.db.total_amount_usd]: this.total_amount_usd,
      [this.db.billing_currency_code]: this.billing_currency_code,
      [this.db.exchange_rate_used]: this.exchange_rate_used,
      [this.db.subtotal_local]: this.subtotal_local,
      [this.db.tax_amount_local]: this.tax_amount_local || 0,
      [this.db.total_amount_local]: this.total_amount_local,
      [this.db.tax_rules_applied]: this.tax_rules_applied || [],
      [this.db.payment_status]: this.payment_status || PaymentStatus.PENDING,
      [this.db.payment_due_immediately]: this.payment_due_immediately ?? true,
      [this.db.invoice_sent_at]: this.invoice_sent_at || null,
      [this.db.payment_completed_at]: this.payment_completed_at || null,
    });

    console.log(`🟢 Avenant de licence créé - Global License: ${this.global_license} | Employees: ${this.employees_added_count} | GUID: ${guid}`);

    if (!lastID) {
      throw new Error('Failed to create license adjustment');
    }

    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;

    console.log('✅ Avenant créé avec ID:', this.id);
  }

  /**
   * Met à jour un avenant existant
   */
  protected async update(): Promise<void> {
    await this.validate();

    if (!this.id) {
      throw new Error('License Adjustment ID is required for update');
    }

    const updateData: Record<string, any> = {};
    if (this.global_license !== undefined) updateData[this.db.global_license] = this.global_license;
    if (this.adjustment_date !== undefined) updateData[this.db.adjustment_date] = this.adjustment_date;
    if (this.employees_added_count !== undefined) updateData[this.db.employees_added_count] = this.employees_added_count;
    if (this.months_remaining !== undefined) updateData[this.db.months_remaining] = this.months_remaining;
    if (this.price_per_employee_usd !== undefined) updateData[this.db.price_per_employee_usd] = this.price_per_employee_usd;
    if (this.subtotal_usd !== undefined) updateData[this.db.subtotal_usd] = this.subtotal_usd;
    if (this.tax_amount_usd !== undefined) updateData[this.db.tax_amount_usd] = this.tax_amount_usd;
    if (this.total_amount_usd !== undefined) updateData[this.db.total_amount_usd] = this.total_amount_usd;
    if (this.billing_currency_code !== undefined) updateData[this.db.billing_currency_code] = this.billing_currency_code;
    if (this.exchange_rate_used !== undefined) updateData[this.db.exchange_rate_used] = this.exchange_rate_used;
    if (this.subtotal_local !== undefined) updateData[this.db.subtotal_local] = this.subtotal_local;
    if (this.tax_amount_local !== undefined) updateData[this.db.tax_amount_local] = this.tax_amount_local;
    if (this.total_amount_local !== undefined) updateData[this.db.total_amount_local] = this.total_amount_local;
    if (this.tax_rules_applied !== undefined) updateData[this.db.tax_rules_applied] = this.tax_rules_applied;
    if (this.payment_status !== undefined) updateData[this.db.payment_status] = this.payment_status;
    if (this.payment_due_immediately !== undefined) updateData[this.db.payment_due_immediately] = this.payment_due_immediately;
    if (this.invoice_sent_at !== undefined) updateData[this.db.invoice_sent_at] = this.invoice_sent_at;
    if (this.payment_completed_at !== undefined) updateData[this.db.payment_completed_at] = this.payment_completed_at;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update license adjustment');
    }
  }

  /**
   * Supprime un avenant
   */
  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  /**
   * Valide les données avant création/mise à jour
   */
  private async validate(): Promise<void> {
    // Nettoyer les données
    LicenseAdjustmentDbStructure.validation.cleanData(this);

    // Validations de base
    if (!this.global_license) {
      throw new Error('Global license is required');
    }

    if (!this.employees_added_count || this.employees_added_count <= 0) {
      throw new Error('Employees added count must be greater than 0');
    }

    if (!this.months_remaining || this.months_remaining <= 0) {
      throw new Error('Months remaining must be greater than 0');
    }

    if (!this.price_per_employee_usd || this.price_per_employee_usd <= 0) {
      throw new Error('Price per employee USD must be greater than 0');
    }

    if (!this.billing_currency_code) {
      throw new Error('Billing currency code is required');
    }

    if (!this.exchange_rate_used || this.exchange_rate_used <= 0) {
      throw new Error('Exchange rate must be greater than 0');
    }

    // Validations métier avec la structure
    const validationResult = LicenseAdjustmentDbStructure.validation.validateAdjustmentModel({
      employees_added_count: this.employees_added_count,
      months_remaining: this.months_remaining,
      price_per_employee_usd: this.price_per_employee_usd,
      subtotal_usd: this.subtotal_usd,
      tax_amount_usd: this.tax_amount_usd,
      total_amount_usd: this.total_amount_usd,
      exchange_rate_used: this.exchange_rate_used,
      subtotal_local: this.subtotal_local,
      tax_amount_local: this.tax_amount_local,
      total_amount_local: this.total_amount_local,
      adjustment_date: this.adjustment_date,
      payment_completed_at: this.payment_completed_at,
      invoice_sent_at: this.invoice_sent_at,
    });

    if (!validationResult.isValid) {
      throw new Error(`Validation errors: ${validationResult.errors.join(', ')}`);
    }

    // Validations spécifiques
    if (this.billing_currency_code && !LicenseAdjustmentDbStructure.validation.validateBillingCurrencyCode(this.billing_currency_code)) {
      throw new Error('Invalid billing currency code format');
    }

    if (this.payment_status && !LicenseAdjustmentDbStructure.validation.validatePaymentStatus(this.payment_status)) {
      throw new Error('Invalid payment status');
    }

    if (this.tax_rules_applied && !LicenseAdjustmentDbStructure.validation.validateTaxRulesApplied(this.tax_rules_applied)) {
      throw new Error('Invalid tax rules format');
    }
  }
}