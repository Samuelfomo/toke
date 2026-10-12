import type { Sequelize } from 'sequelize';
import { Transaction } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

/** Read-only snapshot. No price recomputation and no financial mutation. */
export default class TenantLicenseStatusDb {
  constructor(private readonly connection?: Sequelize) {}

  async load(tenantGuid: number): Promise<any | null> {
    const db = this.connection ?? TableInitializer.getModel('xa_tenant').sequelize;
    if (!db) throw new Error('Master database unavailable');
    return db.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      async (transaction) => {
        const rows = async (sql: string, replacements: Record<string, any> = {}) => {
          const [result] = await db.query(sql, { transaction, replacements });
          return result as any[];
        };
        await rows('SET TRANSACTION READ ONLY');
        const tenant = (
          await rows(
            'SELECT id,guid,name,status,primary_currency_code FROM public.xa_tenant WHERE guid=:guid',
            { guid: tenantGuid },
          )
        )[0];
        if (!tenant) return null;
        const licenses = await rows(
          `SELECT l.id,
                                          l.guid,
                                          l.license_status,
                                          l.billing_mode,
                                          l.current_period_start,
                                          l.current_period_end,
                                          l.next_renewal_date,
                                          l.minimum_seats,
                                          COALESCE((SELECT SUM(g.seats)
                                                    FROM public.xa_paid_seat_grant g
                                                    WHERE g.global_license = l.id
                                                      AND g.valid_from <= CURRENT_TIMESTAMP
                                                      AND CURRENT_TIMESTAMP < g.valid_until), 0) AS paid_seats,
                                          a.allowed,
                                          a.basis,
                                          a.access_until
                                   FROM public.xa_global_license l
                                            LEFT JOIN LATERAL public.monthly_license_access(l.id) a
                                   ON TRUE
                                   WHERE l.tenant=:id
                                   ORDER BY l.id DESC`,
          { id: tenant.id },
        );
        for (const license of licenses) {
          license.payments = await rows(
            `SELECT COUNT(*)                                                                                FILTER (WHERE p.transaction_status::text='PENDING') OVER (PARTITION BY c.id) AS pending_payment_count, p.guid AS payment_transaction_guid,
                                              c.guid                                                                               AS billing_cycle_guid,
                                              c.period_start,
                                              c.period_end,
                                              c.payment_due_date,
                                              c.billing_status,
                                              p.transaction_status,
                                              p.currency_code,
                                              p.amount_local                                                                       AS invoice_amount_local,
                                              CASE
                                                  WHEN p.transaction_status::text='COMPLETED' THEN p.amount_local
                                                  ELSE b.received_local END                                                        AS received_local,
                                              CASE WHEN p.transaction_status::text='COMPLETED' THEN 0 ELSE b.outstanding_local END AS outstanding_local,
                                              m.guid                                                                               AS payment_method_guid,
                                              m.code                                                                               AS payment_method_code,
                                              m.method_type,
                                              m.active AND CAST(p.currency_code AS VARCHAR(3)) = ANY
                                                           (m.supported_currencies)                                                AS method_available,
                                              p.payment_reference
                                       FROM public.xa_billing_cycle c
                                                JOIN public.xa_payment_transaction p
                                                     ON p.billing_cycle = c.id AND p.source_type = 'CYCLE'
                                                LEFT JOIN public.xa_payment_balance b ON b.id = p.id
                                                JOIN public.xa_payment_method m ON m.id = p.payment_method
                                       WHERE c.global_license = :id
                                         AND c.billing_status::text<>'CANCELLED'
                                       ORDER BY c.period_start DESC, p.guid`,
            { id: license.id },
          );
        }
        return { tenant, licenses };
      },
    );
  }
}
