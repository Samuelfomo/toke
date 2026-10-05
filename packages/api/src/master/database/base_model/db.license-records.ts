import { Sequelize, Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

export class LicenseRecordsNotFound extends Error {}
export interface RecordScope {
  tenantGuid: number;
  resourceGuid: number;
}
export default class LicenseRecordsDb {
  constructor(private readonly connection?: Sequelize) {}

  async cash(scope: RecordScope): Promise<Record<string, any>> {
    const db = this.database();
    return db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        await db.query('SET TRANSACTION READ ONLY', { transaction });
        const rows = async (sql: string, replacements: Record<string, any>) => {
          const [r] = await db.query(sql, { transaction, replacements });
          return r as Record<string, any>[];
        };
        const payment = (
          await rows(
            `SELECT p.id,p.guid,p.source_type,p.amount_local,p.currency_code,p.transaction_status
    FROM public.xa_payment_transaction p
    LEFT JOIN public.xa_billing_cycle c ON c.id=p.billing_cycle
    LEFT JOIN public.xa_license_adjustment a ON a.id=p.adjustment
    LEFT JOIN public.xa_global_license lc ON lc.id=c.global_license
    LEFT JOIN public.xa_global_license la ON la.id=a.global_license
    JOIN public.xa_tenant t ON t.id=COALESCE(lc.tenant,la.tenant)
    WHERE p.guid = :guid AND t.guid = :tenant
    AND (lc.tenant IS NULL OR la.tenant IS NULL OR lc.tenant=la.tenant)`,
            { guid: scope.resourceGuid, tenant: scope.tenantGuid },
          )
        )[0];
        if (!payment) throw new LicenseRecordsNotFound('Payment not found for tenant');
        const cash = await rows(
          `SELECT 'FULL_RECEIPT' AS source, r.amount_local,r.currency_code,
    r.actor_user_guid,r.received_at,r.confirmed_at,r.receipt_reference
    FROM public.xa_cash_receipt r WHERE r.payment_transaction = :id
    UNION ALL
    SELECT 'INSTALLMENT' AS source,i.amount_local,i.currency_code,
    i.actor_user_guid,i.received_at,i.confirmed_at,i.receipt_reference
    FROM public.xa_cash_installment i WHERE i.payment_transaction = :id
    ORDER BY received_at,source,receipt_reference`,
          { id: payment.id },
        );
        const settlement =
          (
            await rows(
              `SELECT access_action,created_at FROM public.xa_cash_installment_settlement
    WHERE payment_transaction = :id`,
              { id: payment.id },
            )
          )[0] ?? null;
        const { id, ...publicPayment } = payment;
        return { payment: publicPayment, cash, settlement };
      },
    );
  }

  async events(scope: RecordScope, limit: number, offset: number): Promise<Record<string, any>[]> {
    const db = this.database();
    const [result] = await db.query(
      `WITH licence AS (
   SELECT l.id FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant
   WHERE l.guid = :guid AND t.guid = :tenant
  ), events AS (
   SELECT 'CYCLE_ACTIVATED' AS event_type,'xa_license_cycle_activation' AS source,
    a.id::text AS source_key,a.activated_at AS occurred_at,'SYSTEM'::text AS actor_type,
    NULL::text AS actor_user_guid,a.previous_license AS previous_payload,a.new_license AS new_payload,
    jsonb_build_object('cycle_guid',c.guid,'payment_guid',p.guid) AS metadata
   FROM public.xa_license_cycle_activation a JOIN licence l ON l.id=a.global_license
   JOIN public.xa_billing_cycle c ON c.id=a.billing_cycle JOIN public.xa_payment_transaction p ON p.id=a.payment_transaction
   UNION ALL
   SELECT 'COMMERCIAL_TRANSITION_GRANTED','xa_commercial_transition',a.id::text,a.created_at,'USER',a.actor_user_guid,
    a.previous_license,a.new_license,jsonb_build_object('valid_from',a.valid_from,'valid_until',a.valid_until,'offered_seats',a.offered_seats,'reason',a.reason,'actor_tenant_guid',a.actor_tenant_guid)
   FROM public.xa_commercial_transition a JOIN licence l ON l.id=a.global_license
   UNION ALL
   SELECT 'COMMERCIAL_TRANSITION_EXPIRED','xa_commercial_transition_expiry',a.transition_id::text,a.created_at,'SYSTEM',NULL,
    a.previous_license,a.new_license,'{}'::jsonb
   FROM public.xa_commercial_transition_expiry a JOIN public.xa_commercial_transition tr ON tr.id=a.transition_id JOIN licence l ON l.id=tr.global_license
   UNION ALL
   SELECT 'MONTHLY_POLICY_APPLIED','xa_monthly_license_policy',a.global_license::text,a.created_at,'USER',a.actor_user_guid,
    a.previous_license,a.new_license,jsonb_build_object('grace_days',a.grace_days,'actor_tenant_guid',a.actor_tenant_guid)
   FROM public.xa_monthly_license_policy a JOIN licence l ON l.id=a.global_license
   UNION ALL
   SELECT 'LICENSE_STATUS_CHANGED','xa_monthly_license_status_event',a.id::text,a.created_at,'SYSTEM',NULL,
    jsonb_build_object('status',a.previous_status),jsonb_build_object('status',a.new_status),jsonb_build_object('reason',a.reason)
   FROM public.xa_monthly_license_status_event a JOIN licence l ON l.id=a.global_license
   UNION ALL
   SELECT 'RENEWAL_PREPARED','xa_renewal_preparation',a.id::text,a.created_at,'USER',a.actor_user_guid,
    NULL::jsonb,a.snapshot,jsonb_build_object('cycle_guid',c.guid,'payment_guid',p.guid)
   FROM public.xa_renewal_preparation a JOIN licence l ON l.id=a.global_license
   JOIN public.xa_billing_cycle c ON c.id=a.billing_cycle JOIN public.xa_payment_transaction p ON p.id=a.payment_transaction
   UNION ALL
   SELECT 'SEATS_ROLLED_OVER','xa_seat_cycle_rollover',a.id::text,a.processed_at,'SYSTEM',NULL,
    NULL::jsonb,NULL::jsonb,jsonb_build_object('cycle_guid',c.guid,'carried_count',a.carried_count,'details',a.details)
   FROM public.xa_seat_cycle_rollover a JOIN licence l ON l.id=a.global_license JOIN public.xa_billing_cycle c ON c.id=a.billing_cycle
  ) SELECT event_type,source || ':' || source_key AS event_reference,occurred_at,actor_type,actor_user_guid,
   previous_payload,new_payload,metadata FROM events
   ORDER BY occurred_at DESC,source,source_key LIMIT :limit OFFSET :offset`,
      { replacements: { guid: scope.resourceGuid, tenant: scope.tenantGuid, limit, offset } },
    );
    // Check the resource separately only when the result is empty; events themselves are one consistent statement.
    const rows = result as Record<string, any>[];
    if (!rows.length) {
      const [licenses] = await db.query(
        `SELECT l.guid FROM public.xa_global_license l JOIN public.xa_tenant t ON t.id=l.tenant
    WHERE l.guid = :guid AND t.guid = :tenant`,
        { replacements: { guid: scope.resourceGuid, tenant: scope.tenantGuid } },
      );
      if (!(licenses as any[]).length)
        throw new LicenseRecordsNotFound('License not found for tenant');
    }
    return rows;
  }

  private database(): Sequelize {
    const db = this.connection ?? TableInitializer.getModel('xa_global_license').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db;
  }
}
