import KpayWebhookModel from '../model/KpayWebhookModel.js';
import { KpayWebhookError, verifiedWebhook } from '../services/kpay-webhook-signature.js';
import KpayClient from '../services/kpay-client.js';

import KpaySettlement from './KpaySettlement.js';
import OnboardingPayment from './OnboardingPayment.js';

let settlementCursor = 0;
export default class KpayWebhook extends KpayWebhookModel {
  async receive(body: unknown) {
    const event = verifiedWebhook(body, process.env.KPAY_WEBHOOK_SECRET);
    if (!event) return { received: true, ignored: true };
    if (process.env.TOKE_KPAY_RECONCILIATION_ENABLED !== 'true')
      throw new KpayWebhookError('kpay_reconciliation_disabled', 503);
    const environment = new KpayClient().getEnvironment();
    await this.bindStored(event, environment);
    return { received: true };
  }
  async reconcile() {
    const provider = new KpayClient(),
      work = new OnboardingPayment(provider);
    const pending = await this.pendingStored(provider.getEnvironment());
    let processed = 0;
    for (const row of pending) {
      try {
        await work.refresh(Number(row.tenant_guid), Number(row.guid));
        processed++;
      } catch {
        console.error('KPay reconciliation requires review', { attempt_guid: Number(row.guid) });
      }
    }
    let settled = 0;
    if (
      process.env.TOKE_KPAY_SETTLEMENT_ENABLED === 'true' &&
      provider.getEnvironment() === 'LIVE'
    ) {
      const settlement = new KpaySettlement();
      let candidates = await settlement.pending(settlementCursor);
      if (!candidates.length && settlementCursor) {
        settlementCursor = 0;
        candidates = await settlement.pending(0);
      }
      for (const row of candidates) {
        settlementCursor = Number(row.guid);
        try {
          await settlement.settle(Number(row.tenant_guid), Number(row.guid), provider);
          settled++;
        } catch {
          console.error('KPay settlement requires review', { attempt_guid: Number(row.guid) });
        }
      }
    }
    return { processed, settled };
  }
}
