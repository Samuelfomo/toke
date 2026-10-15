import { randomUUID } from 'node:crypto';

import type { Sequelize, Transaction } from 'sequelize';

import type { KpayWebhookEvent } from '../../services/kpay-webhook-signature.js';
import type { KpayPayment } from '../../services/kpay-client.js';
import { TableInitializer } from '../db.initializer.js';
import {
  guid,
  normalizeAttempt,
  PaymentAttemptError,
  type PaymentAttemptInput,
  providerFor,
  wholeXaf,
} from '../../class/payment-attempt-contract.js';

export default class PaymentAttemptDb {
  constructor(private readonly connection?: Sequelize) {}

  async load(tenantGuid: number, attemptGuid: number) {
    guid(tenantGuid);
    guid(attemptGuid);
    return (
      (
        await this.rows(this.select() + ' WHERE t.guid=:tenant AND a.guid=:attempt', {
          tenant: tenantGuid,
          attempt: attemptGuid,
        })
      )[0] ?? null
    );
  }

  async list(tenantGuid: number, transactionGuid: number) {
    return this.rows(
      this.select() + ' WHERE t.guid=:tenant AND p.guid=:payment ORDER BY a.id DESC LIMIT 20',
      { tenant: guid(tenantGuid), payment: guid(transactionGuid) },
    );
  }

  async reserve(input: PaymentAttemptInput): Promise<{ row: any; replayed: boolean }> {
    const i = normalizeAttempt(input);
    return this.database().transaction(async (tx) => {
      const p = (
        await this.rows(
          `SELECT p.*,t.status AS tenant_status,l.license_status,l.billing_mode,c.billing_status,c.total_amount_local,c.billing_currency_code,m.code AS method_code,m.active AS method_active,m.method_type,m.supported_currencies FROM public.xa_payment_transaction p JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle JOIN public.xa_global_license l ON l.id=c.global_license JOIN public.xa_tenant t ON t.id=l.tenant JOIN public.xa_payment_method m ON m.id=p.payment_method WHERE p.guid=:payment AND t.guid=:tenant FOR UPDATE OF p`,
          { payment: i.transactionGuid, tenant: i.tenantGuid },
          tx,
        )
      )[0];
      if (!p) throw new PaymentAttemptError('Transaction not found for tenant', 404);
      const existing = (
        await this.rows(
          'SELECT * FROM public.xa_payment_attempt WHERE payment_transaction=:id AND idempotency_key=:key',
          { id: p.id, key: i.idempotencyKey },
          tx,
        )
      )[0];
      if (existing) {
        if (existing.phone_number !== i.phoneNumber || existing.environment !== i.environment)
          throw new PaymentAttemptError('Idempotency key reused with different input');
        return { row: { ...existing, payment_transaction_guid: p.guid }, replayed: true };
      }
      if (
        p.tenant_status !== 'ACTIVE' ||
        !['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(p.license_status) ||
        p.billing_mode !== 'PREPAID' ||
        p.source_type !== 'CYCLE' ||
        !['PENDING', 'FAILED'].includes(p.transaction_status) ||
        !['PENDING', 'OVERDUE', 'FAILED'].includes(p.billing_status)
      )
        throw new PaymentAttemptError('Transaction is not eligible for initial prepaid payment');
      if (
        !p.method_active ||
        p.method_type !== 'MOBILE_MONEY' ||
        p.currency_code !== 'XAF' ||
        p.billing_currency_code !== 'XAF' ||
        !p.supported_currencies?.includes('XAF')
      )
        throw new PaymentAttemptError('Incompatible payment method or currency');
      const amount = wholeXaf(p.amount_local);
      if (amount !== wholeXaf(p.total_amount_local))
        throw new PaymentAttemptError('Invoice and transaction amounts differ');
      const operator = providerFor(p.method_code);
      const active = await this.rows(
        "SELECT guid FROM public.xa_payment_attempt WHERE payment_transaction=:id AND status IN ('CREATED','UNKNOWN','PENDING','PROCESSING','COMPLETED')",
        { id: p.id },
        tx,
      );
      if (active.length)
        throw new PaymentAttemptError('Existing payment attempt must be reconciled before retry');
      // Cash partial history must never be paid again in full via this initial-payment path.
      const balance = (
        await this.rows(
          'SELECT received_local FROM public.xa_payment_balance WHERE guid=:guid',
          { guid: p.guid },
          tx,
        )
      )[0];
      if (!balance || !/^0(?:\.0{1,2})?$/.test(String(balance.received_local)))
        throw new PaymentAttemptError(
          'Existing receipts or unavailable balance require reconciliation',
        );
      const row = (
        await this.rows(
          `INSERT INTO public.xa_payment_attempt (payment_transaction,provider,operator,environment,external_id,idempotency_key,phone_number,amount_local,currency_code) VALUES (:id,'KPAY',:operator,:environment,:external,:key,:phone,:amount,'XAF') RETURNING *`,
          {
            id: p.id,
            operator,
            environment: i.environment,
            external: 'TOKE_' + randomUUID(),
            key: i.idempotencyKey,
            phone: i.phoneNumber,
            amount,
          },
          tx,
        )
      )[0];
      return { row: { ...row, payment_transaction_guid: p.guid }, replayed: false };
    });
  }

  async markDispatch(tenantGuid: number, attemptGuid: number) {
    const row = await this.load(tenantGuid, attemptGuid);
    if (!row) throw new PaymentAttemptError('Attempt not found', 404);
    const changed = await this.rows(
      "UPDATE public.xa_payment_attempt SET status='UNKNOWN',updated_at=CURRENT_TIMESTAMP WHERE guid=:guid AND status='CREATED' RETURNING *",
      { guid: attemptGuid },
    );
    if (!changed.length)
      throw new PaymentAttemptError('Attempt already dispatched or requires reconciliation');
    return { ...changed[0], payment_transaction_guid: row.payment_transaction_guid };
  }

  async claimRefresh(tenantGuid: number, attemptGuid: number): Promise<boolean> {
    const rows = await this.rows(
      `UPDATE public.xa_payment_attempt a SET updated_at=CURRENT_TIMESTAMP FROM public.xa_payment_transaction p,public.xa_billing_cycle c,public.xa_global_license l,public.xa_tenant t WHERE a.guid=:guid AND a.payment_transaction=p.id AND p.billing_cycle=c.id AND c.global_license=l.id AND l.tenant=t.id AND t.guid=:tenant AND a.status IN ('UNKNOWN','PENDING','PROCESSING') AND a.updated_at<CURRENT_TIMESTAMP-INTERVAL '3 seconds' RETURNING a.guid`,
      { guid: guid(attemptGuid), tenant: guid(tenantGuid) },
    );
    return rows.length === 1;
  }

  async recordProvider(tenantGuid: number, attemptGuid: number, result: KpayPayment) {
    return this.database().transaction(async (tx) => {
      const row = (
        await this.rows(
          this.select() + ' WHERE t.guid=:tenant AND a.guid=:attempt FOR UPDATE OF a',
          { tenant: guid(tenantGuid), attempt: guid(attemptGuid) },
          tx,
        )
      )[0];
      if (!row) throw new PaymentAttemptError('Attempt not found', 404);
      if (
        row.external_id !== result.externalId ||
        wholeXaf(row.amount_local) !== result.amount ||
        row.currency_code !== result.currency ||
        row.operator !== result.provider ||
        row.phone_number !== result.phoneNumber ||
        (row.environment === 'TEST') !== result.isTest ||
        !result.id ||
        !result.reference ||
        (row.provider_payment_id && row.provider_payment_id !== result.id) ||
        (row.provider_reference && row.provider_reference !== result.reference)
      )
        throw new PaymentAttemptError('Provider result mismatch; reconciliation required');
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(row.status)) {
        if (row.status !== result.status)
          throw new PaymentAttemptError(
            'Contradictory terminal result; manual reconciliation required',
          );
        return row;
      }
      // Delayed polling must not regress a webhook or a concurrent PROCESSING update.
      if (row.status === 'PROCESSING' && result.status === 'PENDING') return row;
      const terminalFailure = ['FAILED', 'CANCELLED'].includes(result.status);
      const changed = (
        await this.rows(
          `UPDATE public.xa_payment_attempt SET provider_payment_id=:providerId,provider_reference=:reference,status=:status,updated_at=CURRENT_TIMESTAMP,
    completed_at=CASE WHEN :status='COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END,
    failed_at=CASE WHEN :failed THEN CURRENT_TIMESTAMP ELSE NULL END,
    failure_reason=CASE WHEN :failed THEN 'Provider reported unsuccessful payment' ELSE NULL END WHERE guid=:guid RETURNING *`,
          {
            providerId: result.id,
            reference: result.reference,
            status: result.status,
            failed: terminalFailure,
            guid: attemptGuid,
          },
          tx,
        )
      )[0];
      return { ...changed, payment_transaction_guid: row.payment_transaction_guid };
    });
  }

  async pending(environment: 'TEST' | 'LIVE') {
    return this.rows(
      this.select() +
        " WHERE a.environment=:environment AND a.provider_payment_id IS NOT NULL AND a.status IN ('UNKNOWN','PENDING','PROCESSING') AND a.updated_at<CURRENT_TIMESTAMP-INTERVAL '3 seconds' ORDER BY a.updated_at,a.id LIMIT 10",
      { environment },
    );
  }

  async bindWebhook(event: KpayWebhookEvent, environment: 'TEST' | 'LIVE') {
    return this.database().transaction(async (tx) => {
      const row = (
        await this.rows(
          this.select() + ` WHERE a.external_id=:external AND a.provider='KPAY' FOR UPDATE OF a`,
          { external: event.externalId },
          tx,
        )
      )[0];
      if (!row) throw new PaymentAttemptError('Unknown payment attempt', 404);
      if (
        row.environment !== environment ||
        (event.isTest != null && event.isTest !== (row.environment === 'TEST')) ||
        wholeXaf(row.amount_local) !== event.amount ||
        row.currency_code !== 'XAF' ||
        row.phone_number !== event.phoneNumber ||
        (row.provider_payment_id && row.provider_payment_id !== event.paymentId) ||
        (row.provider_reference && row.provider_reference !== event.reference)
      )
        throw new PaymentAttemptError('Webhook identity mismatch');
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(row.status)) {
        if (row.status !== event.status)
          throw new PaymentAttemptError(
            'Contradictory terminal webhook; manual reconciliation required',
          );
        return row;
      }
      // Persist the provider identity before acknowledgement. Never trust missing webhook currency/environment fields as proof of settlement.
      const updated = (
        await this.rows(
          `UPDATE public.xa_payment_attempt SET provider_payment_id=:providerId,provider_reference=:reference,
    status=CASE WHEN status='CREATED' THEN 'UNKNOWN' ELSE status END WHERE guid=:guid RETURNING *`,
          { providerId: event.paymentId, reference: event.reference, guid: row.guid },
          tx,
        )
      )[0];
      return {
        ...updated,
        payment_transaction_guid: row.payment_transaction_guid,
        tenant_guid: row.tenant_guid,
      };
    });
  }

  private database(): Sequelize {
    const db = this.connection ?? TableInitializer.getModel('xa_payment_transaction').sequelize;
    if (!db) throw new PaymentAttemptError('Master database unavailable', 503);
    return db;
  }

  private async rows(
    sql: string,
    replacements: Record<string, any>,
    transaction?: Transaction,
  ): Promise<any[]> {
    const [rows] = await this.database().query(sql, { replacements, transaction });
    return rows as any[];
  }

  private select() {
    return `SELECT a.*,p.guid AS payment_transaction_guid,t.guid AS tenant_guid FROM public.xa_payment_attempt a JOIN public.xa_payment_transaction p ON p.id=a.payment_transaction JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle JOIN public.xa_global_license l ON l.id=c.global_license JOIN public.xa_tenant t ON t.id=l.tenant`;
  }
}
