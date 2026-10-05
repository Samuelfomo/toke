import CashPaymentDb from '../database/base_model/db.cash-payment.js';
import type { CashActor, CashConfirmation } from '../database/base_model/db.cash-confirmation.js';
import type { InstallmentInput } from '../database/base_model/db.cash-installment.js';

/** Modele de regroupement sur les tables existantes, sans nouveau modele ORM. */
export default class CashPaymentModel {
  constructor(protected readonly data: CashPaymentDb = new CashPaymentDb()) {}
  protected confirmStored(input: CashConfirmation, actor: CashActor) {
    return this.data.confirm(input, actor);
  }
  protected recordStored(input: InstallmentInput) {
    return this.data.record(input);
  }
  protected loadBalance(guid: number) {
    return this.data.balance(guid);
  }
}
