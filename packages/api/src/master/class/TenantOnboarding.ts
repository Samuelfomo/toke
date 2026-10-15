import TenantOnboardingModel from '../model/TenantOnboardingModel.js';
import Token, { OnboardingError } from '../../tools/tenant-onboarding-token.js';
import EmailSender from '../../tools/send.email.service.js';

import OnboardingPayment from './OnboardingPayment.js';
import {
  availableMethod,
  calculateOnboardingEstimate,
  enrichOnboardingStatus,
  OnboardingCommercialError,
  onboardingOffer,
} from './onboarding-commercial.js';
import { onboardingChoice, onboardingRequest } from './onboarding-subscription-input.js';
import Tenant from './Tenant.js';
import GlobalLicense from './GlobalLicense.js';
import PaymentMethod from './PaymentMethod.js';

export { OnboardingError } from '../../tools/tenant-onboarding-token.js';
export default class TenantOnboarding extends TenantOnboardingModel {
  async provision<T>(guid: number, work: () => Promise<T>) {
    return this.provisionLock(guid, work);
  }

  async invite(tenantGuid: unknown) {
    if (!/^[1-9][0-9]{5}$/.test(String(tenantGuid)))
      throw new OnboardingError('Invalid tenant GUID');
    const t = await Tenant._load(Number(tenantGuid), true);
    if (!t || !t.getBillingEmail()) throw new OnboardingError('Tenant or contact unavailable', 404);
    const state = await this.snapshot(t);
    if (state.phase === 'READY')
      return { tenant_guid: t.getGuid(), sent: false, reason: 'ALREADY_READY' };
    const token = Token.issue(t.getGuid()!, t.getBillingEmail()!);
    await EmailSender.onboarding(
      t.getName()!,
      t.getBillingEmail()!,
      Token.url(token),
      state.phase === 'ACTIVATION_PENDING' ? 'ACTIVATION_PENDING' : 'SUBSCRIPTION',
    );
    return { tenant_guid: t.getGuid(), sent: true, phase: state.phase };
  }

  async methods(token: unknown) {
    const t = await this.authorized(token);
    const currency = t.getPrimaryCurrencyCode();
    const methods = await PaymentMethod._listByActiveStatus(true);
    return {
      tenant_guid: t.getGuid(),
      currency_code: currency,
      payment_methods: (methods ?? [])
        .filter(
          (m) =>
            availableMethod({ code: m.getCode(), method_type: m.getMethodType() }) &&
            Array.isArray(m.getSupportedCurrencies()) &&
            (m.getSupportedCurrencies() as string[]).includes(currency!),
        )
        .map((m) => ({
          guid: m.getGuid(),
          code: m.getCode(),
          name: m.getName(),
          method_type: m.getMethodType(),
          supported_currencies: m.getSupportedCurrencies(),
          min_amount_usd: m.getMinAmountUsd(),
          max_amount_usd: m.getMaxAmountUsd(),
        })),
    };
  }

  async listPaymentAttempts(token: unknown, payment: number) {
    const t = await this.authorized(token);
    return new OnboardingPayment().list(t.getGuid()!, payment);
  }
  async initiatePayment(token: unknown, body: unknown) {
    const t = await this.authorized(token);
    return new OnboardingPayment().initiate(t.getGuid()!, body);
  }
  async paymentAttemptStatus(token: unknown, attemptGuid: number) {
    const t = await this.authorized(token);
    return new OnboardingPayment().status(t.getGuid()!, attemptGuid);
  }
  async refreshPaymentAttempt(token: unknown, attemptGuid: number) {
    const t = await this.authorized(token);
    return new OnboardingPayment().refresh(t.getGuid()!, attemptGuid);
  }

  async status(token: unknown) {
    const t = await this.authorized(token);
    return enrichOnboardingStatus(await this.snapshot(t), await this.commercialData(t.getGuid()!));
  }

  async estimate(token: unknown, body: unknown) {
    const t = await this.authorized(token);
    const choice = onboardingChoice(body);
    return calculateOnboardingEstimate(
      await this.commercialData(t.getGuid()!, true),
      choice.seats,
      choice.method,
    );
  }

  async subscribe(token: unknown, body: Record<string, any>) {
    const t = await this.authorized(token);
    const choice = onboardingChoice(body);
    const offer = onboardingOffer();
    if (choice.seats < offer.minimum_seats || choice.seats > offer.maximum_seats)
      throw new OnboardingCommercialError(
        'onboarding_seats_out_of_range',
        'Requested seats outside offer limits',
      );
    // Same cross-worker lock as provisioning; no token nonce or client key.
    const created = await this.provisionLock(t.getGuid()!, async () => {
      const key = 'ONBOARDING_FIRST_V1_' + t.getGuid();
      const prior = await this.priorSubscription(t.getGuid()!, key);
      if (!prior) {
        const methods = await this.methods(token);
        if (!methods.payment_methods.some((m) => m.guid === choice.method))
          throw new OnboardingCommercialError(
            'onboarding_payment_method_unavailable',
            'Payment method unavailable',
          );
      }
      const request = onboardingRequest(t.getGuid()!, choice, prior);
      const license = new GlobalLicense().setSubscriptionRequest(request);
      await license.subscribe();
      return {
        tenant_guid: t.getGuid(),
        license_guid: license.getGuid(),
        replayed: license.isSubscriptionReplay(),
      };
    });
    // Financial write committed. If this read fails, caller consults status, no second operation.
    return { ...(await this.status(token)), ...created };
  }

  async notifyReady(guid: unknown) {
    const t = await Tenant._load(Number(guid), true);
    if (!t || !t.getBillingEmail()) throw new OnboardingError('Tenant unavailable', 404);
    const state = await this.snapshot(t);
    if (state.phase !== 'READY') throw new OnboardingError('System not ready', 409);
    const url = process.env.TOKE_CUSTOMER_READY_URL;
    if (!url || new URL(url).protocol !== 'https:')
      throw new OnboardingError('Ready URL missing', 503);
    await EmailSender.onboarding(t.getName()!, t.getBillingEmail()!, url, 'READY');
    return { tenant_guid: t.getGuid(), sent: true };
  }

  private async authorized(token: unknown) {
    const c = Token.verify(token);
    const t = await Tenant._load(c.tenant, true);
    if (!t || !t.getBillingEmail() || Token.contact(t.getBillingEmail()!) !== c.contact)
      throw new OnboardingError('Invalid onboarding link', 401);
    return t;
  }

  private async snapshot(t: Tenant) {
    const financial: any = await t.getLicenseStatus();
    let provisioning: 'READY' | 'PENDING' | 'UNAVAILABLE' = 'PENDING';
    if (
      t.getSubdomain() &&
      t.getDatabaseName() &&
      t.getDatabaseUsername() &&
      t.getDatabasePassword()
    )
      provisioning = await this.readiness({
        database: t.getDatabaseName()!,
        username: t.getDatabaseUsername()!,
        password: t.getDatabasePassword()!,
      });
    const licenses = financial.licenses ?? [];
    const paid = licenses.some((l: any) =>
      l.payments?.some(
        (p: any) => p.transaction_status === 'COMPLETED' && p.billing_status === 'COMPLETED',
      ),
    );
    const allowed = licenses.some((l: any) => l.access?.allowed === true);
    const phase =
      financial.tenant_status !== 'ACTIVE' || (paid && !allowed)
        ? 'RESTRICTED'
        : paid && allowed
          ? provisioning === 'READY'
            ? 'READY'
            : 'ACTIVATION_PENDING'
          : licenses.length
            ? 'PAYMENT_PENDING'
            : 'SUBSCRIPTION_REQUIRED';
    return {
      tenant_guid: t.getGuid(),
      name: t.getName(),
      phase,
      provisioning,
      financial,
      subdomain: phase === 'READY' ? t.getSubdomain() : null,
    };
  }
}
