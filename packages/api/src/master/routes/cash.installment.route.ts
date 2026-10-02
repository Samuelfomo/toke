import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import { TableInitializer } from '../database/db.initializer.js';
import { tableName } from '../../utils/response.model.js';
import { CashInstallmentError, recordCashInstallment } from '../services/cash-installment.js';
import { EmployeeLeaveError, leaveDate } from '../services/employee-leave.js';

const router = Router();
router.post('/:transactionGuid/record', Ensure.post(), async (req: Request, res: Response) => {
  try {
    if (!/^[1-9][0-9]{5}$/.test(String(req.params.transactionGuid)))
      throw new CashInstallmentError('Invalid transaction GUID');
    const b = req.body;
    if (
      !b ||
      ![
        'actor_user_guid',
        'amount_local',
        'currency_code',
        'received_at',
        'receipt_reference',
        'idempotency_key',
      ].every((k) => typeof b[k] === 'string')
    )
      throw new CashInstallmentError('Required installment fields missing');
    const received = new Date(leaveDate(b.received_at));
    const db = TableInitializer.getModel(tableName.PAYMENT_TRANSACTION).sequelize;
    if (!db) throw new Error('Database unavailable');
    return R.handleSuccess(
      res,
      await recordCashInstallment(db, {
        transactionGuid: Number(req.params.transactionGuid),
        actorUserGuid: b.actor_user_guid,
        amountLocal: b.amount_local,
        currency: b.currency_code,
        receivedAt: received,
        receiptReference: b.receipt_reference,
        idempotencyKey: b.idempotency_key,
      }),
    );
  } catch (e: any) {
    if (e instanceof CashInstallmentError || e instanceof EmployeeLeaveError)
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_cash_installment',
        message: e.message,
      });
    console.error('Installment failed:', e);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'cash_installment_failed',
      message: 'Cash installment could not be recorded',
    });
  }
});
router.get('/:transactionGuid/balance', Ensure.get(), async (req: Request, res: Response) => {
  try {
    if (!/^[1-9][0-9]{5}$/.test(String(req.params.transactionGuid)))
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'invalid_guid',
        message: 'Invalid transaction GUID',
      });
    const db = TableInitializer.getModel(tableName.PAYMENT_TRANSACTION).sequelize;
    if (!db) throw new Error('Database unavailable');
    const [raw] = await db.query('SELECT * FROM xa_payment_balance WHERE guid = :guid', {
      replacements: { guid: Number(req.params.transactionGuid) },
    });
    const b = (raw as any[])[0];
    if (!b)
      return R.handleError(res, HttpStatus.NOT_FOUND, {
        code: 'payment_not_found',
        message: 'Payment not found',
      });
    return R.handleSuccess(res, {
      ...b,
      billing_state:
        Number(b.outstanding_local) === 0
          ? 'PAID'
          : Number(b.received_local) > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID',
    });
  } catch (e) {
    console.error(e);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'balance_failed',
      message: 'Balance unavailable',
    });
  }
});
export default router;
