export type PaymentSource = 'CYCLE' | 'ADJUSTMENT';
export interface FinancialSource {
  licenseId: number | undefined;
  status: string | undefined;
  amountUsd: unknown;
  amountLocal: unknown;
  currency: string | undefined;
  exchangeRate: unknown;
}
export class PaymentDraftError extends Error {}
export function readPaymentRequest(body: any) {
  if (!body || !['CYCLE', 'ADJUSTMENT'].includes(body.payment_for)) {
    throw new PaymentDraftError('payment_for must be CYCLE or ADJUSTMENT');
  }
  const key = body.payment_for === 'CYCLE' ? 'billing_cycle' : 'adjustment';
  const result: Record<string, number> = {};
  for (const field of [key, 'payment_method']) {
    const value = String(body[field] ?? '');
    if (!/^[1-9][0-9]{5}$/.test(value))
      throw new PaymentDraftError(`${field} must be a six-digit GUID`);
    result[field] = Number(value);
  }
  const other = key === 'billing_cycle' ? 'adjustment' : 'billing_cycle';
  if (body[other] != null) throw new PaymentDraftError('Only one payment source is accepted');
  return {
    billing_cycle: result.billing_cycle,
    adjustment: result.adjustment,
    payment_method: result.payment_method,
    payment_for: body.payment_for as PaymentSource,
  };
}
export function buildPaymentDraft(source: PaymentSource, debt: FinancialSource) {
  if (!['CYCLE', 'ADJUSTMENT'].includes(source) || !debt.licenseId)
    throw new PaymentDraftError('Invalid payment source');
  if (!['PENDING', 'FAILED', 'OVERDUE'].includes(String(debt.status))) {
    throw new PaymentDraftError('This debt cannot be paid');
  }
  function positive(value: unknown, label: string): number {
    if (value === null || value === undefined || value === '')
      throw new PaymentDraftError(`${label} is missing`);
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new PaymentDraftError(`${label} must be positive`);
    return n;
  }
  if (!debt.currency || !/^[A-Z]{3}$/.test(debt.currency))
    throw new PaymentDraftError('Invalid stored currency');
  return {
    amount_usd: positive(debt.amountUsd, 'Stored USD amount'),
    amount_local: positive(debt.amountLocal, 'Stored local amount'),
    currency_code: debt.currency,
    exchange_rate_used: positive(debt.exchangeRate, 'Stored exchange rate'),
  };
}
