import type { Transaction } from 'sequelize';

/** Explicit arguments only: no ambient/CLS transaction and no global defaults. */
export interface ClockInOptions {
  transaction?: Transaction;
  /** Queue external effects; the owner runs them only after managed commit resolves. */
  onCommit?: (effect: () => Promise<unknown>) => void;
}
