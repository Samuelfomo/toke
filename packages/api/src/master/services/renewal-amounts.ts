export function decimalUnits(value: unknown, scale: number): bigint {
  const match = new RegExp('^(\\d{1,12})(?:\\.(\\d{1,' + scale + '}))?$').exec(String(value));
  if (!match) throw new Error('Invalid stored decimal');
  return BigInt(match[1]) * 10n ** BigInt(scale) + BigInt((match[2] ?? '').padEnd(scale, '0'));
}
export function centsText(cents: bigint): string {
  if (cents < 0n || cents > 999999999999n) throw new Error('Amount exceeds DECIMAL(12,2)');
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
export function renewalAmounts(subtotal: string, rate: unknown, taxes: unknown[]) {
  const usd = decimalUnits(subtotal, 2),
    fx = decimalUnits(rate, 6);
  if (usd <= 0n || fx <= 0n || fx > 999999999999n)
    throw new Error('Positive subtotal and exchange rate required');
  const baseLocal = (usd * fx + 500000n) / 1000000n;
  let taxUsd = 0n,
    taxLocal = 0n;
  for (const value of taxes) {
    const r = decimalUnits(value, 4);
    if (r > 10000n) throw new Error('Invalid tax rate');
    taxUsd += (usd * r + 5000n) / 10000n;
    taxLocal += (baseLocal * r + 5000n) / 10000n;
  }
  return {
    baseUsd: centsText(usd),
    baseLocal: centsText(baseLocal),
    taxUsd: centsText(taxUsd),
    taxLocal: centsText(taxLocal),
    totalUsd: centsText(usd + taxUsd),
    totalLocal: centsText(baseLocal + taxLocal),
  };
}
