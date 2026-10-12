import PostpaidCashModel from '../model/PostpaidCashModel.js';

import { activityDate, activityGuid } from './activity-monitoring-input.js';
import { closureText } from './PostpaidClosure.js';

export { PostpaidCashError } from '../database/base_model/db.postpaid-cash.js';
export class PostpaidCashInputError extends Error {}
export default class PostpaidCash extends PostpaidCashModel {
  async receive(payment: unknown, b: Record<string, any>): Promise<Record<string, any>> {
    if (
      !/^\d{1,10}(?:\.\d{1,2})?$/.test(String(b.amount_local ?? '')) ||
      !/[1-9]/.test(String(b.amount_local))
    )
      throw new PostpaidCashInputError('Positive cash amount required');
    if (!/^[A-Z]{3}$/.test(b.currency_code ?? ''))
      throw new PostpaidCashInputError('Currency code required');
    const receivedAt = activityDate(b.received_at);
    if (Date.parse(receivedAt) > Date.now())
      throw new PostpaidCashInputError('Receipt date is in the future');
    const raw = await this.receiveData({
      tenant: activityGuid(b.tenant_guid),
      payment: activityGuid(payment),
      actor: closureText(b.actor_user_guid, 'actor_user_guid'),
      amount: String(b.amount_local),
      currency: b.currency_code,
      receivedAt,
      reference: closureText(b.receipt_reference, 'receipt_reference'),
      key: closureText(b.idempotency_key, 'idempotency_key'),
    });
    return {
      tenant_guid: raw.tenant_guid,
      license_guid: raw.license_guid,
      billing_cycle_guid: raw.billing_cycle_guid,
      payment_transaction_guid: raw.payment_transaction_guid,
      receipt_reference: raw.receipt_reference,
      replayed: raw.replayed,
      billing_mode: raw.billing_mode,
      currency_code: raw.currency_code,
      due_local: raw.due_local,
      received_local: raw.received_local,
      outstanding_local: raw.outstanding_local,
      billing_state: raw.billing_state,
      access: {
        allowed: !!raw.access?.allowed,
        basis: raw.access?.basis,
        access_until: raw.access?.access_until,
      },
    };
  }
  async access(license: unknown, tenant: unknown): Promise<Record<string, any>> {
    const r = await this.accessData(activityGuid(tenant), activityGuid(license));
    return {
      tenant_guid: r.tenant_guid,
      license_guid: r.license_guid,
      allowed: !!r.allowed,
      basis: r.basis,
      access_until: r.access_until,
    };
  }
}
