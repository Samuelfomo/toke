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
