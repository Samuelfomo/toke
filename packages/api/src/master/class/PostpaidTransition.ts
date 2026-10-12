import PostpaidTransitionModel from '../model/PostpaidTransitionModel.js';

import { activityDate, activityGuid } from './activity-monitoring-input.js';
import { closureText } from './PostpaidClosure.js';

export { PostpaidTransitionError } from '../database/base_model/db.postpaid-transition.js';
export class PostpaidTransitionInputError extends Error {}
export const TRANSITION_TENANTS = [100001, 100008, 100014, 100016, 100017, 100020];
export function transitionInput(b: Record<string, any>) {
  if (!Array.isArray(b.tenant_guids) || b.tenant_guids.length < 1 || b.tenant_guids.length > 6)
    throw new PostpaidTransitionInputError('One to six tenant GUIDs required');
  const tenants = b.tenant_guids.map(activityGuid);
  if (
    new Set(tenants).size !== tenants.length ||
    tenants.some((g) => !TRANSITION_TENANTS.includes(g))
  )
    throw new PostpaidTransitionInputError(
      'Only the six authorized tenants are supported by this transition',
    );
  const key = closureText(b.operation_key, 'operation_key');
  if (key.length > 96)
    throw new PostpaidTransitionInputError('Operation key maximum is 96 characters');
  const effectiveAt = activityDate(b.effective_at);
  if (effectiveAt !== '2026-10-31T23:00:00.000Z')
    throw new PostpaidTransitionInputError(
      'This rollout starts on 1 November 2026 at 00:00 Douala',
    );
  if (b.exclude_legacy_unpaid_cycles !== true && b.exclude_legacy_unpaid_cycles !== false)
    throw new PostpaidTransitionInputError('Explicit legacy exclusion choice required');
  return {
    tenants,
    actor: closureText(b.actor_user_guid, 'actor_user_guid'),
    actorTenant: activityGuid(b.actor_tenant_guid),
    key,
    effectiveAt,
    reason: closureText(b.reason, 'reason'),
    excludeLegacy: b.exclude_legacy_unpaid_cycles,
  };
}
function pick(source: any, keys: string[]) {
  const out: Record<string, any> = {};
  for (const key of keys)
    if (source && Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  return out;
}
export function publicLicenseEvent(r: Record<string, any>) {
  const payload = [
    'billing_mode',
    'postpaid_from',
    'billing_cycle_guid',
    'billing_status',
    'license_status',
  ];
  return {
    guid: Number(r.guid),
    tenant_guid: Number(r.tenant_guid),
    license_guid: Number(r.license_guid),
    event_type: r.event_type,
    operation_key: r.operation_key,
    actor_type: r.actor_type,
    actor_user_guid: r.actor_user_guid,
    occurred_at: r.occurred_at,
    effective_at: r.effective_at,
    reason: r.reason,
    previous_payload: pick(r.previous_payload, payload),
    new_payload: pick(r.new_payload, payload),
    metadata: pick(r.metadata, [
      'actor_tenant_guid',
      'operation_key',
      'payment_transaction_guids',
      'no_cash_received',
      'excluded_cycle_guids',
      'activation_strategy',
      'offered_period_preserved',
    ]),
  };
}
export default class PostpaidTransition extends PostpaidTransitionModel {
  async apply(body: Record<string, any>, dryRun: boolean): Promise<Record<string, any>> {
    const input = transitionInput(body);
    if (!dryRun && body.confirm !== true)
      throw new PostpaidTransitionInputError('Explicit confirm=true required');
    const rows = await this.applyData(input, dryRun);
    return {
      dry_run: dryRun,
      effective_at: input.effectiveAt,
      results: rows.map((r) =>
        pick(r, [
          'tenant_guid',
          'license_guid',
          'event_guid',
          'billing_mode',
          'postpaid_from',
          'excluded_cycle_guids',
          'replayed',
          'dry_run',
        ]),
      ),
    };
  }
  async events(license: unknown, tenant: unknown): Promise<Record<string, any>> {
    return {
      events: (await this.eventData(activityGuid(tenant), activityGuid(license))).map(
        publicLicenseEvent,
      ),
      limit: 100,
    };
  }
}
