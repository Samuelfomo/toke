import KpaySettlementModel from '../model/KpaySettlementModel.js';
import KpayClient from '../services/kpay-client.js';

import { guid, PaymentAttemptError } from './payment-attempt-contract.js';

export default class KpaySettlement extends KpaySettlementModel {
  async settle(
    tenant: number,
    attempt: number,
    provider?: Pick<KpayClient, 'getEnvironment' | 'getPayment'>,
  ) {
    guid(tenant);
    guid(attempt);
    const row = await this.candidateStored(tenant, attempt);
    if (!row) throw new PaymentAttemptError('Attempt not found', 404);
    if (row.environment !== 'LIVE') return { status: 'TEST_NOT_SETTLED' };
    if (process.env.TOKE_KPAY_SETTLEMENT_ENABLED !== 'true') return { status: 'DISABLED' };
    if (row.status !== 'COMPLETED' || !row.provider_payment_id) return { status: 'PENDING' };
    const client = provider ?? new KpayClient();
    if (client.getEnvironment() !== 'LIVE')
      throw new PaymentAttemptError('LIVE settlement requires LIVE provider configuration');
    // Always re-query with server credentials, including attempts marked COMPLETED by an earlier init response.
    const verified = await client.getPayment(row.provider_payment_id);
    return this.settleStored(tenant, attempt, verified);
  }
  async pending(after: number) {
    return this.pendingStored(after);
  }
}
