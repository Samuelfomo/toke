import type { KpayPayment } from '../services/kpay-client.js';
import PaymentAttemptModel from '../model/PaymentAttemptModel.js';

import { type AttemptStatus, normalizeAttempt, type PaymentAttemptInput, } from './payment-attempt-contract.js';

/** Entity facade. Mutable provider states will be written by the trusted reconciliation layer. */
export default class PaymentAttempt extends PaymentAttemptModel {
  private request: Partial<PaymentAttemptInput> = {};
  private replayed = false;
  setTenantGuid(v: number): this {
    this.request.tenantGuid = v;
    return this;
  }
  setPaymentTransactionGuid(v: number): this {
    this.request.transactionGuid = v;
    return this;
  }
  setPhoneNumber(v: string): this {
    this.request.phoneNumber = v;
    return this;
  }
  setIdempotencyKey(v: string): this {
    this.request.idempotencyKey = v;
    return this;
  }
  setEnvironment(v: 'TEST' | 'LIVE'): this {
    this.request.environment = v;
    return this;
  }
  getGuid(): number | undefined {
    return this.record.guid;
  }
  getPaymentTransactionGuid(): number | undefined {
    return this.record.payment_transaction_guid ?? this.request.transactionGuid;
  }
  getStatus(): AttemptStatus | undefined {
    return this.record.status;
  }
  getEnvironment(): string | undefined {
    return this.record.environment ?? this.request.environment;
  }
  getPhoneNumber(): string | undefined {
    return this.record.phone_number ?? this.request.phoneNumber;
  }
  getExternalId(): string | undefined {
    return this.record.external_id;
  }
  getProviderPaymentId(): string | null {
    return this.record.provider_payment_id ?? null;
  }
  getProviderReference(): string | null {
    return this.record.provider_reference ?? null;
  }
  getAmountLocal(): string | undefined {
    return this.record.amount_local == null ? undefined : String(this.record.amount_local);
  }
  getCurrencyCode(): string | undefined {
    return this.record.currency_code;
  }
  getOperator(): string | undefined {
    return this.record.operator;
  }
  isReplay(): boolean {
    return this.replayed;
  }
  hydrate(row: Record<string, any>): this {
    this.record = { ...row };
    return this;
  }
  async save(): Promise<this> {
    const result = await this.reserveStored(normalizeAttempt(this.request as PaymentAttemptInput));
    this.replayed = result.replayed;
    return this.hydrate(result.row);
  }
  async listForTransaction(tenant: number, payment: number) {
    return (await this.listStored(tenant, payment)).map((row) =>
      new PaymentAttempt(this.data).hydrate(row).toJSON(),
    );
  }
  async load(tenantGuid: number, attemptGuid: number): Promise<this | null> {
    const row = await this.loadStored(tenantGuid, attemptGuid);
    return row ? this.hydrate(row) : null;
  }
  async markDispatched(tenant: number): Promise<this> {
    if (!this.getGuid()) throw new Error('Attempt must be persisted');
    return this.hydrate(await this.markDispatchStored(tenant, this.getGuid()!));
  }
  async claimStatusRefresh(tenant: number): Promise<boolean> {
    if (!this.getGuid()) return false;
    return this.claimRefreshStored(tenant, this.getGuid()!);
  }
  async recordVerifiedProviderResult(tenant: number, result: KpayPayment): Promise<this> {
    if (!this.getGuid()) throw new Error('Attempt must be persisted');
    return this.hydrate(await this.recordProviderStored(tenant, this.getGuid()!, result));
  }
  toJSON() {
    const phone = this.getPhoneNumber();
    return {
      guid: this.getGuid(),
      payment_transaction_guid: this.getPaymentTransactionGuid(),
      status: this.getStatus(),
      amount_local: this.getAmountLocal(),
      currency_code: this.getCurrencyCode(),
      phone_masked: phone ? '*******' + phone.slice(-3) : null,
      created_at: this.record.created_at ?? null,
      updated_at: this.record.updated_at ?? null,
      completed_at: this.record.completed_at ?? null,
      failed_at: this.record.failed_at ?? null,
    };
  }
}
