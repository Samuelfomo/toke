import { OnboardingError } from '../../tools/tenant-onboarding-token.js';

import { OnboardingCommercialError } from './onboarding-commercial.js';

export function onboardingChoice(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new OnboardingCommercialError('onboarding_input_invalid', 'JSON object required');
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => !['requested_seats', 'payment_method_guid'].includes(k)))
    throw new OnboardingCommercialError(
      'onboarding_input_invalid',
      'Only requested_seats and payment_method_guid are accepted',
    );
  if (
    !Number.isInteger(b.requested_seats) ||
    Number(b.requested_seats) < 1 ||
    Number(b.requested_seats) > 32767
  )
    throw new OnboardingCommercialError('onboarding_input_invalid', 'Invalid requested_seats');
  if (
    typeof b.payment_method_guid !== 'number' ||
    !Number.isInteger(b.payment_method_guid) ||
    b.payment_method_guid < 100000 ||
    b.payment_method_guid > 999999
  )
    throw new OnboardingCommercialError('onboarding_input_invalid', 'Invalid payment_method_guid');
  return { seats: Number(b.requested_seats), method: b.payment_method_guid };
}
export function onboardingRequest(
  tenant: number,
  choice: { seats: number; method: number },
  prior: Record<string, any> | null,
  now = new Date(),
) {
  const key = 'ONBOARDING_FIRST_V1_' + tenant;
  if (
    prior &&
    (prior.tenant !== tenant ||
      prior.key !== key ||
      prior.type !== 'CLOUD_FLEX' ||
      prior.months !== 1 ||
      prior.seats !== choice.seats ||
      prior.method !== choice.method)
  )
    throw new OnboardingCommercialError(
      'onboarding_subscription_conflict',
      'Initial subscription already exists with different choices; consult status',
      409,
    );
  let day: string;
  if (prior) {
    if (typeof prior.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(prior.startDate))
      throw new OnboardingError('Onboarding history requires review', 409);
    day = prior.startDate;
  } else {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Douala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const value = (name: string) => parts.find((p) => p.type === name)!.value;
    day = value('year') + '-' + value('month') + '-' + value('day');
  }
  return {
    tenant,
    license_type: 'CLOUD_FLEX',
    billing_cycle_months: 1,
    payment_method_guid: choice.method,
    start_date: day,
    requested_seats: choice.seats,
    idempotency_key: key,
  };
}
