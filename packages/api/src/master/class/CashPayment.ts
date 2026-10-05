import CashPaymentModel from '../model/CashPaymentModel.js';
import type { CashActor, CashConfirmation } from '../database/base_model/db.cash-confirmation.js';
import type { InstallmentInput } from '../database/base_model/db.cash-installment.js';
import { cashCents, CashInstallmentError } from '../database/base_model/db.cash-installment.js';

/** Meme regles et memes reponses : consolidation de l'architecture des ecritures. */
export default class CashPayment extends CashPaymentModel {
  confirm(input: CashConfirmation, actor: CashActor) {
    return this.confirmStored(input, actor);
  }
  record(input: InstallmentInput) {
    return this.recordStored(input);
  }
  async balance(guid: number): Promise<Record<string, any> | null> {
    if (!Number.isInteger(guid) || guid < 100000 || guid > 999999)
      throw new CashInstallmentError('Invalid transaction GUID');
    const row = await this.loadBalance(guid);
    if (!row) return null;
    return {
      ...row,
      billing_state:
        cashCents(row.outstanding_local) === 0n
          ? 'PAID'
          : cashCents(row.received_local) > 0n
            ? 'PARTIALLY_PAID'
            : 'UNPAID',
    };
  }
}
