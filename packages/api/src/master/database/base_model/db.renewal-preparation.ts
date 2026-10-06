import type { Sequelize } from 'sequelize';
import { Transaction } from 'sequelize';

import { renewalAmounts } from '../../services/renewal-amounts.js';
import { paymentAmountsConsistent } from '../../services/payment-money.js';

import { calculateRenewalPreview, RenewalPreviewError } from './db.renewal-preview.js';

export class RenewalPreparationError extends Error {}
export async function prepareRenewal(
  db: Sequelize,
  licenseGuid: number,
  input: any,
): Promise<Record<string, any>> {
  const actor = typeof input.actor_user_guid === 'string' ? input.actor_user_guid.trim() : '';
  const key = typeof input.idempotency_key === 'string' ? input.idempotency_key.trim() : '';
  const method = String(input.payment_method_guid ?? '');
  if (
    !Number.isInteger(licenseGuid) ||
    licenseGuid < 100000 ||
    licenseGuid > 999999 ||
    !actor ||
    actor.length > 128 ||
    !key ||
    key.length > 128 ||
    !/^[1-9][0-9]{5}$/.test(method)
  )
    throw new RenewalPreparationError('License, author, key and payment method are required');
  return db.transaction<Record<string, any>>(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    async (transaction) => {
      async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
        const [r] = await db.query(sql, { transaction, replacements });
        return r as any[];
      }
      const license = (
        await rows('SELECT * FROM xa_global_license WHERE guid= :guid FOR UPDATE', {
          guid: licenseGuid,
        })
      )[0];
      if (!license) throw new RenewalPreparationError('License not found');
      const prior = (
        await rows(
          'SELECT r.*,c.guid AS billing_cycle_guid,p.guid AS payment_transaction_guid FROM xa_renewal_preparation r JOIN xa_billing_cycle c ON c.id=r.billing_cycle JOIN xa_payment_transaction p ON p.id=r.payment_transaction WHERE r.global_license= :id AND r.idempotency_key= :key',
          { id: license.id, key },
        )
      )[0];
      if (prior) {
        if (prior.actor_user_guid !== actor || Number(prior.payment_method_guid) !== Number(method))
          throw new RenewalPreparationError('Idempotency key conflict');
        return { ...prior, replayed: true };
      }
      let preview;
      try {
        preview = await calculateRenewalPreview(db, licenseGuid, transaction);
      } catch (error) {
        if (error instanceof RenewalPreviewError) throw new RenewalPreparationError(error.message);
        throw error;
      }
      if (preview.reconciliation_required)
        throw new RenewalPreparationError('Undated leaves require reconciliation');
      if (
        (
          await rows(
            'SELECT id FROM xa_renewal_preparation WHERE global_license= :id AND period_start= :start',
            { id: license.id, start: preview.period_start },
          )
        ).length
      )
        throw new RenewalPreparationError('Renewal already prepared; use its existing payment');
      const window = (
        await rows(
          `SELECT CAST(:start AS timestamptz)>CURRENT_TIMESTAMP AND CAST(:start AS timestamptz)<=CURRENT_TIMESTAMP+INTERVAL '30 days' AS allowed`,
          { start: preview.period_start },
        )
      )[0];
      if (!window?.allowed)
        throw new RenewalPreparationError('Preparation requires a future renewal within 30 days');
      const base = await rows(
        `SELECT g.id FROM xa_paid_seat_grant g JOIN xa_billing_cycle c ON c.id=g.billing_cycle
   WHERE g.global_license= :id AND g.source_type='CYCLE' AND c.billing_status='COMPLETED'
    AND c.period_start= :start AND c.period_end= :end`,
        { id: license.id, start: license.current_period_start, end: license.current_period_end },
      );
      if (base.length !== 1) {
        const transition =
          base.length === 0
            ? await rows(
                `SELECT id FROM xa_commercial_transition WHERE global_license= :id
    AND valid_from= :start AND valid_until= :end AND NOW()<valid_until`,
                {
                  id: license.id,
                  start: license.current_period_start,
                  end: license.current_period_end,
                },
              )
            : [];
        if (transition.length !== 1)
          throw new RenewalPreparationError(
            'Current paid cycle or commercial transition requires reconciliation',
          );
      }
      if (
        (
          await rows(
            `SELECT id FROM xa_billing_cycle WHERE global_license= :id AND period_start<CAST(:end AS timestamptz)
   AND CAST(:start AS timestamptz)<period_end`,
            { id: license.id, start: preview.period_start, end: preview.period_end },
          )
        ).length
      )
        throw new RenewalPreparationError('Overlapping billing cycle exists');
      const tenant = (
        await rows('SELECT * FROM xa_tenant WHERE id= :id', { id: license.tenant })
      )[0];
      if (!tenant || !tenant.country_code || !/^[A-Z]{3}$/.test(tenant.primary_currency_code))
        throw new RenewalPreparationError('Billing profile incomplete');
      const paymentMethod = (
        await rows('SELECT * FROM xa_payment_method WHERE guid= :guid AND active=true', {
          guid: Number(method),
        })
      )[0];
      if (
        !paymentMethod ||
        !Array.isArray(paymentMethod.supported_currencies) ||
        !paymentMethod.supported_currencies.includes(tenant.primary_currency_code)
      )
        throw new RenewalPreparationError('Payment method does not support billing currency');
      const rates =
        tenant.primary_currency_code === 'USD'
          ? []
          : await rows(
              `SELECT * FROM xf_exchange_rate WHERE from_currency_code='USD' AND to_currency_code= :currency AND current=true`,
              { currency: tenant.primary_currency_code },
            );
      if (tenant.primary_currency_code !== 'USD' && rates.length !== 1)
        throw new RenewalPreparationError('Exactly one current exchange rate required');
      const rate =
        tenant.primary_currency_code === 'USD' ? '1.000000' : String(rates[0].exchange_rate);
      const taxes = await rows(
        `SELECT * FROM xf_tax_rule WHERE country_code= :country AND active=true
   AND effective_date<=CURRENT_TIMESTAMP AND (expiry_date IS NULL OR CURRENT_TIMESTAMP<expiry_date)
   AND applies_to='license_fee' ORDER BY id`,
        { country: tenant.country_code },
      );
      if (!tenant.tax_exempt && taxes.length === 0)
        throw new RenewalPreparationError('Tax configuration requires review');
      if (!tenant.tax_exempt && taxes.some((t) => t.required_tax_number && !tenant.tax_number))
        throw new RenewalPreparationError('Required tax number is missing');
      const applied = tenant.tax_exempt ? [] : taxes;
      let amounts;
      try {
        amounts = renewalAmounts(
          preview.subtotal_usd,
          rate,
          applied.map((t) => t.tax_rate),
        );
      } catch (error: any) {
        throw new RenewalPreparationError(error.message);
      }
      if (!paymentAmountsConsistent(amounts.totalUsd, amounts.totalLocal, rate))
        throw new RenewalPreparationError('Currency rounding requires review');
      if (
        Number(amounts.totalUsd) < Number(paymentMethod.min_amount_usd) ||
        Number(amounts.totalUsd) > Number(paymentMethod.max_amount_usd)
      )
        throw new RenewalPreparationError('Amount outside payment method limits');
      async function guid(table: 'xa_billing_cycle' | 'xa_payment_transaction') {
        const sequence =
          table === 'xa_billing_cycle'
            ? 'public.xa_renewal_cycle_guid_seq'
            : 'public.xa_renewal_payment_guid_seq';
        for (let attempt = 0; attempt < 900000; attempt++) {
          const r = (await rows(`SELECT nextval('${sequence}') AS guid`))[0];
          if (
            !(await rows(`SELECT id FROM ${table} WHERE guid= :guid`, { guid: Number(r.guid) }))
              .length
          )
            return Number(r.guid);
        }
        throw new RenewalPreparationError('Financial GUID range exhausted');
      }
      const cycleGuid = await guid('xa_billing_cycle'),
        paymentGuid = await guid('xa_payment_transaction');
      const common = {
        license: license.id,
        start: preview.period_start,
        end: preview.period_end,
        seats: preview.billed_seats,
        currency: tenant.primary_currency_code,
        rate,
        ...amounts,
        taxes: JSON.stringify(applied.map((t) => ({ ...t, tax_rate: Number(t.tax_rate) }))),
      };
      const cycle = (
        await rows(
          `INSERT INTO xa_billing_cycle(guid,global_license,period_start,period_end,base_employee_count,final_employee_count,
   base_amount_usd,adjustments_amount_usd,subtotal_usd,tax_amount_usd,total_amount_usd,billing_currency_code,exchange_rate_used,
   base_amount_local,adjustments_amount_local,subtotal_local,tax_amount_local,total_amount_local,tax_rules_applied,billing_status,payment_due_date,created_at,updated_at)
   VALUES(:guid,:license,:start,:end,:seats,:seats,:baseUsd,0,:baseUsd,:taxUsd,:totalUsd,:currency,:rate,:baseLocal,0,:baseLocal,:taxLocal,:totalLocal,CAST(:taxes AS jsonb),'PENDING',:start,NOW(),NOW()) RETURNING id,guid`,
          { ...common, guid: cycleGuid },
        )
      )[0];
      const payment = (
        await rows(
          `INSERT INTO xa_payment_transaction(guid,source_type,billing_cycle,adjustment,amount_usd,amount_local,currency_code,
   exchange_rate_used,payment_method,payment_reference,transaction_status,initiated_at,created_at,updated_at)
   VALUES(:guid,'CYCLE',:cycle,NULL,:totalUsd,:totalLocal,:currency,:rate,:method,:reference,'PENDING',NOW(),NOW(),NOW()) RETURNING id,guid`,
          {
            ...common,
            guid: paymentGuid,
            cycle: cycle.id,
            method: paymentMethod.id,
            reference: `TOKERENEWAL_${paymentGuid}`,
          },
        )
      )[0];
      const snapshot = {
        ...preview,
        amounts,
        exchange_rate: rate,
        exchange_rate_id: rates[0]?.id ?? null,
        tax_rules: applied,
        tenant_tax_exempt: tenant.tax_exempt,
        country_code: tenant.country_code,
        currency: tenant.primary_currency_code,
      };
      const prepared = (
        await rows(
          `INSERT INTO xa_renewal_preparation(global_license,period_start,period_end,billing_cycle,payment_transaction,
   payment_method_guid,actor_user_guid,idempotency_key,snapshot)
   VALUES(:license,:start,:end,:cycle,:payment,:method,:actor,:key,CAST(:snapshot AS jsonb)) RETURNING *`,
          {
            ...common,
            cycle: cycle.id,
            payment: payment.id,
            method: Number(method),
            actor,
            key,
            snapshot: JSON.stringify(snapshot),
          },
        )
      )[0];
      return {
        ...prepared,
        billing_cycle_guid: cycle.guid,
        payment_transaction_guid: payment.guid,
        replayed: false,
      };
    },
  );
}
