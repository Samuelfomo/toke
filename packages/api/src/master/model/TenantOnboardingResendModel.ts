import Tenant from '../class/Tenant.js';
export default class TenantOnboardingResendModel {
  protected tenantByContact(email: string) {
    return Tenant._load(email, false, false, false, true);
  }
}
