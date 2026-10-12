import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

export class LicenseReleaseError extends Error {}
export interface ReleaseInput {
  tenant: number;
  license: number;
  actor: string;
  actorTenant: number;
  key: string;
  reason: string;
}
export default class LicenseReleaseDb {
  constructor(private readonly connection?: Sequelize) {}
  async release(i: ReleaseInput, preview: boolean): Promise<Record<string, any>> {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db.transaction<Record<string, any>>(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [r] = await db.query(sql, { transaction, replacements });
        return r as any[];
      };
      const l = (
        await rows(
          `SELECT l.*,t.guid AS tenant_guid,t.status AS tenant_status FROM public.xa_global_license l
    JOIN public.xa_tenant t ON t.id=l.tenant WHERE l.guid=:license AND t.guid=:tenant FOR UPDATE OF l`,
          { license: i.license, tenant: i.tenant },
        )
      )[0];
      if (!l) throw new LicenseReleaseError('License does not belong to tenant');
      const prior = (
        await rows(
          `SELECT guid,actor_user_guid,reason,new_payload,metadata FROM public.xa_license_event
    WHERE global_license=:id AND event_type='LICENSE_STATUS_CHANGED' AND operation_key=:key`,
          { id: l.id, key: i.key },
        )
      )[0];
      async function decision() {
        const d = (await rows('SELECT * FROM public.monthly_license_access(:id)', { id: l.id }))[0];
        if (!d) throw new LicenseReleaseError('Access decision unavailable');
        return d;
      }
      if (prior) {
        if (
          prior.actor_user_guid !== i.actor ||
          prior.reason !== i.reason ||
          prior.metadata?.actor_tenant_guid !== i.actorTenant ||
          prior.metadata?.action !== 'TECHNICAL_RESTRICTION_RELEASE'
        )
          throw new LicenseReleaseError('Operation key conflict');
        return {
          event_guid: Number(prior.guid),
          tenant_guid: i.tenant,
          license_guid: i.license,
          tenant_status: l.tenant_status,
          current_license_status: l.license_status,
          applied_license_status: prior.new_payload.license_status,
          replayed: true,
          preview,
          access: await decision(),
        };
      }
      if (!['BLOCKED', 'SUSPENDED'].includes(l.license_status))
        throw new LicenseReleaseError(
          'Only BLOCKED or SUSPENDED technical restrictions can be released; expired debt requires payment',
        );
      const policy = await rows(
        'SELECT grace_days FROM public.xa_monthly_license_policy WHERE global_license=:id',
        { id: l.id },
      );
      if (policy.length !== 1 || Number(l.billing_cycle_months) !== 1)
        throw new LicenseReleaseError(
          'A monthly access policy is required; review this license separately',
        );
      if (preview)
        return {
          tenant_guid: i.tenant,
          license_guid: i.license,
          tenant_status: l.tenant_status,
          current_license_status: l.license_status,
          preview: true,
          replayed: false,
          access: await decision(),
          will_recalculate_financial_access: true,
        };
      // Temporary candidate status stays inside this transaction. Only the final state and its event commit.
      await rows(
        "UPDATE public.xa_global_license SET license_status='ACTIVE',updated_at=NOW() WHERE id=:id RETURNING id",
        { id: l.id },
      );
      const access = await decision();
      const status = access.allowed ? 'ACTIVE' : 'EXPIRED';
      if (status === 'EXPIRED')
        await rows(
          "UPDATE public.xa_global_license SET license_status='EXPIRED',updated_at=NOW() WHERE id=:id RETURNING id",
          { id: l.id },
        );
      const event = (
        await rows(
          `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,
    effective_at,previous_payload,new_payload,reason,metadata)
    VALUES(:tenant,:license,'LICENSE_STATUS_CHANGED',:key,'USER',:actor,NOW(),CAST(:before AS jsonb),CAST(:after AS jsonb),:reason,CAST(:metadata AS jsonb)) RETURNING guid`,
          {
            tenant: l.tenant,
            license: l.id,
            key: i.key,
            actor: i.actor,
            reason: i.reason,
            before: JSON.stringify({ license_status: l.license_status }),
            after: JSON.stringify({ license_status: status }),
            metadata: JSON.stringify({
              action: 'TECHNICAL_RESTRICTION_RELEASE',
              actor_tenant_guid: i.actorTenant,
              financial_decision: {
                allowed: !!access.allowed,
                basis: access.basis,
                access_until: access.access_until,
              },
            }),
          },
        )
      )[0];
      return {
        tenant_guid: i.tenant,
        license_guid: i.license,
        tenant_status: l.tenant_status,
        current_license_status: status,
        applied_license_status: status,
        event_guid: Number(event.guid),
        preview: false,
        replayed: false,
        access: await decision(),
      };
    });
  }
}
