import { PaymentTransactionStatus } from '@toke/shared';

import BaseModel from '../database/db.base.js';
import { tableName } from '../../utils/response.model.js';
import { PaymentTransactionDbStructure } from '../database/data/payment.transaction.db.js';

export default class PaymentTransactionModel extends BaseModel {
  public readonly db = {
    tableName: tableName.PAYMENT_TRANSACTION,
    id: 'id',
    guid: 'guid',
    billing_cycle: 'billing_cycle',
    adjustment: 'adjustment',
    amount_usd: 'amount_usd',
    amount_local: 'amount_local',
    currency_code: 'currency_code',
    exchange_rate_used: 'exchange_rate_used',
    payment_method: 'payment_method',
    payment_reference: 'payment_reference',
    transaction_status: 'transaction_status',
    initiated_at: 'initiated_at',
    completed_at: 'completed_at',
    failed_at: 'failed_at',
    failure_reason: 'failure_reason',
  }

  protected id?: number;
  protected guid?: number;
  protected billing_cycle?: number;
  protected adjustment?: number;
  protected amount_usd?: number;
  protected amount_local?: number;
  protected currency_code?: string;
  protected exchange_rate_used?: number;
  protected payment_method?: number;
  protected payment_reference?: string;
  protected transaction_status?: PaymentTransactionStatus;
  protected initiated_at?: Date;
  protected completed_at?: Date;
  protected failed_at?: Date;
  protected failure_reason?: string;

  protected constructor() {
    super();
  }

  // === MÉTHODES DE RECHERCHE ===

  protected async find(id: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.id]: id });
  }

  protected async findByGuid(guid: number): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.guid]: guid });
  }

  protected async findByPaymentReference(reference: string): Promise<any> {
    return await this.findOne(this.db.tableName, { [this.db.payment_reference]: reference });
  }

  protected async listAll(conditions: Record<string, any> = {}, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.findAll(this.db.tableName, conditions, paginationOptions);
  }

  protected async listAllByTransactionStatus(status: PaymentTransactionStatus, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.listAll({ [this.db.transaction_status]: status }, paginationOptions);
  }

  protected async listAllByPaymentMethod(payment_method: number, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.listAll({ [this.db.payment_method]: payment_method }, paginationOptions);
  }

  protected async listAllByBillingCycle(billing_cycle: number, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.listAll({ [this.db.billing_cycle]: billing_cycle }, paginationOptions);
  }

  protected async listAllByLicenceAdjustment(adjustment: number, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.listAll({ [this.db.adjustment]: adjustment }, paginationOptions);
  }

  protected async listAllByCurrencyCode(code: string, paginationOptions: { offset?: number; limit?: number } = {}): Promise<any[]> {
    return await this.listAll({ [this.db.currency_code]: code }, paginationOptions);
  }

  protected async listAllByDateRange(
    startDate: Date,
    endDate: Date,
    dateField: 'initiated_at' | 'completed_at' | 'failed_at' = 'initiated_at',
    paginationOptions: { offset?: number; limit?: number } = {}
  ): Promise<any[]> {
    const conditions = {
      [`${this.db[dateField]} >= ?`]: startDate,
      [`${this.db[dateField]} <= ?`]: endDate,
    };
    return await this.listAll(conditions, paginationOptions);
  }

  protected async listAllByAmountRange(
    minAmount: number,
    maxAmount: number,
    currency: 'usd' | 'local' = 'usd',
    paginationOptions: { offset?: number; limit?: number } = {}
  ): Promise<any[]> {
    const amountField = currency === 'usd' ? this.db.amount_usd : this.db.amount_local;
    const conditions = {
      [`${amountField} >= ?`]: minAmount,
      [`${amountField} <= ?`]: maxAmount,
    };
    return await this.listAll(conditions, paginationOptions);
  }

  // === MÉTHODES D'AGRÉGATION ===

  // protected async getTotalAmountByStatus(status: PaymentTransactionStatus, currency: 'usd' | 'local' = 'usd'): Promise<number> {
  //   const amountField = currency === 'usd' ? this.db.amount_usd : this.db.amount_local;
  //   const result = await this.aggregate(this.db.tableName, 'SUM', amountField, { [this.db.transaction_status]: status });
  //   return result || 0;
  // }

  protected async getTransactionCountByStatus(status: PaymentTransactionStatus): Promise<number> {
    return await this.count(this.db.tableName, { [this.db.transaction_status]: status });
  }

  protected async getTransactionCountByPaymentMethod(paymentMethodId: number): Promise<number> {
    return await this.count(this.db.tableName, { [this.db.payment_method]: paymentMethodId });
  }

  // === MÉTHODES DE MODIFICATION ===

  protected async create(): Promise<void> {
    await this.validate();
    const guid = await this.guidGenerator(this.db.tableName, 6);
    if (!guid) {
      throw new Error('Failed to generate GUID for payment transaction entry');
    }

    const reference = await this.timeBasedTokenGenerator(this.db.tableName, 3, '_', 'TOKE');
    if (!reference) {
      throw new Error('Failed to generate Reference for payment transaction entry');
    }

    const insertData: Record<string, any> = {
      [this.db.guid]: guid,
      [this.db.billing_cycle]: this.billing_cycle,
      [this.db.adjustment]: this.adjustment,
      [this.db.amount_usd]: this.amount_usd,
      [this.db.amount_local]: this.amount_local,
      [this.db.currency_code]: this.currency_code,
      [this.db.exchange_rate_used]: this.exchange_rate_used,
      [this.db.payment_method]: this.payment_method,
      [this.db.payment_reference]: reference,
      [this.db.transaction_status]: PaymentTransactionStatus.PENDING,
      [this.db.initiated_at]: this.initiated_at || new Date(),
    };

    const lastID = await this.insertOne(this.db.tableName, insertData);
    if (!lastID) {
      throw new Error('Failed to create payment transaction entry');
    }
    this.id = typeof lastID === 'object' ? lastID.id : lastID;
    this.guid = guid;
    this.payment_reference = reference;
    this.transaction_status = PaymentTransactionStatus.PENDING;
    if (!this.initiated_at) {
      this.initiated_at = new Date();
    }
  }

  protected async update(): Promise<void> {
    await this.validate();
    if (!this.id) {
      throw new Error('Payment transaction ID is required for update');
    }

    const updateData: Record<string, any> = {};

    // Mise à jour conditionnelle des champs
    if (this.billing_cycle !== undefined) updateData[this.db.billing_cycle] = this.billing_cycle;
    if (this.adjustment !== undefined) updateData[this.db.adjustment] = this.adjustment;
    if (this.amount_usd !== undefined) updateData[this.db.amount_usd] = this.amount_usd;
    if (this.amount_local !== undefined) updateData[this.db.amount_local] = this.amount_local;
    if (this.currency_code !== undefined) updateData[this.db.currency_code] = this.currency_code;
    if (this.exchange_rate_used !== undefined) updateData[this.db.exchange_rate_used] = this.exchange_rate_used;
    if (this.payment_method !== undefined) updateData[this.db.payment_method] = this.payment_method;
    if (this.payment_reference !== undefined) updateData[this.db.payment_reference] = this.payment_reference;
    if (this.transaction_status !== undefined) updateData[this.db.transaction_status] = this.transaction_status;
    if (this.initiated_at !== undefined) updateData[this.db.initiated_at] = this.initiated_at;
    if (this.completed_at !== undefined) updateData[this.db.completed_at] = this.completed_at;
    if (this.failed_at !== undefined) updateData[this.db.failed_at] = this.failed_at;
    if (this.failure_reason !== undefined) updateData[this.db.failure_reason] = this.failure_reason;

    const affected = await this.updateOne(this.db.tableName, updateData, { [this.db.id]: this.id });
    if (!affected) {
      throw new Error('Failed to update payment transaction entry');
    }
  }

  protected async trash(id: number): Promise<boolean> {
    return await this.deleteOne(this.db.tableName, { [this.db.id]: id });
  }

  // === MÉTHODES DE VALIDATION ===

  protected async markAsProcessing(): Promise<void> {
    this.transaction_status = PaymentTransactionStatus.PROCESSING;
    await this.update();
  }

  // === MÉTHODES DE STATUT ===

  protected async markAsCompleted(): Promise<void> {
    this.transaction_status = PaymentTransactionStatus.COMPLETED;
    this.completed_at = new Date();
    await this.update();
  }

  protected async markAsFailed(reason: string): Promise<void> {
    this.transaction_status = PaymentTransactionStatus.FAILED;
    this.failed_at = new Date();
    this.failure_reason = reason;
    await this.update();
  }

  protected async markAsCancelled(): Promise<void> {
    this.transaction_status = PaymentTransactionStatus.CANCELLED;
    await this.update();
  }

  protected async markAsRefunded(): Promise<void> {
    this.transaction_status = PaymentTransactionStatus.REFUNDED;
    await this.update();
  } 

  private async validate(): Promise<void> {
    const validationResult = PaymentTransactionDbStructure.validation.validateTransactionModel({
      billing_cycle: this.billing_cycle,
      adjustment: this.adjustment,
      amount_usd: this.amount_usd,
      amount_local: this.amount_local,
      currency_code: this.currency_code,
      exchange_rate_used: this.exchange_rate_used,
      payment_method: this.payment_method,
      payment_reference: this.payment_reference,
      transaction_status: this.transaction_status,
      initiated_at: this.initiated_at,
      completed_at: this.completed_at,
      failed_at: this.failed_at,
      failure_reason: this.failure_reason,
    });

    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }
  }
}