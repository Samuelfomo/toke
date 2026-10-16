import type { RenewalRows } from './db.renewal-pricing.js';

/** Appelé dans la transaction qui active le cycle payé. */
export async function renewalCycleMonths(
  rows: RenewalRows,
  cycleId: number,
  fallback: number,
): Promise<number> {
  const preparation = (
    await rows('SELECT snapshot FROM xa_renewal_preparation WHERE billing_cycle= :cycle', {
      cycle: cycleId,
    })
  )[0];
  if (preparation?.snapshot?.operation !== 'PREPAID_RENEWAL_V2') return fallback;
  const months = Number(preparation.snapshot.billing_cycle_months);
  if (![1, 3, 6, 12].includes(months)) throw new Error('Invalid prepared renewal duration');
  return months;
}
