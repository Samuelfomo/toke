import KpayClient, { KpayClientError } from '../services/kpay-client.js';

import KpaySettlement from './KpaySettlement.js';
import PaymentAttempt from './PaymentAttempt.js';
import { guid, PaymentAttemptError } from './payment-attempt-contract.js';

export default class OnboardingPayment {
  constructor(
    private readonly provider?: Pick<KpayClient, 'getEnvironment' | 'initiate' | 'getPayment'>,
    private readonly makeAttempt: () => PaymentAttempt = () => new PaymentAttempt(),
  ) {}

  async initiate(tenant: number, body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new PaymentAttemptError('Invalid payment request', 400);
    const b = body as Record<string, unknown>;
    if (
      Object.keys(b).length !== 3 ||
      Object.keys(b).some(
        (k) => !['payment_transaction_guid', 'phone_number', 'idempotency_key'].includes(k),
      ) ||
      typeof b.phone_number !== 'string' ||
      typeof b.idempotency_key !== 'string'
    )
      throw new PaymentAttemptError(
        'Expected transaction GUID, phone number and idempotency key',
        400,
      );
    const provider = this.client();
    const attempt = this.makeAttempt()
      .setTenantGuid(guid(tenant))
      .setPaymentTransactionGuid(guid(b.payment_transaction_guid))
      .setPhoneNumber(b.phone_number)
      .setIdempotencyKey(b.idempotency_key)
      .setEnvironment(provider.getEnvironment());
    await attempt.save();
    if (attempt.isReplay()) return this.finalize(attempt, tenant, true);
    // Persist uncertainty before outbound I/O. A crash or concurrent replay cannot resend this attempt.
    await attempt.markDispatched(tenant);
    let result;
    try {
      result = await provider.initiate({
        externalId: attempt.getExternalId()!,
        amountLocal: attempt.getAmountLocal()!,
        phoneNumber: attempt.getPhoneNumber()!,
        operator: attempt.getOperator() as 'MTN_MOMO_CMR' | 'ORANGE_CMR',
        environment: provider.getEnvironment(),
      });
    } catch (error) {
      if (error instanceof KpayClientError) return this.projection(attempt, false, error.code);
      throw error;
    }
    try {
      await attempt.recordVerifiedProviderResult(tenant, result);
    } catch {
      return this.projection(attempt, false, 'payment_result_requires_reconciliation');
    }
    return this.finalize(attempt, tenant);
  }

  async list(tenant: number, transactionGuid: number) {
    return {
      payment_transaction_guid: guid(transactionGuid),
      attempts: await this.makeAttempt().listForTransaction(guid(tenant), transactionGuid),
    };
  }

  async status(tenant: number, attemptGuid: number) {
    const a = await this.makeAttempt().load(guid(tenant), guid(attemptGuid));
    if (!a) throw new PaymentAttemptError('Attempt not found', 404);
    return this.projection(a);
  }

  async refresh(tenant: number, attemptGuid: number) {
    const a = await this.makeAttempt().load(guid(tenant), guid(attemptGuid));
    if (!a) throw new PaymentAttemptError('Attempt not found', 404);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(a.getStatus()!))
      return this.finalize(a, tenant);
    const provider = this.client();
    if (a.getEnvironment() !== provider.getEnvironment())
      throw new PaymentAttemptError('Attempt environment differs from configured provider');
    if (!a.getProviderPaymentId())
      return this.projection(a, false, 'payment_provider_id_unavailable');
    if (!(await a.claimStatusRefresh(tenant)))
      return this.projection(a, false, 'payment_refresh_throttled');
    let result;
    try {
      result = await provider.getPayment(a.getProviderPaymentId()!);
    } catch (error) {
      if (error instanceof KpayClientError) return this.projection(a, false, error.code);
      throw error;
    }
    await a.recordVerifiedProviderResult(tenant, result);
    return this.finalize(a, tenant);
  }

  private client() {
    return this.provider ?? new KpayClient();
  }

  private projection(a: PaymentAttempt, replayed = false, code: string | null = null) {
    return {
      attempt: a.toJSON(),
      replayed,
      financial_settlement: 'CHECK_TENANT_STATUS',
      reconciliation_required: a.getStatus() === 'UNKNOWN' || a.getStatus() === 'CREATED',
      ...(code ? { notice_code: code } : {}),
    };
  }

  private async finalize(a: PaymentAttempt, tenant: number, replayed = false) {
    const base = this.projection(a, replayed);
    if (a.getStatus() !== 'COMPLETED') return base;
    try {
      const settlement = await new KpaySettlement().settle(tenant, a.getGuid()!, this.provider);
      return { ...base, financial_settlement: settlement.status, settlement };
    } catch {
      return {
        ...base,
        financial_settlement: 'RECONCILIATION_REQUIRED',
        notice_code: 'payment_settlement_requires_review',
      };
    }
  }
}
