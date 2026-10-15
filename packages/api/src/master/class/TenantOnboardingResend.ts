import TenantOnboardingResendModel from '../model/TenantOnboardingResendModel.js';
import Limit from '../../tools/onboarding-resend-limit.js';

import TenantOnboarding from './TenantOnboarding.js';
export const resendResponse = () => ({
  message:
    'Si un dossier correspond à cette adresse et nécessite un nouveau lien, une invitation sera envoyée au contact enregistré.',
});
export default class TenantOnboardingResend extends TenantOnboardingResendModel {
  async request(body: unknown) {
    const b = body as Record<string, unknown>;
    const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (
      !b ||
      Array.isArray(b) ||
      Object.keys(b).some((k) => k !== 'email') ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email)
    )
      throw new Error('INVALID_EMAIL');
    // Limits run even for unknown contacts. Redis failure prevents any send.
    if (!(await Limit.allow('CONTACT', email))) return resendResponse();
    try {
      const tenant = await this.tenantByContact(email);
      if (tenant?.getGuid()) await new TenantOnboarding().invite(tenant.getGuid());
    } catch {
      console.error('Onboarding invitation delivery unavailable');
    }
    return resendResponse();
  }
}
