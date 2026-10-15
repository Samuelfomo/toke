export const ATTEMPT_STATUSES = [
  'CREATED',
  'UNKNOWN',
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];
export type PaymentAttemptInput = {
  tenantGuid: number;
  transactionGuid: number;
  phoneNumber: string;
  idempotencyKey: string;
  environment: 'TEST' | 'LIVE';
};
export class PaymentAttemptError extends Error {
  constructor(
    message: string,
    public readonly status = 409,
  ) {
    super(message);
  }
}
export function guid(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 100000 || Number(value) > 999999)
    throw new PaymentAttemptError('Invalid public GUID', 400);
  return Number(value);
}
export function normalizeAttempt(i: PaymentAttemptInput): PaymentAttemptInput {
  guid(i.tenantGuid);
  guid(i.transactionGuid);
  if (!['TEST', 'LIVE'].includes(i.environment))
    throw new PaymentAttemptError('Invalid payment environment', 400);
  const phone = String(i.phoneNumber ?? '')
    .trim()
    .replace(/^\+/, '');
  if (!/^2376\d{8}$/.test(phone))
    throw new PaymentAttemptError('Expected Cameroon international phone number', 400);
  if (typeof i.idempotencyKey !== 'string' || !/^[A-Za-z0-9_:-]{8,128}$/.test(i.idempotencyKey))
    throw new PaymentAttemptError('Invalid idempotency key', 400);
  return { ...i, phoneNumber: phone };
}
export function wholeXaf(v: unknown): string {
  const text = String(v);
  if (!/^\d{1,10}(?:\.0{1,2})?$/.test(text) || BigInt(text.split('.')[0]) <= 0n)
    throw new PaymentAttemptError(
      'XAF payment requires a positive integer amount; invoice reconciliation required',
    );
  return BigInt(text.split('.')[0]).toString();
}
export function canTransition(from: AttemptStatus, to: AttemptStatus): boolean {
  if (!ATTEMPT_STATUSES.includes(from) || !ATTEMPT_STATUSES.includes(to)) return false;
  if (from === to) return true;
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(from)) return false;
  if (from === 'PROCESSING' && ['CREATED', 'PENDING'].includes(to)) return false;
  return to !== 'CREATED';
}
export function providerFor(code: string): string {
  if (code === 'MTN_MOMO') return 'MTN_MOMO_CMR';
  if (code === 'ORANGE_MONEY') return 'ORANGE_CMR';
  throw new PaymentAttemptError('Unsupported payment method');
}
