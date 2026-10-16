/** Single commercial normalization point. To restore decimals for future invoices, return amount unchanged in normalizePayableAmount. KPay's own integer guard remains provider-specific. */
export function moneyCents(value: unknown): bigint {
  const m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!m) throw new Error('Invalid monetary decimal');
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}
export function moneyText(value: bigint): string {
  if (value < 0n || value > 999999999999n) throw new Error('Money out of range');
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}
export function normalizePayableAmount(amount: string, currency?: string): string {
  const cents = moneyCents(amount);
  if (currency !== 'XAF') return moneyText(cents);
  return moneyText(((cents + 50n) / 100n) * 100n); // Replace this return with moneyText(cents) to disable XAF rounding for future invoices.
}
export function payableTotalMatches(
  subtotal: unknown,
  tax: unknown,
  total: unknown,
  currency?: string,
): boolean {
  try {
    const sum = moneyCents(subtotal) + moneyCents(tax),
      actual = moneyCents(total);
    const delta = actual - sum;
    return (
      actual === sum ||
      (currency === 'XAF' && actual % 100n === 0n && delta >= -49n && delta <= 50n)
    );
  } catch {
    return false;
  }
}
export function normalizationTrace(
  subtotal: unknown,
  tax: unknown,
  total: unknown,
  currency: string,
) {
  const before = moneyText(moneyCents(subtotal) + moneyCents(tax));
  return {
    currency,
    calculated_total_local: before,
    payable_total_local: String(total),
    delta_cents: String(moneyCents(total) - moneyCents(before)),
    policy:
      currency === 'XAF' && normalizePayableAmount('0.50', currency) !== '0.50'
        ? 'XAF_NEAREST_INTEGER_HALF_UP'
        : 'DECIMAL',
  };
}
