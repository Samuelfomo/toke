import { Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import PostpaidCash, { PostpaidCashError, PostpaidCashInputError } from '../class/PostpaidCash.js';
import { PostpaidClosureInputError } from '../class/PostpaidClosure.js';
import { ActivityMonitoringInputError } from '../class/activity-monitoring-input.js';

const router = Router();
function failure(res: any, error: unknown) {
  if (
    error instanceof PostpaidCashError ||
    error instanceof PostpaidCashInputError ||
    error instanceof PostpaidClosureInputError ||
    error instanceof ActivityMonitoringInputError
  )
    return R.handleError(res, HttpStatus.BAD_REQUEST, {
      code: 'postpaid_cash_invalid',
      message: error.message,
    });
  console.error('Postpaid cash failed:', error);
  return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
    code: 'postpaid_cash_failed',
    message: 'Operation unavailable; retry with the same key',
  });
}
router.post('/payments/:transactionGuid/postpaid-cash', Ensure.post(), async (req, res) => {
  try {
    return R.handleSuccess(
      res,
      await new PostpaidCash().receive(req.params.transactionGuid, req.body ?? {}),
    );
  } catch (e) {
    return failure(res, e);
  }
});
router.get('/licenses/:licenseGuid/access', Ensure.get(), async (req, res) => {
  try {
    return R.handleSuccess(
      res,
      await new PostpaidCash().access(req.params.licenseGuid, req.query.tenant_guid),
    );
  } catch (e) {
    return failure(res, e);
  }
});
export default router;
