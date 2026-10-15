import PaymentAttemptDb from '../database/base_model/db.payment-attempt.js';
import type { KpayWebhookEvent } from '../services/kpay-webhook-signature.js';

export default class KpayWebhookModel {
  constructor(protected readonly data: PaymentAttemptDb = new PaymentAttemptDb()) {}
  protected bindStored(event: KpayWebhookEvent, environment: 'TEST' | 'LIVE') {
    return this.data.bindWebhook(event, environment);
  }
  protected pendingStored(environment: 'TEST' | 'LIVE') {
    return this.data.pending(environment);
  }
}
