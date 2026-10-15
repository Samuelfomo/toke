import OnboardingSubscriptionDb from '../database/base_model/db.onboarding-subscription.js';
import TenantOnboardingDb from '../database/base_model/db.tenant-onboarding.js';
export default class TenantOnboardingModel {
  protected provisionLock<T>(guid: number, work: () => Promise<T>) {
    return new TenantOnboardingDb().provisionLock(guid, work);
  }
  protected priorSubscription(tenant: number, key: string) {
    return new OnboardingSubscriptionDb().prior(tenant, key);
  }
  protected commercialData(tenant: number, estimate = false) {
    return new OnboardingSubscriptionDb().commercial(tenant, estimate);
  }
  protected readiness(config: { database: string; username: string; password: string }) {
    return new TenantOnboardingDb().readiness(config);
  }
}
