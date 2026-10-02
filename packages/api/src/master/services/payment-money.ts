/** Validation des représentations DECIMAL(12,2) et DECIMAL(12,6) existantes.
 * Les valeurs sont arrondies indépendamment ; aucun montant n'est réécrit.
 */
function scaledDecimal(value: unknown, scale: number): bigint | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text) || text.length > 40) return null;
  const [whole, fraction = ''] = text.split('.');
  const digits = fraction.padEnd(scale, '0').slice(0, scale);
  let result = BigInt(whole) * 10n ** BigInt(scale) + BigInt(digits || '0');
  if (fraction.length > scale && fraction[scale] >= '5') result += 1n;
  return result;
}
export function paymentAmountsConsistent(
  amountUsd: unknown,
  amountLocal: unknown,
  exchangeRate: unknown,
): boolean {
  const usd = scaledDecimal(amountUsd, 2);
  const local = scaledDecimal(amountLocal, 2);
  const rate = scaledDecimal(exchangeRate, 6);
  if (usd === null || local === null || rate === null || rate <= 0n) return false;
  if ((usd === 0n) !== (local === 0n)) return false;
  const difference = usd * rate - local * 1000000n;
  const absolute = difference < 0n ? -difference : difference;
  // Demi-cent USD converti + demi-cent local : bornes des arrondis indépendants.
  return 2n * absolute <= rate + 1000000n;
}
