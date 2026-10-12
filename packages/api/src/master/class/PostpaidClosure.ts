import PostpaidClosureModel from '../model/PostpaidClosureModel.js';

import { activityDate, activityGuid } from './activity-monitoring-input.js';

export { PostpaidClosureError } from '../database/base_model/db.postpaid-closure.js';
export class PostpaidClosureInputError extends Error {}
export function closureText(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 128)
    throw new PostpaidClosureInputError(name + ' is required (1-128 characters)');
  return value.trim();
}
export function closurePublic(raw: Record<string, any>): Record<string, any> {
  const s = raw.snapshot;
  return {
    tenant_guid: s.tenant_guid,
    license_guid: s.license_guid,
    billing_cycle_guid: Number(raw.cycle_guid),
    payment_transaction_guid: Number(raw.payment_guid),
    billing_mode: 'POSTPAID',
    period_start: s.period_start,
    period_end: s.period_end,
    payment_due_date: s.payment_due_date,
    billable_employees: s.billable_employees,
    billed_seats: s.billed_seats,
    billing_currency_code: s.billing_currency_code,
    amounts: s.amounts,
    billing_status: raw.billing_status,
    transaction_status: raw.transaction_status,
    replayed: !!raw.replayed,
  };
}
export default class PostpaidClosure extends PostpaidClosureModel {
  async close(license: unknown, body: Record<string, any>): Promise<Record<string, any>> {
    if (body.coverage_confirmed !== true || body.accept_current_pricing !== true)
      throw new PostpaidClosureInputError(
        'Signal coverage and current pricing must be explicitly confirmed',
      );
    const start = activityDate(body.period_start),
      end = activityDate(body.period_end);
    if (Date.parse(end) <= Date.parse(start)) throw new PostpaidClosureInputError('Invalid period');
    return closurePublic(
      await this.closeData({
        licenseGuid: activityGuid(license),
        tenantGuid: activityGuid(body.tenant_guid),
        start,
        end,
        actor: closureText(body.actor_user_guid, 'actor_user_guid'),
        key: closureText(body.idempotency_key, 'idempotency_key'),
        methodGuid: activityGuid(body.payment_method_guid),
        coverageReference: closureText(body.coverage_reference, 'coverage_reference'),
      }),
    );
  }
}
