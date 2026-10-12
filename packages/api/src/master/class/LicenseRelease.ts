import LicenseReleaseModel from '../model/LicenseReleaseModel.js';

import { activityGuid } from './activity-monitoring-input.js';
import { closureText } from './PostpaidClosure.js';

export { LicenseReleaseError } from '../database/base_model/db.license-release.js';
export class LicenseReleaseInputError extends Error {}
export function releaseProjection(r: Record<string, any>): Record<string, any> {
  return {
    tenant_guid: r.tenant_guid,
    license_guid: r.license_guid,
    event_guid: r.event_guid ?? null,
    tenant_status: r.tenant_status,
    current_license_status: r.current_license_status,
    applied_license_status: r.applied_license_status ?? null,
    preview: !!r.preview,
    replayed: !!r.replayed,
    will_recalculate_financial_access: !!r.will_recalculate_financial_access,
    access: {
      scope: 'LICENSE_ONLY',
      allowed: !!r.access?.allowed,
      basis: r.access?.basis,
      access_until: r.access?.access_until,
    },
  };
}
export default class LicenseRelease extends LicenseReleaseModel {
  async release(
    license: unknown,
    b: Record<string, any>,
    preview: boolean,
  ): Promise<Record<string, any>> {
    if (!preview && b.confirm !== true)
      throw new LicenseReleaseInputError('Explicit confirm=true required');
    return releaseProjection(
      await this.releaseData(
        {
          tenant: activityGuid(b.tenant_guid),
          license: activityGuid(license),
          actor: closureText(b.actor_user_guid, 'actor_user_guid'),
          actorTenant: activityGuid(b.actor_tenant_guid),
          key: closureText(b.operation_key, 'operation_key'),
          reason: closureText(b.reason, 'reason'),
        },
        preview,
      ),
    );
  }
}
