/** Server-only KPay USSD transport. No database writes, retries or entitlement changes. */
export type KpayEnvironment = 'TEST' | 'LIVE';
export type KpayStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export interface KpayPayment {
  id: string;
  reference: string;
  externalId: string;
  status: KpayStatus;
  amount: string;
  currency: 'XAF';
  provider: 'MTN_MOMO_CMR' | 'ORANGE_CMR';
  phoneNumber: string;
  isTest: boolean;
  completedAt: string | null;
  failedAt: string | null;
}
export interface KpayInit {
  externalId: string;
  amountLocal: string;
  phoneNumber: string;
  operator: 'MTN_MOMO_CMR' | 'ORANGE_CMR';
  environment: KpayEnvironment;
}
export interface KpayConfig {
  apiKey: string;
  secretKey: string;
  environment: KpayEnvironment;
  timeoutMs: number;
}
/** UNKNOWN means the transport cannot establish whether a debit was accepted. Never retry init automatically. */
export class KpayClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly outcome: 'NOT_SENT' | 'UNKNOWN',
    public readonly httpStatus: number | null = null,
  ) {
    super(code);
    this.name = 'KpayClientError';
  }
}
export function kpayConfig(env: Record<string, string | undefined> = process.env): KpayConfig {
  const environment = env.KPAY_ENVIRONMENT ?? 'TEST';
  const apiKey = env.KPAY_API_KEY ?? '',
    secretKey = env.KPAY_SECRET_KEY ?? '';
  if (
    !['TEST', 'LIVE'].includes(environment) ||
    !apiKey.startsWith(environment === 'LIVE' ? 'kpay_live_' : 'kpay_test_') ||
    !secretKey.trim() ||
    /[\r\n]/.test(apiKey + secretKey)
  )
    throw new KpayClientError('kpay_configuration_invalid', 'NOT_SENT');
  const timeoutMs = Number(env.KPAY_TIMEOUT_MS ?? 15000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000)
    throw new KpayClientError('kpay_timeout_invalid', 'NOT_SENT');
  return { apiKey, secretKey, environment: environment as KpayEnvironment, timeoutMs };
}
function integerAmount(value: unknown): string {
  if (!/^\d{1,10}(?:\.0{1,2})?$/.test(String(value)))
    throw new KpayClientError('kpay_amount_requires_integer_xaf', 'NOT_SENT');
  const n = BigInt(String(value).split('.')[0]);
  if (n <= 0n) throw new KpayClientError('kpay_amount_requires_integer_xaf', 'NOT_SENT');
  return n.toString();
}
function identity(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_:-]{1,128}$/.test(value);
}
function payment(raw: any, environment: KpayEnvironment): KpayPayment {
  const bad = () => {
    throw new KpayClientError('kpay_response_invalid', 'UNKNOWN');
  };
  if (
    !raw ||
    !identity(raw.id) ||
    !identity(raw.reference) ||
    !identity(raw.externalId) ||
    !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(raw.status) ||
    raw.currency !== 'XAF' ||
    !['MTN_MOMO_CMR', 'ORANGE_CMR'].includes(raw.provider) ||
    !/^2376\d{8}$/.test(raw.phoneNumber) ||
    typeof raw.isTest !== 'boolean' ||
    raw.isTest !== (environment === 'TEST')
  )
    return bad();
  let amount: string;
  try {
    amount = integerAmount(raw.amount);
  } catch {
    return bad();
  }
  for (const field of ['completedAt', 'failedAt'])
    if (
      raw[field] != null &&
      (typeof raw[field] !== 'string' || !Number.isFinite(Date.parse(raw[field])))
    )
      return bad();
  return {
    id: raw.id,
    reference: raw.reference,
    externalId: raw.externalId,
    status: raw.status,
    amount,
    currency: 'XAF',
    provider: raw.provider,
    phoneNumber: raw.phoneNumber,
    isTest: raw.isTest,
    completedAt: raw.completedAt ?? null,
    failedAt: raw.failedAt ?? null,
  };
}
export default class KpayClient {
  private readonly config: KpayConfig;
  constructor(
    config: KpayConfig = kpayConfig(),
    private readonly transport: typeof fetch = fetch,
  ) {
    // Validate injected configuration too, so environment guards cannot be bypassed accidentally.
    this.config = kpayConfig({
      KPAY_API_KEY: config.apiKey,
      KPAY_SECRET_KEY: config.secretKey,
      KPAY_ENVIRONMENT: config.environment,
      KPAY_TIMEOUT_MS: String(config.timeoutMs),
    });
  }
  getEnvironment(): KpayEnvironment {
    return this.config.environment;
  }
  async initiate(input: KpayInit): Promise<KpayPayment> {
    if (
      input.environment !== this.config.environment ||
      !identity(input.externalId) ||
      !['MTN_MOMO_CMR', 'ORANGE_CMR'].includes(input.operator) ||
      !/^2376\d{8}$/.test(input.phoneNumber)
    )
      throw new KpayClientError('kpay_request_invalid', 'NOT_SENT');
    const amount = integerAmount(input.amountLocal);
    const raw = await this.request('/api/v1/payments/init', 'POST', {
      amount: Number(amount),
      provider: input.operator,
      phoneNumber: input.phoneNumber,
      externalId: input.externalId,
    });
    const result = payment(raw, this.config.environment);
    if (
      result.externalId !== input.externalId ||
      result.amount !== amount ||
      result.provider !== input.operator ||
      result.phoneNumber !== input.phoneNumber
    )
      throw new KpayClientError('kpay_response_mismatch', 'UNKNOWN');
    return result;
  }
  async getPayment(id: string): Promise<KpayPayment> {
    if (!identity(id)) throw new KpayClientError('kpay_payment_id_invalid', 'NOT_SENT');
    const result = payment(
      await this.request('/api/v1/payments/' + encodeURIComponent(id), 'GET'),
      this.config.environment,
    );
    if (result.id !== id) throw new KpayClientError('kpay_response_mismatch', 'UNKNOWN');
    return result;
  }
  private async request(path: string, method: 'GET' | 'POST', body?: object): Promise<unknown> {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.transport('https://admin.kpay.site' + path, {
        method,
        redirect: 'error',
        signal: controller.signal,
        headers: {
          'X-API-Key': this.config.apiKey,
          'X-Secret-Key': this.config.secretKey,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new KpayClientError(
          response.status === 409 ? 'kpay_external_id_conflict' : 'kpay_http_error',
          'UNKNOWN',
          response.status,
        );
      }
      if (
        !(response.headers.get('content-type') ?? '').toLowerCase().includes('application/json')
      ) {
        await response.body?.cancel();
        throw new KpayClientError('kpay_response_invalid', 'UNKNOWN');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new KpayClientError('kpay_response_invalid', 'UNKNOWN');
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 65536) {
          await reader.cancel();
          throw new KpayClientError('kpay_response_too_large', 'UNKNOWN');
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      try {
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new KpayClientError('kpay_response_invalid', 'UNKNOWN');
      }
    } catch (error) {
      if (error instanceof KpayClientError) throw error;
      throw new KpayClientError(
        controller.signal.aborted ? 'kpay_timeout' : 'kpay_network_error',
        'UNKNOWN',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
