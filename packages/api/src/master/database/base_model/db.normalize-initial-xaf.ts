import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';
import { guid, PaymentAttemptError } from '../../class/payment-attempt-contract.js';
import {
  moneyCents,
  normalizationTrace,
  normalizePayableAmount,
  payableTotalMatches,
} from '../../services/payable-amount.js';

export default class NormalizeInitialXafDb {
  constructor(private readonly connection?: Sequelize) {}
  async run(transactionGuid: number, apply = false) {
    guid(transactionGuid);
    const db = this.connection ?? TableInitializer.getModel('xa_payment_transaction').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db.transaction(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [data] = await db.query(sql, { replacements, transaction });
        return data as any[];
      };
      const p = (
        await rows('SELECT * FROM public.xa_payment_transaction WHERE guid=:guid FOR UPDATE', {
          guid: transactionGuid,
        })
      )[0];
      if (!p || p.source_type !== 'CYCLE' || p.adjustment != null)
        throw new PaymentAttemptError('Initial cycle transaction required');
      const c = (
        await rows('SELECT * FROM public.xa_billing_cycle WHERE id=:id FOR UPDATE', {
          id: p.billing_cycle,
        })
      )[0];
      const l = c
        ? (
            await rows('SELECT * FROM public.xa_global_license WHERE id=:id FOR UPDATE', {
              id: c.global_license,
            })
          )[0]
        : null;
      if (
        !l ||
        l.billing_mode !== 'PREPAID' ||
        c.billing_mode !== 'PREPAID' ||
        p.currency_code !== 'XAF' ||
        c.billing_currency_code !== 'XAF'
      )
        throw new PaymentAttemptError('Initial XAF prepaid invoice required');
      const operation = 'XAF_PAYABLE_' + transactionGuid + '_V1';
      const previous = (
        await rows(
          "SELECT new_payload FROM public.xa_license_event WHERE global_license=:license AND event_type='INVOICE_PAYABLE_NORMALIZED' AND operation_key=:key",
          { license: l.id, key: operation },
        )
      )[0];
      if (previous) {
        if (
          moneyCents(p.amount_local) !== moneyCents(previous.new_payload.total_amount_local) ||
          moneyCents(c.total_amount_local) !== moneyCents(p.amount_local)
        )
          throw new PaymentAttemptError('Existing normalization does not match stored amounts');
        return {
          replayed: true,
          payment_transaction_guid: p.guid,
          total_amount_local: String(p.amount_local),
        };
      }
      if (
        p.transaction_status !== 'PENDING' ||
        p.completed_at ||
        c.billing_status !== 'PENDING' ||
        c.payment_completed_at ||
        c.invoice_generated_at ||
        l.license_status !== 'PENDING_PAYMENT'
      )
        throw new PaymentAttemptError(
          'Issued, settled or non-pending invoice cannot be normalized',
        );
      const creation = await rows(
        `SELECT guid FROM public.xa_license_event WHERE global_license=:license AND event_type='LICENSE_CREATED' AND new_payload->>'billing_cycle_guid'=:cycle AND new_payload->>'payment_transaction_guid'=:payment`,
        { license: l.id, cycle: String(c.guid), payment: String(p.guid) },
      );
      if (
        creation.length !== 1 ||
        moneyCents(p.amount_local) !== moneyCents(c.total_amount_local) ||
        !payableTotalMatches(c.subtotal_local, c.tax_amount_local, c.total_amount_local, 'XAF')
      )
        throw new PaymentAttemptError('Invoice source or totals require review');
      const attempts = await rows(
        'SELECT guid FROM public.xa_payment_attempt WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle)',
        { cycle: c.id },
      );
      const rights = await rows(
        'SELECT id FROM public.xa_paid_seat_grant WHERE billing_cycle=:cycle UNION ALL SELECT id FROM public.xa_license_cycle_activation WHERE billing_cycle=:cycle',
        { cycle: c.id },
      );
      const cash = await rows(
        `SELECT 1 FROM public.xa_cash_receipt WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle) UNION ALL SELECT 1 FROM public.xa_cash_installment WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle) UNION ALL SELECT 1 FROM public.xa_cash_installment_settlement WHERE payment_transaction IN (SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle)`,
        { cycle: c.id },
      );
      const other = await rows(
        'SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:cycle AND id<>:id',
        { cycle: c.id, id: p.id },
      );
      if (attempts.length || rights.length || cash.length || other.length)
        throw new PaymentAttemptError(
          'Attempt, rights, receipts or another transaction prevent normalization',
        );
      const total = normalizePayableAmount(String(c.total_amount_local), 'XAF');
      if (moneyCents(total) <= 0n)
        throw new PaymentAttemptError('Payable amount must remain positive');
      const result = {
        payment_transaction_guid: Number(p.guid),
        billing_cycle_guid: Number(c.guid),
        license_guid: Number(l.guid),
        previous_total_local: String(c.total_amount_local),
        total_amount_local: total,
        applied: false,
      };
      if (!apply || total === String(c.total_amount_local)) return result;
      await rows(
        'UPDATE public.xa_billing_cycle SET total_amount_local=:total,updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id',
        { total, id: c.id },
      );
      await rows(
        'UPDATE public.xa_payment_transaction SET amount_local=:total,updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id',
        { total, id: p.id },
      );
      const payload = {
        billing_cycle_guid: Number(c.guid),
        payment_transaction_guid: Number(p.guid),
      };
      const role = (await rows('SELECT current_user AS db_role,session_user AS session_role'))[0];
      await rows(
        `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,effective_at,previous_payload,new_payload,reason,metadata) VALUES (:tenant,:license,'INVOICE_PAYABLE_NORMALIZED',:key,'SYSTEM',NULL,CURRENT_TIMESTAMP,CAST(:before AS jsonb),CAST(:after AS jsonb),'Canonical XAF payable amount for unpaid initial subscription',CAST(:metadata AS jsonb)) RETURNING guid`,
        {
          tenant: l.tenant,
          license: l.id,
          key: operation,
          before: JSON.stringify({ ...payload, total_amount_local: String(c.total_amount_local) }),
          after: JSON.stringify({ ...payload, total_amount_local: total }),
          metadata: JSON.stringify({
            operation: 'CONTROLLED_INITIAL_XAF_REPAIR',
            ...role,
            normalization: normalizationTrace(c.subtotal_local, c.tax_amount_local, total, 'XAF'),
          }),
        },
      );
      return { ...result, applied: true };
    });
  }
}
