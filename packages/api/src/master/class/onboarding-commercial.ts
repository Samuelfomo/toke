import { OnboardingError } from '../../tools/tenant-onboarding-token.js';
import { centsText, decimalUnits, renewalAmounts } from '../services/renewal-amounts.js';

import { subscriptionOffers } from './license-subscription-input.js';

export class OnboardingCommercialError extends OnboardingError {
  constructor(
    public readonly code: string,
    message: string,
    status = 400,
  ) {
    super(message, status);
  }
}
export function onboardingOffer() {
  const o = subscriptionOffers().CLOUD_FLEX;
  if (!o || !o.months.includes(1))
    throw new OnboardingCommercialError('onboarding_offer_unavailable', 'Offer unavailable', 503);
  return {
    license_type: 'CLOUD_FLEX',
    label: 'Toké Cloud Flex',
    billing_mode: 'PREPAID',
    billing_cycle_months: 1,
    minimum_seats: o.minimum,
    maximum_seats: o.maxSeats,
    unit_price_usd: o.price,
    pricing_currency_code: 'USD',
  };
}
// Codes of online methods whose payment integration is operational. Fail closed.
export function availableMethod(m: any) {
  const code = String(m.code ?? '')
    .trim()
    .toUpperCase();
  const type = String(m.method_type ?? '')
    .trim()
    .toUpperCase();
  if (!code || !type || code === 'CASH' || type === 'CASH') return false;
  const enabled = (process.env.TOKE_CUSTOMER_PAYMENT_METHOD_CODES ?? '')
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
  return enabled.includes(code);
}
export function paymentInstructions(p: any) {
  if (!p) return null;
  const cash =
    String(p.payment_method_code ?? '')
      .trim()
      .toUpperCase() === 'CASH' ||
    String(p.payment_method_type ?? '')
      .trim()
      .toUpperCase() === 'CASH';
  return {
    kind: cash ? 'STAFF_CASH' : 'ONLINE',
    available:
      !cash && availableMethod({ code: p.payment_method_code, method_type: p.payment_method_type }),
    reference: p.payment_reference,
    payment_due_date: p.payment_due_date,
    message:
      p.transaction_status === 'COMPLETED'
        ? 'Règlement confirmé. Consultez l’état d’activation.'
        : cash
          ? 'Seule l’équipe Toké peut confirmer cet encaissement en espèces.'
          : 'Le règlement doit être confirmé par le service de paiement avant activation.',
  };
}
export function calculateOnboardingEstimate(raw: any, seats: number, method: number) {
  const offer = onboardingOffer();
  if (seats < offer.minimum_seats || seats > offer.maximum_seats)
    throw new OnboardingCommercialError(
      'onboarding_seats_out_of_range',
      'Requested seats outside offer limits',
    );
  const selected = raw.methods.find((m: any) => Number(m.guid) === method && availableMethod(m));
  if (!selected)
    throw new OnboardingCommercialError(
      'onboarding_payment_method_unavailable',
      'Payment method unavailable',
    );
  const a = renewalAmounts(
    centsText(decimalUnits(offer.unit_price_usd, 2) * BigInt(seats)),
    raw.rate,
    raw.taxes.map((t: any) => t.tax_rate),
    raw.tenant.primary_currency_code,
  );
  if (
    decimalUnits(a.totalUsd, 2) < decimalUnits(selected.min_amount_usd, 2) ||
    decimalUnits(a.totalUsd, 2) > decimalUnits(selected.max_amount_usd, 2)
  )
    throw new OnboardingCommercialError(
      'onboarding_payment_amount_out_of_range',
      'Amount outside payment method limits',
    );
  return {
    tenant_guid: Number(raw.tenant.guid),
    offer,
    requested_seats: seats,
    payment_method_guid: method,
    billing_currency_code: raw.tenant.primary_currency_code,
    exchange_rate_used: String(raw.rate),
    tax_rules_applied: raw.taxes,
    amounts: {
      subtotal_usd: a.baseUsd,
      tax_amount_usd: a.taxUsd,
      total_amount_usd: a.totalUsd,
      subtotal_local: a.baseLocal,
      tax_amount_local: a.taxLocal,
      total_amount_local: a.totalLocal,
    },
    estimated_at: new Date().toISOString(),
    estimate_only: true,
    creates_debt: false,
    pricing_basis: 'CURRENT_CONFIGURATION',
    period_policy: 'FIXED_AT_SUBSCRIPTION',
    notice:
      'Estimation sans réservation de tarif. Le montant définitif sera enregistré à la souscription et présenté avant paiement.',
  };
}
export function enrichOnboardingStatus(state: any, records: any) {
  const existing = state.financial.licenses as any[];
  const licenses = existing.map((l) => {
    const row = records.licenses.find((r: any) => Number(r.guid) === l.license_guid);
    return {
      ...l,
      license_type: row?.license_type ?? null,
      billing_cycle_months: row ? Number(row.billing_cycle_months) : null,
      payments: l.payments.map((p: any) => {
        const c = records.cycles.find((c: any) => Number(c.guid) === p.billing_cycle_guid);
        return {
          ...p,
          subtotal_usd: c ? String(c.subtotal_usd) : null,
          tax_amount_usd: c ? String(c.tax_amount_usd) : null,
          total_amount_usd: c ? String(c.total_amount_usd) : null,
          subtotal_local: c ? String(c.subtotal_local) : null,
          tax_amount_local: c ? String(c.tax_amount_local) : null,
          total_amount_local: c ? String(c.total_amount_local) : null,
          exchange_rate_used: c ? String(c.exchange_rate_used) : null,
          tax_rules_applied: c?.tax_rules_applied ?? null,
          billed_seats: c ? Number(c.final_employee_count) : null,
          requested_seats:
            records.requests.find(
              (r: any) =>
                Number(r.license_guid) === l.license_guid &&
                Number(r.billing_cycle_guid) === p.billing_cycle_guid,
            )?.seats ?? null,
          unit_price_usd:
            records.requests.find(
              (r: any) =>
                Number(r.license_guid) === l.license_guid &&
                Number(r.billing_cycle_guid) === p.billing_cycle_guid,
            )?.unit_price_usd ?? null,
          is_partial:
            p.received_local == null || p.amount_to_pay_local == null
              ? null
              : decimalUnits(p.received_local, 2) > 0n &&
                decimalUnits(p.amount_to_pay_local, 2) > 0n,
          instructions: paymentInstructions(p),
        };
      }),
    };
  });
  const offer = onboardingOffer();
  return {
    ...state,
    financial: { ...state.financial, licenses },
    tenant_status: state.financial.tenant_status,
    billing_currency_code: records.tenant.primary_currency_code,
    offer,
    can_subscribe:
      state.financial.tenant_status === 'ACTIVE' &&
      licenses.length === 0 &&
      records.methods.some(availableMethod),
    period_policy: 'FIXED_AT_SUBSCRIPTION',
    period_notice:
      'La période commence à la date de souscription, même si le paiement ou le provisionnement intervient plus tard.',
  };
}

