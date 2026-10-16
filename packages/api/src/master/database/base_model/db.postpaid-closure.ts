import { monthlySeatCount } from '../../services/monthly-usage.js';
import type { Sequelize } from 'sequelize';
import { Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';
import { centsText, decimalUnits, renewalAmounts } from '../../services/renewal-amounts.js';

import ActivityMonitoringDb from './db.activity-monitoring.js';

export class PostpaidClosureError extends Error {}
export interface ClosureInput {
  tenantGuid: number;
  licenseGuid: number;
  start: string;
  end: string;
  actor: string;
  key: string;
  methodGuid: number;
  coverageReference: string;
}
export function closureAmounts(
  price: unknown,
  minimum: number,
  employees: any[],
  rate: unknown,
  taxes: any[],
) {
  if (!Number.isSafeInteger(minimum) || minimum < 5)
    throw new PostpaidClosureError('Invalid minimum seats');
  const { count, seats } = monthlySeatCount(minimum, employees);
  const units = decimalUnits(price, 2);
  if (units <= 0n) throw new PostpaidClosureError('Positive price required');
  return {
    count,
    seats,
    amounts: renewalAmounts(
      centsText(units * BigInt(seats)),
      rate,
      taxes.map((t) => t.tax_rate),
    ),
  };
}
/** Transactional persistence only; public projection belongs to the business class. */
export default class PostpaidClosureDb {
  constructor(private readonly connection?: Sequelize) {}
  async close(input: ClosureInput): Promise<Record<string, any>> {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db.transaction<Record<string, any>>(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        const rows = async (sql: string, replacements: Record<string, any> = {}) => {
          const [r] = await db.query(sql, { transaction, replacements });
          return r as any[];
        };
        const license = (
          await rows(
            `SELECT gl.*,t.guid AS tenant_guid,t.primary_currency_code,t.country_code,t.tax_exempt,t.tax_number
    FROM public.xa_global_license gl JOIN public.xa_tenant t ON t.id=gl.tenant
    WHERE gl.guid=:guid AND t.guid=:tenant FOR UPDATE OF gl`,
            { guid: input.licenseGuid, tenant: input.tenantGuid },
          )
        )[0];
        if (!license) throw new PostpaidClosureError('License does not belong to tenant');
        const prior = (
          await rows(
            `SELECT rp.*,c.guid AS cycle_guid,p.guid AS payment_guid,c.billing_status,p.transaction_status
    FROM public.xa_renewal_preparation rp JOIN public.xa_billing_cycle c ON c.id=rp.billing_cycle
    JOIN public.xa_payment_transaction p ON p.id=rp.payment_transaction
    WHERE rp.global_license=:license AND rp.idempotency_key=:key`,
            { license: license.id, key: input.key },
          )
        )[0];
        if (prior) {
          const s = prior.snapshot;
          if (
            s?.operation !== 'POSTPAID_MONTH_CLOSURE' ||
            prior.actor_user_guid !== input.actor ||
            Number(prior.payment_method_guid) !== input.methodGuid ||
            new Date(prior.period_start).toISOString() !== input.start ||
            new Date(prior.period_end).toISOString() !== input.end ||
            s.coverage_reference !== input.coverageReference
          )
            throw new PostpaidClosureError('Idempotency key conflict');
          return { ...prior, replayed: true };
        }
        if (
          license.billing_mode !== 'POSTPAID' ||
          !license.postpaid_from ||
          Number(license.billing_cycle_months) !== 1
        )
          throw new PostpaidClosureError(
            'Monthly postpaid license required; mode transition must be audited first',
          );
        if (Date.parse(input.start) < new Date(license.postpaid_from).getTime())
          throw new PostpaidClosureError('Period precedes postpaid start');
        const usage = await new ActivityMonitoringDb(db).monthlyUsage(
          input.licenseGuid,
          input.start,
          input.end,
          transaction,
        );
        if (!usage.period_closed) throw new PostpaidClosureError('Month is not closed');
        if (
          Date.parse(input.start) !== new Date(license.postpaid_from).getTime() &&
          !(
            await rows(
              `SELECT id FROM public.xa_renewal_preparation
    WHERE global_license=:license AND period_end=CAST(:start AS timestamptz) AND snapshot->>'operation'='POSTPAID_MONTH_CLOSURE'`,
              { license: license.id, start: input.start },
            )
          ).length
        )
          throw new PostpaidClosureError('Close preceding months first');
        if (
          (
            await rows(
              `SELECT id FROM public.xa_billing_cycle WHERE global_license=:license
    AND period_start<CAST(:end AS timestamptz) AND CAST(:start AS timestamptz)<period_end`,
              { license: license.id, start: input.start, end: input.end },
            )
          ).length
        )
          throw new PostpaidClosureError(
            'An overlapping cycle exists; reconcile it instead of creating a second debt',
          );
        const currency = license.primary_currency_code;
        if (!/^[A-Z]{3}$/.test(currency ?? '') || !license.country_code)
          throw new PostpaidClosureError('Billing profile incomplete');
        const method = (
          await rows('SELECT * FROM public.xa_payment_method WHERE guid=:guid AND active=true', {
            guid: input.methodGuid,
          })
        )[0];
        if (!method || !method.supported_currencies?.includes(currency))
          throw new PostpaidClosureError('Payment method unavailable for currency');
        const rates =
          currency === 'USD'
            ? []
            : await rows(
                `SELECT guid,exchange_rate FROM public.xf_exchange_rate
    WHERE from_currency_code='USD' AND to_currency_code=:currency AND current=true`,
                { currency },
              );
        if (currency !== 'USD' && rates.length !== 1)
          throw new PostpaidClosureError('Exactly one current exchange rate required');
        const rate = currency === 'USD' ? '1.000000' : String(rates[0].exchange_rate);
        const taxes = license.tax_exempt
          ? []
          : await rows(
              `SELECT guid,tax_name,tax_rate,required_tax_number FROM public.xf_tax_rule
    WHERE country_code=:country AND active=true AND applies_to='license_fee' AND effective_date<=NOW()
    AND (expiry_date IS NULL OR NOW()<expiry_date) ORDER BY id`,
              { country: license.country_code },
            );
        if (
          !license.tax_exempt &&
          (!taxes.length ||
            taxes.some((t) => t.required_tax_number && !String(license.tax_number ?? '').trim()))
        )
          throw new PostpaidClosureError('Tax configuration needs review');
        const { count, seats, amounts } = closureAmounts(
          license.base_price_usd,
          Number(license.minimum_seats),
          usage.employees,
          rate,
          taxes,
        );
        if (
          decimalUnits(amounts.totalUsd, 2) < decimalUnits(method.min_amount_usd, 2) ||
          decimalUnits(amounts.totalUsd, 2) > decimalUnits(method.max_amount_usd, 2)
        )
          throw new PostpaidClosureError('Amount outside payment method limits');
        async function guid(table: 'xa_billing_cycle' | 'xa_payment_transaction') {
          const sequence =
            table === 'xa_billing_cycle'
              ? 'public.xa_renewal_cycle_guid_seq'
              : 'public.xa_renewal_payment_guid_seq';
          for (let i = 0; i < 900000; i++) {
            const value = Number((await rows(`SELECT nextval('${sequence}') AS guid`))[0].guid);
            if (
              !(await rows(`SELECT id FROM public.${table} WHERE guid=:guid`, { guid: value }))
                .length
            )
              return value;
          }
          throw new PostpaidClosureError('Financial GUID range exhausted');
        }
        const cycleGuid = await guid('xa_billing_cycle'),
          paymentGuid = await guid('xa_payment_transaction');
        const args = {
          license: license.id,
          start: input.start,
          end: input.end,
          seats,
          currency,
          rate,
          ...amounts,
          taxes: JSON.stringify(taxes),
        };
        const cycle = (
          await rows(
            `INSERT INTO public.xa_billing_cycle(guid,global_license,billing_mode,period_start,period_end,
    base_employee_count,final_employee_count,base_amount_usd,adjustments_amount_usd,subtotal_usd,tax_amount_usd,total_amount_usd,
    billing_currency_code,exchange_rate_used,base_amount_local,adjustments_amount_local,subtotal_local,tax_amount_local,total_amount_local,
    tax_rules_applied,billing_status,invoice_generated_at,payment_due_date,created_at,updated_at)
    VALUES(:guid,:license,'POSTPAID',:start,:end,:seats,:seats,:baseUsd,0,:baseUsd,:taxUsd,:totalUsd,
    :currency,:rate,:baseLocal,0,:baseLocal,:taxLocal,:totalLocal,CAST(:taxes AS jsonb),'PENDING',NOW(),:end,NOW(),NOW()) RETURNING id,guid`,
            { ...args, guid: cycleGuid },
          )
        )[0];
        const payment = (
          await rows(
            `INSERT INTO public.xa_payment_transaction(guid,source_type,billing_cycle,adjustment,amount_usd,amount_local,
    currency_code,exchange_rate_used,payment_method,payment_reference,transaction_status,initiated_at,created_at,updated_at)
    VALUES(:guid,'CYCLE',:cycle,NULL,:totalUsd,:totalLocal,:currency,:rate,:method,:reference,'PENDING',NOW(),NOW(),NOW()) RETURNING id,guid`,
            {
              ...args,
              guid: paymentGuid,
              cycle: cycle.id,
              method: method.id,
              reference: `TOKEPOSTPAID_${paymentGuid}`,
            },
          )
        )[0];
        const snapshot = {
          operation: 'POSTPAID_MONTH_CLOSURE',
          billing_mode: 'POSTPAID',
          tenant_guid: input.tenantGuid,
          license_guid: input.licenseGuid,
          coverage_reference: input.coverageReference,
          data_completeness: 'ADMIN_ATTESTED',
          pricing_basis: 'CURRENT_CONFIGURATION_ADMIN_ACCEPTED',
          period_start: input.start,
          period_end: input.end,
          payment_due_date: input.end,
          unit_price_usd: String(license.base_price_usd),
          minimum_seats: Number(license.minimum_seats),
          billable_employees: count,
          billed_seats: seats,
          employees: usage.employees.map((e: any) => ({
            employee_license_guid: e.employee_license_guid,
            active_days: e.active_days,
          })),
          exchange_rate_used: rate,
          exchange_rate_guid: rates[0]?.guid ?? null,
          tax_rules_applied: taxes,
          billing_currency_code: currency,
          amounts,
        };
        const prepared = (
          await rows(
            `INSERT INTO public.xa_renewal_preparation(global_license,period_start,period_end,billing_cycle,payment_transaction,
    payment_method_guid,actor_user_guid,idempotency_key,snapshot)
    VALUES(:license,:start,:end,:cycle,:payment,:method,:actor,:key,CAST(:snapshot AS jsonb)) RETURNING *`,
            {
              ...args,
              cycle: cycle.id,
              payment: payment.id,
              method: input.methodGuid,
              actor: input.actor,
              key: input.key,
              snapshot: JSON.stringify(snapshot),
            },
          )
        )[0];
        return {
          ...prepared,
          cycle_guid: cycle.guid,
          payment_guid: payment.guid,
          billing_status: 'PENDING',
          transaction_status: 'PENDING',
          replayed: false,
        };
      },
    );
  }
}
