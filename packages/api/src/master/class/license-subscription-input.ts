import { GLOBAL_LICENSE_DEFAULTS } from '@toke/shared';

export class LicenseSubscriptionInputError extends Error {}
export interface SubscriptionInput {
  tenant: number;
  type: string;
  months: number;
  method: number;
  startDate: string;
  seats: number;
  key: string;
}
export interface SubscriptionOffer {
  price: string;
  minimum: number;
  months: number[];
  maxSeats: number;
  graceDays: number;
}
export function subscriptionGuid(value: unknown): number {
  if (!/^[1-9][0-9]{5}$/.test(String(value ?? '')))
    throw new LicenseSubscriptionInputError('Six-digit public GUID required');
  return Number(value);
}
export function subscriptionText(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 128)
    throw new LicenseSubscriptionInputError(name + ' is required (1-128 characters)');
  return value.trim();
}
export function subscriptionInput(body: Record<string, any>): SubscriptionInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new LicenseSubscriptionInputError('JSON object required');
  const allowed = [
    'tenant',
    'license_type',
    'billing_cycle_months',
    'payment_method_guid',
    'start_date',
    'requested_seats',
    'idempotency_key',
  ];
  for (const key of Object.keys(body))
    if (!allowed.includes(key))
      throw new LicenseSubscriptionInputError('Field is not accepted: ' + key);
  const type = subscriptionText(body.license_type, 'license_type');
  if (!['CLOUD_FLEX', 'CLOUD_PRO', 'ON_PREMISE'].includes(type))
    throw new LicenseSubscriptionInputError('Unknown license type');
  const months = body.billing_cycle_months,
    seats = body.requested_seats;
  if (!Number.isInteger(months) || ![1, 3, 6, 12].includes(months))
    throw new LicenseSubscriptionInputError('Invalid billing cycle months');
  if (!Number.isInteger(seats) || seats < 1 || seats > 32767)
    throw new LicenseSubscriptionInputError('Invalid requested seats');
  const startDate = body.start_date;
  if (
    typeof startDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !Number.isFinite(Date.parse(startDate + 'T00:00:00Z')) ||
    new Date(startDate + 'T00:00:00Z').toISOString().slice(0, 10) !== startDate
  )
    throw new LicenseSubscriptionInputError('start_date must be a valid YYYY-MM-DD civil date');
  return {
    tenant: subscriptionGuid(body.tenant),
    type,
    months,
    method: subscriptionGuid(body.payment_method_guid),
    startDate,
    seats,
    key: subscriptionText(body.idempotency_key, 'idempotency_key'),
  };
}
/** Reuse the shared server offer defaults. Do not accept tariffs from clients. */
export function subscriptionOffers(): Record<string, SubscriptionOffer> {
  const price = Number(GLOBAL_LICENSE_DEFAULTS.BASE_PRICE_USD),
    minimum = Number(GLOBAL_LICENSE_DEFAULTS.MINIMUM_SEATS);
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(minimum) ||
    minimum < 5 ||
    minimum > 32767
  )
    throw new Error('Invalid shared license offer defaults');
  const amount = price.toFixed(2);
  if (Number(amount) !== price) throw new Error('Offer price requires exact cents');
  return { CLOUD_FLEX: { price: amount, minimum, months: [1], maxSeats: 32767, graceDays: 0 } };
}
