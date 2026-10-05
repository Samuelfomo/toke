import { Request, Response, Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import { CashConfirmationError } from '../services/cash-payment-confirmation.js';
import CashPayment from '../class/CashPayment.js';

const router = Router();
// User authorization belongs to the integrating application.
// actor_user_guid is an audit field, not proof of identity or authorization.
router.post('/:transactionGuid/confirm', Ensure.post(), async (req: Request, res: Response) => {
  try {
    const guid = String(req.params.transactionGuid);
    if (!/^[1-9][0-9]{5}$/.test(guid)) throw new CashConfirmationError('Invalid transaction GUID');
    const body = req.body;
    if (
      !body ||
      typeof body.actor_user_guid !== 'string' ||
      typeof body.amount_local !== 'string' ||
      typeof body.currency_code !== 'string' ||
      typeof body.receipt_reference !== 'string' ||
      typeof body.idempotency_key !== 'string' ||
      typeof body.received_at !== 'string'
    ) {
      throw new CashConfirmationError('Required cash confirmation fields are missing');
    }
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(body.received_at)
    ) {
      throw new CashConfirmationError('received_at must be an ISO timestamp with timezone');
    }
    const result = await new CashPayment().confirm(
      {
        transactionGuid: Number(guid),
        billingCycleGuid: body.billing_cycle_guid,
        amountLocal: body.amount_local,
        currency: body.currency_code,
        receiptReference: body.receipt_reference,
        idempotencyKey: body.idempotency_key,
        receivedAt: new Date(body.received_at),
      },
      { actorUserGuid: body.actor_user_guid },
    );
    return R.handleSuccess(res, result);
  } catch (error: any) {
    if (error instanceof CashConfirmationError) {
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'cash_confirmation_invalid',
        message: error.message,
      });
    }
    console.error('Cash confirmation failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'cash_confirmation_failed',
      message: 'Cash confirmation could not be completed',
    });
  }
});
export default router;
