import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

export class PostpaidTransitionError extends Error {}
export interface TransitionInput {
  tenants: number[];
  actor: string;
  actorTenant: number;
  key: string;
  effectiveAt: string;
  reason: string;
  excludeLegacy: boolean;
}
export default class PostpaidTransitionDb {
  constructor(private readonly connection?: Sequelize) {}
  async apply(i: TransitionInput, dryRun: boolean): Promise<Record<string, any>[]> {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db.transaction<Record<string, any>[]>(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [r] = await db.query(sql, { transaction, replacements });
        return r as any[];
      };
      const output: Record<string, any>[] = [];
      for (const tenantGuid of [...i.tenants].sort((a, b) => a - b)) {
        const licenses = await rows(
          `SELECT l.*,t.guid AS tenant_guid FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant
     WHERE t.guid=:tenant ORDER BY l.id FOR UPDATE OF l`,
          { tenant: tenantGuid },
        );
        if (licenses.length !== 1)
          throw new PostpaidTransitionError(
            'Exactly one license required for tenant ' + tenantGuid,
          );
        const l = licenses[0];
        const prior = (
          await rows(
            `SELECT guid,actor_user_guid,effective_at,reason,metadata FROM public.xa_license_event
     WHERE global_license=:id AND event_type='BILLING_MODE_CHANGED' AND operation_key=:key`,
            { id: l.id, key: i.key },
          )
        )[0];
        if (prior) {
          if (
            prior.actor_user_guid !== i.actor ||
            new Date(prior.effective_at).toISOString() !== i.effectiveAt ||
            prior.reason !== i.reason ||
            prior.metadata?.actor_tenant_guid !== i.actorTenant ||
            prior.metadata?.exclude_legacy_unpaid_cycles !== i.excludeLegacy
          )
            throw new PostpaidTransitionError('Operation key conflict for tenant ' + tenantGuid);
          output.push({
            tenant_guid: tenantGuid,
            license_guid: Number(l.guid),
            event_guid: Number(prior.guid),
            replayed: true,
          });
          continue;
        }
        if (
          l.billing_mode !== 'PREPAID' ||
          Number(l.billing_cycle_months) !== 1 ||
          Number(l.minimum_seats) < 5 ||
          !['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'].includes(l.license_status)
        )
          throw new PostpaidTransitionError('License requires review for tenant ' + tenantGuid);
        const policies = await rows(
          'SELECT grace_days FROM public.xa_monthly_license_policy WHERE global_license=:id',
          { id: l.id },
        );
        if (policies.length !== 1 || Number(policies[0].grace_days) !== 7)
          throw new PostpaidTransitionError('Monthly seven-day policy required');
        const transitions = await rows(
          `SELECT valid_from,valid_until FROM public.xa_commercial_transition
     WHERE global_license=:id AND tenant=:tenant AND valid_until=CAST(:at AS timestamptz)`,
          { id: l.id, tenant: l.tenant, at: i.effectiveAt },
        );
        if (
          transitions.length !== 1 ||
          new Date(l.current_period_end).toISOString() !== i.effectiveAt ||
          new Date(l.next_renewal_date).toISOString() !== i.effectiveAt
        )
          throw new PostpaidTransitionError('Commercial transition dates require reconciliation');
        const calendar = (
          await rows(
            `SELECT CAST(:at AS timestamptz)>CURRENT_TIMESTAMP AND
     (CAST(:at AS timestamptz) AT TIME ZONE COALESCE(NULLIF(t.timezone,''),'UTC'))=
      date_trunc('month',CAST(:at AS timestamptz) AT TIME ZONE COALESCE(NULLIF(t.timezone,''),'UTC')) AS valid
     FROM public.xa_tenant t WHERE t.id=:tenant`,
            { at: i.effectiveAt, tenant: l.tenant },
          )
        )[0];
        if (!calendar?.valid)
          throw new PostpaidTransitionError('Future calendar-month boundary required');
        if (
          (
            await rows(
              `SELECT id FROM public.xa_paid_seat_grant WHERE global_license=:id AND valid_until>CAST(:at AS timestamptz)
     UNION ALL SELECT id FROM public.xa_renewal_preparation WHERE global_license=:id AND period_end>CAST(:at AS timestamptz)`,
              { id: l.id, at: i.effectiveAt },
            )
          ).length
        )
          throw new PostpaidTransitionError('Future paid or prepared rights require review');
        const cycles = await rows(
          `SELECT * FROM public.xa_billing_cycle WHERE global_license=:id AND period_end>CAST(:at AS timestamptz)
     AND billing_status<>'CANCELLED' ORDER BY id FOR UPDATE`,
          { id: l.id, at: i.effectiveAt },
        );
        if (cycles.length && !i.excludeLegacy)
          throw new PostpaidTransitionError(
            'Legacy cycles overlap postpaid period; preview and explicit exclusion consent required',
          );
        const excluded: number[] = [];
        for (const c of cycles) {
          const payments = await rows(
            'SELECT id,guid,transaction_status FROM public.xa_payment_transaction WHERE billing_cycle=:id ORDER BY id FOR UPDATE',
            { id: c.id },
          );
          const funds = await rows(
            `SELECT id FROM public.xa_payment_transaction WHERE billing_cycle=:id AND transaction_status NOT IN ('PENDING','FAILED')
      UNION ALL SELECT r.id FROM public.xa_cash_receipt r JOIN public.xa_payment_transaction p ON p.id=r.payment_transaction WHERE p.billing_cycle=:id
      UNION ALL SELECT r.id FROM public.xa_cash_installment r JOIN public.xa_payment_transaction p ON p.id=r.payment_transaction WHERE p.billing_cycle=:id
      UNION ALL SELECT id FROM public.xa_paid_seat_grant WHERE billing_cycle=:id
      UNION ALL SELECT id FROM public.xa_renewal_preparation WHERE billing_cycle=:id`,
            { id: c.id },
          );
          if (
            c.billing_mode !== 'PREPAID' ||
            c.billing_status !== 'PENDING' ||
            funds.length ||
            c.payment_completed_at ||
            c.invoice_generated_at
          )
            throw new PostpaidTransitionError(
              'Cycle ' + c.guid + ' is not an unpaid legacy candidate',
            );
          excluded.push(Number(c.guid));
          if (!dryRun) {
            await rows(
              "UPDATE public.xa_billing_cycle SET billing_status='CANCELLED',updated_at=NOW() WHERE id=:id RETURNING id",
              { id: c.id },
            );
            await rows(
              `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,effective_at,previous_payload,new_payload,reason,metadata)
       VALUES(:tenant,:license,'LEGACY_CYCLE_EXCLUDED',:key,'USER',:actor,NOW(),CAST(:before AS jsonb),CAST(:after AS jsonb),:reason,CAST(:metadata AS jsonb)) RETURNING guid`,
              {
                tenant: l.tenant,
                license: l.id,
                key: i.key + ':' + c.guid,
                actor: i.actor,
                reason: i.reason,
                before: JSON.stringify({
                  billing_cycle_guid: Number(c.guid),
                  billing_status: 'PENDING',
                }),
                after: JSON.stringify({
                  billing_cycle_guid: Number(c.guid),
                  billing_status: 'CANCELLED',
                }),
                metadata: JSON.stringify({
                  operation_key: i.key,
                  actor_tenant_guid: i.actorTenant,
                  payment_transaction_guids: payments.map((p) => Number(p.guid)),
                  no_cash_received: true,
                }),
              },
            );
          }
        }
        let eventGuid: number | null = null;
        if (!dryRun) {
          await rows(
            "UPDATE public.xa_global_license SET billing_mode='POSTPAID',postpaid_from=CAST(:at AS timestamptz),updated_at=NOW() WHERE id=:id RETURNING id",
            { id: l.id, at: i.effectiveAt },
          );
          const event = (
            await rows(
              `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,effective_at,previous_payload,new_payload,reason,metadata)
      VALUES(:tenant,:license,'BILLING_MODE_CHANGED',:key,'USER',:actor,CAST(:at AS timestamptz),CAST(:before AS jsonb),CAST(:after AS jsonb),:reason,CAST(:metadata AS jsonb)) RETURNING guid`,
              {
                tenant: l.tenant,
                license: l.id,
                key: i.key,
                actor: i.actor,
                at: i.effectiveAt,
                reason: i.reason,
                before: JSON.stringify({ billing_mode: 'PREPAID', postpaid_from: null }),
                after: JSON.stringify({ billing_mode: 'POSTPAID', postpaid_from: i.effectiveAt }),
                metadata: JSON.stringify({
                  actor_tenant_guid: i.actorTenant,
                  exclude_legacy_unpaid_cycles: i.excludeLegacy,
                  excluded_cycle_guids: excluded,
                  activation_strategy: 'DATE_BASED',
                  offered_period_preserved: true,
                }),
              },
            )
          )[0];
          eventGuid = Number(event.guid);
        }
        output.push({
          tenant_guid: tenantGuid,
          license_guid: Number(l.guid),
          event_guid: eventGuid,
          billing_mode: 'POSTPAID',
          postpaid_from: i.effectiveAt,
          excluded_cycle_guids: excluded,
          replayed: false,
          dry_run: dryRun,
        });
      }
      return output;
    });
  }
  async events(tenant: number, license: number): Promise<Record<string, any>[]> {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    const [owners] = await db.query(
      `SELECT l.id FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant WHERE l.guid=:license AND t.guid=:tenant`,
      { replacements: { license, tenant } },
    );
    if (!(owners as any[]).length)
      throw new PostpaidTransitionError('License does not belong to tenant');
    const [r] = await db.query(
      `SELECT e.guid,t.guid AS tenant_guid,l.guid AS license_guid,e.event_type,e.operation_key,e.actor_type,e.actor_user_guid,
   e.occurred_at,e.effective_at,e.previous_payload,e.new_payload,e.reason,e.metadata
   FROM public.xa_license_event e JOIN public.xa_global_license l ON l.id=e.global_license JOIN public.xa_tenant t ON t.id=e.tenant
   WHERE l.guid=:license AND t.guid=:tenant ORDER BY e.occurred_at DESC,e.id DESC LIMIT 100`,
      { replacements: { license, tenant } },
    );
    return r as any[];
  }
}
