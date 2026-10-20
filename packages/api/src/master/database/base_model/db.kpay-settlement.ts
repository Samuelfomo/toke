import { reconcileAccessAfterFinancialChange } from './db.usage-regularization-access.js';
import type { Sequelize, Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';
import { guid, PaymentAttemptError, providerFor, wholeXaf, } from '../../class/payment-attempt-contract.js';
import { decimalUnits } from '../../services/renewal-amounts.js';
import type { KpayPayment } from '../../services/kpay-client.js';

export default class KpaySettlementDb {
  constructor(private readonly connection?: Sequelize) {}

  async candidate(tenant: number, attempt: number, transaction?: Transaction) {
    return (
      (
        await this.rows(
          `SELECT a.*,p.guid AS payment_transaction_guid FROM public.xa_payment_attempt a JOIN public.xa_payment_transaction p ON p.id=a.payment_transaction JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle JOIN public.xa_global_license l ON l.id=c.global_license JOIN public.xa_tenant t ON t.id=l.tenant WHERE t.guid=:tenant AND a.guid=:attempt`,
          { tenant: guid(tenant), attempt: guid(attempt) },
          transaction,
        )
      )[0] ?? null
    );
  }

  async pending(afterGuid = 0) {
    return this.rows(
      `SELECT a.guid,t.guid AS tenant_guid FROM public.xa_payment_attempt a JOIN public.xa_payment_transaction p ON p.id=a.payment_transaction JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle JOIN public.xa_global_license l ON l.id=c.global_license JOIN public.xa_tenant t ON t.id=l.tenant WHERE a.guid>:after AND a.environment='LIVE' AND a.status='COMPLETED' AND a.provider='KPAY' AND a.provider_payment_id IS NOT NULL AND (p.transaction_status<>'COMPLETED' OR c.billing_status<>'COMPLETED' OR NOT EXISTS(SELECT 1 FROM public.xa_paid_seat_grant g WHERE g.payment_transaction=p.id) OR (t.status='ACTIVE' AND l.license_status IN ('ACTIVE','PENDING_PAYMENT','EXPIRED') AND c.period_start<=CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP<c.period_end AND NOT EXISTS(SELECT 1 FROM public.xa_license_cycle_activation x WHERE x.billing_cycle=c.id))) ORDER BY a.guid LIMIT 10`,
      { after: afterGuid },
    );
  }

  async settle(tenant: number, attemptGuid: number, verified: KpayPayment) {
    guid(tenant);
    guid(attemptGuid);
    if (verified.status !== 'COMPLETED' || verified.isTest !== false)
      throw new PaymentAttemptError('Only a verified LIVE completion may settle');
    return this.db().transaction(async (tx) => {
      const initial = await this.candidate(tenant, attemptGuid, tx);
      if (!initial) throw new PaymentAttemptError('Attempt not found', 404);
      // Same lock order as existing cash/activation paths, then the attempt.
      const p = (
        await this.rows(
          'SELECT * FROM public.xa_payment_transaction WHERE id=:id FOR UPDATE',
          { id: initial.payment_transaction },
          tx,
        )
      )[0];
      if (!p || p.source_type !== 'CYCLE' || p.billing_cycle == null || p.adjustment != null)
        throw new PaymentAttemptError('Only a cycle payment is supported');
      const c = (
        await this.rows(
          'SELECT * FROM public.xa_billing_cycle WHERE id=:id FOR UPDATE',
          { id: p.billing_cycle },
          tx,
        )
      )[0];
      if (!c) throw new PaymentAttemptError('Cycle missing');
      const l = (
        await this.rows(
          'SELECT * FROM public.xa_global_license WHERE id=:id FOR UPDATE',
          { id: c.global_license },
          tx,
        )
      )[0];
      const a = (
        await this.rows(
          'SELECT * FROM public.xa_payment_attempt WHERE guid=:guid FOR UPDATE',
          { guid: attemptGuid },
          tx,
        )
      )[0];
      const t = l
        ? (
            await this.rows(
              'SELECT id,guid,status FROM public.xa_tenant WHERE id=:id',
              { id: l.tenant },
              tx,
            )
          )[0]
        : null;
      if (
        !a ||
        !l ||
        !t ||
        Number(t.guid) !== tenant ||
        a.payment_transaction !== p.id ||
        a.environment !== 'LIVE' ||
        a.provider !== 'KPAY' ||
        a.status !== 'COMPLETED' ||
        !a.completed_at
      )
        throw new PaymentAttemptError('Attempt is not a confirmed LIVE payment of this tenant');
      if (
        a.provider_payment_id !== verified.id ||
        a.provider_reference !== verified.reference ||
        a.external_id !== verified.externalId ||
        a.phone_number !== verified.phoneNumber ||
        a.operator !== verified.provider ||
        verified.currency !== 'XAF' ||
        a.currency_code !== 'XAF' ||
        p.currency_code !== 'XAF' ||
        c.billing_currency_code !== 'XAF' ||
        wholeXaf(a.amount_local) !== verified.amount ||
        wholeXaf(p.amount_local) !== verified.amount ||
        wholeXaf(c.total_amount_local) !== verified.amount ||
        decimalUnits(p.amount_usd, 2) !== decimalUnits(c.total_amount_usd, 2) ||
        decimalUnits(p.exchange_rate_used, 6) !== decimalUnits(c.exchange_rate_used, 6)
      )
        throw new PaymentAttemptError('Payment proof and invoice mismatch');
      if (decimalUnits(p.amount_usd, 2) <= 0n || decimalUnits(p.exchange_rate_used, 6) <= 0n)
        throw new PaymentAttemptError('Invalid invoice amount or exchange rate');
      if (l.billing_mode !== 'PREPAID' || c.billing_mode !== 'PREPAID')
        throw new PaymentAttemptError('Initial prepaid cycle required');
      const method = (
        await this.rows(
          'SELECT * FROM public.xa_payment_method WHERE id=:id',
          { id: p.payment_method },
          tx,
        )
      )[0];
      if (
        !method ||
        method.method_type !== 'MOBILE_MONEY' ||
        providerFor(method.code) !== a.operator
      )
        throw new PaymentAttemptError('Payment method changed; reconciliation required');
      // Restrict this release to first subscriptions, never legacy cycles or amendments.
      const created = await this.rows(
        `SELECT guid FROM public.xa_license_event WHERE global_license=:license AND event_type='LICENSE_CREATED' AND new_payload->>'billing_cycle_guid'=:cycle AND new_payload->>'payment_transaction_guid'=:payment`,
        { license: l.id, cycle: String(c.guid), payment: String(p.guid) },
        tx,
      );
      if (created.length !== 1)
        throw new PaymentAttemptError('Initial subscription proof required');
      if (
        !['PENDING', 'PROCESSING', 'FAILED', 'COMPLETED'].includes(p.transaction_status) ||
        !['PENDING', 'PROCESSING', 'FAILED', 'OVERDUE', 'COMPLETED'].includes(c.billing_status)
      )
        throw new PaymentAttemptError('Payment or cycle requires review');
      const other = await this.rows(
        `SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle AND id<>:payment AND transaction_status='COMPLETED'`,
        { cycle: c.id, payment: p.id },
        tx,
      );
      const cash = await this.rows(
        `SELECT 1 FROM public.xa_cash_receipt WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle) UNION ALL SELECT 1 FROM public.xa_cash_installment WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle) UNION ALL SELECT 1 FROM public.xa_cash_installment_settlement WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle)`,
        { cycle: c.id },
        tx,
      );
      if (other.length || cash.length)
        throw new PaymentAttemptError('Another settlement or cash history requires review');
      const start = new Date(c.period_start),
        end = new Date(c.period_end),
        now = new Date();
      const seats = Number(c.base_employee_count);
      if (!Number.isInteger(Number(l.minimum_seats)) || Number(l.minimum_seats) < 1)
        throw new PaymentAttemptError('Invalid minimum capacity');
      if (
        (p.transaction_status === 'COMPLETED' && !p.completed_at) ||
        (c.billing_status === 'COMPLETED' && !c.payment_completed_at)
      )
        throw new PaymentAttemptError('Existing completion timestamps require reconciliation');
      if (
        !Number.isFinite(new Date(p.initiated_at).getTime()) ||
        new Date(p.initiated_at) > now ||
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start ||
        !Number.isInteger(seats) ||
        seats < Number(l.minimum_seats) ||
        Number(c.final_employee_count) !== seats
      )
        throw new PaymentAttemptError('Invalid initial period or capacity');
      const overlap = await this.rows(
        `SELECT id FROM public.xa_paid_seat_grant WHERE global_license=:license AND source_type='CYCLE' AND billing_cycle<>:cycle AND valid_from<:end AND :start<valid_until`,
        { license: l.id, cycle: c.id, start, end },
        tx,
      );
      if (overlap.length) throw new PaymentAttemptError('Paid periods overlap');
      const grants = await this.rows(
        "SELECT * FROM public.xa_paid_seat_grant WHERE payment_transaction=:payment OR (billing_cycle=:cycle AND source_type='CYCLE')",
        { payment: p.id, cycle: c.id },
        tx,
      );
      if (
        grants.length > 1 ||
        grants.some(
          (g) =>
            g.payment_transaction !== p.id ||
            g.billing_cycle !== c.id ||
            g.global_license !== l.id ||
            g.source_type !== 'CYCLE' ||
            g.adjustment != null ||
            Number(g.seats) !== seats ||
            new Date(g.valid_from).getTime() !== start.getTime() ||
            new Date(g.valid_until).getTime() !== end.getTime(),
        )
      )
        throw new PaymentAttemptError('Existing capacity requires reconciliation');
      const replayed =
        p.transaction_status === 'COMPLETED' &&
        c.billing_status === 'COMPLETED' &&
        grants.length === 1;
      const activated = (
        await this.rows(
          'SELECT * FROM public.xa_license_cycle_activation WHERE billing_cycle=:cycle',
          { cycle: c.id },
          tx,
        )
      )[0];
      if (
        activated &&
        (activated.payment_transaction !== p.id || activated.global_license !== l.id)
      )
        throw new PaymentAttemptError('Activation history mismatch');
      if (!grants.length)
        await this.rows(
          `INSERT INTO public.xa_paid_seat_grant (global_license,billing_cycle,adjustment,payment_transaction,source_type,seats,valid_from,valid_until) VALUES (:license,:cycle,NULL,:payment,'CYCLE',:seats,:start,:end) RETURNING id`,
          { license: l.id, cycle: c.id, payment: p.id, seats, start, end },
          tx,
        );
      if (p.transaction_status !== 'COMPLETED')
        await this.rows(
          "UPDATE public.xa_payment_transaction SET transaction_status='COMPLETED',completed_at=:now,failed_at=NULL,failure_reason=NULL,updated_at=:now WHERE id=:id RETURNING id",
          { id: p.id, now },
          tx,
        );
      if (c.billing_status !== 'COMPLETED')
        await this.rows(
          "UPDATE public.xa_billing_cycle SET billing_status='COMPLETED',payment_completed_at=:now,updated_at=:now WHERE id=:id RETURNING id",
          { id: c.id, now },
          tx,
        );
      let accessAction = 'NO_CURRENT_COVERAGE';
      if (
        t.status !== 'ACTIVE' ||
        !['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(l.license_status)
      )
        accessAction = 'MANUAL_REVIEW';
      else if (start > now) accessAction = 'SCHEDULED';
      else if (end > now) {
        const same =
          new Date(l.current_period_start).getTime() === start.getTime() &&
          new Date(l.current_period_end).getTime() === end.getTime();
        if (!same) accessAction = 'MANUAL_REVIEW';
        else if (activated)
          accessAction = l.license_status === 'ACTIVE' ? 'ACTIVE' : 'MANUAL_REVIEW';
        else {
          const next = (
            await this.rows(
              "UPDATE public.xa_global_license SET license_status='ACTIVE',next_renewal_date=:end,updated_at=:now WHERE id=:id RETURNING *",
              { id: l.id, end, now },
              tx,
            )
          )[0];
          await this.rows(
            `INSERT INTO public.xa_license_cycle_activation (global_license,billing_cycle,payment_transaction,previous_license,new_license) VALUES (:license,:cycle,:payment,CAST(:previous AS jsonb),CAST(:next AS jsonb)) RETURNING id`,
            {
              license: l.id,
              cycle: c.id,
              payment: p.id,
              previous: JSON.stringify(l),
              next: JSON.stringify(next),
            },
            tx,
          );
          accessAction = 'ACTIVE';
        }
      }
      if (accessAction === 'ACTIVE') {
        await reconcileAccessAfterFinancialChange(this.db(), l.id, tx);
        const updated = (await this.rows('SELECT license_status FROM public.xa_global_license WHERE id=:id', {id:l.id}, tx))[0];
        const decision = (await this.rows('SELECT * FROM public.monthly_license_access(:id)', {id:l.id}, tx))[0];
        if (updated?.license_status !== 'ACTIVE' || decision?.allowed !== true) accessAction = 'MANUAL_REVIEW';
      }
      return {
        status: 'COMPLETED',
        replayed,
        payment_transaction_guid: Number(p.guid),
        billing_cycle_guid: Number(c.guid),
        license_guid: Number(l.guid),
        paid_seats: seats,
        access_action: accessAction,
      };
    });
  }

  private db(): Sequelize {
    const db = this.connection ?? TableInitializer.getModel('xa_payment_transaction').sequelize;
    if (!db) throw new PaymentAttemptError('Master database unavailable', 503);
    return db;
  }

  private async rows(
    sql: string,
    replacements: Record<string, any> = {},
    transaction?: Transaction,
  ): Promise<any[]> {
    const [r] = await this.db().query(sql, { replacements, transaction });
    return r as any[];
  }
}
