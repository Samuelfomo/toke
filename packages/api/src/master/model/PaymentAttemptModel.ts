import type { KpayPayment } from '../services/kpay-client.js';
import PaymentAttemptDb from '../database/base_model/db.payment-attempt.js';
import type { PaymentAttemptInput } from '../class/payment-attempt-contract.js';

export default class PaymentAttemptModel {
  protected record: Record<string, any> = {};
  constructor(protected readonly data: PaymentAttemptDb = new PaymentAttemptDb()) {}
  protected reserveStored(input: PaymentAttemptInput) {
    return this.data.reserve(input);
  }
  protected markDispatchStored(tenant: number, guid: number) {
    return this.data.markDispatch(tenant, guid);
  }
  protected claimRefreshStored(tenant: number, guid: number) {
    return this.data.claimRefresh(tenant, guid);
  }
  protected recordProviderStored(tenant: number, guid: number, result: KpayPayment) {
    return this.data.recordProvider(tenant, guid, result);
  }
  protected listStored(tenant: number, payment: number) {
    return this.data.list(tenant, payment);
  }
  protected loadStored(tenant: number, attempt: number) {
    return this.data.load(tenant, attempt);
  }
}
