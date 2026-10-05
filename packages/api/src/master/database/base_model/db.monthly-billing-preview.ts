import { Sequelize, Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

import ActivityMonitoringDb, { ActivityMonitoringDataError } from './db.activity-monitoring.js';

export class MonthlyBillingPreviewDataError extends Error {}
export default class MonthlyBillingPreviewDb {
  constructor(private readonly connection?: Sequelize) {}
  async load(
    tenantGuid: number,
    licenseGuid: number,
    start: string,
    end: string,
  ): Promise<Record<string, any>> {
    const db = this.connection ?? TableInitializer.getModel('xa_employee_license').sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return db.transaction<Record<string, any>>(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        await db.query('SET TRANSACTION READ ONLY', { transaction });
        const rows = async (sql: string, replacements: Record<string, any> = {}) => {
          const [r] = await db.query(sql, { transaction, replacements });
          return r as any[];
        };
        const tenant = (
          await rows(
            `SELECT t.guid,t.primary_currency_code,t.country_code,t.tax_exempt,t.tax_number
    FROM xa_tenant t JOIN xa_global_license gl ON gl.tenant=t.id
    WHERE gl.guid = :license AND t.guid = :tenant`,
            { license: licenseGuid, tenant: tenantGuid },
          )
        )[0];
        if (!tenant) throw new MonthlyBillingPreviewDataError('License does not belong to tenant');
        let usage;
        try {
          usage = await new ActivityMonitoringDb(db).monthlyUsage(
            licenseGuid,
            start,
            end,
            transaction,
          );
        } catch (error) {
          if (error instanceof ActivityMonitoringDataError)
            throw new MonthlyBillingPreviewDataError(error.message);
          throw error;
        }
        const currency = tenant.primary_currency_code;
        if (!/^[A-Z]{3}$/.test(currency ?? '') || !tenant.country_code)
          throw new MonthlyBillingPreviewDataError('Billing profile incomplete');
        const rates =
          currency === 'USD'
            ? []
            : await rows(
                `SELECT guid,exchange_rate,updated_at FROM xf_exchange_rate
    WHERE from_currency_code='USD' AND to_currency_code = :currency AND current=true`,
                { currency },
              );
        if (currency !== 'USD' && rates.length !== 1)
          throw new MonthlyBillingPreviewDataError('Exactly one current exchange rate required');
        const taxes = await rows(
          `SELECT guid,tax_name,tax_rate,required_tax_number FROM xf_tax_rule
    WHERE country_code = :country AND active=true AND applies_to='license_fee'
     AND effective_date<=CURRENT_TIMESTAMP AND (expiry_date IS NULL OR CURRENT_TIMESTAMP<expiry_date) ORDER BY id`,
          { country: tenant.country_code },
        );
        if (
          !tenant.tax_exempt &&
          (!taxes.length ||
            taxes.some((t) => t.required_tax_number && !String(tenant.tax_number ?? '').trim()))
        )
          throw new MonthlyBillingPreviewDataError(
            'Tax configuration or required tax number needs review',
          );
        return {
          usage,
          currency,
          exchange_rate: currency === 'USD' ? '1.000000' : String(rates[0].exchange_rate),
          exchange_rate_guid: rates[0]?.guid ?? null,
          exchange_rate_updated_at: rates[0]?.updated_at ?? null,
          tax_exempt: !!tenant.tax_exempt,
          taxes: tenant.tax_exempt ? [] : taxes,
        };
      },
    );
  }
}
