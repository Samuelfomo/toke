import type { Sequelize } from 'sequelize';

import { TableInitializer } from '../db.initializer.js';

import { CashActor, CashConfirmation, confirmCashPayment } from './db.cash-confirmation.js';
import { InstallmentInput, recordCashInstallment } from './db.cash-installment.js';

export default class CashPaymentDb {
  constructor(private readonly connection?: Sequelize) {}

  confirm(input: CashConfirmation, actor: CashActor) {
    return confirmCashPayment(this.database(), input, actor);
  }

  record(input: InstallmentInput) {
    return recordCashInstallment(this.database(), input);
  }

  async balance(transactionGuid: number): Promise<Record<string, any> | null> {
    const [regularizations] = await this.database().query(
      `SELECT p.guid AS payment_transaction_guid,a.guid AS adjustment_guid,l.guid AS license_guid,
       t.guid AS tenant_guid,p.currency_code,p.amount_local AS due_local,
       CASE WHEN p.transaction_status='COMPLETED' AND a.payment_status='COMPLETED'
         THEN p.amount_local ELSE 0 END AS received_local,
       CASE WHEN p.transaction_status='COMPLETED' AND a.payment_status='COMPLETED'
         THEN 0 ELSE p.amount_local END AS outstanding_local,
       p.transaction_status,a.payment_status,a.payment_due_date
       FROM public.xa_payment_transaction p JOIN public.xa_license_adjustment a ON a.id=p.adjustment
       JOIN public.xa_global_license l ON l.id=a.global_license JOIN public.xa_tenant t ON t.id=l.tenant
       WHERE p.guid=:guid AND p.source_type='ADJUSTMENT' AND a.adjustment_kind='USAGE_REGULARIZATION'`,
      { replacements: { guid: transactionGuid } },
    );
    if ((regularizations as any[]).length) return (regularizations as any[])[0];
    const [rows] = await this.database().query(
      'SELECT * FROM xa_payment_balance WHERE guid = :guid',
      { replacements: { guid: transactionGuid } },
    );
    return (rows as Record<string, any>[])[0] ?? null;
  }

  private database(): Sequelize {
    const db = this.connection ?? TableInitializer.getModel('xa_payment_transaction').sequelize;
    if (!db) throw new Error('Master database connection unavailable');
    return db;
  }
}
