import type { Sequelize } from 'sequelize';

import { normalizationTrace } from '../../services/payable-amount.js';
import { TableInitializer } from '../db.initializer.js';
import type {
  SubscriptionInput,
  SubscriptionOffer,
} from '../../class/license-subscription-input.js';
import { centsText, decimalUnits, renewalAmounts } from '../../services/renewal-amounts.js';

export class LicenseSubscriptionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export default class LicenseSubscriptionDb {
  constructor(private readonly connection?: Sequelize) {}

  async methods(guid: number) {
    const db = this.db();
    const [rows] = await db.query(
      'SELECT guid,primary_currency_code FROM public.xa_tenant WHERE guid=:guid',
      { replacements: { guid } },
    );
    const t = (rows as any[])[0];
    if (!t) throw new LicenseSubscriptionError('Tenant not found', 404);
    const [methods] = await db.query(
      'SELECT guid,code,name,method_type,supported_currencies,min_amount_usd,max_amount_usd FROM public.xa_payment_method WHERE active AND :currency=ANY(supported_currencies) ORDER BY guid',
      { replacements: { currency: t.primary_currency_code } },
    );
    return {
      tenant_guid: t.guid,
      currency_code: t.primary_currency_code,
      methods: methods as any[],
    };
  }

  async create(i: SubscriptionInput, offer: () => SubscriptionOffer | undefined): Promise<any> {
    return this.db().transaction(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [r] = await this.db().query(sql, { transaction, replacements });
        return r as any[];
      };
      const ready = await rows(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='xa_global_license' AND column_name IN ('billing_mode','postpaid_from')",
      );
      if (ready.length !== 2)
        throw new LicenseSubscriptionError(
          'Apply postpaid foundation migrations before subscribing',
          503,
        );
      const t = (
        await rows('SELECT * FROM public.xa_tenant WHERE guid=:guid FOR UPDATE', { guid: i.tenant })
      )[0];
      if (!t) throw new LicenseSubscriptionError('Tenant not found', 404);
      const prior = await rows(
        `SELECT e.guid,e.metadata,l.license_status,c.billing_status,p.transaction_status FROM public.xa_license_event e
    JOIN public.xa_global_license l ON l.id=e.global_license
    JOIN public.xa_billing_cycle c ON c.guid=(e.new_payload->>'billing_cycle_guid')::integer AND c.global_license=l.id
    JOIN public.xa_payment_transaction p ON p.guid=(e.new_payload->>'payment_transaction_guid')::integer AND p.billing_cycle=c.id
    WHERE e.tenant=:tenant AND e.event_type='LICENSE_CREATED' AND e.operation_key=:key`,
        { tenant: t.id, key: i.key },
      );
      if (prior.length) {
        const p = prior[0];
        const previous = p.metadata.request;
        if (!previous || Object.keys(i).some((k) => (i as any)[k] !== previous[k]))
          throw new LicenseSubscriptionError('Idempotency key conflict', 409);
        const licenseRow = (
          await rows('SELECT * FROM public.xa_global_license WHERE guid=:guid', {
            guid: p.metadata.snapshot.license_guid,
          })
        )[0];
        return {
          ...p,
          licenseRow,
          snapshot: p.metadata.snapshot,
          event_guid: p.guid,
          replayed: true,
        };
      }
      if (t.status !== 'ACTIVE') throw new LicenseSubscriptionError('Tenant is not active', 409);
      if (
        (
          await rows(
            "SELECT guid FROM public.xa_global_license WHERE tenant=:tenant AND license_status::text<>'CANCELLED' LIMIT 1",
            { tenant: t.id },
          )
        ).length
      )
        throw new LicenseSubscriptionError(
          'Tenant already has a license; use renewal or release',
          409,
        );
      const o = offer();
      if (!o) throw new LicenseSubscriptionError('Offer unavailable', 503);
      if (!o.months.includes(i.months) || i.seats < o.minimum || i.seats > o.maxSeats)
        throw new LicenseSubscriptionError('Seats or duration outside offer');
      if (
        !(await rows('SELECT name FROM pg_timezone_names WHERE name=:zone', { zone: t.timezone }))
          .length
      )
        throw new LicenseSubscriptionError('Tenant timezone requires configuration', 409);
      const period = (
        await rows(
          `SELECT CAST(:day AS date)::timestamp AT TIME ZONE :zone AS start,
    (CAST(:day AS date)::timestamp+make_interval(months=>CAST(:months AS integer))) AT TIME ZONE :zone AS finish,
    CAST(:day AS date)>=(CURRENT_TIMESTAMP AT TIME ZONE :zone)::date AS valid,
    GREATEST(CAST(:day AS date)::timestamp AT TIME ZONE :zone,CURRENT_TIMESTAMP) AS due`,
          { day: i.startDate, zone: t.timezone, months: i.months },
        )
      )[0];
      if (!period.valid)
        throw new LicenseSubscriptionError('Start date precedes current tenant day');
      const method = (
        await rows(
          `SELECT * FROM public.xa_payment_method WHERE guid = :guid AND active = TRUE AND CAST(:currency AS VARCHAR(3)) = ANY(supported_currencies)`,
          { guid: i.method, currency: t.primary_currency_code },
        )
      )[0];
      if (!method)
        throw new LicenseSubscriptionError('Payment method unavailable for tenant currency');
      const rates =
        t.primary_currency_code === 'USD'
          ? [{ exchange_rate: '1.000000' }]
          : await rows(
              "SELECT exchange_rate FROM public.xf_exchange_rate WHERE from_currency_code='USD' AND to_currency_code=:currency AND current",
              { currency: t.primary_currency_code },
            );
      if (rates.length !== 1)
        throw new LicenseSubscriptionError('Exactly one current exchange rate required', 409);
      const taxes = t.tax_exempt
        ? []
        : await rows(
            "SELECT guid,tax_name,tax_type,tax_rate,country_code,required_tax_number FROM public.xf_tax_rule WHERE country_code=:country AND active AND applies_to='license_fee' AND effective_date<=CURRENT_TIMESTAMP AND (expiry_date IS NULL OR expiry_date>CURRENT_TIMESTAMP) ORDER BY id",
            { country: t.country_code },
          );
      if (taxes.some((x) => x.required_tax_number && !String(t.tax_number ?? '').trim()))
        throw new LicenseSubscriptionError('Tax number required', 409);
      const a = renewalAmounts(
        centsText(decimalUnits(o.price, 2) * BigInt(i.seats) * BigInt(i.months)),
        rates[0].exchange_rate,
        taxes.map((x) => x.tax_rate),
        t.primary_currency_code,
      );
      if (
        decimalUnits(a.totalUsd, 2) < decimalUnits(method.min_amount_usd, 2) ||
        decimalUnits(a.totalUsd, 2) > decimalUnits(method.max_amount_usd, 2)
      )
        throw new LicenseSubscriptionError('Amount outside payment method limits');
      // Reserve internal IDs from existing sequences; public GUIDs remain six-digit integers.
      const reserve = async (table: string) => {
        for (let n = 0; n < 1000; n++) {
          const r = (
            await rows(`SELECT nextval(pg_get_serial_sequence('public.${table}','id')) AS id`)
          )[0];
          const id = Number(r.id),
            guid = 100000 + id;
          if (!Number.isSafeInteger(id) || guid > 999999)
            throw new LicenseSubscriptionError('GUID range exhausted', 409);
          if (!(await rows(`SELECT id FROM public.${table} WHERE guid=:guid`, { guid })).length)
            return { id, guid };
        }
        throw new LicenseSubscriptionError('GUID allocation requires review', 409);
      };
      const l = await reserve('xa_global_license'),
        c = await reserve('xa_billing_cycle'),
        p = await reserve('xa_payment_transaction');
      await rows(
        `INSERT INTO public.xa_global_license(id,guid,tenant,license_type,billing_cycle_months,base_price_usd,minimum_seats,current_period_start,current_period_end,next_renewal_date,license_status,billing_mode,postpaid_from,created_at,updated_at)
    VALUES(:id,:guid,:tenant,:type,:months,:price,:minimum,:start,:finish,:finish,'PENDING_PAYMENT','PREPAID',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        {
          ...l,
          tenant: t.id,
          type: i.type,
          months: i.months,
          price: o.price,
          minimum: o.minimum,
          start: period.start,
          finish: period.finish,
        },
      );
      await rows(
        `INSERT INTO public.xa_billing_cycle(id,guid,global_license,period_start,period_end,base_employee_count,final_employee_count,base_amount_usd,adjustments_amount_usd,subtotal_usd,tax_amount_usd,total_amount_usd,billing_currency_code,exchange_rate_used,base_amount_local,adjustments_amount_local,subtotal_local,tax_amount_local,total_amount_local,tax_rules_applied,billing_status,payment_due_date,billing_mode,created_at,updated_at)
    VALUES(:id,:guid,:license,:start,:finish,:seats,:seats,:baseUsd,0,:baseUsd,:taxUsd,:totalUsd,:currency,:rate,:baseLocal,0,:baseLocal,:taxLocal,:totalLocal,CAST(:taxes AS jsonb),'PENDING',:due,'PREPAID',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        {
          ...c,
          license: l.id,
          start: period.start,
          finish: period.finish,
          seats: i.seats,
          ...a,
          currency: t.primary_currency_code,
          rate: rates[0].exchange_rate,
          taxes: JSON.stringify(taxes),
          due: period.due,
        },
      );
      await rows(
        `INSERT INTO public.xa_payment_transaction(id,guid,billing_cycle,adjustment,source_type,amount_usd,amount_local,currency_code,exchange_rate_used,payment_method,payment_reference,transaction_status,initiated_at,created_at,updated_at)
    VALUES(:id,:guid,:cycle,NULL,'CYCLE',:usd,:local,:currency,:rate,:method,:reference,'PENDING',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        {
          ...p,
          cycle: c.id,
          usd: a.totalUsd,
          local: a.totalLocal,
          currency: t.primary_currency_code,
          rate: rates[0].exchange_rate,
          method: method.id,
          reference: 'TOKE_SUB_' + p.guid,
        },
      );
      const snapshot = {
        tenant_guid: i.tenant,
        license_guid: l.guid,
        billing_cycle_guid: c.guid,
        payment_transaction_guid: p.guid,
        license_type: i.type,
        billing_cycle_months: i.months,
        unit_price_usd: o.price,
        minimum_seats: o.minimum,
        purchased_seats: i.seats,
        period_start: period.start,
        period_end: period.finish,
        payment_due_date: period.due,
        payment_method_guid: i.method,
        billing_currency_code: t.primary_currency_code,
        amounts: a,
      };
      if (i.months === 1)
        await rows(
          `INSERT INTO public.xa_monthly_license_policy(global_license,grace_days,actor_user_guid,actor_tenant_guid,idempotency_key,previous_license,new_license)
    VALUES(:license,:days,NULL,NULL,:key,'{}',CAST(:snapshot AS jsonb))`,
          {
            license: l.id,
            days: o.graceDays,
            key: 'SUB_POLICY_' + l.guid,
            snapshot: JSON.stringify(snapshot),
          },
        );
      const event = (
        await rows(
          `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,effective_at,previous_payload,new_payload,reason,metadata)
    VALUES(:tenant,:license,'LICENSE_CREATED',:key,'SYSTEM',NULL,:effective,'{}',CAST(:payload AS jsonb),'Initial prepaid subscription',CAST(:metadata AS jsonb)) RETURNING guid`,
          {
            tenant: t.id,
            license: l.id,
            key: i.key,
            effective: period.start,
            payload: JSON.stringify({
              license_guid: l.guid,
              billing_cycle_guid: c.guid,
              payment_transaction_guid: p.guid,
              billing_mode: 'PREPAID',
              license_status: 'PENDING_PAYMENT',
            }),
            metadata: JSON.stringify({
              request: i,
              snapshot,
              monetary_normalization: normalizationTrace(
                a.baseLocal,
                a.taxLocal,
                a.totalLocal,
                t.primary_currency_code,
              ),
            }),
          },
        )
      )[0];
      const licenseRow = (
        await rows('SELECT * FROM public.xa_global_license WHERE id=:id', { id: l.id })
      )[0];
      return {
        licenseRow,
        snapshot,
        event_guid: event.guid,
        license_status: 'PENDING_PAYMENT',
        billing_status: 'PENDING',
        transaction_status: 'PENDING',
        replayed: false,
      };
    });
  }

  private db() {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db;
  }
}
