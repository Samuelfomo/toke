import KpaySettlementDb from '../database/base_model/db.kpay-settlement.js';
import type { KpayPayment } from '../services/kpay-client.js';

export default class KpaySettlementModel {
  constructor(protected readonly data: KpaySettlementDb = new KpaySettlementDb()) {}
  protected candidateStored(tenant: number, attempt: number) {
    return this.data.candidate(tenant, attempt);
  }
  protected settleStored(tenant: number, attempt: number, result: KpayPayment) {
    return this.data.settle(tenant, attempt, result);
  }
  protected pendingStored(after: number) {
    return this.data.pending(after);
  }
}
