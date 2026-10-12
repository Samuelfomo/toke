import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

export class InitialExpiryRepairError extends Error {
  constructor(
    message: string,
    public readonly status = 409,
  ) {
    super(message);
  }
}
export default class InitialExpiryRepairDb {
  constructor(private readonly connection?: Sequelize) {}

  async candidates(): Promise<any[]> {
    const [rows] = await this.database()
      .query(`SELECT t.guid AS tenant_guid,l.guid AS license_guid,h.previous_status,h.new_status,h.reason,h.created_at
   FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant
   JOIN LATERAL (SELECT * FROM public.xa_monthly_license_status_event WHERE global_license=l.id ORDER BY id DESC LIMIT 1) h ON TRUE
   WHERE l.license_status::text='EXPIRED' AND l.billing_mode='PREPAID'
    AND h.previous_status='PENDING_PAYMENT' AND h.new_status='EXPIRED' AND h.reason='PAYMENT_REQUIRED'
   ORDER BY t.guid,l.guid`);
    return rows as any[];
  }

  async repair(licenseGuid: number, preview: boolean, key: string): Promise<Record<string, any>> {
    return this.database().transaction(async (transaction) => {
      const rows = async (sql: string, replacements: Record<string, any> = {}) => {
        const [result] = await this.database().query(sql, { transaction, replacements });
        return result as any[];
      };
      const l = (
        await rows(
          'SELECT l.*,t.guid AS tenant_guid FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant WHERE l.guid=:guid FOR UPDATE OF l',
          { guid: licenseGuid },
        )
      )[0];
      if (!l) throw new InitialExpiryRepairError('License not found', 404);
      const prior = (
        await rows(
          "SELECT guid,metadata FROM public.xa_license_event WHERE global_license=:id AND event_type='LICENSE_STATUS_CHANGED' AND operation_key=:key",
          { id: l.id, key },
        )
      )[0];
      if (prior) {
        if (prior.metadata?.action !== 'INITIAL_PENDING_EXPIRY_REPAIR')
          throw new InitialExpiryRepairError('Operation key conflict');
        return {
          tenant_guid: Number(l.tenant_guid),
          license_guid: licenseGuid,
          event_guid: Number(prior.guid),
          license_status: l.license_status,
          replayed: true,
          preview,
        };
      }
      if (l.license_status !== 'EXPIRED' || l.billing_mode !== 'PREPAID')
        throw new InitialExpiryRepairError(
          'Only erroneous expired initial PREPAID licenses are eligible',
        );
      const h = (
        await rows(
          'SELECT id,previous_status,new_status,reason FROM public.xa_monthly_license_status_event WHERE global_license=:id ORDER BY id DESC LIMIT 1',
          { id: l.id },
        )
      )[0];
      if (
        !h ||
        h.previous_status !== 'PENDING_PAYMENT' ||
        h.new_status !== 'EXPIRED' ||
        h.reason !== 'PAYMENT_REQUIRED'
      )
        throw new InitialExpiryRepairError(
          'No matching erroneous automatic transition; manual review required',
        );
      const rights = await rows(
        `SELECT id FROM public.xa_paid_seat_grant WHERE global_license=:id
    UNION ALL SELECT id FROM public.xa_commercial_transition WHERE global_license=:id`,
        { id: l.id },
      );
      if (rights.length)
        throw new InitialExpiryRepairError('Paid or offered rights exist; repair refused');
      const funds = await rows(
        `SELECT p.id FROM public.xa_payment_transaction p
    LEFT JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle
    LEFT JOIN public.xa_license_adjustment a ON a.id=p.adjustment
    WHERE (c.global_license=:id OR a.global_license=:id) AND (
     p.transaction_status::text='COMPLETED'
     OR EXISTS(SELECT 1 FROM public.xa_cash_receipt r WHERE r.payment_transaction=p.id)
     OR EXISTS(SELECT 1 FROM public.xa_cash_installment i WHERE i.payment_transaction=p.id)) LIMIT 1`,
        { id: l.id },
      );
      if (funds.length)
        throw new InitialExpiryRepairError(
          'Confirmed or partial collection exists; repair refused',
        );
      const subsequent = await rows(
        `SELECT guid FROM public.xa_license_event WHERE global_license=:id AND event_type='LICENSE_STATUS_CHANGED'
    AND metadata->>'action'='TECHNICAL_RESTRICTION_RELEASE' LIMIT 1`,
        { id: l.id },
      );
      if (subsequent.length)
        throw new InitialExpiryRepairError('Technical release history exists; review required');
      const activeDebt = await rows(
        `SELECT guid FROM public.xa_billing_cycle WHERE global_license=:id AND billing_mode='PREPAID' AND billing_status::text='PENDING' LIMIT 1`,
        { id: l.id },
      );
      if (!activeDebt.length) throw new InitialExpiryRepairError('No pending initial invoice');
      const result = {
        tenant_guid: Number(l.tenant_guid),
        license_guid: licenseGuid,
        previous_status: 'EXPIRED',
        new_status: 'PENDING_PAYMENT',
        preview,
        replayed: false,
        access_granted: false,
      };
      if (preview) return result;
      await rows(
        "UPDATE public.xa_global_license SET license_status='PENDING_PAYMENT',updated_at=NOW() WHERE id=:id",
        { id: l.id },
      );
      const event = (
        await rows(
          `INSERT INTO public.xa_license_event(tenant,global_license,event_type,operation_key,actor_type,actor_user_guid,effective_at,previous_payload,new_payload,reason,metadata)
    VALUES(:tenant,:license,'LICENSE_STATUS_CHANGED',:key,'SYSTEM',NULL,NOW(),CAST(:before AS jsonb),CAST(:after AS jsonb),'Repair erroneous initial expiry caused by monthly reconciliation',CAST(:metadata AS jsonb)) RETURNING guid`,
          {
            tenant: l.tenant,
            license: l.id,
            key,
            before: JSON.stringify({ license_status: 'EXPIRED' }),
            after: JSON.stringify({ license_status: 'PENDING_PAYMENT' }),
            metadata: JSON.stringify({
              action: 'INITIAL_PENDING_EXPIRY_REPAIR',
              source_monthly_event_id: String(h.id),
              no_paid_or_offered_rights: true,
              no_collection: true,
            }),
          },
        )
      )[0];
      return { ...result, event_guid: Number(event.guid) };
    });
  }

  private database() {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db;
  }
}
