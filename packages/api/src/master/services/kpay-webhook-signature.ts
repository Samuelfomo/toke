import { createHmac, timingSafeEqual } from 'node:crypto';

export class KpayWebhookError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}
export type KpayWebhookEvent = {
  paymentId: string;
  reference: string;
  externalId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: string;
  phoneNumber: string;
  currency?: string;
  isTest?: boolean;
};
export function verifiedWebhook(
  body: unknown,
  secret: string | undefined,
): KpayWebhookEvent | null {
  if (!secret?.trim()) throw new KpayWebhookError('kpay_webhook_configuration_unavailable', 503);
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new KpayWebhookError('kpay_webhook_invalid', 400);
  const b = body as Record<string, unknown>;
  if (
    Object.keys(b).some((k) => !['raw_body_base64', 'signature', 'event_header'].includes(k)) ||
    typeof b.raw_body_base64 !== 'string' ||
    typeof b.signature !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(b.signature) ||
    b.raw_body_base64.length > 87384
  )
    throw new KpayWebhookError('kpay_webhook_invalid', 400);
  const raw = Buffer.from(b.raw_body_base64, 'base64');
  if (!raw.length || raw.length > 65536 || raw.toString('base64') !== b.raw_body_base64)
    throw new KpayWebhookError('kpay_webhook_invalid', 400);
  const expected = createHmac('sha256', secret).update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(b.signature, 'hex')))
    throw new KpayWebhookError('kpay_webhook_signature_invalid', 401);
  let e: any;
  try {
    e = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new KpayWebhookError('kpay_webhook_invalid', 400);
  }
  if (!e || typeof e !== 'object' || Array.isArray(e))
    throw new KpayWebhookError('kpay_webhook_invalid', 400);
  if (b.event_header != null && (typeof b.event_header !== 'string' || b.event_header !== e.event))
    throw new KpayWebhookError('kpay_webhook_event_mismatch', 400);
  if (
    typeof e.event === 'string' &&
    (e.event.startsWith('payout.') || e.event.startsWith('refund.'))
  )
    return null;
  const statuses: Record<string, string> = {
    'payment.completed': 'COMPLETED',
    'payment.failed': 'FAILED',
    'payment.cancelled': 'CANCELLED',
  };
  if (
    !statuses[e.event] ||
    statuses[e.event] !== e.status ||
    ![e.paymentId, e.reference, e.externalId].every(
      (v) => typeof v === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(v),
    ) ||
    !/^2376\d{8}$/.test(e.phoneNumber) ||
    !/^\d{1,10}(?:\.0{1,2})?$/.test(String(e.amount)) ||
    Number(e.amount) <= 0 ||
    (e.currency != null && e.currency !== 'XAF') ||
    (e.isTest != null && typeof e.isTest !== 'boolean')
  )
    throw new KpayWebhookError('kpay_webhook_invalid', 400);
  return {
    paymentId: e.paymentId,
    reference: e.reference,
    externalId: e.externalId,
    status: e.status,
    amount: BigInt(String(e.amount).split('.')[0]).toString(),
    phoneNumber: e.phoneNumber,
    ...(e.currency != null ? { currency: e.currency } : {}),
    ...(e.isTest != null ? { isTest: e.isTest } : {}),
  };
}
