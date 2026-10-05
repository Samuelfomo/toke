import type { Sequelize } from 'sequelize';

import { paymentAmountsConsistent } from '../../services/payment-money.js';

export class CashInstallmentError extends Error {}
export function cashCents(value: unknown): bigint {
  const m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!m) throw new CashInstallmentError('Invalid cash amount');
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}
function money(n: bigint) {
  return `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
}
export interface InstallmentInput {
  transactionGuid: number;
  actorUserGuid: string;
  amountLocal: string;
  currency: string;
  receivedAt: Date;
  receiptReference: string;
  idempotencyKey: string;
}
export async function recordCashInstallment(
  db: Sequelize,
  input: InstallmentInput,
): Promise<Record<string, any>> {
  if (
    !Number.isInteger(input.transactionGuid) ||
    input.transactionGuid < 100000 ||
    input.transactionGuid > 999999 ||
    ![input.actorUserGuid, input.receiptReference, input.idempotencyKey].every(
      (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 128,
    ) ||
    !/^[A-Z]{3}$/.test(input.currency) ||
    cashCents(input.amountLocal) <= 0n ||
    !Number.isFinite(input.receivedAt.getTime()) ||
    input.receivedAt.getTime() > Date.now()
  )
    throw new CashInstallmentError('Invalid installment input');
  return db.transaction<Record<string, any>>(async (transaction) => {
    async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
      const [r] = await db.query(sql, { transaction, replacements });
      return r as any[];
    }
    const p = (
      await rows('SELECT * FROM xa_payment_transaction WHERE guid = :guid FOR UPDATE', {
        guid: input.transactionGuid,
      })
    )[0];
    if (!p) throw new CashInstallmentError('Payment not found');
    const prior = (
      await rows('SELECT * FROM xa_cash_installment WHERE idempotency_key = :key', {
        key: input.idempotencyKey,
      })
    )[0];
    if (
      prior &&
      (prior.payment_transaction !== p.id ||
        prior.actor_user_guid !== input.actorUserGuid ||
        prior.currency_code !== input.currency ||
        cashCents(prior.amount_local) !== cashCents(input.amountLocal) ||
        prior.receipt_reference !== input.receiptReference ||
        new Date(prior.received_at).getTime() !== input.receivedAt.getTime())
    )
      throw new CashInstallmentError('Conflicting installment replay');
    const c = (
      await rows('SELECT * FROM xa_billing_cycle WHERE id = :id FOR UPDATE', {
        id: p.billing_cycle,
      })
    )[0];
    if (p.source_type !== 'CYCLE' || !c)
      throw new CashInstallmentError('Installments require a monthly billing cycle');
    const l = (
      await rows('SELECT * FROM xa_global_license WHERE id = :id FOR UPDATE', {
        id: c.global_license,
      })
    )[0];
    if (!l) throw new CashInstallmentError('License missing');
    async function result(receiptId: any, replayed: boolean) {
      const [b] = await rows('SELECT * FROM xa_payment_balance WHERE id = :id', { id: p.id });
      const [settlement] = await rows(
        'SELECT access_action FROM xa_cash_installment_settlement WHERE payment_transaction = :id',
        { id: p.id },
      );
      const balance = cashCents(b.outstanding_local),
        received = cashCents(b.received_local);
      return {
        receipt_id: receiptId,
        replayed,
        amount_due_local: String(b.due_local),
        received_local: money(received),
        outstanding_local: money(balance),
        currency: input.currency,
        billing_state: balance === 0n ? 'PAID' : received > 0n ? 'PARTIALLY_PAID' : 'UNPAID',
        access_action: settlement?.access_action ?? 'NO_PAID_RIGHTS_YET',
      };
    }
    if (prior) return result(prior.id, true);
    if (
      !['PENDING', 'PROCESSING', 'FAILED'].includes(p.transaction_status) ||
      !['PENDING', 'PROCESSING', 'FAILED', 'OVERDUE'].includes(c.billing_status)
    )
      throw new CashInstallmentError('Payment already settled or unavailable');
    if (
      !(
        await rows(
          'SELECT global_license FROM xa_monthly_license_policy WHERE global_license = :id',
          { id: l.id },
        )
      ).length
    )
      throw new CashInstallmentError('Monthly policy missing');
    if (
      !(
        await rows(
          `SELECT rp.id FROM xa_renewal_preparation rp JOIN xa_commercial_transition tr ON tr.global_license = :license JOIN xa_tenant t ON t.id = :tenant
   WHERE rp.billing_cycle = :cycle AND CAST(:start AS timestamptz)>=tr.valid_until
    AND CAST(:end AS timestamptz)=((CAST(:start AS timestamptz) AT TIME ZONE COALESCE(NULLIF(t.timezone,''),'UTC'))+INTERVAL '1 month') AT TIME ZONE COALESCE(NULLIF(t.timezone,''),'UTC')`,
          {
            license: l.id,
            tenant: l.tenant,
            cycle: c.id,
            start: c.period_start,
            end: c.period_end,
          },
        )
      ).length
    )
      throw new CashInstallmentError(
        'Only new monthly cycles after transition accept installments',
      );
    const method = (
      await rows('SELECT * FROM xa_payment_method WHERE id = :id', { id: p.payment_method })
    )[0];
    if (
      !method ||
      !method.active ||
      method.method_type !== 'CASH' ||
      !method.supported_currencies?.includes(input.currency)
    )
      throw new CashInstallmentError('Active cash method supporting currency required');
    if (
      p.currency_code !== input.currency ||
      c.billing_currency_code !== input.currency ||
      cashCents(p.amount_local) !== cashCents(c.total_amount_local) ||
      cashCents(p.amount_usd) !== cashCents(c.total_amount_usd) ||
      Number(p.exchange_rate_used) !== Number(c.exchange_rate_used) ||
      !paymentAmountsConsistent(p.amount_usd, p.amount_local, p.exchange_rate_used)
    )
      throw new CashInstallmentError('Financial reconciliation required');
    if (
      (
        await rows(
          'SELECT payment_transaction FROM xa_cash_receipt WHERE payment_transaction = :id',
          { id: p.id },
        )
      ).length
    )
      throw new CashInstallmentError('Full receipt already exists');
    if (
      (
        await rows(
          `SELECT p.id FROM xa_payment_transaction p WHERE p.billing_cycle = :cycle AND p.id <> :payment
   AND (EXISTS(SELECT 1 FROM xa_cash_installment i WHERE i.payment_transaction=p.id) OR EXISTS(SELECT 1 FROM xa_cash_receipt r WHERE r.payment_transaction=p.id))`,
          { cycle: c.id, payment: p.id },
        )
      ).length
    )
      throw new CashInstallmentError('Another payment already collects this cycle');
    const [sum] = await rows(
      'SELECT COALESCE(SUM(amount_local),0) AS amount FROM xa_cash_installment WHERE payment_transaction = :id',
      { id: p.id },
    );
    const total = cashCents(sum.amount) + cashCents(input.amountLocal),
      due = cashCents(p.amount_local);
    if (total > due) throw new CashInstallmentError('Installment exceeds outstanding balance');
    const [receipt] = await rows(
      `INSERT INTO xa_cash_installment(payment_transaction,tenant,actor_user_guid,amount_local,currency_code,
   receipt_reference,idempotency_key,received_at) VALUES(:payment,:tenant,:actor,:amount,:currency,:reference,:key,:date) RETURNING id`,
      {
        payment: p.id,
        tenant: l.tenant,
        actor: input.actorUserGuid,
        amount: input.amountLocal,
        currency: input.currency,
        reference: input.receiptReference,
        key: input.idempotencyKey,
        date: input.receivedAt,
      },
    );
    if (total === due) {
      const seats = Number(c.base_employee_count),
        start = new Date(c.period_start),
        end = new Date(c.period_end),
        now = new Date();
      if (
        !Number.isInteger(seats) ||
        seats < 5 ||
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start
      )
        throw new CashInstallmentError('Invalid paid capacity');
      if (
        (
          await rows(
            `SELECT id FROM xa_paid_seat_grant WHERE global_license = :id AND source_type='CYCLE'
    AND valid_from < :end AND :start < valid_until`,
            { id: l.id, start, end },
          )
        ).length
      )
        throw new CashInstallmentError('Paid cycles overlap');
      let action = 'NO_CURRENT_COVERAGE';
      if (start > now) action = 'SCHEDULED';
      else if (end > now) {
        if (
          new Date(l.current_period_end).getTime() !== start.getTime() &&
          !(
            new Date(l.current_period_start).getTime() === start.getTime() &&
            new Date(l.current_period_end).getTime() === end.getTime()
          )
        )
          throw new CashInstallmentError('Period requires reconciliation');
        if (['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(l.license_status)) {
          await rows(
            `UPDATE xa_global_license SET current_period_start = :start,current_period_end = :end,next_renewal_date = :end,
      license_status='ACTIVE',updated_at=NOW() WHERE id = :id RETURNING id`,
            { id: l.id, start, end },
          );
          action = 'ACTIVE';
        } else action = 'MANUAL_REVIEW';
      }
      // Complete payment first so the database can verify the cycle is fully settled.
      await rows(
        "UPDATE xa_payment_transaction SET transaction_status='COMPLETED',completed_at=NOW(),updated_at=NOW() WHERE id = :id RETURNING id",
        { id: p.id },
      );
      await rows(
        "UPDATE xa_billing_cycle SET billing_status='COMPLETED',payment_completed_at=NOW(),updated_at=NOW() WHERE id = :id RETURNING id",
        { id: c.id },
      );
      await rows(
        `INSERT INTO xa_paid_seat_grant(global_license,billing_cycle,payment_transaction,source_type,seats,valid_from,valid_until)
    VALUES(:license,:cycle,:payment,'CYCLE',:seats,:start,:end) RETURNING id`,
        { license: l.id, cycle: c.id, payment: p.id, seats, start, end },
      );
      // Settlement is an aggregate certificate, not a fictitious individual cash receipt.
      await rows(
        `INSERT INTO xa_cash_installment_settlement(payment_transaction,tenant,amount_local,currency_code,access_action)
    VALUES(:payment,:tenant,:amount,:currency,:action) RETURNING payment_transaction`,
        { payment: p.id, tenant: l.tenant, amount: money(total), currency: input.currency, action },
      );
    }
    return result(receipt.id, false);
  });
}
