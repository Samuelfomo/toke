import { Router } from 'express';
import { HttpStatus } from '@toke/shared';

import Ensure from '../../middle/ensured-routes.js';
import R from '../../tools/response.js';
import PostpaidClosure, {
  PostpaidClosureError,
  PostpaidClosureInputError,
} from '../class/PostpaidClosure.js';
import { ActivityMonitoringInputError } from '../class/activity-monitoring-input.js';

const router = Router();
// Internal/admin endpoint: global ServerAuth plus the application's permission controls.
router.post('/licenses/:licenseGuid/postpaid-close', Ensure.post(), async (req, res) => {
  try {
    return R.handleSuccess(
      res,
      await new PostpaidClosure().close(req.params.licenseGuid, req.body ?? {}),
    );
  } catch (error) {
    if (
      error instanceof PostpaidClosureError ||
      error instanceof PostpaidClosureInputError ||
      error instanceof ActivityMonitoringInputError
    )
      return R.handleError(res, HttpStatus.BAD_REQUEST, {
        code: 'postpaid_closure_invalid',
        message: error.message,
      });
    console.error('Postpaid closure failed:', error);
    return R.handleError(res, HttpStatus.INTERNAL_ERROR, {
      code: 'postpaid_closure_failed',
      message: 'Closure unavailable; retry with the same idempotency key',
    });
  }
});
export default router;
