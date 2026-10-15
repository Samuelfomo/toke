import { Transaction } from 'sequelize';

import { OnboardingCommercialError } from '../../class/onboarding-commercial.js';
import { TableInitializer } from '../db.initializer.js';

/** Reuse the immutable request stored by the existing subscription transaction. */
export default class OnboardingSubscriptionDb {
  async prior(tenant: number, key: string): Promise<Record<string, any> | null> {
    const db = TableInitializer.getModel('xa_tenant').sequelize;
    if (!db) throw new Error('Master unavailable');
    const [rows] = await db.query(
      `SELECT e.metadata->'request' AS request FROM public.xa_license_event e
   JOIN public.xa_tenant t ON t.id=e.tenant WHERE t.guid=:tenant AND e.event_type='LICENSE_CREATED' AND e.operation_key=:key`,
      { replacements: { tenant, key } },
    );
    const values = rows as { request: Record<string, any> }[];
    if (values.length > 1) throw new Error('Onboarding history requires review');
    return values[0]?.request ?? null;
  }
  async commercial(tenantGuid: number, estimate = false): Promise<any> {
    const db = TableInitializer.getModel('xa_tenant').sequelize;
    if (!db) throw new Error('Master unavailable');
    return db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        const rows = async (sql: string, replacements: Record<string, any> = {}) => {
          const [r] = await db.query(sql, { replacements, transaction });
          return r as any[];
        };
        await rows('SET TRANSACTION READ ONLY');
        const tenant = (
          await rows(
            'SELECT id,guid,status,primary_currency_code,country_code,tax_exempt,tax_number FROM public.xa_tenant WHERE guid=:guid',
            { guid: tenantGuid },
          )
        )[0];
        if (!tenant)
          throw new OnboardingCommercialError(
            'onboarding_tenant_unavailable',
            'Tenant unavailable',
            404,
          );
        const methods = await rows(
          `SELECT guid,code,method_type,min_amount_usd,max_amount_usd FROM public.xa_payment_method
    WHERE active=TRUE AND CAST(:currency AS VARCHAR(3))=ANY(supported_currencies)`,
          { currency: tenant.primary_currency_code },
        );
        const licenses = await rows(
          'SELECT guid,license_type,billing_cycle_months FROM public.xa_global_license WHERE tenant=:id',
          { id: tenant.id },
        );
        if (estimate) {
          if (tenant.status !== 'ACTIVE' || licenses.length)
            throw new OnboardingCommercialError(
              'onboarding_subscription_exists_or_restricted',
              'Consult status before starting a subscription',
              409,
            );
          const rates =
            tenant.primary_currency_code === 'USD'
              ? [{ exchange_rate: '1.000000' }]
              : await rows(
                  "SELECT exchange_rate FROM public.xf_exchange_rate WHERE from_currency_code='USD' AND to_currency_code=:currency AND current=TRUE",
                  { currency: tenant.primary_currency_code },
                );
          if (rates.length !== 1)
            throw new OnboardingCommercialError(
              'onboarding_exchange_rate_unavailable',
              'Exactly one current exchange rate required',
              409,
            );
          const taxes = tenant.tax_exempt
            ? []
            : await rows(
                `SELECT guid,tax_name,tax_type,tax_rate,country_code,required_tax_number FROM public.xf_tax_rule
      WHERE country_code=:country AND active=TRUE AND applies_to='license_fee' AND effective_date<=CURRENT_TIMESTAMP
      AND (expiry_date IS NULL OR expiry_date>CURRENT_TIMESTAMP) ORDER BY id`,
                { country: tenant.country_code },
              );
          if (taxes.some((t) => t.required_tax_number && !String(tenant.tax_number ?? '').trim()))
            throw new OnboardingCommercialError(
              'onboarding_tax_profile_incomplete',
              'Tax number required',
              409,
            );
          return {
            tenant: { guid: tenant.guid, primary_currency_code: tenant.primary_currency_code },
            methods,
            rate: rates[0].exchange_rate,
            taxes,
          };
        }
        const cycles = await rows(
          `SELECT c.guid,c.subtotal_usd,c.tax_amount_usd,c.total_amount_usd,c.subtotal_local,c.tax_amount_local,c.total_amount_local,
    c.exchange_rate_used,c.tax_rules_applied,c.final_employee_count FROM public.xa_billing_cycle c
    JOIN public.xa_global_license l ON l.id=c.global_license WHERE l.tenant=:id`,
          { id: tenant.id },
        );
        const events = await rows(
          `SELECT e.metadata FROM public.xa_license_event e WHERE e.tenant=:id AND e.event_type='LICENSE_CREATED'`,
          { id: tenant.id },
        );
        const requests = events.map((e) => ({
          license_guid: e.metadata?.snapshot?.license_guid,
          billing_cycle_guid: e.metadata?.snapshot?.billing_cycle_guid,
          seats: e.metadata?.request?.seats ?? null,
          unit_price_usd: e.metadata?.snapshot?.unit_price_usd ?? null,
        }));
        return {
          tenant: { guid: tenant.guid, primary_currency_code: tenant.primary_currency_code },
          licenses,
          cycles,
          requests,
          methods,
        };
      },
    );
  }
}
