import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';
import { centsText, decimalUnits } from '../../services/renewal-amounts.js';

export class PostpaidCashError extends Error {}
export interface PostpaidCashInput {
  tenant: number;
  payment: number;
  actor: string;
  amount: string;
  currency: string;
  receivedAt: string;
  reference: string;
  key: string;
}
export function cashBalance(due: unknown, received: unknown, amount: unknown) {
  const d = decimalUnits(due, 2),
    r = decimalUnits(received, 2),
    a = decimalUnits(amount, 2);
  if (a <= 0n || r > d || r + a > d)
    throw new PostpaidCashError('Amount exceeds outstanding balance or is not positive');
  return { received: centsText(r + a), outstanding: centsText(d - r - a), settled: r + a === d };
}
export default class PostpaidCashDb {
  constructor(private readonly connection?: Sequelize) {}

  async access(tenant: number, license: number): Promise<Record<string, any>> {
    const [r] = await this.db().query(
      `SELECT t.guid AS tenant_guid,l.guid AS license_guid,a.allowed,a.basis,a.access_until
   FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant
   CROSS JOIN LATERAL public.monthly_license_access(l.id) a WHERE l.guid=:license AND t.guid=:tenant`,
      { replacements: { tenant, license } },
    );
    const row = (r as any[])[0];
    if (!row) throw new PostpaidCashError('License does not belong to tenant');
    return row;
  }

  async receive(i: PostpaidCashInput): Promise<Record<string, any>> {
    const db = this.db();
    return db.transaction<Record<string, any>>(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [r] = await db.query(sql, { transaction, replacements });
        return r as any[];
      };
      const locator = (
        await rows(
          `SELECT c.global_license,c.id AS cycle_id FROM public.xa_payment_transaction p
    JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle WHERE p.guid=:guid AND p.source_type='CYCLE'`,
          { guid: i.payment },
        )
      )[0];
      if (!locator) throw new PostpaidCashError('Cycle payment not found');
      const l = (
        await rows(
          `SELECT l.*,t.guid AS tenant_guid FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant
    WHERE l.id=:id AND t.guid=:tenant FOR UPDATE OF l`,
          { id: locator.global_license, tenant: i.tenant },
        )
      )[0];
      if (!l) throw new PostpaidCashError('Payment does not belong to tenant');
      const c = (
        await rows('SELECT * FROM public.xa_billing_cycle WHERE id=:id FOR UPDATE', {
          id: locator.cycle_id,
        })
      )[0];
      const p = (
        await rows('SELECT * FROM public.xa_payment_transaction WHERE guid=:guid FOR UPDATE', {
          guid: i.payment,
        })
      )[0];
      if (
        !c ||
        !p ||
        p.billing_cycle !== c.id ||
        c.global_license !== l.id ||
        c.billing_mode !== 'POSTPAID'
      )
        throw new PostpaidCashError('Postpaid cycle required');
      const prior = (
        await rows('SELECT * FROM public.xa_cash_installment WHERE idempotency_key=:key', {
          key: i.key,
        })
      )[0];
      if (
        prior &&
        (prior.payment_transaction !== p.id ||
          prior.actor_user_guid !== i.actor ||
          prior.receipt_reference !== i.reference ||
          prior.currency_code !== i.currency ||
          decimalUnits(prior.amount_local, 2) !== decimalUnits(i.amount, 2) ||
          new Date(prior.received_at).toISOString() !== i.receivedAt)
      )
        throw new PostpaidCashError('Conflicting receipt replay');
      async function result(replayed: boolean) {
        const b = (
          await rows('SELECT * FROM public.xa_payment_balance WHERE id=:id', { id: p.id })
        )[0];
        const access = (
          await rows('SELECT * FROM public.monthly_license_access(:id)', { id: l.id })
        )[0];
        return {
          tenant_guid: i.tenant,
          license_guid: Number(l.guid),
          billing_cycle_guid: Number(c.guid),
          payment_transaction_guid: i.payment,
          receipt_reference: i.reference,
          replayed,
          billing_mode: 'POSTPAID',
          currency_code: i.currency,
          due_local: String(b.due_local),
          received_local: String(b.received_local),
          outstanding_local: String(b.outstanding_local),
          billing_state: decimalUnits(b.outstanding_local, 2) === 0n ? 'PAID' : 'PARTIALLY_PAID',
          access,
        };
      }
      if (prior) return result(true);
      if (
        !['PENDING', 'PROCESSING', 'FAILED'].includes(p.transaction_status) ||
        !['PENDING', 'PROCESSING', 'FAILED', 'OVERDUE'].includes(c.billing_status)
      )
        throw new PostpaidCashError('Payment unavailable');
      if (i.currency !== p.currency_code)
        throw new PostpaidCashError('Currency differs from invoice');
      const sum = (
        await rows(
          'SELECT COALESCE(SUM(amount_local),0) AS received FROM public.xa_cash_installment WHERE payment_transaction=:id',
          { id: p.id },
        )
      )[0];
      const balance = cashBalance(p.amount_local, sum.received, i.amount);
      await rows(
        `INSERT INTO public.xa_cash_installment(payment_transaction,tenant,actor_user_guid,amount_local,currency_code,receipt_reference,idempotency_key,received_at)
    VALUES(:payment,:tenant,:actor,:amount,:currency,:reference,:key,CAST(:receivedAt AS timestamptz)) RETURNING id`,
        { ...i, payment: p.id, tenant: l.tenant },
      );
      if (balance.settled) {
        await rows(
          "UPDATE public.xa_payment_transaction SET transaction_status='COMPLETED',completed_at=NOW(),updated_at=NOW() WHERE id=:id RETURNING id",
          { id: p.id },
        );
        await rows(
          "UPDATE public.xa_billing_cycle SET billing_status='COMPLETED',payment_completed_at=NOW(),updated_at=NOW() WHERE id=:id RETURNING id",
          { id: c.id },
        );
        const access = (
          await rows('SELECT * FROM public.monthly_license_access(:id)', { id: l.id })
        )[0];
        const action = access?.allowed
          ? 'ACTIVE'
          : access?.basis === 'TECHNICAL_RESTRICTION'
            ? 'MANUAL_REVIEW'
            : 'NO_CURRENT_COVERAGE';
        await rows(
          `INSERT INTO public.xa_cash_installment_settlement(payment_transaction,tenant,amount_local,currency_code,access_action)
     VALUES(:payment,:tenant,:amount,:currency,:action) RETURNING payment_transaction`,
          { payment: p.id, tenant: l.tenant, amount: p.amount_local, currency: i.currency, action },
        );
        // Financial expiry is reversible; an explicit technical suspension remains untouched.
        if (access?.allowed && l.license_status === 'EXPIRED') {
          await rows(
            "UPDATE public.xa_global_license SET license_status='ACTIVE',updated_at=NOW() WHERE id=:id RETURNING id",
            { id: l.id },
          );
          await rows(
            `INSERT INTO public.xa_monthly_license_status_event(global_license,previous_status,new_status,reason,actor_type)
      VALUES(:id,'EXPIRED','ACTIVE','POSTPAID_DEBT_SETTLED','SYSTEM') RETURNING id`,
            { id: l.id },
          );
        }
      }
      return result(false);
    });
  }

  private db() {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db;
  }
}
