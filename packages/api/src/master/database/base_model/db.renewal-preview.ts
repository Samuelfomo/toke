import type { Sequelize } from 'sequelize';
import { Transaction } from 'sequelize';

import { monthlySeatCount } from '../../services/monthly-usage.js';
import { renewalSelection, type RenewalSelection } from '../../services/renewal-selection.js';

import ActivityMonitoringDb from './db.activity-monitoring.js';
import { loadRenewalPricing } from './db.renewal-pricing.js';


export class RenewalPreviewError extends Error {}
export function renewalSubtotal(price: unknown, seats: number, months: number): string {
  if (typeof price !== 'string' && typeof price !== 'number')
    throw new RenewalPreviewError('Invalid price');
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(price));
  if (!match || !Number.isSafeInteger(seats) || seats < 0 || ![1, 3, 6, 12].includes(months))
    throw new RenewalPreviewError('Invalid renewal parameters');
  const cents =
    (BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'))) *
    BigInt(seats) *
    BigInt(months);
  if (cents > 999999999999n) throw new RenewalPreviewError('Amount exceeds supported precision');
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
export type RenewalPreview = Awaited<ReturnType<typeof calculateRenewalPreview>>;
export async function previewRenewal(
  db: Sequelize,
  licenseGuid: number,
  selection: RenewalSelection = {},
): Promise<RenewalPreview> {
  if (!Number.isInteger(licenseGuid) || licenseGuid < 100000 || licenseGuid > 999999)
    throw new RenewalPreviewError('Invalid license GUID');
  return db.transaction<RenewalPreview>(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    (transaction) => calculateRenewalPreview(db, licenseGuid, transaction, selection),
  );
}
export async function calculateRenewalPreview(
  db: Sequelize,
  licenseGuid: number,
  transaction: Transaction,
  selection: RenewalSelection = {},
) {
  async function rows(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
    const [result] = await db.query(sql, { transaction, replacements });
    return result as any[];
  }
  const license = (
    await rows('SELECT * FROM xa_global_license WHERE guid= :guid', { guid: licenseGuid })
  )[0];
  if (!license) throw new RenewalPreviewError('License not found');
  if (license.billing_mode === 'POSTPAID')
    throw new RenewalPreviewError('Postpaid closure is required; prepaid renewal is forbidden');
  const requested = renewalSelection(selection);
  if (!['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(license.license_status))
    throw new RenewalPreviewError('License requires review before renewal');
  if (
    !license.current_period_end ||
    !license.next_renewal_date ||
    new Date(license.current_period_end).getTime() !== new Date(license.next_renewal_date).getTime()
  )
    throw new RenewalPreviewError('Renewal dates require reconciliation');
  const months = requested.billing_cycle_months ?? Number(license.billing_cycle_months),
    minimum = Number(license.minimum_seats);
  if (![1, 3, 6, 12].includes(months) || !Number.isSafeInteger(minimum) || minimum < 5)
    throw new RenewalPreviewError('Invalid billing cycle or minimum seats');
  const timezoneRow = (
    await rows('SELECT timezone FROM xa_tenant WHERE id = :id', { id: license.tenant })
  )[0];
  const timezone = timezoneRow?.timezone || 'UTC';
  if (
    !(await rows('SELECT name FROM pg_timezone_names WHERE name = :zone', { zone: timezone }))
      .length
  )
    throw new RenewalPreviewError('Invalid billing timezone');
  const period = (
    await rows(
      `SELECT CAST(:start AS timestamptz) AS period_start,
   ((CAST(:start AS timestamptz) AT TIME ZONE :zone) + make_interval(months => CAST(:months AS integer))) AT TIME ZONE :zone AS period_end,
   ((CAST(:start AS timestamptz) AT TIME ZONE :zone) + INTERVAL '7 days') AT TIME ZONE :zone AS payment_due_date,
   (CAST(:anchor AS timestamptz) AT TIME ZONE :zone)=date_trunc('day',CAST(:anchor AS timestamptz) AT TIME ZONE :zone)
   AND CAST(:start AS timestamptz)=((CAST(:anchor AS timestamptz) AT TIME ZONE :zone)+make_interval(months => CAST(:old_months AS integer))) AT TIME ZONE :zone AS current_period_coherent`,
      {
        start: license.current_period_end,
        months,
        zone: timezone,
        anchor: license.current_period_start,
        old_months: Number(license.billing_cycle_months),
      },
    )
  )[0];
  if (!period?.current_period_coherent)
    throw new RenewalPreviewError('Current period dates require reconciliation');
  // Bornes de chaque mois depuis l'ancre d'origine, sans dérive des fins de mois.
  const windows = await rows(
    `WITH boundaries AS (
       SELECT n,
        ((CAST(:anchor AS timestamptz) AT TIME ZONE :zone)+make_interval(months => n)) AT TIME ZONE :zone AS period_start,
        ((CAST(:anchor AS timestamptz) AT TIME ZONE :zone)+make_interval(months => n+1)) AT TIME ZONE :zone AS period_end
       FROM generate_series(0,11) AS month_index(n)
     ) SELECT *,period_end<=CURRENT_TIMESTAMP AS closed,period_start<=CURRENT_TIMESTAMP AS started
       FROM boundaries WHERE period_start>=CAST(:anchor AS timestamptz) AND period_end<=CAST(:term_end AS timestamptz)
       ORDER BY period_end`,
    { anchor: license.current_period_start, term_end: license.current_period_end, zone: timezone },
  );
  const closed = windows.filter((w) => w.closed);
  const reference = closed[closed.length - 1] ?? windows.find((w) => w.started && !w.closed);
  let employees: any[] = [];
  if (reference) {
    try {
      const usage = await new ActivityMonitoringDb(db).monthlyUsage(
        licenseGuid,
        new Date(reference.period_start).toISOString(),
        new Date(reference.period_end).toISOString(),
        transaction,
      );
      employees = usage.employees;
    } catch (error: any) {
      throw new RenewalPreviewError(error.message);
    }
  }
  const { count, seats: observedSeats } = monthlySeatCount(minimum, employees);
  // Aucun mois terminé : conserver la capacité achetée comme proposition prudente.
  const capacity = (
    await rows(
      `SELECT COALESCE(SUM(seats),0) AS seats FROM xa_paid_seat_grant
     WHERE global_license= :license AND source_type='CYCLE'
       AND valid_from<=CAST(:start AS timestamptz) AND valid_until=CAST(:end AS timestamptz)`,
      { license: license.id, start: license.current_period_start, end: license.current_period_end },
    )
  )[0];
  const purchased = Number(capacity?.seats ?? 0);
  if (!Number.isSafeInteger(purchased) || purchased < 0)
    throw new RenewalPreviewError('Invalid paid capacity');
  const suggested = reference?.closed ? observedSeats : Math.max(observedSeats, purchased);
  const seats = requested.requested_seats ?? suggested;
  if (seats < minimum || seats > 32767)
    throw new RenewalPreviewError('Seats outside contractual limits');
  const subtotal = renewalSubtotal(license.base_price_usd, seats, months);
  let pricing;
  try {
    pricing = await loadRenewalPricing(rows, license.tenant, subtotal);
  } catch (error: any) {
    throw new RenewalPreviewError(error.message);
  }
  return {
    license_guid: licenseGuid,
    period_start: period.period_start,
    period_end: period.period_end,
    billing_cycle_months: months,
    billable_employees: count,
    suggested_seats: suggested,
    requested_seats: seats,
    billed_seats: seats,
    billing_basis: reference?.closed
      ? 'LAST_CLOSED_MONTHLY_CYCLE'
      : 'PROVISIONAL_USAGE_AND_PAID_CAPACITY',
    reference_period_start: reference?.period_start ?? null,
    reference_period_end: reference?.period_end ?? null,
    reference_period_closed: !!reference?.closed,
    reference_employees: employees.map((e) => ({
      employee_license_guid: e.employee_license_guid,
      active_days: e.active_days,
    })),
    billing_activity_rule: 'AT_LEAST_ONE_SIGNAL_IN_CYCLE',
    data_completeness: 'NOT_ATTESTED',
    suggested_seats_provisional: !reference?.closed,
    grace_days: 7,
    payment_due_date: period.payment_due_date,
    minimum_seats: minimum,
    maximum_seats: 32767,
    allowed_billing_cycle_months: [1, 3, 6, 12],
    unit_price_usd: String(license.base_price_usd),
    subtotal_usd: subtotal,
    amounts: pricing.amounts,
    subtotal_local: pricing.amounts.baseLocal,
    tax_amount_local: pricing.amounts.taxLocal,
    total_amount_local: pricing.amounts.totalLocal,
    tax_amount_usd: pricing.amounts.taxUsd,
    total_amount_usd: pricing.amounts.totalUsd,
    billing_currency_code: pricing.currency,
    exchange_rate_used: pricing.rate,
    exchange_rate_guid: pricing.exchange_rate_guid,
    tax_rules_applied: pricing.taxes.map((t) => ({
      guid: t.guid,
      tax_name: t.tax_name,
      tax_rate: String(t.tax_rate),
      tax_type: t.tax_type,
    })),
    reconciliation_required: false,
    warning:
      'Estimate only; selected future capacity is not a retrospective usage invoice. Missing signals are not proof of no usage.',

    is_estimate: true,
    taxes_included: true,
    calendar_timezone: timezone,
  };
}
