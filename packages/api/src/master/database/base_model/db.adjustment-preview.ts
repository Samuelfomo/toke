import { Sequelize, Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

import ActivityMonitoringDb from './db.activity-monitoring.js';
import { loadRenewalPricingConfiguration } from './db.renewal-pricing.js';

export class AdjustmentPreviewDataError extends Error {}
export default class AdjustmentPreviewDb {
  constructor(private readonly connection?: Sequelize) {}
  async load(i: { tenant: number; license: number; cycle: number; start: string; end: string }) {
    const db = this.connection ?? TableInitializer.getModel('xa_license_adjustment').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        const rows = async (sql: string, replacements: Record<string, any> = {}) => {
          const [result] = await db.query(sql, { replacements, transaction });
          return result as any[];
        };
        await rows('SET TRANSACTION READ ONLY');
        const cycle = (
          await rows(
            `SELECT c.*,l.minimum_seats,l.base_price_usd,l.tenant,l.billing_mode AS license_billing_mode,t.timezone
         FROM public.xa_billing_cycle c JOIN public.xa_global_license l ON l.id=c.global_license
         JOIN public.xa_tenant t ON t.id=l.tenant
         WHERE c.guid=:cycle AND l.guid=:license AND t.guid=:tenant`,
            { cycle: i.cycle, license: i.license, tenant: i.tenant },
          )
        )[0];
        if (!cycle || cycle.license_billing_mode !== 'PREPAID' || cycle.billing_mode !== 'PREPAID')
          throw new AdjustmentPreviewDataError(
            'A prepaid billing cycle belonging to this tenant is required',
          );
        const window = (
          await rows(
            `SELECT EXISTS(SELECT 1 FROM generate_series(0,11) AS month_index(n)
         WHERE CAST(:start AS timestamptz)=((CAST(:anchor AS timestamptz) AT TIME ZONE :zone)+make_interval(months=>n)) AT TIME ZONE :zone
           AND CAST(:end AS timestamptz)=((CAST(:anchor AS timestamptz) AT TIME ZONE :zone)+make_interval(months=>n+1)) AT TIME ZONE :zone
           AND CAST(:end AS timestamptz)<=CAST(:term_end AS timestamptz)) AS valid`,
            {
              start: i.start,
              end: i.end,
              anchor: cycle.period_start,
              term_end: cycle.period_end,
              zone: cycle.timezone || 'UTC',
            },
          )
        )[0];
        if (!window?.valid)
          throw new AdjustmentPreviewDataError(
            'An anchored monthly subcycle of the selected contract is required',
          );
        const usage = await new ActivityMonitoringDb(db).monthlyUsage(
          i.license,
          i.start,
          i.end,
          transaction,
          { anchor: cycle.period_start, end: cycle.period_end },
        );
        const grants = await rows(
          `SELECT g.seats,g.source_type,g.valid_from,g.valid_until FROM public.xa_paid_seat_grant g
         JOIN public.xa_payment_transaction p ON p.id=g.payment_transaction
         WHERE g.billing_cycle=:cycle AND g.global_license=:license AND p.transaction_status::text='COMPLETED'
           AND g.valid_from<CAST(:end AS timestamptz) AND CAST(:start AS timestamptz)<g.valid_until`,
          { cycle: cycle.id, license: cycle.global_license, start: i.start, end: i.end },
        );
        let full = 0,
          partial = false,
          base = false;
        for (const grant of grants) {
          const seats = Number(grant.seats);
          if (!Number.isSafeInteger(seats) || seats <= 0) throw new Error('Invalid paid capacity');
          if (
            new Date(grant.valid_from).getTime() <= Date.parse(i.start) &&
            new Date(grant.valid_until).getTime() >= Date.parse(i.end)
          ) {
            full += seats;
            if (grant.source_type === 'CYCLE') base = true;
          } else partial = true;
        }
        if (!Number.isSafeInteger(full)) throw new Error('Invalid aggregate paid capacity');
        const offered = (
          await rows(
            `SELECT EXISTS(SELECT 1 FROM public.xa_commercial_transition WHERE global_license=:license
         AND valid_from<=CAST(:start AS timestamptz) AND valid_until>=CAST(:end AS timestamptz)) AS offered`,
            { license: cycle.global_license, start: i.start, end: i.end },
          )
        )[0];
        const existing = (
          await rows(
            `SELECT guid FROM public.xa_license_adjustment WHERE global_license=:license
         AND adjustment_kind='USAGE_REGULARIZATION' AND period_start=CAST(:start AS timestamptz)`,
            { license: cycle.global_license, start: i.start },
          )
        )[0];
        const pricing = await loadRenewalPricingConfiguration(rows, cycle.tenant);
        return {
          employees: usage.employees,
          period_closed: usage.period_closed,
          minimum_seats: Number(cycle.minimum_seats),
          unit_price_usd: String(cycle.base_price_usd),
          currency: pricing.currency,
          rate: pricing.rate,
          taxes: pricing.taxes,
          full_period_capacity: full,
          coverage_requires_review: partial,
          base_paid: base && full >= Number(cycle.minimum_seats),
          offered: !!offered?.offered,
          existing_adjustment_guid: existing ? Number(existing.guid) : null,
        };
      },
    );
  }
}
