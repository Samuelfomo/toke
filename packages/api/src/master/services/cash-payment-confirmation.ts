// Compatibility export: transaction and SQL now belong to the DBD layer.
export {
  confirmCashPayment,
  CashConfirmationError,
} from '../database/base_model/db.cash-confirmation.js';
export type { CashConfirmation, CashActor } from '../database/base_model/db.cash-confirmation.js';
